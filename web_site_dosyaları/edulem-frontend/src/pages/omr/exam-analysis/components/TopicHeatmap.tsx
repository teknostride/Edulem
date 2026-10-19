import { normalizePercent100, normalizeRatio01 } from '../utils';

const colorFor = (ratio01: number): string => {
  const r = Math.min(1, Math.max(0, ratio01));
  const red = Math.round(239 * r + 16 * (1 - r));
  const green = Math.round(68 * r + 185 * (1 - r));
  const blue = Math.round(68 * r + 129 * (1 - r));
  return `rgb(${red}, ${green}, ${blue})`;
};

export default function TopicHeatmap({
  rows,
}: {
  rows: { topic_id: number; topic_name: string; wrong_ratio: number; total: number; wrong_count?: number; course_name?: string }[];
}) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-light">
        <h6 className="mb-0">Kazanım Açıkları (Heatmap)</h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>Kazanım</th>
                <th className="text-center">Yanlış Oranı</th>
                <th className="text-center">Hatalı Ögr.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ratio01 = normalizeRatio01(r.wrong_ratio);
                const pct100 = normalizePercent100(r.wrong_ratio);
                return (
                  <tr key={r.topic_id}>
                    <td>
                      <div className="fw-semibold">{r.topic_name}</div>
                      {r.course_name ? <div className="text-muted small">{r.course_name}</div> : null}
                    </td>
                    <td className="text-center">
                      <span
                        className="badge"
                        style={{ backgroundColor: colorFor(ratio01), color: '#fff' }}
                      >
                        {pct100.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center">{r.wrong_count ?? 0}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted small py-3 text-center">
                    Veri yok
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
