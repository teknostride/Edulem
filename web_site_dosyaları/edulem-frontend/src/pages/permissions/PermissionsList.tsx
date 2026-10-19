import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
}

const PermissionsList = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [, _setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [permissionsRes, rolesRes] = await Promise.all([
        axiosClient.get('/permissions'),
        axiosClient.get('/roles')
      ]);
      
      setPermissions(permissionsRes.data.data || []);
      _setRoles(rolesRes.data.data || []);
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
      showToast('error', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = permissions.filter(permission =>
    (permission.display_name || permission.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (permission.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAssignedRoles = (permissionName: string) => {
    // Mock data - gerçek uygulamada permission-role ilişkisi API'den gelmeli
    const roleAssignments: { [key: string]: string[] } = {
      'users': ['Kurum Sahibi', 'Genel Müdür', 'Kampüs Müdürü'],
      'content': ['Genel Müdür', 'Müdür', 'Müdür Yardımcısı', 'Öğretmen'],
      'financial': ['Kurum Sahibi', 'Genel Müdür', 'Muhasebe'],
      'reporting': ['Genel Müdür', 'Müdür', 'Müdür Yardımcısı', 'Rehberlik'],
      'academic': ['Müdür', 'Müdür Yardımcısı', 'Öğretmen', 'Rehberlik']
    };

    const category = permissionName.split('.')[0];
    return roleAssignments[category] || [];
  };

  const getUserCount = (permissionName: string) => {
    // Mock data - gerçek uygulamada API'den gelmeli
    const userCounts: { [key: string]: number } = {
      'users': 12,
      'content': 5,
      'financial': 8,
      'reporting': 6,
      'academic': 15
    };

    const category = permissionName.split('.')[0];
    return userCounts[category] || Math.floor(Math.random() * 10) + 1;
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
      <div className="page-title-head d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Permissions</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item">
              <a href="javascript: void(0);">Pages</a>
            </li>
            <li className="breadcrumb-item">
              <a href="javascript: void(0);">Users</a>
            </li>
            <li className="breadcrumb-item active">Permissions</li>
          </ol>
        </div>
      </div>

      <div className="row">
        <div className="col-xxl-12">
          <div className="card">
            <div className="card-header border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="ti ti-search app-search-icon text-muted"></i>
                </div>
              </div>
              <div>
                <select className="form-select form-control my-1 my-md-0">
                  <option value="5">5</option>
                  <option value="8">8</option>
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="20">20</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-custom table-centered table-select table-hover w-100 mb-0">
                <thead className="bg-light align-middle bg-opacity-25 thead-sm">
                  <tr className="text-uppercase fs-xxs">
                    <th style={{ cursor: 'pointer' }}>
                      Name
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ms-1">
                        <path d="M3 9l4 -4l4 4m-4 -4v14"></path>
                        <path d="M21 15l-4 4l-4 -4m4 4v-14"></path>
                      </svg>
                    </th>
                    <th>Assign To</th>
                    <th style={{ cursor: 'pointer' }}>
                      Created Date
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ms-1">
                        <path d="M3 9l4 -4l4 4m-4 -4v14"></path>
                        <path d="M21 15l-4 4l-4 -4m4 4v-14"></path>
                      </svg>
                    </th>
                    <th style={{ cursor: 'pointer' }}>
                      Users
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ms-1">
                        <path d="M3 9l4 -4l4 4m-4 -4v14"></path>
                        <path d="M21 15l-4 4l-4 -4m4 4v-14"></path>
                      </svg>
                    </th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((permission) => (
                    <tr key={permission.id}>
                      <td>{permission.display_name || permission.name}</td>
                      <td>
                        {getAssignedRoles(permission.name).map((roleName, index) => (
                          <span
                            key={index}
                            className={`badge bg-${getRoleBadgeColor(roleName)}-subtle text-${getRoleBadgeColor(roleName)} badge-label fs-xxs fw-semibold me-1`}
                          >
                            {roleName}
                          </span>
                        ))}
                      </td>
                      <td>
                        {new Date(permission.created_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })},
                        <span className="text-muted">
                          {new Date(permission.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td>{getUserCount(permission.name)}</td>
                      <td className="text-center">
                        <a href={`/permissions/${permission.id}`} className="btn btn-default btn-icon btn-sm">
                          <i className="ti ti-eye fs-lg"></i>
                        </a>
                        <a href="#" className="btn btn-default btn-icon btn-sm">
                          <i className="ti ti-trash fs-lg"></i>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-footer border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-muted">
                  Showing <span className="fw-semibold">1</span> to{' '}
                  <span className="fw-semibold">{Math.min(filteredPermissions.length, 8)}</span> of{' '}
                  <span className="fw-semibold">{filteredPermissions.length}</span> permissions
                </div>
                <div>
                  <ul className="pagination pagination-sm pagination-boxed mb-0 justify-content-center">
                    <li className="page-item disabled">
                      <a href="#" className="page-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 6l-6 6l6 6"></path>
                        </svg>
                      </a>
                    </li>
                    <li className="page-item active">
                      <a href="#" className="page-link">1</a>
                    </li>
                    <li className="page-item">
                      <a href="#" className="page-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6l-6 6"></path>
                        </svg>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getRoleBadgeColor = (roleName: string): string => {
  const colorMap: { [key: string]: string } = {
    'Kurum Sahibi': 'primary',
    'Genel Müdür': 'danger',
    'Kampüs Müdürü': 'info',
    'Müdür': 'warning',
    'Müdür Yardımcısı': 'warning',
    'Öğretmen': 'success',
    'Rehberlik': 'secondary',
    'Öğrenci İşleri': 'dark',
    'Muhasebe': 'light'
  };
  return colorMap[roleName] || 'primary';
};

export default PermissionsList;
