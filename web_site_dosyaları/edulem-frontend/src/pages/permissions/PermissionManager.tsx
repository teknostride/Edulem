import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  hierarchy_level: number;
  is_system_role: boolean;
  permissions: string[];
  created_at: string;
}

const PermissionManager = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [permissionsRes, rolesRes] = await Promise.all([
        axiosClient.get('/permissions'),
        axiosClient.get('/roles')
      ]);
      
      setPermissions(permissionsRes.data.data);
      setRoles(rolesRes.data.data);
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
      showToast('error', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions([...role.permissions]);
  };

  const handlePermissionToggle = (permissionName: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionName)) {
        return prev.filter(p => p !== permissionName);
      } else {
        return [...prev, permissionName];
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) {
      showToast('error', 'Rol seçilmedi');
      return;
    }

    try {
      setSaving(true);
      await axiosClient.put(`/roles/${selectedRole.id}`, {
        permissions: selectedPermissions
      });
      
      showToast('success', 'Rol yetkileri başarıyla güncellendi');
      fetchData(); // Verileri yenile
    } catch (error) {
      console.error('Yetkiler güncellenemedi:', error);
      showToast('error', 'Yetkiler güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionsByCategory = () => {
    const categories: { [key: string]: Permission[] } = {};
    
    permissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });
    
    return categories;
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryNames: { [key: string]: string } = {
      'general': 'Genel',
      'users': 'Kullanıcı Yönetimi',
      'students': 'Öğrenci Yönetimi',
      'academic': 'Akademik İşlemler',
      'financial': 'Finansal İşlemler',
      'reports': 'Raporlama',
      'settings': 'Ayarlar',
      'communications': 'İletişim',
      'counseling': 'Rehberlik'
    };
    
    return categoryNames[category] || category;
  };

  const getHierarchyColor = (level: number) => {
    if (level >= 90) return 'danger';
    if (level >= 70) return 'warning';
    if (level >= 50) return 'info';
    return 'secondary';
  };

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

  const permissionsByCategory = getPermissionsByCategory();

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-1">Yetki Yönetimi</h4>
          <small className="text-muted">Roller ve yetkileri yönetin</small>
        </div>
      </div>

      <div className="row">
        {/* Roller Listesi */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Roller</h6>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    className={`list-group-item list-group-item-action text-start ${
                      selectedRole?.id === role.id ? 'active' : ''
                    }`}
                    onClick={() => handleRoleSelect(role)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">{role.display_name}</h6>
                        <small className="text-muted">{role.description}</small>
                      </div>
                      <span className={`badge bg-${getHierarchyColor(role.hierarchy_level)}`}>
                        {role.hierarchy_level}
                      </span>
                    </div>
                    {role.is_system_role && (
                      <small className="text-muted d-block mt-1">
                        <i className="ti ti-lock me-1"></i>
                        Sistem rolü
                      </small>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Yetkiler */}
        <div className="col-lg-8">
          {selectedRole ? (
            <div className="card">
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="card-title mb-0">
                      {selectedRole.display_name} - Yetkiler
                    </h6>
                    <small className="text-muted">
                      {selectedPermissions.length} yetki seçili
                    </small>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSavePermissions}
                    disabled={saving || selectedRole.is_system_role}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy me-1"></i>
                        Kaydet
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="card-body">
                {selectedRole.is_system_role ? (
                  <div className="alert alert-warning">
                    <i className="ti ti-lock me-2"></i>
                    Bu bir sistem rolüdür ve yetkileri değiştirilemez.
                  </div>
                ) : (
                  <div className="accordion" id="permissionsAccordion">
                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                      <div className="accordion-item" key={category}>
                        <h2 className="accordion-header" id={`heading-${category}`}>
                          <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target={`#collapse-${category}`}
                            aria-expanded="false"
                            aria-controls={`collapse-${category}`}
                          >
                            <div className="d-flex justify-content-between align-items-center w-100">
                              <span>{getCategoryDisplayName(category)}</span>
                              <span className="badge bg-secondary">
                                {categoryPermissions.length}
                              </span>
                            </div>
                          </button>
                        </h2>
                        <div
                          id={`collapse-${category}`}
                          className="accordion-collapse collapse"
                          aria-labelledby={`heading-${category}`}
                          data-bs-parent="#permissionsAccordion"
                        >
                          <div className="accordion-body">
                            <div className="row">
                              {categoryPermissions.map((permission) => (
                                <div className="col-md-6 mb-2" key={permission.id}>
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`permission-${permission.id}`}
                                      checked={selectedPermissions.includes(permission.name)}
                                      onChange={() => handlePermissionToggle(permission.name)}
                                      disabled={permission.is_system_permission}
                                    />
                                    <label
                                      className="form-check-label"
                                      htmlFor={`permission-${permission.id}`}
                                    >
                                      <div>
                                        <div className="fw-medium">{permission.display_name}</div>
                                        <small className="text-muted">{permission.description}</small>
                                        {permission.is_system_permission && (
                                          <div className="text-warning small">
                                            <i className="ti ti-lock me-1"></i>
                                            Sistem yetkisi
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="ti ti-key fs-1 text-muted d-block mb-3"></i>
                <h5>Rol Seçin</h5>
                <p className="text-muted">
                  Yetkileri yönetmek için sol menüden bir rol seçin
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
