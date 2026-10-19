import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import Swal from 'sweetalert2';

interface Course {
  id: number;
  name: string;
}

interface PositionRule {
  start: number;
  length: number;
}

interface CourseRule extends PositionRule {
  course_id: number;
}

interface CustomFieldRule extends PositionRule {
  key: string;
  label: string;
}

interface FieldRules {
  tc_no: PositionRule | null;
  school_no: PositionRule;
  full_name: PositionRule | null;
  classroom_section: PositionRule | null;
  gender: PositionRule | null;
  booklet_type: PositionRule;
  custom_fields: CustomFieldRule[];
  courses: CourseRule[];
}

interface Template {
  id: number;
  name: string;
  exam_type: string;
  field_rules: FieldRules;
  notes: string | null;
  is_active: boolean;
}

const EXAM_TYPES = ['LGS', 'YKS-TYT', 'YKS-AYT', 'YKS-DIL', 'Bursluluk', 'Diğer'];

const defaultRules = (): FieldRules => ({
  tc_no: null,
  school_no: { start: 0, length: 10 },
  full_name: null,
  classroom_section: null,
  gender: null,
  booklet_type: { start: 10, length: 1 },
  custom_fields: [],
  courses: [],
});

const defaultForm = () => ({
  name: '',
  exam_type: 'LGS',
  notes: '',
  is_active: true,
  field_rules: defaultRules(),
});

