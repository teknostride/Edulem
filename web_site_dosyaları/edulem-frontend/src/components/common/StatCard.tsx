interface StatCardProps {
  title: string;
  amount: string;
  iconName: string; // Örn: solar:leaf-bold-duotone
  iconColor: string; // text-success, text-info vb.
  trend: string; // %8.72
  trendColor: string; // badge-soft-success veya badge-soft-danger
  trendIcon: string; // ti-arrow-badge-up
  chartId?: string; // Eğer içinde mini grafik olacaksa
}

const StatCard = ({ title, amount, iconName, iconColor, trend, trendColor, trendIcon, chartId }: StatCardProps) => {
  return (
    <div className="card">
      <div className="card-body">
        {/* İkon */}
        {/* @ts-ignore - Iconify custom element */}
        <iconify-icon icon={iconName} className={`fs-36 ${iconColor}`}></iconify-icon>
        
        {/* Başlık ve Tutar */}
        <h3 className="fw-bold mt-3 mb-1">{amount}</h3>
        <p className="text-muted">{title}</p>
        
        {/* Yüzdelik Değişim (Badge) */}
        <span className={`badge fs-12 ${trendColor}`}>
            <i className={`ti ${trendIcon}`}></i> {trend}
        </span>

        {/* Mini Grafik Alanı (Opsiyonel) */}
        {chartId && <div id={chartId} className="mt-3"></div>}
      </div>
    </div>
  );
};

export default StatCard;