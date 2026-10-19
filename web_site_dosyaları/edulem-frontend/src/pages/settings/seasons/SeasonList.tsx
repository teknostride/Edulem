import { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';

interface Season {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    students_count?: number;
    count_levels?: number;
    count_classrooms?: number;
    count_students?: number;
    created_at?: string;
}

const SeasonList = () => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', copy_classrooms_from: '' });
    const [deleteModal, setDeleteModal] = useState<{ show: boolean, id: number | null, name: string }>({ show: false, id: null, name: '' });
    const [configuringId, setConfiguringId] = useState<number | null>(() => {
        const saved = localStorage.getItem('active_config_season');
        return saved ? Number(saved) : null;
    });

    const fetchSeasons = async () => {
        try {
            const response = await axiosClient.get('/seasons');
            setSeasons(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching seasons:', error);
            showToast('error', 'Sezonlar listelenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeasons();
    }, []);

    const toggleConfiguration = (id: number) => {
        if (configuringId === id) {
            // Kaydet (Moddan çık)
            localStorage.removeItem('active_config_season');
            setConfiguringId(null);
            showToast('success', 'Yapılandırma kaydedildi. Normal moda dönüldü.');
            // Değişikliklerin her yerde aktif olması için sayfayı yenileyelim
            setTimeout(() => window.location.reload(), 1000);
        } else {
            // Yapılandırmaya gir
            localStorage.setItem('active_config_season', id.toString());
            setConfiguringId(id);
            showToast('warning', 'Yapılandırma modu aktif. Yaptığınız işlemler bu sezona kaydedilecek.');
            // Sayfayı yenileyerek header'ın tüm isteklerde aktif olmasını sağla
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showToast('error', 'Yıl bilgisi zorunludur.');
            return;
        }

        setSaving(true);
        const dataToSumbit = {
            name: formData.name,
            description: formData.description,
            copy_classrooms_from: formData.copy_classrooms_from || null
        };

        try {
            if (editingId) {
                await axiosClient.put(`/seasons/${editingId}`, {
                    name: formData.name,
                    description: formData.description
                });
                showToast('success', 'Sezon başarıyla güncellendi.');
            } else {
                await axiosClient.post('/seasons', dataToSumbit);
                showToast('success', 'Sezon başarıyla oluşturuldu.');
            }
            setShowModal(false);
            setFormData({ name: '', description: '', copy_classrooms_from: '' });
            setEditingId(null);
            fetchSeasons();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async (id: number) => {
        try {
            await axiosClient.patch(`/seasons/${id}/activate`);
            showToast('success', 'Sezon aktif edildi.');
            fetchSeasons();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Aktivasyon sırasında bir hata oluştu.');
        }
    };

    const openEdit = (season: Season) => {
        setEditingId(season.id);
        setFormData({ name: season.name, description: season.description || '', copy_classrooms_from: '' });
        setShowModal(true);
    };

    const handleDelete = (id: number, name: string) => {
        setDeleteModal({ show: true, id, name });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await axiosClient.delete(`/seasons/${deleteModal.id}`);
            showToast('success', 'Sezon başarıyla silindi.');
            setDeleteModal({ show: false, id: null, name: '' });
            fetchSeasons();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Silme işlemi başarısız.');
        }
    };

    if (loading) {
        return (
            <div className="container-fluid text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box">
                        <div className="page-title-right">
                            <ol className="breadcrumb m-0">
                                <li className="breadcrumb-item"><a href="#!">Yönetim</a></li>
                                <li className="breadcrumb-item"><a href="#!">Kurum Yapısı</a></li>
                                <li className="breadcrumb-item active">Sezonlar</li>
                            </ol>
                        </div>
                        <h4 className="page-title">Sezon Yönetimi</h4>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card border-0 shadow-sm overflow-hidden">
                        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                            <div>
                                <h5 className="card-title mb-0 fw-bold">Sezon Listesi</h5>
                                <p className="text-muted small mb-0">Eğitim öğretim dönemlerini bu alandan yönetebilirsiniz.</p>
                            </div>
                            <button 
                                className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm"
                                onClick={() => {
                                    setEditingId(null);
                                    setFormData({ name: '', description: '', copy_classrooms_from: '' });
                                    setShowModal(true);
                                }}
                            >
                                <i className="ti ti-plus fs-5"></i>
                                <span>Yeni Sezon Ekle</span>
                            </button>
                        </div>
                        <div className="card-body p-0">
                            {seasons.length === 0 ? (
                                <div className="p-5 text-center">
                                    <div className="mb-4">
                                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                            <i className="ti ti-calendar-event text-primary" style={{ fontSize: '40px' }}></i>
                                        </div>
                                    </div>
                                    <h4 className="fw-bold">Henüz Sezon Eklenmemiş</h4>
                                    <p className="text-muted mx-auto mb-4" style={{ maxWidth: '400px' }}>
                                        Kurumunuz için eğitim dönemlerini (örneğin: 2024-2025 Eğitim Yılı) ekleyerek sezon mantığını kurgulamaya başlayabilirsiniz.
                                    </p>
                                    <button 
                                        className="btn btn-outline-primary px-4"
                                        onClick={() => setShowModal(true)}
                                    >
                                        İlk Sezonu Ekle
                                    </button>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4" style={{ width: '60px' }}>#</th>
                                                <th>Yıl / Sezon</th>
                                                <th>Açıklama</th>
                                                <th className="text-center">Kademe Sayısı</th>
                                                <th className="text-center">Sınıf Sayısı</th>
                                                <th className="text-center">Öğrenci Sayısı</th>
                                                <th className="text-center">Durum</th>
                                                <th className="text-end pe-4">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {seasons.map((season, index) => (
                                                <tr key={season.id}>
                                                    <td className="ps-4 text-muted">
                                                        <span className="fw-medium">{index + 1}.</span>
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark">{season.name}</div>
                                                    </td>
                                                    <td>
                                                        <span className="text-muted small">{season.description || '—'}</span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge bg-primary-subtle text-primary fw-medium px-2 py-1">
                                                            {Number(season.count_levels) || 0}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge bg-info-subtle text-info fw-medium px-2 py-1">
                                                            {Number(season.count_classrooms) || 0}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge bg-light text-dark border fw-medium px-2 py-1">
                                                            {Number(season.count_students) || 0}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`badge rounded-pill ${season.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`} style={{ fontSize: '0.75rem', padding: '0.4em 0.8em' }}>
                                                            {season.is_active ? 'Aktif' : 'Pasif'}
                                                        </span>
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <div className="d-flex justify-content-end gap-2">
                                                            {!season.is_active && (
                                                                <button 
                                                                    className="btn btn-sm btn-success px-2 d-flex align-items-center gap-1 shadow-sm"
                                                                    onClick={() => handleActivate(season.id)}
                                                                >
                                                                    <i className="ti ti-check fs-5"></i>
                                                                    <span>Aktif Et</span>
                                                                </button>
                                                            )}
                                                            <button 
                                                                className={`btn btn-sm px-2 text-white d-flex align-items-center gap-1 shadow-sm ${configuringId === season.id ? 'btn-warning' : 'btn-info'}`}
                                                                onClick={() => toggleConfiguration(season.id)}
                                                            >
                                                                <i className={`ti ${configuringId === season.id ? 'ti-device-floppy' : 'ti-settings'} fs-5`}></i>
                                                                <span>{configuringId === season.id ? 'Kaydet' : 'Yapılandır'}</span>
                                                            </button>
                                                            <button 
                                                                className="btn btn-sm btn-light border p-2" 
                                                                onClick={() => openEdit(season)}
                                                                title="Düzenle"
                                                            >
                                                                <i className="ti ti-edit fs-5 text-primary"></i>
                                                            </button>
                                                            <button 
                                                                className="btn btn-sm btn-light border p-2" 
                                                                onClick={() => handleDelete(season.id, season.name)}
                                                                title="Sil"
                                                            >
                                                                <i className="ti ti-trash fs-5 text-danger"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div 
                    className="modal show d-block" 
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-white border-bottom py-3">
                                <h5 className="modal-title fw-bold">
                                    {editingId ? 'Sezonu Düzenle' : 'Yeni Sezon Oluştur'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold text-dark">Yıl / Dönem <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control form-control-lg shadow-none" 
                                            placeholder="Örn: 2025-2026"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                        <div className="form-text small">Sezonun geçerli olduğu akademik yılı giriniz.</div>
                                    </div>
                                    <div className="mb-0">
                                        <label className="form-label fw-semibold text-dark">Özel Açıklama</label>
                                        <textarea 
                                            className="form-control shadow-none" 
                                            rows={3}
                                            placeholder="Örn: Yaz Okulu veya I. Dönem"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        ></textarea>
                                        <div className="form-text small">Sezonla ilgili hatırlatıcı veya açıklayıcı bir not ekleyebilirsiniz.</div>
                                    </div>
                                    {!editingId && seasons.length > 0 && (
                                        <div className="mt-4 pt-3 border-top">
                                            <label className="form-label fw-semibold text-dark">Sınıfları Kopyala (Opsiyonel)</label>
                                            <select 
                                                className="form-select shadow-none"
                                                value={formData.copy_classrooms_from}
                                                onChange={(e) => setFormData({ ...formData, copy_classrooms_from: e.target.value })}
                                            >
                                                <option value="">Sınıf Kopyalama</option>
                                                {seasons.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} sezonunun sınıflarını kopyala</option>
                                                ))}
                                            </select>
                                            <div className="form-text small text-info">
                                                <i className="ti ti-info-circle me-1"></i>
                                                Yeni sezon açılırken seçtiğiniz sezondaki sınıf isimleri otomatik olarak kopyalanır.
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer bg-light-subtle border-top py-3">
                                    <button type="button" className="btn btn-link link-secondary text-decoration-none px-4" onClick={() => setShowModal(false)}>İptal</button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary px-4 fw-bold shadow-sm"
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            editingId ? 'Güncelle' : 'Oluştur'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div 
                    className="modal show d-block" 
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-body p-4 text-center">
                                <div className="mb-4">
                                    <div className="bg-danger-subtle rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '70px', height: '70px' }}>
                                        <i className="ti ti-trash text-danger fs-1"></i>
                                    </div>
                                </div>
                                <h5 className="fw-bold mb-2">Emin misiniz?</h5>
                                <p className="text-muted small mb-0">
                                    <strong>{deleteModal.name}</strong> sezonu silinecek. Bu işlem geri alınamaz.
                                </p>
                            </div>
                            <div className="modal-footer justify-content-center border-0 pb-4">
                                <button type="button" className="btn btn-light px-4" onClick={() => setDeleteModal({ show: false, id: null, name: '' })}>Vazgeç</button>
                                <button type="button" className="btn btn-danger px-4 fw-bold" onClick={confirmDelete}>Evet, Sil</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeasonList;
