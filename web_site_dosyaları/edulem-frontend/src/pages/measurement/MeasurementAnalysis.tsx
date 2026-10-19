import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

type TrialListItem = {
  id: number;
  name: string;
  exam_date?: string | null;
  status?: string | null;
};

type AnalysisResponse = {
  trial: { id: number; name: string };
  filters: { classroom_id: number | null; booklet_id: number | null; bin_size: number };
  summary: {
    total: number;
    avg_net: number | null;
    stddev_net: number | null;
    min_net: number | null;
    max_net: number | null;
  };
  distribution: Array<{ start: number; end: number; count: number }>;
  question_stats: null | Array<{
    question: number;
    answer_key: string;
    total: number;
    correct: number;
    correct_rate: number | null;
  }>;
  booklets: Array<{ id: number; name: string; question_count: number }>;
};

const MeasurementAnalysis = () => {
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [trials, setTrials] = useState<TrialListItem[]>([]);
  const [selectedTrialId, setSelectedTrialId] = useState<number | ''>('');

  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const [selectedBookletId, setSelectedBookletId] = useState<number | ''>('');
  const [binSize, setBinSize] = useState<number>(5);

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

  const fetchAnalysis = async (trialId: number, bookletId: number | null) => {
    setLoadingAnalysis(true);
    try {
      const res = await axiosClient.get(`/measurement/trials/${trialId}/analysis`, {
        params: {
          booklet_id: bookletId ?? undefined,
          bin_size: binSize,
        },
      });
      setAnalysis(res?.data?.data as AnalysisResponse);
    } catch (e: any) {
      setAnalysis(null);
      showToast('error', e?.response?.data?.message || 'Analiz verisi alınamadı.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, []);

  useEffect(() => {
    setAnalysis(null);
    setSelectedBookletId('');
    if (selectedTrialId !== '') {
      fetchAnalysis(selectedTrialId, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrialId]);

  useEffect(() => {
    if (selectedTrialId === '') return;
    fetchAnalysis(selectedTrialId, selectedBookletId === '' ? null : selectedBookletId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookletId, binSize]);

  return (
    <div className="container-fluid">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h4 className="mb-0">Analizler</h4>
              <div className="text-muted small">Deneme seçerek özet istatistikleri ve dağılımı görüntüleyin.</div>
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
            <div className="col-12 col-md-6 col-lg-4">
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

            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label">Kitapçık (opsiyonel)</label>
              <select
                className="form-select"
                value={selectedBookletId}
                onChange={(e) => setSelectedBookletId(e.target.value ? Number(e.target.value) : '')}
                disabled={selectedTrialId === '' || loadingAnalysis || !analysis}
              >
                <option value="">Tümü</option>
                {(analysis?.booklets ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.question_count})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label">Dağılım Bin Aralığı (Net)</label>
              <input
                type="number"
                min={0.1}
                step={0.5}
                className="form-control"
                value={binSize}
                onChange={(e) => setBinSize(Number(e.target.value || 5))}
                disabled={selectedTrialId === '' || loadingAnalysis}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedTrialId === '' ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5 text-center text-muted">Analiz için bir deneme seçin.</div>
        </div>
      ) : loadingAnalysis && !analysis ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5 text-center text-muted">Analiz yükleniyor...</div>
        </div>
      ) : analysis ? (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Katılımcı</div>
                  <div className="h4 mb-0">{analysis.summary.total}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Ortalama Net</div>
                  <div className="h4 mb-0">{analysis.summary.avg_net ?? '-'}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Std. Sapma</div>
                  <div className="h4 mb-0">{analysis.summary.stddev_net ?? '-'}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Min / Max</div>
                  <div className="h4 mb-0">
                    {(analysis.summary.min_net ?? '-') + ' / ' + (analysis.summary.max_net ?? '-')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-5">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0">
                  <div className="fw-semibold">Net Dağılımı</div>
                  <div className="text-muted small">
                    {selectedTrial?.name}
                    {selectedBookletId !== '' ? ' - Kitapçık filtreli' : ''}
                  </div>
                </div>
                <div className="card-body">
                  {analysis.distribution.length === 0 ? (
                    <div className="text-muted">Henüz veri yok.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Aralık</th>
                            <th className="text-end">Kişi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.distribution.map((d, idx) => (
                            <tr key={idx}>
                              <td>
                                {d.start} - {d.end}
                              </td>
                              <td className="text-end">{d.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">Soru Bazlı Doğru Oranı</div>
                    <div className="text-muted small">Bu tablo için kitapçık seçmelisin.</div>
                  </div>
                  {loadingAnalysis ? <span className="text-muted small">Güncelleniyor...</span> : null}
                </div>
                <div className="card-body">
                  {selectedBookletId === '' ? (
                    <div className="text-muted">Kitapçık seçilmedi.</div>
                  ) : !analysis.question_stats ? (
                    <div className="text-muted">Soru istatistiği üretilemedi.</div>
                  ) : analysis.question_stats.length === 0 ? (
                    <div className="text-muted">Henüz veri yok.</div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: 520 }}>
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="sticky-top bg-white">
                          <tr>
                            <th>#</th>
                            <th>Cevap</th>
                            <th className="text-end">Toplam</th>
                            <th className="text-end">Doğru</th>
                            <th className="text-end">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.question_stats.map((q) => (
                            <tr key={q.question}>
                              <td>{q.question}</td>
                              <td>{q.answer_key || '-'}</td>
                              <td className="text-end">{q.total}</td>
                              <td className="text-end">{q.correct}</td>
                              <td className="text-end">{q.correct_rate ?? '-'}</td>
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
        </>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body py-5 text-center text-muted">Analiz verisi bulunamadı.</div>
        </div>
      )}
    </div>
  );
};

export default MeasurementAnalysis;
