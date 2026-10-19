import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

interface OnlineExam {
    id: number;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    lesson: {
        name: string;
    };
    attempt?: {
        status: string;
        score: number;
        submitted_at: string;
    };
    can_take: boolean;
}

const OnlineExamList = () => {
    const [exams, setExams] = useState<OnlineExam[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/portal/student/online-exams');
            setExams(res.data.data);
        } catch (error) {
            console.error('Sınavlar yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Online Sınavlarım</h4>
                    <p className="text-muted mb-0">Aktif ve geçmiş online sınavlarını buradan takip edebilirsin.</p>
                </div>
            </div>

            <div className="row g-4">
                {exams.map((exam) => (
                    <div className="col-md-6 col-lg-4" key={exam.id}>
                        <div className="card h-100 border-0 shadow-sm hover-shadow-md transition-all">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <span className="badge bg-soft-primary text-primary px-3 py-2 rounded-pill">
                                        {exam.lesson.name}
                                    </span>
                                    {exam.attempt?.status === 'completed' ? (
                                        <span className="badge bg-success">Tamamlandı</span>
                                    ) : exam.can_take ? (
                                        <span className="badge bg-info">Aktif</span>
                                    ) : (
                                        <span className="badge bg-secondary">Kapalı</span>
                                    )}
                                </div>
                                <h5 className="fw-bold mb-2">{exam.title}</h5>
                                <p className="text-muted small mb-4 line-clamp-2">{exam.description || 'Bu sınav için açıklama bulunmuyor.'}</p>

                                <div className="bg-light rounded p-3 mb-4">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="text-muted small"><i className="ti ti-clock me-1"></i> Süre:</span>
                                        <span className="fw-semibold small">{exam.duration_minutes} Dakika</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-muted small"><i className="ti ti-calendar me-1"></i> Bitiş:</span>
                                        <span className="fw-semibold small">{new Date(exam.end_time).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                </div>

                                {exam.attempt?.status === 'completed' ? (
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="text-success fw-bold fs-4">
                                            {exam.attempt.score} <small className="fs-12 text-muted">/ 100</small>
                                        </div>
                                        <button className="btn btn-outline-primary btn-sm rounded-pill px-4" disabled>Sonuçlar</button>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-primary w-100 rounded-pill py-2 fw-bold"
                                        disabled={!exam.can_take}
                                        onClick={() => navigate(`/portal/exams/${exam.id}`)}
                                    >
                                        {exam.attempt?.status === 'in_progress' ? 'Sınava Devam Et' : 'Sınava Başla'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {exams.length === 0 && (
                    <div className="col-12">
                        <div className="card border-0 shadow-sm py-5 text-center">
                            <i className="ti ti-mood-empty display-4 text-muted mb-3"></i>
                            <h5>Henüz tanımlanmış bir sınavın yok. ✨</h5>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .hover-shadow-md:hover { transform: translateY(-5px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.1) !important; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .bg-soft-primary { background-color: rgba(13, 110, 253, 0.1); }
            `}</style>
        </div>
    );
};

export default OnlineExamList;
