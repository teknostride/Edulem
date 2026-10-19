import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

const CreateRole = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    hierarchy_level: 1,
    is_system_role: false
  });

  useEffect(() => {
    if (isEditMode && id) {
      fetchRole(id);
    }
  }, [id, isEditMode]);

  const fetchRole = async (roleId: string) => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/roles/${roleId}`);
      const data = res.data?.data || res.data;
      setFormData({
        name: data.name || '',
        display_name: data.display_name || '',
        description: data.description || '',
        hierarchy_level: data.hierarchy_level || 1,
        is_system_role: data.is_system || false
      });
    } catch (error) {
      console.error('Rol yüklenirken hata oluştu:', error);
      showToast('error', 'Rol bilgileri yüklenemedi');
      navigate('/permissions/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        hierarchy_level: parseInt(formData.hierarchy_level.toString())
      };

      if (isEditMode) {
        await axiosClient.put(`/roles/${id}`, payload);
        showToast('success', 'Rol başarıyla güncellendi');
      } else {
        await axiosClient.post('/roles', payload);
        showToast('success', 'Rol başarıyla oluşturuldu');
      }
      navigate('/permissions/roles');
    } catch (error: any) {
      console.error('Rol kaydetme hatası:', error);
      showToast('error', 'Rol kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex align-items-sm-center flex-sm-row flex-column my-3">
            <div className="flex-grow-1">
              <h4 className="fs-xl mb-1">{isEditMode ? 'Rolü Düzenle' : 'Yeni Rol Oluştur'}</h4>
              <p className="text-muted mb-0">{isEditMode ? 'Mevcut rol bilgilerini güncelleyin.' : 'Belirli yetkilere ve sorumluluklara sahip yeni bir rol oluşturun.'}</p>
            </div>
            <div className="text-end">
              <a href="/permissions/roles" className="btn btn-light">
                <i className="ti ti-arrow-left me-1"></i> Rollere Dön
              </a>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="name" className="form-label">Rol Adı (Kod) *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="örn. ogretmen, mudur"
                      required
                    />
                    <small className="text-muted">Rol için benzersiz tanımlayıcı (küçük harf, Türkçe karakter ve boşluk olmadan)</small>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="display_name" className="form-label">Görünen Ad *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="display_name"
                      name="display_name"
                      value={formData.display_name}
                      onChange={handleInputChange}
                      placeholder="örn. Öğretmen, Müdür"
                      required
                    />
                    <small className="text-muted">Kullanıcı arayüzünde gösterilecek rol adı</small>
                  </div>

                  <div className="col-12">
                    <label htmlFor="description" className="form-label">Açıklama *</label>
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Rolün yetki ve sorumluluklarının kısa açıklaması"
                      required
                    />
                  </div>

                  <div className="col-12">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="is_system_role"
                        name="is_system_role"
                        checked={formData.is_system_role}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor="is_system_role">
                        Sistem Rolü
                      </label>
                      <small className="text-muted d-block">Sistem rolleri silinemez ve özel ayrıcalıklara sahiptir</small>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => navigate('/permissions/roles')}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {isEditMode ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                      </>
                    ) : (
                      <>
                        <i className={`ti ${isEditMode ? 'ti-device-floppy' : 'ti-plus'} me-1`}></i>
                        {isEditMode ? 'Rolü Güncelle' : 'Rol Oluştur'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRole;
