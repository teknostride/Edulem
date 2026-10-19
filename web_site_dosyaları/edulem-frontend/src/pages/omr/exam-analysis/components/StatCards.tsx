import type { ReactNode } from 'react';

export type StatCardItem = {
  label: string;
  value: string | number;
  icon: string;
  color: string;
};

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) => (
  <div className={`card border-0 shadow-sm border-start border-${color} border-3`}>
    <div className="card-body py-3 px-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <div className="text-muted small">{label}</div>
          <div className={`fs-5 fw-bold text-${color}`}>{value}</div>
        </div>
        <i className={`ti ${icon} fs-2 text-${color} opacity-50`}></i>
      </div>
    </div>
  </div>
);

export default function StatCards({
  items,
  title,
  right,
}: {
  items: StatCardItem[];
  title?: string;
  right?: ReactNode;
}) {
  return (
    <div className="card border-0 shadow-sm mb-3">
      {(title || right) && (
        <div className="card-header bg-light d-flex align-items-center justify-content-between">
          <h6 className="mb-0">{title ?? ''}</h6>
          {right}
        </div>
      )}
      <div className="card-body">
        <div className="row g-3">
          {items.map((c, i) => (
            <div className="col-md-3 col-6" key={i}>
              <StatCard label={c.label} value={c.value} icon={c.icon} color={c.color} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
