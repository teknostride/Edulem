import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import { getMyCampusIds, getMyEducationLevelIds, isUnrestrictedRole } from '../../utils/userScope';

interface Lesson {
  id: number;
  name: string;
  code: string;
  description?: string;
  color?: string;
  is_active: boolean;
  campus_id?: number | null;
  education_level_id?: number | null;
  education_level_ids?: number[];
  created_at: string;
  updated_at: string;
}

interface Campus {
  id: number;
  name: string;
}

interface EducationLevel {
  id: number;
  name: string;
  campus_id?: number | null;
}

const LessonList = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedEducationLevelId, setSelectedEducationLevelId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);

  useEffect(() => {
    fetchLessons();
  }, [currentPage, searchTerm, selectedCampusId, selectedEducationLevelId]);

  useEffect(() => {
    fetchCampuses();
    fetchEducationLevels();
  }, []);

  const fetchCampuses = async () => {
    try {
      const res = await axiosClient.get('/campuses?per_page=200');
      const raw = res.data?.data;
      const list = raw?.campuses ?? res.data?.campuses ?? raw?.data ?? res.data;
      setCampuses(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Kampüsler yüklenemedi:', e);
      setCampuses([]);
    }
  };

  const fetchEducationLevels = async () => {
    try {
      const res = await axiosClient.get('/education-levels?per_page=200');
      const raw = res.data?.data;
      const list = raw?.education_levels ?? res.data?.education_levels ?? raw?.data ?? res.data;
      setEducationLevels(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Kademeler yüklenemedi:', e);
      setEducationLevels([]);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(searchTerm && { search: searchTerm }),
      });
      if (selectedCampusId) params.set('campus_id', selectedCampusId);
      if (selectedEducationLevelId) params.set('education_level_id', selectedEducationLevelId);

      const response = await axiosClient.get(`/lessons?${params}`);
      const d = response.data?.data ?? response.data;

      let lessonsData: Lesson[] = [];
      if (Array.isArray(d?.lessons)) {
        lessonsData = d.lessons;
      } else if (Array.isArray(d?.data)) {
        lessonsData = d.data;
      } else if (Array.isArray(d)) {
        lessonsData = d;
      } else if (Array.isArray(response.data?.lessons)) {
        lessonsData = response.data.lessons;
      } else {
        lessonsData = [];
      }

      setLessons(lessonsData);

      const pag = d?.pagination ?? response.data?.pagination;
      if (pag?.last_page) setTotalPages(pag.last_page);
    } catch (error) {
      console.error('Dersler yüklenemedi:', error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const visibleEducationLevels = React.useMemo(() => {
    const campusId = selectedCampusId ? Number(selectedCampusId) : 0;
    if (!campusId) return educationLevels;
    return educationLevels.filter((l) => Number(l.campus_id || 0) === campusId);
  }, [educationLevels, selectedCampusId]);

  const campusNameById = React.useMemo(() => {
    const m = new Map<number, string>();
    campuses.forEach((c) => m.set(Number(c.id), c.name));
    return m;
  }, [campuses]);

  const educationLevelNameById = React.useMemo(() => {
    const m = new Map<number, string>();
    educationLevels.forEach((l) => m.set(Number(l.id), l.name));
    return m;
  }, [educationLevels]);

  const campusName = (campusId?: number | null) => {
    const id = Number(campusId || 0);
    if (!id) return '—';
    return campusNameById.get(id) || '—';
  };



  const lessonEducationLevelNames = (lesson: Lesson): string => {
    const idsRaw = Array.isArray(lesson.education_level_ids) ? lesson.education_level_ids : [];
    const ids = idsRaw
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const normalized = ids.length > 0
      ? ids
      : [Number(lesson.education_level_id || 0)].filter((id) => id > 0);

    if (normalized.length === 0) return '—';
    return normalized.map((id) => educationLevelNameById.get(id) || '—').join(', ');
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu dersi silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/lessons/${id}`);
      fetchLessons();
    } catch (error) {
      console.error('Ders silinemedi:', error);
      showToast('error', 'Ders silinirken bir hata oluştu.');
    }
  };

  const handleToggleActive = async (lesson: Lesson) => {
    try {
      await axiosClient.put(`/lessons/${lesson.id}`, {
        ...lesson,
        is_active: !lesson.is_active
      });
      fetchLessons();
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Ders Yönetimi</h3>
          <p className="text-muted mb-0">Kurum bünyesinde verilen dersleri ve renk tanımlamalarını yönetin.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="ti ti-plus me-1"></i> Yeni Ders
          </button>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item"><a href="/settings" className="text-decoration-none text-muted">Ayarlar</a></li>
              <li className="breadcrumb-item active fw-medium">Dersler</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-0 pt-4 pb-2">
          <div className="row align-items-center">
            <div className="col-md-3 mb-3 mb-md-0">
              <h5 className="card-title fw-bold m-0">
                <i className="ti ti-book me-2 text-primary"></i>Ders Listesi
              </h5>
            </div>
            <div className="col-md-9">
              <div className="row g-2">
                <div className="col-md-6">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ders adı veya kodu ile ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="input-group-text">
                      <i className="ti ti-search"></i>
                    </span>
                  </div>
                </div>

                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={selectedCampusId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedCampusId(v);
                      setSelectedEducationLevelId('');
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Tümü (Kampüs)</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={selectedEducationLevelId}
                    onChange={(e) => {
                      setSelectedEducationLevelId(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={!selectedCampusId}
                  >
                    <option value="">Tümü (Kademe)</option>
                    {visibleEducationLevels.map((l) => (
                      <option key={l.id} value={String(l.id)}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
              </div>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-5">
              <i className="ti ti-book fs-1 text-muted mb-3 d-block"></i>
              <p className="text-muted">
                {searchTerm || selectedCampusId || selectedEducationLevelId
                  ? 'Bu kriterlere uygun ders kaydı bulunamadı.'
                  : 'Henüz ders eklenmemiş.'}
              </p>
              {!searchTerm && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="ti ti-plus me-1"></i> İlk Dersi Ekle
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>No</th>
                    <th>Ders Adı</th>
                    <th>Kodu</th>
                    <th>Alan</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson, idx) => (
                    <tr key={lesson.id}>
                      <td className="text-muted">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="fw-medium">{(lesson.name || '').toLocaleUpperCase('tr-TR')}</div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark">{lesson.code || '—'}</span>
                      </td>
                      <td>
                        <div>
                          <div className="fw-medium">{campusName(lesson.campus_id)}</div>
                          <div className="text-muted small">{lessonEducationLevelNames(lesson)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className={`btn ${lesson.is_active ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                            onClick={() => handleToggleActive(lesson)}
                            title={lesson.is_active ? 'Pasife Al' : 'Aktif Et'}
                          >
                            <i className={lesson.is_active ? 'ti ti-toggle-right' : 'ti ti-toggle-left'}></i>
                          </button>
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => setEditingLesson(lesson)}
                          >
                            <i className="ti ti-edit"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(lesson.id)}
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="card-footer">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Sayfa {currentPage} / {totalPages}
              </small>
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <i className="ti ti-chevron-left"></i>
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <i className="ti ti-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLesson) && (
        <LessonModal
          lesson={editingLesson}
          campuses={campuses}
          educationLevels={educationLevels}
          onClose={() => {
            setShowCreateModal(false);
            setEditingLesson(null);
          }}
          onSave={() => {
            fetchLessons();
            setShowCreateModal(false);
            setEditingLesson(null);
          }}
        />
      )}
    </div>
  );
};

