import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { Layers, BarChart2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SharedExam {
    id: number;
    name: string;
    exam_type: string;
    exam_date: string;
    merged_exam_ids: number[] | null;
    created_at: string;
}

export default function TeacherMeasurement() {
    const [exams, setExams] = useState<SharedExam[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchExams = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/omr/teacher-exams');
            if (res.data?.data?.exams) {
                setExams(res.data.data.exams);
            }
        } catch (err: unknown) {
            console.error('Paylaşılan sınavlar getirilirken hata:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleAnalyze = (examId: number) => {
        navigate(`/teacher/measurement/analytics/${examId}`);
    };

    return (
        <div className="container-fluid px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0 fw-bold">Ölçme Değerlendirme Sistem Sonuçları</h4>
                    <span className="text-muted d-block mt-1">
                        Sadece rehberlik ve yönetim tarafından yayınlanan sonuçları içerir.
                    </span>
                </div>
            </div>

            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-0">
                    <div className="p-4 border-bottom bg-light bg-opacity-10 d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-0 fw-bold text-dark">
                                <Layers size={20} className="me-2 text-primary" />
                                Toplu Karneler ve Sonuçlar
                            </h5>
                            <p className="small text-muted mb-0 mt-1">Yayınlanmış sınav verileri üzerinden toplu analizleri görüntüleyin.</p>
                        </div>
                    </div>

                    <div className="p-4">
                        {loading ? (
                            <div className="text-center py-5">
                                <Loader2 className="spinner-border text-primary animate-spin" size={32} />
                                <div className="mt-3 text-muted fw-medium">Sonuçlar yükleniyor...</div>
                            </div>
                        ) : exams.length === 0 ? (
                            <div className="text-center py-5">
                                <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                                    <Layers size={48} className="text-muted opacity-50" />
                                </div>
                                <p className="text-muted fs-5">Henüz yayınlanmış sınav bulunmuyor.</p>
                                <p className="small text-secondary">Paylaşılan sonuçlar burada otomatik olarak görünecektir.</p>
                            </div>
                        ) : (
                            <div className="row g-4">
                                {exams.map(exam => (
                                    <div key={exam.id} className="col-12">
                                        <div className="card border border-light shadow-none bg-soft-light-hover transition-all h-100">
                                            <div className="card-body p-3">
                                                <div className="row align-items-center">
                                                    <div className="col-auto">
                                                        <div className="bg-white shadow-sm rounded-3 p-3 border border-light">
                                                            <BarChart2 size={24} className="text-primary" />
                                                        </div>
                                                    </div>
                                                    <div className="col">
                                                        <h6 className="fw-bold mb-1 text-dark fs-16">{exam.name}</h6>
                                                        <div className="d-flex align-items-center gap-3 text-muted small">
                                                            <span className="badge bg-soft-primary text-primary border-0 rounded-pill px-3">
                                                                {exam.exam_type}
                                                            </span>
                                                            <span className="d-flex align-items-center">
                                                                <i className="ti ti-calendar me-1"></i>
                                                                {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('tr-TR') : '-'}
                                                            </span>
                                                            <span className="text-secondary opacity-50">|</span>
                                                            <span className="d-flex align-items-center">
                                                                <i className="ti ti-clock me-1"></i>
                                                                Yayın: {new Date(exam.created_at).toLocaleDateString('tr-TR')}
                                                            </span>
                                                            {exam.merged_exam_ids && (
                                                                <span className="badge bg-soft-success text-success border-0 rounded-pill px-3">
                                                                    BİRLEŞTİRİLMİŞ
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="col-auto">
                                                        <button
                                                            className="btn btn-primary px-4 py-2 fw-medium shadow-sm d-flex align-items-center gap-2"
                                                            onClick={() => handleAnalyze(exam.id)}
                                                        >
                                                            Analiz
                                                            <i className="ti ti-chevron-right"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
