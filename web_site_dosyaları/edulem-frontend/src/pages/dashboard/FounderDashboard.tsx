import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';
import axiosClient from '../../api/axiosClient';
import TodayMealMenuCard from '../../components/meals/TodayMealMenuCard';

interface BackendStats {
  total_students?: number;
  total_classrooms?: number;
  total_lessons?: number;
  recent_students?: Array<{
    id: number;
    name: string;
    school_no: string;
    created_at: string;
  }>;
}

interface TeacherStat {
  teacher_id: number | null;
  teacher_name: string;
  homework_count: number;
  total_submissions: number;
  graded_count: number;
}

interface HomeworkStats {
  total_homeworks?: number;
  total_submissions?: number;
  graded_count?: number;
  pending_graded?: number;
  teacher_stats?: TeacherStat[];
}

interface ClassStat {
  class_name: string;
  student_count: number;
}

interface MeetingStats {
  totals?: {
    total_records?: number;
    student_meetings?: number;
    parent_meetings?: number;
    meetings?: number;
    appointments?: number;
  };
  top_last_30_days?: Array<{
    teacher_id: number;
    teacher_name: string;
    total_records: number;
  }>;
  last_30_days_from?: string;
}

interface MealMenuRow {
  id: number;
  menu_date: string;
  meal_type: string;
  meals: Array<string | { name?: string; description?: string }>;
  notes?: string | null;
}

const FounderDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BackendStats>({});
  const [homeworkStats, setHomeworkStats] = useState<HomeworkStats>({});
  const [classStats, setClassStats] = useState<ClassStat[]>([]);
  const [meetingStats, setMeetingStats] = useState<MeetingStats>({});
  const [todayMenus, setTodayMenus] = useState<MealMenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('USER_ROLE') || (() => {
      try {
        return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
      } catch {
        return null;
      }
    })();

    setRole(storedRole);

    const fetchStats = async () => {
      try {
        const [dashboardRes, homeworkRes] = await Promise.allSettled([
          axiosClient.get('/dashboard/stats'),
          axiosClient.get('/homework', { params: { page: 1, per_page: 1 } }),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const [meetingRes, mealRes] = await Promise.allSettled([
          axiosClient.get('/meetings/stats'),
          axiosClient.get('/meal-menus', {
            params: {
              menu_date_from: today,
              menu_date_to: today,
              published_only: true,
              per_page: 25,
            },
          }),
        ]);

        if (dashboardRes.status === 'fulfilled') {
          const payload = dashboardRes.value.data?.data?.stats || dashboardRes.value.data?.stats || {};
          setStats(payload);
        } else {
          setStats({});
        }

        if (homeworkRes.status === 'fulfilled') {
          const hwData = homeworkRes.value.data?.data ?? homeworkRes.value.data;
          setHomeworkStats(hwData?.stats || {});
        } else {
          setHomeworkStats({});
        }

        if (meetingRes.status === 'fulfilled') {
          const ms = meetingRes.value.data?.data ?? meetingRes.value.data;
          setMeetingStats(ms || {});
        } else {
          setMeetingStats({});
        }

        if (mealRes.status === 'fulfilled') {
          const mm = mealRes.value.data?.data ?? mealRes.value.data;
          const menusRaw = (mm?.menus ?? []) as any;
          const menus = Array.isArray(menusRaw?.data) ? menusRaw.data : Array.isArray(menusRaw) ? menusRaw : [];
          setTodayMenus(menus);
        } else {
          setTodayMenus([]);
        }

        // Sınıf başına öğrenci dağılımı (ilk 20 sayfa güvenlik limiti)
        let page = 1;
        let lastPage = 1;
        const counter = new Map<string, number>();

        do {
          const studentRes = await axiosClient.get('/students', {
            params: { page, per_page: 100, is_active: true },
          });

          const data = studentRes.data?.data ?? studentRes.data;
          const students = Array.isArray(data?.students)
            ? data.students
            : Array.isArray(data)
              ? data
              : [];

          for (const s of students) {
            const className = s?.classroom?.name || 'Sınıf Atanmamış';
            counter.set(className, (counter.get(className) || 0) + 1);
          }

          const p = data?.pagination;
          lastPage = p?.last_page || 1;
          page += 1;
        } while (page <= lastPage && page <= 20);

        const rankedClasses: ClassStat[] = Array.from(counter.entries())
          .map(([class_name, student_count]) => ({ class_name, student_count }))
          .sort((a, b) => b.student_count - a.student_count)
          .slice(0, 7);

        setClassStats(rankedClasses);
      } catch {
        setStats({});
        setHomeworkStats({});
        setClassStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const isOwner = role === 'owner' || role === 'Admin' || role === 'Genel Müdür';
  if (!loading && !isOwner) {
    return <Navigate to="/" replace />;
  }

  const quickActions = [
    { title: 'Yoklama Takibi', icon: 'ti ti-clipboard-check', to: '/attendances', color: 'success' },
    { title: 'Ders Programları', icon: 'ti ti-calendar-week', to: '/schedules', color: 'info' },
    { title: 'Öğrenci Listesi', icon: 'ti ti-users', to: '/students', color: 'primary' },
    { title: 'Sınıf Yönetimi', icon: 'ti ti-building', to: '/classrooms', color: 'warning' },
    { title: 'Ödev Takibi', icon: 'ti ti-notebook', to: '/homework', color: 'secondary' },
    { title: 'Kullanıcı Yönetimi', icon: 'ti ti-user-check', to: '/users', color: 'danger' },
  ] as const;

  const kpiCards = [
    { label: 'Toplam Öğrenci', value: stats.total_students || 0, icon: 'ti ti-users', color: 'primary' },
    { label: 'Toplam Sınıf', value: stats.total_classrooms || 0, icon: 'ti ti-building', color: 'warning' },
    { label: 'Toplam Ders', value: stats.total_lessons || 0, icon: 'ti ti-book', color: 'info' },
    { label: 'Toplam Ödev', value: homeworkStats.total_homeworks || 0, icon: 'ti ti-notebook', color: 'success' },
    { label: 'Teslim Edilen Ödev', value: homeworkStats.total_submissions || 0, icon: 'ti ti-send', color: 'info' },
    { label: 'Kontrol Bekleyen', value: homeworkStats.pending_graded || 0, icon: 'ti ti-clock', color: 'danger' },
  ];

  const topClassSeries = [
    { name: 'Öğrenci Sayısı', data: classStats.map((c) => c.student_count) },
  ];

  const topTeacherStats = (homeworkStats.teacher_stats || [])
    .map((t) => ({
      ...t,
      teacher_name: t.teacher_name?.trim() ? t.teacher_name : 'Belirtilmemiş',
    }))
    .sort((a, b) => b.homework_count - a.homework_count)
    .slice(0, 6);

  const topTeacherSeries = topTeacherStats.map((t) => t.homework_count);

  const academicOptions = {
    chart: { type: 'bar' as const, toolbar: { show: false } },
    colors: ['#1e88e5'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: classStats.map((c) => c.class_name) },
    yaxis: { min: 0 },
    grid: { borderColor: '#eef2f7' },
  };

  const teacherOptions = {
    chart: { toolbar: { show: false } },
    colors: ['#8e24aa', '#3949ab', '#039be5', '#43a047', '#f9a825', '#ef6c00'],
    labels: topTeacherStats.map((t) => t.teacher_name),
    legend: { position: 'bottom' as const },
    dataLabels: { enabled: true },
    stroke: { width: 0 },
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid pt-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h4 className="mb-1 fw-bold">Kurucu Anasayfa</h4>
          <p className="text-muted mb-0">Öğrenci ve öğretmen takibine odaklı genel kurum görünümü</p>
        </div>
      </div>

      {/* Günün Menüsü */}
      <TodayMealMenuCard menus={todayMenus} className="mb-4" />

      {/* Mobil: hızlı işlemler 2 kolon grid / Desktop: mevcut row layout */}
      <div className="d-md-none mb-4">
        <div className="row g-2">
          {quickActions.map((item) => (
            <div key={item.title} className="col-6">
              <button
                type="button"
                className={`btn w-100 text-start p-2 border border-${item.color} border-opacity-25 bg-soft-${item.color} rounded-3`}
                onClick={() => navigate(item.to)}
              >
                <div className="d-flex align-items-center gap-2">
                  <span className={`avatar-xs rounded-3 d-inline-flex align-items-center justify-content-center bg-${item.color} text-white`}>
                    <i className={`${item.icon}`}></i>
                  </span>
                  <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                    <span className="fw-semibold text-dark" style={{ fontSize: 13, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </span>
                    <span className="text-muted" style={{ fontSize: 11, lineHeight: 1.1 }}>
                      Aç
                    </span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="row g-3 mb-4 d-none d-md-flex">
        {quickActions.map((item) => (
          <div key={item.title} className="col-12 col-md-6 col-xl-4">
            <button
              type="button"
              className={`btn w-100 text-start p-3 border border-${item.color} border-opacity-25 bg-soft-${item.color}`}
              onClick={() => navigate(item.to)}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <span className={`avatar-sm rounded-circle d-inline-flex align-items-center justify-content-center bg-${item.color} text-white`}>
                    <i className={`${item.icon} fs-5`}></i>
                  </span>
                  <span className="fw-semibold text-dark">{item.title}</span>
                </div>
                <i className="ti ti-arrow-right text-muted"></i>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Mobil: KPI slider (yatay scroll). Desktop: mevcut grid */}
      <div className="d-md-none mb-4" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div className="d-flex gap-2" style={{ minWidth: 'max-content', paddingBottom: 6 }}>
          {kpiCards.map((card) => (
            <div key={card.label} className="card border-0 shadow-sm" style={{ width: 200 }}>
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted" style={{ fontSize: 12, lineHeight: 1.1 }}>
                    {card.label}
                  </span>
                  <i className={`${card.icon} text-${card.color} fs-4`}></i>
                </div>
                <h4 className="mb-0 fw-bold">{card.value}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row g-3 mb-4 d-none d-md-flex">
        {kpiCards.map((card) => (
          <div key={card.label} className="col-12 col-sm-6 col-xl-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted">{card.label}</span>
                  <i className={`${card.icon} text-${card.color} fs-4`}></i>
                </div>
                <h4 className="mb-0 fw-bold">{card.value}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, rgba(2,132,199,0.08), rgba(99,102,241,0.08))' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="fw-semibold">Görüşme İstatistikleri</div>
                  <div className="text-muted small">Öğretmenlerin oluşturduğu görüşmeler</div>
                </div>
                <i className="ti ti-messages fs-3 text-primary" />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6 col-md-3">
                  <div className="border rounded-3 p-2 bg-white">
                    <div className="text-muted" style={{ fontSize: 12 }}>Toplam</div>
                    <div className="fw-bold fs-5">{meetingStats?.totals?.total_records ?? 0}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded-3 p-2 bg-white">
                    <div className="text-muted" style={{ fontSize: 12 }}>Öğrenci / Veli</div>
                    <div className="fw-bold fs-6">
                      {(meetingStats?.totals?.student_meetings ?? 0)} / {(meetingStats?.totals?.parent_meetings ?? 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="fw-semibold mb-2">Son 30 Gün En Çok Görüşme</div>
              {(meetingStats?.top_last_30_days || []).length === 0 ? (
                <div className="text-muted small">Kayıt yok</div>
              ) : (
                <div className="row g-2">
                  {(meetingStats.top_last_30_days || []).slice(0, 6).map((t, idx) => (
                    <div key={t.teacher_id} className="col-12 col-md-6 col-lg-4">
                      <div className="d-flex justify-content-between align-items-center border rounded-3 p-2 bg-white">
                        <div className="small fw-semibold text-truncate me-2">
                          {idx + 1}. {t.teacher_name}
                        </div>
                        <span className="badge bg-soft-primary text-primary">{t.total_records}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3">
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate('/meetings')}>
                  Tüm Görüşmeleri Aç
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="card-title mb-1">En Çok Öğrenci Bulunan Sınıflar</h5>
              <small className="text-muted">Sınıf bazlı öğrenci yoğunluğu (ilk 7 sınıf)</small>
            </div>
            <div className="card-body">
              {classStats.length > 0 ? (
                <Chart type="bar" height={300} options={academicOptions} series={topClassSeries} />
              ) : (
                <div className="text-muted text-center py-5">Sınıf istatistiği bulunamadı.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="card-title mb-1">En Çok Ödev Veren Öğretmenler</h5>
              <small className="text-muted">Ödev adedine göre öğretmen dağılımı</small>
            </div>
            <div className="card-body">
              {topTeacherSeries.length > 0 ? (
                <Chart type="donut" height={300} options={teacherOptions} series={topTeacherSeries} />
              ) : (
                <div className="text-muted text-center py-5">Öğretmen ödev istatistiği bulunamadı.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="card-title mb-0">Öğretmen Ödev Takip Özeti</h5>
            </div>
            <div className="card-body pt-0">
              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Öğretmen</th>
                      <th>Verdiği Ödev</th>
                      <th>Teslim Edilen</th>
                      <th>Kontrol Edilen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTeacherStats.map((teacher) => (
                      <tr key={teacher.teacher_id ?? teacher.teacher_name}>
                        <td className="fw-semibold">{teacher.teacher_name}</td>
                        <td>{teacher.homework_count}</td>
                        <td>{teacher.total_submissions}</td>
                        <td>{teacher.graded_count}</td>
                      </tr>
                    ))}
                    {topTeacherStats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">Öğretmen istatistiği bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FounderDashboard;
