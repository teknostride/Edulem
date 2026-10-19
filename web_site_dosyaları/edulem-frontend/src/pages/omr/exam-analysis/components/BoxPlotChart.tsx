import { ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { BoxPlotStats } from '../stats';

export default function BoxPlotChart({ stats }: { stats: BoxPlotStats }) {
  const data = [
    { name: 'min', x: stats.min, y: 1 },
    { name: 'q1', x: stats.q1, y: 1 },
    { name: 'median', x: stats.median, y: 1 },
    { name: 'q3', x: stats.q3, y: 1 },
    { name: 'max', x: stats.max, y: 1 },
  ];

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light">
        <h6 className="mb-0">Kutu Grafiği (Box Plot)</h6>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <XAxis type="number" dataKey="x" name="Net" />
            <YAxis type="number" dataKey="y" hide domain={[0.8, 1.2]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => Number(v).toFixed(2)} />
            <ReferenceLine x={stats.q1} stroke="#4f46e5" strokeWidth={6} />
            <ReferenceLine x={stats.q3} stroke="#4f46e5" strokeWidth={6} />
            <ReferenceLine x={stats.median} stroke="#ef4444" strokeWidth={2} />
            <ReferenceLine x={stats.min} stroke="#94a3b8" strokeWidth={1} />
            <ReferenceLine x={stats.max} stroke="#94a3b8" strokeWidth={1} />
            <Scatter data={data} fill="#0ea5e9" />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="small text-muted mt-2">Min/Q1/Medyan/Q3/Max gösterimi. Aykırı değerler (fence dışı) ayrı gösterim olarak bir sonraki adımda eklenebilir.</div>
      </div>
    </div>
  );
}
