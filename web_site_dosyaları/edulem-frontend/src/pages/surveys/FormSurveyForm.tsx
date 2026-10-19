import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface FormQuestion {
    question: string;
    type: string;
    required: boolean;
}

const FormSurveyForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        survey_type: 'teacher_satisfaction',
        start_date: '',
        end_date: '',
        is_active: true,
        allow_anonymous: false,
        show_results: false,
        questions: [{ question: '', type: 'rating', required: true }] as FormQuestion[]
    });

    useEffect(() => {
        if (isEdit) {
            fetchSurvey();
        }
    }, [id]);

    const fetchSurvey = async () => {
        try {
            const res = await axiosClient.get(`/surveys/forms/${id}`);
            const data = res.data.data;
            setFormData({
                title: data.title || '',
                description: data.description || '',
                survey_type: data.survey_type || 'teacher_satisfaction',
                start_date: data.start_date ? data.start_date.split(' ')[0] : '',
                end_date: data.end_date ? data.end_date.split(' ')[0] : '',
                is_active: data.is_active !== undefined ? !!data.is_active : true,
                allow_anonymous: !!data.allow_anonymous,
                show_results: !!data.show_results,
                questions: data.questions?.map((q: any) => ({
                    question: q.question || '',
                    type: q.type || 'rating',
                    required: q.required !== undefined ? q.required : true
                })) || [{ question: '', type: 'rating', required: true }]
            });
        } catch (error) {
            showToast('error', 'Form bilgileri yüklenemedi');
            navigate('/surveys');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Backend expects target_audience and other specific fields
            const apiData = {
                ...formData,
                target_audience: [{ type: 'all', ids: null }]
            };

            if (isEdit) {
                await axiosClient.put(`/surveys/forms/${id}`, apiData);
                showToast('success', 'Kurumsal form güncellendi');
            } else {
                await axiosClient.post('/surveys/forms', apiData);
                showToast('success', 'Kurumsal form oluşturuldu');
            }
            navigate('/surveys');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setFormData({ ...formData, questions: [...formData.questions, { question: '', type: 'rating', required: true }] });
    };

    const removeQuestion = (index: number) => {
        const newQs = formData.questions.filter((_, i) => i !== index);
        setFormData({ ...formData, questions: newQs.length ? newQs : [{ question: '', type: 'rating', required: true }] });
    };

    const updateQuestion = (index: number, val: string) => {
        const newQs = [...formData.questions];
        newQs[index].question = val;
        setFormData({ ...formData, questions: newQs });
    };

    const generateOptical = async () => {
        try {
            const res = await axiosClient.post(`/surveys/forms/${id}/generate-optical`);
            window.open(res.data.data.download_url, '_blank');
            showToast('success', 'Optik form oluşturuldu');
        } catch (error) {
            showToast('error', 'Optik form oluşturulamadı');
        }
    };

    if (fetching) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title">{isEdit ? 'Formu Düzenle' : 'Yeni Kurumsal Form'}</h4>
                    <p className="text-muted">Optik form destekli kurumsal değerlendirme formu oluşturun.</p>
                </div>
                {isEdit && (
                    <button type="button" className="btn btn-outline-danger" onClick={generateOptical}>
                        <i className="ti ti-file-download me-1"></i> Optik Form (PDF) Üret
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="row">
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent">
                            <h5 className="mb-0">Genel Ayarlar</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">Form Başlığı</label>
                                    <input type="text" className="form-control" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Değerlendirme Türü</label>
                                    <select className="form-select" value={formData.survey_type} onChange={e => setFormData({ ...formData, survey_type: e.target.value })}>
                                        <option value="teacher_satisfaction">Öğretmen Değerlendirme</option>
                                        <option value="staff_satisfaction">Personel Değerlendirme</option>
                                        <option value="principal_satisfaction">Yönetici Değerlendirme</option>
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Başlangıç</label>
                                    <input type="date" className="form-control" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Bitiş</label>
                                    <input type="date" className="form-control" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required />
                                </div>
                                <div className="col-12">
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" id="isActiveForm" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                                        <label className="form-check-label" htmlFor="isActiveForm">Form Aktif</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Değerlendirme Maddeleri</h5>
                            <button type="button" className="btn btn-sm btn-primary" onClick={addQuestion}>
                                <i className="ti ti-plus me-1"></i> Madde Ekle
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="d-flex flex-column gap-2">
                                {formData.questions.map((q, index) => (
                                    <div key={index} className="input-group">
                                        <span className="input-group-text bg-light">{index + 1}</span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Değerlendirme sorusu..."
                                            value={q.question}
                                            onChange={e => updateQuestion(index, e.target.value)}
                                            required
                                        />
                                        <button type="button" className="btn btn-outline-danger" onClick={() => removeQuestion(index)}>
                                            <i className="ti ti-trash"></i>
                                        </button>
                                    </div>
                                ))}
                                <div className="mt-3 alert alert-soft-info py-2 small border-0">
                                    <i className="ti ti-info-circle me-1"></i>
                                    Kurumsal formlarda tüm sorular 1-5 arası derecelendirme (Likert ölçeği) tipindedir.
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-top p-3 text-end">
                            <button type="button" className="btn btn-light me-2" onClick={() => navigate('/surveys')}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading && <span className="spinner-border spinner-border-sm me-1"></span>}
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            </form>
            <style>{`
                .alert-soft-info { background-color: rgba(13, 202, 240, 0.1); color: #087990; }
            `}</style>
        </div>
    );
};

export default FormSurveyForm;
