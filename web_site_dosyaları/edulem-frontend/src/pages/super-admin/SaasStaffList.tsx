import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface SaasStaffUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  saas_role: 'super_admin' | 'technical_support' | 'finance' | 'sales';
  is_active: boolean;
  created_at: string;
}

const ROLE_INFO: Record<string, { label: string; badge: string; desc: string }> = {
  super_admin: {
    label: 'Patron (Süper Yönetici)',
    badge: 'bg-danger',
    desc: 'Tüm yetkilere sahiptir. Kurum, modül, gider ve personel silebilir.',
  },
  technical_support: {
    label: 'Teknik Destek Uzmanı',
    badge: 'bg-primary',
    desc: 'Okul verilerini inceler, *lem modüllerini açıp kapatır, canlı destek sızma oturumu açar. Silme yetkisi yoktur.',
  },
  finance: {
    label: 'Finans & Muhasebe',
    badge: 'bg-success',
    desc: 'Sözleşme taksitleri, tahsilatlar, şirket giderleri ve kâr/zarar tablolarını yönetir.',
  },
  sales: {
    label: 'Satış & Müşteri Temsilcisi',
    badge: 'bg-info',
    desc: 'Okul CRM bilgilerini yönetir, yeni okul kaydeder, sözleşme şartlarını inceler.',
  },
};

