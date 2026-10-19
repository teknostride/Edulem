import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Classroom {
    id: number;
    name: string;
}

const ActivityForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Social',
        activity_date: new Date().toISOString().split('T')[0],
        activity_time: '09:00',
        location: '',
        classroom_id: '',
        share_type: 'all', // all, classroom, target_group
        is_published: true,
        requires_admin_approval: false
    });

    useEffect(() => {
        fetchClassrooms();
        if (id) {
            fetchActivity();
        }
    }, [id]);

    const fetchClassrooms = async () => {
        try {
            const response = await axiosClient.get('/classrooms');
            setClassrooms(response.data.data);
        } catch (error) {
            console.error('Sınıflar yüklenemedi');
        }
    };

    const fetchActivity = async () => {
        try {
            setFetching(true);
            const response = await axiosClient.get(`/activities/${id}`);
            const data = response.data.data;
            setFormData({
                title: data.title,
                description: data.description,
                category: data.category,
                activity_date: data.activity_date,
                activity_time: data.activity_time,
                location: data.location || '',
                classroom_id: data.classroom_id || '',
                share_type: data.share_type || 'all',
                is_published: data.is_published,
                requires_admin_approval: data.requires_admin_approval
            });
        } catch (error) {
            showToast('error', 'Etkinlik bilgileri yüklenemedi');
            navigate('/communication/activities');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (id) {
                await axiosClient.put(`/activities/${id}`, formData);
                showToast('success', 'Etkinlik başarıyla güncellendi');
            } else {
                await axiosClient.post('/activities', formData);
                showToast('success', 'Etkinlik başarıyla oluşturuldu');
            }
            navigate('/communication/activities');
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
                    <h4 className="page-main-title m-0">{id ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Paylaş'}</h4>
                    <p className="text-muted mb-0">Okul topluluğu ile güncel haberleri ve etkinlikleri paylaşın</p>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/communication/activities')}>
                    İptal Et
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        <label className="form-label fw-bold">Etkinlik Başlığı</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Örn: 23 Nisan Kutlamaları"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-12">
                                        <label className="form-label fw-bold">Açıklama</label>
                                        <textarea
                                            className="form-control"
                                            rows={5}
                                            placeholder="Etkinlik hakkında detaylı bilgi yazın..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">Kategori</label>
                                        <select
                                            className="form-select"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="Social">Sosyal</option>
                                            <option value="Academic">Akademik</option>
                                            <option value="Sport">Spor</option>
                                            <option value="Art">Sanat</option>
                                            <option value="Science">Bilim</option>
                                            <option value="Other">Diğer</option>
                                        </select>
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">Etkinlik Tarihi</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.activity_date}
                                            onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">Saat</label>
                                        <input
                                            type="time"
                                            className="form-control"
                                            value={formData.activity_time}
                                            onChange={(e) => setFormData({ ...formData, activity_time: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Konum / Yer</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Örn: Konferans Salonu"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-bold">Hedef Sınıf (Opsiyonel)</label>
                                        <select
                                            className="form-select"
                                            value={formData.classroom_id}
                                            onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                                        >
                                            <option value="">Tüm Okul</option>
                                            {classrooms.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-12 mt-4">
                                        <div className="card bg-light border-0">
                                            <div className="card-body">
                                                <h6 className="fw-bold mb-3">Yayın Ayarları</h6>
                                                <div className="d-flex flex-wrap gap-4">
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="is_published"
                                                            checked={formData.is_published}
                                                            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                                        />
                                                        <label className="form-check-label" htmlFor="is_published">Hemen Yayınla</label>
                                                    </div>
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="requires_admin_approval"
                                                            checked={formData.requires_admin_approval}
                                                            onChange={(e) => setFormData({ ...formData, requires_admin_approval: e.target.checked })}
                                                        />
                                                        <label className="form-check-label" htmlFor="requires_admin_approval">İdare Onayı Gereksin</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-12 mt-4 text-end">
                                        <button className="btn btn-primary px-5 py-2" disabled={loading}>
                                            {loading ? (
                                                <span className="spinner-border spinner-border-sm me-1"></span>
                                            ) : (
                                                <i className="ti ti-device-floppy me-1"></i>
                                            )}
                                            {id ? 'Güncelle' : 'Paylaş'}
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

export default ActivityForm;
