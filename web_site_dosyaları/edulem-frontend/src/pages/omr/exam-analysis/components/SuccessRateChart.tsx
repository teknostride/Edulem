import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ReactNode } from 'react';

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export default function SuccessRateChart({
  correct,
  wrong,
  blank,
  title = 'Başarı Dağılımı',
  right,
}: {
  correct: number;
  wrong: number;
  blank: number;
  title?: string;
  right?: ReactNode;
}) {
  const data = [
    { name: 'Doğru', value: Math.max(0, correct) },
    { name: 'Yanlış', value: Math.max(0, wrong) },
    { name: 'Boş', value: Math.max(0, blank) },
  ].filter((x) => x.value > 0);

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <h6 className="mb-0">{title}</h6>
          {right}
        </div>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={85} label>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