const SaasStaffList = () => {
  const [staffList, setStaffList] = useState<SaasStaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SaasStaffUser | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    saas_role: 'technical_support',
    password: '',
    password_confirmation: '',
  });

  // Kullanıcı yetkisi
  const currentUserRaw = localStorage.getItem('USER_DATA');
  const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};
  const isSuperAdmin = currentUser.is_superadmin || currentUser.saas_role === 'super_admin';

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/super-admin/staff');
      setStaffList(res.data.data.staff || []);
    } catch (error) {
      console.error('Personel listesi yüklenemedi:', error);
      showToast('error', 'Personel listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      saas_role: 'technical_support',
      password: '',
      password_confirmation: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: SaasStaffUser) => {
    setEditingStaff(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      saas_role: user.saas_role,
      password: '',
      password_confirmation: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingStaff && (!formData.password || formData.password.length < 8)) {
        showToast('error', 'Şifre en az 8 karakter olmalıdır.');
        return;
      }

      if (formData.password && formData.password !== formData.password_confirmation) {
        showToast('error', 'Şifreler eşleşmiyor.');
        return;
      }

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        saas_role: formData.saas_role,
      };

      if (formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = formData.password_confirmation;
      }

      if (editingStaff) {
        await axiosClient.put(`/super-admin/staff/${editingStaff.id}`, payload);
        showToast('success', 'Personel bilgileri güncellendi.');
      } else {
        await axiosClient.post('/super-admin/staff', payload);
        showToast('success', 'Yeni şirket personeli oluşturuldu.');
      }

      setShowModal(false);
      fetchStaffList();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız.');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await axiosClient.patch(`/super-admin/staff/${id}/toggle-status`);
      showToast('success', 'Personel durumu güncellendi.');
      fetchStaffList();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Durum güncellenemedi.');
    }
  };

  const handleDelete = async (user: SaasStaffUser) => {
    if (user.id === currentUser.id) {
      showToast('error', 'Kendi hesabınızı silemezsiniz.');
      return;
    }

    const ok = await confirmDialog({
      title: 'Personeli Sil',
      text: `${user.name} isimli şirket yetkilisinin erişimini kaldırmak istediğinizden emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/super-admin/staff/${user.id}`);
      showToast('success', 'Personel silindi.');
      fetchStaffList();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Silinemedi.');
    }
  };

  return (
    <div className="py-2">
      {/* HEADER */}
      <div className="page-title-head d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-main-title m-0">EduLem Şirket Ekibi & Yetkili Personeller</h4>
          <p className="text-muted small mb-0">
            Sadece EduLem Genel Merkez personelleri. Okul kullanıcıları ve muhasebecileri buraya kesinlikle dahil edilmez.
          </p>
        </div>

        {isSuperAdmin && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <i className="ti ti-user-plus me-1"></i> Yeni Şirket Personeli Ekle
          </button>
        )}
      </div>

      {/* ROL AÇIKLAMALARI BANNERI */}
      <div className="row g-2 mb-4">
        {Object.entries(ROLE_INFO).map(([key, info]) => (
          <div className="col-lg-3 col-md-6" key={key}>
            <div className="card border h-100 shadow-sm p-3">
              <span className={`badge ${info.badge} mb-2 w-fit`}>{info.label}</span>
              <p className="small text-muted mb-0">{info.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PERSONEL TABLOSU */}
      <div className="card border shadow-sm">
        <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
          <h5 className="card-title m-0">Genel Merkez Ekibi</h5>
          <span className="badge bg-light text-dark">{staffList.length} Personel</span>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary"></div>
              <div className="mt-2">Personeller yükleniyor...</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Personel</th>
                    <th>E-posta</th>
                    <th>Telefon</th>
                    <th>SaaS Yetki Rolü</th>
                    <th>Durum</th>
                    <th>Kayıt Tarihi</th>
                    <th className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((user) => {
                    const role = ROLE_INFO[user.saas_role] || ROLE_INFO['technical_support'];
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="avatar-xs bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold">
                              {user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="fw-bold text-dark">{user.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-monospace text-muted">{user.email}</span>
                        </td>
                        <td>{user.phone || '-'}</td>
                        <td>
                          <span className={`badge ${role.badge}`}>{role.label}</span>
                        </td>
                        <td>
                          <span className={`badge ${user.is_active ? 'bg-success' : 'bg-danger'}`}>
                            {user.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>{new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
                        <td className="text-end">
                          {isSuperAdmin && (
                            <div className="d-flex gap-2 justify-content-end">
                              <button 
                                type="button" 
                                className={`btn btn-sm ${user.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                onClick={() => handleToggleStatus(user.id)}
                                title={user.is_active ? 'Hesabı Dondur' : 'Hesabı Aç'}
                              >
                                <i className={`ti ti-${user.is_active ? 'lock' : 'lock-open'}`}></i>
                              </button>

                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleOpenEdit(user)}
                                title="Düzenle"
                              >
                                <i className="ti ti-edit"></i>
                              </button>

                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(user)}
                                title="Sil"
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* YENİ / DÜZENLE MODAL */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingStaff ? 'Personel Bilgilerini Düzenle' : 'Yeni Şirket Personeli Ekle'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Personel Adı Soyadı <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Örn: Burak Tekniker"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Giriş E-postası <span className="text-danger">*</span></label>
                      <input 
                        type="email" 
                        className="form-control"
                        placeholder="destek@edulem.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Cep Telefonu</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="0 (5xx) xxx xx xx"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">SaaS Görev / Yetki Rolü <span className="text-danger">*</span></label>
                    <select 
                      className="form-select"
                      value={formData.saas_role}
                      onChange={(e) => setFormData({ ...formData, saas_role: e.target.value as any })}
                    >
                      <option value="technical_support">Teknik Destek Uzmanı (Okul inceleme, modül açma, canlı sızma girişi - Silme YOK)</option>
                      <option value="finance">Finans & Muhasebe (Gelir, alacak takibi, şirket giderleri)</option>
                      <option value="sales">Satış & CRM (Müşteri kayıt, okul iletişim ve sözleşme)</option>
                      <option value="super_admin">Patron (Süper Yönetici - Tam Yetki)</option>
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        {editingStaff ? 'Yeni Şifre (Boş bırakılırsa değişmez)' : 'Giriş Şifresi *'}
                      </label>
                      <input 
                        type="password" 
                        className="form-control"
                        placeholder="En az 8 karakter"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingStaff}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Şifre Tekrarı</label>
                      <input 
                        type="password" 
                        className="form-control"
                        placeholder="Şifreyi tekrar girin"
                        value={formData.password_confirmation}
                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                        required={!editingStaff}
                      />
                    </div>
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

export default SaasStaffList;
