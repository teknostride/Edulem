import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface TenantDetailData {
  id: number;
  name: string;
  domain: string;
  subdomain?: string;
  is_active: boolean;
  phone?: string;
  email?: string;
  authorized_person?: string;
  authorized_phone?: string;
  authorized_email?: string;
  address?: string;
  city?: string;
  district?: string;
  tax_office?: string;
  tax_number?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_amount?: number;
  notes?: string;
  subscription_expires_at?: string;
  users_count: number;
  students_count: number;
  created_at: string;
  users?: any[];
  current_subscription?: any;
}

interface ModuleLicenseItem {
  id: number;
  name: string;
  key: string;
  icon?: string;
  badge_color?: string;
  description?: string;
  monthly_price: number;
  is_licensed: boolean;
  license_id?: number | null;
  custom_price: number;
  starts_at?: string;
  expires_at?: string;
}

interface TenantPaymentItem {
  id: number;
  tenant_id: number;
  title: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  payment_method?: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  notes?: string;
}

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'modules' | 'finance' | 'crm'>('modules');

  // Modüller & Lisanslar
  const [modules, setModules] = useState<ModuleLicenseItem[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [updatingModuleKey, setUpdatingModuleKey] = useState<string | null>(null);

  // Ödemeler & Taksitler
  const [payments, setPayments] = useState<TenantPaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Yeni Ödeme / Taksit Modalı
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    title: '',
    amount: '',
    due_date: new Date().toISOString().substring(0, 10),
    payment_method: 'bank_transfer',
    status: 'pending',
    notes: '',
  });

  // Kullanıcı Yetkisi
  const currentUserRaw = localStorage.getItem('USER_DATA');
  const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};
  const isSuperAdmin = currentUser.is_superadmin || currentUser.saas_role === 'super_admin';
  const canImpersonate = isSuperAdmin || currentUser.saas_role === 'technical_support';

  useEffect(() => {
    fetchTenantDetails();
    fetchLicenses();
    fetchPayments();
  }, [id]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/super-admin/tenants/${id}`);
      setTenant(res.data.data.tenant);
    } catch (error) {
      console.error('Kurum detayı yüklenemedi:', error);
      showToast('error', 'Kurum detayları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenses = async () => {
    try {
      setModulesLoading(true);
      const res = await axiosClient.get(`/super-admin/tenants/${id}/licenses`);
      const raw = res.data?.data?.modules || res.data?.data || [];
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setModules(list);
    } catch (error) {
      console.error('Modül lisansları yüklenemedi:', error);
      setModules([]);
    } finally {
      setModulesLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const res = await axiosClient.get(`/super-admin/tenants/${id}/payments`);
      const raw = res.data?.data?.payments || res.data?.data?.items || res.data?.data || [];
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setPayments(list);
    } catch (error) {
      console.error('Ödemeler yüklenemedi:', error);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Modül Aktif / Pasif Toggle
  const handleToggleModule = async (moduleKey: string, currentLicensed: boolean) => {
    try {
      setUpdatingModuleKey(moduleKey);
      const res = await axiosClient.post(`/super-admin/tenants/${id}/licenses/toggle`, {
        module_key: moduleKey,
        is_active: !currentLicensed,
      });
      showToast('success', res.data.message || 'Modül lisans durumu güncellendi.');
      fetchLicenses();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setUpdatingModuleKey(null);
    }
  };

  // Modül Özel Fiyat Güncelleme
  const handleUpdatePrice = async (licenseId: number | null | undefined, newPrice: number) => {
    if (!licenseId) return;
    try {
      await axiosClient.put(`/super-admin/tenants/${id}/licenses/${licenseId}/price`, {
        custom_price: newPrice,
      });
      showToast('success', 'Özel fiyat güncellendi.');
      fetchLicenses();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Fiyat güncellenemedi.');
    }
  };

  // Canlı Destek / Okula Sızma Girişi
  const handleImpersonate = async () => {
    const ok = await confirmDialog({
      title: 'Okula Canlı Destek Girişi',
      text: `${tenant?.name} sistemine yetkili canlı destek oturumu açılacaktır. Devam etmek istiyor musunuz?`,
      confirmText: 'Sisteme Bağlan',
      cancelText: 'Vazgeç',
      icon: 'question',
    });
    if (!ok) return;

    try {
      showToast('info', 'Canlı destek oturumu hazırlanıyor...');
      const res = await axiosClient.post(`/super-admin/impersonate/${id}`);
      const data = res.data.data;

      // Mevcut SaaS yöneticisi token'ını ve oturumunu yedekle
      const originalToken = localStorage.getItem('ACCESS_TOKEN');
      const originalUser = localStorage.getItem('USER_DATA');

      const impData = {
        is_impersonating: true,
        tenant_id: tenant?.id,
        tenant_name: tenant?.name,
        original_token: originalToken,
        original_user: originalUser ? JSON.parse(originalUser) : null,
        impersonated_at: new Date().toISOString(),
      };

      localStorage.setItem('IMPERSONATION_DATA', JSON.stringify(impData));

      // Okul yetkilisinin oturumuna geçiş yap
      localStorage.setItem('ACCESS_TOKEN', data.token);
      localStorage.setItem('USER_DATA', JSON.stringify(data.user));
      localStorage.setItem('USER_ROLE', data.user.role || 'Admin');

      showToast('success', `${tenant?.name} oturumuna bağlanıldı!`);

      // Okul yönetim anasayfasına yönlendir
      window.location.href = '/';
    } catch (error: any) {
      console.error('Okula giriş başarısız:', error);
      showToast('error', error.response?.data?.message || 'Okul sistemine bağlanılamadı.');
    }
  };

  // Yeni Taksit / Ödeme Ekleme
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosClient.post(`/super-admin/tenants/${id}/payments`, {
        title: newPayment.title,
        amount: Number(newPayment.amount),
        due_date: newPayment.due_date,
        payment_method: newPayment.payment_method,
        status: newPayment.status,
        notes: newPayment.notes,
      });
      showToast('success', 'Ödeme kaydı oluşturuldu.');
      setShowPaymentModal(false);
      setNewPayment({
        title: '',
        amount: '',
        due_date: new Date().toISOString().substring(0, 10),
        payment_method: 'bank_transfer',
        status: 'pending',
        notes: '',
      });
      fetchPayments();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Ödeme eklenemedi.');
    }
  };

  // Ödemeyi 'Ödendi' Yapma
  const handleMarkPaid = async (paymentId: number) => {
    try {
      await axiosClient.post(`/super-admin/payments/${paymentId}/mark-paid`);
      showToast('success', 'Ödeme tahsil edildi olarak işaretlendi.');
      fetchPayments();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız.');
    }
  };

  // Ödeme Silme
  const handleDeletePayment = async (paymentId: number) => {
    const ok = await confirmDialog({
      text: 'Bu ödeme kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/super-admin/payments/${paymentId}`);
      showToast('success', 'Ödeme kaydı silindi.');
      fetchPayments();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Silinemedi.');
    }
  };

  // Kurumu Sil (Sadece Patron)
  const handleDeleteTenant = async () => {
    const ok = await confirmDialog({
      title: 'KURUMU KALICI OLARAK SİL',
      text: `${tenant?.name} kurumu ve bağlı tüm kullanıcı, öğrenci, lisans verileri kalıcı olarak silinecektir! Bu işlem kesinlikle geri alınamaz!`,
      confirmText: 'Evet, Tamamen Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/super-admin/tenants/${id}`);
      showToast('success', 'Kurum başarıyla silindi.');
      navigate('/super-admin/tenants');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Kurum silinemedi.');
    }
  };

  if (loading) return (
    <div className="text-center p-5">
      <div className="spinner-border text-primary"></div>
      <div className="mt-2">Kurum detayları yükleniyor...</div>
    </div>
  );

  if (!tenant) return (
    <div className="alert alert-danger m-4">Kurum bulunamadı.</div>
  );

  // Finans hesaplamaları
  const paymentList = Array.isArray(payments) ? payments : [];
  const moduleList = Array.isArray(modules) ? modules : [];
  const totalPaid = paymentList.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = paymentList.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="py-2">
      {/* BAŞLIK & İŞLEM BUTONLARI */}
      <div className="page-title-head d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="page-main-title m-0">{tenant.name}</h4>
            <span className={`badge ${tenant.is_active ? 'bg-success' : 'bg-danger'} fs-12`}>
              {tenant.is_active ? 'Aktif Kurum' : 'Pasif Kurum'}
            </span>
          </div>
          <div className="text-muted small mt-1">
            <span className="me-3"><i className="ti ti-link me-1"></i>{tenant.domain}.edulem.com</span>
            <span><i className="ti ti-calendar me-1"></i>Kayıt: {new Date(tenant.created_at).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {/* CANLI DESTEK / OKULA SIZMA */}
          {canImpersonate && (
            <button 
              type="button" 
              className="btn btn-danger fw-bold shadow-sm"
              onClick={handleImpersonate}
              title="Okula yönetici olarak giriş yapın"
            >
              <i className="ti ti-shield-lock me-1"></i>
              Okula Canlı Giriş Yap (Sızma)
            </button>
          )}

          <Link to={`/super-admin/tenants/${id}/edit`} className="btn btn-outline-warning">
            <i className="ti ti-edit me-1"></i> Düzenle
          </Link>

          {isSuperAdmin && (
            <button 
              type="button" 
              className="btn btn-outline-danger"
              onClick={handleDeleteTenant}
              title="Sadece Patron silebilir"
            >
              <i className="ti ti-trash me-1"></i> Kurumu Sil
            </button>
          )}
        </div>
      </div>

      {/* ÖZET STATS KARTLARI */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">SÖZLEŞME TUTARI</div>
                  <h3 className="mb-0 text-white mt-1">
                    {tenant.contract_amount ? `${Number(tenant.contract_amount).toLocaleString('tr-TR')} ₺` : 'Belirtilmedi'}
                  </h3>
                </div>
                <div className="avatar-sm bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center">
                  <i className="ti ti-file-certificate fs-24"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">TAHSİL EDİLEN</div>
                  <h3 className="mb-0 text-white mt-1">{totalPaid.toLocaleString('tr-TR')} ₺</h3>
                </div>
                <div className="avatar-sm bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center">
                  <i className="ti ti-check fs-24"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">KALAN / BEKLEYEN</div>
                  <h3 className="mb-0 text-white mt-1">{totalPending.toLocaleString('tr-TR')} ₺</h3>
                </div>
                <div className="avatar-sm bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center">
                  <i className="ti ti-clock fs-24"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">KULLANICI & ÖĞRENCİ</div>
                  <h4 className="mb-0 text-white mt-1">
                    {tenant.users_count || 0} Personel / {tenant.students_count || 0} Öğrenci
                  </h4>
                </div>
                <div className="avatar-sm bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center">
                  <i className="ti ti-users fs-24"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAB MENÜSÜ */}
      <div className="card border shadow-sm">
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs nav-bordered">
            <li className="nav-item">
              <button 
                type="button" 
                className={`nav-link py-3 px-4 fw-bold ${activeTab === 'modules' ? 'active' : ''}`}
                onClick={() => setActiveTab('modules')}
              >
                <i className="ti ti-apps me-2"></i>
                Modül Lisansları (*lem Ürünleri)
              </button>
            </li>
            <li className="nav-item">
              <button 
                type="button" 
                className={`nav-link py-3 px-4 fw-bold ${activeTab === 'finance' ? 'active' : ''}`}
                onClick={() => setActiveTab('finance')}
              >
                <i className="ti ti-cash me-2"></i>
                Ödemeler & Taksit Takibi ({paymentList.length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                type="button" 
                className={`nav-link py-3 px-4 fw-bold ${activeTab === 'crm' ? 'active' : ''}`}
                onClick={() => setActiveTab('crm')}
              >
                <i className="ti ti-address-book me-2"></i>
                Okul CRM & Fatura Bilgileri
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {/* TAB 1: MODÜL LİSANSLARI (*LEM SİSTEMLERİ) */}
          {activeTab === 'modules' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1 fw-bold">EduLem Ürün & Modül Yönetimi</h5>
                  <p className="text-muted small mb-0">
                    Okulun satın aldığı *lem modüllerini (QuizLem, KeyLem, ClassLem vb.) tek tıkla açıp kapatabilir, kuruma özel fiyat tanımlayabilirsiniz.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={fetchLicenses}
                  disabled={modulesLoading}
                >
                  <i className="ti ti-refresh me-1"></i> Yenile
                </button>
              </div>

              {modulesLoading ? (
                <div className="text-center p-4">
                  <div className="spinner-border spinner-border-sm text-primary"></div>
                </div>
              ) : (
                <div className="row g-3">
                  {moduleList.map((mod) => (
                    <div className="col-lg-6" key={mod.key}>
                      <div className={`card border h-100 ${mod.is_licensed ? 'border-primary shadow-sm bg-soft-light' : 'border-light'}`}>
                        <div className="card-body">
                          <div className="d-flex align-items-start justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                              <div className="avatar-md bg-soft-primary text-primary rounded d-flex align-items-center justify-content-center fs-24">
                                <i className={`ti ${mod.icon || 'ti-box'}`}></i>
                              </div>
                              <div>
                                <h5 className="mb-1 fw-bold">
                                  {mod.name}
                                  <span className="badge bg-secondary ms-2 font-monospace fs-10">{mod.key}</span>
                                </h5>
                                <p className="text-muted small mb-2">{mod.description || 'EduLem ekosistem modülü.'}</p>
                                <div className="text-muted small">
                                  Standart Fiyat: <strong className="text-dark">{mod.monthly_price} ₺/ay</strong>
                                </div>
                              </div>
                            </div>

                            {/* AÇ / KAPA SWITCH */}
                            <div className="form-check form-switch fs-20">
                              <input 
                                type="checkbox" 
                                className="form-check-input"
                                checked={mod.is_licensed}
                                disabled={updatingModuleKey === mod.key}
                                onChange={() => handleToggleModule(mod.key, mod.is_licensed)}
                              />
                            </div>
                          </div>

                          <hr className="my-3 opacity-25" />

                          {/* ÖZEL ANLAŞILAN FİYAT & LİSANS DETAYI */}
                          <div className="d-flex align-items-center justify-content-between">
                            <span className={`badge ${mod.is_licensed ? 'bg-success' : 'bg-secondary'}`}>
                              {mod.is_licensed ? '✓ Okul İçin Aktif' : '✗ Lisanssız / Kapalı'}
                            </span>

                            {mod.is_licensed && (
                              <div className="d-flex align-items-center gap-2">
                                <span className="small text-muted">Özel Fiyat:</span>
                                <input 
                                  type="number" 
                                  className="form-control form-control-sm text-end"
                                  style={{ width: '100px' }}
                                  defaultValue={mod.custom_price}
                                  onBlur={(e) => handleUpdatePrice(mod.license_id, Number(e.target.value))}
                                />
                                <span className="small text-muted">₺</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ÖDEMELER & FİNANS TAKİBİ */}
          {activeTab === 'finance' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h5 className="mb-1 fw-bold">Kurum Ödeme & Taksit Planı</h5>
                  <p className="text-muted small mb-0">
                    Okuldan tahsil edilecek sözleşme taksitleri, vadesi geçen ve ödenen ücretler.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <i className="ti ti-plus me-1"></i> Yeni Taksit / Ödeme Ekle
                </button>
              </div>

              {paymentsLoading ? (
                <div className="text-center p-4">
                  <div className="spinner-border spinner-border-sm text-primary"></div>
                </div>
              ) : paymentList.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="ti ti-cash fs-1 mb-2 d-block"></i>
                  Henüz bu kurum için tanımlanmış bir taksit veya ödeme kaydı bulunmuyor.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle table-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>Taksit / Açıklama</th>
                        <th>Vade Tarihi</th>
                        <th>Tutar</th>
                        <th>Ödeme Durumu</th>
                        <th>Ödendiği Tarih</th>
                        <th>Yöntem</th>
                        <th className="text-end">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentList.map((p) => {
                        const isOverdue = p.status === 'overdue' || (p.status === 'pending' && new Date(p.due_date) < new Date());
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="fw-bold">{p.title}</div>
                              {p.notes && <div className="text-muted small">{p.notes}</div>}
                            </td>
                            <td>
                              <span className={`badge ${isOverdue ? 'bg-danger' : 'bg-light text-dark'}`}>
                                {p.due_date}
                              </span>
                            </td>
                            <td className="fw-bold">{Number(p.amount).toLocaleString('tr-TR')} ₺</td>
                            <td>
                              {p.status === 'paid' ? (
                                <span className="badge bg-success">✓ Ödendi</span>
                              ) : isOverdue ? (
                                <span className="badge bg-danger">⚠ Gecikti</span>
                              ) : (
                                <span className="badge bg-warning">Bekliyor</span>
                              )}
                            </td>
                            <td>{p.paid_date || '-'}</td>
                            <td>
                              <span className="small text-muted font-monospace">{p.payment_method || '-'}</span>
                            </td>
                            <td className="text-end">
                              {p.status !== 'paid' && (
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-outline-success me-2"
                                  onClick={() => handleMarkPaid(p.id)}
                                  title="Tahsil Edildi İşaretle"
                                >
                                  <i className="ti ti-check me-1"></i> Tahsil Et
                                </button>
                              )}
                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeletePayment(p.id)}
                                title="Sil"
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OKUL CRM & DETAYLAR */}
          {activeTab === 'crm' && (
            <div className="row g-4">
              <div className="col-md-6">
                <div className="card border">
                  <div className="card-header bg-light fw-bold">
                    <i className="ti ti-user-check me-2 text-primary"></i> Yetkili / Kurucu İletişim Bilgileri
                  </div>
                  <div className="card-body">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '160px' }}>Yetkili Kişi:</td>
                          <td className="fw-bold">{tenant.authorized_person || '-'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Yetkili Telefon:</td>
                          <td>
                            {tenant.authorized_phone ? (
                              <a href={`tel:${tenant.authorized_phone}`} className="text-primary fw-bold">
                                {tenant.authorized_phone}
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Yetkili E-posta:</td>
                          <td>
                            {tenant.authorized_email ? (
                              <a href={`mailto:${tenant.authorized_email}`}>
                                {tenant.authorized_email}
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Okul Santral / Tel:</td>
                          <td>{tenant.phone || '-'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Okul Resmi E-posta:</td>
                          <td>{tenant.email || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border">
                  <div className="card-header bg-light fw-bold">
                    <i className="ti ti-file-invoice me-2 text-success"></i> Fatura & Adres Bilgileri
                  </div>
                  <div className="card-body">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '160px' }}>İl / İlçe:</td>
                          <td className="fw-bold">{[tenant.district, tenant.city].filter(Boolean).join(' / ') || '-'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Açık Adres:</td>
                          <td>{tenant.address || '-'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Vergi Dairesi:</td>
                          <td>{tenant.tax_office || '-'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Vergi Numarası:</td>
                          <td className="font-monospace fw-bold">{tenant.tax_number || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card border">
                  <div className="card-header bg-light fw-bold">
                    <i className="ti ti-notes me-2 text-warning"></i> Özel Notlar & Sözleşme Detayları
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <span className="text-muted small d-block">Sözleşme Başlangıç:</span>
                        <strong>{tenant.contract_start_date || '-'}</strong>
                      </div>
                      <div className="col-md-4">
                        <span className="text-muted small d-block">Sözleşme Bitiş:</span>
                        <strong>{tenant.contract_end_date || '-'}</strong>
                      </div>
                      <div className="col-md-4">
                        <span className="text-muted small d-block">Abonelik / Erişim Bitiş:</span>
                        <strong>{tenant.subscription_expires_at || '-'}</strong>
                      </div>
                      <div className="col-12 mt-3">
                        <span className="text-muted small d-block mb-1">CRM Notları:</span>
                        <div className="p-3 bg-light rounded text-dark">
                          {tenant.notes ? (
                            <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{tenant.notes}</p>
                          ) : (
                            <span className="text-muted fst-italic">Henüz not eklenmedi.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* YENİ ÖDEME / TAKSİT MODALI */}
      {showPaymentModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Yeni Ödeme / Taksit Ekle</h5>
                <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
              </div>
              <form onSubmit={handleCreatePayment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Taksit / Ödeme Başlığı <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Örn: 1. Taksit (Ekim)"
                      value={newPayment.title}
                      onChange={(e) => setNewPayment({ ...newPayment, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Tutar (₺) <span className="text-danger">*</span></label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control" 
                        placeholder="Örn: 15000"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Vade Tarihi <span className="text-danger">*</span></label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={newPayment.due_date}
                        onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Ödeme Yöntemi</label>
                    <select 
                      className="form-select"
                      value={newPayment.payment_method}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                    >
                      <option value="bank_transfer">Banka Havalesi / EFT</option>
                      <option value="credit_card">Kredi Kartı</option>
                      <option value="cash">Nakit</option>
                      <option value="check">Çek / Senet</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notlar</label>
                    <textarea 
                      className="form-control" 
                      rows={2}
                      placeholder="Fatura no, banka dekont ref no..."
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowPaymentModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Taksiti Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDetail;
