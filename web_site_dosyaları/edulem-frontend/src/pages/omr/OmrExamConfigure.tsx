import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import Swal from 'sweetalert2';

interface Course {
  id: number;
  name: string;
  code: string | null;
  coefficients: Record<string, number> | null;
}

interface Topic {
  id: number;
  name: string;
  type: 'topic' | 'objective';
}

interface ExamCourseRow {
  course_id: number;
  coefficient: number;
  question_count: number;
  sort_order: number;
}

interface AnswerRow {
  id?: number;
  course_id: number;
  question_no: number;
  booklet_a_qno: number | null;
  booklet_b_qno: number | null;
  booklet_c_qno: number | null;
  booklet_d_qno: number | null;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  topic_id: number | null;
  custom_topic_text?: string;
  _topicMode?: 'select' | 'custom';
}

export default function OmrExamConfigure() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingCourses, setSavingCourses] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [exam, setExam] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<number, Topic[]>>({});

  const [examSettings, setExamSettings] = useState({
    omr_template_id: '' as string | number,
    wrong_penalty: 0,
    status: 'draft',
  });

  const [examCourses, setExamCourses] = useState<ExamCourseRow[]>([]);
  const [answerRows, setAnswerRows] = useState<AnswerRow[]>([]);
  const [uploadingAnswerKey, setUploadingAnswerKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCourseIdToAdd, setSelectedCourseIdToAdd] = useState<number | ''>('');
  const [showManualCourseSection, setShowManualCourseSection] = useState(false);

  const applyTemplateCoursesAndKeys = (
    templateId: number | string,
    currentTemplates = templates,
    currentCourses = courses,
    examType = exam?.exam_type
  ) => {
    if (!templateId) return;
    const t = currentTemplates.find((x) => String(x.id) === String(templateId));
    if (!t || !t.field_rules?.courses) return;

    const tCourses = t.field_rules.courses;
    if (!Array.isArray(tCourses) || tCourses.length === 0) return;

    const newExamCourses: ExamCourseRow[] = tCourses.map((tc: any, idx: number) => {
      const cid = Number(tc.course_id);
      const courseObj = currentCourses.find((c) => c.id === cid);
      const defaultCoef = Number(courseObj?.coefficients?.[examType] ?? 1);
      const existing = examCourses.find((ec) => ec.course_id === cid);
      return {
        course_id: cid,
        coefficient: existing ? existing.coefficient : defaultCoef,
        question_count: Number(tc.length || 20),
        sort_order: idx + 1,
      };
    });
    setExamCourses(newExamCourses);

    setAnswerRows((prevRows) => {
      const newRows: AnswerRow[] = [];
      tCourses.forEach((tc: any) => {
        const cid = Number(tc.course_id);
        const qCount = Number(tc.length || 20);
        for (let q = 1; q <= qCount; q++) {
          const existingRow = prevRows.find((r) => r.course_id === cid && r.question_no === q);
          if (existingRow) {
            newRows.push(existingRow);
          } else {
            newRows.push({
              course_id: cid,
              question_no: q,
              booklet_a_qno: q,
              booklet_b_qno: null,
              booklet_c_qno: null,
              booklet_d_qno: null,
              correct_answer: 'A',
              topic_id: null,
              custom_topic_text: '',
              _topicMode: 'select',
            });
          }
        }
      });
      return newRows;
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eRes, cRes, tRes] = await Promise.allSettled([
        axiosClient.get(`/omr/exams/${examId}`),
        axiosClient.get('/omr/courses'),
        axiosClient.get('/omr/templates'),
      ]);

      if (eRes.status === 'rejected') {
        showToast('error', 'Sınav bilgisi yüklenemedi');
      }
      if (cRes.status === 'rejected') {
        showToast('error', 'Dersler yüklenemedi');
      }
      if (tRes.status === 'rejected') {
        showToast('error', 'Şablonlar yüklenemedi');
      }

      const examPayload = eRes.status === 'fulfilled' ? eRes.value : null;
      const coursePayload = cRes.status === 'fulfilled' ? cRes.value : null;
      const templatePayload = tRes.status === 'fulfilled' ? tRes.value : null;

      const examData = examPayload?.data?.data?.exam;
      const ec = examPayload?.data?.data?.exam_courses ?? [];
      const akByCourse = examPayload?.data?.data?.answer_keys ?? [];

      const allCourses: Course[] = coursePayload?.data?.data?.courses ?? [];
      const allTemplates: any[] = templatePayload?.data?.data?.templates ?? [];
      setCourses(allCourses);
      setTemplates(allTemplates);
      setExam(examData);

      setExamSettings({
        omr_template_id: examData?.omr_template_id ?? '',
        wrong_penalty: examData?.wrong_penalty ?? 0,
        status: examData?.status ?? 'draft',
      });

      if (ec.length > 0) {
        setExamCourses(ec.map((r: any) => ({
          course_id: r.course_id,
          coefficient: Number(r.coefficient ?? 1),
          question_count: Number(r.question_count ?? 0),
          sort_order: Number(r.sort_order ?? 0),
        })));
      } else if (examData?.omr_template_id) {
        const t = allTemplates.find((x: any) => String(x.id) === String(examData.omr_template_id));
        const tCourses = t?.field_rules?.courses ?? [];
        if (Array.isArray(tCourses) && tCourses.length > 0) {
          setExamCourses(tCourses.map((tc: any, idx: number) => {
            const courseObj = allCourses.find((c) => c.id === Number(tc.course_id));
            const coef = courseObj?.coefficients?.[examData?.exam_type] ?? 1;
            return {
              course_id: Number(tc.course_id),
              coefficient: Number(coef),
              question_count: Number(tc.length || 20),
              sort_order: idx + 1,
            };
          }));
        }
      }

      if (akByCourse.length > 0) {
        const rows: AnswerRow[] = [];
        akByCourse.forEach((group: any) => {
          (group.questions ?? []).forEach((q: any) => {
            rows.push({
              id: q.id,
              course_id: Number(group.course_id),
              question_no: Number(q.question_no),
              booklet_a_qno: q.booklet_a_qno ?? null,
              booklet_b_qno: q.booklet_b_qno ?? null,
              booklet_c_qno: q.booklet_c_qno ?? null,
              booklet_d_qno: q.booklet_d_qno ?? null,
              correct_answer: q.correct_answer,
              topic_id: q.topic_id ?? null,
              custom_topic_text: q.custom_topic_text ?? '',
              _topicMode: 'select' as const,
            });
          });
        });
        setAnswerRows(rows);
      } else if (examData?.omr_template_id) {
        const t = allTemplates.find((x: any) => String(x.id) === String(examData.omr_template_id));
        const tCourses = t?.field_rules?.courses ?? [];
        if (Array.isArray(tCourses) && tCourses.length > 0) {
          const rows: AnswerRow[] = [];
          tCourses.forEach((tc: any) => {
            const cid = Number(tc.course_id);
            const qCount = Number(tc.length || 20);
            for (let q = 1; q <= qCount; q++) {
              rows.push({
                course_id: cid,
                question_no: q,
                booklet_a_qno: q,
                booklet_b_qno: null,
                booklet_c_qno: null,
                booklet_d_qno: null,
                correct_answer: 'A',
                topic_id: null,
                custom_topic_text: '',
                _topicMode: 'select' as const,
              });
            }
          });
          setAnswerRows(rows);
        }
      }

      if (allCourses.length > 0) {
        const topicEntries = await Promise.allSettled(allCourses.map(async (c) => {
          const tr = await axiosClient.get(`/omr/courses/${c.id}/topics`);
          return [c.id, tr.data?.data?.topics ?? []] as const;
        }));

        const okEntries = topicEntries
          .filter((x): x is PromiseFulfilledResult<readonly [number, Topic[]]> => x.status === 'fulfilled')
          .map((x) => x.value);
        setTopicsMap(Object.fromEntries(okEntries));
      } else {
        setTopicsMap({});
      }
    } catch {
      showToast('error', 'Yapılandırma verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [examId]);

  const availableCourses = useMemo(() => {
    const selected = new Set(examCourses.map((x) => x.course_id));
    return courses.filter((c) => !selected.has(c.id));
  }, [courses, examCourses]);

  useEffect(() => {
    if (selectedCourseIdToAdd === '' && availableCourses.length > 0) {
      setSelectedCourseIdToAdd(availableCourses[0].id);
    }
    if (selectedCourseIdToAdd !== '' && availableCourses.length > 0) {
      const exists = availableCourses.some((c) => c.id === selectedCourseIdToAdd);
      if (!exists) {
        setSelectedCourseIdToAdd(availableCourses[0].id);
      }
    }
    if (availableCourses.length === 0) {
      setSelectedCourseIdToAdd('');
    }
  }, [availableCourses, selectedCourseIdToAdd]);

  const openCreateCourseModal = async () => {
    const res = await Swal.fire({
      title: 'Yeni Ders Tanımla',
      html: `
        <div class="text-start">
          <p class="text-muted small mb-2">Sistemde bulunmayan veya özel sınava ait ders adını girin. Bu ders kaydedildikten sonra listede yer alacaktır.</p>
          <label class="form-label small fw-bold">Ders Adı <span class="text-danger">*</span></label>
          <input id="swal-exam-course-name" class="swal2-input m-0 w-100" placeholder="Örn: Biyoloji, Mantık, Özel Ders..." autofocus />
          <label class="form-label small fw-bold mt-2">Ders Kodu (Opsiyonel)</label>
          <input id="swal-exam-course-code" class="swal2-input m-0 w-100" placeholder="Örn: BİY, MNT..." />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Kaydet ve Sınava Ekle',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#0d6efd',
      focusConfirm: false,
      didOpen: () => {
        const input = document.getElementById('swal-exam-course-name') as HTMLInputElement;
        input?.focus();
      },
      preConfirm: () => {
        const name = (document.getElementById('swal-exam-course-name') as HTMLInputElement)?.value?.trim();
        const code = (document.getElementById('swal-exam-course-code') as HTMLInputElement)?.value?.trim();
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
        setTopicsMap((prev) => ({ ...prev, [created.id]: [] }));
        showToast('success', `"${created.name}" dersi eklendi.`);

        const alreadyInExam = examCourses.some((x) => x.course_id === created.id);
        if (!alreadyInExam) {
          const defaultCoef = Number(created.coefficients?.[exam?.exam_type] ?? 1);
          setExamCourses((prev) => [...prev, {
            course_id: created.id,
            coefficient: defaultCoef,
            question_count: 20,
            sort_order: prev.length,
          }]);
        }
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Ders eklenirken bir hata oluştu');
    }
  };

  const addExamCourse = () => {
    const c = availableCourses.find((x) => x.id === selectedCourseIdToAdd) ?? availableCourses[0];
    if (!c) {
      openCreateCourseModal();
      return;
    }
    const defaultCoef = Number(c.coefficients?.[exam?.exam_type] ?? 1);
    setExamCourses((prev) => [...prev, {
      course_id: c.id,
      coefficient: defaultCoef,
      question_count: 20,
      sort_order: prev.length,
    }]);
  };

  const updateExamCourse = (idx: number, patch: Partial<ExamCourseRow>) => {
    setExamCourses((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeExamCourse = (idx: number) => {
    setExamCourses((prev) => prev.filter((_, i) => i !== idx));
    setAnswerRows((prev) => prev.filter((r) => r.course_id !== examCourses[idx]?.course_id));
  };

  const saveExamSettings = async () => {
    try {
      await axiosClient.put(`/omr/exams/${examId}`, {
        omr_template_id: examSettings.omr_template_id ? Number(examSettings.omr_template_id) : null,
        wrong_penalty: Number(examSettings.wrong_penalty || 0),
        status: examSettings.status,
      });
      showToast('success', 'Sınav ayarları ve şablon dersleri kaydedildi');
      await fetchData();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Sınav ayarları kaydedilemedi');
    }
  };

  const saveExamCourses = async () => {
    if (examCourses.length === 0) {
      showToast('warning', 'En az bir ders bulunmalıdır');
      return;
    }
    try {
      setSavingCourses(true);
      await axiosClient.post(`/omr/exams/${examId}/courses/sync`, { courses: examCourses });
      showToast('success', 'Ders katsayıları kaydedildi');
      await fetchData();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Dersler kaydedilemedi');
    } finally {
      setSavingCourses(false);
    }
  };

  const updateAnswerRow = (rowIndex: number, patch: Partial<AnswerRow>) => {
    setAnswerRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, ...patch } : r)));
  };

  const saveAnswerKeys = async () => {
    if (answerRows.length === 0) {
      showToast('warning', 'En az bir cevap satırı girin');
      return;
    }
    try {
      setSavingKeys(true);
      await axiosClient.post(`/omr/exams/${examId}/answer-keys`, {
        keys: answerRows.map((r) => ({
          course_id: r.course_id,
          question_no: r.question_no,
          booklet_a_qno: r.booklet_a_qno,
          booklet_b_qno: r.booklet_b_qno,
          booklet_c_qno: r.booklet_c_qno,
          booklet_d_qno: r.booklet_d_qno,
          correct_answer: r.correct_answer,
          topic_id: r._topicMode === 'select' ? r.topic_id : null,
          custom_topic_text: r._topicMode === 'custom' ? (r.custom_topic_text ?? '') : null,
        })),
      });
      showToast('success', 'Cevap anahtarı kaydedildi');
      fetchData();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Cevap anahtarı kaydedilemedi');
    } finally {
      setSavingKeys(false);
    }
  };

  const finalize = async () => {
    try {
      setFinishing(true);
      await axiosClient.post(`/omr/exams/${examId}/configure/finalize`);
      showToast('success', 'Yapılandırma tamamlandı. TXT yükleme açıldı.');
      navigate(`/omr/exams/${examId}/import`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Yapılandırma tamamlanamadı');
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  const selectedTemplate = templates.find((t) => String(t.id) === String(examSettings.omr_template_id));

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <button className="btn btn-sm btn-light me-2" onClick={() => navigate('/omr/exams')}>
            <i className="ti ti-arrow-left me-1"></i> Geri
          </button>
          <h4 className="page-title d-inline mb-0">Sınav Yapılandırma (Phase B)</h4>
          <p className="text-muted mb-0">{exam?.name} — {exam?.exam_type}</p>
        </div>
        <div>
          <span className={`badge ${exam?.configured_at ? 'bg-success' : 'bg-warning text-dark'}`}>
            {exam?.configured_at ? 'Yapılandırıldı' : 'Taslak Yapılandırma'}
          </span>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-light"><strong>1) Sınav Ayarları (Şablon / Ceza)</strong></div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">OMR Şablonu</label>
              <select
                className="form-select"
                value={examSettings.omr_template_id}
                onChange={(e) => {
                  const val = e.target.value;
                  setExamSettings((p) => ({ ...p, omr_template_id: val }));
                  if (val) {
                    applyTemplateCoursesAndKeys(val, templates, courses, exam?.exam_type);
                  }
                }}
              >
                <option value="">Seçiniz...</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Yanlış Ceza</label>
              <input type="number" className="form-control" value={examSettings.wrong_penalty} onChange={(e) => setExamSettings((p) => ({ ...p, wrong_penalty: Number(e.target.value || 0) }))} min="0" step="0.5" />
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-primary w-100" onClick={saveExamSettings}>Kaydet</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <strong>2) Sınav Dersleri ve Katsayılar</strong>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowManualCourseSection((p) => !p)}
          >
            {showManualCourseSection ? 'Manuel Ekleme Alanını Gizle' : '+ İsteğe Bağlı Ek Ders Ekle'}
          </button>
        </div>
        <div className="card-body">
          {courses.length === 0 && (
            <div className="alert alert-warning py-2 mb-2">
              Ders bulunamadı. (API: <code>/omr/courses</code>)
            </div>
          )}

          {examSettings.omr_template_id ? (
            <div className="alert alert-info py-2 mb-3 d-flex align-items-center">
              <i className="ti ti-info-circle me-2 fs-5"></i>
              <div>
                Dersler ve soru sayıları seçilen <strong>{selectedTemplate?.name ?? 'OMR'}</strong> şablonundan otomatik aktarılmıştır. Lütfen katsayıları (çarpanları) kontrol edip kaydediniz.
              </div>
            </div>
          ) : (
            <div className="alert alert-warning py-2 mb-3">
              <i className="ti ti-alert-triangle me-2"></i>
              Lütfen 1. adımdan bir OMR şablonu seçip kaydediniz. Dersler ve soru sayıları şablondan otomatik aktarılacaktır.
            </div>
          )}

          {showManualCourseSection && (
            <div className="card bg-light border-dashed mb-3">
              <div className="card-body py-2">
                <div className="row g-2 align-items-end">
                  <div className="col-md-5">
                    <label className="form-label mb-1 small fw-bold">Ekstra Eklenecek Ders</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedCourseIdToAdd}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          openCreateCourseModal();
                        } else {
                          setSelectedCourseIdToAdd(e.target.value ? Number(e.target.value) : '');
                        }
                      }}
                    >
                      {availableCourses.length === 0 ? (
                        <option value="" disabled>Tüm mevcut dersler eklendi</option>
                      ) : (
                        availableCourses.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      )}
                      <option value="__NEW__" className="text-primary fw-bold">+ Yeni Ders Tanımla...</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary w-100"
                      onClick={addExamCourse}
                      disabled={availableCourses.length === 0}
                    >
                      <i className="ti ti-plus me-1"></i>Dersi Ekle
                    </button>
                  </div>
                  <div className="col-md-4">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success w-100"
                      onClick={openCreateCourseModal}
                    >
                      <i className="ti ti-plus me-1"></i>Yeni Ders Tanımla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {examCourses.length === 0 ? (
            <div className="text-muted">Henüz ders listelenmedi. Şablon seçildiğinde dersler otomatik listelenecektir.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle w-100" style={{ tableLayout: 'auto' }}>
                <thead>
                  <tr className="table-light">
                    <th className="text-nowrap">Ders Adı</th>
                    <th className="text-nowrap" style={{ width: 140 }}>Katsayı (Çarpan)</th>
                    <th className="text-nowrap" style={{ width: 120 }}>Soru Sayısı</th>
                    <th className="text-nowrap" style={{ width: 90 }}>Sıra</th>
                    <th style={{ width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {examCourses.map((r, i) => {
                    const cObj = courses.find((c) => c.id === r.course_id);
                    return (
                      <tr key={`${r.course_id}_${i}`}>
                        <td>
                          <span className="fw-semibold">{cObj?.name ?? `Ders #${r.course_id}`}</span>
                          {cObj?.code && <span className="badge bg-light text-muted ms-2">{cObj.code}</span>}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-100"
                            value={r.coefficient}
                            step="0.01"
                            onChange={(e) => updateExamCourse(i, { coefficient: Number(e.target.value || 0) })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-100"
                            value={r.question_count}
                            onChange={(e) => updateExamCourse(i, { question_count: Number(e.target.value || 0) })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-100"
                            value={r.sort_order}
                            onChange={(e) => updateExamCourse(i, { sort_order: Number(e.target.value || 0) })}
                          />
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-soft-danger" onClick={() => removeExamCourse(i)} title="Dersi kaldır">
                            <i className="ti ti-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3">
            <button className="btn btn-primary" onClick={saveExamCourses} disabled={savingCourses}>
              {savingCourses && <span className="spinner-border spinner-border-sm me-1"></span>}Katsayıları Kaydet
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <strong>3) Cevap Anahtarı (Çapraz Kitapçık Eşlemesi)</strong>
            <span className="badge bg-light text-dark ms-2">{answerRows.length} soru</span>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {examSettings.omr_template_id && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  applyTemplateCoursesAndKeys(examSettings.omr_template_id, templates, courses, exam?.exam_type);
                  showToast('info', 'Şablondan satırlar ve soru sayıları yeniden oluşturuldu.');
                }}
                title="Şablondaki ders ve soru sayılarına göre satırları yeniden yükle"
              >
                <i className="ti ti-refresh me-1"></i>Şablondan Satırları Yükle
              </button>
            )}
            <button
              className="btn btn-sm btn-outline-success"
              onClick={async () => {
                try {
                  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
                  const downloadUrl = `${baseUrl.replace(/\/$/, '')}/omr/exams/${examId}/answer-keys/template`;
                  const res = await axiosClient.get(downloadUrl, {
                    responseType: 'blob',
                  });
                  const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `cevap_anahtari_sablonu_${examId}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (err: any) {
                  const msg = err.response?.data?.message || 'Şablon indirilemedi';
                  showToast('error', msg);
                }
              }}
              title="Excel şablonu indir"
            >
              <i className="ti ti-download me-1"></i>Şablon İndir
            </button>
            <button
              className="btn btn-sm btn-warning text-white"
              style={{ display: 'inline-block', visibility: 'visible', opacity: 1, backgroundColor: '#f39c12', borderColor: '#f39c12' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAnswerKey}
              title="Excel dosyası yükle"
            >
              {uploadingAnswerKey ? (
                <span className="spinner-border spinner-border-sm me-1"></span>
              ) : (
                <i className="ti ti-upload me-1"></i>
              )}
              EXCEL DOSYASI YÜKLE
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="d-none"
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setUploadingAnswerKey(true);
                  const formData = new FormData();
                  formData.append('file', file);
                  await axiosClient.post(`/omr/exams/${examId}/answer-keys/import`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  });
                  showToast('success', 'Cevap anahtarı Excelden yüklendi');
                  fetchData();
                } catch (err: any) {
                  showToast('error', err?.response?.data?.message ?? 'Excel yüklenemedi');
                } finally {
                  setUploadingAnswerKey(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            />
          </div>
        </div>
        <div className="card-body">
          {answerRows.length === 0 ? (
            <div className="text-muted">Henüz cevap satırı yok.</div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: 420 }}>
              <table className="table table-sm table-hover align-middle w-100">
                <thead className="table-light sticky-top">
                  <tr>
                    <th className="text-nowrap" style={{ width: 180 }}>Ders</th>
                    <th className="text-nowrap" style={{ width: 110 }}>Soru</th>
                    <th className="text-nowrap" style={{ width: 80 }}>A</th>
                    <th className="text-nowrap" style={{ width: 80 }}>B</th>
                    <th className="text-nowrap" style={{ width: 80 }}>C</th>
                    <th className="text-nowrap" style={{ width: 80 }}>D</th>
                    <th className="text-nowrap" style={{ width: 90 }}>Doğru</th>
                    <th className="text-nowrap">Konu/Kazanım</th>
                  </tr>
                </thead>
                <tbody>
                  {answerRows.map((r, i) => (
                    <tr key={`${r.course_id}_${r.question_no}_${i}`}>
                      <td style={{ maxWidth: 180 }}>
                        <div className="text-truncate" title={courses.find((c) => c.id === r.course_id)?.name ?? String(r.course_id)}>
                          {courses.find((c) => c.id === r.course_id)?.name ?? r.course_id}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm w-100"
                          value={r.question_no}
                          onChange={(e) => updateAnswerRow(i, { question_no: Number(e.target.value || 1) })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm w-100"
                          value={r.booklet_a_qno ?? ''}
                          onChange={(e) => updateAnswerRow(i, { booklet_a_qno: e.target.value ? Number(e.target.value) : null })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm w-100"
                          value={r.booklet_b_qno ?? ''}
                          onChange={(e) => updateAnswerRow(i, { booklet_b_qno: e.target.value ? Number(e.target.value) : null })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm w-100"
                          value={r.booklet_c_qno ?? ''}
                          onChange={(e) => updateAnswerRow(i, { booklet_c_qno: e.target.value ? Number(e.target.value) : null })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm w-100"
                          value={r.booklet_d_qno ?? ''}
                          onChange={(e) => updateAnswerRow(i, { booklet_d_qno: e.target.value ? Number(e.target.value) : null })}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm w-100"
                          value={r.correct_answer}
                          onChange={(e) => updateAnswerRow(i, { correct_answer: e.target.value as any })}
                        >
                          {['A', 'B', 'C', 'D', 'E'].map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        {r._topicMode !== 'custom' ? (
                          <div className="d-flex gap-1">
                            <select
                              className="form-select form-select-sm w-100 flex-grow-1"
                              style={{ minWidth: 160 }}
                              value={r.topic_id ?? ''}
                              onChange={(e) => updateAnswerRow(i, { topic_id: e.target.value ? Number(e.target.value) : null })}
                            >
                              <option value="">—</option>
                              {(topicsMap[r.course_id] ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary flex-shrink-0"
                              title="Manuel gir"
                              onClick={() => updateAnswerRow(i, { _topicMode: 'custom', topic_id: null, custom_topic_text: '' })}
                            ><i className="ti ti-pencil"></i></button>
                          </div>
                        ) : (
                          <div className="d-flex gap-1">
                            <input
                              type="text"
                              className="form-control form-control-sm w-100 flex-grow-1"
                              placeholder="Özel kazanım yaz..."
                              value={r.custom_topic_text ?? ''}
                              onChange={(e) => updateAnswerRow(i, { custom_topic_text: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary flex-shrink-0"
                              title="Listeden seç"
                              onClick={() => updateAnswerRow(i, { _topicMode: 'select', custom_topic_text: '' })}
                            ><i className="ti ti-list"></i></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-2">
            <button className="btn btn-primary" onClick={saveAnswerKeys} disabled={savingKeys}>
              {savingKeys && <span className="spinner-border spinner-border-sm me-1"></span>}Cevap Anahtarını Kaydet
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light"><strong>4) Yapılandırmayı Tamamla</strong></div>
        <div className="card-body d-flex align-items-center justify-content-between">
          <span className="text-muted">Tamamlandığında TXT yükleme ekranı aktif olur.</span>
          <button className="btn btn-success" onClick={finalize} disabled={finishing}>
            {finishing && <span className="spinner-border spinner-border-sm me-1"></span>}Yapılandırmayı Tamamla
          </button>
        </div>
      </div>
    </div>
  );
}
