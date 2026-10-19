import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Survey {
    id: number;
    title: string;
    description?: string;
    questions: any[];
    has_student_responded?: boolean;
    has_user_responded?: boolean;
}

const normalizeOptions = (q: any): string[] => {
    const raw = q?.options ?? q?.choices ?? q?.option_list ?? q?.question_options;
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((x) => String(x)).filter((s) => s.trim() !== '');
    }
    if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s) return [];
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) {
                return parsed.map((x) => String(x)).filter((t) => t.trim() !== '');
            }
        } catch {
            // ignore
        }
        return s.split(',').map((x) => x.trim()).filter(Boolean);
    }
    return [];
};

const StudentSurveyPortal = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
    const [answers, setAnswers] = useState<{ [key: number]: any }>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchActiveSurveys();
    }, []);

    const fetchActiveSurveys = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/surveys/online?active_only=1');
            setSurveys(res.data.data.surveys || res.data.data);
        } catch (error) {
            showToast('error', 'Aktif anketler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId: number, value: any) => {
        setAnswers({ ...answers, [questionId]: value });
    };

    const submitResponse = async () => {
        if (!activeSurvey) return;

        // Basic validation
        const unanswered = activeSurvey.questions.filter(q => q.is_required && !answers[q.id]);
        if (unanswered.length > 0) {
            showToast('warning', 'Lütfen tüm zorunlu soruları cevaplayın.');
            return;
        }

        setSubmitting(true);
        try {
            // Prepare answers with proper format for each question type
            const formattedAnswers = activeSurvey.questions.map((q) => {
                const val = answers[q.id];
                const isChoiceType = q.question_type === 'multiple_choice' || q.question_type === 'single_choice';
                return {
                    question_id: q.id,
                    answer: isChoiceType ? null : val,
                    selected_options: isChoiceType && val ? [val] : null
                };
            });

            await axiosClient.post(`/surveys/online/${activeSurvey.id}/responses`, {
                online_survey_id: activeSurvey.id,
                respondent_type: 'student',
                respondent_education_level_id: null,
                is_anonymous: false,
                answers: formattedAnswers
            });
            showToast('success', 'Anket cevabınız başarıyla gönderildi. Teşekkür ederiz!');
            setActiveSurvey(null);
            setAnswers({});
            fetchActiveSurveys();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Cevap gönderilemedi';
            showToast('error', msg);
            console.error('Survey submit error:', error.response?.data);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    if (activeSurvey) {
        return (
            <div className="container py-4">
                <div className="card border-0 shadow-lg mx-auto" style={{ maxWidth: '800px' }}>
                    <div className="card-header bg-primary text-white p-4 text-center">
                        <h4 className="mb-0">{activeSurvey.title}</h4>
                        {activeSurvey.description && <p className="mb-0 mt-2 opacity-75">{activeSurvey.description}</p>}
                    </div>
                    <div className="card-body p-4">
                        <div className="d-flex flex-column gap-4">
                            {activeSurvey.questions.map((q, index) => (
                                <div key={q.id} className="p-3 border rounded shadow-sm">
                                    <label className="fw-bold mb-3 d-block">
                                        {index + 1}. {q.question} {q.is_required && <span className="text-danger">*</span>}
                                    </label>

                                    {q.question_type === 'multiple_choice' && (
                                        <div className="d-flex flex-column gap-2">
                                            {normalizeOptions(q).map((opt: string, i: number) => (
                                                <div key={i} className="form-check custom-radio">
                                                    <input
                                                        className="form-check-input"
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        id={`q-${q.id}-${i}`}
                                                        checked={answers[q.id] === opt}
                                                        onChange={() => handleAnswer(q.id, opt)}
                                                    />
                                                    <label className="form-check-label w-100 p-2 border rounded" htmlFor={`q-${q.id}-${i}`}>
                                                        {opt}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {q.question_type === 'single_choice' && (
                                        <div className="d-flex flex-column gap-2">
                                            {normalizeOptions(q).map((opt: string, i: number) => (
                                                <div key={i} className="form-check custom-radio">
                                                    <input
                                                        className="form-check-input"
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        id={`q-${q.id}-${i}`}
                                                        checked={answers[q.id] === opt}
                                                        onChange={() => handleAnswer(q.id, opt)}
                                                    />
                                                    <label className="form-check-label w-100 p-2 border rounded" htmlFor={`q-${q.id}-${i}`}>
                                                        {opt}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {q.question_type === 'rating' && (
                                        <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded">
                                            {[1, 2, 3, 4, 5].map(num => (
                                                <div key={num} className="text-center">
                                                    <input
                                                        type="radio"
                                                        className="btn-check"
                                                        name={`q-${q.id}`}
                                                        id={`q-${q.id}-${num}`}
                                                        checked={answers[q.id] === num}
                                                        onChange={() => handleAnswer(q.id, num)}
                                                    />
                                                    <label className={`btn btn-outline-primary rounded-circle wh-40 d-flex align-items-center justify-content-center`} htmlFor={`q-${q.id}-${num}`}>
                                                        {num}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {q.question_type === 'boolean' && (
                                        <div className="btn-group w-100">
                                            <input type="radio" className="btn-check" name={`q-${q.id}`} id={`q-${q.id}-yes`} checked={answers[q.id] === 'Evet'} onChange={() => handleAnswer(q.id, 'Evet')} />
                                            <label className="btn btn-outline-success" htmlFor={`q-${q.id}-yes`}>Evet</label>

                                            <input type="radio" className="btn-check" name={`q-${q.id}`} id={`q-${q.id}-no`} checked={answers[q.id] === 'Hayır'} onChange={() => handleAnswer(q.id, 'Hayır')} />
                                            <label className="btn btn-outline-danger" htmlFor={`q-${q.id}-no`}>Hayır</label>
                                        </div>
                                    )}

                                    {q.question_type === 'text' && (
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            placeholder="Cevabınızı buraya yazınız..."
                                            value={answers[q.id] || ''}
                                            onChange={e => handleAnswer(q.id, e.target.value)}
                                        ></textarea>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card-footer bg-light p-3 d-flex justify-content-between">
                        <button type="button" className="btn btn-link text-muted" onClick={() => setActiveSurvey(null)}>Geri Dön</button>
                        <button type="button" className="btn btn-primary px-5" onClick={submitResponse} disabled={submitting}>
                            {submitting && <span className="spinner-border spinner-border-sm me-1"></span>}
                            Anketi Tamamla
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">Aktif Anketler</h4>
                <p className="text-muted">Geri bildiriminiz bizim için değerlidir.</p>
            </div>

            <div className="row g-4">
                {surveys.length === 0 ? (
                    <div className="col-12 text-center py-5">
                        <div className="mb-3">
                            <i className="ti ti-confetti fs-1 text-primary"></i>
                        </div>
                        <h5>Harika! Şu an cevaplamanız gereken bir anket bulunmuyor.</h5>
                    </div>
                ) : (
                    surveys.map(survey => {
                        const isCompleted = survey.has_student_responded || survey.has_user_responded;
                        return (
                            <div className="col-md-6 col-lg-4" key={survey.id}>
                                <div className={`card border-0 shadow-sm h-100 transition-all ${isCompleted ? '' : 'hover-shadow'}`}>
                                    <div className="card-body">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className={`p-2 rounded me-3 ${isCompleted ? 'bg-soft-success text-success' : 'bg-soft-primary text-primary'}`}>
                                                <i className={`ti fs-3 ${isCompleted ? 'ti-check-circle' : 'ti-clipboard-list'}`}></i>
                                            </div>
                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                <h6 className="mb-0 text-truncate">{survey.title}</h6>
                                                {isCompleted && (
                                                    <span className="badge bg-success-subtle text-success fs-xs">Tamamlandı</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-muted small mb-4 line-clamp-2">
                                            {survey.description || 'Bu anket için açıklama girilmemiş.'}
                                        </p>
                                        {isCompleted ? (
                                            <button className="btn btn-outline-success w-100" disabled>
                                                <i className="ti ti-check me-1"></i>
                                                Bu Ankete Katıldınız
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-primary w-100"
                                                onClick={() => {
                                                    setActiveSurvey(survey);
                                                    setAnswers({});
                                                }}
                                            >
                                                Ankete Katıl
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <style>{`
                .wh-40 { width: 40px; height: 40px; }
                .bg-soft-primary { background-color: rgba(59, 108, 255, 0.1); }
                .bg-soft-success { background-color: rgba(25, 135, 84, 0.1); }
                .hover-shadow:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1) !important; }
                .transition-all { transition: all 0.3s ease; }
                .custom-radio .form-check-input:checked + .form-check-label {
                    background-color: var(--bs-primary) !important;
                    color: white !important;
                    border-color: var(--bs-primary) !important;
                }
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
};

export default StudentSurveyPortal;
