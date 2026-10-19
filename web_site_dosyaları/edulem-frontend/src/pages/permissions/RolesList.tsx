import { useEffect, useState } from 'react';
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
  created_at: string;
  updated_at: string;
}

const RolesList = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, _setSearchTerm] = useState('');
  const [filterStatus, _setFilterStatus] = useState('All');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axiosClient.get('/roles');
      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Roller yüklenemedi:', error);
      showToast('error', 'Roller yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' ||
      (filterStatus === 'Active' && role.is_system) ||
      (filterStatus === 'Inactive' && !role.is_system);
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (roleId: number) => {
    try {
      await axiosClient.delete(`/roles/${roleId}`);
      showToast('success', 'Rol başarıyla silindi');
      fetchRoles();
    } catch (error) {
      showToast('error', 'Rol silinemedi');
    }
  };

  const getRoleIcon = (roleName: string) => {
    const iconMap: { [key: string]: string } = {
      'Kurum Sahibi': 'ti ti-shield-lock',
      'Genel Müdür': 'ti ti-crown',
      'Kampüs Müdürü': 'ti ti-building',
      'Müdür': 'ti ti-user-star',
      'Müdür Yardımcısı': 'ti ti-user-star',
      'Öğretmen': 'ti ti-chalkboard',
      'Rehberlik': 'ti ti-heart-handshake',
      'Öğrenci İşleri': 'ti ti-users',
      'Muhasebe': 'ti ti-calculator',
      'Veli': 'ti ti-users',
      'guardian': 'ti ti-users',
    };
    return iconMap[roleName] || 'ti ti-user';
  };

  const getRoleColor = (roleName: string) => {
    const colorMap: { [key: string]: string } = {
      'Kurum Sahibi': 'danger',
      'Genel Müdür': 'warning',
      'Kampüs Müdürü': 'info',
      'Müdür': 'primary',
      'Müdür Yardımcısı': 'primary',
      'Öğretmen': 'success',
      'Rehberlik': 'secondary',
      'Öğrenci İşleri': 'dark',
      'Muhasebe': 'light',
      'Veli': 'info',
      'guardian': 'info',
    };
    return colorMap[roleName] || 'primary';
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

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex align-items-sm-center flex-sm-row flex-column my-3">
            <div className="flex-grow-1">
              <h4 className="fs-xl mb-1">Rolleri Yönet</h4>
              <p className="text-muted mb-0">Daha güvenli erişim ve sistem yönetimi için rolleri yapılandırın.</p>
            </div>
            <div className="text-end">
              <a href="/permissions/roles/create" className="btn btn-success">
                <i className="ti ti-plus me-1"></i> Yeni Rol Ekle
              </a>
            </div>
          </div>

          <div className="row">
            {filteredRoles.map((role) => (
              <div key={role.id} className="col-md-6 col-lg-3">
                <div className="card">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <div className="d-flex mb-4">
                      <div className="flex-shrink-0">
                        <div className={`avatar-xl rounded bg-${getRoleColor(role.display_name)}-subtle d-flex align-items-center justify-content-center`}>
                          <i className={`${getRoleIcon(role.display_name)} fs-24 text-${getRoleColor(role.display_name)}`}></i>
                        </div>
                      </div>
                      <div className="ms-3">
                        <h5 className="mb-1">{role.display_name}</h5>
                        <p className="text-muted mb-0 fs-base">{role.description || 'Rol açıklaması bulunmuyor'}</p>
                      </div>
                      <div className="ms-auto">
                        <div className="dropdown">
                          <a href="#" className="text-muted fs-xl" data-bs-toggle="dropdown">
                            <i className="ti ti-dots-vertical"></i>
                          </a>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <a className="dropdown-item" href={`/permissions/roles/${role.id}`}>
                                <i className="ti ti-eye me-2"></i> Görüntüle
                              </a>
                            </li>
                            <li>
                              <a className="dropdown-item" href={`/permissions/roles/${role.id}/edit`}>
                                <i className="ti ti-edit me-2"></i> Düzenle
                              </a>
                            </li>
                            {!role.is_system && (
                              <li>
                                <a className="dropdown-item text-danger" href="#" onClick={() => handleDelete(role.id)}>
                                  <i className="ti ti-trash me-2"></i> Sil
                                </a>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <ul className="list-unstyled mb-3">
                      <li className="d-flex align-items-center mb-2">
                        <i className="ti ti-check fs-lg text-success me-2"></i>
                        {role.scope === 'all' ? 'Tüm kampüslere erişim' :
                          role.scope === 'campus' ? 'Kendi kampüslerine erişim' :
                            'Kendi kampüs ve kademelerine erişim'}
                      </li>
                      <li className="d-flex align-items-center">
                        <i className="ti ti-check fs-lg text-success me-2"></i>
                        {role.is_system ? 'Sistem rolü' : 'Özel rol'}
                      </li>
                    </ul>

                    <p className="mb-2 text-muted">
                      {role.is_system ? 'Sistem Rolü' : 'Özel Rol'}
                    </p>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted fs-xs">
                        <i className="ti ti-clock me-1"></i>
                        Güncellendi: {role.updated_at ? new Date(role.updated_at).toLocaleDateString('tr-TR') : '-'}
                      </span>
                      <a href={`/permissions/roles/${role.id}`} className="btn btn-sm btn-outline-primary rounded-pill">
                        Detaylar
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesList;
