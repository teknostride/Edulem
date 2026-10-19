import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Exam { id: number; name: string; exam_type: string; session: string | null; exam_date: string | null; }
interface Session {
  id: number;
  name: string;
  exam_type: string;
  exam_date: string | null;
  exam_ids: number[];
  combined_results: any[] | null;
  calculated_at: string | null;
  created_at: string;
}

const defaultForm = { name: '', exam_type: 'LGS', exam_date: '', exam_ids: [] as number[] };

export default function OmrSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [sRes, eRes] = await Promise.all([
        axiosClient.get('/omr/sessions'),
        axiosClient.get('/omr/exams'),
      ]);
      const payloadSessions = sRes.data?.data?.sessions;
      const payloadExams = eRes.data?.data?.exams;
      setSessions(Array.isArray(payloadSessions) ? payloadSessions : []);
      setExams(Array.isArray(payloadExams) ? payloadExams : []);
    } catch {
      showToast('error', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleExam = (id: number) => {
    setForm(prev => ({
      ...prev,
      exam_ids: prev.exam_ids.includes(id)
        ? prev.exam_ids.filter(x => x !== id)
        : [...prev.exam_ids, id],
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.exam_ids.length < 2) { showToast('warning', 'En az 2 sınav seçin'); return; }
    try {
      setSaving(true);
      await axiosClient.post('/omr/sessions', form);
      showToast('success', 'Oturum oluşturuldu ve hesaplandı');
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const recalculate = async (s: Session) => {
    try {
      await axiosClient.post(`/omr/sessions/${s.id}/recalculate`);
      showToast('success', 'Oturum yeniden hesaplandı');
      fetchAll();
    } catch { showToast('error', 'Hesaplama başarısız'); }
  };

  const deleteSession = async (s: Session) => {
    const ok = await confirmDialog({ text: `"${s.name}" oturumunu silmek istediğinizden emin misiniz?`, confirmText: 'Sil', cancelText: 'İptal', icon: 'warning' });
    if (!ok) return;
    try {
      await axiosClient.delete(`/omr/sessions/${s.id}`);
      showToast('success', 'Oturum silindi');
      if (selectedSession?.id === s.id) setSelectedSession(null);
      fetchAll();
    } catch { showToast('error', 'Silme başarısız'); }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Oturum Birleştirme</h3>
          <p className="text-muted mb-0">Birden fazla sınavı birleştirerek genel sıralama ve puan hesaplayın.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setShowModal(true); }}>
            <i className="ti ti-plus me-1"></i> Yeni Oturum
          </button>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item active fw-medium">OMR Oturumları</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Sol: Oturum Listesi */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light"><h6 className="mb-0">Oturumlar</h6></div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary"></div></div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-4 text-muted">Henüz oturum oluşturulmamış</div>
              ) : (
                <div className="list-group list-group-flush">
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      className={`list-group-item list-group-item-action ${selectedSession?.id === s.id ? 'active' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedSession(s)}
                    >
                      <div className="d-flex align-items-start justify-content-between">
                        <div>
                          <div className="fw-semibold">{s.name}</div>
                          <div className="small text-muted">
                            <span className="badge bg-primary me-1">{s.exam_type}</span>
                            {s.exam_ids.length} sınav
                            {s.calculated_at && <span className="ms-2">· {new Date(s.calculated_at).toLocaleDateString('tr-TR')}</span>}
                          </div>
                        </div>
                        <div className="d-flex gap-1" onClick={ev => ev.stopPropagation()}>
                          <button className="btn btn-xs btn-soft-warning" onClick={() => navigate(`/omr/sessions/${s.id}/report-card`)} title="Karne" disabled={!s.combined_results?.length}>
                            <i className="ti ti-id-badge-2"></i>
                          </button>
                          <button className="btn btn-xs btn-soft-info" onClick={() => recalculate(s)} title="Yeniden Hesapla">
                            <i className="ti ti-refresh"></i>
                          </button>
                          <button className="btn btn-xs btn-soft-danger" onClick={() => deleteSession(s)} title="Sil">
                            <i className="ti ti-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: Birleşik Sonuçlar */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="mb-0">
                {selectedSession ? `${selectedSession.name} — Birleşik Sonuçlar` : 'Birleşik Sonuçlar'}
              </h6>
            </div>
            <div className="card-body p-0">
              {!selectedSession ? (
                <div className="text-center py-5 text-muted">
                  <i className="ti ti-arrow-left fs-3 d-block mb-2"></i>
                  Soldaki listeden bir oturum seçin
                </div>
              ) : !selectedSession.combined_results || selectedSession.combined_results.length === 0 ? (
                <div className="text-center py-4 text-muted">Henüz hesaplanmış sonuç yok</div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 500 }}>
                  <table className="table table-hover table-sm align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th style={{ width: 60 }}>Sıra</th>
                        <th>Öğrenci</th>
                        <th>Numara</th>
                        <th>Sınıf</th>
                        <th className="text-center">Toplam Net</th>
                        <th className="text-center">Toplam Puan</th>
                        <th className="text-center">Sınav Sayısı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSession.combined_results.map((r: any) => (
                        <tr key={r.student_id}>
                          <td className="fw-bold text-primary">{r.rank}</td>
                          <td>{r.student_name ?? `#${r.student_id}`}</td>
                          <td>{r.student_no ?? '-'}</td>
                          <td>{r.classroom_name ?? '-'}</td>
                          <td className="text-center fw-bold">{r.total_net?.toFixed(2)}</td>
                          <td className="text-center fw-bold text-success">{r.total_point?.toFixed(2)}</td>
                          <td className="text-center">{r.exam_count}</td>
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

      {/* Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Yeni Oturum Oluştur</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={save}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label">Oturum Adı <span className="text-danger">*</span></label>
                      <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="LGS 2025 Türkiye Geneli" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Sınav Türü</label>
                      <input className="form-control" value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })} placeholder="LGS, YKS..." />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Tarih</label>
                      <input type="date" className="form-control" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Birleştirilecek Sınavlar <span className="text-danger">*</span> <small className="text-muted fw-normal">(en az 2 seçin)</small></label>
                      <div className="border rounded p-2" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {exams.length === 0 ? (
                          <div className="text-muted small text-center py-2">Sınav bulunamadı</div>
                        ) : (
                          exams.map(e => (
                            <div key={e.id} className="form-check mb-1">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`exam_${e.id}`}
                                checked={form.exam_ids.includes(e.id)}
                                onChange={() => toggleExam(e.id)}
                              />
                              <label className="form-check-label" htmlFor={`exam_${e.id}`}>
                                <span className="fw-semibold">{e.name}</span>
                                <span className="badge bg-primary ms-2">{e.exam_type}</span>
                                {e.session && <span className="badge bg-info ms-1">{e.session}</span>}
                                {e.exam_date && <span className="text-muted ms-2 small">{new Date(e.exam_date).toLocaleDateString('tr-TR')}</span>}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      {form.exam_ids.length > 0 && (
                        <div className="mt-1 small text-success">{form.exam_ids.length} sınav seçildi</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)} disabled={saving}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
                    Oluştur ve Hesapla
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
