import { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';

interface Campus {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

const CampusList = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{phone?: string}>({});
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: number | null, name: string}>({show: false, id: null, name: ''});

  const fetchCampuses = async () => {
    try {
      const response = await axiosClient.get('/campuses');
      const data = response.data?.data?.campuses || response.data?.campuses || [];
      setCampuses(data);
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Kampüsler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({...formData, phone: formatted});
    
    if (formatted && !validatePhone(formatted)) {
      setFormErrors({phone: 'Telefon numarası (5XX) XXX XX XX formatında olmalıdır'});
    } else {
      setFormErrors({});
    }
  };

  const openEdit = (campus: Campus) => {
    setEditingId(campus.id);
    setFormData({
      name: campus.name,
      address: campus.address || '',
      phone: campus.phone || '',
      email: campus.email || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number, name: string) => {
    setDeleteModal({show: true, id, name});
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    
    try {
      await axiosClient.delete(`/campuses/${deleteModal.id}`);
      showToast('success', 'Kampüs başarıyla silindi');
      setDeleteModal({show: false, id: null, name: ''});
      fetchCampuses();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Kampüs silinemedi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast('error', 'Kampüs adı zorunludur');
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      showToast('error', 'Telefon numarası geçerli değil');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : null,
        email: formData.email.trim() || null
      };
      
      if (editingId) {
        await axiosClient.put(`/campuses/${editingId}`, payload);
        showToast('success', 'Kampüs başarıyla güncellendi');
      } else {
        await axiosClient.post('/campuses', payload);
        showToast('success', 'Kampüs başarıyla eklendi');
      }
      
      setFormData({ name: '', address: '', phone: '', email: '' });
      setEditingId(null);
      setShowModal(false);
      fetchCampuses();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız');
    } finally {
      setSaving(false);
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
      {/* Page Header */}
      <div className="row">
        <div className="col-12">
          <div className="page-title-box">
            <div className="page-title-right">
              <ol className="breadcrumb m-0">
                <li className="breadcrumb-item"><a href="#">Ayarlar</a></li>
                <li className="breadcrumb-item active">Kampüsler</li>
              </ol>
            </div>
            <h4 className="page-title">Kampüs Yönetimi</h4>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-primary bg-opacity-10 rounded p-2">
                    <i className="ti ti-building fs-20 text-primary"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">Toplam Kampüs</p>
                  <h4 className="mb-0">{campuses.length}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-success bg-opacity-10 rounded p-2">
                    <i className="ti ti-circle-check fs-20 text-success"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">Aktif Kampüs</p>
                  <h4 className="mb-0">{campuses.filter(c => c.is_active).length}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-warning bg-opacity-10 rounded p-2">
                    <i className="ti ti-phone fs-20 text-warning"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">Telefonlu Kampüs</p>
                  <h4 className="mb-0">{campuses.filter(c => c.phone).length}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-info bg-opacity-10 rounded p-2">
                    <i className="ti ti-mail fs-20 text-info"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <p className="text-muted mb-1">E-postalı Kampüs</p>
                  <h4 className="mb-0">{campuses.filter(c => c.email).length}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header justify-content-between">
              <h4 className="card-title">Kampüs Listesi</h4>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', address: '', phone: '', email: '' });
                  setShowModal(true);
                }}
              >
                <i className="ti ti-plus me-2"></i>
                Yeni Kampüs
              </button>
            </div>
            <div className="card-body">
              {campuses.length === 0 ? (
                <div className="text-center py-5">
                  <div className="avatar-lg bg-light rounded-circle mx-auto mb-3">
                    <i className="ti ti-building fs-40 text-muted"></i>
                  </div>
                  <h5 className="text-muted">Henüz kampüs eklenmemiş</h5>
                  <p className="text-muted">İlk kampüsünüzü ekleyerek başlayın</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: '', address: '', phone: '', email: '' });
                      setShowModal(true);
                    }}
                  >
                    <i className="ti ti-plus me-2"></i>
                    İlk Kampüsü Ekle
                  </button>
                </div>
              ) : (
                <div className="row row-cols-xxl-4 row-cols-lg-3 row-cols-md-2 row-cols-1 g-3">
                  {campuses.map((campus) => (
                    <div key={campus.id} className="col">
                      <div className="card card-h-100">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div className="avatar-sm bg-primary bg-opacity-10 rounded p-2">
                              <i className="ti ti-building fs-16 text-primary"></i>
                            </div>
                            <div className="dropdown">
                              <a href="#" className="btn btn-sm btn-default btn-icon" data-bs-toggle="dropdown">
                                <i className="ti ti-dots-vertical"></i>
                              </a>
                              <div className="dropdown-menu dropdown-menu-end">
                                <a className="dropdown-item" href="#" onClick={() => openEdit(campus)}>
                                  <i className="ti ti-edit me-2"></i>Düzenle
                                </a>
                                <a className="dropdown-item text-danger" href="#" onClick={() => handleDelete(campus.id, campus.name)}>
                                  <i className="ti ti-trash me-2"></i>Sil
                                </a>
                              </div>
                            </div>
                          </div>
                          
                          <h5 className="card-title mb-2">{campus.name}</h5>
                          
                          <div className="mb-3">
                            {campus.address && (
                              <p className="text-muted small mb-1">
                                <i className="ti ti-map-pin me-1"></i>
                                {campus.address}
                              </p>
                            )}
                            {campus.phone && (
                              <p className="text-muted small mb-1">
                                <i className="ti ti-phone me-1"></i>
                                {campus.phone}
                              </p>
                            )}
                            {campus.email && (
                              <p className="text-muted small mb-1">
                                <i className="ti ti-mail me-1"></i>
                                {campus.email}
                              </p>
                            )}
                            {!campus.address && !campus.phone && !campus.email && (
                              <p className="text-muted small mb-0">—</p>
                            )}
                          </div>
                          
                          <div className="d-flex align-items-center justify-content-between">
                            <span className={`badge ${campus.is_active ? 'bg-success' : 'bg-secondary'}`}>
                              {campus.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                            <small className="text-muted">ID: #{campus.id}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingId ? 'Kampüs Düzenle' : 'Yeni Kampüs Ekle'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Kampüs Adı *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Adres</label>
                    <textarea
                      className="form-control"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Telefon</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="(5XX) XXX XX XX"
                      maxLength={15}
                    />
                    {formErrors.phone && (
                      <div className="invalid-feedback">{formErrors.phone}</div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">E-posta</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Kaydet')}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteModal({show: false, id: null, name: ''});
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Kampüs Sil</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteModal({show: false, id: null, name: ''})} />
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <div className="avatar-lg bg-danger bg-opacity-10 rounded-circle mx-auto mb-3">
                    <i className="ti ti-trash fs-40 text-danger"></i>
                  </div>
                  <h5>Emin misiniz?</h5>
                  <p className="text-muted">
                    "{deleteModal.name}" kampüsünü silmek istediğinize emin misiniz?
                  </p>
                  <p className="text-muted small">
                    Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>
              <div className="modal-footer justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setDeleteModal({show: false, id: null, name: ''})}
                >
                  İptal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                >
                  <i className="ti ti-trash me-2"></i>
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusList;
