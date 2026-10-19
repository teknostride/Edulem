import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

/* ─── Types ─── */
interface Classroom { id: number; name: string; }
interface Student { id: number; name: string; school_no: string | null; classroom_id: number | null; classroom?: Classroom | null; }
interface Exam { id: number; name: string; exam_type: string; session: string | null; exam_date: string | null; results_count?: number; }
interface SessionItem { id: number; name: string; exam_type: string; exam_date: string | null; exam_ids: number[]; combined_results: any[] | null; calculated_at: string | null; }

type Mode = 'exam' | 'session';

async function downloadPdf(
  mode: Mode,
  id: number,
  filename: string,
  studentId?: number,
  classroomId?: number,
  isBulk = false
): Promise<void> {
  const base = mode === 'exam'
    ? `/omr/exams/${id}/report-card`
    : `/omr/sessions/${id}/report-card`;

  const params: Record<string, any> = {};
  if (studentId)   params.student_id  = studentId;
  if (classroomId) params.classroom_id = classroomId;
  const url = isBulk ? `${base}/bulk` : base;

  const res = await axiosClient.get(url, { params, responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const href = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/* ─── Component ─── */
export default function OmrReportCard() {
  const { examId, sessionId } = useParams<{ examId?: string; sessionId?: string }>();
  const mode: Mode = sessionId ? 'session' : 'exam';
  const entityId = mode === 'exam' ? Number(examId) : Number(sessionId);

  /* ── state ── */
  const [exam, setExam]         = useState<Exam | null>(null);
  const [session, setSession]   = useState<SessionItem | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading]   = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [previewingId, setPreviewingId] = useState<number | null>(null);

  /* filter state */
  const [filterClassroom, setFilterClassroom] = useState<number | ''>('');
  const [filterName, setFilterName]           = useState('');

  /* ── load ── */
  useEffect(() => {
    load();
  }, [entityId, mode]);

  const load = async () => {
    try {
      setLoading(true);
      if (mode === 'exam') {
        const [eRes, rRes] = await Promise.all([
          axiosClient.get(`/omr/exams/${entityId}`),
          axiosClient.get(`/omr/exams/${entityId}/results`),
        ]);
        setExam(eRes.data?.data?.exam ?? null);
        const rawStudents: any[] = rRes.data?.data?.results ?? [];
        buildStudentAndClassroomLists(rawStudents);
      } else {
        const sRes = await axiosClient.get(`/omr/sessions/${entityId}`);
        const sess: SessionItem = sRes.data?.data?.session ?? null;
        setSession(sess);
        const combined: any[] = sess?.combined_results ?? [];
        buildStudentAndClassroomListsFromCombined(combined);
      }
    } catch {
      showToast('error', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const buildStudentAndClassroomLists = (results: any[]) => {
    const clsMap: Record<number, string> = {};
    const stList: Student[] = results.map((r: any) => {
      const s = r.student ?? {};
      const resolvedStudentId = Number(r.student_id || s.id || r.id);
      if (s.classroom_id && s.classroom?.name) clsMap[s.classroom_id] = s.classroom.name;
      return {
        id: resolvedStudentId,
        name: s.name ?? `#${resolvedStudentId}`,
        school_no: r.student_no ?? s.school_no ?? null,
        classroom_id: s.classroom_id ?? null,
        classroom: s.classroom ?? null,
      };
    });
    stList.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    setStudents(stList);
    setClassrooms(Object.entries(clsMap).map(([id, name]) => ({ id: Number(id), name })));
  };

  const buildStudentAndClassroomListsFromCombined = (combined: any[]) => {
    const clsMap: Record<number, string> = {};
    const stList: Student[] = combined.map((r: any) => {
      const cid = r.classroom_id ?? null;
      const resolvedStudentId = Number(r.student_id || r.id);
      if (cid && r.classroom_name) clsMap[cid] = r.classroom_name;
      return {
        id: resolvedStudentId,
        name: r.student_name ?? `#${resolvedStudentId}`,
        school_no: r.student_no ?? null,
        classroom_id: cid,
      };
    });
    stList.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    setStudents(stList);
    setClassrooms(Object.entries(clsMap).map(([id, name]) => ({ id: Number(id), name })));
  };

  /* ── derived ── */
  const entityName = mode === 'exam' ? exam?.name : session?.name;

  const filteredStudents = students.filter(s => {
    const matchClass = filterClassroom === '' || s.classroom_id === filterClassroom;
    const matchName  = filterName === '' || s.name.toLowerCase().includes(filterName.toLowerCase()) ||
                       (s.school_no ?? '').includes(filterName);
    return matchClass && matchName;
  });

  const handleBulkDownload = async () => {
    setBulkLoading(true);
    try {
      const label = filterClassroom
        ? classrooms.find(c => c.id === filterClassroom)?.name ?? 'sinif'
        : (entityName ?? 'toplu');
      const filename = `karne_toplu_${label.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await downloadPdf(mode, entityId, filename, undefined, filterClassroom || undefined, true);
    } catch {
      showToast('error', 'PDF indirilemedi');
    } finally {
      setBulkLoading(false);
    }
  };

  const handlePreview = async (studentId: number) => {
    setPreviewingId(studentId);
    try {
      const base = mode === 'exam'
        ? `/omr/exams/${entityId}/report-card`
        : `/omr/sessions/${entityId}/report-card`;
      const res = await axiosClient.get(base, { params: { student_id: studentId }, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      showToast('error', 'Karne önizleme açılamadı.');
    } finally {
      setPreviewingId(null);
    }
  };

  /* ── render ── */
  if (loading) return (
    <div className="container-fluid">
      <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
    </div>
  );

  return (
    <div className="container-fluid">
      {/* ── Page header ── */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-1">
            <i className="ti ti-id-badge-2 me-2 text-primary"></i>Karne
          </h4>
          <p className="text-muted mb-0">
            {mode === 'exam'
              ? `Sınav: ${entityName ?? '—'}`
              : `Oturum: ${entityName ?? '—'}`}
          </p>
        </div>

        {/* Bulk download */}
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={handleBulkDownload}
          disabled={bulkLoading}
        >
          {bulkLoading
            ? <span className="spinner-border spinner-border-sm"></span>
            : <i className="ti ti-file-download"></i>}
          {filterClassroom
            ? `Sınıf Karneleri İndir (${filteredStudents.length} öğrenci)`
            : `Tüm Karneleri İndir (${students.length} öğrenci)`}
        </button>
      </div>

      {/* ── Info card about multi-session ── */}
      {mode === 'session' && session && session.exam_ids.length > 1 && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-4">
          <i className="ti ti-info-circle fs-5"></i>
          <div>
            <strong>{session.exam_ids.length} oturumlu konsolide karne</strong> — Her öğrencinin karnesi
            tüm oturum sonuçlarını tek sayfada birleştirir.{' '}
            {session.calculated_at && (
              <span className="text-muted small">
                Son hesaplama: {new Date(session.calculated_at).toLocaleString('tr-TR')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Filters + table ── */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light d-flex align-items-center gap-3 flex-wrap">
          {/* classroom filter */}
          {classrooms.length > 0 && (
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 200 }}
              value={filterClassroom}
              onChange={e => setFilterClassroom(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Tüm Sınıflar</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {/* name filter */}
          <input
            className="form-control form-control-sm"
            style={{ maxWidth: 240 }}
            placeholder="Öğrenci ara (ad veya numara)..."
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
          />
          <span className="text-muted small ms-auto">
            {filteredStudents.length} / {students.length} öğrenci
          </span>
        </div>

        <div className="card-body p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-users-group fs-1 d-block mb-2"></i>
              {students.length === 0 ? 'Bu sınav/oturum için henüz sonuç girilmemiş.' : 'Filtreyle eşleşen öğrenci bulunamadı.'}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Öğrenci</th>
                    <th>Numara</th>
                    <th>Sınıf</th>
                    <th className="text-end" style={{ width: 160 }}>Kazanım Karnesi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => (
                    <tr key={s.id}>
                      <td className="text-muted small">{i + 1}</td>
                      <td className="fw-semibold">{s.name}</td>
                      <td className="text-muted small">{s.school_no ?? '—'}</td>
                      <td className="text-muted small">{s.classroom?.name ?? classrooms.find(c => c.id === s.classroom_id)?.name ?? '—'}</td>
                      <td className="text-end">
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled={previewingId === s.id}
                            onClick={() => handlePreview(s.id)}
                            title="Karnesi Önizle"
                          >
                            {previewingId === s.id
                              ? <span className="spinner-border spinner-border-sm"></span>
                              : <i className="ti ti-eye"></i>}
                          </button>
                          <button
                            className="btn btn-sm btn-soft-primary"
                            disabled={downloadingId === s.id}
                            onClick={async () => {
                              setDownloadingId(s.id);
                              try {
                                const filename = `karne_${s.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                                await downloadPdf(mode, entityId, filename, s.id);
                              } catch {
                                showToast('error', 'PDF indirilemedi');
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                            title="PDF Karne İndir"
                          >
                            {downloadingId === s.id
                              ? <span className="spinner-border spinner-border-sm me-1"></span>
                              : <i className="ti ti-file-type-pdf me-1"></i>}
                            İndir
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
      </div>

      {/* ── Download note ── */}
      <div className="mt-3 text-muted small d-flex align-items-center gap-2">
        <i className="ti ti-info-circle"></i>
        <span>
          PDF karneler doğrudan tarayıcıda açılır ve indirilir.
          Toplu indirme tüm öğrencileri tek bir PDF dosyasında birleştirir.
          {mode === 'session' && ' Çoklu oturum karnesinde her öğrencinin tüm oturum sonuçları konsolide edilir.'}
        </span>
      </div>
    </div>
  );
}
