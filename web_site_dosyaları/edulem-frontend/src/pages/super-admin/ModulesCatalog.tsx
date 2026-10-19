import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface SaasModule {
  id: number;
  name: string;
  key: string;
  description?: string;
  monthly_price: number;
  is_active: boolean;
  icon?: string;
  badge_color?: string;
  created_at: string;
}

const ModulesCatalog = () => {
  const [modules, setModules] = useState<SaasModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<SaasModule | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    monthly_price: '',
    icon: 'ti-box',
    is_active: true,
  });

  // Kullanıcı yetkisi
  const currentUserRaw = localStorage.getItem('USER_DATA');
  const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};
  const isSuperAdmin = currentUser.is_superadmin || currentUser.saas_role === 'super_admin';

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/super-admin/modules');
      const data = res.data.data;
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data?.modules) ? data.modules : []);
      setModules(list);
    } catch (error) {
      console.error('Modüller yüklenemedi:', error);
      showToast('error', 'Modül kataloğu yüklenemedi.');
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingModule(null);
    setFormData({
      name: '',
      key: '',
      description: '',
      monthly_price: '',
      icon: 'ti-box',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (mod: SaasModule) => {
    setEditingModule(mod);
    setFormData({
      name: mod.name,
      key: mod.key,
      description: mod.description || '',
      monthly_price: String(mod.monthly_price),
      icon: mod.icon || 'ti-box',
      is_active: mod.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        key: formData.key.toLowerCase().trim(),
        description: formData.description,
        monthly_price: Number(formData.monthly_price),
        icon: formData.icon,
        is_active: formData.is_active,
      };

      if (editingModule) {
        await axiosClient.put(`/super-admin/modules/${editingModule.id}`, payload);
        showToast('success', 'Modül başarıyla güncellendi.');
      } else {
        await axiosClient.post('/super-admin/modules', payload);
        showToast('success', 'Yeni *lem modülü kataloğa eklendi.');
      }

      setShowModal(false);
      fetchModules();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız.');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await axiosClient.patch(`/super-admin/modules/${id}/toggle-status`);
      showToast('success', 'Modül durumu güncellendi.');
      fetchModules();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Durum değiştirilemedi.');
    }
  };

  const handleDelete = async (id: number, key: string) => {
    if (key === 'core') {
      showToast('error', 'EduLem Core ana modülü silinemez.');
      return;
    }

    const ok = await confirmDialog({
      title: 'Modülü Sil',
      text: 'Bu modülü katalogdan silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/super-admin/modules/${id}`);
      showToast('success', 'Modül silindi.');
      fetchModules();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Silinemedi.');
    }
  };

  return (
    <div className="py-2">
      {/* HEADER */}
      <div className="page-title-head d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-main-title m-0">EduLem Modül & Ürün Kataloğu (*lem)</h4>
          <p className="text-muted small mb-0">
            Sistemdeki tüm alt ürünleri (QuizLem, KeyLem, ClassLem, RahleLem vb.) buradan yönetebilir, yeni ürünler ekleyebilirsiniz.
          </p>
        </div>

        {isSuperAdmin && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <i className="ti ti-plus me-1"></i> Yeni *lem Modülü Ekle
          </button>
        )}
      </div>

      {/* MODÜL LİSTESİ */}
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary"></div>
          <div className="mt-2">Modüller yükleniyor...</div>
        </div>
      ) : (
        <div className="row g-3">
          {modules.map((mod) => (
            <div className="col-lg-4 col-md-6" key={mod.id}>
              <div className={`card h-100 border shadow-sm ${!mod.is_active ? 'opacity-75 bg-light' : ''}`}>
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="avatar-md bg-soft-primary text-primary rounded d-flex align-items-center justify-content-center fs-24">
                        <i className={`ti ${mod.icon || 'ti-box'}`}></i>
                      </div>
                      <div>
                        <h5 className="mb-0 fw-bold">{mod.name}</h5>
                        <span className="badge bg-secondary font-monospace fs-11">{mod.key}</span>
                      </div>
                    </div>

                    <span className={`badge ${mod.is_active ? 'bg-success' : 'bg-danger'}`}>
                      {mod.is_active ? 'Satışta / Aktif' : 'Pasif'}
                    </span>
                  </div>

                  <p className="text-muted small" style={{ minHeight: '40px' }}>
                    {mod.description || 'Bu modül için henüz açıklama girilmedi.'}
                  </p>

                  <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded mt-3">
                    <span className="small text-muted">Standart Liste Fiyatı:</span>
                    <strong className="fs-16 text-primary">{Number(mod.monthly_price).toLocaleString('tr-TR')} ₺ / ay</strong>
                  </div>

                  {isSuperAdmin && (
                    <div className="d-flex gap-2 justify-content-end mt-3 pt-2 border-top">
                      <button 
                        type="button" 
                        className={`btn btn-sm ${mod.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => handleToggleStatus(mod.id)}
                        title={mod.is_active ? 'Pasife Al' : 'Aktifleştir'}
                      >
                        <i className={`ti ti-${mod.is_active ? 'player-pause' : 'player-play'}`}></i>
                      </button>

                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleOpenEdit(mod)}
                        title="Düzenle"
                      >
                        <i className="ti ti-edit"></i>
                      </button>

                      {mod.key !== 'core' && (
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(mod.id, mod.key)}
                          title="Sil"
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* YENİ / DÜZENLE MODAL */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingModule ? 'Modülü Düzenle' : 'Yeni *lem Modülü Tanımla'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Modül Adı <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Örn: QuizLem veya KeyLem"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Modül Anahtarı (Key) <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control font-monospace"
                        placeholder="Örn: quizlem"
                        value={formData.key}
                        disabled={!!editingModule && editingModule.key === 'core'}
                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                        required
                      />
                      <div className="form-text small">Kodlarda kullanılacak benzersiz ad.</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Aylık Liste Fiyatı (₺)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control"
                        placeholder="Örn: 2500"
                        value={formData.monthly_price}
                        onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Tabler İkon Kodu</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="ti-pencil, ti-key, ti-book..."
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Açıklama</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      placeholder="Bu modülün sağladığı özellikler ve işlev..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="form-check form-switch">
                    <input 
                      type="checkbox" 
                      className="form-check-input"
                      id="mod_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="mod_active">Modül Satışta / Aktif</label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModulesCatalog;
