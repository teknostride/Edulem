import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format2, toNum } from '../utils';

export default function StudentNetAvgChart({
  title,
  rows,
  avg,
}: {
  title: string;
  rows: { name: string; net: number }[];
  avg: number;
}) {
  const data = rows.map((r) => ({ name: r.name, Net: toNum(r.net) }));

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light">
        <h6 className="mb-0">{title}</h6>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 60, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip formatter={(v) => format2(v)} />
            <ReferenceLine y={toNum(avg)} stroke="#ef4444" strokeWidth={2} strokeDasharray="6 6" label={{ value: `Ortalama: ${format2(avg)}`, position: 'top', fill: '#ef4444' }} />
            <Bar dataKey="Net" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
