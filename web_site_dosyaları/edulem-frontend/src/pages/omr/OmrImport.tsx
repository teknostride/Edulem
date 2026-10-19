import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface ResultRow {
  id: number;
  student_no: string;
  booklet_type: string;
  total_net: number;
  total_point: number;
  rank: number;
  course_scores: Record<number, { correct: number; wrong: number; blank: number; net: number; point: number }>;
  student?: { id: number; name: string; school_no: string; classroom?: { id: number; name: string } };
}

interface Classroom { id: number; name: string; }

interface PositionRule { start: number; length: number; }
interface CourseRule extends PositionRule { course_id: number; }
interface CustomFieldRule extends PositionRule { key: string; label?: string; }
interface TemplateFieldRules {
  tc_no?: PositionRule | null;
  school_no?: PositionRule | null;
  full_name?: PositionRule | null;
  classroom_section?: PositionRule | null;
  gender?: PositionRule | null;
  booklet_type?: PositionRule | null;
  custom_fields?: CustomFieldRule[];
  courses?: CourseRule[];
}

interface StagedRow {
  row_no: number;
  txt_full_name: string;
  txt_school_no: string;
  txt_classroom_section?: string;
  txt_gender?: string;
  booklet_type: string;
  parsed_fields: Record<string, any>;
  raw_answers: Record<string, string>;
  match_status: 'unmatched' | 'matched' | 'ambiguous_name';
  matched_by: 'tc_no' | 'full_name' | 'school_no' | 'manual' | null;
  db_student_id: number | null;
  db_student_name: string | null;
  match_suggestions?: Array<{ id: number; name: string; school_no?: string; classroom_name?: string; score?: number }>;
}

interface StudentOption {
  id: number;
  name: string;
  school_no?: string;
  classroom?: { id: number; name: string };
}

interface CourseHeader {
  course_id: number;
  course_name: string;
}

interface EditResultState {
  id: number;
  student_id: number | null;
  course_scores: Record<string, { correct: number; wrong: number }>;
}

