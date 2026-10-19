import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Exam {
  id: number;
  name: string;
  exam_type: string;
  session: string | null;
  level: string | null;
  exam_date: string | null;
  duration: number | null;
  season: string | null;
  test_code: string | null;
  wrong_penalty: number | null;
  omr_template_id: number | null;
  status: 'draft' | 'active' | 'archived';
  results_count?: number;
  configured_at?: string | null;
  is_configured?: boolean;
  exam_courses_count?: number;
  answer_keys_count?: number;
  share_roles?: { parent?: boolean; teacher?: boolean } | null;
}

const EXAM_TYPES = ['LGS', 'YKS-TYT', 'YKS-AYT', 'YKS-DIL', 'Bursluluk', 'Diğer'];
const SESSION_MAP: Record<string, string[]> = {
  'LGS': ['Sözel', 'Sayısal'],
  'YKS-TYT': ['TYT'],
  'YKS-AYT': ['AYT'],
  'YKS-DIL': ['DİL'],
};
const LEVELS = ['4.SINIF', '5.SINIF', '6.SINIF', '7.SINIF', '8.SINIF', '9.SINIF', '10.SINIF', '11.SINIF', '12.SINIF', 'YKS'];
const PENALTY_MAP: Record<string, number> = { 'LGS': 3, 'YKS-TYT': 4, 'YKS-AYT': 4, 'YKS-DIL': 4 };

const defaultForm = {
  name: '', exam_type: 'LGS', session: '', level: '', exam_date: '', wrong_penalty: 0,
};

