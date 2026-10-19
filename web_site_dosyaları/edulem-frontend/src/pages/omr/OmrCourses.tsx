import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Course {
  id: number;
  name: string;
  code: string | null;
  coefficients: Record<string, number> | null;
  sort_order: number;
  is_active: boolean;
  topics_count?: number;
}

interface Topic {
  id: number;
  course_id: number;
  name: string;
  type: 'topic' | 'objective';
  sort_order: number;
}

const EXAM_TYPES = ['LGS', 'YKS-TYT', 'YKS-AYT', 'YKS-DIL', 'Bursluluk'];

const defaultCourse = { name: '', code: '', coefficients: {} as Record<string, number>, sort_order: 0, is_active: true };
const defaultTopic = { name: '', type: 'topic' as 'topic' | 'objective', sort_order: 0 };
const defaultBulk = { text: '', type: 'topic' as 'topic' | 'objective' };

export default function OmrCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Course modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState(defaultCourse);

  // Topics panel
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicForm, setTopicForm] = useState(defaultTopic);

  // Bulk add
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState(defaultBulk);
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/omr/courses');
      setCourses(res.data?.data?.courses ?? []);
    } catch {
      showToast('error', 'Dersler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  const fetchTopics = async (course: Course) => {
    setSelectedCourse(course);
    try {
      setTopicsLoading(true);
      const res = await axiosClient.get(`/omr/courses/${course.id}/topics`);
      setTopics(res.data?.data?.topics ?? []);
    } catch {
      showToast('error', 'Konular yüklenemedi');
    } finally {
      setTopicsLoading(false);
    }
  };

  // Course CRUD
  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm(defaultCourse);
    setShowCourseModal(true);
  };

  const openEditCourse = (c: Course) => {
    setEditingCourse(c);
    setCourseForm({ name: c.name, code: c.code ?? '', coefficients: c.coefficients ?? {}, sort_order: c.sort_order, is_active: c.is_active });
    setShowCourseModal(true);
  };

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingCourse) {
        await axiosClient.put(`/omr/courses/${editingCourse.id}`, courseForm);
        showToast('success', 'Ders güncellendi');
      } else {
        await axiosClient.post('/omr/courses', courseForm);
        showToast('success', 'Ders oluşturuldu');
      }
      setShowCourseModal(false);
      fetchCourses();
      if (selectedCourse?.id === editingCourse?.id) setSelectedCourse(null);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (c: Course) => {
    const ok = await confirmDialog({ text: `"${c.name}" dersini silmek istediğinizden emin misiniz?`, confirmText: 'Sil', cancelText: 'İptal', icon: 'warning' });
    if (!ok) return;
    try {
      await axiosClient.delete(`/omr/courses/${c.id}`);
      showToast('success', 'Ders silindi');
      if (selectedCourse?.id === c.id) setSelectedCourse(null);
      fetchCourses();
    } catch {
      showToast('error', 'Silme başarısız');
    }
  };

  // Topic CRUD
  const openCreateTopic = () => {
    setEditingTopic(null);
    setTopicForm(defaultTopic);
    setShowTopicModal(true);
  };

  const openEditTopic = (t: Topic) => {
    setEditingTopic(t);
    setTopicForm({ name: t.name, type: t.type, sort_order: t.sort_order });
    setShowTopicModal(true);
  };

  const saveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      setSaving(true);
      if (editingTopic) {
        await axiosClient.put(`/omr/courses/${selectedCourse.id}/topics/${editingTopic.id}`, topicForm);
        showToast('success', 'Konu/Kazanım güncellendi');
      } else {
        await axiosClient.post(`/omr/courses/${selectedCourse.id}/topics`, topicForm);
        showToast('success', 'Konu/Kazanım oluşturuldu');
      }
      setShowTopicModal(false);
      fetchTopics(selectedCourse);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const saveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    const lines = bulkForm.text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) { showToast('warning', 'En az bir satır girin'); return; }
    try {
      setBulkSaving(true);
      let successCount = 0;
      let currentOrder = topics.length;

      for (const line of lines) {
        try {
          await axiosClient.post(`/omr/courses/${selectedCourse.id}/topics`, {
            name: line,
            type: bulkForm.type,
            sort_order: currentOrder++,
          });
          successCount++;
        } catch (err) {
          console.error(`"${line}" eklenemedi`, err);
        }
      }

      if (successCount > 0) {
        showToast('success', `${successCount} konu/kazanım eklendi`);
        setShowBulkModal(false);
        setBulkForm(defaultBulk);
        fetchTopics(selectedCourse);
      } else {
        showToast('error', 'Konular eklenemedi');
      }
    } catch (err: any) {
      showToast('error', 'Toplu ekleme sırasında hata oluştu');
    } finally {
      setBulkSaving(false);
    }
  };

  const deleteTopic = async (t: Topic) => {
    if (!selectedCourse) return;
    const ok = await confirmDialog({ text: `"${t.name}" konusunu silmek istediğinizden emin misiniz?`, confirmText: 'Sil', cancelText: 'İptal', icon: 'warning' });
    if (!ok) return;
    try {
      await axiosClient.delete(`/omr/courses/${selectedCourse.id}/topics/${t.id}`);
      showToast('success', 'Konu/Kazanım silindi');
      fetchTopics(selectedCourse);
    } catch {
      showToast('error', 'Silme başarısız');
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Dersler ve Konu/Kazanımlar</h3>
          <p className="text-muted mb-0">OMR sınavları için ders tanımları ve konu/kazanım haritası.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-primary" onClick={openCreateCourse}>
            <i className="ti ti-plus me-1"></i> Yeni Ders
          </button>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item active fw-medium">OMR Kursları</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Sol: Ders Listesi */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="mb-0">Dersler</h6>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div></div>
              ) : courses.length === 0 ? (
                <div className="text-center py-4 text-muted">Henüz ders tanımlanmamış</div>
              ) : (
                <div className="list-group list-group-flush">
                  {courses.map(c => (
                    <div
                      key={c.id}
                      className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${selectedCourse?.id === c.id ? 'active' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => fetchTopics(c)}
                    >
                      <div>
                        <div className="fw-semibold">{c.name}</div>
                        <div className="small text-muted">
                          {c.code && <span className="me-2 badge bg-secondary">{c.code}</span>}
                          <span>{c.topics_count ?? 0} konu/kazanım</span>
                        </div>
                      </div>
                      <div className="d-flex gap-1" onClick={ev => ev.stopPropagation()}>
                        <button className="btn btn-xs btn-soft-primary" onClick={() => openEditCourse(c)} title="Düzenle">
                          <i className="ti ti-pencil"></i>
                        </button>
                        <button className="btn btn-xs btn-soft-danger" onClick={() => deleteCourse(c)} title="Sil">
                          <i className="ti ti-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: Konu/Kazanım Listesi */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light d-flex align-items-center justify-content-between">
              <h6 className="mb-0">
                {selectedCourse ? `${selectedCourse.name} — Konu / Kazanımlar` : 'Konu / Kazanımlar'}
              </h6>
              {selectedCourse && (
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-info text-white" onClick={() => { setBulkForm(defaultBulk); setShowBulkModal(true); }}>
                    <i className="ti ti-list me-1"></i> Toplu Ekle
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={openCreateTopic}>
                    <i className="ti ti-plus me-1"></i> Ekle
                  </button>
                </div>
              )}
            </div>
            <div className="card-body p-0">
              {!selectedCourse ? (
                <div className="text-center py-5 text-muted">
                  <i className="ti ti-arrow-left fs-3 d-block mb-2"></i>
                  Soldaki listeden bir ders seçin
                </div>
              ) : topicsLoading ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div></div>
              ) : topics.length === 0 ? (
                <div className="text-center py-4 text-muted">Bu ders için henüz konu/kazanım eklenmemiş</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Ad</th>
                        <th>Tür</th>
                        <th className="text-end">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map(t => (
                        <tr key={t.id}>
                          <td>{t.name}</td>
                          <td>
                            <span className={`badge ${t.type === 'objective' ? 'bg-info' : 'bg-secondary'}`}>
                              {t.type === 'objective' ? 'Kazanım' : 'Konu'}
                            </span>
                          </td>
                          <td className="text-end">
                            <button className="btn btn-xs btn-soft-primary me-1" onClick={() => openEditTopic(t)}><i className="ti ti-pencil"></i></button>
                            <button className="btn btn-xs btn-soft-danger" onClick={() => deleteTopic(t)}><i className="ti ti-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingCourse ? 'Ders Düzenle' : 'Yeni Ders'}</h5>
                <button className="btn-close" onClick={() => setShowCourseModal(false)}></button>
              </div>
              <form onSubmit={saveCourse}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label">Ders Adı <span className="text-danger">*</span></label>
                      <input className="form-control" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} required placeholder="Türkçe, Matematik..." />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Kısa Kod</label>
                      <input className="form-control" value={courseForm.code} onChange={e => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="TRK, MAT..." />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Sıra</label>
                      <input type="number" className="form-control" value={courseForm.sort_order} onChange={e => setCourseForm({ ...courseForm, sort_order: parseInt(e.target.value) || 0 })} min="0" />
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="is_active" checked={courseForm.is_active} onChange={e => setCourseForm({ ...courseForm, is_active: e.target.checked })} />
                        <label className="form-check-label" htmlFor="is_active">Aktif</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Sınav Türü Katsayıları</label>
                      <div className="row g-2">
                        {EXAM_TYPES.map(et => (
                          <div className="col-md-4" key={et}>
                            <label className="form-label small mb-1">{et}</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              step="0.01"
                              min="0"
                              placeholder="1.00"
                              value={courseForm.coefficients[et] ?? ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                const updated = { ...courseForm.coefficients };
                                if (isNaN(val)) delete updated[et];
                                else updated[et] = val;
                                setCourseForm({ ...courseForm, coefficients: updated });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowCourseModal(false)} disabled={saving}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Toplu Konu/Kazanım Ekle — {selectedCourse?.name}</h5>
                <button className="btn-close" onClick={() => setShowBulkModal(false)}></button>
              </div>
              <form onSubmit={saveBulk}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Tür</label>
                    <select className="form-select" value={bulkForm.type} onChange={e => setBulkForm({ ...bulkForm, type: e.target.value as 'topic' | 'objective' })}>
                      <option value="topic">Konu</option>
                      <option value="objective">Kazanım</option>
                    </select>
                  </div>
                  <div className="mb-1">
                    <label className="form-label fw-semibold">Konu/Kazanımlar <span className="text-danger">*</span></label>
                    <p className="text-muted small mb-1">Her satır ayrı bir konu/kazanım olarak kaydedilir. Kopyala-yapıştır yapabilirsiniz.</p>
                    <textarea
                      className="form-control font-monospace"
                      rows={12}
                      placeholder={`Örnek:\nSözcük Türleri\nCümle Yapısı\nParagraf Anlama\n...`}
                      value={bulkForm.text}
                      onChange={e => setBulkForm({ ...bulkForm, text: e.target.value })}
                      required
                    />
                    <div className="text-muted small mt-1">
                      {bulkForm.text.split('\n').filter(l => l.trim() !== '').length} satır algılandı
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowBulkModal(false)} disabled={bulkSaving}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={bulkSaving}>
                    {bulkSaving && <span className="spinner-border spinner-border-sm me-1"></span>}
                    Toplu Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingTopic ? 'Konu/Kazanım Düzenle' : 'Yeni Konu/Kazanım'}</h5>
                <button className="btn-close" onClick={() => setShowTopicModal(false)}></button>
              </div>
              <form onSubmit={saveTopic}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Ad <span className="text-danger">*</span></label>
                      <input className="form-control" value={topicForm.name} onChange={e => setTopicForm({ ...topicForm, name: e.target.value })} required placeholder="Sözcük Türleri, Denklemler..." />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Tür</label>
                      <select className="form-select" value={topicForm.type} onChange={e => setTopicForm({ ...topicForm, type: e.target.value as 'topic' | 'objective' })}>
                        <option value="topic">Konu</option>
                        <option value="objective">Kazanım</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Sıra</label>
                      <input type="number" className="form-control" value={topicForm.sort_order} onChange={e => setTopicForm({ ...topicForm, sort_order: parseInt(e.target.value) || 0 })} min="0" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowTopicModal(false)} disabled={saving}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
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
}
