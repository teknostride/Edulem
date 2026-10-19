import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import axiosClient from '../../api/axiosClient';
import { getMyEducationLevelIds, getMyPrimaryEducationLevelId } from '../../utils/userScope';
import TodayMealMenuCard from '../../components/meals/TodayMealMenuCard';

interface ScopeItem {
  id: number;
  name: string;
}

interface StudentAffairsAnalytics {
  scope: {
    campuses: ScopeItem[];
    education_levels: ScopeItem[];
  };
  totals: {
    total_students: number;
    active_students: number;
    inactive_students: number;
  };
  attendance_today: {
    date: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    total_records: number;
    absence_rate: number;
  };
  students_by_education_level: Array<{
    education_level_id: number | null;
    education_level_name: string;
    student_count: number;
  }>;
  students_by_classroom: Array<{
    classroom_id: number;
    classroom_name: string;
    student_count: number;
  }>;
}

const emptyAnalytics: StudentAffairsAnalytics = {
  scope: { campuses: [], education_levels: [] },
  totals: { total_students: 0, active_students: 0, inactive_students: 0 },
  attendance_today: {
    date: '',
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    sick: 0,
    total_records: 0,
    absence_rate: 0,
  },
  students_by_education_level: [],
  students_by_classroom: [],
};

const StudentAffairsDashboard = () => {
  const [analytics, setAnalytics] = useState<StudentAffairsAnalytics>(emptyAnalytics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const educationLevelIds = getMyEducationLevelIds();
        const primaryEducationLevelId = getMyPrimaryEducationLevelId();
        const scopedEducationLevelId = educationLevelIds.length === 1
          ? Number(primaryEducationLevelId || educationLevelIds[0])
          : null;
        const params: any = {};
        if (scopedEducationLevelId) params.education_level_id = scopedEducationLevelId;

        const [statsRes, studentsCountRes, activeCountRes, inactiveCountRes] = await Promise.all([
          axiosClient.get('/dashboard/stats', { params }),
          axiosClient.get('/students', {
            params: {
              ...(scopedEducationLevelId ? { education_level_id: scopedEducationLevelId } : {}),
              page: 1,
              per_page: 1,
            },
          }).catch(() => null),
          axiosClient.get('/students', {
            params: {
              ...(scopedEducationLevelId ? { education_level_id: scopedEducationLevelId } : {}),
              is_active: 1,
              page: 1,
              per_page: 1,
            },
          }).catch(() => null),
          axiosClient.get('/students', {
            params: {
              ...(scopedEducationLevelId ? { education_level_id: scopedEducationLevelId } : {}),
              is_active: 0,
              page: 1,
              per_page: 1,
            },
          }).catch(() => null),
        ]);

        const stats = statsRes.data?.data?.stats || statsRes.data?.stats || {};
        const payload: StudentAffairsAnalytics = stats.student_affairs_analytics || emptyAnalytics;

        const listCountData = studentsCountRes?.data?.data ?? studentsCountRes?.data;
        const listTotal = Number(listCountData?.pagination?.total ?? 0);

        const activeCountData = activeCountRes?.data?.data ?? activeCountRes?.data;
        const activeTotal = Number(activeCountData?.pagination?.total ?? 0);

        const inactiveCountData = inactiveCountRes?.data?.data ?? inactiveCountRes?.data;
        const inactiveTotal = Number(inactiveCountData?.pagination?.total ?? 0);

        if (!educationLevelIds.length) {
          setAnalytics(payload);
          return;
        }

        const allowed = new Set<number>();
        educationLevelIds.forEach((x) => allowed.add(Number(x)));

        const scopedByLevel = (payload.students_by_education_level || []).filter((x) => {
          if (x.education_level_id == null) return false;
          return allowed.has(Number(x.education_level_id));
        });

        const totalStudents = listCountData
          ? listTotal
          : scopedByLevel.reduce((acc, x) => acc + (x.student_count || 0), 0);

        const inactiveStudents = inactiveCountData
          ? inactiveTotal
          : Math.min(Number(payload.totals?.inactive_students ?? 0), totalStudents);

        const activeStudents = activeCountData
          ? activeTotal
          : Math.max(0, totalStudents - inactiveStudents);

        const scoped: StudentAffairsAnalytics = {
          ...payload,
          totals: {
            ...payload.totals,
            total_students: totalStudents,
            active_students: activeStudents,
            inactive_students: inactiveStudents,
          },
          students_by_education_level: scopedByLevel,
          scope: {
            ...payload.scope,
            education_levels: (payload.scope?.education_levels || []).filter((x) => allowed.has(Number(x.id))),
          },
          // Not: students_by_classroom items do not carry education_level_id; backend should scope them.
          // We keep list as-is to avoid hiding valid data incorrectly.
          students_by_classroom: payload.students_by_classroom || [],
        };

        setAnalytics(scoped);
      } catch {
        setAnalytics(emptyAnalytics);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const educationSeries = [{
    name: 'Öğrenci',
    data: analytics.students_by_education_level.map((item) => item.student_count),
  }];

  const educationOptions = useMemo(() => ({
    chart: {
      type: 'bar' as const,
      toolbar: { show: false },
      fontFamily: "'Inter', sans-serif"
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: false,
        columnWidth: '45%'
      }
    },
    colors: ['#3b82f6'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.25,
        gradientToColors: ['#60a5fa'],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [50, 0, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: analytics.students_by_education_level.map((item) => item.education_level_name),
      labels: {
        rotate: -25,
        style: { colors: '#64748b', fontWeight: 500 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      labels: { style: { colors: '#64748b' } }
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
  }), [analytics.students_by_education_level]);

  const attendanceSeries = [
    analytics.attendance_today.present,
    analytics.attendance_today.absent,
    analytics.attendance_today.late,
    analytics.attendance_today.excused,
    analytics.attendance_today.sick,
  ];

  const attendanceOptions = {
    chart: {
      type: 'donut' as const,
      toolbar: { show: false },
      fontFamily: "'Inter', sans-serif"
    },
    labels: ['Geldi', 'Gelmedi', 'Geç', 'İzinli', 'Raporlu'],
    colors: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'],
    legend: {
      position: 'bottom' as const,
      markers: { size: 6 },
      itemMargin: { horizontal: 10, vertical: 5 }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '13px', fontWeight: 600, colors: ['#fff'] },
      dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.2 }
    },
    stroke: { width: 4, colors: ['#ffffff'] },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { fontSize: '14px', color: '#64748b', offsetY: -10 },
            value: { fontSize: '24px', fontWeight: 700, color: '#1e293b', offsetY: 10 },
            total: {
              show: true,
              showAlways: true,
              label: 'Toplam',
              color: '#64748b',
              formatter: function (w: any) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              }
            }
          }
        }
      }
    }
  };

  const maxClassroomCount = Math.max(...analytics.students_by_classroom.map(c => c.student_count), 1);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
      <style>{`
        .sa-dashboard-card {
           transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
           border-radius: 1.25rem;
        }
        .sa-dashboard-card:hover {
           transform: translateY(-8px);
           box-shadow: 0 15px 35px rgba(0,0,0,0.06) !important;
        }
        .sa-gradient-primary {
           background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
           color: white;
        }
        .sa-gradient-success {
           background: linear-gradient(135deg, #10b981 0%, #047857 100%);
           color: white;
        }
        .sa-gradient-warning {
           background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);
           color: white;
        }
        .sa-icon-circle {
           width: 52px;
           height: 52px;
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 1.75rem;
           background: rgba(255,255,255,0.15);
           backdrop-filter: blur(4px);
           -webkit-backdrop-filter: blur(4px);
           border: 1px solid rgba(255, 255, 255, 0.2);
           transition: transform 0.3s ease;
        }
        .sa-dashboard-card:hover .sa-icon-circle {
            transform: scale(1.1) rotate(5deg);
        }
        .sa-bg-icon {
            font-size: 120px;
            right: -20px;
            bottom: -20px;
            color: rgba(255,255,255,0.08);
            pointer-events: none;
            transition: transform 0.5s ease;
        }
        .sa-dashboard-card:hover .sa-bg-icon {
            transform: scale(1.1) rotate(-5deg);
        }
        .sa-progress-bar {
            height: 8px;
            border-radius: 8px;
            background-color: #e2e8f0;
            overflow: hidden;
            flex-grow: 1;
        }
        .sa-progress-fill {
            height: 100%;
            border-radius: 8px;
            background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
            transition: width 1s ease-out;
        }
        .sa-table-wrapper::-webkit-scrollbar {
            width: 6px;
        }
        .sa-table-wrapper::-webkit-scrollbar-track {
            background: transparent; 
        }
        .sa-table-wrapper::-webkit-scrollbar-thumb {
            background: #cbd5e1; 
            border-radius: 10px;
        }
        .sa-table-wrapper::-webkit-scrollbar-thumb:hover {
            background: #94a3b8; 
        }
        .sa-hover-row:hover {
            background-color: #f8fafc !important;
        }
        .sa-badge-soft {
            padding: 0.5rem 0.8rem;
            border-radius: 0.5rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .sa-badge-soft:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.04);
        }
      `}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h3 className="mb-1 fw-bold text-dark" style={{ letterSpacing: '-0.5px' }}>Öğrenci İşleri Panosu</h3>
          <p className="text-muted mb-0">Hoş geldiniz, yetki kapsamınızdaki güncel akademik verilere buradan ulaşabilirsiniz.</p>
        </div>
        <div className="d-flex align-items-center gap-3 bg-white px-4 py-3 rounded-4 shadow-sm border border-light">
          <div className="d-flex align-items-center justify-content-center bg-soft-danger text-danger rounded-circle" style={{ width: 42, height: 42 }}>
            <i className="ti ti-chart-pie-2 fs-4"></i>
          </div>
          <div>
            <span className="text-muted small d-block fw-medium" style={{ lineHeight: 1 }}>Günlük Devamsızlık</span>
            <span className="fw-bold fs-4 text-dark">%{analytics.attendance_today.absence_rate}</span>
          </div>
        </div>
      </div>

      {/* Günün Menüsü */}
      <TodayMealMenuCard className="mb-4" />

      {/* Stat Cards */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm sa-dashboard-card sa-gradient-primary">
            <div className="card-body p-4 position-relative overflow-hidden pt-4 pb-3">
              <i className="ti ti-users position-absolute sa-bg-icon"></i>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="text-white-50 text-uppercase fw-semibold mb-0" style={{ letterSpacing: '1px', fontSize: '13px' }}>Toplam Öğrenci</h6>
                <div className="sa-icon-circle"><i className="ti ti-school border-0 text-white"></i></div>
              </div>
              <h2 className="display-5 fw-bold text-white mb-2">{analytics.totals.total_students}</h2>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm sa-dashboard-card sa-gradient-success">
            <div className="card-body p-4 position-relative overflow-hidden pt-4 pb-3">
              <i className="ti ti-user-check position-absolute sa-bg-icon"></i>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="text-white-50 text-uppercase fw-semibold mb-0" style={{ letterSpacing: '1px', fontSize: '13px' }}>Aktif Kayıt</h6>
                <div className="sa-icon-circle"><i className="ti ti-check border-0 text-white"></i></div>
              </div>
              <h2 className="display-5 fw-bold text-white mb-2">{analytics.totals.active_students}</h2>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm sa-dashboard-card sa-gradient-warning">
            <div className="card-body p-4 position-relative overflow-hidden pt-4 pb-3">
              <i className="ti ti-user-exclamation position-absolute sa-bg-icon"></i>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="text-white-50 text-uppercase fw-semibold mb-0" style={{ letterSpacing: '1px', fontSize: '13px' }}>Pasif Kayıt</h6>
                <div className="sa-icon-circle"><i className="ti ti-clock-pause border-0 text-white"></i></div>
              </div>
              <h2 className="display-5 fw-bold text-white mb-2">{analytics.totals.inactive_students}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Education Level Chart */}
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm sa-dashboard-card bg-white h-100">
            <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-1 fw-bold text-dark">Kademe Bazlı Dağılım</h5>
                <p className="text-muted small mb-0">Eğitim kademelerine göre kayıtlı öğrenci yoğunluğu</p>
              </div>
              <div className="bg-soft-primary text-primary p-2 rounded-circle d-flex" style={{ width: 40, height: 40 }}>
                <i className="ti ti-chart-bar fs-4 m-auto"></i>
              </div>
            </div>
            <div className="card-body px-4 pb-4">
              {analytics.students_by_education_level.length > 0 ? (
                <Chart type="bar" height={320} options={educationOptions} series={educationSeries} />
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center py-5 text-muted">
                  <i className="ti ti-chart-bar text-light opacity-50 mb-2" style={{ fontSize: '48px' }}></i>
                  <span>Kademe verisi bulunamadı.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Donut Chart */}
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm sa-dashboard-card bg-white h-100">
            <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-1 fw-bold text-dark">Yoklama Özeti</h5>
                <p className="text-muted small mb-0">{analytics.attendance_today.date || 'Bugün'}</p>
              </div>
              <div className="bg-soft-warning text-warning p-2 rounded-circle d-flex" style={{ width: 40, height: 40 }}>
                <i className="ti ti-calendar-stats fs-4 m-auto"></i>
              </div>
            </div>
            <div className="card-body px-4 pb-4 d-flex justify-content-center align-items-center">
              {analytics.attendance_today.total_records > 0 ? (
                <div style={{ width: '100%', maxWidth: '380px' }}>
                  <Chart type="donut" height={320} options={attendanceOptions} series={attendanceSeries} />
                </div>
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center py-5 text-muted">
                  <i className="ti ti-calendar-off text-light opacity-50 mb-2" style={{ fontSize: '48px' }}></i>
                  <span>Yoklama kaydı bulunamadı.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Classroom Densities */}
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm sa-dashboard-card bg-white h-100">
            <div className="card-header bg-transparent border-0 pt-4 pb-3 px-4 d-flex justify-content-between align-items-center border-bottom">
              <div>
                <h5 className="card-title fw-bold text-dark mb-1">Sınıf Yoğunlukları</h5>
                <p className="text-muted small mb-0">En kalabalık sınıfların listesi</p>
              </div>
              <div className="bg-soft-success text-success p-2 rounded-circle d-flex" style={{ width: 40, height: 40 }}>
                <i className="ti ti-users-group fs-4 m-auto"></i>
              </div>
            </div>
            <div className="card-body p-0 sa-table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <div className="list-group list-group-flush border-0">
                {analytics.students_by_classroom.map((item, index) => {
                  const percentage = Math.max(5, (item.student_count / maxClassroomCount) * 100);
                  const isTop = index < 3;
                  return (
                    <div key={item.classroom_id} className="list-group-item bg-transparent border-0 px-4 py-3 sa-hover-row d-flex align-items-center gap-3">
                      <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${isTop ? 'bg-soft-primary text-primary' : 'bg-light text-secondary'}`} style={{ width: 40, height: 40, flexShrink: 0 }}>
                        {item.classroom_name.charAt(0)}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-end mb-1">
                          <span className="fw-semibold text-dark">{item.classroom_name}</span>
                          <span className="fw-bold text-dark fs-6">{item.student_count} <span className="text-muted fw-normal small">öğrenci</span></span>
                        </div>
                        <div className="sa-progress-bar">
                          <div className="sa-progress-fill" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {analytics.students_by_classroom.length === 0 && (
                  <div className="text-center text-muted py-5 px-4">
                    <i className="ti ti-box-off text-light opacity-50 mb-2 d-block" style={{ fontSize: '48px' }}></i>
                    Sınıf dağılımı bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scope Access */}
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm sa-dashboard-card bg-white h-100">
            <div className="card-header bg-transparent border-0 pt-4 pb-3 px-4 d-flex justify-content-between align-items-center border-bottom">
              <div>
                <h5 className="card-title fw-bold text-dark mb-1">Yetki Kapsamı</h5>
                <p className="text-muted small mb-0">İşlem yapabileceğiniz kampüs ve kademeler</p>
              </div>
              <div className="bg-soft-info text-info p-2 rounded-circle d-flex" style={{ width: 40, height: 40 }}>
                <i className="ti ti-shield-lock fs-4 m-auto"></i>
              </div>
            </div>
            <div className="card-body px-4 py-4">
              <div className="mb-4">
                <h6 className="fw-semibold text-dark mb-3 d-flex align-items-center gap-2">
                  <i className="ti ti-building text-primary fs-5"></i> Kampüsler
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {analytics.scope.campuses.map((campus) => (
                    <span key={campus.id} className="sa-badge-soft bg-soft-primary text-primary d-flex align-items-center gap-1">
                      <i className="ti ti-point-filled fs-6"></i> {campus.name}
                    </span>
                  ))}
                  {analytics.scope.campuses.length === 0 && (
                    <span className="text-muted small border px-3 py-2 rounded-2 border-dashed bg-light">
                      Tanımlı kampüs bulunamadı.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h6 className="fw-semibold text-dark mb-3 d-flex align-items-center gap-2">
                  <i className="ti ti-books text-info fs-5"></i> Eğitim Kademeleri
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {analytics.scope.education_levels.map((level) => (
                    <span key={level.id} className="sa-badge-soft bg-soft-info text-info d-flex align-items-center gap-1">
                      <i className="ti ti-pennant-filled fs-6"></i> {level.name}
                    </span>
                  ))}
                  {analytics.scope.education_levels.length === 0 && (
                    <span className="text-muted small border px-3 py-2 rounded-2 border-dashed bg-light">
                      Tanımlı kademe bulunamadı.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAffairsDashboard;
