import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { alertDialog, confirmDialog, showToast } from '../../utils/toast';
import { Link } from 'react-router-dom';

interface Scholarship {
  id: number;
  tenant_id: number;
  student_id?: number;
  tc_kimlik: string;
  ad_soyad: string;
  okul_adi: string;
  classroom_id?: number;
  sinif_adi?: string;
  veli_ad_soyad: string;
  dogum_tarihi?: string;
  veli_iletisim: string;
  durum: 'aktif' | 'pasif';
  created_at: string;
  updated_at: string;
  exam_time?: string;
  student?: {
    id: number;
    first_name: string;
    last_name: string;
    tc_kimlik: string;
    veli_ad: string;
    veli_tel: string;
    dogum_tarihi?: string;
  };
  classroom?: {
    id: number;
    name: string;
    education_level: {
      name: string;
    };
  };
}

interface Classroom {
  id: number;
  name: string;
  education_level: {
    name: string;
  };
}

interface Statistics {
  total_active: number;
  total_archived: number;
  class_level_stats: Array<{
    sinif_adi: string;
    count: number;
  }>;
  classroom_stats: Array<{
    classroom_id: number;
    classroom_name: string;
    count: number;
  }>;
}

const Scholarships = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'classes', 'statistics', 'documents', 'exam-class', 'archive'
  const [selectedClassroomForBulk, setSelectedClassroomForBulk] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    tc_kimlik: '',
    ad_soyad: '',
    okul_adi: '',
    classroom_id: null as number | null,
    sinif_adi: '',
    veli_ad_soyad: '',
    dogum_tarihi: '',
    veli_iletisim: '',
    student_id: null as number | null,
  });

  useEffect(() => {
    fetchScholarships();
    fetchClassrooms();
    fetchStatistics();
  }, [selectedTab, searchTerm, currentPage]);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '15',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedTab === 'archive' && { durum: 'pasif' }),
      });

      const response = await axiosClient.get(`/scholarships?${params}`);
      setScholarships(response.data.data.scholarships);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Bursluluk kayıtları yüklenemedi:', error);
      showToast('error', 'Bursluluk kayıtları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await axiosClient.get('/classrooms?per_page=100');
      setClassrooms(response.data.data.classrooms || []);
    } catch (error) {
      console.error('Sınıflar yüklenemedi:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axiosClient.get('/scholarships/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (data.classroom_id) {
        data.classroom_id = Number(data.classroom_id);
      }

      if (editingScholarship) {
        await axiosClient.put(`/scholarships/${editingScholarship.id}`, data);
        showToast('success', 'Bursluluk kaydı güncellendi');
      } else {
        await axiosClient.post('/scholarships', data);
        showToast('success', 'Bursluluk kaydı eklendi');
      }

      setShowModal(false);
      setEditingScholarship(null);
      resetForm();
      fetchScholarships();
      fetchStatistics();
    } catch (error: any) {
      if (error.response?.data?.warning) {
        const ok = await confirmDialog({
          title: 'Uyarı',
          text: String(error.response.data.message || 'Devam etmek istiyor musunuz?'),
          confirmText: 'Devam Et',
          cancelText: 'İptal',
          icon: 'warning',
        });
        if (ok) {
          // Onay verildi, tekrar gönder
          const submitData = { ...formData, ad_soyad_onay: '1' };
          await axiosClient.post('/scholarships', submitData);
          showToast('success', 'Bursluluk kaydı eklendi');
          setShowModal(false);
          resetForm();
          fetchScholarships();
          fetchStatistics();
        }
      } else {
        showToast(error.response?.data?.message || 'İşlem başarısız', 'error');
      }
    }
  };

  const handleEdit = (scholarship: Scholarship) => {
    setEditingScholarship(scholarship);
    setFormData({
      tc_kimlik: scholarship.tc_kimlik,
      ad_soyad: scholarship.ad_soyad,
      okul_adi: scholarship.okul_adi,
      classroom_id: scholarship.classroom_id || null,
      sinif_adi: scholarship.sinif_adi || '',
      veli_ad_soyad: scholarship.veli_ad_soyad,
      dogum_tarihi: scholarship.dogum_tarihi || '',
      veli_iletisim: scholarship.veli_iletisim,
      student_id: scholarship.student_id || null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu kaydı silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/scholarships/${id}`);
      showToast('success', 'Kayıt silindi');
      fetchScholarships();
      fetchStatistics();
    } catch (error) {
      showToast('error', 'Kayıt silinemedi');
    }
  };

  const handleArchiveAll = async () => {
    const ok = await confirmDialog({
      text: 'Tüm aktif kayıtları arşivlemek istediğinizden emin misiniz?',
      confirmText: 'Arşivle',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.post('/scholarships/archive-all');
      showToast('success', 'Tüm kayıtlar arşivlendi');
      fetchScholarships();
      fetchStatistics();
    } catch (error) {
      showToast('error', 'Arşivleme başarısız');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await axiosClient.post(`/scholarships/${id}/restore`);
      showToast('success', 'Kayıt arşivden geri çağrıldı');
      fetchScholarships();
      fetchStatistics();
    } catch (error) {
      showToast('error', 'Geri çağırma başarısız');
    }
  };

  const handleBulkRegister = async () => {
    if (!selectedClassroomForBulk) {
      showToast('error', 'Lütfen bir sınıf seçin');
      return;
    }

    try {
      const response = await axiosClient.get(`/scholarships/students-by-classroom/${selectedClassroomForBulk}`);
      setStudentsInClass(response.data.data.students);
      setShowBulkModal(true);
    } catch (error) {
      showToast('error', 'Öğrenciler yüklenemedi');
    }
  };

  const handleBulkRegisterSubmit = async () => {
    try {
      if (selectedStudents.length === 0) {
        showToast('error', 'Lütfen en az bir öğrenci seçin');
        return;
      }

      await axiosClient.post('/scholarships/register-selected-students', {
        student_ids: selectedStudents,
      });

      showToast('success', 'Seçili öğrenciler kaydedildi');
      setShowBulkModal(false);
      setSelectedStudents([]);
      fetchScholarships();
      fetchStatistics();
    } catch (error) {
      showToast('error', 'Öğrenciler kaydedilemedi');
    }
  };

  const handleRegisterEntireClass = async () => {
    if (!selectedClassroomForBulk) {
      showToast('error', 'Lütfen bir sınıf seçin');
      return;
    }

    const ok = await confirmDialog({
      text: 'Bu sınıftaki tüm öğrencileri kaydetmek istediğinizden emin misiniz?',
      confirmText: 'Kaydet',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.post('/scholarships/register-entire-class', {
        classroom_id: selectedClassroomForBulk,
      });

      showToast('success', 'Sınıftaki tüm öğrenciler kaydedildi');
      setShowBulkModal(false);
      fetchScholarships();
      fetchStatistics();
    } catch (error) {
      showToast('error', 'Öğrenciler kaydedilemedi');
    }
  };

  const resetForm = () => {
    setFormData({
      tc_kimlik: '',
      ad_soyad: '',
      okul_adi: '',
      classroom_id: null,
      sinif_adi: '',
      veli_ad_soyad: '',
      dogum_tarihi: '',
      veli_iletisim: '',
      student_id: null,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <div className="container-fluid">
      <div className="page-title-head d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Bursluluk Kayıtları</h4>
          <p className="text-muted small mb-0 mt-1">Bursluluk başvuru kayıtlarını yönetin</p>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="javascript: void(0);">Öğrenci</a></li>
            <li className="breadcrumb-item active">Bursluluk</li>
          </ol>
        </div>
      </div>

      {/* Tab Menü */}
      <div className="card mb-4">
        <div className="card-body p-0">
          <ul className="nav nav-tabs nav-tabs-bottom" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link ${selectedTab === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedTab('all')}
              >
                <i className="ti ti-list me-2"></i>Tümü
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${selectedTab === 'classes' ? 'active' : ''}`}
                onClick={() => setSelectedTab('classes')}
              >
                <i className="ti ti-building me-2"></i>Sınıflar
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${selectedTab === 'statistics' ? 'active' : ''}`}
                onClick={() => setSelectedTab('statistics')}
              >
                <i className="ti ti-bar-chart me-2"></i>İstatistikler
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${selectedTab === 'documents' ? 'active' : ''}`}
                onClick={() => setSelectedTab('documents')}
              >
                <i className="ti ti-file-text me-2"></i>Belge Düzenleme
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${selectedTab === 'exam-class' ? 'active' : ''}`}
                onClick={() => setSelectedTab('exam-class')}
              >
                <i className="ti ti-school me-2"></i>Sınav Sınıfı
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${selectedTab === 'archive' ? 'active' : ''}`}
                onClick={() => setSelectedTab('archive')}
              >
                <i className="ti ti-archive me-2"></i>Arşiv
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tümü Tab */}
      {selectedTab === 'all' && (
        <div className="card">
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="app-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ad, soyad, T.C. kimlik, veli adı veya telefon ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="ti ti-search app-search-icon"></i>
                </div>
              </div>
              <div className="col-md-4 text-end">
                {selectedTab === 'all' && (
                  <button
                    className="btn btn-warning me-2"
                    onClick={handleArchiveAll}
                  >
                    <i className="ti ti-archive me-2"></i>Listeyi Arşivle
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingScholarship(null);
                    resetForm();
                    setShowModal(true);
                  }}
                >
                  <i className="ti ti-plus me-2"></i>Yeni Kayıt
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Yükleniyor...</span>
                </div>
              </div>
            ) : scholarships.length === 0 ? (
              <div className="text-center py-5">
                <i className="ti ti-inbox" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                <p className="text-muted mt-3 mb-0">
                  {searchTerm ? `"${searchTerm}" araması için sonuç bulunamadı` : 'Henüz bursluluk kaydı yok'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>T.C. Kimlik</th>
                      <th>Ad Soyad</th>
                      <th>Okul</th>
                      <th>Sınıf</th>
                      <th>Veli Ad Soyad</th>
                      <th>Doğum Tarihi</th>
                      <th>Veli İletişim</th>
                      <th className="text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scholarships.map((scholarship) => (
                      <tr key={scholarship.id}>
                        <td className="fw-semibold">{scholarship.tc_kimlik}</td>
                        <td>{scholarship.ad_soyad}</td>
                        <td>{scholarship.okul_adi}</td>
                        <td>
                          {scholarship.sinif_adi ? (
                            <span className="badge bg-primary">{scholarship.sinif_adi}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>{scholarship.veli_ad_soyad}</td>
                        <td>{formatDate(scholarship.dogum_tarihi || '')}</td>
                        <td>
                          <a href={`tel:${scholarship.veli_iletisim}`} className="text-decoration-none">
                            <i className="ti ti-phone me-1"></i>
                            {scholarship.veli_iletisim}
                          </a>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-success me-1"
                            onClick={() => {
                              void alertDialog({
                                title: 'Bursluluk Detayı',
                                icon: 'info',
                                text:
                                  `T.C. Kimlik: ${scholarship.tc_kimlik}\n` +
                                  `Ad Soyad: ${scholarship.ad_soyad}\n` +
                                  `Okul: ${scholarship.okul_adi}\n` +
                                  `Sınıf: ${scholarship.sinif_adi || '-'}\n` +
                                  `Veli: ${scholarship.veli_ad_soyad}\n` +
                                  `Doğum Tarihi: ${formatDate(scholarship.dogum_tarihi || '')}\n` +
                                  `Veli İletişim: ${scholarship.veli_iletisim}`,
                              });
                            }}
                            title="Görüntüle"
                          >
                            <i className="ti ti-eye"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-warning me-1"
                            onClick={() => handleEdit(scholarship)}
                            title="Düzenle"
                          >
                            <i className="ti ti-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(scholarship.id)}
                            title="Sil"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sayfalama */}
            {pagination && pagination.last_page > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Toplam {pagination.total} kayıt
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <i className="ti ti-chevron-left"></i>
                      </button>
                    </li>
                    {[...Array(pagination.last_page)].map((_, index) => {
                      const page = index + 1;
                      return (
                        <li
                          key={page}
                          className={`page-item ${currentPage === page ? 'active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${currentPage === pagination.last_page ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === pagination.last_page}
                      >
                        <i className="ti ti-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'documents' && (
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h5 className="mb-1">Belge Düzenleme</h5>
                <p className="text-muted mb-0">Giriş belgesi şablonlarını ve çıktıları bursluluk sınavları üzerinden yönetebilirsin.</p>
              </div>
              <div className="d-flex gap-2">
                <Link to="/scholarship/exams" className="btn btn-primary">
                  <i className="ti ti-settings me-1"></i> Sınavları Yönet
                </Link>
                <Link to="/scholarship/entry-templates" className="btn btn-outline-primary">
                  <i className="ti ti-file-text me-1"></i> Şablonlar
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'exam-class' && (
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h5 className="mb-1">Sınav Sınıfı</h5>
                <p className="text-muted mb-0">Sınav seansları ve oturma düzeni işlemlerini seçtiğin sınavın yönetim ekranından yapabilirsin.</p>
              </div>
              <Link to="/scholarship/exams" className="btn btn-primary">
                <i className="ti ti-settings me-1"></i> Sınavları Yönet
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sınıflar Tab */}
      {selectedTab === 'classes' && (
        <div className="card">
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-6">
                <label className="form-label">Sınıf Seçiniz</label>
                <select
                  className="form-select"
                  value={selectedClassroomForBulk || ''}
                  onChange={(e) => setSelectedClassroomForBulk(Number(e.target.value))}
                >
                  <option value="">-- Sınıf Seçiniz --</option>
                  <optgroup label="Sınıf Düzeyi">
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={`level_${i + 1}`}>
                        {(i + 1)}. Sınıf
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Okul Sınıfları">
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.education_level.name} - {classroom.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="col-md-6 text-end d-flex align-items-end">
                <button
                  className="btn btn-primary"
                  onClick={handleBulkRegister}
                  disabled={!selectedClassroomForBulk}
                >
                  <i className="ti ti-users me-2"></i>Öğrencileri Getir
                </button>
              </div>
            </div>

            {!selectedClassroomForBulk && (
              <div className="text-center py-5">
                <i className="ti ti-funnel" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                <p className="text-muted mt-3 mb-0">Lütfen bir sınıf seçiniz</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* İstatistikler Tab */}
      {selectedTab === 'statistics' && statistics && (
        <div>
          {/* Toplam Kayıt Kartı */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="card-title mb-1">
                        <i className="ti ti-award me-2"></i>Toplam Aktif Kayıt
                      </h5>
                      <p className="card-text mb-0">Tüm bursluluk başvuru kayıtları</p>
                    </div>
                    <div className="fs-1 fw-bold">{statistics.total_active}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card bg-secondary text-white">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="card-title mb-1">
                        <i className="ti ti-archive me-2"></i>Arşivlenmiş Kayıt
                      </h5>
                      <p className="card-text mb-0">Arşivlenmiş bursluluk kayıtları</p>
                    </div>
                    <div className="fs-1 fw-bold">{statistics.total_archived}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sınıf Düzeyi İstatistikleri */}
          {statistics.class_level_stats.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-list-ol me-2"></i>Sınıf Düzeyi İstatistikleri
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {statistics.class_level_stats.map((stat) => (
                    <div key={stat.sinif_adi} className="col-md-3 col-sm-4 col-6">
                      <div className="card text-center">
                        <div className="card-body">
                          <div className="fs-3 text-primary mb-2">
                            <i className="ti ti-mortarboard-fill"></i>
                          </div>
                          <h3 className="card-title">{stat.count}</h3>
                          <p className="card-text text-muted">{stat.sinif_adi}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Okul Sınıfları İstatistikleri */}
          {statistics.classroom_stats.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-building me-2"></i>Okul Sınıfları İstatistikleri
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {statistics.classroom_stats.map((stat) => (
                    <div key={stat.classroom_id} className="col-md-3 col-sm-4 col-6">
                      <div className="card text-center">
                        <div className="card-body">
                          <div className="fs-3 text-primary mb-2">
                            <i className="ti ti-people-fill"></i>
                          </div>
                          <h3 className="card-title">{stat.count}</h3>
                          <p className="card-text text-muted">{stat.classroom_name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Arşiv Tab */}
      {selectedTab === 'archive' && (
        <div className="card">
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="app-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ad, soyad, T.C. kimlik, veli adı veya telefon ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="ti ti-search app-search-icon"></i>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Yükleniyor...</span>
                </div>
              </div>
            ) : scholarships.length === 0 ? (
              <div className="text-center py-5">
                <i className="ti ti-inbox" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                <p className="text-muted mt-3 mb-0">
                  {searchTerm ? `"${searchTerm}" araması için sonuç bulunamadı` : 'Arşivde kayıt yok'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>T.C. Kimlik</th>
                      <th>Ad Soyad</th>
                      <th>Okul</th>
                      <th>Sınıf</th>
                      <th>Veli Ad Soyad</th>
                      <th>Doğum Tarihi</th>
                      <th>Veli İletişim</th>
                      <th className="text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scholarships.map((scholarship) => (
                      <tr key={scholarship.id}>
                        <td className="fw-semibold">{scholarship.tc_kimlik}</td>
                        <td>{scholarship.ad_soyad}</td>
                        <td>{scholarship.okul_adi}</td>
                        <td>
                          {scholarship.sinif_adi ? (
                            <span className="badge bg-secondary">{scholarship.sinif_adi}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>{scholarship.veli_ad_soyad}</td>
                        <td>{formatDate(scholarship.dogum_tarihi || '')}</td>
                        <td>
                          <a href={`tel:${scholarship.veli_iletisim}`} className="text-decoration-none">
                            <i className="ti ti-phone me-1"></i>
                            {scholarship.veli_iletisim}
                          </a>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-success me-1"
                            onClick={() => handleRestore(scholarship.id)}
                            title="Geri Çağır"
                          >
                            <i className="ti ti-arrow-back-up"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(scholarship.id)}
                            title="Sil"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kayıt Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingScholarship ? 'Kayıt Düzenle' : 'Yeni Kayıt Ekle'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">T.C. Kimlik No <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.tc_kimlik}
                        onChange={(e) => setFormData({ ...formData, tc_kimlik: e.target.value })}
                        maxLength={11}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Ad Soyad <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.ad_soyad}
                        onChange={(e) => setFormData({ ...formData, ad_soyad: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Okul Adı <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.okul_adi}
                        onChange={(e) => setFormData({ ...formData, okul_adi: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Doğum Tarihi</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.dogum_tarihi}
                        onChange={(e) => setFormData({ ...formData, dogum_tarihi: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Veli Ad Soyad <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.veli_ad_soyad}
                        onChange={(e) => setFormData({ ...formData, veli_ad_soyad: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Veli İletişim <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.veli_iletisim}
                        onChange={(e) => setFormData({ ...formData, veli_iletisim: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingScholarship ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Kayıt Modal */}
      {showBulkModal && (
        <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Öğrenci Kaydet</h5>
                <button type="button" className="btn-close" onClick={() => setShowBulkModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <button
                    className="btn btn-primary me-2"
                    onClick={handleRegisterEntireClass}
                  >
                    <i className="ti ti-users me-2"></i>Tüm Sınıfı Kaydet
                  </button>
                  <span className="text-muted">veya aşağıdan öğrenci seçin:</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudents(studentsInClass.filter(s => !s.bursluluk_kayitli).map(s => s.id));
                              } else {
                                setSelectedStudents([]);
                              }
                            }}
                          />
                        </th>
                        <th>Ad Soyad</th>
                        <th>T.C. Kimlik</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsInClass.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              disabled={student.bursluluk_kayitli}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudents([...selectedStudents, student.id]);
                                } else {
                                  setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                }
                              }}
                            />
                          </td>
                          <td>{student.ad_soyad}</td>
                          <td>{student.tc_kimlik}</td>
                          <td>
                            {student.bursluluk_kayitli ? (
                              <span className="badge bg-success">Kayıtlı</span>
                            ) : (
                              <span className="badge bg-secondary">Kayıtsız</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>
                  İptal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBulkRegisterSubmit}
                  disabled={selectedStudents.length === 0}
                >
                  Seçili Öğrencileri Kaydet ({selectedStudents.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scholarships;
