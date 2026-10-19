import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { isTeacher, getMyUserId, isFounderOrOwner, getMyRole } from '../../utils/userScope';
import { getAvatarUrl, handleAvatarError } from '../../utils/media';

interface PermissionItem {
  id: number;
  name: string;
  display_name?: string;
  module_name: string;
  action?: string;
  description?: string;
}

interface ManagedClassroom {
  id: number;
  name: string;
  code?: string;
  grade_level?: string;
  capacity?: number;
}

interface TeachingAssignment {
  classroom_id: number;
  classroom_name: string;
  grade_level?: string;
  lesson_name: string;
}

interface UserStatistics {
  homework_count: number;
  attendance_count: number;
  meeting_count: number;
  announcement_count: number;
  tutoring_count: number;
  counseling_sessions_count?: number;
  counseling_students_count?: number;
}

interface RecentHomework {
  id: number;
  title: string;
  classroom?: { id: number; name: string };
  due_date?: string;
  created_at: string;
}

interface RecentMeeting {
  id: number;
  student?: { id: number; first_name: string; last_name: string };
  meeting_date?: string;
  status?: string;
  notes?: string;
  created_at: string;
}

interface RecentAnnouncement {
  id: number;
  title: string;
  type?: string;
  scheduled_at?: string;
  created_at: string;
}

interface SessionInfo {
  last_active_at?: string;
  token_device?: string;
  total_active_tokens?: number;
}

interface User {
  id: number;
  tc_no?: string;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  phone?: string;
  birth_date?: string;
  wedding_anniversary_date?: string;
  role_name?: string;
  role?: { id: number; name: string; display_name?: string; level?: number };
  teacher_type?: string;
  department?: string;
  subjects?: string[];
  campus_name?: string;
  campus_ids?: number[];
  education_level_ids?: number[];
  education_level_name?: string;
  branch_name?: string;
  campuses?: Array<{ id: number; name: string }>;
  education_levels?: Array<{ id: number; name: string }>;
  is_active: boolean;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  avatar?: string;
  permissions?: PermissionItem[];
  managed_classrooms?: ManagedClassroom[];
  teaching_assignments?: TeachingAssignment[];
  schedule_count?: number;
  statistics?: UserStatistics;
  recent_activities?: {
    homeworks?: RecentHomework[];
    meetings?: RecentMeeting[];
    announcements?: RecentAnnouncement[];
  };
  session_info?: SessionInfo;
}