export default function OmrExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState(defaultForm);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);



  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeName, setMergeName] = useState('');
  const [mergeIds, setMergeIds] = useState<number[]>([]);
  const [merging, setMerging] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareExam, setShareExam] = useState<Exam | null>(null);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareForm, setShareForm] = useState<{ parent: boolean; teacher: boolean }>({ parent: false, teacher: false });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const eRes = await axiosClient.get('/omr/exams');
      const payloadExams = eRes.data?.data?.exams;
      setExams(Array.isArray(payloadExams) ? payloadExams : []);
    } catch {
      showToast('error', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultForm, exam_date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openMerge = () => {
    setMergeName('');
    setMergeIds([]);
    setShowMergeModal(true);
  };

  const toggleMergeId = (id: number) => {
    setMergeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const doMerge = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!mergeName.trim()) {
      showToast('error', 'Yeni sınav adı zorunlu');
      return;
    }
    if (mergeIds.length < 2) {
      showToast('error', 'En az 2 sınav seçin');
      return;
    }
    try {
      setMerging(true);
      const r = await axiosClient.post('/omr/exams/merge', { name: mergeName.trim(), exam_ids: mergeIds });
      const newExamId = r?.data?.data?.exam?.id;
      showToast('success', 'Sınavlar birleştirildi');
      setShowMergeModal(false);
      await fetchAll();
      if (newExamId) {
        navigate(`/omr/exams/${newExamId}/analytics`);
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Birleştirme başarısız');
    } finally {
      setMerging(false);
    }
  };

  const openEdit = (e: Exam) => {
    setEditing(e);
    setForm({
      name: e.name, exam_type: e.exam_type, session: e.session ?? '',
      level: e.level ?? '', exam_date: e.exam_date ?? '',
      wrong_penalty: e.wrong_penalty ?? 0,
    });
    setShowModal(true);
  };

  const openShare = (e: Exam) => {
    setShareExam(e);
    const roles = e.share_roles ?? {};
    setShareForm({ parent: Boolean(roles.parent), teacher: Boolean(roles.teacher) });
    setShowShareModal(true);
  };

  const saveShare = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!shareExam) return;
    try {
      setShareSaving(true);
      await axiosClient.put(`/omr/exams/${shareExam.id}`, { share_roles: shareForm });
      showToast('success', 'Paylaşım ayarı kaydedildi');
      setShowShareModal(false);
      setShareExam(null);
      fetchAll();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Paylaşım ayarı kaydedilemedi');
    } finally {
      setShareSaving(false);
    }
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        await axiosClient.put(`/omr/exams/${editing.id}`, form);
        showToast('success', 'Sınav güncellendi');
      } else {
        await axiosClient.post('/omr/exams', form);
        showToast('success', 'Sınav oluşturuldu');
      }
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async (e: Exam) => {
    const ok = await confirmDialog({ text: `"${e.name}" sınavını silmek istediğinizden emin misiniz?`, confirmText: 'Sil', cancelText: 'İptal', icon: 'warning' });
    if (!ok) return;
    try {
      await axiosClient.delete(`/omr/exams/${e.id}`);
      showToast('success', 'Sınav silindi');
      fetchAll();
    } catch { showToast('error', 'Silme başarısız'); }
  };



  const sessionOptions = SESSION_MAP[form.exam_type] ?? [];

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Sınavlar</h3>
          <p className="text-muted mb-0">OMR sınavlarını oluşturun, cevap anahtarı girin ve optik dosyası yükleyin.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="ti ti-plus me-1"></i> Yeni Sınav
          </button>
          <button className="btn btn-outline-primary" onClick={openMerge}>
            <i className="ti ti-arrows-join me-1"></i> Birleştir
          </button>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item active fw-medium">OMR Sınavları</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0 pt-3">
          <div className="row align-items-center">
            <div className="col">
              <div className="d-flex align-items-center gap-3">
                <div className="input-group input-group-sm" style={{ width: 250 }}>
                  <span className="input-group-text bg-white border-end-0"><i className="ti ti-search text-muted"></i></span>
                  <input 
                    type="text" 
                    className="form-control border-start-0 ps-0" 
                    placeholder="Sınav ara..." 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : exams.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-clipboard-list fs-1 d-block mb-2"></i>
              Henüz sınav oluşturulmamış
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 text-dark">

                <thead className="table-light">
                  <tr>
                    <th>Sınav Adı</th>
                    <th>Tür / Oturum</th>
                    <th>Seviye</th>
                    <th>Tarih</th>
                    <th>Yapılandırma</th>
                    <th className="text-center">Sonuç</th>
                    <th>Paylaş</th>
                    <th className="text-end" style={{ width: 260 }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(e => {
                    const isMerged = Array.isArray((e as any).merged_exam_ids) && (e as any).merged_exam_ids.length > 0;
                    return (
                      <tr key={e.id} className={isMerged ? 'table-info' : ''} style={{ color: 'black', backgroundColor: isMerged ? '#f0f7ff' : 'transparent' }}>
                        <td style={{ color: 'black' }}>

                          <div className="d-flex align-items-center gap-2">
                            {isMerged && <i className="ti ti-arrows-join text-primary fs-5" title="Birleştirilmiş Sınav"></i>}
                            <div>
                              <div className="fw-semibold text-dark">{e.name}</div>

                              {e.test_code && <div className="text-muted small">Kod: {e.test_code}</div>}
                              {isMerged && <span className="badge bg-soft-primary text-primary border border-primary-subtle" style={{ fontSize: '10px' }}>BİRLEŞTİRİLMİŞ</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-primary me-1">{e.exam_type}</span>
                          {e.session && <span className="badge bg-info">{e.session}</span>}
                        </td>
                        <td>{e.level ?? '-'}</td>
                        <td>{e.exam_date ? new Date(e.exam_date).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>
                          <span className={`badge ${e.is_configured ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {e.is_configured ? 'Tamamlandı' : 'Eksik'}
                          </span>
                          <div className="small text-muted mt-1">
                            Ders: {e.exam_courses_count ?? 0} · Anahtar: {e.answer_keys_count ?? 0}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="fw-bold text-dark">{e.results_count ?? 0}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <div className="small">
                              <div className="fw-semibold">Kimler görebilir?</div>
                              <div className="text-muted">
                                {e.share_roles?.parent ? 'Veli' : ''}
                                {(e.share_roles?.parent && e.share_roles?.teacher) ? ' · ' : ''}
                                {e.share_roles?.teacher ? 'Öğretmen' : ''}
                                {(!e.share_roles?.parent && !e.share_roles?.teacher) ? 'Kapalı' : ''}
                              </div>
                            </div>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openShare(e)}>
                              Ayarla
                            </button>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-soft-primary"
                              onClick={() => navigate(`/omr/exams/${e.id}/configure`)}
                              title="Yapılandır"
                              disabled={isMerged}
                            >
                              <i className="ti ti-settings me-1"></i> Yapılandır
                            </button>
                            <button
                              className="btn btn-sm btn-soft-success"
                              onClick={() => navigate(`/omr/exams/${e.id}/import`)}
                              title="Optik Yükle"
                              disabled={!e.is_configured || isMerged}
                            >
                              <i className="ti ti-upload me-1"></i> Optik
                            </button>
                            <button className="btn btn-sm btn-soft-info" onClick={() => navigate(`/omr/exams/${e.id}/analytics`)} title="Analiz" disabled={!e.is_configured}>
                              <i className="ti ti-chart-bar me-1"></i> Analiz
                            </button>
                            <button className="btn btn-sm btn-soft-warning" onClick={() => navigate(`/omr/exams/${e.id}/report-card`)} title="Karne" disabled={!e.results_count}>
                              <i className="ti ti-id-badge-2 me-1"></i> Karne
                            </button>
                            <button className="btn btn-sm btn-soft-primary" onClick={() => openEdit(e)} title="Düzenle">
                              <i className="ti ti-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-soft-danger" onClick={() => deleteExam(e)} title="Sil">
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination UI */}
        {!loading && exams.length > 0 && (
          <div className="card-footer bg-white border-top-0 py-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="text-muted small">
                  Toplam <strong>{exams.length}</strong> sınavdan <strong>{itemsPerPage > 0 ? (currentPage - 1) * itemsPerPage + 1 : 1}-{itemsPerPage > 0 ? Math.min(currentPage * itemsPerPage, exams.length) : exams.length}</strong> arası gösteriliyor
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Göster:</span>
                  <select 
                    className="form-select form-select-sm" 
                    style={{ width: 'auto' }}
                    value={itemsPerPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setItemsPerPage(val);
                      setCurrentPage(1);
                    }}
                  >
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={exams.length || 999999}>Tümü</option>
                  </select>
                </div>
              </div>
              {itemsPerPage > 0 && itemsPerPage < exams.length && (
                <nav>
                  <ul className="pagination pagination-sm m-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>Geri</button>
                    </li>
                    {Array.from({ length: Math.ceil(exams.length / itemsPerPage) }, (_, i) => (
                      <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === Math.ceil(exams.length / itemsPerPage) ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(Math.ceil(exams.length / itemsPerPage), prev + 1))}>İleri</button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        )}

      </div>


      {/* Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Sınav Düzenle' : 'Yeni Sınav'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={save}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Sınav Adı <span className="text-danger">*</span></label>
                      <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="8. Sınıf LGS Deneme - 1" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Sınav Türü <span className="text-danger">*</span></label>
                      <select className="form-select" value={form.exam_type} onChange={e => {
                        const et = e.target.value;
                        setForm({ ...form, exam_type: et, session: '', wrong_penalty: PENALTY_MAP[et] ?? 0 });
                      }}>
                        {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {sessionOptions.length > 0 && (
                      <div className="col-md-4">
                        <label className="form-label">Oturum</label>
                        <select className="form-select" value={form.session} onChange={e => setForm({ ...form, session: e.target.value })}>
                          <option value="">Seçiniz...</option>
                          {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="col-md-4">
                      <label className="form-label">Seviye</label>
                      <select className="form-select" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                        <option value="">Seçiniz...</option>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Sınav Tarihi</label>
                      <input type="date" className="form-control" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} />
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

      {showMergeModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sınav Birleştir</h5>
                <button className="btn-close" onClick={() => setShowMergeModal(false)}></button>
              </div>
              <form onSubmit={doMerge}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Yeni Sınav Adı <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        value={mergeName}
                        onChange={(e) => setMergeName(e.target.value)}
                        placeholder="2026 LGS Deneme 3 (Birleşik)"
                        required
                      />
                      <div className="small text-muted mt-1">
                        Not: Birleştirme yeni bir sınav oluşturur. Analizler tek sınav gibi, seçilen sınavların sonuçları toplanarak yapılır.
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Birleştirilecek Sınavlar <span className="text-danger">*</span></label>
                      <div className="border rounded" style={{ maxHeight: 360, overflow: 'auto' }}>
                        {exams.map((e) => (
                          <label key={e.id} className="d-flex align-items-start gap-2 px-3 py-2 border-bottom" style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              className="form-check-input mt-1"
                              checked={mergeIds.includes(e.id)}
                              onChange={() => toggleMergeId(e.id)}
                            />
                            <span style={{ flex: 1 }}>
                              <div className="fw-semibold">{e.name}</div>
                              <div className="text-muted small">
                                {e.exam_type}{e.session ? ` • ${e.session}` : ''}{e.exam_date ? ` • ${new Date(e.exam_date).toLocaleDateString('tr-TR')}` : ''}
                              </div>
                            </span>
                            <span className="small text-muted">{e.results_count ?? 0} sonuç</span>
                          </label>
                        ))}
                        {exams.length === 0 && <div className="text-muted small px-3 py-3">Sınav bulunamadı</div>}
                      </div>
                      <div className="small text-muted mt-2">Seçili: {mergeIds.length}</div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowMergeModal(false)} disabled={merging}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={merging}>
                    {merging && <span className="spinner-border spinner-border-sm me-1"></span>}
                    Birleştir
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showShareModal && shareExam && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Paylaşım Ayarı</h5>
                <button className="btn-close" onClick={() => { setShowShareModal(false); setShareExam(null); }}></button>
              </div>
              <form onSubmit={saveShare}>
                <div className="modal-body">
                  <div className="mb-2 fw-semibold">{shareExam.name}</div>
                  <div className="text-muted small mb-3">Bu sınavı kimler görebilsin?</div>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="share-parent"
                      checked={shareForm.parent}
                      onChange={(e) => setShareForm((p) => ({ ...p, parent: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="share-parent">Veli görebilsin</label>
                  </div>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="share-teacher"
                      checked={shareForm.teacher}
                      onChange={(e) => setShareForm((p) => ({ ...p, teacher: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="share-teacher">Öğretmen görebilsin</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => { setShowShareModal(false); setShareExam(null); }}
                    disabled={shareSaving}
                  >
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={shareSaving}>
                    {shareSaving && <span className="spinner-border spinner-border-sm me-1"></span>}
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
