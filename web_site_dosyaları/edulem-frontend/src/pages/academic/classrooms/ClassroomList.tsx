import { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';
import Modal from '../../../components/common/Modal';
import SeasonFilter from '../../../components/shared/SeasonFilter';

interface Classroom {
  id: number;
  name: string;
  code: string;
  capacity: number;
  is_active: boolean;
  grade_level: string;
  education_level_name?: string;
  education_level_code?: string;
  teacher_name?: string;
}

interface EducationLevel {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  campus_id: number;
  campus_name?: string;
}

interface Campus {
  id: number;
  name: string;
}

const isForbiddenError = (error: any) => error?.response?.status === 403;

const deriveCampusesFromEducationLevels = (levels: EducationLevel[]): Campus[] => {
  const map = new Map<number, Campus>();
  levels.forEach((level) => {
    if (!map.has(level.campus_id)) {
      map.set(level.campus_id, {
        id: level.campus_id,
        name: level.campus_name || `Kampüs #${level.campus_id}`,
      });
    }
  });
  return Array.from(map.values());
};

const ClassroomKanban = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', capacity: 30 });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean, id: number | null, name: string }>({ show: false, id: null, name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('');
  const [selectedEducationFilter, setSelectedEducationFilter] = useState('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySeasons, setCopySeasons] = useState<any[]>([]);
  const [selectedCopySeason, setSelectedCopySeason] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');

  const fetchClassrooms = async () => {
    try {
      const response = await axiosClient.get('/classrooms', {
        params: {
          page: 1,
          per_page: 200,
          ...(seasonFilter && { season_id: seasonFilter })
        },
      });
      const data = response.data?.data?.classrooms || response.data?.classrooms || response.data?.data || response.data;
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Sınıflar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchEducationLevels = async () => {
    try {
      const response = await axiosClient.get('/education-levels', {
        params: {
          ...(seasonFilter && { season_id: seasonFilter })
        }
      });
      const data = response.data?.data?.education_levels || response.data?.education_levels || response.data?.data || response.data;
      const levelItems = Array.isArray(data) ? data.filter((el: EducationLevel) => el.is_active) : [];
      setEducationLevels(levelItems);
      setCampuses((prev) => (prev.length > 0 ? prev : deriveCampusesFromEducationLevels(levelItems)));
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Eğitim kademeleri yüklenemedi');
    }
  };

  const fetchCampuses = async () => {
    try {
      const response = await axiosClient.get('/campuses');
      const data = response.data?.data?.campuses || response.data?.campuses || response.data?.data || response.data;
      setCampuses(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!isForbiddenError(error)) {
        console.error('Error:', error);
        showToast('error', 'Kampüsler yüklenemedi');
      }
    }
  };

  const fetchSeasons = async () => {
    try {
      const response = await axiosClient.get('/seasons');
      const data = response.data.data?.seasons ?? response.data.seasons ?? response.data.data ?? response.data;
      setCopySeasons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Seasons fetch failed');
    }
  };

  useEffect(() => {
    fetchClassrooms();
    fetchEducationLevels();
    fetchCampuses();
    fetchSeasons();
  }, [seasonFilter]);

  const generateCode = (name: string) => {
    if (!name) return '';

    // Türkçe karakterleri İngilizce karakterlere çevir
    const normalized = name
      .toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C')
      .replace(/ı/g, 'I')
      .replace(/ğ/g, 'G')
      .replace(/ü/g, 'U')
      .replace(/ş/g, 'S')
      .replace(/ö/g, 'O')
      .replace(/ç/g, 'C')
      .replace(/[^A-Z0-9\s]/g, '')
      .trim();

    const words = normalized.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) return '';

    if (words.length === 1) {
      const base = words[0].slice(0, 3);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      return base + random;
    } else if (words.length === 2) {
      const base = words[0].slice(0, 2) + words[1].slice(0, 2);
      const random = Math.floor(Math.random() * 10).toString();
      return base + random;
    } else {
      const base = words.map(word => word[0]).join('') + words[0][1];
      const random = Math.floor(Math.random() * 10).toString();
      return base + random;
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const code = generateCode(name);
    setFormData({ ...formData, name, code });
  };

  const openAddModal = (educationLevelId: number) => {
    setSelectedEducationLevel(educationLevelId);
    setFormData({ name: '', code: '', capacity: 30 });
    setShowModal(true);
  };

  const openEdit = (classroom: Classroom) => {
    setEditingId(classroom.id);
    setSelectedEducationLevel(parseInt(classroom.grade_level));
    setFormData({
      name: classroom.name,
      code: classroom.code,
      capacity: classroom.capacity
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number, name: string) => {
    setDeleteModal({ show: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;

    try {
      await axiosClient.delete(`/classrooms/${deleteModal.id}`);
      showToast('success', 'Sınıf başarıyla silindi');
      setDeleteModal({ show: false, id: null, name: '' });
      fetchClassrooms();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Sınıf silinemedi');
    }
  };

  const handleBulkCopy = async () => {
    if (!selectedCopySeason) {
      showToast('error', 'Lütfen kopyalanacak sezonu seçin');
      return;
    }
    setSaving(true);
    try {
      await axiosClient.post('/classrooms/bulk-copy-from-season', {
        source_season_id: selectedCopySeason
      });
      showToast('success', 'Sınıflar başarıyla aktarıldı');
      setShowCopyModal(false);
      fetchClassrooms();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Aktarım başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('error', 'Sınıf adı zorunludur');
      return;
    }

    if (!formData.code.trim()) {
      showToast('error', 'Sınıf kodu zorunludur');
      return;
    }

    if (!selectedEducationLevel) {
      showToast('error', 'Eğitim kademesi seçimi zorunludur');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        capacity: formData.capacity,
        grade_level: selectedEducationLevel?.toString() || '',
        ...(seasonFilter && { season_id: seasonFilter })
      };

      if (editingId) {
        await axiosClient.put(`/classrooms/${editingId}`, payload);
        showToast('success', 'Sınıf başarıyla güncellendi');
      } else {
        await axiosClient.post('/classrooms', payload);
        showToast('success', 'Sınıf başarıyla eklendi');
      }

      setFormData({ name: '', code: '', capacity: 30 });
      setSelectedEducationLevel(null);
      setEditingId(null);
      setShowModal(false);
      fetchClassrooms();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  const getClassroomsByEducationLevel = (educationLevelId: number) => {
    return classrooms.filter(classroom => classroom.grade_level === educationLevelId.toString());
  };

  const filteredEducationLevels = educationLevels.filter(el => {
    const matchesSearch = el.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampusFilter = !selectedCampusFilter || el.campus_id.toString() === selectedCampusFilter;
    const matchesEducationFilter = !selectedEducationFilter || el.id.toString() === selectedEducationFilter;

    return matchesSearch && matchesCampusFilter && matchesEducationFilter;
  });

  // Kademe filtresi için sadece seçili kampüsteki kademeler
  const availableEducationLevels = selectedCampusFilter
    ? educationLevels.filter(el => el.campus_id.toString() === selectedCampusFilter)
    : educationLevels;

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
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Sınıf Yönetimi</h3>
          <p className="text-muted mb-0">Eğitim kademeleri bazında sınıfları yönetin.</p>
        </div>
        <div className="text-end d-none d-md-block ms-3">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
            <li className="breadcrumb-item"><a href="/academic" className="text-decoration-none text-muted">Akademik</a></li>
            <li className="breadcrumb-item active fw-medium">Sınıflar</li>
          </ol>
        </div>
      </div>

      {/* Modern Kanban Board */}
      <div className="outlook-box kanban-app">
        <div className="card h-100 mb-0 flex-grow-1">
          <div className="card-header border-light align-items-center gap-2">
            {/* Search Bar */}
            <div className="app-search">
              <input
                type="search"
                className="form-control"
                placeholder="Eğitim kademesi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="ti ti-search app-search-icon text-muted"></i>
            </div>

            {/* Filter Controls */}
            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Campus Filter */}
              <div className="app-search">
                <select
                  className="form-select form-control"
                  value={selectedCampusFilter}
                  onChange={(e) => {
                    setSelectedCampusFilter(e.target.value);
                    // Kampüs değiştiğinde kademe filtresini sıfırla
                    setSelectedEducationFilter('');
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
                  className="form-select form-control"
                  value={selectedEducationFilter}
                  onChange={(e) => setSelectedEducationFilter(e.target.value)}
                >
                  <option value="">Tüm Kademeler</option>
                  {availableEducationLevels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
                <i className="ti ti-school app-search-icon text-muted"></i>
              </div>

              {/* Season Filter */}
              <div className="app-search">
                <SeasonFilter 
                  value={seasonFilter} 
                  onChange={setSeasonFilter} 
                  className="form-select form-control"
                />
              </div>
            </div>

            {/* Add New Education Level Button */}
            <div className="d-flex gap-2 ms-lg-auto">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => setShowCopyModal(true)}
              >
                <i className="ti ti-copy me-1"></i>
                Sezondan Kopyala
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => (window.location.href = '/settings/education-levels')}
              >
                <i className="ti ti-school me-1"></i>
                Kademe Yönetimi
              </button>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="kanban-content bg-light bg-opacity-40">
              {educationLevels.length === 0 ? (
                <div className="text-center py-5">
                  <div className="avatar-lg bg-light rounded-circle mx-auto mb-3">
                    <i className="ti ti-school fs-40 text-muted"></i>
                  </div>
                  <h5 className="text-muted">Önce Eğitim Kademesi Ekleyin</h5>
                  <p className="text-muted">Sınıf eklemek için önce eğitim kademesi oluşturmalısınız</p>
                  <button className="btn btn-primary" onClick={() => window.location.href = '/settings/education-levels'}>
                    <i className="ti ti-school me-2"></i>
                    Eğitim Kademelerini Yönet
                  </button>
                </div>
              ) : (
                <div className="kanban-content bg-light bg-opacity-40">
                  {filteredEducationLevels.map((educationLevel) => {
                    const levelClassrooms = getClassroomsByEducationLevel(educationLevel.id);
                    return (
                      <div key={educationLevel.id} className="kanban-board">
                        <div className="kanban-item py-2 px-3 d-flex align-items-center">
                          <div>
                            <small className="text-muted d-block" style={{ fontSize: '11px' }}>
                              {campuses.find(c => c.id === educationLevel.campus_id)?.name || 'Bilinmeyen Kampüs'}
                            </small>
                            <h5 className="m-0">{educationLevel.name} ({levelClassrooms.length})</h5>
                          </div>
                          <button
                            className="ms-auto btn btn-sm btn-icon rounded-circle btn-primary"
                            onClick={() => openAddModal(educationLevel.id)}
                          >
                            <i className="ti ti-plus"></i>
                          </button>
                        </div>
                        <div className="kanban-board-group px-2">
                          {levelClassrooms.length === 0 ? (
                            <div className="text-center py-4">
                              <i className="ti ti-door fs-30 text-muted mb-2 d-block"></i>
                              <p className="text-muted small mb-0">Henüz sınıf eklenmemiş</p>
                              <button
                                className="btn btn-sm btn-outline-primary mt-2"
                                onClick={() => openAddModal(educationLevel.id)}
                              >
                                <i className="ti ti-plus me-1"></i>
                                İlk Sınıf Ekle
                              </button>
                            </div>
                          ) : (
                            <ul>
                              {levelClassrooms.map((classroom) => (
                                <li key={classroom.id} className="kanban-item">
                                  <div className="card mb-2 border border-light">
                                    <div className="card-body">
                                      <div className="d-flex align-items-center mb-2">
                                        <span className="badge bg-success-subtle text-success badge-label">{classroom.code}</span>
                                        <div className="ms-auto mt-n2">
                                          <div className="dropdown">
                                            <a href="#" className="btn btn-icon btn-sm btn-ghost-light text-muted" data-bs-toggle="dropdown">
                                              <i className="ti ti-dots-vertical fs-lg"></i>
                                            </a>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                              <li>
                                                <a className="dropdown-item" href="#" onClick={() => openEdit(classroom)}>
                                                  <i className="ti ti-edit me-2"></i>Düzenle
                                                </a>
                                              </li>
                                              <li>
                                                <a className="dropdown-item text-danger" href="#" onClick={() => handleDelete(classroom.id, classroom.name)}>
                                                  <i className="ti ti-trash me-2"></i>Sil
                                                </a>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>

                                      <h5 className="mb-2">
                                        <a href="#!" className="link-reset">{classroom.name}</a>
                                      </h5>

                                      <div className="d-flex justify-content-between align-items-center mb-n1 text-muted">
                                        <span className={`badge ${classroom.is_active ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                                          {classroom.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                        <span className="badge bg-light text-dark">
                                          <i className="ti ti-users me-1"></i>
                                          {classroom.capacity}
                                        </span>
                                        <small>ID: #{classroom.id}</small>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copy from Season Modal */}
      <Modal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        title="Sezondan Sınıf Kopyala"
        size="md"
      >
        <div className="p-2">
          <p className="text-muted mb-4">
            Başka bir sezondaki tüm sınıfları (isim çakışması olmayanları) bu sezona kopyalar.
          </p>
          <div className="mb-4">
            <label className="form-label">Kaynak Sezonu Seçin</label>
            <select
              className="form-select"
              value={selectedCopySeason}
              onChange={(e) => setSelectedCopySeason(e.target.value)}
            >
              <option value="">Sezon Seçiniz...</option>
              {copySeasons.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.year}</option>
              ))}
            </select>
          </div>
          <div className="alert alert-info">
            <i className="ti ti-info-circle me-2"></i>
            Sadece bu sezonda henüz bulunmayan sınıflar kopyalanacaktır.
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button className="btn btn-ghost-secondary" onClick={() => setShowCopyModal(false)}>İptal</button>
            <button
              className="btn btn-primary"
              onClick={handleBulkCopy}
              disabled={saving || !selectedCopySeason}
            >
              <i className="ti ti-copy me-2"></i>
              {saving ? 'Aktarılıyor...' : 'Sınıfları Aktar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
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
                  {editingId ? 'Sınıf Düzenle' : 'Yeni Sınıf Ekle'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Eğitim Kademesi</label>
                    <input
                      type="text"
                      className="form-control"
                      value={educationLevels.find(el => el.id === selectedEducationLevel)?.name || ''}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Sınıf Adı *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={handleNameChange}
                      placeholder="Örn. 9-A"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Sınıf Kodu *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Otomatik oluşturulur"
                      required
                    />
                    <small className="text-muted">Sınıf adına göre otomatik oluşturulur, manuel değiştirebilirsiniz</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Kapasite *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      placeholder="Örn. 30"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
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
              setDeleteModal({ show: false, id: null, name: '' });
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sınıf Sil</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteModal({ show: false, id: null, name: '' })} />
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <div className="avatar-lg bg-danger bg-opacity-10 rounded-circle mx-auto mb-3">
                    <i className="ti ti-trash fs-40 text-danger"></i>
                  </div>
                  <h5>Emin misiniz?</h5>
                  <p className="text-muted">
                    "{deleteModal.name}" sınıfını silmek istediğinize emin misiniz?
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
                  onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
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

export default ClassroomKanban;
