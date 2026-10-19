import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, Cell, PieChart, Pie 
} from 'recharts';

type ExamResultRow = {
    result_id: number;
    exam_id: number;
    exam_name: string;
    exam_type: string;
    exam_date: string;
    total_net: number;
    total_point: number | string;
    rank?: number;
    school_rank?: number | string;
    class_rank?: number | string;
    student_id: number;
};

type SessionRow = {
    id: number;
    name: string;
    exam_type: string;
    exam_date: string;
    exam_ids: number[];
    exam_count: number;
    total_net: number;
    total_point: number | string;
    rank?: number;
    school_rank?: number | string;
    class_rank?: number | string;
    created_at: string;
    student_id?: number;
};

const COLORS = ['#10b981', '#ef4444', '#94a3b8']; // Green, Red, Gray

const StudentAssessmentPage = () => {

    const [exams, setExams] = useState<ExamResultRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [downloadingCardId, setDownloadingCardId] = useState<string | null>(null);

    useEffect(() => {
        fetchExams();
        fetchSessions();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/portal/assessment/exams');
            setExams(res.data?.data?.exams ?? []);
        } catch (error) {
            console.error('Sınavlar yüklenirken hata oluştu:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await axiosClient.get('/portal/assessment/sessions');
            setSessions(res.data?.data?.sessions ?? []);
        } catch (error) {
            console.error('Oturumlar yüklenirken hata oluştu:', error);
        }
    };

    const handleViewDetail = async (examId: number, studentId?: number) => {
        try {
            setDetailLoading(true);
            const res = await axiosClient.get(`/portal/assessment/exams/${examId}/result`, {
                params: studentId ? { student_id: studentId } : {}
            });
            setSelectedResult(res.data?.data ?? null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            console.error('Analiz yüklenirken hata oluştu:', error);
            alert(error.response?.data?.message || 'Analiz yüklenirken bir hata oluştu.');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSessionAnalyze = async (session: SessionRow) => {
        try {
            setDetailLoading(true);
            const res = await axiosClient.get(`/portal/assessment/sessions/${session.id}/result`, {
                params: session.student_id ? { student_id: session.student_id } : {}
            });
            setSelectedResult(res.data?.data ?? null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            console.error('Oturum analizi yüklenirken hata oluştu:', error);
            alert(error.response?.data?.message || 'Oturum analizi yüklenirken bir hata oluştu.');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDownloadReportCard = async (
        mode: 'exam' | 'session',
        id: number,
        studentId?: number,
        title?: string
    ) => {
        const key = `${mode}_${id}_${studentId ?? 0}`;
        try {
            setDownloadingCardId(key);
            const url = mode === 'exam'
                ? `/omr/exams/${id}/report-card`
                : `/omr/sessions/${id}/report-card`;
            const params: Record<string, any> = {};
            if (studentId) params.student_id = studentId;

            const res = await axiosClient.get(url, { params, responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const href = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = `karne_${(title || 'ogrenci').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(href);
        } catch (error: any) {
            console.error('Karne indirme hatası:', error);
            alert('Karne PDF indirilemedi. Lütfen sonucunuzun açıklandığından emin olun.');
        } finally {
            setDownloadingCardId(null);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid p-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
                <p className="mt-2 text-muted">Sınav sonuçlarınız hazırlanıyor...</p>
            </div>
        );
    }

    if (selectedResult) {
        const { result, exam, session, topic_analysis, course_scores, class_averages, school_averages, student_name, student_id } = selectedResult;

        const scoresList: any[] = Array.isArray(course_scores) 
            ? course_scores 
            : (course_scores ? Object.values(course_scores) : []);

        const classAvgList: any[] = Array.isArray(class_averages) ? class_averages : [];
        const schoolAvgList: any[] = Array.isArray(school_averages) ? school_averages : [];
        const topicList: any[] = Array.isArray(topic_analysis) ? topic_analysis : [];

        // Transform course scores and averages for comparison chart
        const comparisonData = scoresList.map((cs: any) => {
            const classAvg = classAvgList.find((ca: any) => ca.course_id == cs.course_id);
            const schoolAvg = schoolAvgList.find((sa: any) => sa.course_id == cs.course_id);
            return {
                name: cs.course_name,
                studentNet: parseFloat(cs.net || 0),
                classAvgNet: classAvg ? parseFloat(classAvg.average_net || 0) : 0,
                schoolAvgNet: schoolAvg ? parseFloat(schoolAvg.average_net || 0) : 0
            };
        });

        const totalCorrect = scoresList.reduce((acc: number, cur: any) => acc + (parseInt(cur.correct) || 0), 0);
        const totalWrong = scoresList.reduce((acc: number, cur: any) => acc + (parseInt(cur.wrong) || 0), 0);
        const totalBlank = scoresList.reduce((acc: number, cur: any) => acc + (parseInt(cur.blank || 0) || 0), 0);

        const pieData = [
            { name: 'Doğru', value: totalCorrect },
            { name: 'Yanlış', value: totalWrong },
            { name: 'Boş', value: totalBlank },
        ];

        const titleName = exam?.name || session?.name || 'Sınav Analizi';
        const displayType = exam?.exam_type || session?.exam_type || '';
        const displayDate = exam?.exam_date || session?.exam_date;

        return (
            <div className="container-fluid p-4">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <div>
                        <button className="btn btn-link p-0 text-decoration-none text-dark d-flex align-items-center mb-1" onClick={() => setSelectedResult(null)}>
                            <i className="ti ti-arrow-left me-1 fs-5"></i> Listeye Dön
                        </button>
                        <h3 className="fw-bold mb-0">{titleName} - Detaylı Analiz</h3>
                        <p className="text-muted mb-0">{student_name} {displayType ? `| ${displayType}` : ''} {displayDate ? `| ${displayDate}` : ''}</p>
                    </div>
                    <div>
                        <button
                            className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm"
                            disabled={downloadingCardId !== null}
                            onClick={() => {
                                if (session?.id) {
                                    handleDownloadReportCard('session', session.id, student_id, titleName);
                                } else if (exam?.id) {
                                    handleDownloadReportCard('exam', exam.id, student_id, titleName);
                                }
                            }}
                        >
                            {downloadingCardId ? <span className="spinner-border spinner-border-sm"></span> : <i className="ti ti-file-download fs-5"></i>}
                            Karne İndir (PDF)
                        </button>
                    </div>
                </div>

                {/* Summary Row */}
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Toplam Net', value: result?.total_net ?? '-', color: 'primary', icon: 'ti-chart-bar' },
                        { label: 'Toplam Puan', value: result?.total_point ?? '-', color: 'success', icon: 'ti-award' },
                        { label: 'Kurum Sırası', value: result?.school_rank || result?.rank || '-', color: 'info', icon: 'ti-trophy' },
                        { label: 'Sınıf Sırası', value: result?.class_rank || '-', color: 'warning', icon: 'ti-award' },
                        { label: 'Kitapçık', value: result?.booklet_type || '-', color: 'secondary', icon: 'ti-book' }
                    ].map((item, idx) => (
                        <div key={idx} className="col-12 col-sm-6 col-lg">
                            <div className={`card border-0 shadow-sm border-start border-4 border-${item.color}`}>
                                <div className="card-body p-3">
                                    <div className="d-flex align-items-center">
                                        <div className={`bg-light-${item.color} p-2 rounded-circle me-3`}>
                                            <i className={`ti ${item.icon} fs-5 text-${item.color}`}></i>
                                        </div>
                                        <div>
                                            <h6 className="text-muted small mb-1">{item.label}</h6>
                                            <h4 className="fw-bold mb-0">{item.value}</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row g-4">
                    {/* Main Analytics: Student vs Class vs School */}
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <h5 className="fw-bold mb-4">Ders Bazlı Net Karşılaştırması</h5>
                                <div style={{ width: '100%', height: 350 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={comparisonData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                            <Tooltip 
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="top" height={36}/>
                                            <Bar name="Öğrenci" dataKey="studentNet" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar name="Sınıf Ort." dataKey="classAvgNet" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar name="Okul Ort." dataKey="schoolAvgNet" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Distribution Pie */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body d-flex flex-column align-items-center justify-content-center">
                                <h5 className="fw-bold mb-2">Soru Dağılımı</h5>
                                <div style={{ width: '100%', height: 250 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={85}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-3 w-100">
                                    {pieData.map((item, idx) => (
                                        <div key={idx} className="d-flex justify-content-between mb-2">
                                            <span className="text-muted"><span className="badge p-1 me-2" style={{ backgroundColor: COLORS[idx] }}> </span>{item.name}</span>
                                            <span className="fw-bold">{item.value} Soru</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Table */}
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-transparent py-3">
                                <h5 className="fw-bold mb-0">Detaylı Performans Tablosu</h5>
                            </div>
                            <div className="table-responsive">
                                <table className="table align-middle table-hover mb-0">
                                    <thead className="bg-light text-muted small text-uppercase">
                                        <tr>
                                            <th className="ps-4">Ders</th>
                                            <th className="text-center">Doğru</th>
                                            <th className="text-center">Yanlış</th>
                                            <th className="text-center">Boş</th>
                                            <th className="text-center text-primary">Öğrenci Net</th>
                                            <th className="text-center bg-soft-success text-success">Sınıf Ort.</th>
                                            <th className="text-center bg-soft-secondary text-secondary">Okul Ort.</th>
                                            <th className="text-center">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scoresList.map((cs: any) => {
                                            const classAvg = classAvgList.find((ca: any) => ca.course_id == cs.course_id);
                                            const schoolAvg = schoolAvgList.find((sa: any) => sa.course_id == cs.course_id);
                                            const isAbove = parseFloat(cs.net || 0) >= (classAvg ? parseFloat(classAvg.average_net || 0) : 0);
                                            return (
                                                <tr key={cs.course_id}>
                                                    <td className="ps-4 fw-bold">{cs.course_name}</td>
                                                    <td className="text-center text-success fw-bold">{cs.correct}</td>
                                                    <td className="text-center text-danger fw-bold">{cs.wrong}</td>
                                                    <td className="text-center text-muted">{cs.blank || 0}</td>
                                                    <td className="text-center fw-bolder text-primary fs-15">{cs.net}</td>
                                                    <td className="text-center fw-bold text-success">
                                                        {classAvg ? Number(classAvg.average_net).toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="text-center fw-bold text-secondary">
                                                        {schoolAvg ? Number(schoolAvg.average_net).toFixed(2) : '0.00'}
                                                    </td>
                                                    <td className="text-center">
                                                        {isAbove ? 
                                                            <span className="badge bg-soft-success text-success"><i className="ti ti-trending-up me-1"></i> Ortalama Üstü</span> :
                                                            <span className="badge bg-soft-warning text-warning"><i className="ti ti-trending-down me-1"></i> Ortalama Altı</span>
                                                        }
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Topic Analysis */}
                    {topicList && topicList.length > 0 && (
                        <div className="col-12">
                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-transparent py-3">
                                    <h5 className="fw-bold mb-0">Konu/Kazanım Bazlı Başarı Analizi</h5>
                                </div>
                                <div className="table-responsive">
                                    <table className="table align-middle table-hover mb-0">
                                        <thead className="bg-light text-muted small text-uppercase">
                                            <tr>
                                                <th className="ps-4">Ders / Konu</th>
                                                <th className="text-center">Doğru</th>
                                                <th className="text-center">Yanlış</th>
                                                <th className="text-center">Boş</th>
                                                <th className="text-center">Başarı Grafiği</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topicList.map((ta: any, idx: number) => {
                                                const total = ta.correct + ta.wrong + ta.blank;
                                                const success = total > 0 ? (ta.correct / total) * 100 : 0;
                                                return (
                                                    <tr key={idx}>
                                                        <td className="ps-4">
                                                            <div className="text-muted small lh-1 mb-1">{ta.course_name}</div>
                                                            <div className="fw-medium">{ta.topic_name || 'Diğer'}</div>
                                                        </td>
                                                        <td className="text-center text-success">{ta.correct}</td>
                                                        <td className="text-center text-danger">{ta.wrong}</td>
                                                        <td className="text-center text-muted">{ta.blank}</td>
                                                        <td className="text-center">
                                                            <div className="d-flex align-items-center justify-content-center px-3">
                                                                <span className="me-2 fw-bold small" style={{ minWidth: '35px' }}>{success.toFixed(0)}%</span>
                                                                <div className="progress flex-grow-1" style={{ height: '6px' }}>
                                                                    <div 
                                                                        className={`progress-bar ${success >= 70 ? 'bg-success' : success >= 40 ? 'bg-warning' : 'bg-danger'}`} 
                                                                        style={{ width: `${success}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid p-4">
            <div className="mb-4">
                <h3 className="fw-bold mb-1">Ölçme Değerlendirme Analizi</h3>
                <p className="text-muted">Paylaşılan sınav sonuçlarını ve grafiksel analizleri buradan takip edebilirsiniz.</p>
            </div>

            {/* Sessions Section */}
            {sessions.length > 0 && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-transparent py-3">
                        <h5 className="fw-bold mb-0">Birleşik Oturumlar</h5>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light text-muted small text-uppercase">
                                    <tr>
                                        <th className="ps-4" style={{ width: '40%' }}>Oturum Adı</th>
                                        <th>Sınav Sayısı</th>
                                        <th>Tarih</th>
                                        <th className="text-center">Toplam Net</th>
                                        <th className="text-center">Toplam Puan</th>
                                        <th className="text-center">Kurum Sıra</th>
                                        <th className="text-center">Sınıf Sıra</th>
                                        <th className="text-end pe-4">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session, idx) => (
                                        <tr key={idx}>
                                            <td className="ps-4 fw-bold text-dark">{session.name}</td>
                                            <td><span className="badge bg-secondary">{session.exam_count}</span></td>
                                            <td>{session.exam_date}</td>
                                            <td className="text-center fw-bolder text-dark fs-15">{session.total_net}</td>
                                            <td className="text-center fw-bolder text-dark fs-15">{session.total_point}</td>
                                            <td className="text-center">
                                                <span className="badge bg-light text-dark border">{session.school_rank || session.rank || '-'}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-light text-dark border">{session.class_rank || '-'}</span>
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end align-items-center gap-2">
                                                    <button 
                                                        className="btn btn-soft-primary btn-sm rounded-pill px-3"
                                                        onClick={() => handleDownloadReportCard('session', session.id, session.student_id, session.name)}
                                                        disabled={downloadingCardId === `session_${session.id}_${session.student_id ?? 0}`}
                                                        title="PDF Karne İndir"
                                                    >
                                                        {downloadingCardId === `session_${session.id}_${session.student_id ?? 0}`
                                                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                                                            : <i className="ti ti-file-download me-1"></i>}
                                                        Karne
                                                    </button>
                                                    <button 
                                                        className="btn btn-primary rounded-pill btn-sm px-4 shadow-sm"
                                                        onClick={() => handleSessionAnalyze(session)}
                                                    >
                                                        Analiz
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Exams Section */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent py-3">
                    <h5 className="fw-bold mb-0">Sınavlar</h5>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-muted small text-uppercase">
                                <tr>
                                    <th className="ps-4" style={{ width: '40%' }}>Sınav Adı</th>
                                    <th>Tarih</th>
                                    <th>Tür</th>
                                    <th className="text-center">Öğrenci Net</th>
                                    <th className="text-center">Puan</th>
                                    <th className="text-center">Kurum Sıra</th>
                                    <th className="text-center">Sınıf Sıra</th>
                                    <th className="text-end pe-4">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.length > 0 ? (
                                    exams.map((exam, idx) => (
                                        <tr key={idx}>
                                            <td className="ps-4 fw-bold text-dark">{exam.exam_name}</td>
                                            <td>{exam.exam_date}</td>
                                            <td><span className="badge bg-soft-primary text-primary px-2">{exam.exam_type}</span></td>
                                            <td className="text-center fw-bolder text-dark fs-15">{exam.total_net}</td>
                                            <td className="text-center fw-bolder text-dark fs-15">{exam.total_point}</td>
                                            <td className="text-center">
                                                <span className="badge bg-light text-dark border">{exam.school_rank || exam.rank || '-'}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-light text-dark border">{exam.class_rank || '-'}</span>
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end align-items-center gap-2">
                                                    <button 
                                                        className="btn btn-soft-primary btn-sm rounded-pill px-3"
                                                        onClick={() => handleDownloadReportCard('exam', exam.exam_id || (exam as any).id, exam.student_id, exam.exam_name)}
                                                        disabled={downloadingCardId === `exam_${exam.exam_id || (exam as any).id}_${exam.student_id ?? 0}`}
                                                        title="PDF Karne İndir"
                                                    >
                                                        {downloadingCardId === `exam_${exam.exam_id || (exam as any).id}_${exam.student_id ?? 0}`
                                                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                                                            : <i className="ti ti-file-download me-1"></i>}
                                                        Karne
                                                    </button>
                                                    <button 
                                                        className="btn btn-primary rounded-pill btn-sm px-4 shadow-sm"
                                                        onClick={() => handleViewDetail(exam.exam_id || (exam as any).id, exam.student_id)}
                                                        disabled={detailLoading}
                                                    >
                                                        {detailLoading ? '...' : 'Analizi Gör'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted fst-italic">
                                            Henüz açıklanmış bir sınav sonucu bulunmuyor.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAssessmentPage;