export default function OmrImport() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exam, setExam] = useState<any>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [savingMatched, setSavingMatched] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState<number | null>(null);
  const [savingEditResult, setSavingEditResult] = useState(false);
  const [stagedRows, setStagedRows] = useState<StagedRow[]>([]);
  const [stageSummary, setStageSummary] = useState({ total_rows: 0, matched_rows: 0, unmatched_rows: 0 });
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [courseHeaders, setCourseHeaders] = useState<CourseHeader[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editResult, setEditResult] = useState<EditResultState | null>(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsArrayBuffer(file);
    });
  };

  const extractByRule = (line: string, rule?: PositionRule | null) => {
    if (!rule) return '';
    const startIndex = Math.max(0, Number(rule.start) - 1);
    const len = Math.max(0, Number(rule.length));
    const value = line.substring(startIndex, startIndex + len);
    return value.trim();
  };

  const extractRawCourseAnswers = (line: string, rule?: PositionRule | null) => {
    if (!rule) return '';
    const startIndex = Math.max(0, Number(rule.start) - 1);
    const len = Math.max(0, Number(rule.length));
    const value = line.substring(startIndex, startIndex + len);
    // Boşlukları '_' (alt tire) ile koruyoruz; böylece hiçbir Laravel/HTTP trim boşlukları budayamaz ve sorular kayamaz!
    return value.padEnd(len, ' ').replace(/ /g, '_');
  };

  const parseTxtRowsInBrowser = (text: string, rules: TemplateFieldRules): StagedRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line.trim() !== '');

    const courseRules = Array.isArray(rules.courses) ? rules.courses : [];
    const customRules = Array.isArray(rules.custom_fields) ? rules.custom_fields : [];

    return lines.map((line, index) => {
      const parsed_fields: Record<string, any> = {};

      const tcNo = extractByRule(line, rules.tc_no);
      const schoolNo = extractByRule(line, rules.school_no);
      const fullName = extractByRule(line, rules.full_name);
      const classroomSection = extractByRule(line, rules.classroom_section);
      const gender = extractByRule(line, rules.gender);

      if (tcNo) parsed_fields.tc_no = tcNo;
      if (schoolNo) parsed_fields.school_no = schoolNo;
      if (fullName) parsed_fields.full_name = fullName;
      if (classroomSection) parsed_fields.classroom_section = classroomSection;
      if (gender) parsed_fields.gender = gender;

      customRules.forEach((cf) => {
        const key = String(cf?.key ?? '').trim();
        if (!key) return;
        parsed_fields[key] = extractByRule(line, cf);
      });

      const bookletType = (extractByRule(line, rules.booklet_type) || 'A').toUpperCase();
      const raw_answers: Record<string, string> = {};
      courseRules.forEach((cr) => {
        const cId = Number(cr?.course_id ?? 0);
        if (cId <= 0) return;
        raw_answers[String(cId)] = extractRawCourseAnswers(line, cr);
      });

      return {
        row_no: index + 1,
        txt_tc_no: tcNo,
        txt_full_name: fullName,
        txt_school_no: schoolNo,
        txt_classroom_section: classroomSection,
        txt_gender: gender,
        booklet_type: ['A', 'B', 'C', 'D'].includes(bookletType) ? bookletType : 'A',
        parsed_fields,
        raw_answers,
        match_status: 'unmatched' as const,
        matched_by: null,
        db_student_id: null,
        db_student_name: null,
      };
    });
  };

  const fetchExam = async () => {
    try {
      const res = await axiosClient.get(`/omr/exams/${examId}`);
      setExam(res.data?.data?.exam);
    } catch {
      showToast('error', 'Sınav bilgisi yüklenemedi');
    }
  };

  const fetchResults = async (p = 1, classId = filterClass) => {
    try {
      setLoading(true);
      const params: any = { per_page: 50, page: p };
      if (classId) params.classroom_id = classId;
      const res = await axiosClient.get(`/omr/exams/${examId}/results`, { params });
      setResults(res.data?.data?.results ?? []);
      setCourseHeaders(res.data?.data?.course_headers ?? []);
      setPagination(res.data?.data?.pagination ?? { current_page: 1, last_page: 1, total: 0 });
    } catch {
      showToast('error', 'Sonuçlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const res = await axiosClient.get('/classrooms', { params: { per_page: 200 } });
      const raw = res.data?.data ?? res.data;
      setClassrooms(Array.isArray(raw) ? raw : raw?.classrooms ?? raw?.data ?? []);
    } catch { /* sessiz */ }
  };

  useEffect(() => {
    fetchExam();
    fetchClassrooms();
    fetchResults(1, '');
  }, [examId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { showToast('warning', 'Lütfen bir .txt dosyası seçin'); return; }
    const rules = (exam?.template?.field_rules ?? null) as TemplateFieldRules | null;
    if (!rules?.school_no || !rules?.booklet_type) {
      showToast('error', 'Şablon alan kuralları eksik (okul no / kitapçık).');
      return;
    }

    try {
      setUploading(true);
      setImportResult(null);

      const arrayBuffer = await readFileAsArrayBuffer(file);
      const text = new TextDecoder('windows-1254').decode(arrayBuffer);
      const parsedRows = parseTxtRowsInBrowser(text, rules);
      if (parsedRows.length === 0) {
        showToast('warning', 'Dosyada parse edilecek satır bulunamadı');
        return;
      }

      const res = await axiosClient.post(`/omr/exams/${examId}/import/preview`, {
        exam_id: Number(examId),
        template_id: Number(exam?.template?.id ?? exam?.omr_template_id ?? 0),
        parsed_rows: parsedRows,
      });

      const data = res.data?.data;
      setStagedRows(data?.rows ?? []);
      setStageSummary(data?.summary ?? { total_rows: 0, matched_rows: 0, unmatched_rows: 0 });
      showToast('success', `${data?.summary?.total_rows ?? 0} satır parse edildi ve eşleştirildi`);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  const refreshStageSummary = (rows: StagedRow[]) => {
    const matched = rows.filter(r => !!r.db_student_id).length;
    setStageSummary({
      total_rows: rows.length,
      matched_rows: matched,
      unmatched_rows: rows.length - matched,
    });
  };

  const handleAutoMatch = async () => {
    if (stagedRows.length === 0) {
      showToast('warning', 'Önce TXT dosyası yükleyin');
      return;
    }

    try {
      setAutoMatching(true);
      const res = await axiosClient.post(`/omr/exams/${examId}/import/auto-match`, { rows: stagedRows });
      const data = res.data?.data;
      const rows: StagedRow[] = data?.rows ?? [];
      setStagedRows(rows);
      setStageSummary(data?.summary ?? { total_rows: rows.length, matched_rows: 0, unmatched_rows: rows.length });
      showToast('success', `Otomatik eşleştirme tamamlandı (${data?.summary?.matched_rows ?? 0} eşleşme)`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Otomatik eşleştirme başarısız');
    } finally {
      setAutoMatching(false);
    }
  };

  const openStudentModal = async (rowIndex: number) => {
    setModalRowIndex(rowIndex);
    setShowStudentModal(true);
    setStudentQuery('');
    await searchStudents('');
  };

  const searchStudents = async (q: string) => {
    try {
      setLoadingStudents(true);
      const res = await axiosClient.get(`/omr/exams/${examId}/students/search`, { params: { q, limit: 60 } });
      setStudentOptions(res.data?.data?.students ?? []);
    } catch {
      setStudentOptions([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const assignStudentToRow = (student: StudentOption) => {
    if (modalRowIndex === null) return;
    const next = [...stagedRows];
    const current = next[modalRowIndex];
    next[modalRowIndex] = {
      ...current,
      db_student_id: student.id,
      db_student_name: student.name,
      match_status: 'matched',
      matched_by: 'manual',
      match_suggestions: [],
    };
    setStagedRows(next);
    refreshStageSummary(next);
    setShowStudentModal(false);
    setModalRowIndex(null);
    showToast('success', 'Öğrenci eşleştirildi');
  };

  const assignSuggestionToRow = (rowIndex: number, suggestion: { id: number; name: string }) => {
    const next = [...stagedRows];
    const current = next[rowIndex];
    next[rowIndex] = {
      ...current,
      db_student_id: suggestion.id,
      db_student_name: suggestion.name,
      match_status: 'matched',
      matched_by: 'manual',
      match_suggestions: [],
    };
    setStagedRows(next);
    refreshStageSummary(next);
    showToast('success', 'Öneri ile eşleştirildi');
  };

  const unmatchRow = (rowIndex: number) => {
    const next = [...stagedRows];
    const current = next[rowIndex];
    next[rowIndex] = {
      ...current,
      db_student_id: null,
      db_student_name: null,
      match_status: 'unmatched',
      matched_by: null,
    };
    setStagedRows(next);
    refreshStageSummary(next);
    showToast('info', 'Eşleşme kaldırıldı');
  };

  const matchedRows = stagedRows.filter(r => r.match_status === 'matched' && !!r.db_student_id);
  const handleFinalize = async () => {
    if (matchedRows.length === 0) {
      showToast('warning', 'Önce en az bir satır eşleştirin');
      return;
    }

    try {
      setSavingMatched(true);
      const res = await axiosClient.post(`/omr/exams/${examId}/import/finalize`, { rows: matchedRows });
      const data = res.data?.data;
      setImportResult({ imported: data?.imported ?? 0, skipped: data?.skipped ?? 0, errors: data?.errors ?? [] });
      showToast('success', `${data?.imported ?? 0} sonuç hesaplandı ve kaydedildi`);
      fetchResults(1, filterClass);
      fetchExam();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Hesapla ve kaydet başarısız');
    } finally {
      setSavingMatched(false);
    }
  };

  const openEditResultModal = async (row: ResultRow) => {
    const nextScores: Record<string, { correct: number; wrong: number }> = {};
    Object.entries(row.course_scores ?? {}).forEach(([courseId, score]) => {
      nextScores[courseId] = {
        correct: Number(score?.correct ?? 0),
        wrong: Number(score?.wrong ?? 0),
      };
    });

    setEditResult({
      id: row.id,
      student_id: row.student?.id ?? null,
      course_scores: nextScores,
    });
    setStudentQuery(row.student?.name ?? '');
    setShowEditModal(true);
    await searchStudents(row.student?.name ?? '');
  };

  const setEditCourseScore = (courseId: number, field: 'correct' | 'wrong', value: number) => {
    if (!editResult) return;
    const key = String(courseId);
    setEditResult({
      ...editResult,
      course_scores: {
        ...editResult.course_scores,
        [key]: {
          correct: Number(editResult.course_scores[key]?.correct ?? 0),
          wrong: Number(editResult.course_scores[key]?.wrong ?? 0),
          [field]: Math.max(0, Number.isFinite(value) ? value : 0),
        },
      },
    });
  };

  const handleSaveEditResult = async () => {
    if (!editResult) return;
    try {
      setSavingEditResult(true);
      await axiosClient.put(`/omr/exams/${examId}/results/${editResult.id}`, {
        student_id: editResult.student_id,
        course_scores: editResult.course_scores,
      });
      showToast('success', 'Sonuç güncellendi');
      setShowEditModal(false);
      setEditResult(null);
      fetchResults(page, filterClass);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Sonuç güncellenemedi');
    } finally {
      setSavingEditResult(false);
    }
  };

  const handleDeleteResult = async (row: ResultRow) => {
    const ok = window.confirm(`${row.student?.name ?? row.student_no} kaydı silinsin mi?`);
    if (!ok) return;

    try {
      setDeletingResultId(row.id);
      await axiosClient.delete(`/omr/exams/${examId}/results/${row.id}`);
      showToast('success', 'Sonuç silindi');
      fetchResults(page, filterClass);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Sonuç silinemedi');
    } finally {
      setDeletingResultId(null);
    }
  };

  const handleFilterChange = (classId: string) => {
    setFilterClass(classId);
    setPage(1);
    fetchResults(1, classId);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchResults(p, filterClass);
  };

  const resolveCourseHeaders = () => {
    if (courseHeaders.length > 0) return courseHeaders;
    const ids = Array.from(new Set(results.flatMap(r => Object.keys(r.course_scores ?? {})))).map((id) => Number(id));
    return ids.map((id) => ({ course_id: id, course_name: `Ders ${id}` }));
  };

  const activeCourseHeaders = resolveCourseHeaders();

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-sm btn-light me-3" onClick={() => navigate('/omr/exams')}>
          <i className="ti ti-arrow-left me-1"></i> Geri
        </button>
        <div>
          <h4 className="page-title mb-0">Optik Dosya Yükleme & Sonuçlar</h4>
          {exam && <p className="text-muted mb-0">{exam.name} — {exam.exam_type}{exam.session ? ` / ${exam.session}` : ''}</p>}
        </div>
      </div>

      {/* Üst Kontrol Alanı */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0"><i className="ti ti-settings me-2"></i>İşlem Kontrolleri</h6>
        </div>
        <div className="card-body">
          {!exam?.omr_template_id && (
            <div className="alert alert-warning mb-3">
              <i className="ti ti-alert-triangle me-2"></i>
              Bu sınava OMR şablonu atanmamış. Lütfen önce sınav düzenleme ekranından şablon atayın.
            </div>
          )}
          {exam?.omr_template_id && !exam?.configured_at && (
            <div className="alert alert-warning mb-3">
              <i className="ti ti-alert-triangle me-2"></i>
              Sınav yapılandırması tamamlanmamış. Önce ders/katsayı, cevap anahtarı ve final adımını tamamlayın.
            </div>
          )}
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Optik Okuyucu Çıktı Dosyası</label>
              <input type="file" className="form-control" accept=".txt" ref={fileRef} />
              <div className="form-text">Akış: TXT yükle → Eşleştir → Hesapla ve Kaydet</div>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-primary w-100"
                onClick={handleUpload}
                disabled={uploading || !exam?.omr_template_id || !exam?.configured_at}
              >
                {uploading
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>Parse...</>
                  : <><i className="ti ti-file-text me-1"></i>Yükle</>
                }
              </button>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-primary w-100"
                onClick={handleAutoMatch}
                disabled={autoMatching || stagedRows.length === 0}
              >
                {autoMatching
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>Eşleştir...</>
                  : <><i className="ti ti-link me-1"></i>Eşleştir</>
                }
              </button>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-success w-100"
                onClick={handleFinalize}
                disabled={savingMatched || matchedRows.length === 0}
              >
                {savingMatched
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>Kaydediliyor...</>
                  : <><i className="ti ti-calculator me-1"></i>Hesapla ve Kaydet</>
                }
              </button>
            </div>
          </div>

          {stagedRows.length > 0 && (
            <div className="mt-3 d-flex gap-2 flex-wrap">
              <span className="badge bg-secondary fs-6 px-3 py-2">Toplam Satır: {stageSummary.total_rows}</span>
              <span className="badge bg-success fs-6 px-3 py-2">Eşleşen: {stageSummary.matched_rows}</span>
              <span className="badge bg-warning text-dark fs-6 px-3 py-2">Eşleşmeyen: {stageSummary.unmatched_rows}</span>
            </div>
          )}

          {importResult && (
            <div className="mt-3">
              <div className="row g-2">
                <div className="col-auto">
                  <span className="badge bg-success fs-6 px-3 py-2">
                    <i className="ti ti-check me-1"></i>{importResult.imported} içe aktarıldı
                  </span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="col-auto">
                    <span className="badge bg-warning text-dark fs-6 px-3 py-2">
                      <i className="ti ti-alert-triangle me-1"></i>{importResult.skipped} atlandı
                    </span>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="alert alert-warning mt-2 mb-0">
                  <strong>Uyarılar:</strong>
                  <ul className="mb-0 mt-1 small">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Orta: Eşleştirme Önizleme */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light d-flex align-items-center justify-content-between">
          <h6 className="mb-0"><i className="ti ti-table me-2"></i>Eşleştirme Önizleme Tablosu</h6>
          {stagedRows.length > 0 && <span className="text-muted small">Öncelik: TC No → Ad Soyad → Okul No</span>}
        </div>
        <div className="card-body p-0">
          {stagedRows.length === 0 ? (
            <div className="text-center py-4 text-muted">Henüz parse edilmiş satır yok</div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: 460 }}>
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th style={{ width: 70 }}>Sıra</th>
                    <th>TXT Ad Soyad</th>
                    <th>TXT Okul No</th>
                    <th>Sınıf Şube</th>
                    <th>Cinsiyet</th>
                    <th>Kitapçık</th>
                    <th>Eşleşme Durumu</th>
                    <th>DB Öğrenci</th>
                    <th style={{ width: 240 }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {stagedRows.map((row, idx) => {
                    const isMatched = !!row.db_student_id;
                    const suggestions = Array.isArray(row.match_suggestions) ? row.match_suggestions : [];
                    return (
                      <tr key={`${row.row_no}-${idx}`}>
                        <td className="text-center">{row.row_no}</td>
                        <td>{row.txt_full_name || '-'}</td>
                        <td>{row.txt_school_no || '-'}</td>
                        <td>{row.txt_classroom_section || '-'}</td>
                        <td>{row.txt_gender || '-'}</td>
                        <td><span className="badge bg-secondary">{row.booklet_type}</span></td>
                        <td>
                          {isMatched ? (
                            <span className="text-success fw-semibold"><i className="ti ti-check me-1"></i>✔ Eşleşti ({row.matched_by})</span>
                          ) : (
                            <span className="text-danger fw-semibold"><i className="ti ti-x me-1"></i>Eşleşmedi</span>
                          )}
                        </td>
                        <td>{row.db_student_name ?? '-'}</td>
                        <td>
                          {isMatched ? (
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-outline-primary" onClick={() => openStudentModal(idx)}>
                                <i className="ti ti-edit me-1"></i>Değiştir
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => unmatchRow(idx)}>
                                <i className="ti ti-unlink me-1"></i>Eşleşmeyi Kaldır
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-1">
                              {suggestions.length > 0 && (
                                <div className="d-flex gap-1 flex-wrap">
                                  {suggestions.slice(0, 3).map((s) => (
                                    <button
                                      key={s.id}
                                      className="btn btn-sm btn-outline-success"
                                      title={`${s.name}${s.classroom_name ? ` — ${s.classroom_name}` : ''}${s.school_no ? ` (${s.school_no})` : ''}${typeof s.score === 'number' ? ` — %${s.score}` : ''}`}
                                      onClick={() => assignSuggestionToRow(idx, { id: s.id, name: s.name })}
                                    >
                                      <i className="ti ti-check me-1"></i>
                                      <span className="text-truncate" style={{ maxWidth: 170, display: 'inline-block', verticalAlign: 'bottom' }}>
                                        {s.classroom_name ? `${s.classroom_name} — ${s.name}` : s.name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <button className="btn btn-sm btn-outline-primary" onClick={() => openStudentModal(idx)}>
                                <i className="ti ti-user-search me-1"></i>Öğrenci Seç
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Alt: Kaydedilen Sonuçlar */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light d-flex align-items-center justify-content-between">
          <h6 className="mb-0">
            <i className="ti ti-list-numbers me-2"></i>
            Kaydedilen Sonuçlar Tablosu ({pagination.total} öğrenci)
          </h6>
          <div className="d-flex gap-2 align-items-center">
            <select
              className="form-select form-select-sm"
              style={{ width: 180 }}
              value={filterClass}
              onChange={e => handleFilterChange(e.target.value)}
            >
              <option value="">Tüm Sınıflar</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/omr/exams/${examId}/analytics`)}>
              <i className="ti ti-chart-bar me-1"></i> Analiz
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : results.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-inbox fs-1 d-block mb-2"></i>
              Henüz sonuç yüklenmemiş
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th rowSpan={2} style={{ width: 50 }}>Sıra</th>
                    <th rowSpan={2}>Öğrenci</th>
                    <th rowSpan={2}>Sınıf</th>
                    <th rowSpan={2}>Kitapçık</th>
                    {activeCourseHeaders.map((c) => (
                      <th key={c.course_id} className="text-center" colSpan={3}>{c.course_name}</th>
                    ))}
                    <th rowSpan={2} className="text-center fw-bold">Toplam Net</th>
                    <th rowSpan={2} className="text-center fw-bold">Puan</th>
                    <th rowSpan={2} className="text-center">İşlem</th>
                  </tr>
                  <tr>
                    {activeCourseHeaders.map((c) => (
                      <Fragment key={`sub-h-${c.course_id}`}>
                        <th key={`h-c-${c.course_id}`} className="text-center small">Doğru</th>
                        <th key={`h-w-${c.course_id}`} className="text-center small">Yanlış</th>
                        <th key={`h-n-${c.course_id}`} className="text-center small">Net</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id}>
                      <td className="text-center fw-bold text-primary">{r.rank ?? '-'}</td>
                      <td>
                        <div className="fw-semibold">{r.student?.name ?? r.student_no}</div>
                        <div className="text-muted small">{r.student?.school_no}</div>
                      </td>
                      <td>{r.student?.classroom?.name ?? '-'}</td>
                      <td><span className="badge bg-secondary">{r.booklet_type}</span></td>
                      {activeCourseHeaders.map(c => {
                        const cs = r.course_scores?.[c.course_id];
                        return (
                          <Fragment key={`row-course-${r.id}-${c.course_id}`}>
                            <td key={`c-${r.id}-${c.course_id}`} className="text-center small">{cs ? cs.correct : '-'}</td>
                            <td key={`w-${r.id}-${c.course_id}`} className="text-center small">{cs ? cs.wrong : '-'}</td>
                            <td key={`n-${r.id}-${c.course_id}`} className="text-center small fw-semibold">{cs ? cs.net.toFixed(2) : '-'}</td>
                          </Fragment>
                        );
                      })}
                      <td className="text-center fw-bold">{r.total_net.toFixed(2)}</td>
                      <td className="text-center fw-bold text-success">{r.total_point.toFixed(2)}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-1">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEditResultModal(r)}>
                            Düzenle
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteResult(r)}
                            disabled={deletingResultId === r.id}
                          >
                            {deletingResultId === r.id ? 'Siliniyor...' : 'Sil'}
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

        {/* Sayfalama */}
        {pagination.last_page > 1 && (
          <div className="card-footer d-flex justify-content-center">
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(page - 1)}>‹</button>
                </li>
                {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - page) <= 2)
                  .map(p => (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(p)}>{p}</button>
                    </li>
                  ))}
                <li className={`page-item ${page === pagination.last_page ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(page + 1)}>›</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Result Edit Modal */}
      {showEditModal && editResult && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sonuç Düzenle</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditResult(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Öğrenci</label>
                <div className="input-group mb-2">
                  <input
                    className="form-control"
                    placeholder="Ad Soyad veya Okul No"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                  />
                  <button className="btn btn-outline-secondary" onClick={() => searchStudents(studentQuery)}>Ara</button>
                </div>
                <div className="border rounded mb-3" style={{ maxHeight: 160, overflowY: 'auto' }}>
                  {studentOptions.map((s) => (
                    <button
                      key={`edit-student-${s.id}`}
                      className={`list-group-item list-group-item-action ${editResult.student_id === s.id ? 'active' : ''}`}
                      onClick={() => setEditResult({ ...editResult, student_id: s.id })}
                    >
                      {s.name} ({s.school_no || '-'})
                    </button>
                  ))}
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Ders</th>
                        <th style={{ width: 120 }}>Doğru</th>
                        <th style={{ width: 120 }}>Yanlış</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCourseHeaders.map((c) => (
                        <tr key={`edit-course-${c.course_id}`}>
                          <td>{c.course_name}</td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control form-control-sm"
                              value={editResult.course_scores[String(c.course_id)]?.correct ?? 0}
                              onChange={(e) => setEditCourseScore(c.course_id, 'correct', Number(e.target.value || 0))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              className="form-control form-control-sm"
                              value={editResult.course_scores[String(c.course_id)]?.wrong ?? 0}
                              onChange={(e) => setEditCourseScore(c.course_id, 'wrong', Number(e.target.value || 0))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => { setShowEditModal(false); setEditResult(null); }}>Vazgeç</button>
                <button className="btn btn-primary" onClick={handleSaveEditResult} disabled={savingEditResult}>
                  {savingEditResult ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Match Modal */}
      {showStudentModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Öğrenci Seç (Manuel Eşleştirme)</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowStudentModal(false);
                    setModalRowIndex(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="input-group mb-3">
                  <span className="input-group-text"><i className="ti ti-search"></i></span>
                  <input
                    className="form-control"
                    placeholder="Ad Soyad veya Okul No ile ara..."
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                  />
                  <button className="btn btn-outline-secondary" onClick={() => searchStudents(studentQuery)}>
                    Ara
                  </button>
                </div>

                <div className="border rounded" style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {loadingStudents ? (
                    <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                  ) : studentOptions.length === 0 ? (
                    <div className="text-center py-3 text-muted">Öğrenci bulunamadı</div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {studentOptions.map((s) => (
                        <button
                          key={s.id}
                          className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                          onClick={() => assignStudentToRow(s)}
                        >
                          <div>
                            <div className="fw-semibold">{s.name}</div>
                            <div className="small text-muted">
                              No: {s.school_no || '-'}
                              {s.classroom?.name ? ` · ${s.classroom.name}` : ''}
                            </div>
                          </div>
                          <span className="badge bg-primary">Seç</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-light"
                  onClick={() => {
                    setShowStudentModal(false);
                    setModalRowIndex(null);
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
