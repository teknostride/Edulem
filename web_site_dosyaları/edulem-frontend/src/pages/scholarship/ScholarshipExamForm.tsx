import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { useNavigate, useParams, Link } from 'react-router-dom';

const ScholarshipExamForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        exam_datetime: '',
        duration_minutes: 60,
        status: 'draft'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchExam();
        }
    }, [id]);

    const fetchExam = async () => {
        try {
            const response = await axiosClient.get(`/scholarship-exams/${id}`);
            const exam = response.data.data;
            setFormData({
                title: exam.title,
                description: exam.description || '',
                exam_datetime: `${exam.exam_date}T${String(exam.exam_time ?? '00:00').slice(0, 5)}`,
                duration_minutes: Number(exam.duration_minutes ?? 60),
                status: exam.status ?? 'draft'
            });
        } catch (error) {
            showToast('error', 'Sınav bilgileri yüklenemedi');
        }
    };

    const toApiPayload = () => {
        const dt = (formData.exam_datetime || '').trim();
        const [datePart, timePartRaw] = dt.split('T');
        const timePart = (timePartRaw || '').slice(0, 5);

        const statusMap: Record<string, string> = {
            planned: 'draft',
            active: 'open',
            closed: 'closed',
            completed: 'completed',
            cancelled: 'cancelled',
            draft: 'draft',
            open: 'open',
        };

        return {
            title: formData.title,
            description: formData.description || null,
            exam_date: datePart,
            exam_time: timePart,
            duration_minutes: Number(formData.duration_minutes),
            status: statusMap[formData.status] ?? 'draft',
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const payload = toApiPayload();
            if (id) {
                await axiosClient.put(`/scholarship-exams/${id}`, payload);
                showToast('success', 'Sınav güncellendi');
            } else {
                await axiosClient.post('/scholarship-exams', payload);
                showToast('success', 'Sınav oluşturuldu');
            }
            navigate('/scholarship/exams');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-lg-8 mx-auto">
                    <div className="card mt-4">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0">{id ? 'Sınavı Düzenle' : 'Yeni Sınav Oluştur'}</h5>
                            <Link to="/scholarship/exams" className="btn btn-sm btn-soft-secondary">İptal</Link>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Sınav Başlığı *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder="Örn: 2024 Bursluluk ve Giriş Sınavı"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Açıklama</label>
                                    <textarea
                                        className="form-control"
                                        rows={4}
                                        placeholder="Sınav hakkında detaylar, kurallar vb..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Sınav Tarihi ve Saati *</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            required
                                            value={formData.exam_datetime}
                                            onChange={(e) => setFormData({ ...formData, exam_datetime: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Sınav Süresi (dk) *</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            required
                                            min={1}
                                            value={formData.duration_minutes}
                                            onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Durum</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="draft">Taslak</option>
                                        <option value="open">Başvurulara Açık</option>
                                        <option value="closed">Başvurular Kapalı</option>
                                        <option value="completed">Tamamlandı</option>
                                        <option value="cancelled">İptal Edildi</option>
                                    </select>
                                </div>
                                <div className="text-end mt-4">
                                    <button type="submit" className="btn btn-primary px-5" disabled={loading}>
                                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScholarshipExamForm;
