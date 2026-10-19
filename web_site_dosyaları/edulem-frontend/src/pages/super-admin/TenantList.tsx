import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Tenant {
  id: number;
  domain: string;
  name: string;
  is_active: boolean;
  phone?: string;
  email?: string;
  authorized_person?: string;
  authorized_phone?: string;
  contract_amount?: number;
  subscription_expires_at?: string;
  created_at: string;
  users_count: number;
  students_count: number;
  current_subscription?: {
    id: number;
    plan_name: string;
    is_active: boolean;
  };
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const TenantList = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Kullanıcı yetkileri
  const currentUserRaw = localStorage.getItem('USER_DATA');
  const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};
  const isSuperAdmin = currentUser.is_superadmin || currentUser.saas_role === 'super_admin';
  const canImpersonate = isSuperAdmin || currentUser.saas_role === 'technical_support';

  useEffect(() => {
    fetchTenants();
  }, [currentPage]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/super-admin/tenants', {
        params: { page: currentPage, per_page: 20 }
      });
      
      const data = response.data.data;
      setTenants(data.tenants || []);
      setPagination(data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Kurumlar yüklenemedi:', error);
      showToast('error', 'Kurumlar yüklenemedi');
      setTenants([]);
      setLoading(false);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    const ok = await confirmDialog({
      title: 'Okula Canlı Giriş (Sızma)',
      text: `${tenant.name} okuluna canlı destek yetkilisi olarak bağlanmak üzeresiniz. Devam edilsin mi?`,
      confirmText: 'Sisteme Bağlan',
      cancelText: 'Vazgeç',
      icon: 'question',
    });
    if (!ok) return;

    try {
      showToast('info', 'Canlı destek oturumu hazırlanıyor...');
      const res = await axiosClient.post(`/super-admin/impersonate/${tenant.id}`);
      const data = res.data.data;

      // Mevcut SaaS yöneticisi oturumunu yedekle
      const originalToken = localStorage.getItem('ACCESS_TOKEN');
      const originalUser = localStorage.getItem('USER_DATA');

      const impData = {
        is_impersonating: true,
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        original_token: originalToken,
        original_user: originalUser ? JSON.parse(originalUser) : null,
        impersonated_at: new Date().toISOString(),
      };

      localStorage.setItem('IMPERSONATION_DATA', JSON.stringify(impData));

      // Okul oturumuna geç
      localStorage.setItem('ACCESS_TOKEN', data.token);
      localStorage.setItem('USER_DATA', JSON.stringify(data.user));
      localStorage.setItem('USER_ROLE', data.user.role || 'Admin');

      showToast('success', `${tenant.name} sistemine giriş yapıldı!`);
      window.location.href = '/';
    } catch (error: any) {
      console.error('Okula giriş başarısız:', error);
      showToast('error', error.response?.data?.message || 'Okul sistemine bağlanılamadı.');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      title: 'KURUMU SİL',
      text: 'Bu kurumu ve tüm verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!',
      confirmText: 'Evet, Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;
    
    try {
      await axiosClient.delete(`/super-admin/tenants/${id}`);
      showToast('success', 'Kurum başarıyla silindi');
      fetchTenants();
    } catch (error: any) {
      console.error("Kurum silinemedi:", error);
      const errorMessage = error.response?.data?.message || 'Kurum silinirken bir hata oluştu.';
      showToast('error', errorMessage);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await axiosClient.patch(`/super-admin/tenants/${id}/toggle-status`);
      showToast('success', 'Kurum durumu güncellendi');
      fetchTenants();
    } catch (error: any) {
      console.error("Durum güncellenemedi:", error);
      const errorMessage = error.response?.data?.message || 'Durum güncellenirken bir hata oluştu.';
      showToast('error', errorMessage);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredTenants = searchTerm 
    ? tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.authorized_person?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tenants;

  if (loading) return (
    <div className="text-center p-5">
      <div className="spinner-border text-primary"></div>
      <div className="mt-2">Kurumlar yükleniyor...</div>
    </div>
  );

  return (
    <div className="py-2">
      {/* PAGE HEADER */}
      <div className="page-title-head d-flex align-items-center mb-3">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Kurum Yönetimi & Okul CRM</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><Link to="/super-admin">EduLem SaaS</Link></li>
            <li className="breadcrumb-item active">Kurumlar</li>
          </ol>
        </div>
      </div>

      {/* SEARCH AND ACTIONS */}
      <div className="row mb-3">
        <div className="col-lg-12">
          <div className="card border p-3 shadow-sm">
            <div className="row gap-3 align-items-center">
              <div className="col-lg-5">
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="ti ti-search"></i></span>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Kurum adı, domain veya yetkili ara..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="col text-end">
                <Link to="/super-admin/tenants/create" className="btn btn-primary">
                  <i className="ti ti-plus me-1"></i> Yeni Kurum Ekle
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TENANTS TABLE */}
      <div className="row">
        <div className="col-lg-12">
          <div className="card border shadow-sm">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Kurum (Okul)</th>
                      <th>Yetkili / İletişim (CRM)</th>
                      <th>Domain</th>
                      <th>Durum</th>
                      <th>Sözleşme Tutarı</th>
                      <th>Kullanıcı / Öğrenci</th>
                      <th>Kayıt Tarihi</th>
                      <th className="text-end">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-5">
                          <div className="text-muted">
                            <i className="ti ti-building fs-1 d-block mb-2"></i>
                            {searchTerm ? 'Arama kriterlerinize uygun kurum bulunamadı.' : 'Henüz kurum kaydı bulunmamaktadır.'}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <tr key={tenant.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-xs bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold">
                                {tenant.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <Link 
                                  to={`/super-admin/tenants/${tenant.id}`}
                                  className="fw-bold text-dark text-decoration-none"
                                >
                                  {tenant.name}
                                </Link>
                                <div className="small text-muted font-monospace">
                                  ID: {tenant.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {tenant.authorized_person ? (
                              <div>
                                <div className="fw-semibold text-dark">{tenant.authorized_person}</div>
                                {tenant.authorized_phone && (
                                  <div className="small text-muted">
                                    <i className="ti ti-phone me-1"></i>{tenant.authorized_phone}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small fst-italic">Yetkili girilmedi</span>
                            )}
                          </td>
                          <td>
                            <span className="font-monospace text-primary">
                              {tenant.domain}.edulem.com
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${tenant.is_active ? 'bg-success' : 'bg-danger'}`}>
                              {tenant.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td>
                            {tenant.contract_amount ? (
                              <strong className="text-dark">
                                {Number(tenant.contract_amount).toLocaleString('tr-TR')} ₺
                              </strong>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td>
                            <div className="small">
                              <div><i className="ti ti-users me-1"></i>{tenant.users_count} Personel</div>
                              <div><i className="ti ti-school me-1"></i>{tenant.students_count} Öğrenci</div>
                            </div>
                          </td>
                          <td>
                            <div className="small text-muted">
                              {new Date(tenant.created_at).toLocaleDateString('tr-TR')}
                            </div>
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-1 justify-content-end">
                              {/* CANLI DESTEK / SIZMA GİRİŞİ */}
                              {canImpersonate && (
                                <button 
                                  type="button"
                                  onClick={() => handleImpersonate(tenant)}
                                  className="btn btn-sm btn-outline-danger"
                                  title="Okula Canlı Giriş Yap (Sızma)"
                                >
                                  <i className="ti ti-shield-lock"></i>
                                </button>
                              )}

                              <button 
                                type="button"
                                onClick={() => handleToggleStatus(tenant.id)}
                                className={`btn btn-sm ${tenant.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                title={tenant.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                              >
                                <i className={`ti ti-${tenant.is_active ? 'player-pause' : 'player-play'}`}></i>
                              </button>

                              <Link 
                                to={`/super-admin/tenants/${tenant.id}`}
                                className="btn btn-sm btn-outline-primary"
                                title="Kurum & Lisans Detayı"
                              >
                                <i className="ti ti-eye"></i>
                              </Link>

                              <Link 
                                to={`/super-admin/tenants/${tenant.id}/edit`}
                                className="btn btn-sm btn-outline-secondary"
                                title="Düzenle"
                              >
                                <i className="ti ti-edit"></i>
                              </Link>

                              {isSuperAdmin && (
                                <button 
                                  type="button"
                                  onClick={() => handleDelete(tenant.id)}
                                  className="btn btn-sm btn-outline-danger"
                                  title="Sil"
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAGINATION */}
      {pagination && pagination.last_page > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Toplam {pagination.total} kurum (Sayfa {pagination.current_page}/{pagination.last_page})
          </div>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                >
                  Önceki
                </button>
              </li>
              {[...Array(pagination.last_page)].map((_, i) => (
                <li key={i} className={`page-item ${pagination.current_page === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(i + 1)}>
                    {i + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                >
                  Sonraki
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};

export default TenantList;
