import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Survey {
    id: number;
    title: string;
    survey_type?: string; // For Form Surveys
    is_active: boolean;
    start_date: string;
    end_date: string;
    has_ended?: boolean;
    has_user_responded?: boolean;
    question_count?: number;
    total_responses?: number;
    type: 'online' | 'form';
    description?: string;
    questions?: any[];
}

const SurveyList = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
    const [answers, setAnswers] = useState<{ [key: number]: any }>({});
    const [submitting, setSubmitting] = useState(false);

    const [educationLevels, setEducationLevels] = useState<Array<{ id: number; name: string }>>([]);
    const [selectedEducationLevelId, setSelectedEducationLevelId] = useState<number | ''>('');

    const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');

    // Daha güvenli rol çekme (Home.tsx'deki mantıkla aynı)
    let roleKey = '';
    if (userData.role) {
        if (typeof userData.role === 'string') roleKey = userData.role;
        else if (typeof userData.role === 'object' && userData.role.name) roleKey = userData.role.name;
    } else if (userData.role_name) {
        roleKey = userData.role_name;
    } else if (userData.role_id) {
        roleKey = String(userData.role_id);
    } else {
        roleKey = localStorage.getItem('USER_ROLE') || '';
    }
    roleKey = roleKey.trim();

    const isOwner = roleKey === 'owner' || roleKey === 'Admin' || roleKey === 'Genel Müdür' || roleKey === '1';
    const isManager = roleKey === 'Müdür' || roleKey === 'Müdür Yardımcısı' || roleKey === 'Kampüs Müdürü' || roleKey === 'Öğrenci İşleri' || roleKey === 'student_affairs' || isOwner || roleKey === '2' || roleKey === '3' || roleKey === '4' || roleKey === '7';
    const canManage = isOwner || isManager;

    const userEducationLevelIds: number[] = Array.isArray(userData.education_level_ids) ? userData.education_level_ids : [];
    const isTeacherRole = roleKey === 'Öğretmen' || roleKey === 'Sınıf Öğretmeni' || roleKey === 'Rehberlik' || roleKey === 'Rehber Öğretmen' || roleKey === 'teacher';
    const mustSelectEducationLevel = isTeacherRole && userEducationLevelIds.length > 1;

    useEffect(() => {
        fetchSurveys();
    }, []);

    useEffect(() => {
        const fetchEducationLevels = async () => {
            if (educationLevels.length > 0) return;
            if (userEducationLevelIds.length === 0) return;
            try {
                const res = await axiosClient.get('/education-levels');
                const raw = res.data?.data?.education_levels || res.data?.education_levels || res.data?.data || res.data;
                const items = Array.isArray(raw) ? raw : [];
                setEducationLevels(items.map((x: any) => ({ id: Number(x.id), name: String(x.name || `Kademe #${x.id}`) })));
            } catch (e) {
                // Kademe listesi yüklenemezse sadece ID göstereceğiz.
                setEducationLevels([]);
            }
        };

        fetchEducationLevels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userEducationLevelIds.length]);

    useEffect(() => {
        if (!activeSurvey) {
            setSelectedEducationLevelId('');
            return;
        }

        if (isTeacherRole) {
            if (userEducationLevelIds.length === 1) {
                setSelectedEducationLevelId(userEducationLevelIds[0]);
            } else {
                setSelectedEducationLevelId('');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSurvey?.id]);

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            const endpoint = canManage ? '/surveys/online' : '/surveys/online?include_past=1';
            const res = await axiosClient.get(endpoint);
            const data = res.data.data.surveys || res.data.data;

            setSurveys((data || []).map((s: any) => ({ ...s, type: 'online' })));
        } catch (error) {
            showToast('error', 'Anketler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (survey: Survey) => {
        if (!canManage) return;
        const ok = await confirmDialog({
            text: 'Bu anketi silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            const endpoint = survey.type === 'online' ? `/surveys/online/${survey.id}` : `/surveys/forms/${survey.id}`;
            await axiosClient.delete(endpoint);
            showToast('success', 'Anket başarıyla silindi');
            fetchSurveys();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    const toggleStatus = async (survey: Survey) => {
        if (!canManage) return;
        try {
            const endpoint = survey.type === 'online' ? `/surveys/online/${survey.id}` : `/surveys/forms/${survey.id}`;
            await axiosClient.put(endpoint, {
                ...survey,
                is_active: !survey.is_active
            });
            showToast('success', 'Durum güncellendi');
            fetchSurveys();
        } catch (error) {
            showToast('error', 'Güncelleme başarısız');
        }
    };

    const handleAnswer = (questionId: number, value: any) => {
        setAnswers({ ...answers, [questionId]: value });
    };

    const submitResponse = async () => {
        if (!activeSurvey) return;

        if (mustSelectEducationLevel && !selectedEducationLevelId) {
            showToast('warning', 'Lütfen anketi hangi kademeden doldurmak istediğinizi seçin.');
            return;
        }

        const unanswered = (activeSurvey.questions || []).filter((q: any) => q.is_required && !answers[q.id]);
        if (unanswered.length > 0) {
            showToast('warning', 'Lütfen tüm zorunlu soruları cevaplayın.');
            return;
        }

        setSubmitting(true);
        try {
            await axiosClient.post(`/surveys/online/${activeSurvey.id}/responses`, {
                online_survey_id: activeSurvey.id,
                respondent_education_level_id: selectedEducationLevelId || null,
                answers: Object.entries(answers).map(([qId, val]) => ({ question_id: parseInt(qId), answer: val }))
            });
            showToast('success', 'Anket cevabınız başarıyla gönderildi. Teşekkür ederiz!');
            setActiveSurvey(null);
            setAnswers({});
            fetchSurveys();
        } catch (error: any) {
            showToast('error', error?.response?.data?.message || 'Cevap gönderilemedi');
        } finally {
            setSubmitting(false);
        }
    };

    if (!canManage && loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary"></div>
            </div>
        );
    }

    if (!canManage && activeSurvey) {
        const educationLevelOptions = userEducationLevelIds.map((id: number) => {
            const found = educationLevels.find((x) => x.id === id);
            return { id, name: found?.name || `Kademe #${id}` };
        });

        return (
            <div className="container py-4">
                <div className="card border-0 shadow-lg mx-auto" style={{ maxWidth: '800px' }}>
                    <div className="card-header bg-primary text-white p-4 text-center">
                        <h4 className="mb-0">{activeSurvey.title}</h4>
                        {activeSurvey.description && <p className="mb-0 mt-2 opacity-75">{activeSurvey.description}</p>}
                    </div>
                    <div className="card-body p-4">
                        <div className="d-flex flex-column gap-4">
                            {!canManage && isTeacherRole && userEducationLevelIds.length > 0 && (
                                <div className="p-3 border rounded shadow-sm bg-light">
                                    <label className="fw-bold mb-2 d-block">
                                        Kademe Seçimi {mustSelectEducationLevel && <span className="text-danger">*</span>}
                                    </label>
                                    <select
                                        className="form-select"
                                        value={selectedEducationLevelId}
                                        onChange={(e) => setSelectedEducationLevelId(e.target.value ? Number(e.target.value) : '')}
                                    >
                                        {mustSelectEducationLevel && <option value="">Seçiniz...</option>}
                                        {!mustSelectEducationLevel && userEducationLevelIds.length === 1 && (
                                            <option value={userEducationLevelIds[0]}>{educationLevelOptions[0]?.name}</option>
                                        )}
                                        {mustSelectEducationLevel && educationLevelOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}
                                    </select>
                                    <small className="text-muted d-block mt-2">
                                        Aynı anda birden fazla kademede dersiniz varsa, anketi hangi kademeden doldurduğunuzu seçiniz.
                                    </small>
                                </div>
                            )}
                            {(activeSurvey.questions || []).map((q: any, index: number) => (
                                <div key={q.id} className="p-3 border rounded shadow-sm">
                                    <label className="fw-bold mb-3 d-block">
                                        {index + 1}. {q.question} {q.is_required && <span className="text-danger">*</span>}
                                    </label>

                                    {q.question_type === 'multiple_choice' && (
                                        <div className="d-flex flex-column gap-2">
                                            {q.options?.map((opt: string, i: number) => (
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
                                            {q.options?.map((opt: string, i: number) => (
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
                                                    <label className="btn btn-outline-primary rounded-circle wh-40 d-flex align-items-center justify-content-center" htmlFor={`q-${q.id}-${num}`}>
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

    if (!canManage) {
        const now = new Date();
        const activeSurveys = surveys.filter((s) => {
            if (!s.end_date) return true;
            return new Date(s.end_date) >= now;
        });
        const pastSurveys = surveys.filter((s) => {
            if (!s.end_date) return false;
            return new Date(s.end_date) < now;
        });

        return (
            <div className="container-fluid">
                <div className="mb-4">
                    <h4 className="page-title">Anketler</h4>
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
                        <>
                            <div className="col-12">
                                <h5 className="mb-3">Aktif Anketler</h5>
                            </div>

                            {activeSurveys.map(survey => (
                                <div className="col-md-6 col-lg-4" key={`active-${survey.id}`}>
                                    <div className="card border-0 shadow-sm h-100 hover-shadow transition-all">
                                        <div className="card-body">
                                            <div className="d-flex align-items-center mb-2">
                                                <div className="bg-soft-primary p-2 rounded me-3 text-primary">
                                                    <i className="ti ti-clipboard-list fs-3"></i>
                                                </div>
                                                <div className="flex-grow-1 min-w-0">
                                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                                        <h6 className="mb-0 text-truncate">{survey.title}</h6>
                                                        {survey.has_user_responded && (
                                                            <span className="badge bg-success">Cevaplandı</span>
                                                        )}
                                                    </div>
                                                    <div className="text-muted small mt-1">
                                                        Son tarih: {survey.end_date ? new Date(survey.end_date).toLocaleDateString('tr-TR') : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-muted small mb-4 line-clamp-2">
                                                {survey.description || 'Bu anket için açıklama girilmemiş.'}
                                            </p>

                                            <button
                                                className="btn btn-primary w-100"
                                                disabled={!!survey.has_user_responded}
                                                onClick={() => {
                                                    setActiveSurvey(survey);
                                                    setAnswers({});
                                                }}
                                            >
                                                {survey.has_user_responded ? 'Tamamlandı' : 'Ankete Katıl'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="col-12 mt-4">
                                <h5 className="mb-3">Geçmiş Anketler</h5>
                            </div>

                            {pastSurveys.length === 0 ? (
                                <div className="col-12 text-muted">Geçmiş anket bulunmuyor.</div>
                            ) : (
                                pastSurveys.map(survey => (
                                    <div className="col-md-6 col-lg-4" key={`past-${survey.id}`}>
                                        <div className="card border-0 shadow-sm h-100">
                                            <div className="card-body">
                                                <div className="d-flex align-items-center mb-2">
                                                    <div className="bg-soft-primary p-2 rounded me-3 text-primary">
                                                        <i className="ti ti-clipboard-list fs-3"></i>
                                                    </div>
                                                    <div className="flex-grow-1 min-w-0">
                                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                                            <h6 className="mb-0 text-truncate">{survey.title}</h6>
                                                            {survey.has_user_responded && (
                                                                <span className="badge bg-success">Cevaplandı</span>
                                                            )}
                                                        </div>
                                                        <div className="text-muted small mt-1">
                                                            Son tarih: {survey.end_date ? new Date(survey.end_date).toLocaleDateString('tr-TR') : '-'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-muted small mb-0 line-clamp-2">
                                                    {survey.description || 'Bu anket için açıklama girilmemiş.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>
                <style>{`
                    .wh-40 { width: 40px; height: 40px; }
                    .bg-soft-primary { background-color: rgba(59, 108, 255, 0.1); }
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
    }

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0">Anket Yönetimi</h3>
                    <p className="text-muted mb-0">Online anketleri yönetin.</p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <div className="btn-group me-2">
                        <Link to="/surveys/online/create" className="btn btn-primary">
                            <i className="ti ti-plus me-1"></i> Yeni Online Anket
                        </Link>
                    </div>
                    <div className="text-end d-none d-md-block ms-3">
                        <ol className="breadcrumb m-0 py-0">
                            <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
                            <li className="breadcrumb-item"><a href="/surveys" className="text-decoration-none text-muted">Uygulamalar</a></li>
                            <li className="breadcrumb-item active fw-medium">Anketler</li>
                        </ol>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm overflow-hidden">
                <div className="card-header bg-transparent border-bottom-0 p-0">
                    <div className="px-3 py-2">
                        <span className="text-muted small">Online Anketler</span>
                    </div>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-3">Anket Başlığı</th>
                                    <th>Zaman Aralığı</th>
                                    <th>Soru / Cevap</th>
                                    <th>Durum</th>
                                    <th className="text-end pe-3">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : surveys.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-muted">
                                            Henüz online anket bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    surveys.map(survey => (
                                        <tr key={`${survey.type}-${survey.id}`}>
                                            <td className="ps-3">
                                                <div className="fw-bold text-dark">{survey.title}</div>
                                                <small className="text-muted">
                                                    Online Kayıt
                                                </small>
                                            </td>
                                            <td>
                                                <div className="small">
                                                    <span className="text-success">{new Date(survey.start_date).toLocaleDateString('tr-TR')}</span>
                                                    <span className="mx-1">-</span>
                                                    <span className="text-danger">{new Date(survey.end_date).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <span className="badge bg-soft-primary text-primary me-2">
                                                        {survey.question_count || 0} Soru
                                                    </span>
                                                    <span className="badge bg-soft-info text-info">
                                                        {survey.total_responses || 0} Cevap
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={survey.is_active}
                                                        onChange={() => toggleStatus(survey)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="text-end pe-3">
                                                <div className="btn-group">
                                                    <Link to={`/surveys/${survey.type}/${survey.id}/analysis`} className="btn btn-sm btn-outline-info" title="Analiz">
                                                        <i className="ti ti-chart-bar"></i>
                                                    </Link>
                                                    <Link to={`/surveys/${survey.type}/${survey.id}/edit`} className="btn btn-sm btn-outline-primary" title="Düzenle">
                                                        <i className="ti ti-edit"></i>
                                                    </Link>
                                                    <button onClick={() => handleDelete(survey)} className="btn btn-sm btn-outline-danger" title="Sil">
                                                        <i className="ti ti-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style>{`
                .bg-soft-primary { background-color: rgba(59, 108, 255, 0.1); }
                .bg-soft-info { background-color: rgba(13, 202, 240, 0.1); }
            `}</style>
        </div>
    );
};

export default SurveyList;
