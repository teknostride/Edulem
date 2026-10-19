import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface ByCounselorRow {
  counselor_id: number;
  counselor_name: string;
  total: number;
  private_count: number;
  shared_count: number;
}

interface ByClassroomRow {
  classroom_id: number | null;
  classroom_name: string;
  total: number;
  private_count: number;
  shared_count: number;
}

interface CounselingStatsPayload {
  totals_by_counselor: ByCounselorRow[];
  last_7_days_by_counselor: ByCounselorRow[];
  last_30_days_by_counselor: ByCounselorRow[];
  last_30_days_by_classroom: ByClassroomRow[];
}

const CounselingStatsPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CounselingStatsPayload | null>(null);

  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem('USER_DATA');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const role = (localStorage.getItem('USER_ROLE') || me?.role || me?.role_name || '').toString();
  const isManager =
    role === 'Müdür' ||
    role === 'Müdür Yardımcısı' ||
    role === 'Kampüs Müdürü' ||
    role === 'owner' ||
    role === 'Admin' ||
    role === 'Genel Müdür';

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/counseling/records/stats');
      const payload = (res.data?.data ?? null) as CounselingStatsPayload | null;
      setData(payload);
    } catch {
      showToast('error', 'İstatistikler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isManager) {
    return (
      <div className="container-fluid py-3">
        <div className="card">
          <div className="card-body">
            <div className="text-muted">Bu sayfaya erişim yetkiniz yok.</div>
          </div>
        </div>
      </div>
    );
  }

  const renderCounselorTable = (rows: ByCounselorRow[]) => (
    <div className="table-responsive">
      <table className="table table-sm table-striped mb-0">
        <thead>
          <tr>
            <th>Rehber Öğretmen</th>
            <th className="text-end">Toplam</th>
            <th className="text-end">Gizli</th>
            <th className="text-end">Açık</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center text-muted py-3">
                Kayıt bulunamadı.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.counselor_id}>
                <td>{r.counselor_name || '-'}</td>
                <td className="text-end fw-semibold">{r.total}</td>
                <td className="text-end">
                  <span className="badge bg-soft-warning text-warning">{r.private_count}</span>
                </td>
                <td className="text-end">
                  <span className="badge bg-soft-success text-success">{r.shared_count}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Rehberlik İstatistikleri</h3>
          <p className="text-muted mb-0">Gizli kayıtların içeriği gösterilmez, sadece sayısal veriler listelenir.</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-sm btn-light" onClick={fetchStats} disabled={loading}>
            {loading ? 'Yükleniyor...' : 'Yenile'}
          </button>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item"><a href="/counseling" className="text-decoration-none text-muted">Rehberlik</a></li>
              <li className="breadcrumb-item active fw-medium">İstatistikler</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header border-0 pt-3">
              <h6 className="mb-0 fw-bold">Toplam (Tüm Zamanlar)</h6>
            </div>
            <div className="card-body p-0">{renderCounselorTable(data?.totals_by_counselor ?? [])}</div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header border-0 pt-3">
              <h6 className="mb-0 fw-bold">Son 7 Gün</h6>
            </div>
            <div className="card-body p-0">{renderCounselorTable(data?.last_7_days_by_counselor ?? [])}</div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header border-0 pt-3">
              <h6 className="mb-0 fw-bold">Son 30 Gün</h6>
            </div>
            <div className="card-body p-0">{renderCounselorTable(data?.last_30_days_by_counselor ?? [])}</div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header border-0 pt-3">
              <h6 className="mb-0 fw-bold">Sınıf Bazlı (Son 30 Gün)</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Sınıf</th>
                      <th className="text-end">Toplam</th>
                      <th className="text-end">Gizli</th>
                      <th className="text-end">Açık</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.last_30_days_by_classroom ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          Kayıt bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      (data?.last_30_days_by_classroom ?? []).map((r, idx) => (
                        <tr key={`${r.classroom_id ?? 'null'}-${idx}`}>
                          <td>{r.classroom_name || '-'}</td>
                          <td className="text-end fw-semibold">{Number(r.total) || 0}</td>
                          <td className="text-end">
                            <span className="badge bg-soft-warning text-warning">{Number(r.private_count) || 0}</span>
                          </td>
                          <td className="text-end">
                            <span className="badge bg-soft-success text-success">{Number(r.shared_count) || 0}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CounselingStatsPage;
