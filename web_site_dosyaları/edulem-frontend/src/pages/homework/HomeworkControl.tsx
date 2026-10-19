import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

type ReviewStatus = 'done' | 'not_done' | 'partial' | 'completed' | 'absent' | '';

interface ControlStudent {
  student_id: number;
  student_name: string;
  school_no?: string;
  review_status: ReviewStatus;
  teacher_note: string;
  reviewed_at?: string | null;
}

interface HomeworkSummary {
  id: number;
  title: string;
  assignment_mode?: string;
  due_date?: string;
  lesson?: { id: number; name: string } | null;
  classroom?: { id: number; name: string } | null;
}

const STATUS_OPTIONS: Array<{ value: ReviewStatus; label: string }> = [
  { value: '', label: 'Seçilmedi' },
  { value: 'done', label: 'Yaptı' },
  { value: 'not_done', label: 'Yapılmadı' },
  { value: 'partial', label: 'Eksik' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'absent', label: 'Gelmedi' },
];

const HomeworkControl = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homework, setHomework] = useState<HomeworkSummary | null>(null);
  const [students, setStudents] = useState<ControlStudent[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchControlData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchControlData = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/homework/${id}/control`);
      const data = response.data?.data ?? response.data;

      setHomework(data?.homework ?? null);
      const rows = Array.isArray(data?.students) ? data.students : [];
      setStudents(
        rows.map((row: any) => ({
          student_id: Number(row.student_id),
          student_name: String(row.student_name ?? ''),
          school_no: row.school_no ? String(row.school_no) : undefined,
          review_status: (row.review_status ?? '') as ReviewStatus,
          teacher_note: String(row.teacher_note ?? ''),
          reviewed_at: row.reviewed_at ?? null,
        }))
      );
    } catch (error) {
      console.error('Ödev kontrol verisi yüklenemedi:', error);
      showToast('error', 'Ödev kontrol verisi yüklenemedi');
      navigate('/academic/homework');
    } finally {
      setLoading(false);
    }
  };

  const reviewedCount = useMemo(
    () => students.filter((s) => s.review_status !== '').length,
    [students]
  );

  const handleStatusChange = (studentId: number, value: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, review_status: value as ReviewStatus } : s
      )
    );
  };

  const handleBulkStatus = (status: ReviewStatus, onlyEmpty: boolean = true) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (onlyEmpty && s.review_status !== '') {
          return s;
        }
        return { ...s, review_status: status };
      })
    );
  };

  const handleNoteChange = (studentId: number, value: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, teacher_note: value } : s))
    );
  };

  const handleSave = async (forceArchive: boolean = false) => {
    if (!id) return;

    try {
      setSaving(true);
      const res = await axiosClient.put(`/homework/${id}/control`, {
        force_archive: forceArchive,
        entries: students.map((s) => ({
          student_id: s.student_id,
          review_status: s.review_status || null,
          teacher_note: s.teacher_note?.trim() || null,
        })),
      });

      const message = res.data?.message || 'Ödev kontrol kayıtları kaydedildi';
      showToast('success', message);
      navigate('/academic/homework');
    } catch (error: any) {
      console.error('Ödev kontrol kaydı başarısız:', error);
      const msg =
        error?.response?.data?.message ||
        (error?.response?.data?.errors
          ? (Object.values(error.response.data.errors)[0] as any)?.[0]
          : null) ||
        'Ödev kontrol kaydı yapılamadı';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="page-title mb-1">Ödev Kontrol</h4>
          <small className="text-muted">
            {homework?.title ?? 'Ödev'} - {reviewedCount}/{students.length} öğrenci kontrol edildi
          </small>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate('/academic/homework')}
        >
          <i className="ti ti-arrow-left me-1"></i>
          Listeye Dön
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div className="row g-3 small flex-grow-1">
              <div className="col-12 col-md-4"><strong>Ders:</strong> {homework?.lesson?.name ?? '—'}</div>
              <div className="col-12 col-md-4"><strong>Sınıf:</strong> {homework?.classroom?.name ?? '—'}</div>
              <div className="col-12 col-md-4"><strong>Teslim:</strong> {homework?.due_date ?? '—'}</div>
            </div>
            <div className="badge bg-light text-dark border p-2">
              <strong>{reviewedCount}</strong> / {students.length} Öğrenci Değerlendirildi
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 pt-2 border-top flex-wrap">
            <span className="small text-muted fw-semibold me-1"><i className="ti ti-bolt me-1"></i>Hızlı İşlem:</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-success rounded-pill px-2 py-1"
              style={{ fontSize: '0.8rem' }}
              onClick={() => handleBulkStatus('done', true)}
              title="Henüz seçilmemiş olan tüm öğrencileri 'Yaptı' olarak ayarlar"
            >
              <i className="ti ti-check me-1"></i>Kalanları 'Yaptı' Yap
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning rounded-pill px-2 py-1"
              style={{ fontSize: '0.8rem' }}
              onClick={() => handleBulkStatus('absent', true)}
              title="Henüz seçilmemiş olan öğrencileri 'Gelmedi' olarak ayarlar"
            >
              <i className="ti ti-user-x me-1"></i>Kalanları 'Gelmedi' Yap
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill px-2 py-1"
              style={{ fontSize: '0.8rem' }}
              onClick={() => handleBulkStatus('', false)}
              title="Tüm seçimleri sıfırlar"
            >
              <i className="ti ti-refresh me-1"></i>Sıfırla
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Öğrenci</th>
                  <th style={{ minWidth: 220 }}>Durum</th>
                  <th style={{ minWidth: 320 }}>Veliye Not</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      Bu ödeve atanmış öğrenci bulunamadı.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.student_id}>
                      <td className="ps-4">
                        <div className="fw-semibold">{student.student_name}</div>
                        <small className="text-muted">{student.school_no ? `No: ${student.school_no}` : ''}</small>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={student.review_status}
                          onChange={(e) => handleStatusChange(student.student_id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value || 'empty'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Veliye not..."
                          value={student.teacher_note}
                          onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                          maxLength={1000}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
          <div className="text-muted small">
            {reviewedCount === students.length && students.length > 0 ? (
              <span className="text-success fw-medium">
                <i className="ti ti-circle-check me-1"></i>Tüm öğrenciler değerlendirildi. Kaydettiğinizde ödev otomatik olarak arşive aktarılacaktır.
              </span>
            ) : (
              <span className="text-secondary">
                <i className="ti ti-info-circle me-1"></i>Değerlendirilen öğrencilerin durumları anında veli ve öğrenci portallarına yansır. Kontrol edilmeyen öğrenci kaldığı sürece ödev <strong>bekleyenler</strong> sekmesinde kalır.
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate('/academic/homework')}
              disabled={saving}
            >
              İptal
            </button>
            {reviewedCount < students.length && students.length > 0 && (
              <button
                type="button"
                className="btn btn-outline-warning"
                onClick={() => handleSave(true)}
                disabled={saving}
                title="Eksik öğrenciler olmasına rağmen ödevi tamamlayıp arşive taşır"
              >
                <i className="ti ti-archive me-1"></i>Tümünü Kapat ve Arşive Al
              </button>
            )}
            <button
              type="button"
              className={`btn ${reviewedCount === students.length && students.length > 0 ? 'btn-success' : 'btn-primary'}`}
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving
                ? 'Kaydediliyor...'
                : reviewedCount === students.length && students.length > 0
                ? 'Kontrolü Tamamla ve Arşive Al'
                : `Kontrolü Kaydet (${reviewedCount}/${students.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeworkControl;
