import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CompareSeries } from '../types';
import { format2, toNum } from '../utils';

export default function ExamMode({
  series,
  loading,
}: {
  series: CompareSeries[];
  loading: boolean;
}) {
  const lineData = useMemo(() => {
    return series
      .map((s) => ({
        name: s.exam_name,
        Ortalama: toNum(s.avg_net),
        Min: toNum(s.min_net),
        Max: toNum(s.max_net),
      }))
      .reverse();
  }, [series]);

  const barData = useMemo(() => {
    return series
      .map((s) => ({ name: s.exam_name, Öğrenci: toNum(s.total), Ortalama: toNum(s.avg_net) }))
      .reverse();
  }, [series]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border"></div>
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-muted">Karşılaştırma için en az 2 sınav seçmelisin.</div>
      </div>
    );
  }

  const latest = series[0];

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-light d-flex align-items-center justify-content-between">
            <h6 className="mb-0">Seçili Sınavların Özeti</h6>
            <div className="small text-muted">R²: {format2(latest?.regression?.r_squared)}</div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Sınav</th>
                    <th className="text-center">Öğrenci</th>
                    <th className="text-center">Ort.</th>
                    <th className="text-center">Min</th>
                    <th className="text-center">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => (
                    <tr key={s.exam_id}>
                      <td>
                        <div className="fw-semibold">{s.exam_name}</div>
                        <div className="text-muted small">{s.exam_date ?? '—'} • {s.exam_type}</div>
                      </td>
                      <td className="text-center">{s.total}</td>
                      <td className="text-center fw-semibold">{format2(s.avg_net)}</td>
                      <td className="text-center">{format2(s.min_net)}</td>
                      <td className="text-center">{format2(s.max_net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-7">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-header bg-light">
            <h6 className="mb-0">Ortalama / Min / Max Trend</h6>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Ortalama" stroke="#4f46e5" strokeWidth={2} />
                <Line type="monotone" dataKey="Min" stroke="#ef4444" />
                <Line type="monotone" dataKey="Max" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="col-md-5">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-header bg-light">
            <h6 className="mb-0">Katılımcı ve Ortalama</h6>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Öğrenci" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ortalama" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
