import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Permission {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  category?: string;
  is_system_permission?: boolean;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
}

const PermissionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPermissionDetail(id);
    }
  }, [id]);

  const fetchPermissionDetail = async (permissionId: string) => {
    try {
      const [permissionRes, rolesRes] = await Promise.all([
        axiosClient.get(`/permissions/${permissionId}`),
        axiosClient.get('/roles')
      ]);

      setPermission(permissionRes.data.data);
      setAssignedRoles(rolesRes.data.data || []);
    } catch (error) {
      console.error('Permission detayı yüklenemedi:', error);
      showToast('error', 'Permission detayı yüklenemedi');
      navigate('/permissions');
    } finally {
      setLoading(false);
    }
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

  if (!permission) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <h4>Permission bulunamadı</h4>
          <button 
            className="btn btn-primary mt-3"
            onClick={() => navigate('/permissions')}
          >
            İzinlere Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="page-title-head d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Permission Detayı</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item">
              <a href="javascript: void(0);">Pages</a>
            </li>
            <li className="breadcrumb-item">
              <a href="/permissions">Permissions</a>
            </li>
            <li className="breadcrumb-item active">Detay</li>
          </ol>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                {permission.display_name || permission.name}
              </h5>
              <div className="card-actions">
                <button 
                  className="btn btn-light"
                  onClick={() => navigate('/permissions')}
                >
                  <i className="ti ti-arrow-left me-1"></i>
                  Geri Dön
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label text-muted">Permission Adı</label>
                    <h6>{permission.name}</h6>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label text-muted">Görünen Ad</label>
                    <h6>{permission.display_name || '-'}</h6>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label text-muted">Kategori</label>
                    <h6>{permission.category || '-'}</h6>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label text-muted">Sistem Permission</label>
                    <h6>
                      <span className={`badge ${permission.is_system_permission ? 'bg-success' : 'bg-secondary'}`}>
                        {permission.is_system_permission ? 'Evet' : 'Hayır'}
                      </span>
                    </h6>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label text-muted">Açıklama</label>
                    <p>{permission.description || 'Açıklama yok'}</p>
                  </div>
                </div>
              </div>

              <hr />

              <h6 className="mb-3">Atanmış Roller</h6>
              <div className="row">
                {assignedRoles.length > 0 ? (
                  assignedRoles.map((role) => (
                    <div key={role.id} className="col-md-4 mb-3">
                      <div className="card border">
                        <div className="card-body">
                          <h6 className="card-title">{role.display_name}</h6>
                          <p className="card-text text-muted">{role.name}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-12">
                    <p className="text-muted">Bu permission'a atanmış rol bulunmuyor.</p>
                  </div>
                )}
              </div>

              <hr />

              <div className="row">
                <div className="col-md-6">
                  <small className="text-muted">
                    Oluşturulma: {new Date(permission.created_at).toLocaleString('tr-TR')}
                  </small>
                </div>
                <div className="col-md-6 text-end">
                  <small className="text-muted">
                    Güncellenme: {new Date(permission.updated_at).toLocaleString('tr-TR')}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionDetail;
