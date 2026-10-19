import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

export default function StudentRadarChart({
  items,
}: {
  items: { name: string; value: number }[];
}) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-light">
        <h6 className="mb-0">Kazanım / Ders Radar</h6>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={items}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" />
            <PolarRadiusAxis />
            <Tooltip />
            <Radar dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
