import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import StatCard from '../../components/common/StatCard';
import RecentTransactions from '../../components/dashboard/RecentTransactions';
import axiosClient from '../../api/axiosClient';
import TeacherDashboard from './TeacherDashboard';
import GuidanceDashboard from './GuidanceDashboard';
import ManagerDashboard from './ManagerDashboard';
import { getDashboardRouteByRole } from '../../utils/roleRouting';
import { getMyPrimaryEducationLevelId } from '../../utils/userScope';
import TodayMealMenuCard from '../../components/meals/TodayMealMenuCard';

// 1. Backend'den Gelen Veri Tipi
interface BackendStats {
    total_students: number;
    total_classrooms: number;
    total_lessons: number;
    total_payments: number;
    total_payments_amount: number;
    total_invoices: number;
    total_expenses: number;
    recent_payments: any[];
    recent_students: Array<{
        id: number;
        name: string;
        school_no: string;
        created_at: string;
    }>;
    manager_analytics?: {
        scope?: {
            campus_ids?: number[];
            education_level_ids?: number[];
        };
        totals?: {
            total_students?: number;
            total_teachers?: number;
        };
        students_by_education_level?: Array<{
            education_level_id: number | null;
            education_level_name: string;
            student_count: number;
        }>;
        today_meal_menus?: Array<{
            id: number;
            menu_date: string;
            meal_type: string;
            meals?: Array<string | { name?: string; description?: string | null }>;
            notes?: string | null;
            classroom?: { id: number; name: string } | null;
        }>;
        recent_homeworks?: Array<{
            id: number;
            title: string;
            due_date?: string | null;
            created_at?: string | null;
            classroom?: { id: number; name: string } | null;
            teacher?: { id: number; name: string } | null;
            lesson?: { id: number; name: string } | null;
        }>;
        recent_announcements?: Array<{
            id: number;
            title: string;
            message: string;
            type: string;
            user_name?: string;
            created_at?: string;
        }>;
        today_duty_schedules?: Array<{
            id: number;
            day_of_week: string;
            start_time: string;
            end_time: string;
            location: string;
            notes?: string | null;
            user?: { id: number; name: string } | null;
        }>;
    };
}

// 2. Ekranda Göstereceğimiz Veri Tipi
interface DashboardDisplayData {
    totalStudents: number;
    totalClassrooms: number;
    totalLessons: number;
    totalBalance: number;
    income: number;
    expenses: number;
    recentStudents: BackendStats['recent_students'];
    todayAbsences: number;
    todayDutySchedules: NonNullable<BackendStats['manager_analytics']>['today_duty_schedules'];
    todayMealMenus: NonNullable<BackendStats['manager_analytics']>['today_meal_menus'];
}

