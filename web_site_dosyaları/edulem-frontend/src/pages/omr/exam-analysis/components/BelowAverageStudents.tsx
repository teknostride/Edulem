import { format2, toNum } from '../utils';

export default function BelowAverageStudents({
  title,
  avg,
  rows,
}: {
  title: string;
  avg: number;
  rows: { id: number; name: string; school_no: string; total_net: number; rank: number; below_avg?: boolean }[];
}) {
  const list = rows
    .filter((r) => (typeof r.below_avg === 'boolean' ? r.below_avg : toNum(r.total_net) < toNum(avg)))
    .sort((a, b) => toNum(a.total_net) - toNum(b.total_net));

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light d-flex align-items-center justify-content-between">
        <h6 className="mb-0">{title}</h6>
        <div className="small text-muted">Ortalama: {format2(avg)}</div>
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
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="fw-semibold">{s.name}</div>
                    <div className="text-muted small">{s.school_no}</div>
                  </td>
                  <td className="text-center fw-semibold text-danger">{format2(s.total_net)}</td>
                  <td className="text-center">{s.rank}</td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted small py-3 text-center">
                    Ortalama altı öğrenci yok
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