// Modal Component
const LessonModal = ({
  lesson,
  campuses,
  educationLevels,
  onClose,
  onSave
}: {
  lesson: Lesson | null;
  campuses: Campus[];
  educationLevels: EducationLevel[];
  onClose: () => void;
  onSave: () => void;
}) => {
  const myCampusIds = React.useMemo(() => getMyCampusIds(), []);
  const myEducationLevelIds = React.useMemo(() => getMyEducationLevelIds(), []);
  const unrestricted = React.useMemo(() => isUnrestrictedRole(), []);

  const [formData, setFormData] = useState({
    campus_id: lesson?.campus_id ?? '',
    education_level_id: lesson?.education_level_id ?? '',
    education_level_ids: Array.isArray(lesson?.education_level_ids)
      ? lesson?.education_level_ids?.map((id) => String(id))
      : (lesson?.education_level_id ? [String(lesson.education_level_id)] : []),
    all_education_levels: false,
    name: lesson?.name || '',
    is_active: lesson?.is_active ?? true
  });
  const [loading, setLoading] = useState(false);

  const scopedCampuses = React.useMemo(() => {
    if (unrestricted || myCampusIds.length === 0) return campuses;
    return campuses.filter((c) => myCampusIds.includes(Number(c.id)));
  }, [campuses, myCampusIds, unrestricted]);

  const scopedEducationLevels = React.useMemo(() => {
    if (unrestricted) return educationLevels;
    if (myEducationLevelIds.length > 0) {
      return educationLevels.filter((l) => myEducationLevelIds.includes(Number(l.id)));
    }
    if (myCampusIds.length > 0) {
      return educationLevels.filter((l) => myCampusIds.includes(Number(l.campus_id || 0)));
    }
    // Kullanıcının kapsam bilgisi yoksa tümünü göster (backend zaten tenant/role bazında filtreliyor)
    return educationLevels;
  }, [educationLevels, myCampusIds, myEducationLevelIds, unrestricted]);

  const availableEducationLevels = React.useMemo(() => {
    const campusId = formData.campus_id ? Number(formData.campus_id) : 0;
    if (!campusId) return scopedEducationLevels;
    return scopedEducationLevels.filter((l) => Number(l.campus_id || 0) === campusId);
  }, [scopedEducationLevels, formData.campus_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const campusId = formData.campus_id ? Number(formData.campus_id) : 0;
      if (!campusId) {
        showToast('error', 'Kampüs seçimi zorunludur.');
        return;
      }

      const selectedIds = Array.isArray(formData.education_level_ids)
        ? formData.education_level_ids
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
        : [];

      if (!formData.all_education_levels && selectedIds.length === 0) {
        showToast('error', 'En az bir kademe seçmelisiniz.');
        return;
      }

      const payload: any = {
        campus_id: campusId,
        name: formData.name,
        is_active: formData.is_active,
        all_education_levels: formData.all_education_levels,
      };

      if (!formData.all_education_levels) {
        payload.education_level_ids = selectedIds;
        payload.education_level_id = selectedIds[0] || null;
      } else {
        payload.education_level_ids = [];
        payload.education_level_id = null;
      }

      if (lesson) {
        await axiosClient.put(`/lessons/${lesson.id}`, payload);
      } else {
        await axiosClient.post('/lessons', payload);
      }
      onSave();
    } catch (error) {
      console.error('Kayıt hatası:', error);
      showToast('error', 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {lesson ? 'Ders Düzenle' : 'Yeni Ders Ekle'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Kampüs *</label>
                <select
                  className="form-select"
                  value={formData.campus_id}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({
                      ...formData,
                      campus_id: v,
                      education_level_id: '',
                      education_level_ids: [],
                      all_education_levels: false,
                    });
                  }}
                  required
                  disabled={loading}
                >
                  <option value="">Seçiniz</option>
                  {scopedCampuses.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label mb-0">Kademe *</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={formData.all_education_levels}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          all_education_levels: checked,
                          education_level_ids: checked ? [] : formData.education_level_ids,
                          education_level_id: checked ? '' : formData.education_level_id,
                        });
                      }}
                      disabled={loading || !formData.campus_id || !unrestricted}
                      id="all-education-levels"
                    />
                    <label className="form-check-label" htmlFor="all-education-levels">
                      Tüm kademeler
                    </label>
                  </div>
                </div>
                <select
                  className="form-select mt-2"
                  multiple
                  value={formData.education_level_ids}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setFormData({
                      ...formData,
                      education_level_ids: selected,
                      education_level_id: selected[0] || '',
                    });
                  }}
                  disabled={loading || !formData.campus_id || formData.all_education_levels}
                >
                  {availableEducationLevels.map((l) => (
                    <option key={l.id} value={String(l.id)}>{l.name}</option>
                  ))}
                </select>
                <div className="form-text">Birden fazla kademe seçebilirsiniz. Ctrl ile çoklu seçim yapabilirsiniz.</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Ders Adı *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
                <div className="form-text">Kısa kod otomatik oluşturulur (en fazla 5 karakter, örn. Mat, Mat10).</div>
              </div>
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={loading}
                  />
                  <label className="form-check-label">
                    Aktif
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                İptal
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <i className="ti ti-check me-1"></i>
                    {lesson ? 'Güncelle' : 'Kaydet'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LessonList;
