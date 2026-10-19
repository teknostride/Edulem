import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Student {
    id: number;
    name: string;
}

interface Template {
    id: number;
    name: string;
}

const BulletinForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        bulletin_date: new Date().toISOString().split('T')[0],
        category: 'Academic',
        student_id: '',
        template_id: '',
        is_published_to_guardian: false,
        is_added_to_portfolio: false
    });

    useEffect(() => {
        fetchStudents();
        fetchTemplates();
        if (id) {
            fetchBulletin();
        }
    }, [id]);

    const fetchStudents = async () => {
        try {
            const response = await axiosClient.get('/students');
            setStudents(response.data.data);
        } catch (error) {
            console.error('Öğrenciler yüklenemedi');
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await axiosClient.get('/bulletin-templates');
            setTemplates(response.data.data);
        } catch (error) {
            console.error('Şablonlar yüklenemedi');
        }
    };

    const fetchBulletin = async () => {
        try {
            setFetching(true);
            const response = await axiosClient.get(`/bulletins/${id}`);
            const data = response.data.data;
            setFormData({
                title: data.title,
                content: data.content,
                bulletin_date: data.bulletin_date,
                category: data.category,
                student_id: data.student_id?.toString() || '',
                template_id: data.template_id?.toString() || '',
                is_published_to_guardian: data.is_published_to_guardian,
                is_added_to_portfolio: data.is_added_to_portfolio
            });
        } catch (error) {
            showToast('error', 'Bülten bilgileri yüklenemedi');
            navigate('/communication/bulletins');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const dataToSend = {
                ...formData,
                student_id: formData.student_id || null,
                template_id: formData.template_id || null
            };

            if (id) {
                await axiosClient.put(`/bulletins/${id}`, dataToSend);
                showToast('success', 'Bülten güncellendi');
            } else {
                await axiosClient.post('/bulletins', dataToSend);
                showToast('success', 'Bülten oluşturuldu');
            }
            navigate('/communication/bulletins');
        } catch (error) {
            showToast('error', 'İşlem sırasında bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="page-title-head d-flex align-items-center mb-4">
                <div className="flex-grow-1">
                    <h4 className="page-main-title m-0">{id ? 'Bülteni Düzenle' : 'Yeni Bülten Oluştur'}</h4>
                    <p className="text-muted mb-0">Öğrenciye özel veya genel kurumsal bülten hazırlayın</p>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/communication/bulletins')}>
                    İptal
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-9">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-8">
                                        <label className="form-label fw-bold">Bülten Başlığı</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Örn: 1. Dönem Sosyal Gelişim Bülteni"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">Tarih</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.bulletin_date}
                                            onChange={(e) => setFormData({ ...formData, bulletin_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">Kategori</label>
                                        <select
                                            className="form-select"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="Academic">Akademik Değerlendirme</option>
                                            <option value="Social">Sosyal Gelişim</option>
                                            <option value="Institutional">Kurumsal Haber</option>
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">İlgili Öğrenci (Genel ise boş bırakın)</label>
                                        <select
                                            className="form-select"
                                            value={formData.student_id}
                                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                                        >
                                            <option value="">-- Genel Bülten --</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">Bülten Şablonu (Opsiyonel)</label>
                                        <select
                                            className="form-select"
                                            value={formData.template_id}
                                            onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                                        >
                                            <option value="">Düz Metin</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="form-label fw-bold">Bülten İçeriği</label>
                                        <textarea
                                            className="form-control"
                                            rows={12}
                                            placeholder="Detaylı bülten içeriğini buraya girin..."
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="col-md-12 mt-4">
                                        <div className="d-flex gap-4 p-3 bg-light rounded">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="publish_guardian"
                                                    checked={formData.is_published_to_guardian}
                                                    onChange={(e) => setFormData({ ...formData, is_published_to_guardian: e.target.checked })}
                                                />
                                                <label className="form-check-label" htmlFor="publish_guardian">Velilere Yayınla</label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="add_portfolio"
                                                    checked={formData.is_added_to_portfolio}
                                                    onChange={(e) => setFormData({ ...formData, is_added_to_portfolio: e.target.checked })}
                                                    disabled={!formData.student_id}
                                                />
                                                <label className="form-check-label" htmlFor="add_portfolio">Portfolyoya Ekle</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-12 mt-4 text-end">
                                        <button className="btn btn-primary px-5 py-2" disabled={loading}>
                                            {loading ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                                            {id ? 'Bilgileri Güncelle' : 'Bülteni Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulletinForm;
