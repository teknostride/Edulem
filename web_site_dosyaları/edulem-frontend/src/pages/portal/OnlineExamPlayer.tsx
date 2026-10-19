import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Question {
    id: number;
    content: string;
    options: {
        A: string;
        B: string;
        C: string;
        D: string;
        E?: string;
    };
    image_url?: string;
}

interface ExamInfo {
    id: number;
    title: string;
    duration_minutes: number;
    total_questions: number;
}

const OnlineExamPlayer = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<ExamInfo | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        startExam();
    }, [id]);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && exam && !loading) {
            handleAutoSubmit();
        }
    }, [timeLeft, exam, loading]);

    const startExam = async () => {
        try {
            setLoading(true);
            // 1. Sınav bilgilerini ve soruları getir (Backend startAttempt dâhilinde soruları da dönebilir veya ayrı endpoint)
            const startRes = await axiosClient.post(`/online-exams/${id}/start`);
            const { attempt, questions: examQuestions, online_exam } = startRes.data.data;

            setAttemptId(attempt.id);
            setQuestions(examQuestions);
            setExam(online_exam);
            setAnswers(attempt.answers || {}); // Kaldığı yerden devam edebilir

            // Kalan süreyi hesapla
            const startTime = new Date(attempt.started_at).getTime();
            const now = new Date().getTime();
            const elapsedSeconds = Math.floor((now - startTime) / 1000);
            const totalSeconds = online_exam.duration_minutes * 60;
            setTimeLeft(Math.max(0, totalSeconds - elapsedSeconds));

        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Sınav başlatılamadı');
            navigate('/portal/exams');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = async (questionId: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));

        try {
            // Cevabı backend'e kaydet (autosave)
            await axiosClient.post(`/online-exams/${attemptId}/save-answer`, {
                question_id: questionId,
                answer: answer
            });
        } catch (error) {
            console.error('Cevap kaydedilemedi:', error);
        }
    };

    const handleSubmit = async () => {
        const ok = await confirmDialog({
            text: 'Sınavı bitirmek istediğinizden emin misiniz?',
            confirmText: 'Bitir',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;

        try {
            setSubmitting(true);
            await axiosClient.post(`/online-exams/${attemptId}/submit`);
            showToast('success', 'Sınav başarıyla tamamlandı');
            navigate('/portal/exams');
        } catch (error) {
            showToast('error', 'Sınav gönderilemedi');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAutoSubmit = async () => {
        showToast('warning', 'Süre doldu, sınavınız otomatik olarak kaydediliyor...');
        try {
            await axiosClient.post(`/online-exams/${attemptId}/submit`);
            navigate('/portal/exams');
        } catch (error) {
            console.error('Otomatik gönderim başarısız');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <h5>Sınav Hazırlanıyor...</h5>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="min-vh-100 bg-white d-flex flex-column">
            {/* Header */}
            <header className="bg-dark text-white p-3 shadow-sm d-flex justify-content-between align-items-center sticky-top">
                <div>
                    <h5 className="mb-0">{exam?.title}</h5>
                    <small className="text-white-50">Soru {currentQuestionIndex + 1} / {questions.length}</small>
                </div>
                <div className="d-flex align-items-center gap-4">
                    <div className={`badge ${timeLeft < 300 ? 'bg-danger' : 'bg-primary'} fs-5 p-2 px-3`}>
                        <i className="ti ti-clock me-2"></i>
                        {formatTime(timeLeft)}
                    </div>
                    <button className="btn btn-success fw-bold" onClick={handleSubmit} disabled={submitting}>
                        Sınavı Bitir
                    </button>
                </div>
            </header>

            <main className="flex-grow-1 container py-4 animate__animated animate__fadeIn">
                <div className="row">
                    {/* Soru İçeriği */}
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-body p-4">
                                <div className="mb-4 d-flex justify-content-between">
                                    <span className="badge bg-light text-dark border p-2">Soru {currentQuestionIndex + 1}</span>
                                </div>

                                <div className="question-content fs-5 mb-5" dangerouslySetInnerHTML={{ __html: currentQuestion?.content }}></div>

                                <div className="options-grid">
                                    {Object.entries(currentQuestion?.options || {}).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className={`option-item p-3 border rounded mb-3 d-flex align-items-center cursor-pointer transition-all ${answers[currentQuestion?.id] === key ? 'bg-primary text-white border-primary shadow' : 'hover-bg-light'}`}
                                            onClick={() => handleAnswerSelect(currentQuestion.id, key)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="option-key fw-bold me-3 border rounded-circle d-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px', borderColor: answers[currentQuestion?.id] === key ? 'white' : 'inherit' }}>
                                                {key}
                                            </div>
                                            <div className="option-text">{value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="d-flex justify-content-between mt-5">
                                    <button
                                        className="btn btn-outline-secondary px-4"
                                        disabled={currentQuestionIndex === 0}
                                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                    >
                                        <i className="ti ti-chevron-left me-1"></i> Önceki
                                    </button>
                                    <button
                                        className="btn btn-primary px-4"
                                        disabled={currentQuestionIndex === questions.length - 1}
                                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                    >
                                        Sonraki <i className="ti ti-chevron-right ms-1"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Soru Gezgini */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm sticky-top" style={{ top: '100px' }}>
                            <div className="card-header bg-transparent py-3">
                                <h6 className="mb-0">Soru Gezgini</h6>
                            </div>
                            <div className="card-body">
                                <div className="d-flex flex-wrap gap-2">
                                    {questions.map((q, idx) => (
                                        <button
                                            key={q.id}
                                            className={`btn btn-sm p-0 d-flex align-items-center justify-content-center rounded-circle ${currentQuestionIndex === idx
                                                    ? 'btn-primary'
                                                    : answers[q.id]
                                                        ? 'btn-soft-success'
                                                        : 'btn-soft-secondary'
                                                }`}
                                            style={{ width: '35px', height: '35px' }}
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                                <hr />
                                <div className="small text-muted">
                                    <div className="d-flex align-items-center mb-1">
                                        <span className="badge bg-primary rounded-circle p-1 me-2" style={{ width: '12px', height: '12px' }}></span> Geçerli Soru
                                    </div>
                                    <div className="d-flex align-items-center mb-1">
                                        <span className="badge bg-success rounded-circle p-1 me-2" style={{ width: '12px', height: '12px' }}></span> Cevaplandı
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <span className="badge bg-secondary rounded-circle p-1 me-2" style={{ width: '12px', height: '12px' }}></span> Boş
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .hover-bg-light:hover { background-color: #f8f9fa; }
                .transition-all { transition: all 0.2s ease; }
                .option-item:hover { border-color: var(--bs-primary); }
            `}</style>
        </div>
    );
};

export default OnlineExamPlayer;
