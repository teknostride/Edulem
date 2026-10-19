import { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';
import SeasonFilter from '../../../components/shared/SeasonFilter';

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
  is_active: boolean;
}

const isForbiddenError = (error: any) => error?.response?.status === 403;

const deriveCampusesFromLevels = (levelItems: EducationLevel[]): Campus[] => {
  const map = new Map<number, Campus>();
  levelItems.forEach((level) => {
    if (!map.has(level.campus_id)) {
      map.set(level.campus_id, {
        id: level.campus_id,
        name: level.campus_name || `Kampüs #${level.campus_id}`,
        is_active: true,
      });
    }
  });
  return Array.from(map.values());
};

const EducationLevelKanban = () => {
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, id: number | null, name: string}>({show: false, id: null, name: ''});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');

  const fetchLevels = async () => {
    try {
      const response = await axiosClient.get('/education-levels', {
        params: {
          ...(seasonFilter && { season_id: seasonFilter })
        }
      });
      const data = response.data?.data?.education_levels || response.data?.education_levels || response.data?.data || response.data;
      const levelItems = Array.isArray(data) ? data : [];
      setLevels(levelItems);
      setCampuses((prev) => (prev.length > 0 ? prev : deriveCampusesFromLevels(levelItems)));
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Eğitim kademeleri yüklenemedi');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchLevels();
    fetchCampuses();
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
    setFormData({...formData, name, code});
  };

  const openAddModal = (campusId: number) => {
    setSelectedCampus(campusId);
    setFormData({ name: '', code: '' });
    setShowModal(true);
  };

  const openEdit = (level: EducationLevel) => {
    setEditingId(level.id);
    setSelectedCampus(level.campus_id);
    setFormData({
      name: level.name,
      code: level.code
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number, name: string) => {
    setDeleteModal({show: true, id, name});
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    
    try {
      await axiosClient.delete(`/education-levels/${deleteModal.id}`);
      showToast('success', 'Eğitim kademesi başarıyla silindi');
      setDeleteModal({show: false, id: null, name: ''});
      fetchLevels();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Eğitim kademesi silinemedi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast('error', 'Kademe adı zorunludur');
      return;
    }

    if (!formData.code.trim()) {
      showToast('error', 'Kademe kodu zorunludur');
      return;
    }

    if (!selectedCampus) {
      showToast('error', 'Kampüs seçimi zorunludur');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        campus_id: selectedCampus,
        ...(seasonFilter && { season_id: seasonFilter })
      };
      
      if (editingId) {
        await axiosClient.put(`/education-levels/${editingId}`, payload);
        showToast('success', 'Eğitim kademesi başarıyla güncellendi');
      } else {
        await axiosClient.post('/education-levels', payload);
        showToast('success', 'Eğitim kademesi başarıyla eklendi');
      }
      
      setFormData({ name: '', code: '' });
      setSelectedCampus(null);
      setEditingId(null);
      setShowModal(false);
      fetchLevels();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  const getLevelsByCampus = (campusId: number) => {
    return levels.filter(level => level.campus_id === campusId);
  };

  const filteredCampuses = campuses.filter(campus => {
    const matchesSearch = campus.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampusFilter = !selectedCampusFilter || campus.id.toString() === selectedCampusFilter;
    return matchesSearch && matchesCampusFilter;
  });

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
      {/* Page Title Head */}
      <div className="page-title-head d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Eğitim Kademe Yönetimi</h4>
        </div>

        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="javascript: void(0);">Ayarlar</a></li>
            <li className="breadcrumb-item active">Eğitim Kademeleri</li>
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
                placeholder="Kampüs ara..."
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
                  onChange={(e) => setSelectedCampusFilter(e.target.value)}
                >
                  <option value="">Tüm Kampüsler</option>
                  {campuses.map(campus => (
                    <option key={campus.id} value={campus.id}>{campus.name}</option>
                  ))}
                </select>
                <i className="ti ti-building app-search-icon text-muted"></i>
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

            {/* Add New Campus Button */}
            <button type="button" className="btn btn-primary ms-lg-auto" onClick={() => window.location.href = '/settings/campuses'}>
              <i className="ti ti-building me-1"></i>
              Kampüs Yönetimi
            </button>
          </div>

          <div className="card-body p-0">
            <div className="kanban-content bg-light bg-opacity-40">
              {campuses.length === 0 ? (
                <div className="text-center py-5">
                  <div className="avatar-lg bg-light rounded-circle mx-auto mb-3">
                    <i className="ti ti-building fs-40 text-muted"></i>
                  </div>
                  <h5 className="text-muted">Önce Kampüs Ekleyin</h5>
                  <p className="text-muted">Eğitim kademesi eklemek için önce kampüs oluşturmalısınız</p>
                  <button className="btn btn-primary" onClick={() => window.location.href = '/settings/campuses'}>
                    <i className="ti ti-building me-2"></i>
                    Kampüsleri Yönet
                  </button>
                </div>
              ) : (
                <div className="kanban-content bg-light bg-opacity-40">
                  {filteredCampuses.map((campus) => {
                    const campusLevels = getLevelsByCampus(campus.id);
                    return (
                      <div key={campus.id} className="kanban-board">
                        <div className="kanban-item py-2 px-3 d-flex align-items-center">
                          <h5 className="m-0">{campus.name} ({campusLevels.length})</h5>
                          <button 
                            className="ms-auto btn btn-sm btn-icon rounded-circle btn-primary"
                            onClick={() => openAddModal(campus.id)}
                          >
                            <i className="ti ti-plus"></i>
                          </button>
                        </div>
                        <div className="kanban-board-group px-2">
                          {campusLevels.length === 0 ? (
                            <div className="text-center py-4">
                              <i className="ti ti-school fs-30 text-muted mb-2 d-block"></i>
                              <p className="text-muted small mb-0">Henüz kademe eklenmemiş</p>
                              <button
                                className="btn btn-sm btn-outline-primary mt-2"
                                onClick={() => openAddModal(campus.id)}
                              >
                                <i className="ti ti-plus me-1"></i>
                                İlk Kademe Ekle
                              </button>
                            </div>
                          ) : (
                            <ul>
                              {campusLevels.map((level) => (
                                <li key={level.id} className="kanban-item">
                                  <div className="card mb-2 border border-light">
                                    <div className="card-body">
                                      <div className="d-flex align-items-center mb-2">
                                        <span className="badge bg-primary-subtle text-primary badge-label">{level.code}</span>
                                        <div className="ms-auto mt-n2">
                                          <div className="dropdown">
                                            <a href="#" className="btn btn-icon btn-sm btn-ghost-light text-muted" data-bs-toggle="dropdown">
                                              <i className="ti ti-dots-vertical fs-lg"></i>
                                            </a>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                              <li>
                                                <a className="dropdown-item" href="#" onClick={() => openEdit(level)}>
                                                  <i className="ti ti-edit me-2"></i>Düzenle
                                                </a>
                                              </li>
                                              <li>
                                                <a className="dropdown-item text-danger" href="#" onClick={() => handleDelete(level.id, level.name)}>
                                                  <i className="ti ti-trash me-2"></i>Sil
                                                </a>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>

                                      <h5 className="mb-2">
                                        <a href="#!" className="link-reset">{level.name}</a>
                                      </h5>

                                      <div className="d-flex justify-content-between align-items-center mb-n1 text-muted">
                                        <span className={`badge ${level.is_active ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                                          {level.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                        <small>ID: #{level.id}</small>
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
                  {editingId ? 'Eğitim Kademesi Düzenle' : 'Yeni Eğitim Kademesi Ekle'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Kampüs</label>
                    <input
                      type="text"
                      className="form-control"
                      value={campuses.find(c => c.id === selectedCampus)?.name || ''}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Kademe Adı *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={handleNameChange}
                      placeholder="Örn. İlkokul"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Kademe Kodu *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      placeholder="Otomatik oluşturulur"
                      required
                    />
                    <small className="text-muted">Kademe adına göre otomatik oluşturulur, manuel değiştirebilirsiniz</small>
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
              setDeleteModal({show: false, id: null, name: ''});
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Eğitim Kademesi Sil</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteModal({show: false, id: null, name: ''})} />
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <div className="avatar-lg bg-danger bg-opacity-10 rounded-circle mx-auto mb-3">
                    <i className="ti ti-trash fs-40 text-danger"></i>
                  </div>
                  <h5>Emin misiniz?</h5>
                  <p className="text-muted">
                    "{deleteModal.name}" eğitim kademesini silmek istediğinize emin misiniz?
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
                  onClick={() => setDeleteModal({show: false, id: null, name: ''})}
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

export default EducationLevelKanban;
