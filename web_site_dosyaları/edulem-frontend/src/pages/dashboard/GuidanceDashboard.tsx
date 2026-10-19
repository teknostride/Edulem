import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/common/StatCard';
import axiosClient from '../../api/axiosClient';
import TodayMealMenuCard from '../../components/meals/TodayMealMenuCard';

interface CounselingRecordLite {
  id: number;
  counselor_id: number;
  meeting_at: string;
  is_private: boolean;
}

type PeriodKey = '7d' | '30d' | 'thisMonth';

const GuidanceDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [records, setRecords] = useState<CounselingRecordLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = useMemo(() => {
    const userData = localStorage.getItem('USER_DATA');
    if (!userData) return null;
    try {
      const u = JSON.parse(userData);
      return u?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('USER_DATA');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const dateTo = today.toISOString().slice(0, 10);

        const dateFrom = (() => {
          const d = new Date(today);
          if (period === '7d') d.setDate(d.getDate() - 7);
          if (period === '30d') d.setDate(d.getDate() - 30);
          if (period === 'thisMonth') d.setDate(1);
          return d.toISOString().slice(0, 10);
        })();

        const params = new URLSearchParams();
        params.set('per_page', '500');
        params.set('date_from', dateFrom);
        params.set('date_to', dateTo);

        const res = await axiosClient.get(`/counseling/records?${params.toString()}`);
        const payload = res.data?.data ?? {};
        const incoming = Array.isArray(payload.records) ? payload.records : [];

        const normalized: CounselingRecordLite[] = incoming
          .map((r: any) => ({
            id: Number(r?.id ?? 0),
            counselor_id: Number(r?.counselor_id ?? 0),
            meeting_at: String(r?.meeting_at ?? ''),
            is_private: Boolean(r?.is_private),
          }))
          .filter((r: CounselingRecordLite) => r.id > 0);

        setRecords(normalized);
      } catch {
        setError('Veriler alınamadı.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [period]);



  const myRecords = useMemo(() => {
    if (!userId) return [];
    return records.filter(r => r.counselor_id === userId);
  }, [records, userId]);

  const totals = useMemo(() => {
    const total = myRecords.length;
    const privateCount = myRecords.filter(r => r.is_private).length;
    const sharedCount = total - privateCount;
    return { total, privateCount, sharedCount };
  }, [myRecords]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4">
        <div>
          <h3 className="fw-bold m-0">Hoş Geldiniz, {user?.name}</h3>
          <p className="text-muted mb-0">Rehberlik görüşmelerinize hızlı bir bakış.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <select
            className="form-select"
            style={{ width: 220 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          >
            <option value="7d">Son 7 Gün</option>
            <option value="30d">Son 30 Gün</option>
            <option value="thisMonth">Bu Ay</option>
          </select>
          <span className="badge bg-soft-primary text-primary fs-6 px-3 py-2">
            <i className="ti ti-calendar me-1"></i>{' '}
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Günün Menüsü */}
      <TodayMealMenuCard className="mb-4" />

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Görüşmelerim"
            amount={totals.total.toString()}
            iconName="ti ti-heart-handshake"
            iconColor="text-primary"
            trend="Seçili dönem"
            trendColor="badge-soft-primary"
            trendIcon="ti-chart-bar"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Paylaşılan"
            amount={totals.sharedCount.toString()}
            iconName="ti ti-world"
            iconColor="text-success"
            trend="İçerik açık"
            trendColor="badge-soft-success"
            trendIcon="ti-check"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Özel"
            amount={totals.privateCount.toString()}
            iconName="ti ti-lock"
            iconColor="text-danger"
            trend="İçerik gizli"
            trendColor="badge-soft-danger"
            trendIcon="ti-lock"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title mb-3">Hızlı İşlemler</h5>
              <div className="d-grid gap-2">
                <Link to="/counseling?new=1" className="btn btn-primary">
                  <i className="ti ti-plus me-2"></i>Yeni Görüşme
                </Link>
                <Link to="/counseling" className="btn btn-outline-secondary">
                  <i className="ti ti-list-details me-2"></i>Kayıtları Aç
                </Link>
              </div>
              <div className="mt-auto pt-3 text-muted small">
                Kayıtlar, seçili dönemdeki görüşmeler üzerinden hesaplanır.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidanceDashboard;
