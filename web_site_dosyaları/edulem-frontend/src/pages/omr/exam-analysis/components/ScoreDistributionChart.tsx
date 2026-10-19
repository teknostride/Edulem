import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DistBin } from '../types';
import type { ReactNode } from 'react';

export default function ScoreDistributionChart({
  distribution,
  height = 260,
  title = 'Net Dağılımı',
  right,
}: {
  distribution: DistBin[];
  height?: number;
  title?: string;
  right?: ReactNode;
}) {
  const data = distribution.map((d) => ({ name: `${d.start}–${d.end}`, Öğrenci: d.count }));

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <h6 className="mb-0">{title}</h6>
          {right}
        </div>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Öğrenci" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
