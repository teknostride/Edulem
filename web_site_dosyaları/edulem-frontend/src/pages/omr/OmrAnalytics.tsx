import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// --- Interface Tanımları ---

interface Summary {
  total: number; avg_net: number; median_net: number; mode_net: number;
  min_net: number; max_net: number; stddev_net: number; variance: number;
}

interface DistBin { start: number; end: number; count: number; }

interface ClassAvg { classroom_id: number; classroom_name: string; total: number; avg_net: number; }

interface CourseAvg { course_id: number; course_name: string; avg_net: number; avg_point: number; correct: number; wrong: number; blank: number; }

interface MissedQuestion { course_id: number; course_name: string; question_no: number; topic_name: string; wrong_ratio: number; success_ratio: number; }

interface MissedTopic { topic_id: number; topic_name: string; wrong_ratio: number; total: number; course_name?: string; }

interface Classroom { id: number; name: string; }

interface StudentOption { id: number; name: string; school_no?: string; classroom?: { id: number; name: string; } | null; }

// TypeScript Hatası TS2339 için güncellenen StudentData
interface StudentData {
  student: {
    id: number;
    name: string;
    school_no: string;
    classroom?: { id: number; name: string; };
  };
  result: { id: number; total_net: number; total_point: number; rank: number; booklet_type: string; };
  exam_stats: { mean: number; median: number; mode: number; variance: number; stddev: number; };
  exam_avg: number;
  class_avg: number;
  percentile: number;
  exam_total: number;
  course_scores: { course_id: number; course_name: string; net: number; correct: number; wrong: number; blank: number; }[];
  wrong_blank_questions: { course_id: number; course_name: string; question_no: number; topic_id: number; topic_name: string; given_answer: string; correct_answer: string; status: 'wrong' | 'blank'; }[];
  topic_analysis: Record<number, Record<number, { topic_id: number; topic_name: string; correct: number; wrong: number; blank: number; }>>;
  // Eksik olan ve hata veren alan:
  exam_summaries?: any[];
}

interface ClassData {
  class_avg: number;
  exam_avg: number;
  student_count: number;
  class_stats: { mean: number; median: number; mode: number; variance: number; stddev: number; };
  students: { id: number; name: string; school_no: string; total_net: number; total_point: number; rank: number; below_avg: boolean; result_id: number; }[];
  below_avg: { id: number; name: string; total_net: number; }[];
  course_averages: { course_id: number; course_name: string; avg_net: number; correct: number; wrong: number; blank: number; }[];
  topic_difficulty: MissedTopic[];
}

interface CorrelationData {
  matrix: Record<number, Record<number, number>>;
  course_labels: { id: number; name: string; }[];
}

interface CompareSeries {
  exam_id: number; exam_name: string; exam_date: string | null; exam_type: string;
  avg_net: number; min_net: number; max_net: number; total: number;
  course_avgs: { course_id: number; avg_net: number; }[];
  regression: { slope: number; intercept: number; r_squared: number; };
}

type ActiveTab = 'general' | 'class' | 'student' | 'correlation' | 'compare';

type CorrelationScope = 'exam' | 'class' | 'student';

// --- Yardımcı Bileşenler ve Sabitler ---

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string; }) => (
  <div className={`card border-0 shadow-sm border-start border-${color} border-3`}>
    <div className="card-body py-3 px-3">
      <div className="d-flex align-items-center justify-content-between">
        <div><div className="text-muted small">{label}</div><div className={`fs-5 fw-bold text-${color}`}>{value}</div></div>
        <i className={`ti ${icon} fs-2 text-${color} opacity-50`}></i>
      </div>
    </div>
  </div>
);

