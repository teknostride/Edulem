import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

type TrialListItem = {
  id: number;
  name: string;
};

type TrialDetail = {
  id: number;
  name: string;
  booklets: Array<{ id: number; name: string; question_count: number }>;
};

type ImportResponse = {
  summary?: {
    processed?: number;
    inserted?: number;
    updated?: number;
    skipped?: number;
  };
  errors?: Array<{ row?: number; error?: string; school_no?: string }>;
  import?: any;
};

const MeasurementOpticalReading = () => {
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [trials, setTrials] = useState<TrialListItem[]>([]);
  const [selectedTrialId, setSelectedTrialId] = useState<number | ''>('');

  const [loadingTrial, setLoadingTrial] = useState(false);
  const [trial, setTrial] = useState<TrialDetail | null>(null);
  const [selectedBookletId, setSelectedBookletId] = useState<number | ''>('');

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  const selectedTrial = useMemo(() => {
    if (selectedTrialId === '') return null;
    return trials.find((t) => t.id === selectedTrialId) ?? null;
  }, [selectedTrialId, trials]);

  const fetchTrials = async () => {
    setLoadingTrials(true);
    try {
      const res = await axiosClient.get('/measurement/trials', { params: { per_page: 200 } });
      const list = (res?.data?.data?.trials ?? []) as TrialListItem[];
      setTrials(list);
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Denemeler alınamadı.');
    } finally {
      setLoadingTrials(false);
    }
  };

  const fetchTrial = async (trialId: number) => {
    setLoadingTrial(true);
    try {
      const res = await axiosClient.get(`/measurement/trials/${trialId}`);
      const d = res?.data?.data ?? res?.data;
      const t = d?.trial as TrialDetail;
      setTrial(t);
      const booklets = Array.isArray(t?.booklets) ? t.booklets : [];
      setSelectedBookletId(booklets[0]?.id ?? '');
    } catch (e: any) {
      setTrial(null);
      setSelectedBookletId('');
      showToast('error', e?.response?.data?.message || 'Deneme yüklenemedi.');
    } finally {
      setLoadingTrial(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, []);

  useEffect(() => {
    setTrial(null);
    setSelectedBookletId('');
    setFile(null);
    setImportResult(null);

    if (selectedTrialId !== '') {
      fetchTrial(selectedTrialId);
    }
  }, [selectedTrialId]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTrialId === '') {
      showToast('error', 'Deneme seçmelisiniz');
      return;
    }
    if (!file) {
      showToast('error', 'Dosya seçmelisiniz');
      return;
    }

    const form = new FormData();
    form.append('file', file);
    if (selectedBookletId !== '') {
      form.append('booklet_id', String(selectedBookletId));
    }

    setUploading(true);
    setImportResult(null);
    try {
      const res = await axiosClient.post(`/measurement/trials/${selectedTrialId}/imports/optical`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = (res?.data?.data ?? res?.data) as ImportResponse;
      setImportResult(payload);
      showToast('success', 'Optik sonuçları içe aktarıldı');
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Optik yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h4 className="mb-0">Optik Okuma</h4>
              <div className="text-muted small">CSV/XLSX yükleyerek sonuçları hesaplatın.</div>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchTrials}
              disabled={loadingTrials}
              type="button"
            >
              {loadingTrials ? 'Yükleniyor...' : 'Yenile'}
            </button>
          </div>

          <div className="row mt-3 g-3">
            <div className="col-12 col-lg-4">
              <label className="form-label">Deneme</label>
              <select
                className="form-select"
                value={selectedTrialId}
                onChange={(e) => setSelectedTrialId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seçiniz</option>
                {trials.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-3">
              <label className="form-label">Kitapçık</label>
              <select
                className="form-select"
                value={selectedBookletId}
                onChange={(e) => setSelectedBookletId(e.target.value ? Number(e.target.value) : '')}
                disabled={selectedTrialId === '' || loadingTrial || !trial}
              >
                {(trial?.booklets ?? []).length === 0 ? <option value="">Önce kitapçık ekleyin</option> : null}
                {(trial?.booklets ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.question_count})
                  </option>
                ))}
              </select>
              {selectedTrial ? <div className="text-muted small mt-1">Seçili deneme: {selectedTrial.name}</div> : null}
            </div>

            <div className="col-12 col-lg-5">
              <label className="form-label">Dosya</label>
              <input
                className="form-control"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={selectedTrialId === '' || uploading}
              />
              <div className="text-muted small mt-1">
                Zorunlu alan: <code>school_no</code> • Cevaplar: <code>answers</code>
              </div>
            </div>
          </div>

          <form onSubmit={upload} className="mt-3 d-flex align-items-center gap-2 flex-wrap">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={uploading || selectedTrialId === '' || !file || selectedBookletId === ''}
            >
              {uploading ? 'Yükleniyor...' : 'İçe Aktar'}
            </button>
            {selectedBookletId === '' && selectedTrialId !== '' ? (
              <div className="text-muted small">İçe aktarma için kitapçık seçmelisiniz.</div>
            ) : null}
          </form>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <div className="fw-semibold">İçe Aktarım Özeti</div>
            </div>
            <div className="card-body">
              {!importResult?.summary ? (
                <div className="text-muted">Henüz işlem yapılmadı.</div>
              ) : (
                <div className="d-grid gap-2">
                  <div className="d-flex justify-content-between"><span>İşlenen</span><strong>{importResult.summary.processed ?? 0}</strong></div>
                  <div className="d-flex justify-content-between"><span>Eklenen</span><strong>{importResult.summary.inserted ?? 0}</strong></div>
                  <div className="d-flex justify-content-between"><span>Güncellenen</span><strong>{importResult.summary.updated ?? 0}</strong></div>
                  <div className="d-flex justify-content-between"><span>Atlanan</span><strong>{importResult.summary.skipped ?? 0}</strong></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between">
              <div className="fw-semibold">Hata / Uyarılar</div>
              {importResult?.errors?.length ? (
                <span className="text-muted small">{importResult.errors.length} kayıt</span>
              ) : null}
            </div>
            <div className="card-body">
              {!importResult?.errors || importResult.errors.length === 0 ? (
                <div className="text-muted">Hata yok.</div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 520 }}>
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="sticky-top bg-white">
                      <tr>
                        <th>Satır</th>
                        <th>Okul No</th>
                        <th>Hata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((er, idx) => (
                        <tr key={idx}>
                          <td>{er.row ?? '-'}</td>
                          <td>{er.school_no ?? '-'}</td>
                          <td>{er.error ?? '-'}</td>
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

export default MeasurementOpticalReading;
