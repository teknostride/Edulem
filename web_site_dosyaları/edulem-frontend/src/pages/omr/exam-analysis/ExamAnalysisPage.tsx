import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';
import ExamDataGrid from './components/ExamDataGrid';
import ModeToggle from './components/ModeToggle';
import type { DetailedMode } from './components/ModeToggle';
import MultiExamSelector from './components/MultiExamSelector';
import ScoreDistributionChart from './components/ScoreDistributionChart';
import StatCards from './components/StatCards';
import SuccessRateChart from './components/SuccessRateChart';
import ClassMode from './modes/ClassMode';
import ExamMode from './modes/ExamMode';
import StudentMode from './modes/StudentMode';
import SmsMode from './modes/SmsMode';
import SearchableSelect from './components/SearchableSelect';
import { getMyEducationLevelIds, getMyRole } from '../../../utils/userScope';
import { exportResultsXlsx, openResultsPrintView } from './export';
import type {
  AnalyticsSummary,
  ClassAnalytics,
  ClassAvg,
  Classroom,
  CompareSeries,
  CourseDistribution,
  CourseAvg,
  DistBin,
  ExamListItem,
  ResultRow,
  StudentAnalytics,
  StudentOption,
} from './types';
import { clampUniqueIds, format2, toNum, calculateStats, calculateZScore, calculateTScore, calculateASP, scaleTo500, getCourseWeight, compareCoursesByNameOrder } from './utils';

type MainTab = 'general' | 'detailed' | 'sms';

const GUIDANCE_ROLES = new Set([
  'Rehberlik',
  'guidance',
  'Rehber Öğretmen',
  'rehber_teacher',
  'guidance_teacher',
  '6',
]);

const parseClassName = (rawName: unknown) => {
  const name = String(rawName ?? '').trim();
  const m = name.match(/^(\d+)[\s\-\/.]*([A-Za-zÇĞİÖŞÜçğıöşü]?)\s*(.*)$/u);
  const grade = m ? Number(m[1]) : Number.NaN;
  const section = (m?.[2] ?? '').toString().toLocaleUpperCase('tr-TR');
  const rest = (m?.[3] ?? '').toString();
  return { name, grade, section, rest };
};

