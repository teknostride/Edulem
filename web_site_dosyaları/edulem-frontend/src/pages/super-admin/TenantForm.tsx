import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface TenantFormData {
  id?: number;
  domain: string;
  subdomain?: string;
  name: string;
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
  contract_amount?: number | string;
  notes?: string;
  is_active: boolean;
  subscription_expires_at?: string;
}

interface AdminUser {
  admin_tc_no: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  admin_password: string;
  admin_password_confirmation: string;
}

const TenantForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);

  const [formData, setFormData] = useState<TenantFormData>({
    domain: '',
    subdomain: '',
    name: '',
    phone: '',
    email: '',
    authorized_person: '',
    authorized_phone: '',
    authorized_email: '',
    address: '',
    city: '',
    district: '',
    tax_office: '',
    tax_number: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_amount: '',
    notes: '',
    is_active: true,
    subscription_expires_at: '',
  });

  const [adminData, setAdminData] = useState<AdminUser>({
    admin_tc_no: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    admin_password: '',
    admin_password_confirmation: '',
  });

  useEffect(() => {
    if (isEditing) {
      fetchTenant();
    }
  }, [id]);

  const fetchTenant = async () => {
    try {
      const response = await axiosClient.get(`/super-admin/tenants/${id}`);
      const tenant = response.data.data.tenant;
      
      setFormData({
        domain: tenant.domain || '',
        subdomain: tenant.subdomain || tenant.domain || '',
        name: tenant.name || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        authorized_person: tenant.authorized_person || '',
        authorized_phone: tenant.authorized_phone || '',
        authorized_email: tenant.authorized_email || '',
        address: tenant.address || '',
        city: tenant.city || '',
        district: tenant.district || '',
        tax_office: tenant.tax_office || '',
        tax_number: tenant.tax_number || '',
        contract_start_date: tenant.contract_start_date ? tenant.contract_start_date.substring(0, 10) : '',
        contract_end_date: tenant.contract_end_date ? tenant.contract_end_date.substring(0, 10) : '',
        contract_amount: tenant.contract_amount ?? '',
        notes: tenant.notes || '',
        is_active: tenant.is_active ?? true,
        subscription_expires_at: tenant.subscription_expires_at ? tenant.subscription_expires_at.substring(0, 10) : '',
      });
      
      setFetchLoading(false);
    } catch (error) {
      console.error('Kurum bilgileri alınamadı:', error);
      showToast('error', 'Kurum bilgileri alınamadı');
      setFetchLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('admin_')) {
      setAdminData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      if (!isEditing) {
        const cleanTc = (adminData.admin_tc_no || '').replace(/\D/g, '');
        if (cleanTc.length !== 11) {
          showToast('error', 'Yönetici T.C. Kimlik Numarası 11 haneli olmalıdır.');
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        contract_amount: formData.contract_amount ? Number(formData.contract_amount) : null,
        ...(isEditing ? {} : adminData),
      };

      if (isEditing) {
        await axiosClient.put(`/super-admin/tenants/${id}`, payload);
        showToast('success', 'Kurum bilgileri başarıyla güncellendi');
      } else {
        await axiosClient.post('/super-admin/tenants', payload);
        showToast('success', 'Kurum başarıyla oluşturuldu');
      }

      navigate('/super-admin/tenants');
    } catch (error: any) {
      console.error('İşlem başarısız:', error);
      
      if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        Object.keys(errors).forEach(key => {
          showToast('error', errors[key][0]);
        });
      } else {
        const errorMessage = error.response?.data?.message || 'İşlem sırasında bir hata oluştu.';
        showToast('error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return (
    <div className="text-center p-5">
      <div className="spinner-border text-primary"></div>
      <div className="mt-2">Kurum bilgileri yükleniyor...</div>
    </div>
  );

  return (
    <div className="py-2">
      {/* PAGE HEADER */}
      <div className="page-title-head d-flex align-items-center mb-3">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">
            {isEditing ? 'Kurum & CRM Bilgilerini Düzenle' : 'Yeni Kurum (Okul) Kaydı'}
          </h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><Link to="/super-admin">SaaS Paneli</Link></li>
            <li className="breadcrumb-item"><Link to="/super-admin/tenants">Kurumlar</Link></li>
            <li className="breadcrumb-item active">{isEditing ? 'Düzenle' : 'Yeni Kurum'}</li>
          </ol>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* SOL KOLON: Kurum & Yetkili Bilgileri */}
          <div className="col-lg-8">
            {/* 1. Kurum Temel Bilgileri */}
            <div className="card mb-3 border shadow-sm">
              <div className="card-header bg-light d-flex align-items-center">
                <i className="ti ti-building fs-18 text-primary me-2"></i>
                <h5 className="card-title m-0">1. Kurum Temel Bilgileri & Domain</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-7">
                    <label className="form-label fw-bold">Kurum Adı <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="name"
                      placeholder="Örn: Ak İrfan Koleji"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="col-md-5">
                    <label className="form-label fw-bold">EduLem Subdomain <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <input 
                        type="text" 
                        className="form-control" 
                        name="domain"
                        placeholder="alirfan"
                        value={formData.domain}
                        onChange={handleInputChange}
                        required
                      />
                      <span className="input-group-text bg-light text-muted">.edulem.com</span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kurum Telefon Numarası</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="phone"
                      placeholder="0 (212) 555 00 00"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Kurum Resmi E-posta</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      name="email"
                      placeholder="info@alirfankoleji.k12.tr"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Yetkili / Kurucu / İrtibat Kişisi */}
            <div className="card mb-3 border shadow-sm">
              <div className="card-header bg-light d-flex align-items-center">
                <i className="ti ti-user-check fs-18 text-success me-2"></i>
                <h5 className="card-title m-0">2. Yetkili / Kurucu İletişim Bilgileri (CRM)</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Yetkili Adı Soyadı</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="authorized_person"
                      placeholder="Örn: Mehmet Bey (Kurucu / Müdür)"
                      value={formData.authorized_person}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Yetkili Cep Telefonu</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="authorized_phone"
                      placeholder="0 (5xx) xxx xx xx"
                      value={formData.authorized_phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Yetkili E-posta</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      name="authorized_email"
                      placeholder="kurucu@alirfankoleji.k12.tr"
                      value={formData.authorized_email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Fatura & Adres Bilgileri */}
            <div className="card mb-3 border shadow-sm">
              <div className="card-header bg-light d-flex align-items-center">
                <i className="ti ti-map-pin fs-18 text-danger me-2"></i>
                <h5 className="card-title m-0">3. Fatura & Kurum Adres Bilgileri</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">İl</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="city"
                      placeholder="İstanbul"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">İlçe</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="district"
                      placeholder="Kadıköy"
                      value={formData.district}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Açık Adres</label>
                    <textarea 
                      className="form-control" 
                      name="address"
                      rows={2}
                      placeholder="Mahalle, Cadde, No..."
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Vergi Dairesi</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="tax_office"
                      placeholder="Kadıköy V.D."
                      value={formData.tax_office}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Vergi Numarası / T.C.</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="tax_number"
                      placeholder="1234567890"
                      value={formData.tax_number}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. İlk Yönetici Hesabı (Sadece Yeni Oluştururken) */}
            {!isEditing && (
              <div className="card mb-3 border border-primary shadow-sm">
                <div className="card-header bg-soft-primary d-flex align-items-center">
                  <i className="ti ti-shield-lock fs-18 text-primary me-2"></i>
                  <h5 className="card-title m-0 text-primary">4. Okul İçin İlk Yönetici (Kurucu / Admin) Hesabı</h5>
                </div>
                <div className="card-body">
                  <div className="alert alert-info py-2 px-3 small d-flex align-items-center mb-3">
                    <i className="ti ti-info-circle fs-4 me-2 text-info"></i>
                    <div>
                      <strong>Giriş Yöntemi:</strong> EduLem sisteminde yöneticiler, öğretmenler ve personel <strong>T.C. Kimlik No</strong> ve şifreleri ile sisteme giriş yaparlar.
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Yönetici T.C. Kimlik No <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="admin_tc_no"
                        placeholder="11 Haneli T.C. Kimlik No"
                        maxLength={11}
                        value={adminData.admin_tc_no}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setAdminData(prev => ({ ...prev, admin_tc_no: val }));
                        }}
                        required={!isEditing}
                      />
                      <small className="text-muted">Okul paneline ilk girişte kullanıcı adı olarak bu T.C. Kimlik No kullanılacaktır.</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Yönetici Adı Soyadı <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="admin_name"
                        placeholder="Örn: Mehmet Yılmaz"
                        value={adminData.admin_name}
                        onChange={handleInputChange}
                        required={!isEditing}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Giriş Şifresi <span className="text-danger">*</span></label>
                      <input 
                        type="password" 
                        className="form-control" 
                        name="admin_password"
                        placeholder="En az 8 karakter"
                        value={adminData.admin_password}
                        onChange={handleInputChange}
                        required={!isEditing}
                        minLength={8}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Şifre Tekrarı <span className="text-danger">*</span></label>
                      <input 
                        type="password" 
                        className="form-control" 
                        name="admin_password_confirmation"
                        placeholder="Şifreyi tekrar yazınız"
                        value={adminData.admin_password_confirmation}
                        onChange={handleInputChange}
                        required={!isEditing}
                        minLength={8}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Yönetici E-posta <span className="text-muted">(İsteğe bağlı)</span></label>
                      <input 
                        type="email" 
                        className="form-control" 
                        name="admin_email"
                        placeholder="admin@okul.com"
                        value={adminData.admin_email}
                        onChange={handleInputChange}
                      />
                      <small className="text-muted">Şifre sıfırlama veya sistem bildirimleri için.</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Yönetici Telefon <span className="text-muted">(İsteğe bağlı)</span></label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        name="admin_phone"
                        placeholder="05XX XXX XX XX"
                        value={adminData.admin_phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SAĞ KOLON: Sözleşme, Finans & Durum */}
          <div className="col-lg-4">
            {/* Sözleşme & Ücret */}
            <div className="card mb-3 border shadow-sm">
              <div className="card-header bg-light d-flex align-items-center">
                <i className="ti ti-cash fs-18 text-warning me-2"></i>
                <h5 className="card-title m-0">Sözleşme & Finans</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">Yıllık / Anlaşılan Sözleşme Tutarı (₺)</label>
                  <div className="input-group">
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      name="contract_amount"
                      placeholder="Örn: 75000"
                      value={formData.contract_amount}
                      onChange={handleInputChange}
                    />
                    <span className="input-group-text">₺</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Sözleşme Başlangıç Tarihi</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    name="contract_start_date"
                    value={formData.contract_start_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Sözleşme Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    name="contract_end_date"
                    value={formData.contract_end_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Abonelik / Erişim Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    name="subscription_expires_at"
                    value={formData.subscription_expires_at}
                    onChange={handleInputChange}
                  />
                  <div className="form-text small">Bu tarihten sonra sistem erişimi otomatik uyarılır.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Özel Şirket / CRM Notları</label>
                  <textarea 
                    className="form-control" 
                    name="notes"
                    rows={4}
                    placeholder="Okul ile ilgili özel anlaşmalar, ödeme vadeleri, teknik talepler..."
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Durum & Kaydet */}
            <div className="card border shadow-sm">
              <div className="card-body">
                <div className="form-check form-switch mb-3">
                  <input 
                    type="checkbox" 
                    className="form-check-input" 
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label fw-bold" htmlFor="is_active">
                    Kurum Durumu: {formData.is_active ? <span className="text-success">Aktif</span> : <span className="text-danger">Pasif</span>}
                  </label>
                </div>

                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy me-1"></i>
                        {isEditing ? 'Değişiklikleri Kaydet' : 'Kurumu Oluştur'}
                      </>
                    )}
                  </button>

                  <Link to="/super-admin/tenants" className="btn btn-light">
                    İptal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TenantForm;