const Home = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardDisplayData | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    };

    useEffect(() => {
        // 1. Rol Kontrolü
        const storedRole = localStorage.getItem('USER_ROLE'); // Login'de kaydetmiştik
        // Yedek olarak USER_DATA'dan da bakabiliriz
        if (!storedRole) {
            const userData = localStorage.getItem('USER_DATA');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    if (typeof user.role === 'string') setUserRole(user.role);
                    else if (user.role && typeof user.role === 'object' && user.role.name) setUserRole(user.role.name);
                    else if (user.role_name) setUserRole(user.role_name);
                } catch (e) {
                    console.error("User data parse error", e);
                }
            }
        } else {
            setUserRole(storedRole);
        }

        // Eğer öğretmen/rehberlik ise admin verilerini çekmeye gerek yok
        if (
            storedRole === 'Öğretmen' ||
            storedRole === 'Sınıf Öğretmeni' ||
            storedRole === 'teacher' ||
            storedRole === 'Rehber Öğretmen' ||
            storedRole === 'rehber_teacher' ||
            storedRole === 'guidance_teacher' ||
            storedRole === 'Rehberlik' ||
            storedRole === 'guidance' ||
            storedRole === '5' ||
            storedRole === '6'
        ) {
            setLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            try {
                const primaryEducationLevelId = getMyPrimaryEducationLevelId();
                const params: any = {};
                if (primaryEducationLevelId) {
                    params.education_level_id = primaryEducationLevelId;
                }

                const today = new Date().toISOString().split('T')[0];
                const [response, dailyRes] = await Promise.all([
                    axiosClient.get('/dashboard/stats', { params }),
                    axiosClient.get('/attendances/daily', {
                        params: {
                            date: today,
                            ...(primaryEducationLevelId ? { education_level_id: primaryEducationLevelId } : {}),
                        },
                    }).catch(() => null),
                ]);

                // Backend yapısına göre data'yı alıyoruz.
                // ApiController yapısında genellikle response.data.data.stats veya response.data.stats olabilir.
                // Güvenli erişim için kontrol ekliyoruz:
                const backendStats: BackendStats = response.data.data?.stats || response.data.stats || {};

                const dailyRaw: any = dailyRes?.data?.data ?? dailyRes?.data;
                const uniqueAbsences = Array.isArray(dailyRaw?.gelmeyen_ogrenciler)
                    ? new Set(dailyRaw.gelmeyen_ogrenciler.map((g: any) => g.student_id ? String(g.student_id) : (g.okul_no ? `${g.sinif_tam_adi}_${g.okul_no}` : g.ogrenci_adi))).size
                    : 0;
                const todayAbsences = typeof dailyRaw?.toplam_devamsiz_ogrenci === 'number'
                    ? dailyRaw.toplam_devamsiz_ogrenci
                    : uniqueAbsences;

                // 3. ADAPTASYON KATMANI
                const income = backendStats.total_payments_amount || 0;
                const expenses = backendStats.total_expenses || 0;
                const balance = income - expenses;

                setData({
                    totalStudents: backendStats.total_students || 0,
                    totalClassrooms: backendStats.total_classrooms || 0,
                    totalLessons: backendStats.total_lessons || 0,
                    totalBalance: balance,
                    income: income,
                    expenses: expenses,
                    recentStudents: backendStats.recent_students || [],
                    todayAbsences: Number(todayAbsences) || 0,
                    todayDutySchedules: backendStats.manager_analytics?.today_duty_schedules || [],
                    todayMealMenus: backendStats.manager_analytics?.today_meal_menus || [],
                });

                setLoading(false);
            } catch (error) {
                console.error("Veri çekme hatası:", error);
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    // --- ÖĞRETMEN DASHBOARD KONTROLÜ ---
    // Rol isimleri veritabanındaki 'name' alanına göre olmalı. 
    // Seeder'da 'Öğretmen' ve 'Sınıf Öğretmeni' olarak Türkçe kaydedildiğini gördük.
    // Ancak Login.tsx'de user.role'un ne döndüğü önemli. AuthController'da user.role->name dönüyor.
    // RoleSeeder.php'de name='Öğretmen' olarak atanmış.
    if (
        userRole === 'Rehberlik' ||
        userRole === 'guidance' ||
        userRole === 'Rehber Öğretmen' ||
        userRole === 'rehber_teacher' ||
        userRole === 'guidance_teacher' ||
        userRole === '6'
    ) {
        return <GuidanceDashboard />;
    }

    if (
        userRole === 'Öğretmen' ||
        userRole === 'Sınıf Öğretmeni' ||
        userRole === 'teacher' ||
        userRole === '5'
    ) {
        return <TeacherDashboard />;
    }

    if (userRole === 'Öğrenci İşleri' || userRole === 'student_affairs') {
        return <Navigate to={getDashboardRouteByRole(userRole)} replace />;
    }

    if (
        userRole === 'Müdür' ||
        userRole === 'Müdür Yardımcısı' ||
        userRole === 'Kampüs Müdürü' ||
        userRole === 'Genel Müdür'
    ) {
        return <ManagerDashboard />;
    }

    return (
        <div className="container-fluid">

            {/* BAŞLIK */}
            <div className="d-flex justify-content-between align-items-center my-3">
                <div>
                    <h4 className="fw-bold m-0">Kurum Yönetim Paneli</h4>
                    <small className="text-muted">Okul yönetimi ve genel durum özeti</small>
                </div>
                <div className="text-end d-none d-md-block">
                    <ol className="breadcrumb m-0 py-0">
                        <li className="breadcrumb-item active text-muted">Anasayfa</li>
                    </ol>
                </div>
            </div>

            {/* HIZLI İŞLEMLER */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card bg-soft-primary border-0 shadow-none">
                        <div className="card-body py-3">
                            <div className="d-flex align-items-center flex-wrap gap-2">
                                <span className="fw-semibold me-2">Hızlı İşlemler:</span>
                                <button className="btn btn-white btn-sm shadow-sm" onClick={() => navigate('/students/create')}>
                                    <i className="ti ti-user-plus me-1 text-primary"></i> Öğrenci Ekle
                                </button>
                                <button className="btn btn-white btn-sm shadow-sm" onClick={() => navigate('/counseling/sessions/create')}>
                                    <i className="ti ti-heart-handshake me-1 text-danger"></i> Görüşme Planla
                                </button>
                                <button className="btn btn-white btn-sm shadow-sm" onClick={() => navigate('/academic/attendance')}>
                                    <i className="ti ti-clipboard-check me-1 text-success"></i> Yoklama Al
                                </button>
                                <button className="btn btn-white btn-sm shadow-sm" onClick={() => navigate('/financial/payments')}>
                                    <i className="ti ti-receipt me-1 text-info"></i> Tahsilat Yap
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* SOL KOLON: Son Kayıtlar ve Özet */}
                <div className="col-xxl-4">
                    <div className="card h-100">
                        <div className="card-header border-0 d-flex justify-content-between align-items-center">
                            <h4 className="card-title m-0">Son Kayıt Olan Öğrenciler</h4>
                            <a href="#!" className="btn btn-sm btn-link">Tümü</a>
                        </div>
                        <div className="card-body pt-0">
                            {/* Öğrenci Listesi */}
                            <div className="table-responsive">
                                <table className="table table-sm table-nowrap table-borderless mb-0">
                                    <tbody>
                                        {data?.recentStudents.length === 0 ? (
                                            <tr><td className="text-muted">Henüz kayıt yok.</td></tr>
                                        ) : (
                                            data?.recentStudents.map((student) => (
                                                <tr key={student.id}>
                                                    <td style={{ width: '40px' }}>
                                                        <div className="avatar-sm">
                                                            <span className="avatar-title rounded-circle bg-soft-primary text-primary">
                                                                {student.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <h6 className="font-size-14 mb-0">{student.name}</h6>
                                                        <small className="text-muted">No: {student.school_no}</small>
                                                    </td>
                                                    <td className="text-end">
                                                        <span className="badge bg-soft-success">Yeni</span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 pt-3 border-top">
                                <h6 className="mb-2">Hızlı Finans Özeti</h6>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <p className="text-muted mb-0">Toplam Kasa</p>
                                        <h5 className="mb-0">{data ? formatCurrency(data.totalBalance) : '0 ₺'}</h5>
                                    </div>
                                    <div className="text-end">
                                        <span className={`badge ${data && data.totalBalance >= 0 ? 'bg-success' : 'bg-danger'}`}>
                                            {data && data.totalBalance >= 0 ? 'Artıda' : 'Ekside'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SAĞ KOLON: Okul İstatistikleri */}
                <div className="col-xxl-8">
                    <div className="row g-3">
                        {/* Kart 1: Toplam Öğrenci */}
                        <div className="col-md-3 col-sm-6">
                            <StatCard
                                title="Toplam Öğrenci"
                                amount={data?.totalStudents.toString() || "0"}
                                iconName="ti ti-users"
                                iconColor="text-primary"
                                trend="Aktif Kayıt"
                                trendColor="badge-soft-primary"
                                trendIcon="ti-user-check"
                            />
                        </div>
                        {/* Kart 2: Toplam Sınıf */}
                        <div className="col-md-3 col-sm-6">
                            <StatCard
                                title="Toplam Sınıf"
                                amount={data?.totalClassrooms.toString() || "0"}
                                iconName="ti ti-blackboard"
                                iconColor="text-warning"
                                trend="Şube Sayısı"
                                trendColor="badge-soft-warning"
                                trendIcon="ti-building"
                            />
                        </div>
                        {/* Kart 3: Toplam Ders */}
                        <div className="col-md-3 col-sm-6">
                            <StatCard
                                title="Tanımlı Dersler"
                                amount={data?.totalLessons.toString() || "0"}
                                iconName="ti ti-book"
                                iconColor="text-info"
                                trend="Müfredat"
                                trendColor="badge-soft-info"
                                trendIcon="ti-notebook"
                            />
                        </div>
                        {/* Kart 4: Finansal Gelir */}
                        <div className="col-md-3 col-sm-6">
                            <StatCard
                                title="Toplam Gelir"
                                amount={data ? formatCurrency(data.income) : '0 ₺'}
                                iconName="ti ti-wallet"
                                iconColor="text-success"
                                trend="Tahsilatlar"
                                trendColor="badge-soft-success"
                                trendIcon="ti-arrow-up"
                            />
                        </div>

                        {/* Kart 5: Bugünkü Devamsız */}
                        <div className="col-md-3 col-sm-6">
                            <StatCard
                                title="Bugünkü Devamsız"
                                amount={(data?.todayAbsences ?? 0).toString()}
                                iconName="ti ti-user-x"
                                iconColor="text-danger"
                                trend="Yoklama"
                                trendColor="badge-soft-danger"
                                trendIcon="ti-alert-triangle"
                            />
                        </div>
                    </div>

                    <div className="row g-3 mt-1">
                        <div className="col-12 col-xl-6">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-header border-0 bg-transparent d-flex justify-content-between align-items-center">
                                    <h6 className="fw-bold mb-0">Bugünkü Gözetmenler</h6>
                                </div>
                                <div className="card-body pt-0" style={{ maxHeight: 260, overflowY: 'auto' }}>
                                    {(data?.todayDutySchedules || []).length === 0 ? (
                                        <div className="text-muted small">Bugün gözetmen kaydı yok.</div>
                                    ) : (
                                        <div className="d-flex flex-column gap-2">
                                            {(data?.todayDutySchedules || []).map((d) => (
                                                <div key={d.id} className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                                    <div className="min-w-0">
                                                        <div className="fw-semibold text-truncate">{d.user?.name ?? 'Atanmamış'}</div>
                                                        <div className="text-muted small text-truncate">{String(d.start_time || '').substring(0, 5)} - {String(d.end_time || '').substring(0, 5)} · {d.location || '-'}</div>
                                                    </div>
                                                    <i className="ti ti-shield-check text-success"></i>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-6">
                            <TodayMealMenuCard menus={data?.todayMealMenus} />
                        </div>
                    </div>

                    {/* Son İşlemler (Recent Transactions) */}
                    <div className="row mt-4">
                        <div className="col-12">
                            <RecentTransactions />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;