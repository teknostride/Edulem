import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type HistogramBin = { name: string; count: number };

export default function HistogramChart({
  title,
  bins,
  height = 240,
}: {
  title: string;
  bins: HistogramBin[];
  height?: number;
}) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light">
        <h6 className="mb-0">{title}</h6>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={bins}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
