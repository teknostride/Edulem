import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface TimeSlot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  order: number;
  is_active: boolean;
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
  code?: string;
  campus_id?: number;
  campus_name?: string;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** HH:mm veya HH:mm:ss string'e dakika ekler, HH:mm döner */
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date(2000, 0, 1, h, m ?? 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const DEFAULT_DURATION_MINUTES = 45;

const isForbiddenError = (error: any) => error?.response?.status === 403;

const deriveCampusesFromEducationLevels = (levels: EducationLevel[]): Campus[] => {
  const map = new Map<number, Campus>();
  levels.forEach((level) => {
    if (level.campus_id != null && !map.has(level.campus_id)) {
      map.set(level.campus_id, {
        id: level.campus_id,
        name: level.campus_name || `Kampüs #${level.campus_id}`,
      });
    }
  });
  return Array.from(map.values());
};

const TimeSlotsList = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter] = useState<boolean | ''>('');
  const [selectedCampus, setSelectedCampus] = useState<number | ''>('');
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<number | ''>('');
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [adding, setAdding] = useState(false);
  const [inlineForm, setInlineForm] = useState({
    name: '',
    start_time: '08:00',
    end_time: '08:45',
    order: 1,
  });
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [editForm, setEditForm] = useState({ name: '', start_time: '08:00', end_time: '08:45', order: 1, is_active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  // Kampüs seçilince sadece o kampüse ait kademeler (ClassroomList ile aynı mantık)
  const availableEducationLevels = selectedCampus
    ? educationLevels.filter((el) => el.campus_id != null && el.campus_id === selectedCampus)
    : educationLevels;

  useEffect(() => {
    fetchCampuses();
    fetchEducationLevels();
  }, []);

  useEffect(() => {
    if (selectedCampus !== '' && selectedEducationLevel !== '') {
      fetchTimeSlots();
    } else {
      setTimeSlots([]);
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, selectedCampus, selectedEducationLevel]);

  // Yeni ekleme alanı her zaman bir önceki ders saatine göre başlasın (saat alanı otomatik gelsin)
  const canAddInline = selectedCampus !== '' && selectedEducationLevel !== '';
  useEffect(() => {
    if (!canAddInline) return;
    if (timeSlots.length === 0) {
      setInlineForm((prev) => ({
        ...prev,
        start_time: '08:00',
        end_time: addMinutesToTime('08:00', DEFAULT_DURATION_MINUTES),
        order: 1,
      }));
    } else {
      const last = timeSlots[timeSlots.length - 1];
      const lastEnd = last.end_time?.substring(0, 5) || last.end_time || '08:45';
      setInlineForm((prev) => ({
        ...prev,
        start_time: lastEnd,
        end_time: addMinutesToTime(lastEnd, DEFAULT_DURATION_MINUTES),
        order: timeSlots.length + 1,
      }));
    }
  }, [canAddInline, timeSlots]);

  const fetchCampuses = async () => {
    try {
      const response = await axiosClient.get('/campuses');
      const data = response.data?.data?.campuses ?? response.data?.campuses ?? response.data?.data ?? response.data;
      setCampuses(Array.isArray(data) ? data : []);
    } catch (error) {
      if (!isForbiddenError(error)) {
        console.error('Kampüsler yüklenemedi:', error);
      }
    }
  };

  const fetchEducationLevels = async () => {
    try {
      const response = await axiosClient.get('/education-levels');
      const data = response.data?.data?.education_levels ?? response.data?.education_levels ?? response.data?.data ?? response.data;
      const levelItems = Array.isArray(data) ? data : [];
      setEducationLevels(levelItems);
      setCampuses((prev) => (prev.length > 0 ? prev : deriveCampusesFromEducationLevels(levelItems)));
    } catch (error) {
      console.error('Eğitim kademeleri yüklenemedi:', error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: currentPage.toString(),
        search: searchTerm,
      };
      if (statusFilter !== '') params.is_active = statusFilter.toString();
      if (selectedCampus !== '') params.campus_id = selectedCampus.toString();
      if (selectedEducationLevel !== '') params.education_level_id = selectedEducationLevel.toString();

      const response = await axiosClient.get(`/time-slots?${new URLSearchParams(params)}`);
      setTimeSlots(response.data.data ?? []);
      setPagination(response.data.meta ?? null);
    } catch (error) {
      console.error('Ders saatleri yüklenemedi:', error);
      showToast('error', 'Ders saatleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu ders saatini silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/time-slots/${id}`);
      showToast('success', 'Ders saati başarıyla silindi');
      fetchTimeSlots();
    } catch (error) {
      console.error('Ders saati silinemedi:', error);
      showToast('error', 'Ders saati silinemedi');
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60); // dakika
    return diff;
  };

  const openEditModal = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setEditForm({
      name: slot.name,
      start_time: slot.start_time?.substring(0, 5) || '08:00',
      end_time: slot.end_time?.substring(0, 5) || '08:45',
      order: slot.order,
      is_active: slot.is_active,
    });
  };

  const closeEditModal = () => {
    setEditingSlot(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    if (!editForm.name.trim()) {
      showToast('error', 'Ders saati adı zorunludur');
      return;
    }
    if (editForm.start_time >= editForm.end_time) {
      showToast('error', 'Bitiş saati başlangıç saatinden sonra olmalıdır');
      return;
    }
    try {
      setSavingEdit(true);
      await axiosClient.put(`/time-slots/${editingSlot.id}`, {
        name: editForm.name.trim(),
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        order: editForm.order,
        is_active: editForm.is_active,
      });
      showToast('success', 'Ders saati güncellendi');
      closeEditModal();
      fetchTimeSlots();
    } catch (error) {
      console.error('Ders saati güncellenemedi:', error);
      showToast('error', 'Ders saati güncellenemedi');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleInlineAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddInline) return;
    if (!inlineForm.name.trim()) {
      showToast('error', 'Ders saati adı zorunludur');
      return;
    }
    if (inlineForm.start_time >= inlineForm.end_time) {
      showToast('error', 'Bitiş saati başlangıç saatinden sonra olmalıdır');
      return;
    }
    try {
      setAdding(true);
      const campusId = Number(selectedCampus);
      const educationLevelId = Number(selectedEducationLevel);
      const payload = {
        name: inlineForm.name.trim(),
        start_time: inlineForm.start_time,
        end_time: inlineForm.end_time,
        order: inlineForm.order,
        is_active: true,
        break_duration: 0,
        campus_id: campusId,
        education_level_id: educationLevelId,
      };
      await axiosClient.post('/time-slots', payload);
      showToast('success', 'Ders saati eklendi');
      setInlineForm((prev) => ({ ...prev, name: '' }));
      fetchTimeSlots();
    } catch (error) {
      console.error('Ders saati eklenemedi:', error);
      showToast('error', 'Ders saati eklenemedi');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Kurum Saatleri</h3>
          <p className="text-muted mb-0">Kampüs ve eğitim kademesi bazında ders saatlerini yönetin.</p>
        </div>
      </div>

      {/* Filtreler - academic/classrooms ile aynı yapı */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Kampüs</label>
              <select
                className="form-select"
                value={selectedCampus === '' ? '' : selectedCampus}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCampus(val === '' ? '' : Number(val));
                  setSelectedEducationLevel('');
                }}
              >
                <option value="">Tüm Kampüsler</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Eğitim Kademesi</label>
              <select
                className="form-select"
                value={selectedEducationLevel === '' ? '' : selectedEducationLevel}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEducationLevel(val === '' ? '' : Number(val));
                }}
              >
                <option value="">Tüm Kademeler</option>
                {availableEducationLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Liste - sadece kampüs ve kademe seçiliyken göster */}
      {!canAddInline ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="ti ti-clock fs-1 text-muted d-block mb-3"></i>
            <h5 className="text-muted mb-2">Ders saatlerini görmek için seçim yapın</h5>
            <p className="text-muted mb-0">
              Kampüs ve eğitim kademesi seçtiğinizde, o kademeye ait ders saatleri listelenecektir.
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Yükleniyor...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Sıra</th>
                        <th>Ders Saati Adı</th>
                        <th>Başlangıç</th>
                        <th>Bitiş</th>
                        <th>Süre</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4">
                            <form onSubmit={handleInlineAdd} className="row g-3 align-items-end">
                              <div className="col-auto flex-grow-1">
                                <label className="form-label small mb-1">Ders saati adı</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Örn: 1. Ders"
                                  value={inlineForm.name}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, name: e.target.value }))}
                                />
                              </div>
                              <div className="col-auto">
                                <label className="form-label small mb-1">Başlangıç</label>
                                <input
                                  type="time"
                                  className="form-control form-control-sm"
                                  value={inlineForm.start_time}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, start_time: e.target.value }))}
                                />
                              </div>
                              <div className="col-auto">
                                <label className="form-label small mb-1">Bitiş</label>
                                <input
                                  type="time"
                                  className="form-control form-control-sm"
                                  value={inlineForm.end_time}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, end_time: e.target.value }))}
                                />
                              </div>
                              <div className="col-auto">
                                <label className="form-label small mb-1">Sıra</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="form-control form-control-sm"
                                  style={{ width: '70px' }}
                                  value={inlineForm.order}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, order: parseInt(e.target.value, 10) || 1 }))}
                                />
                              </div>
                              <div className="col-auto">
                                <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                                  {adding ? (
                                    <span className="spinner-border spinner-border-sm" />
                                  ) : (
                                    <>
                                      <i className="ti ti-plus me-1"></i>
                                      Ekle
                                    </>
                                  )}
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        timeSlots.map((timeSlot) => (
                          <tr key={timeSlot.id}>
                            <td>{timeSlot.order}</td>
                            <td>
                              <div>
                                <div className="fw-medium">{timeSlot.name}</div>
                                <small className="text-muted">
                                  {calculateDuration(timeSlot.start_time, timeSlot.end_time)} dakika
                                </small>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-soft-primary text-primary">
                                {formatTime(timeSlot.start_time)}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-soft-success text-success">
                                {formatTime(timeSlot.end_time)}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-soft-info text-info">
                                {calculateDuration(timeSlot.start_time, timeSlot.end_time)} dk
                              </span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary"
                                  onClick={() => openEditModal(timeSlot)}
                                  title="Düzenle"
                                >
                                  <i className="ti ti-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(timeSlot.id)}
                                  title="Sil"
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                      {canAddInline && timeSlots.length > 0 && (
                        <tr className="table-light">
                          <td colSpan={6} className="py-3">
                            <form onSubmit={handleInlineAdd} className="row g-2 align-items-end flex-nowrap">
                              <div className="col-auto flex-grow-1 min-w-0">
                                <label className="form-label small mb-0 d-block">Yeni ders saati</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Ad (örn: 1. Ders)"
                                  value={inlineForm.name}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, name: e.target.value }))}
                                />
                              </div>
                              <div className="col-auto">
                                <label className="form-label small mb-0 d-block">Başlangıç</label>
                                <input
                                  type="time"
                                  className="form-control form-control-sm"
                                  value={inlineForm.start_time}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, start_time: e.target.value }))}
                                />
                              </div>
                              <div className="col-auto">
                                <label className="form-label small mb-0 d-block">Bitiş</label>
                                <input
                                  type="time"
                                  className="form-control form-control-sm"
                                  value={inlineForm.end_time}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, end_time: e.target.value }))}
                                />
                              </div>
                              <div className="col-auto">
                                <label className="form-label small mb-0 d-block">Sıra</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="form-control form-control-sm"
                                  style={{ width: '60px' }}
                                  value={inlineForm.order}
                                  onChange={(e) => setInlineForm((p) => ({ ...p, order: parseInt(e.target.value, 10) || 1 }))}
                                />
                              </div>
                              <div className="col-auto">
                                <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                                  {adding ? <span className="spinner-border spinner-border-sm" /> : <><i className="ti ti-plus me-1"></i>Ekle</>}
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sayfalama */}
                {pagination && pagination.last_page > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted">
                      Toplam {pagination.total} ders saati
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Düzenleme modalı */}
      {editingSlot && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">Ders Saati Düzenle</h5>
                  <button type="button" className="btn-close" onClick={closeEditModal} aria-label="Kapat" />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Ders saati adı <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Örn: 1. Ders"
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Başlangıç</label>
                      <input
                        type="time"
                        className="form-control"
                        value={editForm.start_time}
                        onChange={(e) => setEditForm((p) => ({ ...p, start_time: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Bitiş</label>
                      <input
                        type="time"
                        className="form-control"
                        value={editForm.end_time}
                        onChange={(e) => setEditForm((p) => ({ ...p, end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mb-3 mt-2">
                    <label className="form-label">Sıra no</label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      value={editForm.order}
                      onChange={(e) => setEditForm((p) => ({ ...p, order: parseInt(e.target.value, 10) || 1 }))}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={closeEditModal}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                    {savingEdit ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotsList;
