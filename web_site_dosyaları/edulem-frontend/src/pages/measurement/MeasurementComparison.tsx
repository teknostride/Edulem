import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

type TrialListItem = { id: number; name: string };

type AnalysisSummary = {
  total: number;
  avg_net: number | null;
  stddev_net: number | null;
  min_net: number | null;
  max_net: number | null;
};

type AnalysisResponse = {
  trial: { id: number; name: string };
  summary: AnalysisSummary;
};

const SummaryCards = ({ title, summary }: { title: string; summary: AnalysisSummary | null }) => {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-white border-0">
        <div className="fw-semibold">{title}</div>
      </div>
      <div className="card-body">
        {!summary ? (
          <div className="text-muted">Deneme seçin.</div>
        ) : (
          <div className="row g-3">
            <div className="col-6">
              <div className="text-muted small">Katılımcı</div>
              <div className="h5 mb-0">{summary.total}</div>
            </div>
            <div className="col-6">
              <div className="text-muted small">Ortalama Net</div>
              <div className="h5 mb-0">{summary.avg_net ?? '-'}</div>
            </div>
            <div className="col-6">
              <div className="text-muted small">Std. Sapma</div>
              <div className="h5 mb-0">{summary.stddev_net ?? '-'}</div>
            </div>
            <div className="col-6">
              <div className="text-muted small">Min / Max</div>
              <div className="h5 mb-0">
                {(summary.min_net ?? '-') + ' / ' + (summary.max_net ?? '-')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MeasurementComparison = () => {
  const [loadingTrials, setLoadingTrials] = useState(false);
  const [trials, setTrials] = useState<TrialListItem[]>([]);

  const [leftTrialId, setLeftTrialId] = useState<number | ''>('');
  const [rightTrialId, setRightTrialId] = useState<number | ''>('');

  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);

  const [left, setLeft] = useState<AnalysisResponse | null>(null);
  const [right, setRight] = useState<AnalysisResponse | null>(null);

  const leftName = useMemo(() => {
    if (leftTrialId === '') return '';
    return trials.find((t) => t.id === leftTrialId)?.name ?? '';
  }, [leftTrialId, trials]);

  const rightName = useMemo(() => {
    if (rightTrialId === '') return '';
    return trials.find((t) => t.id === rightTrialId)?.name ?? '';
  }, [rightTrialId, trials]);

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

  const fetchAnalysis = async (trialId: number, side: 'left' | 'right') => {
    if (side === 'left') {
      setLoadingLeft(true);
    } else {
      setLoadingRight(true);
    }

    try {
      const res = await axiosClient.get(`/measurement/trials/${trialId}/analysis`);
      const payload = (res?.data?.data ?? res?.data) as AnalysisResponse;
      if (side === 'left') {
        setLeft(payload);
      } else {
        setRight(payload);
      }
    } catch (e: any) {
      if (side === 'left') {
        setLeft(null);
      } else {
        setRight(null);
      }
      showToast('error', e?.response?.data?.message || 'Analiz verisi alınamadı.');
    } finally {
      if (side === 'left') {
        setLoadingLeft(false);
      } else {
        setLoadingRight(false);
      }
    }
  };

  useEffect(() => {
    fetchTrials();
  }, []);

  useEffect(() => {
    setLeft(null);
    if (leftTrialId !== '') {
      fetchAnalysis(leftTrialId, 'left');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftTrialId]);

  useEffect(() => {
    setRight(null);
    if (rightTrialId !== '') {
      fetchAnalysis(rightTrialId, 'right');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightTrialId]);

  const delta = useMemo(() => {
    if (!left?.summary || !right?.summary) return null;
    const a = left.summary;
    const b = right.summary;
    return {
      total: a.total - b.total,
      avg_net: a.avg_net !== null && b.avg_net !== null ? Number((a.avg_net - b.avg_net).toFixed(2)) : null,
      stddev_net:
        a.stddev_net !== null && b.stddev_net !== null ? Number((a.stddev_net - b.stddev_net).toFixed(2)) : null,
      min_net: a.min_net !== null && b.min_net !== null ? Number((a.min_net - b.min_net).toFixed(2)) : null,
      max_net: a.max_net !== null && b.max_net !== null ? Number((a.max_net - b.max_net).toFixed(2)) : null,
    };
  }, [left, right]);

  return (
    <div className="container-fluid">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h4 className="mb-0">Karşılaştırma</h4>
              <div className="text-muted small">İki denemenin özet istatistiklerini yan yana kıyaslayın.</div>
            </div>
            <button className="btn btn-outline-secondary btn-sm" onClick={fetchTrials} disabled={loadingTrials} type="button">
              {loadingTrials ? 'Yükleniyor...' : 'Yenile'}
            </button>
          </div>

          <div className="row mt-3 g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Deneme A</label>
              <select
                className="form-select"
                value={leftTrialId}
                onChange={(e) => setLeftTrialId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seçiniz</option>
                {trials.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Deneme B</label>
              <select
                className="form-select"
                value={rightTrialId}
                onChange={(e) => setRightTrialId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Seçiniz</option>
                {trials.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <SummaryCards title={loadingLeft ? 'Deneme A (Yükleniyor...)' : leftName ? `Deneme A: ${leftName}` : 'Deneme A'} summary={left?.summary ?? null} />
        </div>
        <div className="col-12 col-lg-4">
          <SummaryCards title={loadingRight ? 'Deneme B (Yükleniyor...)' : rightName ? `Deneme B: ${rightName}` : 'Deneme B'} summary={right?.summary ?? null} />
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0">
              <div className="fw-semibold">Fark (A - B)</div>
            </div>
            <div className="card-body">
              {!delta ? (
                <div className="text-muted">Karşılaştırmak için iki denemeyi de seçin.</div>
              ) : (
                <div className="d-grid gap-2">
                  <div className="d-flex justify-content-between"><span>Katılımcı</span><strong>{delta.total}</strong></div>
                  <div className="d-flex justify-content-between"><span>Ortalama Net</span><strong>{delta.avg_net ?? '-'}</strong></div>
                  <div className="d-flex justify-content-between"><span>Std. Sapma</span><strong>{delta.stddev_net ?? '-'}</strong></div>
                  <div className="d-flex justify-content-between"><span>Min Net</span><strong>{delta.min_net ?? '-'}</strong></div>
                  <div className="d-flex justify-content-between"><span>Max Net</span><strong>{delta.max_net ?? '-'}</strong></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementComparison;
