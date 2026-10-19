import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Statistics {
  total_tenants: number;
  active_tenants: number;
  inactive_tenants: number;
  total_users: number;
  total_students: number;
  recent_tenants: Array<{
    id: number;
    name: string;
    domain: string;
    is_active: boolean;
    users_count: number;
    students_count: number;
    created_at: string;
  }>;
}

const SuperAdminDashboard = () => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axiosClient.get('/super-admin/statistics');
      setStatistics(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
      showToast('error', 'İstatistikler yüklenemedi');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary"></div>
        <div className="mt-2">Yükleniyor...</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center p-5">
        <div className="text-muted">Veri yüklenemedi</div>
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* PAGE HEADER */}
        <div className="page-title-head d-flex align-items-center">
          <div className="flex-grow-1">
            <h4 className="page-main-title m-0">Süper Admin Paneli</h4>
            <p className="text-muted mb-0">EduLem Eğitim Öğretim Yönetimi</p>
          </div>
          <div className="text-end">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="javascript:void(0);">EduLem</a></li>
              <li className="breadcrumb-item active">Süper Admin</li>
            </ol>
          </div>
        </div>

        {/* STATISTICS CARDS */}
        <div className="row">
          <div className="col-lg-3 col-md-6">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h5 className="card-title mb-0">Toplam Kurum</h5>
                    <h3 className="mb-0">{statistics.total_tenants}</h3>
                  </div>
                  <div className="avatar-md bg-soft-primary rounded-circle">
                    <i className="ti ti-building fs-2 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h5 className="card-title mb-0">Aktif Kurum</h5>
                    <h3 className="mb-0 text-success">{statistics.active_tenants}</h3>
                  </div>
                  <div className="avatar-md bg-soft-success rounded-circle">
                    <i className="ti ti-circle-check fs-2 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h5 className="card-title mb-0">Toplam Kullanıcı</h5>
                    <h3 className="mb-0">{statistics.total_users}</h3>
                  </div>
                  <div className="avatar-md bg-soft-info rounded-circle">
                    <i className="ti ti-users fs-2 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h5 className="card-title mb-0">Toplam Öğrenci</h5>
                    <h3 className="mb-0 text-warning">{statistics.total_students}</h3>
                  </div>
                  <div className="avatar-md bg-soft-warning rounded-circle">
                    <i className="ti ti-user fs-2 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="row">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-3">Hızlı İşlemler</h5>
                <div className="row">
                  <div className="col-md-3 mb-2">
                    <Link to="/super-admin/tenants/create" className="btn btn-primary w-100">
                      <i className="ti ti-plus me-2"></i>
                      Yeni Kurum Ekle
                    </Link>
                  </div>
                  <div className="col-md-3 mb-2">
                    <Link to="/super-admin/tenants" className="btn btn-info w-100">
                      <i className="ti ti-building me-2"></i>
                      Kurumları Yönet
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT TENANTS */}
        <div className="row">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Son Eklenen Kurumlar</h5>
                  <Link to="/super-admin/tenants" className="btn btn-sm btn-outline-primary">
                    Tümünü Gör
                  </Link>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-hover table-nowrap mb-0">
                    <thead>
                      <tr>
                        <th>Kurum</th>
                        <th>Domain</th>
                        <th>Durum</th>
                        <th>Kullanıcı/Öğrenci</th>
                        <th>Kayıt Tarihi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.recent_tenants.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <div className="text-muted">
                              <i className="ti ti-building fs-1 d-block mb-2"></i>
                              Henüz kurum bulunmamaktadır.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        statistics.recent_tenants.map((tenant) => (
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
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="font-monospace text-primary">
                                {tenant.domain}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${tenant.is_active ? 'bg-success' : 'bg-danger'}`}>
                                {tenant.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </td>
                            <td>
                              <div className="small">
                                <div><i className="ti ti-users me-1"></i>{tenant.users_count}</div>
                                <div><i className="ti ti-user me-1"></i>{tenant.students_count}</div>
                              </div>
                            </td>
                            <td>
                              <div className="small">
                                {new Date(tenant.created_at).toLocaleDateString('tr-TR')}
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

          {/* SYSTEM INFO */}
          <div className="col-lg-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-3">Sistem Bilgileri</h5>
                
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Toplam Kurum</span>
                    <span className="fw-bold">{statistics.total_tenants}</span>
                  </div>
                  <div className="progress" style={{height: '6px'}}>
                    <div 
                      className="progress-bar bg-primary" 
                      style={{width: `${(statistics.active_tenants / statistics.total_tenants) * 100 || 0}%`}}
                    ></div>
                  </div>
                  <div className="small text-muted mt-1">
                    {statistics.active_tenants} aktif, {statistics.inactive_tenants} pasif
                  </div>
                </div>

                <div className="alert alert-success">
                  <h6 className="alert-heading">
                    <i className="ti ti-circle-check me-2"></i>
                    Sistem Durumu
                  </h6>
                  <p className="mb-0">
                    EduLem Eğitim Öğretim Yönetimi çalışıyor. Tüm modüller aktif.
                  </p>
                </div>

                <div className="alert alert-info">
                  <h6 className="alert-heading">
                    <i className="ti ti-info-circle me-2"></i>
                    Hızlı Bilgi
                  </h6>
                  <p className="mb-2">
                    <strong>Toplam Kullanıcı:</strong> {statistics.total_users}
                  </p>
                  <p className="mb-0">
                    <strong>Toplam Öğrenci:</strong> {statistics.total_students}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default SuperAdminDashboard;
