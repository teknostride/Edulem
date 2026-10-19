import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../../../api/axiosClient';
import { showToast } from '../../../../utils/toast';

interface CourseHeader {
  course_id: number;
  course_name: string;
  short_name: string;
}

interface GuardianItem {
  id: string | number;
  name: string;
  phone: string;
  relation: string;
  is_valid: boolean;
  is_legal: boolean;
}

interface StudentRecipient {
  student_id: number;
  result_id: number;
  name: string;
  school_no: string;
  classroom_id: number;
  classroom_name: string;
  rank: number;
  total_net: number;
  total_point: number;
  total_correct: number;
  total_wrong: number;
  total_blank: number;
  course_summary_str: string;
  course_scores: Record<
    number,
    { name: string; short: string; correct: number; wrong: number; blank: number; net: number }
  >;
  student_phone?: string;
  guardians: GuardianItem[];
  primary_guardian: GuardianItem | null;
  has_valid_phone: boolean;
}

interface SmsModeProps {
  examId: string | number;
  examName?: string;
}

export interface ResolvedRecipient {
  name: string;
  phone: string;
  relation: string;
  isValid: boolean;
  isFallback?: boolean;
}

export function getStudentRecipients(
  student: StudentRecipient,
  target: 'primary_guardian' | 'all_guardians' | 'student'
): ResolvedRecipient[] {
  if (target === 'student') {
    const raw = student.student_phone || '';
    const clean = raw.replace(/\D/g, '');
    const isValid = clean.length >= 10;
    return [
      {
        name: student.name,
        phone: raw,
        relation: 'Öğrenci',
        isValid,
      },
    ];
  }

  if (target === 'all_guardians') {
    const rawList = student.guardians || [];
    const seen = new Set<string>();
    const validRecs: ResolvedRecipient[] = [];

    rawList.forEach((g) => {
      const p = (g.phone || '').trim();
      const clean = p.replace(/\D/g, '');
      if (clean) {
        if (!seen.has(clean)) {
          seen.add(clean);
          validRecs.push({
            name: g.name || 'Velimiz',
            phone: p,
            relation: g.relation || 'Veli',
            isValid: !!g.is_valid,
          });
        }
      } else {
        validRecs.push({
          name: g.name || 'Velimiz',
          phone: '',
          relation: g.relation || 'Veli',
          isValid: false,
        });
      }
    });

    if (validRecs.length > 0) {
      return validRecs;
    }

    // Fallback if no guardian found
    if (student.student_phone) {
      return [
        {
          name: student.name,
          phone: student.student_phone,
          relation: 'Öğrenci (Veli kaydı yok)',
          isValid: true,
          isFallback: true,
        },
      ];
    }

    return [];
  }

  // target === 'primary_guardian'
  if (student.primary_guardian && student.primary_guardian.phone) {
    return [
      {
        name: student.primary_guardian.name || 'Velimiz',
        phone: student.primary_guardian.phone,
        relation: student.primary_guardian.relation || 'Veli',
        isValid: !!student.primary_guardian.is_valid,
      },
    ];
  }

  if (student.student_phone) {
    return [
      {
        name: student.name,
        phone: student.student_phone,
        relation: 'Öğrenci (Veli kaydı yok)',
        isValid: true,
        isFallback: true,
      },
    ];
  }

  return [];
}

export function hasValidRecipientForTarget(
  student: StudentRecipient,
  target: 'primary_guardian' | 'all_guardians' | 'student'
): boolean {
  const recs = getStudentRecipients(student, target);
  return recs.some((r) => r.isValid && !!r.phone);
}