const UserDetail = ({ userId }: { userId: number }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'activity' | 'permissions' | 'security'>('info');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/users/${userId}`);
      const raw = response.data?.data?.user ?? response.data?.user ?? response.data?.data ?? response.data;
      setUser(raw);
      setLoading(false);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenemedi:', error);
      setLoading(false);
    }
  };

  const openDeleteModal = () => setShowDeleteModal(true);
  const closeDeleteModal = () => setShowDeleteModal(false);
  const openResetPasswordModal = () => setShowResetPasswordModal(true);
  const closeResetPasswordModal = () => setShowResetPasswordModal(false);

  const handleResetPassword = async () => {
    try {
      await axiosClient.put(`/users/${userId}`, { password: '123456', password_confirmation: '123456' });
      showToast('success', 'Şifre başarıyla sıfırlandı. Yeni şifre: 123456');
      closeResetPasswordModal();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Şifre sıfırlama işlemi başarısız';
      showToast('error', msg);
    }
  };

  const handleSuspendUser = async () => {
    const action = user?.is_active ? 'askıya almak' : 'aktifleştirmek';
    if (!confirm(`Kullanıcıyı ${action} istediğinize emin misiniz?`)) return;
    try {
      await axiosClient.put(`/users/${userId}`, { is_active: !user?.is_active });
      showToast('success', `Kullanıcı başarıyla ${user?.is_active ? 'askıya alındı' : 'aktifleştirildi'}`);
      fetchUser();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'İşlem başarısız';
      showToast('error', msg);
    }
  };

  const confirmDelete = async () => {
    try {
      await axiosClient.delete(`/users/${userId}`);
      showToast('success', 'Kullanıcı başarıyla silindi!');
      closeDeleteModal();
      window.location.href = '/users';
    } catch (error) {
      console.error('Kullanıcı silinemedi:', error);
      showToast('error', 'Kullanıcı silinirken bir hata oluştu.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('success', `${label} panoya kopyalandı.`);
  };

  const viewerIsTeacher = isTeacher();
  const myUserId = getMyUserId();
  const isOwnProfile = myUserId !== null && myUserId === userId;
  const isFounder = isFounderOrOwner(getMyRole());

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary"></div>
        <div className="mt-2 text-muted">Kullanıcı detayları yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-5">
        <div className="alert alert-danger">Kullanıcı bulunamadı!</div>
      </div>
    );
  }

  // Öğretmen başka bir kullanıcının profiline erişmeye çalışırsa
  if (viewerIsTeacher && !isOwnProfile) {
    return (
      <div className="text-center p-5">
        <div className="alert alert-warning">
          <i className="ti ti-lock me-2"></i>
          Bu kullanıcı profiline erişim yetkiniz bulunmamaktadır.
        </div>
      </div>
    );
  }

  // Gruplanmış yetkiler
  const filteredPermissions = (user.permissions || []).filter((p) => {
    if (!permissionSearch) return true;
    const term = permissionSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.display_name && p.display_name.toLowerCase().includes(term)) ||
      (p.module_name && p.module_name.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  });

  const permissionsByModule: { [key: string]: PermissionItem[] } = {};
  filteredPermissions.forEach((p) => {
    const mod = p.module_name || 'Diğer';
    if (!permissionsByModule[mod]) {
      permissionsByModule[mod] = [];
    }
    permissionsByModule[mod].push(p);
  });

  const stats = user.statistics || {
    homework_count: 0,
    attendance_count: 0,
    meeting_count: 0,
    announcement_count: 0,
    tutoring_count: 0,
    counseling_sessions_count: 0,
    counseling_students_count: 0,
  };

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-title-head d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h4 className="page-main-title m-0 d-flex align-items-center gap-2">
            <span>Kullanıcı Detayı</span>
            {isFounder && (
              <span className="badge bg-soft-warning text-warning border border-warning fs-xs">
                <i className="ti ti-crown me-1"></i>
                Kurucu Görünümü
              </span>
            )}
          </h4>
          <small className="text-muted">
            {user.first_name} {user.last_name} • ID: #{user.id}
          </small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <a href="/users" className="btn btn-sm btn-outline-secondary">
            <i className="ti ti-arrow-left me-1"></i> Kullanıcılar Listesi
          </a>
          {!viewerIsTeacher && (
            <a href={`/users/${userId}/edit`} className="btn btn-sm btn-primary">
              <i className="ti ti-edit me-1"></i> Düzenle
            </a>
          )}
        </div>
      </div>

      <div className="row">
        {/* SOL KOLON - KULLANICI ÖZET KARTI */}
        <div className="col-lg-4 mb-3">
          {/* USER CARD */}
          <div className="card shadow-sm border-0">
            <div className="card-body text-center pt-4">
              <div
                className="avatar-xl bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm"
                style={{ width: '84px', height: '84px', fontSize: '28px', fontWeight: 600 }}
              >
                {user.avatar ? (
                  <img
                    src={getAvatarUrl(user.avatar, `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Kullanıcı')}
                    onError={(e) => handleAvatarError(e, `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Kullanıcı')}
                    alt="avatar"
                    className="rounded-circle w-100 h-100 object-fit-cover"
                  />
                ) : (
                  <span>
                    {(user.first_name || '').substring(0, 1)}
                    {(user.last_name || '').substring(0, 1)}
                  </span>
                )}
              </div>

              <h5 className="card-title mb-1 fw-bold text-dark">
                {user.first_name} {user.last_name}
              </h5>

              <div className="d-flex flex-wrap align-items-center justify-content-center gap-1 mb-2">
                <span className="badge bg-primary text-white px-2 py-1">
                  <i className="ti ti-shield me-1"></i>
                  {user.role?.display_name || user.role?.name || user.role_name || 'Tanımsız Rol'}
                </span>
                {user.teacher_type && (
                  <span className="badge bg-soft-info text-info px-2 py-1">
                    {user.teacher_type}
                  </span>
                )}
                {user.department && (
                  <span className="badge bg-soft-secondary text-secondary px-2 py-1">
                    {user.department}
                  </span>
                )}
              </div>

              <div className="d-flex justify-content-center gap-2 mb-3">
                <span className={`badge ${user.is_active ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'} px-2 py-1`}>
                  <i className={`ti ti-${user.is_active ? 'circle-check' : 'circle-x'} me-1`}></i>
                  {user.is_active ? 'Aktif Hesap' : 'Pasif / Askıda'}
                </span>
                {user.email_verified_at ? (
                  <span className="badge bg-soft-success text-success px-2 py-1" title={new Date(user.email_verified_at).toLocaleDateString('tr-TR')}>
                    <i className="ti ti-mail-check me-1"></i> E-posta Doğrulandı
                  </span>
                ) : (
                  <span className="badge bg-soft-warning text-warning px-2 py-1">
                    <i className="ti ti-mail-cancel me-1"></i> Doğrulanmamış
                  </span>
                )}
              </div>

              {/* Hızlı İletişim Bilgileri */}
              <div className="bg-light rounded p-3 text-start small">
                <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                  <span className="text-muted"><i className="ti ti-id me-1"></i> TC Kimlik No:</span>
                  <span className="fw-semibold font-monospace">
                    {user.tc_no ? (
                      <span
                        className="cursor-pointer text-primary"
                        onClick={() => copyToClipboard(user.tc_no!, 'TC Kimlik No')}
                        title="Tıklayarak Kopyala"
                      >
                        {user.tc_no} <i className="ti ti-copy ms-1"></i>
                      </span>
                    ) : (
                      <span className="text-muted">Belirtilmemiş</span>
                    )}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                  <span className="text-muted"><i className="ti ti-mail me-1"></i> E-posta:</span>
                  <span className="fw-semibold text-truncate ms-2" style={{ maxWidth: '180px' }} title={user.email}>
                    {user.email ? (
                      <a href={`mailto:${user.email}`} className="text-dark">
                        {user.email}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
                  <span className="text-muted"><i className="ti ti-phone me-1"></i> Telefon:</span>
                  <span className="fw-semibold">
                    {user.phone ? (
                      <a href={`tel:${user.phone}`} className="text-dark">
                        {user.phone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center py-1">
                  <span className="text-muted"><i className="ti ti-calendar me-1"></i> Kayıt Tarihi:</span>
                  <span className="fw-semibold">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Yönetici / Kurucu Aksiyon Butonları */}
            {!viewerIsTeacher && (
              <div className="card-footer bg-transparent border-top p-3">
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-outline-warning btn-sm"
                    onClick={openResetPasswordModal}
                  >
                    <i className="ti ti-key me-1"></i> Şifreyi Sıfırla (123456)
                  </button>
                  <button
                    className={`btn btn-sm ${user.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                    onClick={handleSuspendUser}
                  >
                    <i className={`ti ti-${user.is_active ? 'ban' : 'check'} me-1`}></i>
                    {user.is_active ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
                  </button>
                  <button
                    className="btn btn-ghost-danger btn-sm text-danger"
                    onClick={openDeleteModal}
                  >
                    <i className="ti ti-trash me-1"></i> Kullanıcıyı Sistemden Sil
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KURUMSAL KAPSAM KARTI */}
          <div className="card shadow-sm border-0 mt-3">
            <div className="card-header bg-transparent border-bottom">
              <h6 className="card-title mb-0 d-flex align-items-center">
                <i className="ti ti-building me-2 text-primary"></i>
                Kurumsal Kapsam & Yetki Alanı
              </h6>
            </div>
            <div className="card-body small">
              <div className="mb-3">
                <label className="text-muted d-block mb-1">Bağlı Kampüsler</label>
                {user.campuses && user.campuses.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {user.campuses.map((c) => (
                      <span key={c.id} className="badge bg-soft-primary text-primary px-2 py-1">
                        <i className="ti ti-building-community me-1"></i> {c.name}
                      </span>
                    ))}
                  </div>
                ) : user.campus_name ? (
                  <span className="badge bg-soft-primary text-primary px-2 py-1">{user.campus_name}</span>
                ) : (
                  <span className="text-muted">Tüm Kampüsler / Genel Kurum</span>
                )}
              </div>

              <div className="mb-3">
                <label className="text-muted d-block mb-1">Bağlı Kademeler</label>
                {user.education_levels && user.education_levels.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {user.education_levels.map((e) => (
                      <span key={e.id} className="badge bg-soft-info text-info px-2 py-1">
                        <i className="ti ti-school me-1"></i> {e.name}
                      </span>
                    ))}
                  </div>
                ) : user.education_level_name ? (
                  <span className="badge bg-soft-info text-info px-2 py-1">{user.education_level_name}</span>
                ) : (
                  <span className="text-muted">Tüm Kademeler / Genel Personel</span>
                )}
              </div>

              {user.subjects && user.subjects.length > 0 && (
                <div className="mb-3">
                  <label className="text-muted d-block mb-1">Branş / Ders Alanları</label>
                  <div className="d-flex flex-wrap gap-1">
                    {user.subjects.map((s, idx) => (
                      <span key={idx} className="badge bg-soft-success text-success px-2 py-1">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-top">
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Son Oturum:</span>
                  <span className="fw-semibold">
                    {user.session_info?.last_active_at
                      ? new Date(user.session_info.last_active_at).toLocaleString('tr-TR')
                      : user.last_login_at
                      ? new Date(user.last_login_at).toLocaleString('tr-TR')
                      : 'Kayıtlı giriş yok'}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Oturum Cihazı:</span>
                  <span className="fw-semibold text-truncate ms-2" style={{ maxWidth: '160px' }}>
                    {user.session_info?.token_device || 'Web Paneli'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ KOLON - DETAYLI SEKMELER */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            {/* TAB HEADER */}
            <div className="card-header bg-transparent border-bottom">
              <ul className="nav nav-tabs card-header-tabs gap-1">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                  >
                    <i className="ti ti-user me-1"></i>
                    Kişisel Bilgiler
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'academic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('academic')}
                  >
                    <i className="ti ti-school me-1"></i>
                    Görev & Sınıflar
                    {((user.managed_classrooms?.length || 0) + (user.teaching_assignments?.length || 0) > 0) && (
                      <span className="badge bg-primary text-white rounded-pill ms-1">
                        {(user.managed_classrooms?.length || 0) + (user.teaching_assignments?.length || 0)}
                      </span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                  >
                    <i className="ti ti-chart-bar me-1"></i>
                    Aktivite & İstatistik
                    {(stats.homework_count + stats.attendance_count + stats.meeting_count > 0) && (
                      <span className="badge bg-success text-white rounded-pill ms-1">
                        {stats.homework_count + stats.attendance_count + stats.meeting_count}
                      </span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'permissions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('permissions')}
                  >
                    <i className="ti ti-shield-lock me-1"></i>
                    Rol & Yetkiler
                    {user.permissions && user.permissions.length > 0 && (
                      <span className="badge bg-info text-white rounded-pill ms-1">
                        {user.permissions.length}
                      </span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                  >
                    <i className="ti ti-lock me-1"></i>
                    Güvenlik & Oturum
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body p-4">
              {/* TAB 1: KİŞİSEL BİLGİLER */}
              {activeTab === 'info' && (
                <div>
                  <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                    <i className="ti ti-id-badge-2 me-2 text-primary"></i>
                    Kimlik ve İletişim Bilgileri
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">TC Kimlik Numarası</small>
                        <div className="fw-bold fs-6 font-monospace mt-1">
                          {user.tc_no || 'Belirtilmemiş'}
                          {user.tc_no && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-primary p-0 ms-2"
                              onClick={() => copyToClipboard(user.tc_no!, 'TC Kimlik Numarası')}
                              title="Kopyala"
                            >
                              <i className="ti ti-copy"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Ad Soyad</small>
                        <div className="fw-bold fs-6 mt-1">
                          {user.first_name} {user.last_name}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">E-posta Adresi</small>
                        <div className="fw-bold fs-6 mt-1 d-flex align-items-center flex-wrap gap-2">
                          <span>{user.email || '—'}</span>
                          {user.email_verified_at && (
                            <span className="badge bg-soft-success text-success fs-xs">
                              <i className="ti ti-check me-1"></i> Doğrulanmış
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Telefon Numarası</small>
                        <div className="fw-bold fs-6 mt-1">
                          {user.phone ? (
                            <a href={`tel:${user.phone}`} className="text-dark">
                              {user.phone}
                            </a>
                          ) : (
                            <span className="text-muted">Belirtilmemiş</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {user.birth_date && (
                      <div className="col-md-6">
                        <div className="p-3 bg-light rounded">
                          <small className="text-muted d-block">Doğum Tarihi</small>
                          <div className="fw-bold fs-6 mt-1">
                            <i className="ti ti-cake me-1 text-danger"></i>
                            {new Date(user.birth_date).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </div>
                    )}
                    {user.wedding_anniversary_date && (
                      <div className="col-md-6">
                        <div className="p-3 bg-light rounded">
                          <small className="text-muted d-block">Evlilik Yıldönümü</small>
                          <div className="fw-bold fs-6 mt-1">
                            <i className="ti ti-heart me-1 text-danger"></i>
                            {new Date(user.wedding_anniversary_date).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Hesap Durumu</small>
                        <div className="fw-bold fs-6 mt-1">
                          <span className={`badge ${user.is_active ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                            {user.is_active ? 'Aktif - Giriş Yapabilir' : 'Pasif - Giriş Engellendi'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Sistem ID / Kayıt Tarihi</small>
                        <div className="fw-bold fs-6 mt-1">
                          #{user.id} • {new Date(user.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GÖREV & SINIFLAR */}
              {activeTab === 'academic' && (
                <div>
                  <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                    <i className="ti ti-chalkboard me-2 text-primary"></i>
                    Sınıf Rehber Öğretmenliği (Sorumlu Olduğu Sınıflar)
                  </h6>
                  {user.managed_classrooms && user.managed_classrooms.length > 0 ? (
                    <div className="row g-3 mb-4">
                      {user.managed_classrooms.map((cls) => (
                        <div key={cls.id} className="col-md-6">
                          <div className="card border h-100 shadow-none mb-0">
                            <div className="card-body p-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <h6 className="fw-bold mb-0 text-primary">
                                  <i className="ti ti-users-group me-1"></i> {cls.name}
                                </h6>
                                {cls.grade_level && (
                                  <span className="badge bg-soft-info text-info">
                                    {cls.grade_level}
                                  </span>
                                )}
                              </div>
                              <div className="d-flex justify-content-between text-muted small mt-2">
                                <span>Sınıf Kodu: {cls.code || '—'}</span>
                                {cls.capacity && <span>Kapasite: {cls.capacity} öğrenci</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-light border text-muted small mb-4">
                      <i className="ti ti-info-circle me-1"></i> Bu kullanıcı herhangi bir sınıfın sınıf rehber öğretmeni olarak atanmamış.
                    </div>
                  )}

                  <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                    <i className="ti ti-calendar-event me-2 text-primary"></i>
                    Ders Verdiği Sınıflar & Branş Dağılımı (Ders Programı)
                  </h6>
                  {user.teaching_assignments && user.teaching_assignments.length > 0 ? (
                    <div className="table-responsive border rounded mb-4">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Sınıf</th>
                            <th>Kademe / Seviye</th>
                            <th>Verdiği Ders</th>
                          </tr>
                        </thead>
                        <tbody>
                          {user.teaching_assignments.map((item, idx) => (
                            <tr key={idx}>
                              <td className="fw-semibold">
                                <i className="ti ti-school me-1 text-primary"></i>
                                {item.classroom_name}
                              </td>
                              <td>{item.grade_level || '—'}</td>
                              <td>
                                <span className="badge bg-soft-primary text-primary">
                                  {item.lesson_name}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-light border text-muted small mb-4">
                      <i className="ti ti-info-circle me-1"></i> Haftalık ders programında atanmış ders veya sınıf kaydı bulunamadı.
                    </div>
                  )}

                  {(stats.counseling_students_count || 0) > 0 && (
                    <>
                      <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                        <i className="ti ti-user-heart me-2 text-primary"></i>
                        Rehberlik & Psikolojik Danışmanlık Bilgileri
                      </h6>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="p-3 bg-light rounded">
                            <small className="text-muted d-block">Danışan Öğrenci Sayısı</small>
                            <div className="fw-bold fs-5 text-primary mt-1">
                              {stats.counseling_students_count} Öğrenci
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="p-3 bg-light rounded">
                            <small className="text-muted d-block">Yapılan Rehberlik Seansları</small>
                            <div className="fw-bold fs-5 text-info mt-1">
                              {stats.counseling_sessions_count || 0} Seans
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: AKTİVİTE & İSTATİSTİKLER */}
              {activeTab === 'activity' && (
                <div>
                  <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                    <i className="ti ti-chart-dots me-2 text-primary"></i>
                    Kullanıcı Sistem Aktivitesi & İş Yükü Özeti
                  </h6>

                  {/* KPI Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-4 col-sm-6">
                      <div className="card border shadow-none mb-0 bg-soft-primary bg-opacity-10 text-center p-3">
                        <div className="avatar-sm bg-primary text-white rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center">
                          <i className="ti ti-book fs-5"></i>
                        </div>
                        <h4 className="fw-bold mb-0 text-primary">{stats.homework_count}</h4>
                        <small className="text-muted">Verilen Ödevler</small>
                      </div>
                    </div>
                    <div className="col-md-4 col-sm-6">
                      <div className="card border shadow-none mb-0 bg-soft-success bg-opacity-10 text-center p-3">
                        <div className="avatar-sm bg-success text-white rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center">
                          <i className="ti ti-user-check fs-5"></i>
                        </div>
                        <h4 className="fw-bold mb-0 text-success">{stats.attendance_count}</h4>
                        <small className="text-muted">Alınan Yoklamalar</small>
                      </div>
                    </div>
                    <div className="col-md-4 col-sm-6">
                      <div className="card border shadow-none mb-0 bg-soft-warning bg-opacity-10 text-center p-3">
                        <div className="avatar-sm bg-warning text-white rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center">
                          <i className="ti ti-messages fs-5"></i>
                        </div>
                        <h4 className="fw-bold mb-0 text-warning">{stats.meeting_count}</h4>
                        <small className="text-muted">Veli/Öğrenci Görüşmesi</small>
                      </div>
                    </div>
                    <div className="col-md-4 col-sm-6">
                      <div className="card border shadow-none mb-0 bg-soft-info bg-opacity-10 text-center p-3">
                        <div className="avatar-sm bg-info text-white rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center">
                          <i className="ti ti-speakerphone fs-5"></i>
                        </div>
                        <h4 className="fw-bold mb-0 text-info">{stats.announcement_count}</h4>
                        <small className="text-muted">Yayınlanan Duyuru</small>
                      </div>
                    </div>
                    <div className="col-md-4 col-sm-6">
                      <div className="card border shadow-none mb-0 bg-soft-secondary bg-opacity-10 text-center p-3">
                        <div className="avatar-sm bg-secondary text-white rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center">
                          <i className="ti ti-bulb fs-5"></i>
                        </div>
                        <h4 className="fw-bold mb-0 text-secondary">{stats.tutoring_count}</h4>
                        <small className="text-muted">Birebir / Etüt Dersi</small>
                      </div>
                    </div>
                  </div>

                  {/* Son Verilen Ödevler Tablosu */}
                  {user.recent_activities?.homeworks && user.recent_activities.homeworks.length > 0 && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2 text-dark">
                        <i className="ti ti-book-2 me-1 text-primary"></i> Son Verilen Ödevler
                      </h6>
                      <div className="table-responsive border rounded">
                        <table className="table table-sm table-hover mb-0 align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Ödev Başlığı</th>
                              <th>Sınıf</th>
                              <th>Teslim Tarihi</th>
                              <th>Oluşturulma</th>
                            </tr>
                          </thead>
                          <tbody>
                            {user.recent_activities.homeworks.map((hw) => (
                              <tr key={hw.id}>
                                <td className="fw-semibold">{hw.title}</td>
                                <td>{hw.classroom?.name || '—'}</td>
                                <td>
                                  {hw.due_date ? new Date(hw.due_date).toLocaleDateString('tr-TR') : '—'}
                                </td>
                                <td className="text-muted small">
                                  {new Date(hw.created_at).toLocaleDateString('tr-TR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Son Görüşmeler Tablosu */}
                  {user.recent_activities?.meetings && user.recent_activities.meetings.length > 0 && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2 text-dark">
                        <i className="ti ti-message-2 me-1 text-warning"></i> Son Görüşme Kayıtları
                      </h6>
                      <div className="table-responsive border rounded">
                        <table className="table table-sm table-hover mb-0 align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Öğrenci</th>
                              <th>Görüşme Tarihi</th>
                              <th>Durum</th>
                              <th>Notlar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {user.recent_activities.meetings.map((m) => (
                              <tr key={m.id}>
                                <td className="fw-semibold">
                                  {m.student ? `${m.student.first_name} ${m.student.last_name}` : '—'}
                                </td>
                                <td>
                                  {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('tr-TR') : '—'}
                                </td>
                                <td>
                                  <span className="badge bg-soft-info text-info">
                                    {m.status || 'Tamamlandı'}
                                  </span>
                                </td>
                                <td className="small text-truncate" style={{ maxWidth: '250px' }} title={m.notes || ''}>
                                  {m.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Son Duyurular */}
                  {user.recent_activities?.announcements && user.recent_activities.announcements.length > 0 && (
                    <div>
                      <h6 className="fw-bold mb-2 text-dark">
                        <i className="ti ti-speakerphone me-1 text-info"></i> Son Yayınlanan Duyurular
                      </h6>
                      <div className="table-responsive border rounded">
                        <table className="table table-sm table-hover mb-0 align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Başlık</th>
                              <th>Tür</th>
                              <th>Yayın Tarihi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {user.recent_activities.announcements.map((a) => (
                              <tr key={a.id}>
                                <td className="fw-semibold">{a.title}</td>
                                <td>
                                  <span className="badge bg-soft-secondary text-secondary">
                                    {a.type || 'Genel'}
                                  </span>
                                </td>
                                <td className="text-muted small">
                                  {new Date(a.created_at).toLocaleDateString('tr-TR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ROL & YETKİLER */}
              {activeTab === 'permissions' && (
                <div>
                  <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                    <div>
                      <h6 className="fw-bold mb-0 text-dark">
                        <i className="ti ti-shield-check me-2 text-primary"></i>
                        Kullanıcı Rolü & Modül İzinleri
                      </h6>
                      <small className="text-muted">
                        Rol: <strong>{user.role?.display_name || user.role?.name || 'Belirtilmemiş'}</strong>
                      </small>
                    </div>
                    <div>
                      <div className="input-group input-group-sm" style={{ width: '220px' }}>
                        <span className="input-group-text bg-light border-end-0">
                          <i className="ti ti-search text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control bg-light border-start-0"
                          placeholder="Yetki ara..."
                          value={permissionSearch}
                          onChange={(e) => setPermissionSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {Object.keys(permissionsByModule).length > 0 ? (
                    <div className="row g-3">
                      {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                        <div key={moduleName} className="col-md-6">
                          <div className="card border h-100 shadow-none mb-0">
                            <div className="card-header bg-light py-2 px-3">
                              <h6 className="card-title mb-0 fs-sm fw-bold text-dark text-capitalize">
                                <i className="ti ti-folder me-1 text-primary"></i>
                                {moduleName} Modülü ({perms.length})
                              </h6>
                            </div>
                            <div className="card-body p-3">
                              <div className="d-flex flex-wrap gap-1">
                                {perms.map((p) => (
                                  <span
                                    key={p.id}
                                    className="badge bg-soft-primary text-primary px-2 py-1 fs-xs"
                                    title={p.description || p.name}
                                  >
                                    <i className="ti ti-check me-1"></i>
                                    {p.display_name || p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <i className="ti ti-info-circle me-2"></i>
                      {permissionSearch
                        ? 'Arama kriterinize uygun yetki bulunamadı.'
                        : 'Bu kullanıcının rolüne atanmış özel yetki bulunmamaktadır veya genel yetkiler geçerlidir.'}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: GÜVENLİK & OTURUM */}
              {activeTab === 'security' && (
                <div>
                  <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                    <i className="ti ti-lock-check me-2 text-primary"></i>
                    Güvenlik, Oturum & Cihaz Bilgileri
                  </h6>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Son Aktif Olma / Giriş</small>
                        <div className="fw-bold fs-6 mt-1">
                          {user.session_info?.last_active_at
                            ? new Date(user.session_info.last_active_at).toLocaleString('tr-TR')
                            : user.last_login_at
                            ? new Date(user.last_login_at).toLocaleString('tr-TR')
                            : 'Kayıtlı giriş yok'}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Son Oturum Cihazı</small>
                        <div className="fw-bold fs-6 mt-1">
                          <i className="ti ti-device-laptop me-1 text-primary"></i>
                          {user.session_info?.token_device || 'Web / Mobil'}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Aktif Oturum Sayısı</small>
                        <div className="fw-bold fs-6 mt-1">
                          <span className="badge bg-soft-info text-info">
                            {user.session_info?.total_active_tokens || 1} Açık Oturum
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">E-posta Doğrulama Tarihi</small>
                        <div className="fw-bold fs-6 mt-1">
                          {user.email_verified_at ? (
                            <span className="text-success">
                              <i className="ti ti-check me-1"></i>
                              {new Date(user.email_verified_at).toLocaleDateString('tr-TR')}
                            </span>
                          ) : (
                            <span className="text-warning">
                              <i className="ti ti-alert-circle me-1"></i> Doğrulanmamış
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Kayıt Tarihi</small>
                        <div className="fw-bold fs-6 mt-1">
                          {new Date(user.created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <small className="text-muted d-block">Son Bilgi Güncelleme</small>
                        <div className="fw-bold fs-6 mt-1">
                          {new Date(user.updated_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!viewerIsTeacher && (
                    <div className="border-top pt-3">
                      <h6 className="fw-bold mb-3 text-dark">Hızlı Güvenlik İşlemleri</h6>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-warning" onClick={openResetPasswordModal}>
                          <i className="ti ti-key me-1"></i>
                          Kullanıcı Şifresini Sıfırla (123456)
                        </button>
                        <button
                          className={`btn ${user.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={handleSuspendUser}
                        >
                          <i className={`ti ti-${user.is_active ? 'ban' : 'check'} me-1`}></i>
                          {user.is_active ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Şifre Sıfırlama Modal */}
      {showResetPasswordModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal')) closeResetPasswordModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Şifre Sıfırla</h5>
                <button type="button" className="btn-close" onClick={closeResetPasswordModal} aria-label="Kapat" />
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <div className="avatar-lg bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3">
                    <i className="ti ti-key fs-1 text-warning" />
                  </div>
                  <p className="mb-0">
                    <strong>"{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email}"</strong> kullanıcısının şifresini sıfırlamak istediğinize emin misiniz?
                  </p>
                  <div className="alert alert-warning mt-3 mb-0">
                    <i className="ti ti-alert-triangle me-2"></i>
                    Yeni şifre otomatik olarak <strong>"123456"</strong> olarak ayarlanacaktır.
                  </div>
                </div>
              </div>
              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-secondary" onClick={closeResetPasswordModal}>
                  İptal
                </button>
                <button type="button" className="btn btn-warning" onClick={handleResetPassword}>
                  <i className="ti ti-check me-1" />
                  Şifreyi Sıfırla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kullanıcı Silme Modal */}
      {showDeleteModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal')) closeDeleteModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Kullanıcı Sil</h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal} aria-label="Kapat" />
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <div className="avatar-lg bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3">
                    <i className="ti ti-user-off fs-1 text-danger" />
                  </div>
                  <p className="mb-0">
                    <strong>"{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}"</strong> kullanıcısını silmek istediğinize emin misiniz?
                  </p>
                  <p className="text-muted small mt-2 mb-0">Bu işlem geri alınamaz.</p>
                </div>
              </div>
              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-secondary" onClick={closeDeleteModal}>
                  İptal
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                  <i className="ti ti-trash me-1" />
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDetail;
