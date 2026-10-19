import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Branch {
  id: number;
  name: string;
  campus_id: number;
  education_level_id?: number;
  manager_id?: number;
  is_active: boolean;
  campus?: {
    id: number;
    name: string;
  };
  education_level?: {
    id: number;
    name: string;
  };
  manager?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const BranchList = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtreler
  const [campusFilter, setCampusFilter] = useState<number | ''>('');
  const [educationLevelFilter, setEducationLevelFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<boolean | ''>('');

  // Dropdown verileri
  const [campuses, setCampuses] = useState<Array<{ id: number; name: string }>>([]);
  const [educationLevels, setEducationLevels] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchCampuses();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Filtre değiştiğinde sayfayı sıfırla
  }, [campusFilter, educationLevelFilter, statusFilter]);

  useEffect(() => {
    fetchBranches();
  }, [currentPage, campusFilter, educationLevelFilter, statusFilter]);

  useEffect(() => {
    if (campusFilter) {
      fetchEducationLevels(campusFilter);
    } else {
      setEducationLevels([]);
      setEducationLevelFilter('');
    }
  }, [campusFilter]);

  const fetchCampuses = async () => {
    try {
      const response = await axiosClient.get('/campuses');
      const data = response.data.data?.campuses || response.data.campuses || response.data.data || response.data;
      setCampuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kampüsler yüklenemedi:', error);
    }
  };

  const fetchEducationLevels = async (campusId: number) => {
    try {
      const response = await axiosClient.get(`/education-levels?campus_id=${campusId}`);
      const data = response.data.data?.education_levels || response.data.education_levels || response.data.data || response.data;
      setEducationLevels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kademeler yüklenemedi:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        per_page: 15
      };

      if (campusFilter) params.campus_id = campusFilter;
      if (educationLevelFilter) params.education_level_id = educationLevelFilter;
      if (statusFilter !== '') params.is_active = statusFilter === true ? 1 : 0;

      const response = await axiosClient.get('/branches', { params });
      const data = response.data.data || response.data;

      const branchesArray = data.branches || data || [];
      setBranches(Array.isArray(branchesArray) ? branchesArray : []);

      if (data.pagination) {
        setPagination(data.pagination);
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Şubeler yüklenemedi:", error);
      showToast('error', error.response?.data?.message || 'Şubeler yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu şubeyi silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/branches/${id}`);
      showToast('success', 'Şube başarıyla silindi');
      fetchBranches(); // Listeyi yenile
    } catch (error: any) {
      console.error("Şube silinemedi:", error);
      const errorMessage = error.response?.data?.message || 'Şube silinirken bir hata oluştu.';
      showToast('error', errorMessage);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sadece arama terimi için client-side filtreleme
  const filteredBranches = searchTerm
    ? branches.filter(branch =>
      (branch.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (branch.campus?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (branch.education_level?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    : branches;

  if (loading) return (
    <div className="text-center p-5">
      <div className="spinner-border text-primary"></div>
      <div className="mt-2">Şubeler yükleniyor...</div>
    </div>
  );

  return (
    <div className="content-page">
      <div className="container-fluid">
        {/* PAGE HEADER */}
        <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
          <div>
            <h3 className="fw-bold m-0 text-dark">Şube Yönetimi</h3>
            <p className="text-muted mb-0">Kurum bünyesindeki kampüs ve kademe bazlı şubeleri yönetin.</p>
          </div>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item active fw-medium">Şubeler</li>
            </ol>
          </div>
        </div>

        {/* BİLGİ: Kurum Bilgileri ile ilişki */}
        <div className="alert alert-info border-0 mb-3 d-flex align-items-start">
          <i className="ti ti-info-circle fs-5 me-2 mt-1"></i>
          <div>
            <strong>Tekrar tanımlamanız gerekmez.</strong> Şubeler,{' '}
            <Link to="/settings/institution" className="alert-link fw-semibold">Kurum Bilgileri</Link>
            {' '}sayfasındaki <strong>Kampüs → Kademe</strong> yapısından türetilir (ör. İlkokul – Aksaray Kampüs).
            Kampüs ve kademe eklemek için Kurum Bilgileri → Kampüs Yapısı sekmesini kullanın. Bu sayfa aynı şubeleri liste halinde gösterir.
          </div>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="row">
          <div className="col-lg-12">
            <div className="card border p-3">
              <div className="row gap-3">
                {/* Search Input */}
                <div className="col-lg-4">
                  <div className="app-search">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Şube adı, kampüs veya kademe ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <i className="ti ti-search app-search-icon text-muted"></i>
                  </div>
                </div>

                <div className="col">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="me-2 fw-semibold">Filtrele:</span>

                    {/* Campus Filter */}
                    <div className="app-search">
                      <select
                        className="form-select form-control my-1 my-md-0"
                        value={campusFilter === '' ? '' : campusFilter}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCampusFilter(value ? Number(value) : '');
                          setEducationLevelFilter('');
                        }}
                      >
                        <option value="">Tüm Kampüsler</option>
                        {campuses.map(campus => (
                          <option key={campus.id} value={campus.id}>{campus.name}</option>
                        ))}
                      </select>
                      <i className="ti ti-building app-search-icon text-muted"></i>
                    </div>

                    {/* Education Level Filter */}
                    <div className="app-search">
                      <select
                        className="form-select form-control my-1 my-md-0"
                        value={educationLevelFilter === '' ? '' : educationLevelFilter}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEducationLevelFilter(value ? Number(value) : '');
                        }}
                        disabled={!campusFilter}
                      >
                        <option value="">Tüm Kademeler</option>
                        {educationLevels.map(level => (
                          <option key={level.id} value={level.id}>{level.name}</option>
                        ))}
                      </select>
                      <i className="ti ti-school app-search-icon text-muted"></i>
                    </div>

                    {/* Status Filter */}
                    <div className="app-search">
                      <select
                        className="form-select form-control my-1 my-md-0"
                        value={statusFilter === '' ? '' : statusFilter ? '1' : '0'}
                        onChange={(e) => {
                          const value = e.target.value;
                          setStatusFilter(value === '' ? '' : value === '1');
                        }}
                      >
                        <option value="">Durum</option>
                        <option value="1">Aktif</option>
                        <option value="0">Pasif</option>
                      </select>
                      <i className="ti ti-toggle-left app-search-icon text-muted"></i>
                    </div>

                    {/* Add Button */}
                    <div className="ms-auto">
                      <Link to="/branches/create" className="btn btn-primary">
                        <i className="ti ti-plus me-1"></i>
                        Yeni Şube
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BRANCHES TABLE */}
        <div className="row">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover table-nowrap align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Şube Adı</th>
                        <th>Kampüs</th>
                        <th>Kademe</th>
                        <th>Şube Müdürü</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBranches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4">
                            <div className="text-muted">
                              <i className="ti ti-inbox fs-48 mb-2 d-block"></i>
                              <p className="mb-0">Şube bulunamadı</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredBranches.map((branch) => (
                          <tr key={branch.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar-sm me-2">
                                  <span className="avatar-title bg-primary-subtle text-primary rounded">
                                    <i className="ti ti-building-store"></i>
                                  </span>
                                </div>
                                <div>
                                  <h6 className="mb-0">{branch.name}</h6>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-info-subtle text-info">
                                {branch.campus?.name || 'Belirtilmemiş'}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-success-subtle text-success">
                                {branch.education_level?.name || 'Belirtilmemiş'}
                              </span>
                            </td>
                            <td>
                              {branch.manager ? (
                                <span>{branch.manager.first_name} {branch.manager.last_name}</span>
                              ) : (
                                <span className="text-muted">Atanmamış</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${branch.is_active ? 'bg-success' : 'bg-danger'}`}>
                                {branch.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </td>
                            <td>
                              <div className="dropdown">
                                <button
                                  className="btn btn-soft-secondary btn-sm dropdown-toggle"
                                  type="button"
                                  data-bs-toggle="dropdown"
                                >
                                  <i className="ti ti-dots-vertical"></i>
                                </button>
                                <ul className="dropdown-menu">
                                  <li>
                                    <Link
                                      className="dropdown-item"
                                      to={`/branches/${branch.id}`}
                                    >
                                      <i className="ti ti-eye me-2"></i>Görüntüle
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      className="dropdown-item"
                                      to={`/branches/${branch.id}/edit`}
                                    >
                                      <i className="ti ti-edit me-2"></i>Düzenle
                                    </Link>
                                  </li>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button
                                      className="dropdown-item text-danger"
                                      onClick={() => handleDelete(branch.id)}
                                    >
                                      <i className="ti ti-trash me-2"></i>Sil
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                {pagination && pagination.last_page > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted">
                      Toplam {pagination.total} şube, Sayfa {pagination.current_page} / {pagination.last_page}
                    </div>
                    <nav>
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(pagination.current_page - 1)}
                            disabled={pagination.current_page === 1}
                          >
                            Önceki
                          </button>
                        </li>
                        {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                          .filter(page => {
                            const current = pagination.current_page;
                            return page === 1 || page === pagination.last_page ||
                              (page >= current - 2 && page <= current + 2);
                          })
                          .map((page, index, array) => (
                            <React.Fragment key={page}>
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <li className="page-item disabled">
                                  <span className="page-link">...</span>
                                </li>
                              )}
                              <li className={`page-item ${pagination.current_page === page ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(page)}
                                >
                                  {page}
                                </button>
                              </li>
                            </React.Fragment>
                          ))
                        }
                        <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(pagination.current_page + 1)}
                            disabled={pagination.current_page === pagination.last_page}
                          >
                            Sonraki
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchList;
