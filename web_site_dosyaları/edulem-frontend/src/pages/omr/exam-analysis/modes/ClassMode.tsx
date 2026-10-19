import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCards from '../components/StatCards';
import SearchableSelect from '../components/SearchableSelect';
import BoxPlotChart from '../components/BoxPlotChart';
import TopicHeatmap from '../components/TopicHeatmap';
import HistogramChart from '../components/HistogramChart';
import OutlierList from '../components/OutlierList';
import StudentNetAvgChart from '../components/StudentNetAvgChart';
import BelowAverageStudents from '../components/BelowAverageStudents';
import { boxPlot } from '../stats';
import type { ClassAnalytics, Classroom } from '../types';
import { format2, toNum } from '../utils';

export default function ClassMode({
  classrooms,
  selectedClassId,
  onSelectClass,
  data,
  loading,
}: {
  classrooms: Classroom[];
  selectedClassId: number | null;
  onSelectClass: (id: number | null) => void;
  data: ClassAnalytics | null;
  loading: boolean;
}) {
  const classOptions = useMemo(() => {
    return classrooms.map((c) => ({
      value: c.id,
      label: c.name,
    }));
  }, [classrooms]);

  const courseChartData = useMemo(() => {
    return (data?.course_averages ?? []).map((c) => ({
      name: c.course_name,
      'Ort. Net': toNum(c.avg_net),
      Doğru: toNum(c.correct),
      Yanlış: toNum(c.wrong),
      Boş: toNum(c.blank),
    }));
  }, [data]);

  const box = useMemo(() => {
    const values = (data?.students ?? []).map((s) => toNum(s.total_net));
    return boxPlot(values);
  }, [data]);

  const percentileCards = useMemo(() => {
    if (!data) return null;
    return [
      { label: 'P10', value: format2(boxPlot((data.students ?? []).map((s) => toNum(s.total_net))).min), icon: 'ti-arrow-down', color: 'primary' },
      { label: 'P25 (Q1)', value: format2(box.q1), icon: 'ti-minus', color: 'info' },
      { label: 'P50 (Medyan)', value: format2(box.median), icon: 'ti-line', color: 'success' },
      { label: 'P75 (Q3)', value: format2(box.q3), icon: 'ti-plus', color: 'warning' },
    ];
  }, [box, data]);

  const histogramBins = useMemo(() => {
    const values = (data?.students ?? []).map((s) => toNum(s.total_net));
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 10;
    const size = (max - min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      start: min + i * size,
      end: min + (i + 1) * size,
      count: 0,
    }));
    values.forEach((v) => {
      const idx = Math.min(binCount - 1, Math.max(0, Math.floor((v - min) / size)));
      bins[idx].count += 1;
    });
    return bins.map((b) => ({ name: `${b.start.toFixed(1)}–${b.end.toFixed(1)}`, count: b.count }));
  }, [data]);

  const topStudentsForChart = useMemo(() => {
    const list = [...(data?.students ?? [])];
    list.sort((a, b) => toNum(a.rank) - toNum(b.rank));
    return list.slice(0, 25).map((s) => ({ name: s.name.split(' ')[0] ?? s.name, net: toNum(s.total_net) }));
  }, [data]);

  return (
    <div>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex align-items-end gap-3 flex-wrap">
          <div>
            <label className="form-label fw-semibold">Sınıf Seç</label>
            <div style={{ minWidth: 320 }}>
              <SearchableSelect<number>
                value={selectedClassId}
                options={classOptions}
                placeholder="Sınıf seçin"
                searchPlaceholder="Sınıf ara..."
                onChange={onSelectClass}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border"></div>
        </div>
      ) : !selectedClassId ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-muted">Sınıf seçin.</div>
        </div>
      ) : !data ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-muted">Veri bulunamadı.</div>
        </div>
      ) : (
        <>
          <StatCards
            title="Sınıf Özeti"
            items={[
              { label: 'Sınıf Ortalaması', value: format2(data.class_avg), icon: 'ti-chart-line', color: 'primary' },
              { label: 'Sınav Ortalaması', value: format2(data.exam_avg), icon: 'ti-chart-bar', color: 'success' },
              { label: 'Öğrenci', value: data.student_count, icon: 'ti-users', color: 'info' },
              { label: 'Std. Sapma', value: format2(data.class_stats?.stddev), icon: 'ti-sigma', color: 'danger' },
            ]}
          />

          {percentileCards && (
            <StatCards
              title="Yüzdelikler"
              items={percentileCards}
            />
          )}

          <div className="row g-3">
            <div className="col-12">
              <div className="alert alert-info mb-0">
                <div className="fw-semibold">Ortalama çizgisi</div>
                <div className="small">Grafiklerdeki kırmızı kesikli çizgi sınıf ortalamasını temsil eder.</div>
              </div>
            </div>

            <div className="col-md-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-light">
                  <h6 className="mb-0">Ders Ortalamaları</h6>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={courseChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="Ort. Net" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <BoxPlotChart stats={box} />
            </div>

            <div className="col-md-6">
              <TopicHeatmap rows={data.topic_difficulty ?? []} />
            </div>

            <div className="col-md-6">
              <StudentNetAvgChart
                title="En Başarılı 25 Öğrenci (Net) + Ortalama Çizgisi"
                rows={topStudentsForChart}
                avg={toNum(data.class_avg)}
              />
            </div>

            <div className="col-md-6">
              <BelowAverageStudents
                title="Ortalama Altı Kalan Öğrenciler"
                avg={toNum(data.class_avg)}
                rows={data.students}
              />
            </div>

            <div className="col-md-6">
              <HistogramChart title="Net Dağılımı (Histogram)" bins={histogramBins} />
            </div>

            <div className="col-md-6">
              <OutlierList
                stats={box}
                rows={(data.students ?? []).map((s) => ({
                  id: s.id,
                  name: s.name,
                  total_net: s.total_net,
                  total_point: s.total_point,
                  rank: s.rank,
                }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
