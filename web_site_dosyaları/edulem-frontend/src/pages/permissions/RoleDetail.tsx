import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  scope?: string;
  is_system?: boolean;
  hierarchy_level?: number;
  page_visibility?: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

// Sidebar'daki tüm sayfaların tanımı
const PAGE_MENU: { category: string; pages: { key: string; label: string; icon: string }[] }[] = [
  {
    category: 'Yönetim',
    pages: [
      { key: 'students', label: 'Öğrenci Yönetimi', icon: 'ti-users-group' },
      { key: 'users', label: 'Kullanıcı Yönetimi', icon: 'ti-user-check' },
    ],
  },
  {
    category: 'Akademik',
    pages: [
      { key: 'teacher_students', label: 'Öğrencilerim (Öğretmen)', icon: 'ti-users' },
      { key: 'schedules', label: 'Ders Programı', icon: 'ti-calendar-week' },
      { key: 'teacher_measurement', label: 'Ölçme Değerlendirme (Öğretmen)', icon: 'ti-chart-bar' },
      { key: 'attendances', label: 'Yoklama', icon: 'ti-clipboard-check' },
      { key: 'homework', label: 'Ödev Yönetimi', icon: 'ti-book' },
      { key: 'tutoring', label: 'Etüt ve Özel Ders', icon: 'ti-calendar-event' },
      { key: 'teacher_meetings', label: 'Görüşmelerim (Öğretmen)', icon: 'ti-messages' },
      { key: 'counseling', label: 'Rehberlik Servisi', icon: 'ti-heart-handshake' },
      { key: 'meal_menus', label: 'Yemek Menüsü', icon: 'ti-tools-kitchen-2' },
      { key: 'duty_schedules', label: 'Nöbet Çizelgesi', icon: 'ti-shield' },
      { key: 'scholarship_exams', label: 'Bursluluk Sınavları', icon: 'ti-certificate' },
      { key: 'measurement', label: 'Ölçme Değerlendirme', icon: 'ti-chart-bar' },
    ],
  },
  {
    category: 'İletişim',
    pages: [
      { key: 'notifications', label: 'Duyurular', icon: 'ti-bell' },
      { key: 'messages', label: 'Mesajlar', icon: 'ti-mail' },
      { key: 'surveys', label: 'Anketler', icon: 'ti-forms' },
    ],
  },
  {
    category: 'Kurumsal',
    pages: [
      { key: 'institution', label: 'Kurum Yapısı', icon: 'ti-building-arch' },
      { key: 'time_slots', label: 'Kurum Saatleri', icon: 'ti-clock-hour-4' },
      { key: 'sms_center', label: 'SMS Merkezi', icon: 'ti-mail' },
    ],
  },
  {
    category: 'Yetkilendirme',
    pages: [
      { key: 'permissions_roles', label: 'Roller', icon: 'ti-shield-lock' },
    ],
  },
];

const RoleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) fetchRoleDetail(id);
  }, [id]);

  const fetchRoleDetail = async (roleId: string) => {
    try {
      const res = await axiosClient.get(`/roles/${roleId}`);
      const data: Role = res.data?.data || res.data;
      setRole(data);

      // Mevcut page_visibility varsa onu kullan, yoksa tüm sayfaları true yap
      const initialVisibility: Record<string, boolean> = {};
      PAGE_MENU.forEach(cat => cat.pages.forEach(p => {
        initialVisibility[p.key] = data.page_visibility
          ? (data.page_visibility[p.key] !== false)
          : true;
      }));
      setVisibility(initialVisibility);
    } catch (error) {
      console.error('Rol detayı yüklenemedi:', error);
      showToast('error', 'Rol detayı yüklenemedi');
      navigate('/permissions/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await axiosClient.put(`/roles/${role.id}/page-visibility`, {
        page_visibility: visibility,
      });
      showToast('success', 'Sayfa görünürlükleri kaydedildi');
    } catch {
      showToast('error', 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const getScopeBadgeColor = (scope?: string) => {
    const colorMap: Record<string, string> = {
      all: 'danger', campus: 'warning', education_level: 'info',
    };
    return colorMap[scope || ''] || 'secondary';
  };

  const getScopeText = (scope?: string) => {
    const textMap: Record<string, string> = {
      all: 'Tüm Kampüslere Erişim',
      campus: 'Kendi Kampüsüne Erişim',
      education_level: 'Kendi Kampüs ve Kademelerine Erişim',
    };
    return textMap[scope || ''] || 'Belirtilmemiş';
  };

  const visibleCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = Object.values(visibility).length;

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <h4>Rol bulunamadı.</h4>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/permissions/roles')}>
            Rollere Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Başlık */}
      <div className="page-title-head d-flex align-items-center mb-3">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Rol Detayı</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="javascript:void(0);">Sayfalar</a></li>
            <li className="breadcrumb-item"><a href="/permissions/roles">Roller</a></li>
            <li className="breadcrumb-item active">Detay</li>
          </ol>
        </div>
      </div>

      <div className="row g-3">
        {/* Sol: Rol Bilgileri */}
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">{role.display_name}</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label text-muted small">Rol Adı</label>
                <div className="fw-semibold">{role.name}</div>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Görünen Ad</label>
                <div className="fw-semibold">{role.display_name}</div>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Yetki Kapsamı</label>
                <div>
                  <span className={`badge bg-${getScopeBadgeColor(role.scope)}`}>
                    {getScopeText(role.scope)}
                  </span>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Sistem Rolü</label>
                <div>
                  <span className={`badge ${role.is_system ? 'bg-success' : 'bg-secondary'}`}>
                    {role.is_system ? 'Evet' : 'Hayır'}
                  </span>
                </div>
              </div>
              {role.description && (
                <div className="mb-3">
                  <label className="form-label text-muted small">Açıklama</label>
                  <div>{role.description}</div>
                </div>
              )}
              <hr />
              <small className="text-muted d-block">
                Oluşturulma: {role.created_at ? new Date(role.created_at).toLocaleString('tr-TR') : '-'}
              </small>
              <small className="text-muted d-block">
                Güncellenme: {role.updated_at ? new Date(role.updated_at).toLocaleString('tr-TR') : '-'}
              </small>
            </div>
            <div className="card-footer d-flex gap-2">
              <button className="btn btn-light flex-fill" onClick={() => navigate('/permissions/roles')}>
                <i className="ti ti-arrow-left me-1"></i>Geri
              </button>
              <button className="btn btn-primary flex-fill" onClick={() => navigate(`/permissions/roles/${role.id}/edit`)}>
                <i className="ti ti-edit me-1"></i>Düzenle
              </button>
            </div>
          </div>
        </div>

        {/* Sağ: Sayfa Görünürlükleri */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div>
                <h5 className="card-title mb-0">
                  <i className="ti ti-eye me-2 text-primary"></i>
                  Sayfa Görünürlükleri
                </h5>
                <p className="text-muted small mb-0 mt-1">
                  Bu role sahip kullanıcıların sidebar'da hangi sayfaları göreceğini ayarlayın.
                </p>
              </div>
              <div className="text-end">
                <span className="badge bg-primary-subtle text-primary fs-13">
                  {visibleCount} / {totalCount} sayfa görünür
                </span>
              </div>
            </div>
            <div className="card-body">
              {PAGE_MENU.map(cat => (
                <div key={cat.category} className="mb-4">
                  <h6 className="text-uppercase text-muted fw-bold small mb-3 border-bottom pb-2">
                    {cat.category}
                  </h6>
                  <div className="row g-2">
                    {cat.pages.map(page => (
                      <div key={page.key} className="col-md-6 col-lg-4">
                        <div
                          className={`d-flex align-items-center justify-content-between p-3 rounded border ${visibility[page.key]
                            ? 'border-success-subtle bg-success-subtle'
                            : 'border-secondary-subtle bg-light'
                            }`}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <i className={`ti ${page.icon} fs-18 ${visibility[page.key] ? 'text-success' : 'text-muted'
                              }`}></i>
                            <span className={`small fw-medium ${visibility[page.key] ? 'text-dark' : 'text-muted'
                              }`}>
                              {page.label}
                            </span>
                          </div>
                          <div className="form-check form-switch mb-0 ms-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id={`toggle_${page.key}`}
                              checked={visibility[page.key] ?? true}
                              onChange={() => handleToggle(page.key)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center">
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    PAGE_MENU.forEach(c => c.pages.forEach(p => { all[p.key] = true; }));
                    setVisibility(all);
                  }}
                >
                  <i className="ti ti-check me-1"></i>Tümünü Aç
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    const none: Record<string, boolean> = {};
                    PAGE_MENU.forEach(c => c.pages.forEach(p => { none[p.key] = false; }));
                    setVisibility(none);
                  }}
                >
                  <i className="ti ti-x me-1"></i>Tümünü Kapat
                </button>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Kaydediliyor...</>
                  : <><i className="ti ti-device-floppy me-1"></i>Kaydet</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleDetail;