export default function ExamAnalysisPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isPortalRoute = location.pathname.startsWith('/portal/assessment/analytics');

  const [exam, setExam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('general');

  const [tenantProfile, setTenantProfile] = useState<{ name?: string; logo_url?: string | null } | null>(null);

  const [results, setResults] = useState<ResultRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultCourseHeaders, setResultCourseHeaders] = useState<{ course_id: number; course_name: string }[]>([]);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [distribution, setDistribution] = useState<DistBin[]>([]);
  const [courseDistributions, setCourseDistributions] = useState<CourseDistribution[]>([]);
  const [classAverages, setClassAverages] = useState<ClassAvg[]>([]);
  const [courseAverages, setCourseAverages] = useState<CourseAvg[]>([]);
  const [loadingGeneral, setLoadingGeneral] = useState(true);

  const [selectedCourseIdForNetDist, setSelectedCourseIdForNetDist] = useState<number | null>(null);
  const [selectedCourseIdForSuccess, setSelectedCourseIdForSuccess] = useState<number | null>(null);

  const [detailedMode, setDetailedMode] = useState<DetailedMode>('class');
  const [allExams, setAllExams] = useState<ExamListItem[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([]);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedStudentClassId, setSelectedStudentClassId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classData, setClassData] = useState<ClassAnalytics | null>(null);
  const [loadingClass, setLoadingClass] = useState(false);

  const [studentClassData, setStudentClassData] = useState<ClassAnalytics | null>(null);
  const [loadingStudentClass, setLoadingStudentClass] = useState(false);

  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [loadingStudentOptions, setLoadingStudentOptions] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentData, setStudentData] = useState<StudentAnalytics | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  const [compareSeries, setCompareSeries] = useState<CompareSeries[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const myRole = useMemo(() => getMyRole(), []);
  const isGuidance = useMemo(() => GUIDANCE_ROLES.has(String(myRole ?? '').trim()), [myRole]);
  const myEducationLevelIds = useMemo(() => getMyEducationLevelIds(), []);

  const resultsClassCount = useMemo(() => {
    const ids = new Set<number>();
    results.forEach((r) => {
      const id = r.student?.classroom?.id;
      if (id) ids.add(Number(id));
    });
    return ids.size;
  }, [results]);

  const filteredAndSortedClassrooms = useMemo(() => {
    const base = isGuidance && myEducationLevelIds.length > 0
      ? classrooms.filter((c) => {
          const levelId = c.education_level_id ?? c.grade_level;
          return levelId ? myEducationLevelIds.includes(Number(levelId)) : false;
        })
      : classrooms;

    const sorted = [...base].sort((a, b) => {
      const pa = parseClassName(a?.name);
      const pb = parseClassName(b?.name);
      if (!Number.isNaN(pa.grade) && !Number.isNaN(pb.grade) && pa.grade !== pb.grade) return pa.grade - pb.grade;
      if (!Number.isNaN(pa.grade) !== !Number.isNaN(pb.grade)) return !Number.isNaN(pa.grade) ? -1 : 1;
      if (pa.section !== pb.section) return pa.section.localeCompare(pb.section, 'tr');
      return pa.name.localeCompare(pb.name, 'tr');
    });
    return sorted;
  }, [classrooms, isGuidance, myEducationLevelIds]);

  const classSelectOptions = useMemo(() => {
    return filteredAndSortedClassrooms.map((c) => {
      const p = parseClassName(c.name);
      const group = !Number.isNaN(p.grade) ? `${p.grade}. Sınıf` : 'Diğer';
      const sub = c.education_level_id ? `Kademe: ${c.education_level_id}` : undefined;
      return {
        value: c.id,
        label: c.name,
        groupLabel: group,
        subLabel: sub,
      };
    });
  }, [filteredAndSortedClassrooms]);

  const fetchExam = async () => {
    try {
      const r = await axiosClient.get(`/omr/exams/${examId}`);
      setExam(r.data?.data?.exam ?? null);
    } catch {
      setExam(null);
    }
  };

  const fetchResults = async () => {
    try {
      setLoadingResults(true);
      const r = await axiosClient.get(`/omr/exams/${examId}/results`, { params: { per_page: 200 } });
      setResults(r.data?.data?.results ?? []);
      setResultCourseHeaders(r.data?.data?.course_headers ?? []);
    } catch {
      setResults([]);
      setResultCourseHeaders([]);
      showToast('error', 'Sonuçlar yüklenemedi');
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchGeneral = async () => {
    try {
      setLoadingGeneral(true);
      const endpoint = isPortalRoute
        ? `/portal/assessment/exams/${examId}/analytics`
        : `/omr/exams/${examId}/analytics`;
      const r = await axiosClient.get(endpoint, { params: { bin_size: 5 } });
      const d = r.data?.data;
      setSummary(d?.summary ?? null);
      setDistribution(d?.distribution ?? []);
      setClassAverages(d?.class_averages ?? []);
      setCourseAverages(d?.course_averages ?? []);
      setCourseDistributions(d?.course_distributions ?? []);
    } catch {
      setSummary(null);
      setDistribution([]);
      setCourseDistributions([]);
      setClassAverages([]);
      setCourseAverages([]);
      showToast('error', 'Genel analitik yüklenemedi');
    } finally {
      setLoadingGeneral(false);
    }
  };

  const fetchAllExams = async () => {
    try {
      const r = await axiosClient.get('/omr/exams', { params: { per_page: 200 } });
      setAllExams(r.data?.data?.exams ?? []);
    } catch {
      setAllExams([]);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const r = await axiosClient.get('/classrooms', { params: { per_page: 250 } });
      const raw = Array.isArray(r.data?.data) ? r.data.data : r.data?.data?.classrooms ?? r.data?.data?.data ?? [];
      setClassrooms(raw);
    } catch {
      setClassrooms([]);
    }
  };

  const fetchClassData = async (classroomId: number | null) => {
    if (!classroomId) {
      setClassData(null);
      return;
    }
    try {
      setLoadingClass(true);
      const params: Record<string, any> = { classroom_id: classroomId };
      if (selectedExamIds.length > 0) params['exam_ids[]'] = selectedExamIds;
      const endpoint = isPortalRoute
        ? `/portal/assessment/exams/${examId}/analytics`
        : `/omr/exams/${examId}/analytics/class`;
      const r = await axiosClient.get(endpoint, { params });
      setClassData(r.data?.data ?? null);
    } catch {
      setClassData(null);
      showToast('error', 'Sınıf analizi yüklenemedi');
    } finally {
      setLoadingClass(false);
    }
  };

  const fetchStudentClassData = async (classroomId: number) => {
    if (isGuidance && myEducationLevelIds.length > 0) {
      const allowed = filteredAndSortedClassrooms.some((c) => c.id === classroomId);
      if (!allowed) {
        setStudentClassData(null);
        return;
      }
    }
    try {
      setLoadingStudentClass(true);
      const params: Record<string, any> = { classroom_id: classroomId };
      if (selectedExamIds.length > 0) params['exam_ids[]'] = selectedExamIds;
      const endpoint = isPortalRoute
        ? `/portal/assessment/exams/${examId}/analytics`
        : `/omr/exams/${examId}/analytics/class`;
      const r = await axiosClient.get(endpoint, { params });
      setStudentClassData(r.data?.data ?? null);
    } catch {
      setStudentClassData(null);
    } finally {
      setLoadingStudentClass(false);
    }
  };

  const fetchStudentOptions = async (q: string) => {
    try {
      setLoadingStudentOptions(true);
      const params: Record<string, any> = { q, limit: 60, in_exam: 1 };
      if (selectedStudentClassId) params.classroom_id = selectedStudentClassId;
      const r = await axiosClient.get(`/omr/exams/${examId}/students/search`, { params });
      setStudentOptions(r.data?.data?.students ?? []);
    } catch {
      setStudentOptions([]);
    } finally {
      setLoadingStudentOptions(false);
    }
  };

  const fetchStudentData = async (sid: number) => {
    try {
      setLoadingStudent(true);
      const params: Record<string, any> = { student_id: sid };
      if (selectedExamIds.length > 0) params['exam_ids[]'] = selectedExamIds;
      const endpoint = isPortalRoute
        ? `/portal/assessment/exams/${examId}/analytics`
        : `/omr/exams/${examId}/analytics/student`;
      const r = await axiosClient.get(endpoint, { params });
      setStudentData(r.data?.data ?? null);
    } catch (err: any) {
      setStudentData(null);
      showToast('error', err?.response?.data?.message || 'Öğrenci analizi yüklenemedi');
    } finally {
      setLoadingStudent(false);
    }
  };

  const fetchCompare = async (ids: number[]) => {
    try {
      setLoadingCompare(true);
      const endpoint = isPortalRoute
        ? `/portal/assessment/exams/${examId}/analytics`
        : `/omr/exams/${examId}/analytics/compare`;
      const r = await axiosClient.get(endpoint, { params: { exam_ids: ids } });
      setCompareSeries(r.data?.data?.series ?? []);
    } catch {
      setCompareSeries([]);
      showToast('error', 'Karşılaştırma verisi yüklenemedi');
    } finally {
      setLoadingCompare(false);
    }
  };

  useEffect(() => {
    fetchExam();
    fetchResults();
    fetchGeneral();
    fetchAllExams();
    fetchClassrooms();

    (async () => {
      try {
        const r = await axiosClient.get('/tenant/profile');
        const p = r?.data?.data;
        setTenantProfile({
          name: p?.name,
          logo_url: p?.logo_url ?? null,
        });
      } catch {
        setTenantProfile(null);
      }
    })();
  }, [examId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchStudentOptions(studentQuery);
    }, 250);
    return () => window.clearTimeout(t);
  }, [studentQuery]);

  useEffect(() => {
    if (activeTab !== 'detailed') return;
    if (detailedMode !== 'student') return;
    if (!selectedStudentClassId) return;
    fetchStudentOptions('');
  }, [activeTab, detailedMode, selectedStudentClassId]);

  useEffect(() => {
    if (activeTab !== 'detailed') return;
    if (detailedMode !== 'student') return;
    if (!selectedStudentClassId) {
      setStudentClassData(null);
      return;
    }
    fetchStudentClassData(selectedStudentClassId);
  }, [activeTab, detailedMode, selectedStudentClassId, selectedExamIds]);

  useEffect(() => {
    if (detailedMode === 'class' && selectedClassId) {
      fetchClassData(selectedClassId);
    }
    if (detailedMode === 'student' && selectedStudentId) {
      fetchStudentData(selectedStudentId);
    }

    const ids = clampUniqueIds(selectedExamIds);
    if (detailedMode === 'exam' && ids.length >= 2) {
      fetchCompare(ids);
    } else if (detailedMode === 'exam') {
      setCompareSeries([]);
    }
  }, [selectedExamIds, detailedMode]);

  const totals = useMemo(() => {
    const sums = courseAverages.reduce(
      (acc, c) => {
        acc.correct += toNum(c.correct);
        acc.wrong += toNum(c.wrong);
        acc.blank += toNum(c.blank);
        return acc;
      },
      { correct: 0, wrong: 0, blank: 0 }
    );
    return sums;
  }, [courseAverages]);

  const examCourseHeaders = useMemo(() => {
    if (Array.isArray(resultCourseHeaders) && resultCourseHeaders.length > 0) {
      return resultCourseHeaders.slice().sort((a, b) => compareCoursesByNameOrder(a.course_name, b.course_name));
    }
    const fromExam = (exam?.exam_courses ?? exam?.examCourses ?? []) as any[];
    if (Array.isArray(fromExam) && fromExam.length > 0) {
      return fromExam
        .slice()
        .sort((a, b) => toNum(a?.sort_order) - toNum(b?.sort_order))
        .map((ec) => ({
          course_id: Number(ec?.course_id ?? ec?.course?.id ?? 0),
          course_name: String(ec?.course?.name ?? ec?.course_name ?? `Ders ${ec?.course_id}`),
        }))
        .filter((x) => x.course_id > 0)
        .sort((a, b) => compareCoursesByNameOrder(a.course_name, b.course_name));
    }

    return courseAverages
      .slice()
      .sort((a, b) => compareCoursesByNameOrder(String(a.course_name ?? ''), String(b.course_name ?? '')))
      .map((c) => ({ course_id: Number(c.course_id), course_name: String(c.course_name ?? `Ders ${c.course_id}`) }));
  }, [courseAverages, exam, resultCourseHeaders]);

  // T-Score calculation for all results
  const tScoreResults = useMemo(() => {
    if (!results.length || !examCourseHeaders.length) return [];

    // Build dynamic config with auto-calculated mean/std from all students
    const configs: Record<number, { weight: number; mean: number; stdDev: number; maxQuestions: number }> = {};

    examCourseHeaders.forEach((c) => {
      const nets: number[] = [];
      results.forEach((r) => {
        const score = r.course_scores?.[c.course_id];
        if (score) {
          nets.push(toNum(score.net));
        }
      });

      const stats = calculateStats(nets);
      configs[c.course_id] = {
        weight: getCourseWeight(c.course_name),
        mean: stats.mean,
        stdDev: stats.stdDev,
        maxQuestions: Math.max(...nets, 0) || 20,
      };
    });

    // Calculate min/max TASP boundaries
    let minTASP = 0;
    let maxTASP = 0;
    Object.values(configs).forEach((cfg) => {
      const zMin = calculateZScore(0, cfg.mean, cfg.stdDev);
      const tMin = calculateTScore(zMin);
      minTASP += calculateASP(tMin, cfg.weight);

      const zMax = calculateZScore(cfg.maxQuestions, cfg.mean, cfg.stdDev);
      const tMax = calculateTScore(zMax);
      maxTASP += calculateASP(tMax, cfg.weight);
    });

    // Calculate T-Score for each student
    const calculated = results.map((r) => {
      let studentTASP = 0;
      examCourseHeaders.forEach((c) => {
        const score = r.course_scores?.[c.course_id];
        if (score && configs[c.course_id]) {
          const net = toNum(score.net);
          const cfg = configs[c.course_id];
          const z = calculateZScore(net, cfg.mean, cfg.stdDev);
          const t = calculateTScore(z);
          studentTASP += calculateASP(t, cfg.weight);
        }
      });

      const finalScore = scaleTo500(studentTASP, minTASP, maxTASP);

      return {
        ...r,
        tScore: finalScore,
        tasp: studentTASP,
      };
    });

    // Sort by T-Score and assign ranks
    return calculated
      .sort((a, b) => b.tScore - a.tScore)
      .map((r, idx) => ({ ...r, tScoreRank: idx + 1 }));
  }, [results, examCourseHeaders]);

  const exportResults = useMemo(() => {
    if (tScoreResults.length === 0) return results;
    return tScoreResults.map((r) => ({
      ...r,
      total_point: r.tScore,
      rank: r.tScoreRank,
    }));
  }, [results, tScoreResults]);

  const courseAvgById = useMemo(() => {
    const m = new Map<number, CourseAvg>();
    courseAverages.forEach((c) => m.set(Number(c.course_id), c));
    return m;
  }, [courseAverages]);

  const courseDistById = useMemo(() => {
    const m = new Map<number, DistBin[]>();
    courseDistributions.forEach((c) => m.set(Number(c.course_id), c.distribution ?? []));
    return m;
  }, [courseDistributions]);

  const netDistChart = useMemo(() => {
    if (selectedCourseIdForNetDist) return courseDistById.get(selectedCourseIdForNetDist) ?? [];
    return distribution;
  }, [courseDistById, distribution, selectedCourseIdForNetDist]);

  const successChart = useMemo(() => {
    if (!selectedCourseIdForSuccess) return totals;
    const c = courseAvgById.get(selectedCourseIdForSuccess);
    return {
      correct: toNum(c?.correct),
      wrong: toNum(c?.wrong),
      blank: toNum(c?.blank),
    };
  }, [courseAvgById, selectedCourseIdForSuccess, totals]);

  const courseSelectOptions = useMemo(() => {
    return courseAverages
      .slice()
      .sort((a, b) => compareCoursesByNameOrder(String(a.course_name ?? ''), String(b.course_name ?? '')))
      .map((c) => ({
        id: Number(c.course_id),
        label: String(c.course_name ?? `Ders ${c.course_id}`),
      }));
  }, [courseAverages]);

  const generalCards = useMemo(() => {
    const cards: { label: string; value: string; icon: string; color: string }[] = [];
    
    if (summary) {
      cards.push(
        { label: 'Ortalama (Mean)', value: format2(summary.avg_net), icon: 'ti-chart-line', color: 'success' },
        { label: 'Medyan', value: format2(summary.median_net), icon: 'ti-line', color: 'info' },
        { label: 'Varyans', value: format2(summary.variance), icon: 'ti-square-root-2', color: 'primary' },
        { label: 'Std. Sapma', value: format2(summary.stddev_net), icon: 'ti-sigma', color: 'danger' }
      );
    }
    
    // Add T-Score statistics
    if (tScoreResults.length > 0) {
      const tScores = tScoreResults.map(r => r.tScore);
      const avgTScore = tScores.reduce((a, b) => a + b, 0) / tScores.length;
      const maxTScore = Math.max(...tScores);
      const minTScore = Math.min(...tScores);
      
      cards.push(
        { label: 'T-Score Ortalama', value: format2(avgTScore), icon: 'ti-star', color: 'warning' },
        { label: 'T-Score En Yüksek', value: format2(maxTScore), icon: 'ti-trophy', color: 'success' },
        { label: 'T-Score En Düşük', value: format2(minTScore), icon: 'ti-arrow-down', color: 'danger' }
      );
    }
    
    return cards;
  }, [summary, tScoreResults]);

  /**
   * BUG FIX: Patch class/student data with parent-calculated T-Scores
   * Detailed views (classMode/studentMode) use raw backend results, 
   * but the general view uses frontend-calculated weighted points (T-Scores).
   */
  const tScoreMap = useMemo(() => {
    const map = new Map<number, { score: number; rank: number }>();
    tScoreResults.forEach(r => {
      const sid = r.student?.id;
      if (sid) {
        map.set(Number(sid), { score: r.tScore, rank: r.tScoreRank });
      }
    });
    return map;
  }, [tScoreResults]);

  const patchedClassData = useMemo(() => {
    if (!classData || tScoreMap.size === 0) return classData;
    const next = { ...classData };
    next.students = (next.students ?? []).map(s => {
      const m = tScoreMap.get(Number(s.id));
      if (m) {
        return { ...s, total_point: m.score, overall_rank: m.rank };
      }
      return s;
    });
    // Maintain class sorting and class rank based on weighted points
    next.students.sort((a, b) => toNum(b.total_point) - toNum(a.total_point));
    next.students = next.students.map((s, idx) => ({ ...s, rank: idx + 1 }));
    return next;
  }, [classData, tScoreMap]);

  const patchedStudentData = useMemo(() => {
    if (!studentData || tScoreMap.size === 0) return studentData;
    const next = { ...studentData };
    const m = tScoreMap.get(Number(next.student?.id));
    if (m) {
      next.result = { ...next.result, total_point: m.score, rank: m.rank };
    }
    return next;
  }, [studentData, tScoreMap]);

  const patchedStudentClassData = useMemo(() => {
    if (!studentClassData || tScoreMap.size === 0) return studentClassData;
    const next = { ...studentClassData };
    next.students = (next.students ?? []).map(s => {
      const m = tScoreMap.get(Number(s.id));
      if (m) {
        return { ...s, total_point: m.score };
      }
      return s;
    });
    return next;
  }, [studentClassData, tScoreMap]);

  const detailedHeader = (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-2">
        <ModeToggle value={detailedMode} onChange={setDetailedMode} />
        <MultiExamSelector
          exams={allExams.filter((e) => String(e.id) !== String(examId))}
          selectedIds={selectedExamIds}
          onChange={(next) => setSelectedExamIds(next)}
        />
      </div>
    </div>
  );

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center mb-3 gap-2">
        <button className="btn btn-sm btn-light me-2" onClick={() => navigate('/omr/exams')}>
          <i className="ti ti-arrow-left me-1"></i>Geri
        </button>
        <div>
          <h4 className="page-title mb-0">Sınav Analizi</h4>
          {exam && <p className="text-muted mb-0 small">{exam.name} — {exam.exam_type}</p>}
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'general' ? 'active fw-semibold' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            Genel Analiz
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'detailed' ? 'active fw-semibold' : ''}`}
            onClick={() => setActiveTab('detailed')}
          >
            Detaylı Analiz
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === 'sms' ? 'active fw-semibold text-primary' : ''}`}
            onClick={() => setActiveTab('sms')}
          >
            <i className="ti ti-message-dots me-1"></i> SMS Gönder
          </button>
        </li>
      </ul>

      {activeTab === 'general' && (
        <>
          <ExamDataGrid results={results} loading={loadingResults} courseHeaders={examCourseHeaders} compactDefault={Array.isArray(exam?.merged_exam_ids) && exam.merged_exam_ids.length > 0} tScoreResults={tScoreResults} />

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body d-flex justify-content-end gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={() => exportResultsXlsx(`exam-${examId}-ogrenci-siralama.xlsx`, exportResults, {
                  title: `${exam?.name ?? `Sınav ${examId}`} — Öğrenci Net/Puan Listesi`,
                  meta: [
                    { label: 'Kurum', value: tenantProfile?.name ?? '' },
                    { label: 'Sınav', value: `${exam?.name ?? `Sınav ${examId}`} — ${exam?.exam_type ?? ''}`.trim() },
                    { label: 'Yanlış Ceza', value: String(exam?.wrong_penalty ?? '') },
                  ].filter((x) => x.value && x.value !== 'null' && x.value !== 'undefined'),
                  statsTitle: 'KATILIM',
                  stats: [
                    { label: 'Genel', value: exportResults.length },
                    { label: 'Sınıf', value: resultsClassCount },
                  ],
                  courses: examCourseHeaders,
                })}
                disabled={exportResults.length === 0}
              >
                Excel (XLSX)
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => openResultsPrintView(`Sınav ${examId} — Öğrenci Sıralaması`, exportResults, {
                  logoUrl: tenantProfile?.logo_url ?? null,
                  headerTitle: `${exam?.name ?? `Sınav ${examId}`} — Öğrenci Net/Puan Listesi`,
                  headerSubtitleLeft: exam ? `${exam?.configured_at ?? ''}` : '',
                  headerSubtitleRight: tenantProfile?.name ?? '',
                  meta: [
                    { label: 'Sınav', value: `${exam?.name ?? `Sınav ${examId}`} — ${exam?.exam_type ?? ''}`.trim() },
                    { label: 'Yanlış Ceza', value: String(exam?.wrong_penalty ?? '') },
                  ].filter((x) => x.value && x.value !== 'null' && x.value !== 'undefined'),
                  statsTitle: 'KATILIM',
                  stats: [
                    { label: 'Genel', value: exportResults.length },
                    { label: 'Sınıf', value: resultsClassCount },
                  ],
                  courses: examCourseHeaders,
                })}
                disabled={exportResults.length === 0}
              >
                PDF (Yazdır)
              </button>
            </div>
          </div>

          {loadingGeneral ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : !summary || summary.total === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5 text-muted">Henüz sonuç yüklenmemiş</div>
            </div>
          ) : (
            <>
              <StatCards title="Genel İstatistikler" items={generalCards} />

              <div className="row g-3 mb-3">
                <div className="col-md-7">
                  <ScoreDistributionChart
                    distribution={netDistChart}
                    title={selectedCourseIdForNetDist
                      ? `Net Dağılımı — ${courseAvgById.get(selectedCourseIdForNetDist)?.course_name ?? ''}`
                      : 'Net Dağılımı (Toplam)'
                    }
                    right={
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 220 }}
                        value={selectedCourseIdForNetDist ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedCourseIdForNetDist(v ? Number(v) : null);
                        }}
                      >
                        <option value="">Toplam</option>
                        {courseSelectOptions.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    }
                  />
                </div>
                <div className="col-md-5">
                  <SuccessRateChart
                    correct={successChart.correct}
                    wrong={successChart.wrong}
                    blank={successChart.blank}
                    title={selectedCourseIdForSuccess
                      ? `Doğru / Yanlış / Boş — ${courseAvgById.get(selectedCourseIdForSuccess)?.course_name ?? ''}`
                      : 'Doğru / Yanlış / Boş (Toplam)'
                    }
                    right={
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 220 }}
                        value={selectedCourseIdForSuccess ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedCourseIdForSuccess(v ? Number(v) : null);
                        }}
                      >
                        <option value="">Toplam</option>
                        {courseSelectOptions.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    }
                  />
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-light">
                  <h6 className="mb-0">Branş Ortalamaları</h6>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Ders</th>
                          <th className="text-center">Ort. Net</th>
                          <th className="text-center">Doğru</th>
                          <th className="text-center">Yanlış</th>
                          <th className="text-center">Boş</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-semibold">Toplam</td>
                          <td className="text-center fw-bold">{format2(summary.avg_net)}</td>
                          <td className="text-center">{totals.correct}</td>
                          <td className="text-center">{totals.wrong}</td>
                          <td className="text-center">{totals.blank}</td>
                        </tr>
                        {courseAverages
                          .slice()
                          .sort((a, b) => toNum(b.avg_net) - toNum(a.avg_net))
                          .map((c) => (
                            <tr key={c.course_id}>
                              <td className="fw-semibold">{c.course_name}</td>
                              <td className="text-center fw-bold">{format2(c.avg_net)}</td>
                              <td className="text-center">{c.correct}</td>
                              <td className="text-center">{c.wrong}</td>
                              <td className="text-center">{c.blank}</td>
                            </tr>
                          ))}
                        {courseAverages.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-muted small py-3 text-center">Veri yok</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-header bg-light">
                  <h6 className="mb-0">Sınıf Ortalamaları</h6>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Sınıf</th>
                          <th className="text-center">Öğrenci</th>
                          <th className="text-center">Ort. Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classAverages
                          .slice()
                          .sort((a, b) => toNum(b.avg_net) - toNum(a.avg_net))
                          .map((c) => (
                            <tr key={c.classroom_id}>
                              <td className="fw-semibold">{c.classroom_name}</td>
                              <td className="text-center">{c.total}</td>
                              <td className="text-center fw-bold">{format2(c.avg_net)}</td>
                            </tr>
                          ))}
                        {classAverages.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-muted small py-3 text-center">
                              Veri yok
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'detailed' && (
        <>
          {detailedHeader}

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body d-flex justify-content-end gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={() => exportResultsXlsx(`exam-${examId}-ogrenci-siralama.xlsx`, exportResults, {
                  title: `${exam?.name ?? `Sınav ${examId}`} — Öğrenci Net/Puan Listesi`,
                  meta: [
                    { label: 'Kurum', value: tenantProfile?.name ?? '' },
                    { label: 'Sınav', value: `${exam?.name ?? `Sınav ${examId}`} — ${exam?.exam_type ?? ''}`.trim() },
                    { label: 'Yanlış Ceza', value: String(exam?.wrong_penalty ?? '') },
                  ].filter((x) => x.value && x.value !== 'null' && x.value !== 'undefined'),
                  statsTitle: 'KATILIM',
                  stats: [
                    { label: 'Genel', value: exportResults.length },
                    { label: 'Sınıf', value: resultsClassCount },
                  ],
                  courses: examCourseHeaders,
                })}
                disabled={exportResults.length === 0}
              >
                Excel (XLSX)
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => openResultsPrintView(`Sınav ${examId} — Öğrenci Sıralaması`, exportResults, {
                  logoUrl: tenantProfile?.logo_url ?? null,
                  headerTitle: `${exam?.name ?? `Sınav ${examId}`} — Öğrenci Net/Puan Listesi`,
                  headerSubtitleRight: tenantProfile?.name ?? '',
                  meta: [
                    { label: 'Sınav', value: `${exam?.name ?? `Sınav ${examId}`} — ${exam?.exam_type ?? ''}`.trim() },
                    { label: 'Yanlış Ceza', value: String(exam?.wrong_penalty ?? '') },
                  ].filter((x) => x.value && x.value !== 'null' && x.value !== 'undefined'),
                  statsTitle: 'KATILIM',
                  stats: [
                    { label: 'Genel', value: exportResults.length },
                    { label: 'Sınıf', value: resultsClassCount },
                  ],
                  courses: examCourseHeaders,
                })}
                disabled={exportResults.length === 0}
              >
                PDF (Yazdır)
              </button>
            </div>
          </div>

          {detailedMode === 'class' && (
            <ClassMode
              classrooms={filteredAndSortedClassrooms}
              selectedClassId={selectedClassId}
              onSelectClass={(id) => {
                setSelectedClassId(id);
                setClassData(null);
                if (id) fetchClassData(id);
              }}
              data={patchedClassData}
              loading={loadingClass}
            />
          )}

          {detailedMode === 'student' && (
            <div>
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Sınıf</label>
                      <SearchableSelect<number>
                        value={selectedStudentClassId}
                        options={classSelectOptions}
                        placeholder="Sınıf seçin"
                        searchPlaceholder="Sınıf ara..."
                        onChange={(next) => {
                          setSelectedStudentClassId(next);
                          setSelectedStudentId(null);
                          setStudentData(null);
                          setStudentQuery('');
                          setStudentOptions([]);
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Öğrenci</label>
                      <SearchableSelect<number>
                        value={selectedStudentId}
                        disabled={!selectedStudentClassId}
                        options={studentOptions.map((s) => ({
                          value: s.id,
                          label: s.name,
                          subLabel: `${s.classroom?.name ?? '—'} · ${s.school_no ?? '—'}`,
                        }))}
                        placeholder={!selectedStudentClassId ? 'Önce sınıf seçin' : 'Öğrenci seçin'}
                        searchPlaceholder="Öğrenci ara..."
                        onChange={(next) => {
                          setSelectedStudentId(next);
                          setStudentData(null);
                          if (next) fetchStudentData(next);
                        }}
                      />
                      <div className="small text-muted mt-2">
                        {selectedStudentClassId ? (
                          <>
                            Bu sınıf içinde arama için yazmaya başlayın.
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 ms-2"
                              onClick={() => fetchStudentOptions(studentQuery)}
                              disabled={loadingStudentOptions}
                            >
                              {loadingStudentOptions ? 'Yükleniyor...' : 'Yenile'}
                            </button>
                          </>
                        ) : (
                          'Öğrenci listesi sınıf seçilince yüklenir.'
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <StudentMode
                selectedStudentId={selectedStudentId}
                data={patchedStudentData}
                loading={loadingStudent}
                classData={patchedStudentClassData}
                loadingClassData={loadingStudentClass}
              />
            </div>
          )}

          {detailedMode === 'exam' && <ExamMode series={compareSeries} loading={loadingCompare} />}
        </>
      )}

      {activeTab === 'sms' && (
        <SmsMode examId={examId!} examName={exam?.name} />
      )}
    </div>
  );
}
