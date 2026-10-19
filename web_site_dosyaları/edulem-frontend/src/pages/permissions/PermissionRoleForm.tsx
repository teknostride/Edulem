import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
}

interface Role {
  id?: number;
  name: string;
  display_name: string;
  description: string;
  hierarchy_level: number;
  is_system_role: boolean;
  permissions: string[];
}

const PermissionRoleForm = () => {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [role, setRole] = useState<Role>({
    name: '',
    display_name: '',
    description: '',
    hierarchy_level: 50,
    is_system_role: false,
    permissions: [],
  });

  useEffect(() => {
    fetchPermissions();
    if (type === 'roles' && id) {
      fetchRole();
    }
  }, [type, id]);

  const fetchPermissions = async () => {
    try {
      const response = await axiosClient.get('/permissions');
      setPermissions(response.data.data);
    } catch (error) {
      console.error('Yetkiler yüklenemedi:', error);
      showToast('error', 'Yetkiler yüklenemedi');
    }
  };

  const fetchRole = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/roles/${id}`);
      const roleData = response.data.data;
      setRole({
        ...roleData,
        permissions: roleData.permissions.map((p: any) => p.name),
      });
    } catch (error) {
      console.error('Rol yüklenemedi:', error);
      showToast('error', 'Rol yüklenemedi');
      navigate('/permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role.name.trim() || !role.display_name.trim()) {
      showToast('error', 'Rol adı ve gösterim adı zorunludur');
      return;
    }

    try {
      setSubmitting(true);
      
      const data = {
        ...role,
        permissions: role.permissions,
      };

      if (type === 'roles' && id) {
        await axiosClient.put(`/roles/${id}`, data);
        showToast('success', 'Rol başarıyla güncellendi');
      } else if (type === 'roles') {
        await axiosClient.post('/roles', data);
        showToast('success', 'Rol başarıyla oluşturuldu');
      }
      
      navigate('/permissions');
    } catch (error) {
      console.error('İşlem başarısız:', error);
      showToast('error', type === 'roles' ? 'Rol işlemi başarısız' : 'Yetki işlemi başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setRole(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePermissionToggle = (permissionName: string) => {
    setRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter(p => p !== permissionName)
        : [...prev.permissions, permissionName]
    }));
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = permissions
      .filter(p => p.category === category)
      .map(p => p.name);
    
    setRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(categoryPermissions[0])
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : [...prev.permissions, ...categoryPermissions]
    }));
  };

  const getPermissionsByCategory = () => {
    const grouped: { [key: string]: Permission[] } = {};
    permissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-1">
            {type === 'roles' ? (id ? 'Rol Düzenle' : 'Yeni Rol') : 'Kullanıcı Yetkileri'}
          </h4>
          <small className="text-muted">
            {type === 'roles' ? (id ? 'Mevcut rolü düzenleyin' : 'Yeni rol oluşturun')
              : 'Kullanıcı yetkilerini yönetin'}
          </small>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/permissions')}
        >
          <i className="ti ti-arrow-left me-1"></i>
          Geri Dön
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {type === 'roles' && (
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">Rol Adı *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={role.name}
                      onChange={handleInputChange}
                      placeholder="Rol adı (örn: teacher)"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="display_name" className="form-label">Gösterim Adı *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="display_name"
                      name="display_name"
                      value={role.display_name}
                      onChange={handleInputChange}
                      placeholder="Gösterim adı (örn: Öğretmen)"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-12">
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Açıklama</label>
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      value={role.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Rol hakkında açıklama..."
                    />
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="hierarchy_level" className="form-label">Hiyerarşi Seviyesi</label>
                      <input
                        type="number"
                        className="form-control"
                        id="hierarchy_level"
                        name="hierarchy_level"
                        value={role.hierarchy_level}
                        onChange={handleInputChange}
                        min="1"
                        max="100"
                        required
                      />
                      <small className="text-muted">1 (en düşük) - 100 (en yüksek)</small>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="is_system_role"
                          name="is_system_role"
                          checked={role.is_system_role}
                          onChange={(e) => setRole(prev => ({ ...prev, is_system_role: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="is_system_role">
                          Sistem Rolü
                        </label>
                      </div>
                      <small className="text-muted">Sistem rolleri silinemez</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Yetkiler */}
            <div className="mb-4">
              <h5 className="card-title">Yetkiler</h5>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th>Yetki Adı</th>
                      <th>Açıklama</th>
                      <th>
                        {type === 'roles' ? 'Seç' : 'Durum'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                      <tr key={category}>
                        <td>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`category-${category}`}
                              checked={role.permissions.length > 0 && 
                                categoryPermissions.every(p => role.permissions.includes(p.name))
                              }
                              onChange={() => handleCategoryToggle(category)}
                            />
                            <label className="form-check-label" htmlFor={`category-${category}`}>
                              {category === 'users' ? 'Kullanıcılar' :
                               category === 'students' ? 'Öğrenciler' :
                               category === 'academic' ? 'Akademik' :
                               category === 'financial' ? 'Finansal' :
                               category === 'announcements' ? 'Duyurular' :
                               category === 'messages' ? 'Mesajlar' :
                               category === 'reports' ? 'Raporlar' :
                               category === 'settings' ? 'Ayarlar' :
                               category === 'system' ? 'Sistem' : category}
                            </label>
                          </div>
                        </td>
                        <td colSpan={2}>
                          <small className="text-muted">
                            {categoryPermissions.length} yetki
                          </small>
                        </td>
                        <td>
                          {type === 'roles' && (
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={role.permissions.length > 0 && 
                                  categoryPermissions.every(p => role.permissions.includes(p.name))
                                }
                                onChange={() => handleCategoryToggle(category)}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detaylı Yetki Listesi */}
              <div className="row">
                {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                  <div className="col-md-12 mb-3" key={category}>
                    <h6 className="text-muted mb-2">
                      {category === 'users' ? 'Kullanıcı Yetkileri' :
                       category === 'students' ? 'Öğrenci Yetkileri' :
                       category === 'academic' ? 'Akademik Yetkileri' :
                       category === 'financial' ? 'Finansal Yetkileri' :
                       category === 'announcements' ? 'Duyuru Yetkileri' :
                       category === 'messages' ? 'Mesajlaşma Yetkileri' :
                       category === 'reports' ? 'Raporlama Yetkileri' :
                       category === 'settings' ? 'Ayarlar Yetkileri' :
                       category === 'system' ? 'Sistem Yetkileri' : ''}
                    </h6>
                    <div className="d-flex flex-wrap gap-2">
                      {categoryPermissions.map((permission) => (
                        <div key={permission.name} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`permission-${permission.name}`}
                            checked={role.permissions.includes(permission.name)}
                            onChange={() => handlePermissionToggle(permission.name)}
                          />
                          <label className="form-check-label" htmlFor={`permission-${permission.name}`}>
                            {permission.display_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {type === 'roles' ? (id ? 'Güncelleniyor...' : 'Oluşturuluyor...') : 'Kaydediliyor...'}
                  </>
                ) : (
                  <>
                    <i className="ti ti-device-floppy me-1"></i>
                    Kaydet
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/permissions')}
                disabled={submitting}
              >
                <i className="ti ti-x me-1"></i>
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PermissionRoleForm;