export default function SmsMode({ examId, examName }: SmsModeProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [courses, setCourses] = useState<CourseHeader[]>([]);
  const [students, setStudents] = useState<StudentRecipient[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  // Form states
  const [title, setTitle] = useState('');
  const [recipientTarget, setRecipientTarget] = useState<'primary_guardian' | 'all_guardians' | 'student'>('primary_guardian');
  const [template, setTemplate] = useState(
    'Sayın Velimiz, öğrencimiz {ogrenci_adi}, {sinav_adi} sınavında {derece}/{toplam_katilim} olmuştur.\nDersler: {ders_dagilimi}\nToplam: {toplam_dogru}D {toplam_yanlis}Y - {toplam_net} Net.'
  );

  // Selection & filter states
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
  const [previewGuardianIdx, setPreviewGuardianIdx] = useState<number>(0);

  // Sent result modal/banner
  const [lastSentResult, setLastSentResult] = useState<{
    scheduled_sms_id: number;
    sent_count: number;
    failed_count: number;
  } | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch recipients data from backend
  const fetchRecipients = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await axiosClient.get(`/omr/exams/${examId}/sms-recipients`);
      const data = res.data?.data ?? res.data;
      const sList: StudentRecipient[] = data?.students ?? [];
      setStudents(sList);
      setCourses(data?.courses ?? []);
      setTotalStudents(data?.total_students ?? sList.length);

      const resolvedExamName = data?.exam?.name || examName || 'Sınav';
      setTitle(`${resolvedExamName} Sınav Sonuçları`);

      // Default select all with valid phones
      const validIds = new Set<number>();
      sList.forEach((s) => {
        if (s.has_valid_phone) {
          validIds.add(s.student_id);
        }
      });
      setSelectedIds(validIds);

      // Default preview student
      if (sList.length > 0) {
        setPreviewStudentId(sList[0].student_id);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Öğrenci ve veli bilgileri yüklenemedi.';
      setFetchError(msg);
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, [examId]);

  // Recipient stats calculation
  const selectedStats = useMemo(() => {
    let totalSmsRecipients = 0;
    let studentsWithValidPhone = 0;

    students.forEach((s) => {
      const recs = getStudentRecipients(s, recipientTarget);
      const valids = recs.filter((r) => r.isValid && !!r.phone);
      if (valids.length > 0) {
        studentsWithValidPhone++;
      }
      if (selectedIds.has(s.student_id)) {
        totalSmsRecipients += valids.length;
      }
    });

    return {
      selectedStudentCount: selectedIds.size,
      totalSmsRecipients,
      studentsWithValidPhone,
    };
  }, [students, selectedIds, recipientTarget]);

  // Unique classroom options
  const classroomOptions = useMemo(() => {
    const map = new Map<number, string>();
    students.forEach((s) => {
      if (s.classroom_id && s.classroom_name && s.classroom_name !== '-') {
        map.set(s.classroom_id, s.classroom_name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'tr'));
  }, [students]);

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== 'all' && String(s.classroom_id) !== selectedClass) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr-TR');
        const matchName = s.name.toLocaleLowerCase('tr-TR').includes(q);
        const matchNo = (s.school_no || '').includes(q);
        const matchClass = (s.classroom_name || '').toLocaleLowerCase('tr-TR').includes(q);
        return matchName || matchNo || matchClass;
      }
      return true;
    });
  }, [students, selectedClass, searchQuery]);

  // Handle select all / toggle
  const toggleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    const filteredValid = filteredStudents.filter((s) => hasValidRecipientForTarget(s, recipientTarget));
    const allSelected = filteredValid.every((s) => next.has(s.student_id));

    if (allSelected) {
      filteredValid.forEach((s) => next.delete(s.student_id));
    } else {
      filteredValid.forEach((s) => next.add(s.student_id));
    }
    setSelectedIds(next);
  };

  const toggleStudent = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Preview student object
  const previewStudent = useMemo(() => {
    if (!previewStudentId) return students[0] || null;
    return students.find((s) => s.student_id === previewStudentId) || students[0] || null;
  }, [students, previewStudentId]);

  // Preview recipients list
  const previewRecipients = useMemo(() => {
    if (!previewStudent) return [];
    return getStudentRecipients(previewStudent, recipientTarget);
  }, [previewStudent, recipientTarget]);

  // Selected recipient for preview
  const currentPreviewRecipient = useMemo(() => {
    if (!previewRecipients || previewRecipients.length === 0) return null;
    return previewRecipients[previewGuardianIdx] || previewRecipients[0];
  }, [previewRecipients, previewGuardianIdx]);

  // Render preview message for the selected student & recipient
  const previewMessage = useMemo(() => {
    if (!previewStudent) return template;
    let msg = template;
    msg = msg.replaceAll('{ogrenci_adi}', previewStudent.name);
    msg = msg.replaceAll(
      '{veli_adi}',
      currentPreviewRecipient?.name || previewStudent.primary_guardian?.name || 'Velimiz'
    );
    msg = msg.replaceAll('{sinav_adi}', examName || 'Sınav');
    msg = msg.replaceAll('{sinif}', previewStudent.classroom_name || '');
    msg = msg.replaceAll('{derece}', String(previewStudent.rank || '-'));
    msg = msg.replaceAll('{toplam_katilim}', String(totalStudents || students.length));
    msg = msg.replaceAll('{toplam_dogru}', String(previewStudent.total_correct));
    msg = msg.replaceAll('{toplam_yanlis}', String(previewStudent.total_wrong));
    msg = msg.replaceAll('{toplam_bos}', String(previewStudent.total_blank));
    msg = msg.replaceAll('{toplam_net}', Number(previewStudent.total_net).toFixed(2));
    msg = msg.replaceAll('{puan}', Number(previewStudent.total_point).toFixed(2));
    msg = msg.replaceAll('{ders_dagilimi}', previewStudent.course_summary_str);

    // Course individual replacements
    Object.values(previewStudent.course_scores || {}).forEach((cs) => {
      const summary = `${cs.short}: ${cs.correct}D ${cs.wrong}Y`;
      const netSummary = `${cs.short}: ${cs.correct}D ${cs.wrong}Y (${Number(cs.net).toFixed(2)}N)`;
      msg = msg.replaceAll(`{ders:${cs.short}}`, summary);
      msg = msg.replaceAll(`{ders:${cs.name}}`, summary);
      msg = msg.replaceAll(`{${cs.short}}`, summary);
      msg = msg.replaceAll(`{${cs.name}}`, summary);
      msg = msg.replaceAll(`{${cs.short}_net}`, netSummary);
      msg = msg.replaceAll(`{${cs.name}_net}`, netSummary);
    });

    return msg;
  }, [template, previewStudent, currentPreviewRecipient, examName, totalStudents, students.length]);

  // Calculate SMS segment count
  const smsLength = previewMessage.length;
  const smsSegments = smsLength <= 160 ? 1 : Math.ceil(smsLength / 153);

  // Append token to template
  const insertToken = (token: string) => {
    setTemplate((prev) => `${prev} ${token}`);
  };

  // Send SMS Handler
  const handleSendSms = async () => {
    if (selectedIds.size === 0) {
      showToast('error', 'Lütfen en az bir öğrenci seçiniz.');
      return;
    }
    if (!template.trim()) {
      showToast('error', 'Lütfen SMS şablon metnini doldurunuz.');
      return;
    }

    const { selectedStudentCount, totalSmsRecipients } = selectedStats;
    const recipientLabel =
      recipientTarget === 'all_guardians'
        ? `Seçilen ${selectedStudentCount} öğrenciye ait kayıtlı ${totalSmsRecipients} veli telefonuna sınav sonuç SMS'i gönderilecek.\n\nToplam ${totalSmsRecipients * smsSegments} SMS kredisi kullanılacak.`
        : recipientTarget === 'student'
        ? `Seçilen ${selectedStudentCount} öğrencinin telefonuna sınav sonuç SMS'i gönderilecek.\n\nToplam ${totalSmsRecipients * smsSegments} SMS kredisi kullanılacak.`
        : `Seçilen ${selectedStudentCount} öğrenci velisine sınav sonuç SMS'i gönderilecek.\n\nToplam ${totalSmsRecipients * smsSegments} SMS kredisi kullanılacak.`;

    const isConfirmed = window.confirm(`${recipientLabel}\n\nOnaylıyor musunuz?`);
    if (!isConfirmed) return;

    try {
      setSending(true);
      const res = await axiosClient.post(`/omr/exams/${examId}/send-sms`, {
        title: title.trim(),
        template: template.trim(),
        recipient_target: recipientTarget,
        selected_student_ids: Array.from(selectedIds),
      });

      const data = res.data?.data;
      setLastSentResult(data);
      showToast(
        'success',
        res.data?.message || `${data?.sent_count || totalSmsRecipients} veliye SMS başarıyla gönderildi!`
      );
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'SMS gönderimi başarısız oldu.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="card border-0 shadow-sm p-5 text-center my-4">
        <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
        <p className="text-muted mb-0">Öğrenci ve veli iletişim bilgileri hazırlanıyor...</p>
      </div>
    );
  }

  if (fetchError && students.length === 0) {
    return (
      <div className="card border-0 shadow-sm p-5 text-center my-4">
        <div className="text-danger mb-3">
          <i className="ti ti-alert-triangle" style={{ fontSize: '3rem' }}></i>
        </div>
        <h5 className="fw-bold mb-2">Öğrenci ve Veli Bilgileri Alınamadı</h5>
        <p className="text-muted mb-3 small">{fetchError}</p>
        <div>
          <button className="btn btn-outline-primary" onClick={fetchRecipients}>
            <i className="ti ti-refresh me-1"></i> Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const { selectedStudentCount, totalSmsRecipients } = selectedStats;
  const filteredValidCount = filteredStudents.filter((s) => hasValidRecipientForTarget(s, recipientTarget)).length;

  return (
    <div className="sms-mode-container pb-5">
      {/* Sent Banner Feedback */}
      {lastSentResult && (
        <div className="alert alert-success d-flex align-items-center justify-content-between p-3 mb-4 shadow-sm rounded-3">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-success text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
              <i className="ti ti-check fs-4"></i>
            </div>
            <div>
              <h6 className="mb-1 text-success fw-bold">SMS Gönderimi Tamamlandı & Raporlandı</h6>
              <div className="text-muted small">
                <strong>{lastSentResult.sent_count}</strong> veliye SMS iletildi. Detayları ve teslimat raporunu SMS Geçmişi ekranından inceleyebilirsiniz.
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setLastSentResult(null)}
            >
              Kapat
            </button>
            <Link to="/sms/history" className="btn btn-sm btn-success">
              <i className="ti ti-history me-1"></i> SMS Geçmişine Git
            </Link>
          </div>
        </div>
      )}

      {/* Main Row */}
      <div className="row g-4">
        {/* Left Panel: Template & Settings */}
        <div className="col-lg-5">
          {/* Card 1: Template Editor */}
          <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-header bg-transparent py-3 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ti ti-message-dots text-primary fs-4"></i>
                <h5 className="mb-0 fw-bold">SMS Şablonu</h5>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold px-2 py-1">
                {selectedStudentCount} Öğrenci • {totalSmsRecipients} Alıcı (SMS)
              </span>
            </div>

            <div className="card-body p-3 p-md-4">
              {/* Task Title */}
              <div className="mb-3">
                <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
                  Görev / Başlık (SMS Geçmişinde Görünür)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Sınav Sonuç Bildirimi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Recipient Target */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <label className="form-label fw-semibold small text-muted text-uppercase mb-0">
                    Kime Gönderilecek?
                  </label>
                  {recipientTarget === 'all_guardians' && (
                    <span className="badge bg-info-subtle text-info border border-info-subtle small">
                      Anne + Baba (Kayıtlı Tüm Veliler)
                    </span>
                  )}
                </div>
                <select
                  className="form-select"
                  value={recipientTarget}
                  onChange={(e: any) => {
                    setRecipientTarget(e.target.value);
                    setPreviewGuardianIdx(0);
                  }}
                >
                  <option value="primary_guardian">Birincil Veliye (Anne / Baba) - Önerilen</option>
                  <option value="all_guardians">Kayıtlı Tüm Velilere (Anne + Baba - Ayrı SMS)</option>
                  <option value="student">Öğrencinin Kendi Numarasına</option>
                </select>
                <div className="form-text small text-muted mt-1">
                  {recipientTarget === 'all_guardians' ? (
                    <span className="text-primary fw-medium">
                      <i className="ti ti-info-circle me-1"></i>
                      Bir öğrencinin hem annesi hem babası kayıtlıysa her iki veliye de ayrı SMS gönderilir. Sağdaki listede tüm veli numaraları listelenir.
                    </span>
                  ) : recipientTarget === 'student' ? (
                    <span>
                      <i className="ti ti-info-circle me-1"></i>
                      SMS'ler doğrudan öğrencinin kendi kayıtlı cep telefonuna gönderilir.
                    </span>
                  ) : (
                    <span>
                      <i className="ti ti-info-circle me-1"></i>
                      Her öğrenci için yalnızca birincil (yasal veya ilk kayıtlı) veliye 1 SMS gönderilir.
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Variables Badge Bar */}
              <div className="mb-3">
                <label className="form-label fw-semibold small text-muted text-uppercase mb-1 d-flex justify-content-between">
                  <span>Genel Değişkenler</span>
                  <span className="text-secondary fw-normal">Tıkla ve Ekle</span>
                </label>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {[
                    { label: 'Öğrenci Adı', token: '{ogrenci_adi}' },
                    { label: 'Veli Adı', token: '{veli_adi}' },
                    { label: 'Sınav Adı', token: '{sinav_adi}' },
                    { label: 'Sınıf', token: '{sinif}' },
                    { label: 'Sıra / Derece', token: '{derece}' },
                    { label: 'Toplam Katılım', token: '{toplam_katilim}' },
                    { label: 'Top. Doğru', token: '{toplam_dogru}' },
                    { label: 'Top. Yanlış', token: '{toplam_yanlis}' },
                    { label: 'Top. Net', token: '{toplam_net}' },
                  ].map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      className="btn btn-sm btn-outline-secondary py-0 px-2 rounded-pill small"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => insertToken(v.token)}
                    >
                      + {v.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-primary py-0 px-2 rounded-pill small fw-semibold"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => insertToken('{ders_dagilimi}')}
                    title="Tüm sınav derslerinin doğru-yanlış dökümünü otomatik ekler"
                  >
                    ⭐ Tüm Ders Dağılımı ({'{ders_dagilimi}'})
                  </button>
                </div>

                {/* Exam Course Specific Variables */}
                {courses.length > 0 && (
                  <div className="mt-2 pt-2 border-top">
                    <label className="form-label fw-semibold small text-muted text-uppercase mb-1 d-flex justify-content-between">
                      <span>Sınav Dersleri (Ders Bazlı Ekle)</span>
                    </label>
                    <div className="d-flex flex-wrap gap-1">
                      {courses.map((c) => (
                        <button
                          key={c.course_id}
                          type="button"
                          className="btn btn-sm btn-outline-primary py-0 px-2 rounded-pill small"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => insertToken(`{${c.short_name}}`)}
                          title={`Örn: ${c.short_name}: 10D 2Y`}
                        >
                          + {c.short_name} ({c.course_name})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Template Textarea */}
              <div className="mb-2">
                <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
                  Şablon İçeriği
                </label>
                <textarea
                  className="form-control font-monospace"
                  rows={5}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="SMS metnini buraya yazınız..."
                ></textarea>
              </div>

              {/* Character & Segment Counter */}
              <div className="d-flex align-items-center justify-content-between text-muted small mt-2">
                <span>
                  Önizleme Uzunluğu: <strong>{smsLength}</strong> karakter
                </span>
                <span className={`badge ${smsSegments > 1 ? 'bg-warning text-dark' : 'bg-success'}`}>
                  {smsSegments} SMS Boyu ({smsSegments} Kredi / SMS)
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Live Phone Preview */}
          <div className="card border-0 shadow-sm rounded-3 mb-4 bg-light">
            <div className="card-header bg-transparent py-2 border-bottom d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <i className="ti ti-device-mobile text-success fs-5"></i>
                <span className="fw-semibold small">Canlı Önizleme (Veli Telefonu)</span>
              </div>
              {students.length > 0 && (
                <select
                  className="form-select form-select-sm w-auto"
                  value={previewStudent?.student_id || ''}
                  onChange={(e) => {
                    setPreviewStudentId(Number(e.target.value));
                    setPreviewGuardianIdx(0);
                  }}
                >
                  {students.slice(0, 50).map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.rank}. {s.name} ({s.classroom_name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="card-body p-3">
              {/* If all_guardians has multiple guardians for preview student, show toggle */}
              {recipientTarget === 'all_guardians' && previewRecipients.length > 1 && (
                <div className="d-flex align-items-center gap-1 mb-2 pb-2 border-bottom">
                  <span className="small text-muted me-1">Önizlenen Veli:</span>
                  {previewRecipients.map((pr, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      className={`btn btn-sm py-0 px-2 rounded-pill fw-medium ${
                        previewGuardianIdx === pIdx ? 'btn-primary' : 'btn-outline-secondary'
                      }`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setPreviewGuardianIdx(pIdx)}
                    >
                      {pr.relation}: {pr.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Phone Bubble Mockup */}
              <div className="bg-white p-3 rounded-4 shadow-sm border border-light position-relative">
                <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom text-muted small">
                  <div className="d-flex align-items-center gap-2">
                    <i className="ti ti-user-circle fs-5 text-primary"></i>
                    <div>
                      <span className="fw-semibold text-dark">
                        {currentPreviewRecipient?.name || previewStudent?.primary_guardian?.name || `${previewStudent?.name} Velisi`}
                      </span>
                      {currentPreviewRecipient?.relation && (
                        <span className="badge bg-secondary-subtle text-secondary ms-1" style={{ fontSize: '0.7rem' }}>
                          {currentPreviewRecipient.relation}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="badge bg-light text-muted border">
                    {currentPreviewRecipient?.phone || 'Telefon Kaydı Yok'}
                  </span>
                </div>

                <div
                  className="p-3 rounded-3 text-dark font-monospace small"
                  style={{ backgroundColor: '#e9ecef', whiteSpace: 'pre-wrap', lineHeight: '1.45' }}
                >
                  {previewMessage}
                </div>

                <div className="d-flex align-items-center justify-content-between text-muted small mt-2" style={{ fontSize: '0.72rem' }}>
                  <span>
                    Derece: <strong>{previewStudent?.rank}/{totalStudents || students.length}</strong>
                  </span>
                  <span>{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • İletildi</span>
                </div>
              </div>
            </div>

            {/* Action Button Card Footer */}
            <div className="card-footer bg-transparent p-3 border-top">
              <button
                type="button"
                className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow"
                disabled={sending || selectedStudentCount === 0}
                onClick={handleSendSms}
              >
                {sending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>SMS'ler İletiliyor...</span>
                  </>
                ) : (
                  <>
                    <i className="ti ti-send fs-5"></i>
                    <span>
                      {recipientTarget === 'all_guardians'
                        ? `${selectedStudentCount} Öğrenci (${totalSmsRecipients} Veliye) SMS Gönder`
                        : recipientTarget === 'student'
                        ? `${selectedStudentCount} Öğrenciye SMS Gönder`
                        : `${selectedStudentCount} Öğrenci Velisine SMS Gönder`}
                      {' '}
                      ({totalSmsRecipients * smsSegments} Kredi)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Student & Guardian List */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-transparent py-3 border-bottom">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
                <div>
                  <h5 className="mb-1 fw-bold">Sınava Giren Öğrenciler</h5>
                  <div className="text-muted small">
                    Toplam <strong>{students.length}</strong> öğrenci ({selectedStats.studentsWithValidPhone} öğrencinin telefon bilgisi mevcut)
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: 120 }}
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="all">Tüm Sınıflar</option>
                    {classroomOptions.map(([id, name]) => (
                      <option key={id} value={String(id)}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="ti ti-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Öğrenci ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-bar: Selection stats & Quick actions */}
              <div className="d-flex align-items-center justify-content-between mt-3 pt-2 border-top">
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check mb-0">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="selectAllFiltered"
                      checked={
                        filteredValidCount > 0 &&
                        filteredStudents
                          .filter((s) => hasValidRecipientForTarget(s, recipientTarget))
                          .every((s) => selectedIds.has(s.student_id))
                      }
                      onChange={toggleSelectAllFiltered}
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="selectAllFiltered">
                      Filtrelenenleri Seç ({filteredValidCount})
                    </label>
                  </div>
                </div>

                <div className="small text-muted">
                  Seçili: <strong className="text-primary">{selectedStudentCount}</strong> / {students.length} Öğrenci
                  <span className="ms-2 badge bg-primary-subtle text-primary border border-primary-subtle">
                    {totalSmsRecipients} Alıcı (SMS)
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: '680px' }}>
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ width: 40 }} className="text-center">#</th>
                      <th style={{ width: 60 }} className="text-center">Sıra</th>
                      <th style={{ minWidth: 160 }}>Öğrenci Bilgisi</th>
                      <th className="text-center" style={{ minWidth: 130 }}>Toplam Sonuç</th>
                      <th style={{ minWidth: 220 }}>
                        {recipientTarget === 'all_guardians'
                          ? 'Alıcı Veliler (Tüm Kayıtlı)'
                          : recipientTarget === 'student'
                          ? 'Öğrenci Telefonu'
                          : 'Birincil Veli & Telefon'}
                      </th>
                      <th style={{ width: 70 }} className="text-end">Önizle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted">
                          Arama kriterine uygun öğrenci bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const isSelected = selectedIds.has(s.student_id);
                        const isPreviewing = previewStudent?.student_id === s.student_id;
                        const recs = getStudentRecipients(s, recipientTarget);
                        const isSelectable = recs.some((r) => r.isValid && !!r.phone);

                        return (
                          <tr
                            key={s.student_id}
                            className={`${isPreviewing ? 'table-primary-subtle' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setPreviewStudentId(s.student_id);
                              setPreviewGuardianIdx(0);
                            }}
                          >
                            {/* Checkbox */}
                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isSelected}
                                disabled={!isSelectable}
                                onChange={() => toggleStudent(s.student_id)}
                              />
                            </td>

                            {/* Rank */}
                            <td className="text-center fw-bold text-muted">
                              <span className="badge bg-light text-dark border">
                                {s.rank || '-'}
                              </span>
                            </td>

                            {/* Student Info */}
                            <td>
                              <div className="fw-semibold text-dark">{s.name}</div>
                              <div className="text-muted small">
                                {s.classroom_name} • No: {s.school_no || '-'}
                              </div>
                            </td>

                            {/* Result Summary */}
                            <td className="text-center">
                              <span className="badge bg-light text-dark border me-1">
                                {s.total_correct}D {s.total_wrong}Y
                              </span>
                              <span className="fw-bold text-primary">
                                {Number(s.total_net).toFixed(2)} N
                              </span>
                            </td>

                            {/* Guardian & Phone column reacting to recipientTarget */}
                            <td>
                              {recs.length === 0 ? (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle small">
                                  <i className="ti ti-alert-triangle me-1"></i> Telefon Yok
                                </span>
                              ) : (
                                <div className="d-flex flex-column gap-1">
                                  {recs.map((rec, rIdx) => (
                                    <div
                                      key={rIdx}
                                      className={`d-flex align-items-center justify-content-between px-2 py-1 rounded small ${
                                        rec.isValid
                                          ? 'bg-light-subtle border'
                                          : 'bg-danger-subtle text-danger border border-danger-subtle'
                                      }`}
                                      style={{ fontSize: '0.78rem' }}
                                    >
                                      <div className="d-flex align-items-center gap-1 fw-semibold text-dark">
                                        <i className={`ti ti-phone ${rec.isValid ? 'text-success' : 'text-danger'}`}></i>
                                        <span>{rec.phone || 'Telefon Kaydı Yok'}</span>
                                      </div>
                                      <div className="text-muted text-end">
                                        <span
                                          className={`badge ${
                                            rec.relation === 'Öğrenci'
                                              ? 'bg-info-subtle text-info'
                                              : rec.relation === 'Anne'
                                              ? 'bg-primary-subtle text-primary'
                                              : rec.relation === 'Baba'
                                              ? 'bg-success-subtle text-success'
                                              : 'bg-secondary-subtle text-secondary'
                                          } me-1`}
                                          style={{ fontSize: '0.7rem' }}
                                        >
                                          {rec.relation}
                                        </span>
                                        <span className="text-dark fw-normal">{rec.name}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Preview Eye Action */}
                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  isPreviewing ? 'btn-primary' : 'btn-outline-secondary'
                                } py-1 px-2`}
                                title="Bu öğrenciyi canlı önizlemede gör"
                                onClick={() => {
                                  setPreviewStudentId(s.student_id);
                                  setPreviewGuardianIdx(0);
                                }}
                              >
                                <i className="ti ti-eye"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
