import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import Swal from 'sweetalert2';

interface Course {
  id: number;
  name: string;
  code: string | null;
}

interface CourseRule {
  course_id: number;
  start: number;
  length: number;
}

interface FieldRules {
  student_no: { start: number; length: number };
  booklet_type: { start: number; length: number } | null;
  courses: CourseRule[];
}

interface Template {
  id: number;
  name: string;
  exam_type: string;
  field_rules: FieldRules;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const EXAM_TYPES = ['LGS', 'YKS-TYT', 'YKS-AYT', 'YKS-DIL', 'Bursluluk', 'Diğer'];

const defaultForm = (): { name: string; exam_type: string; notes: string; is_active: boolean; field_rules: FieldRules } => ({
  name: '',
  exam_type: 'LGS',
  notes: '',
  is_active: true,
  field_rules: {
    student_no: { start: 0, length: 10 },
    booklet_type: { start: 10, length: 1 },
    courses: [],
  },
});

export default function OmrTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [previewLine, setPreviewLine] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [tRes, cRes] = await Promise.all([
        axiosClient.get('/omr/templates'),
        axiosClient.get('/omr/courses'),
      ]);
      setTemplates(tRes.data?.data?.templates ?? []);
      setCourses(cRes.data?.data?.courses ?? []);
    } catch {
      showToast('error', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setPreviewLine('');
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      exam_type: t.exam_type,
      notes: t.notes ?? '',
      is_active: t.is_active,
      field_rules: JSON.parse(JSON.stringify(t.field_rules)),
    });
    setPreviewLine('');
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        await axiosClient.put(`/omr/templates/${editing.id}`, form);
        showToast('success', 'Şablon güncellendi');
      } else {
        await axiosClient.post('/omr/templates', form);
        showToast('success', 'Şablon oluşturuldu');
      }
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (t: Template) => {
    const ok = await confirmDialog({ text: `"${t.name}" şablonunu silmek istediğinizden emin misiniz?`, confirmText: 'Sil', cancelText: 'İptal', icon: 'warning' });
    if (!ok) return;
    try {
      await axiosClient.delete(`/omr/templates/${t.id}`);
      showToast('success', 'Şablon silindi');
      fetchAll();
    } catch {
      showToast('error', 'Silme başarısız');
    }
  };

  const updateFieldRule = (field: 'student_no' | 'booklet_type', key: 'start' | 'length', val: number) => {
    setForm(prev => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        [field]: { ...(prev.field_rules[field] ?? { start: 0, length: 1 }), [key]: val },
      },
    }));
  };

  const openCreateCourseModal = async (targetRowIndex?: number) => {
    const res = await Swal.fire({
      title: 'Yeni Ders Tanımla',
      html: `
        <div class="text-start">
          <p class="text-muted small mb-2">Sistemde bulunmayan veya özel sınava ait ders adını girin. Bu ders kaydedildikten sonra listede yer alacaktır.</p>
          <label class="form-label small fw-bold">Ders Adı <span class="text-danger">*</span></label>
          <input id="swal-tpl-course-name" class="swal2-input m-0 w-100" placeholder="Örn: Biyoloji, Mantık, Özel Ders..." autofocus />
          <label class="form-label small fw-bold mt-2">Ders Kodu (Opsiyonel)</label>
          <input id="swal-tpl-course-code" class="swal2-input m-0 w-100" placeholder="Örn: BİY, MNT..." />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Kaydet ve Seç',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#0d6efd',
      focusConfirm: false,
      didOpen: () => {
        const input = document.getElementById('swal-tpl-course-name') as HTMLInputElement;
        input?.focus();
      },
      preConfirm: () => {
        const name = (document.getElementById('swal-tpl-course-name') as HTMLInputElement)?.value?.trim();
        const code = (document.getElementById('swal-tpl-course-code') as HTMLInputElement)?.value?.trim();
        if (!name) {
          Swal.showValidationMessage('Lütfen ders adını giriniz');
          return false;
        }
        return { name, code };
      },
    });

    if (!res.isConfirmed || !res.value) return;

    try {
      const postRes = await axiosClient.post('/omr/courses', {
        name: res.value.name,
        code: res.value.code || null,
        is_active: true,
      });
      const created: Course = postRes.data?.data?.course;
      if (created) {
        setCourses((prev) => {
          const exists = prev.some((c) => c.id === created.id);
          const updated = exists ? prev.map((c) => (c.id === created.id ? created : c)) : [...prev, created];
          return updated.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        });
        showToast('success', `"${created.name}" dersi eklendi.`);

        if (typeof targetRowIndex === 'number' && targetRowIndex >= 0) {
          updateCourseRule(targetRowIndex, 'course_id', created.id);
        } else {
          setForm((prev) => ({
            ...prev,
            field_rules: {
              ...prev.field_rules,
              courses: [...prev.field_rules.courses, { course_id: created.id, start: 0, length: 20 }],
            },
          }));
        }
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Ders eklenirken bir hata oluştu');
    }
  };

  const addCourseRule = () => {
    if (courses.length === 0) {
      openCreateCourseModal();
      return;
    }
    const usedIds = form.field_rules.courses.map(c => c.course_id);
    const available = courses.find(c => !usedIds.includes(c.id)) ?? courses[0];
    setForm(prev => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        courses: [...prev.field_rules.courses, { course_id: available.id, start: 0, length: 20 }],
      },
    }));
  };

  const updateCourseRule = (idx: number, key: keyof CourseRule, val: number) => {
    setForm(prev => {
      const updated = [...prev.field_rules.courses];
      updated[idx] = { ...updated[idx], [key]: val };
      return { ...prev, field_rules: { ...prev.field_rules, courses: updated } };
    });
  };

  const removeCourseRule = (idx: number) => {
    setForm(prev => ({
      ...prev,
      field_rules: { ...prev.field_rules, courses: prev.field_rules.courses.filter((_, i) => i !== idx) },
    }));
  };

  // Önizleme: verilen satırdan alanları çıkar
  const previewExtract = () => {
    if (!previewLine) return null;
    const rules = form.field_rules;
    const snRule = rules.student_no;
    const studentNoStart = Math.max(0, Number(snRule.start) - 1);
    const studentNoLen = Math.max(0, Number(snRule.length));
    const studentNo = previewLine.substring(studentNoStart, studentNoStart + studentNoLen);
    const btRule = rules.booklet_type;
    const bookletType = btRule
      ? previewLine.substring(
        Math.max(0, Number(btRule.start) - 1),
        Math.max(0, Number(btRule.start) - 1) + Math.max(0, Number(btRule.length)),
      )
      : '-';
    const courseResults = rules.courses.map(cr => {
      const course = courses.find(c => c.id === cr.course_id);
      const startIndex = Math.max(0, Number(cr.start) - 1);
      const len = Math.max(0, Number(cr.length));
      const answers = previewLine.substring(startIndex, startIndex + len);
      return { name: course?.name ?? `Ders ${cr.course_id}`, answers };
    });
    return { studentNo, bookletType, courseResults };
  };

  const preview = previewExtract();

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">OMR Şablonları</h3>
          <p className="text-muted mb-0">Optik okuyucu çıktı dosyalarını ayrıştırmak için alan kuralları tanımlayın.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="ti ti-plus me-1"></i> Yeni Şablon
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-file-description fs-1 d-block mb-2"></i>
              Henüz OMR şablonu tanımlanmamış
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Şablon Adı</th>
                    <th>Sınav Türü</th>
                    <th>Öğrenci No</th>
                    <th>Ders Sayısı</th>
                    <th>Durum</th>
                    <th className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div className="fw-semibold">{t.name}</div>
                        {t.notes && <div className="text-muted small">{t.notes}</div>}
                      </td>
                      <td><span className="badge bg-primary">{t.exam_type}</span></td>
                      <td className="font-monospace small">
                        Başlangıç: {t.field_rules?.student_no?.start}, Uzunluk: {t.field_rules?.student_no?.length}
                      </td>
                      <td>{t.field_rules?.courses?.length ?? 0} ders</td>
                      <td>
                        <span className={`badge ${t.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {t.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-soft-primary me-1" onClick={() => openEdit(t)}>
                          <i className="ti ti-pencil me-1"></i> Düzenle
                        </button>
                        <button className="btn btn-sm btn-soft-danger" onClick={() => deleteTemplate(t)}>
                          <i className="ti ti-trash me-1"></i> Sil
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

      {/* Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="fw-bold m-0">{editing ? 'OMR Şablonu Düzenle' : 'Yeni OMR Şablonu'}</h3>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={save}>
                <div className="modal-body">
                  <div className="row g-4">
                    {/* Sol: Temel Bilgiler */}
                    <div className="col-md-5">
                      <div className="card border-0 bg-body-tertiary mb-3">
                        <div className="card-body">
                          <h6 className="fw-semibold mb-3">Temel Bilgiler</h6>
                          <div className="mb-3">
                            <label className="form-label">Şablon Adı <span className="text-danger">*</span></label>
                            <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="LGS 8.Sınıf Şablonu" />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Sınav Türü <span className="text-danger">*</span></label>
                            <select className="form-select" value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })}>
                              {EXAM_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                            </select>
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Notlar</label>
                            <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                          </div>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="tpl_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                            <label className="form-check-label" htmlFor="tpl_active">Aktif</label>
                          </div>
                        </div>
                      </div>

                      {/* Önizleme */}
                      <div className="card border-0 bg-body-tertiary">
                        <div className="card-body">
                          <h6 className="fw-semibold mb-2">Satır Önizleme</h6>
                          <textarea
                            className="form-control font-monospace mb-2"
                            rows={3}
                            placeholder="Örnek bir satır yapıştırın..."
                            value={previewLine}
                            onChange={e => setPreviewLine(e.target.value)}
                          />
                          {preview && (
                            <div className="small">
                              <div className="mb-1"><strong>Öğrenci No:</strong> <code>{preview.studentNo}</code></div>
                              <div className="mb-1"><strong>Kitapçık:</strong> <code>{preview.bookletType}</code></div>
                              {preview.courseResults.map((cr, i) => (
                                <div key={i}><strong>{cr.name}:</strong> <code className="text-break">{cr.answers}</code></div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sağ: Alan Kuralları */}
                    <div className="col-md-7">
                      <h6 className="fw-semibold mb-3">Alan Kuralları <small className="text-muted fw-normal">(sabit genişlikli txt)</small></h6>

                      {/* Öğrenci No */}
                      <div className="card border mb-3">
                        <div className="card-header py-2">
                          <span className="fw-semibold">Öğrenci Numarası</span>
                        </div>
                        <div className="card-body py-2">
                          <div className="row g-2">
                            <div className="col-6">
                              <label className="form-label small">Başlangıç (1'den)</label>
                              <input type="number" className="form-control form-control-sm" min="0" value={form.field_rules.student_no.start} onChange={e => updateFieldRule('student_no', 'start', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="col-6">
                              <label className="form-label small">Uzunluk</label>
                              <input type="number" className="form-control form-control-sm" min="1" value={form.field_rules.student_no.length} onChange={e => updateFieldRule('student_no', 'length', parseInt(e.target.value) || 1)} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Kitapçık Türü */}
                      <div className="card border mb-3">
                        <div className="card-header py-2 d-flex align-items-center justify-content-between">
                          <span className="fw-semibold">Kitapçık Türü (A/B)</span>
                          <div className="form-check form-switch mb-0">
                            <input className="form-check-input" type="checkbox" id="has_booklet"
                              checked={!!form.field_rules.booklet_type}
                              onChange={e => setForm(prev => ({ ...prev, field_rules: { ...prev.field_rules, booklet_type: e.target.checked ? { start: 10, length: 1 } : null } }))}
                            />
                          </div>
                        </div>
                        {form.field_rules.booklet_type && (
                          <div className="card-body py-2">
                            <div className="row g-2">
                              <div className="col-6">
                                <label className="form-label small">Başlangıç (1'den)</label>
                                <input type="number" className="form-control form-control-sm" min="0" value={form.field_rules.booklet_type.start} onChange={e => updateFieldRule('booklet_type', 'start', parseInt(e.target.value) || 0)} />
                              </div>
                              <div className="col-6">
                                <label className="form-label small">Uzunluk</label>
                                <input type="number" className="form-control form-control-sm" min="1" value={form.field_rules.booklet_type.length} onChange={e => updateFieldRule('booklet_type', 'length', parseInt(e.target.value) || 1)} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ders Kuralları */}
                      <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                        <div>
                          <span className="fw-semibold">Ders Cevap Alanları</span>
                          <span className="text-muted small ms-2">(Özel veya standart sınav dersleri)</span>
                        </div>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => openCreateCourseModal()}>
                            <i className="ti ti-plus me-1"></i> Yeni Ders Tanımla
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={addCourseRule}>
                            <i className="ti ti-list-plus me-1"></i> Ders Ekle
                          </button>
                        </div>
                      </div>
                      {form.field_rules.courses.length === 0 ? (
                        <div className="text-muted small text-center py-3 border rounded">
                          Henüz ders kuralı eklenmedi. <strong>Ders Ekle</strong> veya <strong>Yeni Ders Tanımla</strong> butonuyla ders ekleyebilirsiniz.
                        </div>
                      ) : (
                        form.field_rules.courses.map((cr, idx) => (
                          <div className="card border mb-2" key={idx}>
                            <div className="card-body py-2">
                              <div className="row g-2 align-items-end">
                                <div className="col-md-4">
                                  <label className="form-label small">Ders</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={cr.course_id}
                                    onChange={e => {
                                      if (e.target.value === '__NEW__') {
                                        openCreateCourseModal(idx);
                                      } else {
                                        updateCourseRule(idx, 'course_id', parseInt(e.target.value));
                                      }
                                    }}
                                  >
                                    <option value="" disabled>-- Ders Seçin --</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    <option value="__NEW__" className="text-primary fw-bold">+ Yeni Ders Tanımla...</option>
                                  </select>
                                </div>
                                <div className="col-md-3">
                                  <label className="form-label small">Başlangıç (1'den)</label>
                                  <input type="number" className="form-control form-control-sm" min="0" value={cr.start} onChange={e => updateCourseRule(idx, 'start', parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="col-md-3">
                                  <label className="form-label small">Uzunluk</label>
                                  <input type="number" className="form-control form-control-sm" min="1" value={cr.length} onChange={e => updateCourseRule(idx, 'length', parseInt(e.target.value) || 1)} />
                                </div>
                                <div className="col-md-2">
                                  <button type="button" className="btn btn-sm btn-soft-danger w-100" onClick={() => removeCourseRule(idx)}>
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)} disabled={saving}>İptal</button>
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
