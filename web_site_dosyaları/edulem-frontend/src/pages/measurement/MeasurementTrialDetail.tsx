import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

type TrialStatus = 'draft' | 'published' | 'archived';

interface Booklet {
  id: number;
  name: string;
  question_count: number;
  answer_key?: any;
}

interface Trial {
  id: number;
  name: string;
  description?: string | null;
  exam_date?: string | null;
  status: TrialStatus;
  booklets: Booklet[];
}

interface ResultItem {
  id: number;
  student?: {
    id: number;
    name: string;
    school_no?: string | null;
  };
  booklet?: {
    id: number;
    name: string;
  };
  correct: number;
  wrong: number;
  blank: number;
  net: number;
}

const MeasurementTrialDetail = () => {
  const { id } = useParams<{ id: string }>();
  const trialId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState<Trial | null>(null);

  const [bookletSaving, setBookletSaving] = useState(false);
  const [newBooklet, setNewBooklet] = useState({
    name: 'A',
    question_count: 20,
    answer_key: '',
  });

  const [editBookletId, setEditBookletId] = useState<number | null>(null);
  const [editBooklet, setEditBooklet] = useState({
    name: '',
    question_count: 0,
    answer_key: '',
  });

  const [resultsLoading, setResultsLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBookletId, setUploadBookletId] = useState<number | ''>('');

  const statusLabel = useMemo(() => {
    return {
      draft: 'Taslak',
      published: 'Yayınlandı',
      archived: 'Arşiv',
    } as Record<TrialStatus, string>;
  }, []);

  const fetchTrial = async () => {
    if (!trialId || Number.isNaN(trialId)) {
      navigate('/measurement/trials');
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.get(`/measurement/trials/${trialId}`);
      const d = res.data?.data ?? res.data;
      const t = d?.trial;
      setTrial(t);

      const booklets = Array.isArray(t?.booklets) ? t.booklets : [];
      if (booklets.length > 0) {
        setUploadBookletId(booklets[0].id);
      }
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Deneme yüklenemedi');
      navigate('/measurement/trials');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!trialId || Number.isNaN(trialId)) return;
    try {
      setResultsLoading(true);
      const res = await axiosClient.get(`/measurement/trials/${trialId}/results`, { params: { per_page: 200 } });
      const d = res.data?.data ?? res.data;
      const raw = d?.results;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setResults(list);
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Sonuçlar yüklenemedi');
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrial();
    fetchResults();
  }, [trialId]);

  const normalizeAnswerKeyForUi = (ak: any): string => {
    if (!ak) return '';
    if (typeof ak === 'string') return ak;
    if (Array.isArray(ak)) return ak.map((x) => String(x ?? '')).join('');
    return '';
  };

  const openEditBooklet = (b: Booklet) => {
    setEditBookletId(b.id);
    setEditBooklet({
      name: b.name,
      question_count: Number(b.question_count ?? 0),
      answer_key: normalizeAnswerKeyForUi(b.answer_key),
    });
  };

  const closeEditBooklet = () => {
    setEditBookletId(null);
    setEditBooklet({ name: '', question_count: 0, answer_key: '' });
  };

  const createBooklet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialId || Number.isNaN(trialId)) return;

    try {
      setBookletSaving(true);
      await axiosClient.post(`/measurement/trials/${trialId}/booklets`, {
        name: String(newBooklet.name || '').trim(),
        question_count: Number(newBooklet.question_count),
        answer_key: String(newBooklet.answer_key || '').trim() || null,
      });
      showToast('success', 'Kitapçık oluşturuldu');
      setNewBooklet({ name: 'A', question_count: 20, answer_key: '' });
      await fetchTrial();
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Kitapçık oluşturulamadı');
    } finally {
      setBookletSaving(false);
    }
  };

  const updateBooklet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialId || Number.isNaN(trialId) || !editBookletId) return;

    try {
      setBookletSaving(true);
      await axiosClient.put(`/measurement/trials/${trialId}/booklets/${editBookletId}`, {
        name: String(editBooklet.name || '').trim(),
        question_count: Number(editBooklet.question_count),
        answer_key: String(editBooklet.answer_key || '').trim() || null,
      });
      showToast('success', 'Kitapçık güncellendi');
      closeEditBooklet();
      await fetchTrial();
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Kitapçık güncellenemedi');
    } finally {
      setBookletSaving(false);
    }
  };

  const uploadOptical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialId || Number.isNaN(trialId)) return;
    if (!uploadFile) {
      showToast('error', 'Dosya seçmelisiniz');
      return;
    }

    const form = new FormData();
    form.append('file', uploadFile);
    if (uploadBookletId) {
      form.append('booklet_id', String(uploadBookletId));
    }

    try {
      setUploading(true);
      await axiosClient.post(`/measurement/trials/${trialId}/imports/optical`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      showToast('success', 'Optik sonuçları içe aktarıldı');
      setUploadFile(null);
      await fetchTrial();
      await fetchResults();
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Optik yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      </div>
    );
  }

  if (!trial) {
    return null;
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="page-title mb-1">{trial.name}</h4>
          <div className="text-muted">
            {trial.exam_date ? new Date(trial.exam_date).toLocaleDateString('tr-TR') : '-'}
            <span className="mx-2">•</span>
            {statusLabel[trial.status]}
          </div>
        </div>
        <div className="d-flex gap-2">
          <Link to="/measurement/trials" className="btn btn-light">
            <i className="ti ti-arrow-left me-1"></i> Liste
          </Link>
        </div>
      </div>

      {trial.description ? (
        <div className="alert alert-light border mb-4">{trial.description}</div>
      ) : null}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Kitapçıklar</h5>
              <span className="text-muted small">Cevap anahtarı girin</span>
            </div>
            <div className="card-body">
              <div className="table-responsive mb-3">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Ad</th>
                      <th className="text-center">Soru</th>
                      <th className="text-end">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trial.booklets || []).map((b) => (
                      <tr key={b.id}>
                        <td className="fw-semibold">{b.name}</td>
                        <td className="text-center">{b.question_count}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-soft-primary" onClick={() => openEditBooklet(b)}>
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!trial.booklets || trial.booklets.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-3">Kitapçık yok</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <form onSubmit={createBooklet} className="border rounded p-3">
                <div className="fw-semibold mb-2">Yeni kitapçık</div>
                <div className="row g-2">
                  <div className="col-4">
                    <label className="form-label">Ad</label>
                    <input
                      className="form-control"
                      value={newBooklet.name}
                      onChange={(e) => setNewBooklet({ ...newBooklet, name: e.target.value })}
                      maxLength={50}
                      required
                    />
                  </div>
                  <div className="col-8">
                    <label className="form-label">Soru Sayısı</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newBooklet.question_count}
                      onChange={(e) => setNewBooklet({ ...newBooklet, question_count: Number(e.target.value) })}
                      min={1}
                      max={500}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Cevap Anahtarı</label>
                    <input
                      className="form-control"
                      value={newBooklet.answer_key}
                      onChange={(e) => setNewBooklet({ ...newBooklet, answer_key: e.target.value })}
                      placeholder="Örn: ABCDABCD..."
                    />
                    <div className="text-muted small mt-1">Boş bırakabilirsiniz, sonra girersiniz.</div>
                  </div>
                  <div className="col-12 text-end">
                    <button className="btn btn-primary" type="submit" disabled={bookletSaving}>
                      {bookletSaving ? (<span className="spinner-border spinner-border-sm me-1"></span>) : null}
                      Kaydet
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {editBookletId ? (
            <div className="card border-0 shadow-sm mt-4">
              <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
                <h5 className="mb-0">Kitapçık Düzenle</h5>
                <button className="btn btn-sm btn-light" type="button" onClick={closeEditBooklet}>Kapat</button>
              </div>
              <div className="card-body">
                <form onSubmit={updateBooklet}>
                  <div className="row g-3">
                    <div className="col-4">
                      <label className="form-label">Ad</label>
                      <input
                        className="form-control"
                        value={editBooklet.name}
                        onChange={(e) => setEditBooklet({ ...editBooklet, name: e.target.value })}
                        maxLength={50}
                        required
                      />
                    </div>
                    <div className="col-8">
                      <label className="form-label">Soru Sayısı</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editBooklet.question_count}
                        onChange={(e) => setEditBooklet({ ...editBooklet, question_count: Number(e.target.value) })}
                        min={1}
                        max={500}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Cevap Anahtarı</label>
                      <input
                        className="form-control"
                        value={editBooklet.answer_key}
                        onChange={(e) => setEditBooklet({ ...editBooklet, answer_key: e.target.value })}
                        placeholder="Örn: ABCDABCD..."
                      />
                    </div>
                    <div className="col-12 text-end">
                      <button className="btn btn-primary" type="submit" disabled={bookletSaving}>
                        {bookletSaving ? (<span className="spinner-border spinner-border-sm me-1"></span>) : null}
                        Güncelle
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">Optik Yükleme</h5>
            </div>
            <div className="card-body">
              <form onSubmit={uploadOptical}>
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label">Kitapçık</label>
                    <select
                      className="form-select"
                      value={uploadBookletId}
                      onChange={(e) => setUploadBookletId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!trial.booklets || trial.booklets.length === 0}
                    >
                      {(trial.booklets || []).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-5">
                    <label className="form-label">Dosya (CSV / XLSX)</label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                    <div className="text-muted small mt-1">Kolonlar: school_no, booklet (opsiyonel), answers</div>
                  </div>
                  <div className="col-md-3 text-end">
                    <button className="btn btn-primary w-100" type="submit" disabled={uploading || !uploadFile || (trial.booklets || []).length === 0}>
                      {uploading ? (<span className="spinner-border spinner-border-sm me-1"></span>) : null}
                      Yükle
                    </button>
                  </div>
                </div>
              </form>

              {(trial.booklets || []).length === 0 ? (
                <div className="alert alert-warning mt-3 mb-0">
                  Optik yüklemek için önce en az 1 kitapçık oluşturup cevap anahtarı girin.
                </div>
              ) : null}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Sonuçlar</h5>
              <button className="btn btn-sm btn-light" onClick={fetchResults} disabled={resultsLoading}>
                Yenile
              </button>
            </div>
            <div className="card-body">
              {resultsLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-4 text-muted">Henüz sonuç yok</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Okul No</th>
                        <th>Öğrenci</th>
                        <th>Kitapçık</th>
                        <th className="text-center">D</th>
                        <th className="text-center">Y</th>
                        <th className="text-center">B</th>
                        <th className="text-end">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.id}>
                          <td className="fw-semibold">{r.student?.school_no || '-'}</td>
                          <td>{r.student?.name || '-'}</td>
                          <td>{r.booklet?.name || '-'}</td>
                          <td className="text-center">{r.correct}</td>
                          <td className="text-center">{r.wrong}</td>
                          <td className="text-center">{r.blank}</td>
                          <td className="text-end fw-semibold">{Number(r.net).toFixed(2)}</td>
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
    </div>
  );
};

export default MeasurementTrialDetail;
