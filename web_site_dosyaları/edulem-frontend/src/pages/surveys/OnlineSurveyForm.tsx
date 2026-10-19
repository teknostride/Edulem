import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

type QuestionType = 'multiple_choice' | 'single_choice' | 'text' | 'rating' | 'scale' | 'boolean';

interface Question {
    id?: number;
    question: string;
    question_type: QuestionType;
    options?: string[];
    is_required: boolean;
    order: number;
}

const OnlineSurveyForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const todayDate = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: todayDate,
        end_date: tomorrowDate,
        target_audience: 'all',
        is_required: false,
        is_anonymous: false,
        is_active: true
    });

    const [questions, setQuestions] = useState<Question[]>([]);
    // Local editing state: maps question id -> draft values
    const [editingQuestions, setEditingQuestions] = useState<Record<number, Question>>({});
    const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null);

    useEffect(() => {
        if (isEdit) {
            fetchSurvey();
        }
    }, [id]);

    const fetchSurvey = async () => {
        try {
            const res = await axiosClient.get(`/surveys/online/${id}`);
            const data = res.data.data;
            setFormData({
                title: data.title || '',
                description: data.description || '',
                start_date: data.start_date ? data.start_date.split(' ')[0] : todayDate,
                end_date: data.end_date ? data.end_date.split(' ')[0] : tomorrowDate,
                target_audience: (Array.isArray(data.target_audience) && data.target_audience.length > 0) ? data.target_audience[0].type : 'all',
                is_required: !!data.is_required,
                is_anonymous: !!data.is_anonymous,
                is_active: data.is_active !== undefined ? !!data.is_active : true
            });
            const qs: Question[] = data.questions || [];
            setQuestions(qs);
            // Init local editing state
            const draft: Record<number, Question> = {};
            qs.forEach((q) => { if (q.id) draft[q.id] = { ...q }; });
            setEditingQuestions(draft);
        } catch (error) {
            showToast('error', 'Anket bilgileri yüklenemedi');
            navigate('/surveys');
        } finally {
            setFetching(false);
        }
    };

    const handleSurveySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let surveyId = id;
            const apiData = {
                ...formData,
                target_audience: [{ type: formData.target_audience, ids: null }]
            };

            if (isEdit) {
                await axiosClient.put(`/surveys/online/${id}`, apiData);
                showToast('success', 'Anket ayarları güncellendi');
            } else {
                const res = await axiosClient.post('/surveys/online', apiData);
                surveyId = res.data.data.id;
                showToast('success', 'Anket taslağı oluşturuldu');
            }

            if (!isEdit) navigate(`/surveys/online/${surveyId}/edit`);
            else navigate('/surveys');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = async () => {
        if (!isEdit) {
            showToast('warning', 'Soru eklemeden önce anket taslağını kaydetmelisiniz.');
            return;
        }

        const newQuestion: Question = {
            question: 'Yeni Soru',
            question_type: 'multiple_choice',
            options: ['Seçenek 1', 'Seçenek 2'],
            is_required: true,
            order: questions.length + 1
        };

        try {
            const res = await axiosClient.post('/surveys/online/questions', {
                ...newQuestion,
                online_survey_id: id
            });
            const saved: Question = res.data.data;
            setQuestions(prev => [...prev, saved]);
            setEditingQuestions(prev => ({ ...prev, [saved.id!]: { ...saved } }));
            showToast('success', 'Soru eklendi');
        } catch (error) {
            showToast('error', 'Soru eklenemedi');
        }
    };

    const updateLocalQuestion = (qId: number, data: Partial<Question>) => {
        setEditingQuestions(prev => ({
            ...prev,
            [qId]: { ...prev[qId], ...data }
        }));
    };

    const saveQuestion = async (qId: number) => {
        const draft = editingQuestions[qId];
        if (!draft) return;

        try {
            setSavingQuestionId(qId);
            const payload: any = {
                online_survey_id: Number(id),
                question: draft.question,
                question_type: draft.question_type,
                is_required: draft.is_required,
                order: draft.order,
            };

            // Only send options for choice-type questions
            if (draft.question_type === 'multiple_choice' || draft.question_type === 'single_choice') {
                payload.options = (draft.options || []).filter(o => o.trim() !== '');
            } else {
                payload.options = null;
            }

            await axiosClient.put(`/surveys/online/questions/${qId}`, payload);
            setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...payload } : q));
            showToast('success', 'Soru güncellendi');
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.errors
                ? JSON.stringify(error.response?.data?.errors)
                : 'Güncelleme başarısız';
            showToast('error', typeof msg === 'string' ? msg : 'Güncelleme başarısız');
        } finally {
            setSavingQuestionId(null);
        }
    };

    const deleteQuestion = async (qId: number) => {
        const ok = await confirmDialog({
            text: 'Bu soruyu silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/surveys/online/questions/${qId}`);
            setQuestions(prev => prev.filter(q => q.id !== qId));
            setEditingQuestions(prev => {
                const next = { ...prev };
                delete next[qId];
                return next;
            });
            showToast('success', 'Soru silindi');
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    if (fetching) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">{isEdit ? 'Anketi Düzenle' : 'Yeni Online Anket'}</h4>
                <p className="text-muted">Anket detaylarını ve sorularını yönetin.</p>
            </div>

            <div className="row">
                <div className="col-lg-5">
                    <form onSubmit={handleSurveySubmit} className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent">
                            <h5 className="mb-0">1. Anket Bilgileri</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="form-label">Anket Başlığı</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Açıklama / Yönerge</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Başlangıç Tarihi</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Bitiş Tarihi</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Hedef Kitle</label>
                                    <select
                                        className="form-select"
                                        value={formData.target_audience}
                                        onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                                    >
                                        <option value="all">Herkes</option>
                                        <option value="students">Sadece Öğrenciler</option>
                                        <option value="parents">Sadece Veliler</option>
                                        <option value="teachers">Sadece Öğretmenler</option>
                                    </select>
                                </div>
                                <div className="col-md-12">
                                    <div className="form-check form-switch mb-2">
                                        <input className="form-check-input" type="checkbox" id="isRequired" checked={formData.is_required} onChange={e => setFormData({ ...formData, is_required: e.target.checked })} />
                                        <label className="form-check-label" htmlFor="isRequired">Zorunlu Anket</label>
                                    </div>
                                    <div className="form-check form-switch mb-2">
                                        <input className="form-check-input" type="checkbox" id="isAnonymous" checked={formData.is_anonymous} onChange={e => setFormData({ ...formData, is_anonymous: e.target.checked })} />
                                        <label className="form-check-label" htmlFor="isAnonymous">Anonim Cevaplama</label>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                                        <label className="form-check-label" htmlFor="isActive">Anket Aktif</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-top p-3 d-flex justify-content-between">
                            <button type="button" className="btn btn-light" onClick={() => navigate('/surveys')}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading && <span className="spinner-border spinner-border-sm me-1"></span>}
                                {isEdit ? 'Güncelle' : 'Taslağı Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">2. Sorular</h5>
                            <button type="button" className="btn btn-sm btn-soft-primary" onClick={addQuestion} disabled={!isEdit}>
                                <i className="ti ti-plus me-1"></i> Soru Ekle
                            </button>
                        </div>
                        <div className="card-body">
                            {!isEdit ? (
                                <div className="text-center py-5 bg-light rounded border border-dashed text-muted">
                                    Soru eklemek için önce anket taslağını kaydediniz.
                                </div>
                            ) : questions.length === 0 ? (
                                <div className="text-center py-5 bg-light rounded border border-dashed text-muted">
                                    Henüz soru eklenmemiş. "Soru Ekle" butonu ile başlayın.
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {questions.map((q, index) => {
                                        const draft = editingQuestions[q.id!] ?? q;
                                        const isSaving = savingQuestionId === q.id;
                                        return (
                                            <div key={q.id} className="p-3 border rounded">
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="badge bg-light text-dark">Soru #{index + 1}</span>
                                                    <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => deleteQuestion(q.id!)}>Sil</button>
                                                </div>
                                                <div className="row g-2">
                                                    <div className="col-md-8">
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={draft.question || ''}
                                                            onChange={e => updateLocalQuestion(q.id!, { question: e.target.value })}
                                                            placeholder="Soru metni..."
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={draft.question_type}
                                                            onChange={e => updateLocalQuestion(q.id!, { question_type: e.target.value as QuestionType })}
                                                        >
                                                            <option value="multiple_choice">Çoktan Seçmeli</option>
                                                            <option value="single_choice">Tek Seçimli</option>
                                                            <option value="text">Açık Uçlu (Metin)</option>
                                                            <option value="rating">Derecelendirme (1-5)</option>
                                                            <option value="scale">Ölçek</option>
                                                            <option value="boolean">Evet / Hayır</option>
                                                        </select>
                                                    </div>
                                                    {(draft.question_type === 'multiple_choice' || draft.question_type === 'single_choice') && (
                                                        <div className="col-md-12">
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                value={draft.options?.join(', ') || ''}
                                                                onChange={e => updateLocalQuestion(q.id!, { options: e.target.value.split(',').map(s => s.trim()) })}
                                                                placeholder="Seçenekleri virgül ile ayırın... (Örn: İyi, Orta, Kötü)"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="col-md-12 d-flex justify-content-between align-items-center mt-1">
                                                        <div className="form-check form-switch mb-0">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id={`req-${q.id}`}
                                                                checked={draft.is_required}
                                                                onChange={e => updateLocalQuestion(q.id!, { is_required: e.target.checked })}
                                                            />
                                                            <label className="form-check-label small" htmlFor={`req-${q.id}`}>Zorunlu</label>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-soft-success"
                                                            onClick={() => saveQuestion(q.id!)}
                                                            disabled={isSaving}
                                                        >
                                                            {isSaving
                                                                ? <><span className="spinner-border spinner-border-sm me-1"></span>Kaydediliyor...</>
                                                                : <><i className="ti ti-device-floppy me-1"></i>Kaydet</>
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .btn-soft-primary { background-color: rgba(59, 108, 255, 0.1); color: var(--bs-primary); }
                .btn-soft-success { background-color: rgba(10, 179, 156, 0.1); color: var(--bs-success); }
                .border-dashed { border-style: dashed !important; border-width: 2px !important; }
            `}</style>
        </div>
    );
};

export default OnlineSurveyForm;
