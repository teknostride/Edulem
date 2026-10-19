import type { BoxPlotStats } from '../stats';
import { format2, toNum } from '../utils';

export default function OutlierList({
  stats,
  rows,
}: {
  stats: BoxPlotStats;
  rows: { id: number; name: string; total_net: number; total_point: number; rank: number }[];
}) {
  const outliers = rows.filter((r) => {
    const v = toNum(r.total_net);
    return v < stats.lowerFence || v > stats.upperFence;
  });

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light">
        <h6 className="mb-0">Aykırı Değerler</h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th className="text-center">Net</th>
                <th className="text-center">Sıra</th>
              </tr>
            </thead>
            <tbody>
              {outliers.map((s) => (
                <tr key={s.id}>
                  <td className="fw-semibold">{s.name}</td>
                  <td className="text-center">{format2(s.total_net)}</td>
                  <td className="text-center fw-bold">{s.rank}</td>
                </tr>
              ))}
              {outliers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted small py-3 text-center">
                    Aykırı değer bulunmadı
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