export default function OmrTemplatesBuilder() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

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
      showToast('error', 'Şablon verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
      field_rules: {
        ...defaultRules(),
        ...(t.field_rules ?? {}),
        custom_fields: Array.isArray(t.field_rules?.custom_fields) ? t.field_rules.custom_fields : [],
        courses: Array.isArray(t.field_rules?.courses) ? t.field_rules.courses : [],
      },
    });
    setPreviewLine('');
    setShowModal(true);
  };

  const saveTemplate = async (e: React.FormEvent) => {
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
      showToast('error', err?.response?.data?.message ?? 'Şablon kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (t: Template) => {
    const ok = await confirmDialog({
      text: `"${t.name}" şablonunu silmek istediğinizden emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/omr/templates/${t.id}`);
      showToast('success', 'Şablon silindi');
      fetchAll();
    } catch {
      showToast('error', 'Şablon silinemedi');
    }
  };

  const updateRule = (field: keyof Omit<FieldRules, 'custom_fields' | 'courses'>, key: keyof PositionRule, value: number) => {
    setForm((prev) => {
      const current = prev.field_rules[field];
      return {
        ...prev,
        field_rules: {
          ...prev.field_rules,
          [field]: { ...(current ?? { start: 0, length: 1 }), [key]: value },
        },
      };
    });
  };

  const toggleRule = (field: keyof Omit<FieldRules, 'school_no' | 'booklet_type' | 'custom_fields' | 'courses'>, enabled: boolean) => {
    setForm((prev) => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        [field]: enabled ? { start: 0, length: 1 } : null,
      },
    }));
  };

  const addCustomField = () => {
    setForm((prev) => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        custom_fields: [...prev.field_rules.custom_fields, { key: '', label: '', start: 0, length: 1 }],
      },
    }));
  };

  const updateCustomField = (idx: number, patch: Partial<CustomFieldRule>) => {
    setForm((prev) => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        custom_fields: prev.field_rules.custom_fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
      },
    }));
  };

  const removeCustomField = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        custom_fields: prev.field_rules.custom_fields.filter((_, i) => i !== idx),
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
          <input id="swal-new-course-name" class="swal2-input m-0 w-100" placeholder="Örn: Biyoloji, Mantık, Özel Ders..." autofocus />
          <label class="form-label small fw-bold mt-2">Ders Kodu (Opsiyonel)</label>
          <input id="swal-new-course-code" class="swal2-input m-0 w-100" placeholder="Örn: BİY, MNT..." />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Kaydet ve Seç',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#0d6efd',
      focusConfirm: false,
      didOpen: () => {
        const input = document.getElementById('swal-new-course-name') as HTMLInputElement;
        input?.focus();
      },
      preConfirm: () => {
        const name = (document.getElementById('swal-new-course-name') as HTMLInputElement)?.value?.trim();
        const code = (document.getElementById('swal-new-course-code') as HTMLInputElement)?.value?.trim();
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
          updateCourseRule(targetRowIndex, { course_id: created.id });
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
    const selected = new Set(form.field_rules.courses.map((c) => c.course_id));
    const candidate = courses.find((c) => !selected.has(c.id)) ?? courses[0];

    setForm((prev) => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        courses: [...prev.field_rules.courses, { course_id: candidate.id, start: 0, length: 20 }],
      },
    }));
  };

  const updateCourseRule = (idx: number, patch: Partial<CourseRule>) => {
    setForm((prev) => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        courses: prev.field_rules.courses.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
      },
    }));
  };

  const removeCourseRule = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      field_rules: {
        ...prev.field_rules,
        courses: prev.field_rules.courses.filter((_, i) => i !== idx),
      },
    }));
  };

  const extract = (rule: PositionRule | null) => {
    if (!rule || !previewLine) return '';
    const startIndex = Math.max(0, Number(rule.start) - 1);
    const len = Math.max(0, Number(rule.length));
    return previewLine.substring(startIndex, startIndex + len);
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">OMR Şablon Sihirbazı</h3>
          <p className="text-muted mb-0">Dinamik sabit-genişlik ayrıştırma kuralları (zorunlu + özel alanlar).</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-primary" onClick={openCreate}><i className="ti ti-plus me-1"></i>Yeni Şablon</button>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item active fw-medium">OMR Şablonları</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Şablon</th>
                    <th>Sınav Türü</th>
                    <th>Zorunlu Alanlar</th>
                    <th>Özel Alan</th>
                    <th>Ders Alanı</th>
                    <th>Durum</th>
                    <th className="text-end">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.name}</td>
                      <td>{t.exam_type}</td>
                      <td><span className="badge bg-secondary">OkulNo + Kitapçık</span></td>
                      <td>{t.field_rules?.custom_fields?.length ?? 0}</td>
                      <td>{t.field_rules?.courses?.length ?? 0}</td>
                      <td><span className={`badge ${t.is_active ? 'bg-success' : 'bg-secondary'}`}>{t.is_active ? 'Aktif' : 'Pasif'}</span></td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-soft-primary me-1" onClick={() => openEdit(t)}>Düzenle</button>
                        <button className="btn btn-sm btn-soft-danger" onClick={() => deleteTemplate(t)}>Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="fw-bold m-0">{editing ? 'Şablon Düzenle' : 'Yeni Şablon'}</h3>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={saveTemplate}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-4"><label className="form-label">Şablon Adı</label><input className="form-control" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></div>
                    <div className="col-md-3"><label className="form-label">Sınav Türü</label><select className="form-select" value={form.exam_type} onChange={(e) => setForm((p) => ({ ...p, exam_type: e.target.value }))}>{EXAM_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
                    <div className="col-md-3"><label className="form-label">Durum</label><select className="form-select" value={String(form.is_active)} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'true' }))}><option value="true">Aktif</option><option value="false">Pasif</option></select></div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-8">
                      <div className="card border">
                        <div className="card-header"><strong>Zorunlu Alanlar (Step 1)</strong></div>
                        <div className="card-body">
                          <div className="row g-2">
                            <div className="col-md-6"><label className="form-label small">Okul No Başlangıç (1'den)</label><input type="number" className="form-control form-control-sm" value={form.field_rules.school_no.start} onChange={(e) => updateRule('school_no', 'start', Number(e.target.value || 0))} /></div>
                            <div className="col-md-6"><label className="form-label small">Okul No Uzunluk</label><input type="number" className="form-control form-control-sm" value={form.field_rules.school_no.length} onChange={(e) => updateRule('school_no', 'length', Number(e.target.value || 1))} /></div>
                            <div className="col-md-6"><label className="form-label small">Kitapçık Başlangıç (1'den)</label><input type="number" className="form-control form-control-sm" value={form.field_rules.booklet_type.start} onChange={(e) => updateRule('booklet_type', 'start', Number(e.target.value || 0))} /></div>
                            <div className="col-md-6"><label className="form-label small">Kitapçık Uzunluk</label><input type="number" className="form-control form-control-sm" value={form.field_rules.booklet_type.length} onChange={(e) => updateRule('booklet_type', 'length', Number(e.target.value || 1))} /></div>
                          </div>

                          {(['tc_no', 'full_name', 'classroom_section', 'gender'] as const).map((f) => {
                            const enabled = !!form.field_rules[f];
                            const labelMap: Record<string, string> = {
                              tc_no: 'TC Kimlik',
                              full_name: 'Ad Soyad',
                              classroom_section: 'Sınıf Şube',
                              gender: 'Cinsiyet'
                            };
                            return (
                              <div key={f} className="border rounded p-2 mt-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="fw-semibold">{labelMap[f]}</span>
                                  <div className="form-check form-switch mb-0">
                                    <input className="form-check-input" type="checkbox" checked={enabled} onChange={(e) => toggleRule(f, e.target.checked)} />
                                  </div>
                                </div>
                                {enabled && (
                                  <div className="row g-2">
                                    <div className="col-6"><input type="number" className="form-control form-control-sm" value={form.field_rules[f]!.start} onChange={(e) => updateRule(f, 'start', Number(e.target.value || 0))} /></div>
                                    <div className="col-6"><input type="number" className="form-control form-control-sm" value={form.field_rules[f]!.length} onChange={(e) => updateRule(f, 'length', Number(e.target.value || 1))} /></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="card border mt-3">
                        <div className="card-header d-flex justify-content-between align-items-center"><strong>Özel Alanlar</strong><button type="button" className="btn btn-sm btn-outline-primary" onClick={addCustomField}>Özel Alan Ekle</button></div>
                        <div className="card-body">
                          {form.field_rules.custom_fields.length === 0 ? <div className="text-muted small">Özel alan yok.</div> : form.field_rules.custom_fields.map((cf, i) => (
                            <div className="row g-2 align-items-end mb-2" key={i}>
                              <div className="col-md-3"><label className="form-label small">Anahtar</label><input className="form-control form-control-sm" value={cf.key} onChange={(e) => updateCustomField(i, { key: e.target.value })} /></div>
                              <div className="col-md-3"><label className="form-label small">Etiket</label><input className="form-control form-control-sm" value={cf.label} onChange={(e) => updateCustomField(i, { label: e.target.value })} /></div>
                              <div className="col-md-2"><label className="form-label small">Başlangıç (1'den)</label><input type="number" className="form-control form-control-sm" value={cf.start} onChange={(e) => updateCustomField(i, { start: Number(e.target.value || 0) })} /></div>
                              <div className="col-md-2"><label className="form-label small">Uzunluk</label><input type="number" className="form-control form-control-sm" value={cf.length} onChange={(e) => updateCustomField(i, { length: Number(e.target.value || 1) })} /></div>
                              <div className="col-md-2"><button type="button" className="btn btn-sm btn-soft-danger w-100" onClick={() => removeCustomField(i)}>Sil</button></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="card border mt-3">
                        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <div>
                            <strong>Ders Cevap Alanları</strong>
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
                        <div className="card-body">
                          {form.field_rules.courses.length === 0 ? (
                            <div className="text-muted small text-center py-3 border rounded">
                              Ders alanı yok. <strong>Ders Ekle</strong> veya <strong>Yeni Ders Tanımla</strong> butonuyla ders ekleyebilirsiniz.
                            </div>
                          ) : (
                            form.field_rules.courses.map((cr, i) => (
                              <div className="row g-2 align-items-end mb-2" key={i}>
                                <div className="col-md-5">
                                  <label className="form-label small">Ders</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={cr.course_id}
                                    onChange={(e) => {
                                      if (e.target.value === '__NEW__') {
                                        openCreateCourseModal(i);
                                      } else {
                                        updateCourseRule(i, { course_id: Number(e.target.value) });
                                      }
                                    }}
                                  >
                                    <option value="" disabled>-- Ders Seçin --</option>
                                    {courses.map((c) => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    <option value="__NEW__" className="text-primary fw-bold">+ Yeni Ders Tanımla...</option>
                                  </select>
                                </div>
                                <div className="col-md-2">
                                  <label className="form-label small">Başlangıç (1'den)</label>
                                  <input type="number" className="form-control form-control-sm" value={cr.start} onChange={(e) => updateCourseRule(i, { start: Number(e.target.value || 0) })} />
                                </div>
                                <div className="col-md-2">
                                  <label className="form-label small">Uzunluk</label>
                                  <input type="number" className="form-control form-control-sm" value={cr.length} onChange={(e) => updateCourseRule(i, { length: Number(e.target.value || 1) })} />
                                </div>
                                <div className="col-md-3">
                                  <button type="button" className="btn btn-sm btn-soft-danger w-100" onClick={() => removeCourseRule(i)}>
                                    <i className="ti ti-trash me-1"></i> Sil
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="card border">
                        <div className="card-header"><strong>Satır Önizleme</strong></div>
                        <div className="card-body">
                          <textarea className="form-control font-monospace mb-2" rows={5} value={previewLine} onChange={(e) => setPreviewLine(e.target.value)} placeholder="Örnek satırı buraya yapıştırın" />
                          <div className="small">
                            <div><strong>Okul No:</strong> <code>{extract(form.field_rules.school_no)}</code></div>
                            <div><strong>Kitapçık:</strong> <code>{extract(form.field_rules.booklet_type)}</code></div>
                            {form.field_rules.tc_no && <div><strong>TC:</strong> <code>{extract(form.field_rules.tc_no)}</code></div>}
                            {form.field_rules.full_name && <div><strong>Ad Soyad:</strong> <code>{extract(form.field_rules.full_name)}</code></div>}
                            {form.field_rules.classroom_section && <div><strong>Sınıf Şube:</strong> <code>{extract(form.field_rules.classroom_section)}</code></div>}
                            {form.field_rules.gender && <div><strong>Cinsiyet:</strong> <code>{extract(form.field_rules.gender)}</code></div>}
                            {form.field_rules.custom_fields.map((cf, i) => <div key={i}><strong>{cf.label || cf.key}:</strong> <code>{extract(cf)}</code></div>)}
                            {form.field_rules.courses.map((cr, i) => {
                              const course = courses.find((c) => c.id === cr.course_id);
                              return (
                                <div key={i}>
                                  <strong>{course?.name || `Ders #${cr.course_id}`}:</strong> <code>{extract(cr)}</code>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)} disabled={saving}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-1"></span>}Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