export default function OmrAnalytics() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');

  // General tab state
  const [summary, setSummary] = useState<Summary | null>(null);
  const [distribution, setDistribution] = useState<DistBin[]>([]);
  const [classAverages, setClassAverages] = useState<ClassAvg[]>([]);
  const [, setCourseAverages] = useState<CourseAvg[]>([]);
  const [, setMostMissedQuestions] = useState<MissedQuestion[]>([]);
  const [, setMostMissedTopics] = useState<MissedTopic[]>([]);
  const [loadingGeneral, setLoadingGeneral] = useState(true);

  // Class tab state
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [, setSelectedClassExamIds] = useState<number[]>([]);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loadingClass, setLoadingClass] = useState(false);

  // Student tab state
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [, setSelectedStudentExamIds] = useState<number[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [loadingStudentOptions, setLoadingStudentOptions] = useState(false);

  // Other tabs
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [loadingCorrelation, setLoadingCorrelation] = useState(false);
  const [correlationScope, setCorrelationScope] = useState<CorrelationScope>('exam');
  const [corrClassId, setCorrClassId] = useState<number | null>(null);
  const [corrStudentQuery, setCorrStudentQuery] = useState('');
  const [corrStudentOptions, setCorrStudentOptions] = useState<StudentOption[]>([]);
  const [corrStudentId, setCorrStudentId] = useState<number | null>(null);
  const [corrExamIds, setCorrExamIds] = useState<number[]>([]);
  const [allExams, setAllExams] = useState<{ id: number; name: string; exam_date: string | null; exam_type?: string; }[]>([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState<number[]>([]);
  const [compareSeries, setCompareSeries] = useState<CompareSeries[]>([]);
  const [compareLabels, setCompareLabels] = useState<{ id: number; name: string; }[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // --- Veri Çekme Fonksiyonları ---

  const fetchExam = async () => {
    try { const r = await axiosClient.get(`/omr/exams/${examId}`); setExam(r.data?.data?.exam ?? null); } catch { /* silent */ }
  };

  const fetchGeneral = async () => {
    try {
      setLoadingGeneral(true);
      const r = await axiosClient.get(`/omr/exams/${examId}/analytics`, { params: { bin_size: 5 } });
      const d = r.data?.data;
      setSummary(d?.summary ?? null);
      setDistribution(d?.distribution ?? []);
      setClassAverages(d?.class_averages ?? []);
      setCourseAverages(d?.course_averages ?? []);
      setMostMissedQuestions(d?.most_missed_questions ?? []);
      setMostMissedTopics(d?.most_missed_topics ?? []);
    } catch { showToast('error', 'Genel analitik yüklenemedi'); }
    finally { setLoadingGeneral(false); }
  };

  const fetchClassData = async (classroomId: number, examIds: number[]) => {
    try {
      setLoadingClass(true);
      const params: Record<string, any> = { classroom_id: classroomId };
      if (examIds.length > 0) params['exam_ids[]'] = examIds;
      const r = await axiosClient.get(`/omr/exams/${examId}/analytics/class`, { params });
      setClassData(r.data?.data ?? null);
    } catch { showToast('error', 'Sınıf analizi yüklenemedi'); setClassData(null); }
    finally { setLoadingClass(false); }
  };

  const fetchStudentData = async (sid: number, examIds: number[]) => {
    try {
      setLoadingStudent(true);
      const params: Record<string, any> = { student_id: sid };
      if (examIds.length > 0) params['exam_ids[]'] = examIds;
      const r = await axiosClient.get(`/omr/exams/${examId}/analytics/student`, { params });
      setStudentData(r.data?.data ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      showToast('error', msg || 'Öğrenci analizi yüklenemedi');
      setStudentData(null);
    }
    finally { setLoadingStudent(false); }
  };

  const fetchCorrelation = async (opts?: { classroom_id?: number; student_id?: number; exam_ids?: number[] }) => {
    try {
      setLoadingCorrelation(true);
      const params: Record<string, any> = {};
      if (opts?.classroom_id) params.classroom_id = opts.classroom_id;
      if (opts?.student_id) params.student_id = opts.student_id;
      if (opts?.exam_ids && opts.exam_ids.length > 0) params.exam_ids = opts.exam_ids;
      const r = await axiosClient.get(`/omr/exams/${examId}/analytics/correlation`, { params });
      setCorrelationData(r.data?.data ?? null);
    } catch { showToast('error', 'Korelasyon verisi yüklenemedi'); }
    finally { setLoadingCorrelation(false); }
  };

  const fetchCompare = async (ids: number[]) => {
    if (ids.length < 2) return;
    try {
      setLoadingCompare(true);
      const r = await axiosClient.get(`/omr/exams/${examId}/analytics/compare`, { params: { exam_ids: ids } });
      setCompareSeries(r.data?.data?.series ?? []);
      setCompareLabels(r.data?.data?.course_labels ?? []);
    } catch { showToast('error', 'Karşılaştırma verisi yüklenemedi'); }
    finally { setLoadingCompare(false); }
  };

  const fetchCorrStudentOptions = async (q: string) => {
    try {
      const r = await axiosClient.get(`/omr/exams/${examId}/students/search`, { params: { q, limit: 40, in_exam: 1 } });
      setCorrStudentOptions(r.data?.data?.students ?? []);
    } catch { setCorrStudentOptions([]); }
  };

  const fetchStudentOptions = async (q: string) => {
    try {
      setLoadingStudentOptions(true);
      const r = await axiosClient.get(`/omr/exams/${examId}/students/search`, { params: { q, limit: 60, in_exam: 1 } });
      setStudentOptions(r.data?.data?.students ?? []);
    } catch {
      setStudentOptions([]);
    } finally {
      setLoadingStudentOptions(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const r = await axiosClient.get('/classrooms', { params: { per_page: 250 } });
      const raw = Array.isArray(r.data?.data) ? r.data.data : (r.data?.data?.classrooms ?? r.data?.data?.data ?? []);
      
      // Eğitim Seviyesi ve İme Göre Sıralama
      const sorted = [...raw].sort((a: any, b: any) => {
        const nameA = String(a.name || '').toLowerCase();
        const nameB = String(b.name || '').toLowerCase();
        
        const getWeight = (name: string) => {
          if (name.includes('anaok')) return 10;
          if (name.includes('ilkok')) return 20;
          if (name.includes('ortaok')) return 30;
          if (name.includes('lise')) return 40;
          if (name.includes('mezun')) return 50;
          return 100;
        };

        const wA = getWeight(nameA);
        const wB = getWeight(nameB);

        if (wA !== wB) return wA - wB;
        return nameA.localeCompare(nameB, 'tr', { numeric: true });
      });

      setClassrooms(sorted);
    } catch { /* silent */ }
  };

  const fetchAllExams = async () => {
    try {
      const r = await axiosClient.get('/omr/exams', { params: { per_page: 100 } });
      setAllExams(r.data?.data?.exams ?? []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchExam(); fetchClassrooms(); fetchAllExams(); fetchGeneral();
    fetchStudentOptions('');
  }, [examId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchStudentOptions(studentQuery);
    }, 250);
    return () => window.clearTimeout(t);
  }, [studentQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (activeTab === 'correlation' && correlationScope === 'student') {
        fetchCorrStudentOptions(corrStudentQuery);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [corrStudentQuery, activeTab, correlationScope]);

  // --- İşleyici Fonksiyonlar (Handlers) ---

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'correlation' && !correlationData) {
      fetchCorrelation();
    }
  };

  const handleClassSelect = (cid: string) => {
    const id = cid ? Number(cid) : null;
    setSelectedClassId(id);
    setSelectedClassExamIds([]);
    setClassData(null);
    if (id) fetchClassData(id, []);
  };

  const handleStudentPick = (id: number | null) => {
    setSelectedStudentId(id);
    setSelectedStudentExamIds([]);
    setStudentData(null);
    if (id) fetchStudentData(id, []);
  };

  const drillDownToClass = (cid: number) => {
    setSelectedClassId(cid);
    setSelectedClassExamIds([]);
    setClassData(null);
    setActiveTab('class');
    fetchClassData(cid, []);
  };

  const drillDownToStudent = (sid: number) => {
    setActiveTab('student');
    handleStudentPick(sid);
  };

  const toggleCompareId = (id: number) => {
    const next = selectedCompareIds.includes(id)
      ? selectedCompareIds.filter(x => x !== id)
      : [...selectedCompareIds, id];
    setSelectedCompareIds(next);
    if (next.length >= 2) fetchCompare(next);
    else { setCompareSeries([]); setCompareLabels([]); }
  };

  // --- Grafik Veri Hazırlığı ---

  const distChartData = distribution.map(d => ({ name: `${d.start}–${d.end}`, 'Öğrenci': d.count }));
  const classChartData = [...classAverages]
    .sort((a, b) => toNum(b.avg_net) - toNum(a.avg_net))
    .map(c => ({ name: c.classroom_name, 'Ort. Net': toNum(c.avg_net), 'Öğrenci': toNum(c.total), id: c.classroom_id }));
  // const courseChartData = courseAverages.map(c => ({ name: c.course_name, 'Ort. Net': toNum(c.avg_net) }));
  const pieData = classAverages.map(c => ({ name: c.classroom_name, value: toNum(c.total) }));

  const tabs: { key: ActiveTab; label: string; icon: string; }[] = [
    { key: 'general', label: 'Genel Analiz', icon: 'ti-chart-bar' },
    { key: 'class', label: 'Sınıf Analizi', icon: 'ti-school' },
    { key: 'student', label: 'Öğrenci Analizi', icon: 'ti-user-circle' },
    { key: 'correlation', label: 'Korelasyon', icon: 'ti-grid-dots' },
    { key: 'compare', label: 'Karşılaştırmalı', icon: 'ti-arrows-diff' },
  ];

  return (
    <div className="container-fluid">
      {/* Page header */}
      <div className="d-flex align-items-center mb-3 gap-2">
        <button className="btn btn-sm btn-light me-2" onClick={() => navigate('/omr/exams')}>
          <i className="ti ti-arrow-left me-1"></i>Geri
        </button>
        <div>
          <h4 className="page-title mb-0">Sınav Analizi</h4>
          {exam && <p className="text-muted mb-0 small">{exam.name} — {exam.exam_type}</p>}
        </div>
      </div>

      {/* Tab navigation */}
      <ul className="nav nav-tabs mb-4">
        {tabs.map(t => (
          <li className="nav-item" key={t.key}>
            <button
              className={`nav-link ${activeTab === t.key ? 'active fw-semibold' : ''}`}
              onClick={() => handleTabChange(t.key)}
            >
              <i className={`ti ${t.icon} me-1`}></i>{t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* TAB 1 – GENERAL */}
      {activeTab === 'general' && (
        loadingGeneral
          ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          : (!summary || summary.total === 0)
            ? <div className="card border-0 shadow-sm"><div className="card-body text-center py-5 text-muted">Henüz sonuç yüklenmemiş</div></div>
            : (
              <>
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Toplam Öğrenci', value: summary.total, icon: 'ti-users', color: 'primary' },
                    { label: 'Ortalama', value: toNum(summary.avg_net).toFixed(2), icon: 'ti-chart-line', color: 'success' },
                    { label: 'Medyan', value: toNum(summary.median_net).toFixed(2), icon: 'ti-line', color: 'info' },
                    { label: 'Std. Sapma', value: toNum(summary.stddev_net).toFixed(2), icon: 'ti-sigma', color: 'danger' },
                  ].map((c, i) => (
                    <div className="col-md-3 col-6" key={i}>
                      <StatCard label={c.label} value={c.value} icon={c.icon} color={c.color} />
                    </div>
                  ))}
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-7">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-header bg-light"><h6 className="mb-0">Net Dağılımı</h6></div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={distChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="Öğrenci" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-header bg-light"><h6 className="mb-0">Sınıf Dağılımı</h6></div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sınıf Sıralaması */}
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light"><h6>Sınıf Sıralaması</h6></div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead><tr><th>Sıra</th><th>Sınıf</th><th className="text-center">Öğrenci</th><th className="text-center">Ort. Net</th></tr></thead>
                        <tbody>
                          {classChartData.map((c, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>
                                <button className="btn btn-link btn-sm p-0" onClick={() => drillDownToClass(c.id)}>{c.name}</button>
                              </td>
                              <td className="text-center">{c.Öğrenci}</td>
                              <td className="text-center fw-bold">{c['Ort. Net'].toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )
      )}

      {/* TAB 2 – CLASS */}
      {activeTab === 'class' && (
        <div>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <label className="form-label fw-semibold">Sınıf Seç</label>
              <select className="form-select" style={{ maxWidth: 300 }} value={selectedClassId ?? ''} onChange={e => handleClassSelect(e.target.value)}>
                <option value="">— Seçin —</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {loadingClass ? <div className="text-center py-5"><div className="spinner-border"></div></div> : classData && (
            <div className="row g-3">
              <div className="col-12">
                <div className="row g-3">
                  <div className="col-md-3 col-6">
                    <StatCard label="Sınıf Ortalaması" value={toNum(classData.class_avg).toFixed(2)} icon="ti-chart-line" color="primary" />
                  </div>
                  <div className="col-md-3 col-6">
                    <StatCard label="Sınav Ortalaması" value={toNum(classData.exam_avg).toFixed(2)} icon="ti-chart-bar" color="success" />
                  </div>
                  <div className="col-md-3 col-6">
                    <StatCard label="Öğrenci Sayısı" value={classData.student_count} icon="ti-users" color="info" />
                  </div>
                  <div className="col-md-3 col-6">
                    <StatCard label="Std. Sapma" value={toNum(classData.class_stats?.stddev).toFixed(2)} icon="ti-sigma" color="danger" />
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-light"><h6 className="mb-0">Ders Ortalamaları</h6></div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead><tr><th>Ders</th><th className="text-center">Ort. Net</th><th className="text-center">D</th><th className="text-center">Y</th><th className="text-center">B</th></tr></thead>
                        <tbody>
                          {classData.course_averages.map(c => (
                            <tr key={c.course_id}>
                              <td>{c.course_name}</td>
                              <td className="text-center fw-semibold">{toNum(c.avg_net).toFixed(2)}</td>
                              <td className="text-center">{c.correct}</td>
                              <td className="text-center">{c.wrong}</td>
                              <td className="text-center">{c.blank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-light"><h6 className="mb-0">En Zor Konular</h6></div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead><tr><th>Konu</th><th className="text-center">Yanlış Oranı</th><th className="text-center">Toplam</th></tr></thead>
                        <tbody>
                          {classData.topic_difficulty.map((t, idx) => (
                            <tr key={`${t.topic_id}-${idx}`}>
                              <td>
                                <div className="fw-semibold">{t.topic_name}</div>
                                {t.course_name && <div className="small text-muted">{t.course_name}</div>}
                              </td>
                              <td className="text-center">{(toNum(t.wrong_ratio) * 100).toFixed(1)}%</td>
                              <td className="text-center">{t.total}</td>
                            </tr>
                          ))}
                          {classData.topic_difficulty.length === 0 && (
                            <tr><td colSpan={3} className="text-muted small py-3">Veri yok</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light"><h6 className="mb-0">Sınıf Öğrenci Listesi</h6></div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead><tr><th>Öğrenci</th><th className="text-center">Toplam Net</th><th className="text-center">Puan</th><th className="text-center">Durum</th><th className="text-end">Eylem</th></tr></thead>
                        <tbody>
                          {classData.students.map(s => (
                            <tr key={s.id}>
                              <td>
                                <div className="fw-semibold">{s.name}</div>
                                <div className="text-muted small">{s.school_no}</div>
                              </td>
                              <td className="text-center">{toNum(s.total_net).toFixed(2)}</td>
                              <td className="text-center">{toNum(s.total_point).toFixed(2)}</td>
                              <td className="text-center">
                                {s.below_avg ? <span className="badge bg-danger">Ortalama Altı</span> : <span className="badge bg-success">İyi</span>}
                              </td>
                              <td className="text-end">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => drillDownToStudent(s.id)}>Öğrenci Analizi</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3 – STUDENT */}
      {activeTab === 'student' && (
        <div>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <label className="form-label fw-semibold">Öğrenci Ara</label>
                  <input
                    className="form-control"
                    placeholder="Ad / okul no"
                    value={studentQuery}
                    onChange={e => setStudentQuery(e.target.value)}
                  />

                  <div className="mt-3" style={{ maxHeight: 420, overflow: 'auto' }}>
                    {loadingStudentOptions ? (
                      <div className="text-center py-4"><div className="spinner-border spinner-border-sm"></div></div>
                    ) : (
                      <div className="list-group">
                        {studentOptions.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className={`list-group-item list-group-item-action ${selectedStudentId === s.id ? 'active' : ''}`}
                            onClick={() => handleStudentPick(s.id)}
                          >
                            <div className="d-flex justify-content-between">
                              <div className="fw-semibold">{s.name}</div>
                              <div className="small opacity-75">{s.school_no}</div>
                            </div>
                            <div className="small opacity-75">{s.classroom?.name ?? '—'}</div>
                          </button>
                        ))}
                        {!loadingStudentOptions && studentOptions.length === 0 && (
                          <div className="text-muted small py-3">Kayıt bulunamadı</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-8">
              {loadingStudent ? (
                <div className="text-center py-5"><div className="spinner-border"></div></div>
              ) : !selectedStudentId ? (
                <div className="card border-0 shadow-sm"><div className="card-body text-muted">Soldan bir öğrenci seçin</div></div>
              ) : !studentData ? (
                <div className="card border-0 shadow-sm"><div className="card-body text-muted">Öğrenci verisi yükleniyor...</div></div>
              ) : (
                <div className="row g-3">
                  <div className="col-12">
                    <div className="card shadow-sm border-0">
                      <div className="card-body">
                        <div className="d-flex align-items-start justify-content-between">
                          <div>
                            <h5 className="mb-1">{studentData.student.name}</h5>
                            <div className="text-muted small">Okul No: {studentData.student.school_no}</div>
                            <div className="text-muted small">Sınıf: {studentData.student.classroom?.name ?? '—'}</div>
                          </div>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleStudentPick(null)}>Temizle</button>
                        </div>

                        <div className="row g-2 mt-3">
                          <div className="col-md-4">
                            <div className="border rounded p-2">
                              <div className="text-muted small">Sınav Neti</div>
                              <div className="fw-bold">{studentData.result.total_net}</div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="border rounded p-2">
                              <div className="text-muted small">Sıralama</div>
                              <div className="fw-bold">{studentData.result.rank} / {studentData.exam_total}</div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="border rounded p-2">
                              <div className="text-muted small">Yüzdelik Dilim</div>
                              <div className="fw-bold">{toNum(studentData.percentile).toFixed(2)}%</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <span className="badge bg-primary">
                            {studentData.exam_summaries?.length || 0} Sınav Geçmişi
                          </span>
                          {studentData.exam_summaries && studentData.exam_summaries.map((es: any, idx: number) => (
                            <div key={idx} className="small text-muted mt-1">{es.exam_name}: {es.total_net} Net</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="card shadow-sm border-0">
                      <div className="card-header bg-light"><h6 className="mb-0">Ders Performansı</h6></div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={studentData.course_scores}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="course_name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="net" fill="#10b981" name="Net" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4 – CORRELATION */}
      {activeTab === 'correlation' && (
        <div>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="fw-semibold mb-2">Kapsam Seç</div>
              <div className="btn-group mb-3" role="group">
                <button className={`btn ${correlationScope === 'exam' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setCorrelationScope('exam'); setCorrClassId(null); setCorrStudentId(null); setCorrExamIds([]); fetchCorrelation(); }}>Sınav (Tümü)</button>
                <button className={`btn ${correlationScope === 'class' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setCorrelationScope('class'); setCorrStudentId(null); setCorrExamIds([]); }}>Sınıf</button>
                <button className={`btn ${correlationScope === 'student' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setCorrelationScope('student'); setCorrClassId(null); }}>Öğrenci</button>
              </div>

              {correlationScope === 'class' && (
                <div className="row g-2">
                  <div className="col-md-4">
                    <select className="form-select" value={corrClassId ?? ''} onChange={e => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setCorrClassId(id);
                      if (id) fetchCorrelation({ classroom_id: id });
                    }}>
                      <option value="">— Sınıf Seç —</option>
                      {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {correlationScope === 'student' && (
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Öğrenci Ara</label>
                    <input className="form-control" placeholder="Ad / okul no" value={corrStudentQuery} onChange={e => setCorrStudentQuery(e.target.value)} />
                    <div className="mt-2" style={{ maxHeight: 260, overflow: 'auto' }}>
                      {corrStudentOptions.map(s => (
                        <button key={s.id} type="button" className={`list-group-item list-group-item-action ${corrStudentId === s.id ? 'active' : ''}`} onClick={() => { setCorrStudentId(s.id); if (corrExamIds.length >= 1) fetchCorrelation({ student_id: s.id, exam_ids: corrExamIds }); }}>
                          <div className="d-flex justify-content-between"><span className="fw-semibold">{s.name}</span><span className="small opacity-75">{s.school_no}</span></div>
                          <div className="small opacity-75">{s.classroom?.name ?? '—'}</div>
                        </button>
                      ))}
                      {corrStudentOptions.length === 0 && <div className="text-muted small py-2">Kayıt bulunamadı</div>}
                    </div>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">Sınav Seç (isteğe bağlı, önerilen: 3+)</label>
                    <div className="row g-2">
                      {allExams.map(ex => (
                        <div className="col-md-4" key={ex.id}>
                          <label className="form-check d-flex align-items-start gap-2">
                            <input type="checkbox" className="form-check-input mt-1" checked={corrExamIds.includes(ex.id)} onChange={() => {
                              const next = corrExamIds.includes(ex.id) ? corrExamIds.filter(x => x !== ex.id) : [...corrExamIds, ex.id];
                              setCorrExamIds(next);
                              if (corrStudentId && next.length > 0) fetchCorrelation({ student_id: corrStudentId, exam_ids: next });
                            }} />
                            <span><div className="fw-semibold">{ex.name}</div><div className="text-muted small">{ex.exam_date ?? '—'}</div></span>
                          </label>
                        </div>
                      ))}
                    </div>
                    {corrExamIds.length > 0 && corrExamIds.length < 3 && <div className="text-muted small mt-2">Korelasyon için en az 3 sınav önerilir.</div>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {loadingCorrelation ? (
            <div className="text-center py-5"><div className="spinner-border"></div></div>
          ) : !correlationData ? (
            <div className="card border-0 shadow-sm"><div className="card-body text-muted">Veri yok</div></div>
          ) : (correlationData.course_labels?.length ?? 0) === 0 ? (
            <div className="card border-0 shadow-sm"><div className="card-body text-muted">Yeterli veri yok (min 3 öğrenci/sonuç).</div></div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-light"><h6 className="mb-0">Dersler Arası Korelasyon</h6></div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 180 }}>Ders</th>
                        {correlationData?.course_labels?.map(c => (
                          <th key={c.id} className="text-center" style={{ minWidth: 90 }}>{c.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {correlationData?.course_labels?.map(rowCourse => (
                        <tr key={rowCourse.id}>
                          <td className="fw-semibold">{rowCourse.name}</td>
                          {correlationData?.course_labels?.map(colCourse => {
                            const v = correlationData.matrix?.[rowCourse.id]?.[colCourse.id];
                            const num = typeof v === 'number' ? v : toNum(v);
                            const bg = rowCourse.id === colCourse.id ? 'table-light' : '';
                            return (
                              <td key={colCourse.id} className={`text-center ${bg}`}>{num.toFixed(3)}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5 – COMPARE */}
      {activeTab === 'compare' && (
        <div>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="fw-semibold mb-2">Sınav Seç (en az 2)</div>
              <div className="row g-2">
                {allExams.map(ex => (
                  <div className="col-md-4" key={ex.id}>
                    <label className="form-check d-flex align-items-start gap-2">
                      <input
                        type="checkbox"
                        className="form-check-input mt-1"
                        checked={selectedCompareIds.includes(ex.id)}
                        onChange={() => toggleCompareId(ex.id)}
                      />
                      <span>
                        <div className="fw-semibold">{ex.name}</div>
                        <div className="text-muted small">{ex.exam_date ?? '—'}</div>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              {selectedCompareIds.length > 0 && selectedCompareIds.length < 2 && (
                <div className="text-muted small mt-2">Karşılaştırma için en az 2 sınav seçmelisin.</div>
              )}
            </div>
          </div>

          {loadingCompare ? (
            <div className="text-center py-5"><div className="spinner-border"></div></div>
          ) : compareSeries.length === 0 ? (
            <div className="card border-0 shadow-sm"><div className="card-body text-muted">Karşılaştırma verisi yok</div></div>
          ) : (
            <div className="row g-3">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light"><h6 className="mb-0">Sınav Özeti</h6></div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead><tr><th>Sınav</th><th className="text-center">Öğrenci</th><th className="text-center">Ort.</th><th className="text-center">Min</th><th className="text-center">Max</th><th className="text-center">R²</th></tr></thead>
                        <tbody>
                          {compareSeries.map(s => (
                            <tr key={s.exam_id}>
                              <td>
                                <div className="fw-semibold">{s.exam_name}</div>
                                <div className="text-muted small">{s.exam_date ?? '—'} • {s.exam_type}</div>
                              </td>
                              <td className="text-center">{s.total}</td>
                              <td className="text-center fw-semibold">{toNum(s.avg_net).toFixed(2)}</td>
                              <td className="text-center">{toNum(s.min_net).toFixed(2)}</td>
                              <td className="text-center">{toNum(s.max_net).toFixed(2)}</td>
                              <td className="text-center">{toNum(s.regression?.r_squared).toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light"><h6 className="mb-0">Ders Bazlı Ortalamalar</h6></div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th style={{ minWidth: 180 }}>Ders</th>
                            {compareSeries.map(s => (
                              <th key={s.exam_id} className="text-center" style={{ minWidth: 110 }}>{s.exam_name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compareLabels.map(c => (
                            <tr key={c.id}>
                              <td className="fw-semibold">{c.name}</td>
                              {compareSeries.map(s => {
                                const row = s.course_avgs?.find(x => x.course_id === c.id);
                                return <td key={s.exam_id} className="text-center">{toNum(row?.avg_net).toFixed(2)}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Karşılaştırma, Korelasyon gibi sekmeler benzer mantıkla devam eder... */}
    </div>
  );
}