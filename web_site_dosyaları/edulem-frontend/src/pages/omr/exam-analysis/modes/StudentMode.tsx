import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCards from '../components/StatCards';
import StudentRadarChart from '../components/StudentRadarChart';
import StudentTopicAnalysis from '../components/StudentTopicAnalysis';
import { tScore, zScore } from '../stats';
import type { ClassAnalytics, StudentAnalytics } from '../types';
import { format2, normalizePercent100, toNum } from '../utils';

export default function StudentMode({
  selectedStudentId,
  data,
  loading,
  classData,
  loadingClassData,
}: {
  selectedStudentId: number | null;
  data: StudentAnalytics | null;
  loading: boolean;
  classData: ClassAnalytics | null;
  loadingClassData: boolean;
}) {
  const trendData = useMemo(() => {
    return (data?.exam_summaries ?? []).map((x) => ({ name: x.exam_name, Net: toNum(x.total_net) }));
  }, [data]);

  const radarItems = useMemo(() => {
    const list = data?.course_scores ?? [];
    if (list.length === 0) return [];
    const maxNet = Math.max(...list.map((x) => toNum(x.net)), 1);
    return list.map((x) => ({
      name: x.course_name,
      value: Math.round((toNum(x.net) / maxNet) * 100),
    }));
  }, [data]);

  const z = useMemo(() => {
    if (!data) return 0;
    return zScore(data.result.total_net, data.exam_stats?.mean, data.exam_stats?.stddev);
  }, [data]);
  const t = useMemo(() => tScore(z), [z]);

  const belowAvgCourses = useMemo(() => {
    if (!data || !classData) return [];
    const avgMap = new Map<number, number>();
    (classData.course_averages ?? []).forEach((c) => avgMap.set(c.course_id, toNum(c.avg_net)));
    return (data.course_scores ?? [])
      .map((c) => {
        const avg = avgMap.get(c.course_id);
        const net = toNum(c.net);
        return {
          course_id: c.course_id,
          course_name: c.course_name,
          net,
          class_avg: typeof avg === 'number' ? avg : null,
          diff: typeof avg === 'number' ? net - avg : null,
        };
      })
      .filter((x) => x.class_avg !== null && (x.diff ?? 0) < 0)
      .sort((a, b) => (a.diff ?? 0) - (b.diff ?? 0));
  }, [classData, data]);

  const diffToExamAvg = useMemo(() => {
    if (!data) return 0;
    return toNum(data.result.total_net) - toNum(data.exam_avg);
  }, [data]);

  const diffToClassAvg = useMemo(() => {
    if (!data) return 0;
    return toNum(data.result.total_net) - toNum(data.class_avg);
  }, [data]);

  return (
    <div>
      <div>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border"></div>
          </div>
        ) : !selectedStudentId ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-muted">Önce sınıf ve öğrenci seçin.</div>
          </div>
        ) : !data ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-muted">Öğrenci verisi bulunamadı</div>
          </div>
        ) : (
          <>
            <StatCards
              title={`${data.student.name} — Özet`}
              items={[
                { label: 'Sınav Neti', value: format2(data.result.total_net), icon: 'ti-chart-line', color: 'primary' },
                { label: 'Sıralama', value: `${data.result.rank} / ${data.exam_total}`, icon: 'ti-trophy', color: 'success' },
                { label: 'Yüzdelik', value: `${normalizePercent100(data.percentile).toFixed(2)}%`, icon: 'ti-percentage', color: 'info' },
                { label: 'Z / T', value: `${z.toFixed(2)} / ${t.toFixed(1)}`, icon: 'ti-sigma', color: 'danger' },
              ]}
            />

            <StatCards
              title="Ortalama Karşılaştırmaları"
              items={[
                { label: 'Sınav Ort. Fark', value: `${diffToExamAvg >= 0 ? '+' : ''}${diffToExamAvg.toFixed(2)}`, icon: 'ti-arrows-diff', color: diffToExamAvg >= 0 ? 'success' : 'danger' },
                { label: 'Sınıf Ort. Fark', value: `${diffToClassAvg >= 0 ? '+' : ''}${diffToClassAvg.toFixed(2)}`, icon: 'ti-arrows-diff', color: diffToClassAvg >= 0 ? 'success' : 'danger' },
                { label: 'Sınav Ort.', value: format2(data.exam_avg), icon: 'ti-chart-bar', color: 'primary' },
                { label: 'Sınıf Ort.', value: format2(data.class_avg), icon: 'ti-users', color: 'info' },
              ]}
            />

            <div className="row g-3">
              <div className="col-md-6">
                <StudentRadarChart items={radarItems} />
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">Ders Performansı</h6>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.course_scores}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="course_name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="net" fill="#10b981" name="Net" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light d-flex align-items-center justify-content-between">
                    <h6 className="mb-0">Ders Bazında Ortalama Altı Kalanlar</h6>
                    <div className="small text-muted">
                      {loadingClassData ? 'Sınıf ortalamaları yükleniyor…' : classData ? 'Sınıf ders ortalamalarına göre' : 'Sınıf verisi yok'}
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Ders</th>
                            <th className="text-center">Öğrenci Net</th>
                            <th className="text-center">Sınıf Ort. Net</th>
                            <th className="text-center">Fark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {belowAvgCourses.map((c) => (
                            <tr key={c.course_id}>
                              <td className="fw-semibold">{c.course_name}</td>
                              <td className="text-center">{format2(c.net)}</td>
                              <td className="text-center">{format2(c.class_avg)}</td>
                              <td className="text-center fw-semibold text-danger">{format2(c.diff)}</td>
                            </tr>
                          ))}
                          {belowAvgCourses.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-muted small py-3 text-center">
                                {classData ? 'Ortalama altı kaldığı ders yok' : 'Ders bazında kıyas için sınıf verisi gerekiyor'}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12">
                <StudentTopicAnalysis data={data} />
              </div>

              <div className="col-12">
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">Seçili Sınavlara Göre Trend</h6>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="Net" stroke="#4f46e5" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                    {trendData.length === 0 && <div className="text-muted small">Trend verisi yok</div>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
