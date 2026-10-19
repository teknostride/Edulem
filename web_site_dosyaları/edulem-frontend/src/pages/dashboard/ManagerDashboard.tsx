import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import axiosClient from '../../api/axiosClient';
import { getMyEducationLevelIds, getMyPrimaryEducationLevelId, setMyPrimaryEducationLevelId } from '../../utils/userScope';
import TodayMealMenuCard from '../../components/meals/TodayMealMenuCard';

interface ManagerAnalytics {
    scope: {
        campus_ids: number[];
        education_level_ids: number[];
    };
    totals: {
        total_students: number;
        total_teachers: number;
    };
    students_by_education_level: Array<{
        education_level_id: number | null;
        education_level_name: string;
        student_count: number;
    }>;
    today_meal_menus: Array<{
        id: number;
        menu_date: string;
        meal_type: string;
        meals: Array<string | { name?: string; description?: string | null }>;
        notes?: string | null;
        classroom?: { id: number; name: string } | null;
    }>;
    recent_homeworks: Array<{
        id: number;
        title: string;
        due_date?: string | null;
        created_at?: string | null;
        classroom?: { id: number; name: string } | null;
        teacher?: { id: number; name: string } | null;
        lesson?: { id: number; name: string } | null;
    }>;
    recent_announcements: Array<{
        id: number;
        title: string;
        message: string;
        type: string;
        user_name?: string;
        created_at?: string;
    }>;
    today_duty_schedules: Array<{
        id: number;
        day_of_week: string;
        start_time: string;
        end_time: string;
        location: string;
        notes?: string | null;
        user?: { id: number; name: string } | null;
    }>;
}

const empty: ManagerAnalytics = {
    scope: { campus_ids: [], education_level_ids: [] },
    totals: { total_students: 0, total_teachers: 0 },
    students_by_education_level: [],
    today_meal_menus: [],
    recent_homeworks: [],
    recent_announcements: [],
    today_duty_schedules: [],
};

const fmtTime = (t?: string | null) => (t ? String(t).substring(0, 5) : '-');
const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';



const ManagerDashboard = () => {
    const [analytics, setAnalytics] = useState<ManagerAnalytics>(empty);
    const [loading, setLoading] = useState(true);
    const [todayAbsences, setTodayAbsences] = useState<number>(0);

    const [myEducationLevelIds, setMyEducationLevelIds] = useState<number[]>(() => getMyEducationLevelIds());
    const [primaryEducationLevelId, setPrimaryEducationLevelId] = useState<number | null>(() => {
        const ids = getMyEducationLevelIds();
        if (ids.length === 0) return null;

        if (ids.length > 1) {
            try {
                const stored = localStorage.getItem('PRIMARY_EDUCATION_LEVEL_ID');
                const storedId = stored ? Number(stored) : NaN;
                if (Number.isFinite(storedId) && storedId > 0 && ids.includes(storedId)) return storedId;
                return ids[0];
            } catch {
                return ids[0];
            }
        }

        return getMyPrimaryEducationLevelId();
    });
    const [educationLevelOptions, setEducationLevelOptions] = useState<Array<{ id: number; name: string }>>([]);

    useEffect(() => {
        (axiosClient.get('/user/profile').catch(() => axiosClient.get('/profile'))).then((res) => {
            const u = res?.data?.data;
            if (u) {
                const freshLevelIds = Array.isArray(u.education_level_ids)
                    ? u.education_level_ids.map(Number).filter((n: number) => Number.isFinite(n) && n > 0)
                    : [];
                if (freshLevelIds.length > 0) {
                    setMyEducationLevelIds(freshLevelIds);
                    setPrimaryEducationLevelId((prev) => {
                        if (prev && freshLevelIds.includes(prev)) return prev;
                        const firstId = freshLevelIds[0];
                        setMyPrimaryEducationLevelId(firstId);
                        return firstId;
                    });
                    try {
                        const storedRaw = localStorage.getItem('USER_DATA');
                        const stored = storedRaw ? JSON.parse(storedRaw) : {};
                        const normalizedU = {
                            ...u,
                            role: typeof u.role === 'string' ? u.role :
                                  (u.role && typeof u.role === 'object' ? (u.role.name || u.role.display_name || '') : (u.role_name || stored?.role_name || '')),
                        };
                        localStorage.setItem('USER_DATA', JSON.stringify({ ...stored, ...normalizedU }));
                    } catch {
                        // ignore
                    }
                }
            }
        }).catch(() => null);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params: any = {};
                if (primaryEducationLevelId) {
                    params.education_level_id = primaryEducationLevelId;
                }

                const today = new Date().toISOString().split('T')[0];
                const [res, dailyRes] = await Promise.all([
                    axiosClient.get('/dashboard/stats', { params }),
                    axiosClient.get('/attendances/daily', {
                        params: {
                            date: today,
                            ...(primaryEducationLevelId ? { education_level_id: primaryEducationLevelId } : {}),
                        },
                    }).catch(() => null),
                ]);

                const stats = res.data?.data?.stats || res.data?.stats || {};
                setAnalytics(stats.manager_analytics ?? empty);

                const dailyRaw: any = dailyRes?.data?.data ?? dailyRes?.data;
                const uniqueAbsences = Array.isArray(dailyRaw?.gelmeyen_ogrenciler)
                    ? new Set(dailyRaw.gelmeyen_ogrenciler.map((g: any) => g.student_id ? String(g.student_id) : (g.okul_no ? `${g.sinif_tam_adi}_${g.okul_no}` : g.ogrenci_adi))).size
                    : 0;
                const absentCount = typeof dailyRaw?.toplam_devamsiz_ogrenci === 'number'
                    ? dailyRaw.toplam_devamsiz_ogrenci
                    : uniqueAbsences;
                setTodayAbsences(Number(absentCount) || 0);
            } catch {
                setAnalytics(empty);
                setTodayAbsences(0);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [primaryEducationLevelId]);

    useEffect(() => {
        (async () => {
            try {
                const res = await axiosClient.get('/education-levels', { params: { per_page: 200 } });
                const raw = res.data?.data?.education_levels ?? res.data?.education_levels ?? res.data?.data ?? res.data;
                const arr: any[] = Array.isArray(raw) ? raw : [];
                const opts = arr
                    .map((x) => ({ id: Number(x?.id), name: String(x?.name ?? '') }))
                    .filter((x) => Number.isFinite(x.id) && x.id > 0 && (myEducationLevelIds.length === 0 || myEducationLevelIds.includes(x.id)));
                setEducationLevelOptions(opts);
            } catch {
                setEducationLevelOptions([]);
            }
        })();
    }, [myEducationLevelIds]);

    const levelCategories = analytics.students_by_education_level.map((l) => l.education_level_name);
    const levelSeries = [{ name: 'Öğrenci', data: analytics.students_by_education_level.map((l) => l.student_count) }];

    const levelOptions = useMemo(() => ({
        chart: { type: 'bar' as const, toolbar: { show: false }, fontFamily: "'Inter', sans-serif" },
        plotOptions: { bar: { borderRadius: 8, columnWidth: '50%' } },
        colors: ['#6366f1'],
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.85 } },
        dataLabels: { enabled: false },
        xaxis: { categories: levelCategories, labels: { style: { fontSize: '12px' } } },
        yaxis: { min: 0, labels: { style: { fontSize: '12px' } } },
        grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
        tooltip: { y: { formatter: (v: number) => `${v} öğrenci` } },
    }), [levelCategories]);

    const statCards = [
        {
            label: 'Toplam Öğrenci',
            value: analytics.totals.total_students,
            icon: 'ti ti-users',
            gradient: 'linear-gradient(135deg,#6366f1,#818cf8)',
        },
        {
            label: 'Bugünkü Devamsız',
            value: todayAbsences,
            icon: 'ti ti-user-x',
            gradient: 'linear-gradient(135deg,#ef4444,#f87171)',
        },
        {
            label: 'Toplam Öğretmen',
            value: analytics.totals.total_teachers,
            icon: 'ti ti-chalkboard',
            gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
        },
        {
            label: 'Bugünkü Gözetmen',
            value: analytics.today_duty_schedules.length,
            icon: 'ti ti-shield-check',
            gradient: 'linear-gradient(135deg,#10b981,#34d399)',
        },
        {
            label: 'Son Ödevler',
            value: analytics.recent_homeworks.length,
            icon: 'ti ti-notebook',
            gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
        },
    ];

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center col-xxl-2" style={{ minHeight: 300 }}>
                <div className="spinner-border text-primary" />
            </div>
        );
    }

    return (
        <div className="container-fluid py-3">

            {/* Header */}
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-1" style={{ color: '#1e293b' }}>Müdür Anasayfa</h4>
                    <p className="text-muted mb-0 small">Sorumlu olduğunuz kapsamda genel durum özeti</p>
                </div>
                <ol className="breadcrumb m-0 py-0 d-none d-md-flex">
                    <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
                    <li className="breadcrumb-item active fw-medium">Müdür Paneli</li>
                </ol>
            </div>

            {(myEducationLevelIds.length === 0 || myEducationLevelIds.length > 1) && (
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
                    <div className="card-body p-3">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label mb-1">Kademe Filtresi</label>
                                <select
                                    className="form-select"
                                    value={primaryEducationLevelId ?? ''}
                                    onChange={(e) => {
                                        const v = e.target.value ? Number(e.target.value) : null;
                                        setPrimaryEducationLevelId(v);
                                        setMyPrimaryEducationLevelId(v);
                                    }}
                                >
                                    <option value="">Tüm Kademeler</option>
                                    {(educationLevelOptions.length > 0
                                        ? educationLevelOptions
                                        : myEducationLevelIds.map((id) => ({ id, name: `Kademe #${id}` }))
                                    ).map((opt) => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Günün Menüsü */}
            <TodayMealMenuCard menus={analytics.today_meal_menus} className="mb-4" />

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                        {statCards.map((card) => (
                            <div key={card.label} className="col-12 col-sm-6 col-xl-3">
                                <div
                                    className="card border-0 shadow-sm h-100"
                                    style={{ background: card.gradient, borderRadius: 16, transition: 'transform .2s' }}
                                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)')}
                                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'translateY(0)')}
                                >
                                    <div className="card-body d-flex align-items-center gap-3 p-4">
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-circle"
                                            style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.25)', flexShrink: 0 }}
                                        >
                                            <i className={`${card.icon} fs-3 text-white`} />
                                        </div>
                                        <div>
                                            <div className="text-white opacity-75 small fw-medium">{card.label}</div>
                                            <div className="text-white fw-bold fs-4">{card.value}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

            <div className="row g-3 mb-4">
                {/* Kademe Dağılımı Grafiği */}
                <div className="col-12 col-xl-7">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                        <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4">
                            <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>
                                <i className="ti ti-chart-bar me-2 text-primary" />Kademe Bazlı Öğrenci Dağılımı
                            </h6>
                        </div>
                        <div className="card-body px-3 pb-3 pt-1">
                            {analytics.students_by_education_level.length > 0 ? (
                                <Chart type="bar" height={240} options={levelOptions} series={levelSeries} />
                            ) : (
                                <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                                    <i className="ti ti-mood-empty fs-1 mb-2" />
                                    <span className="small">Veri bulunamadı</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bugünkü Gözetmen Listesi */}
                <div className="col-12 col-xl-5">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                        <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4">
                            <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>
                                <i className="ti ti-shield-check me-2 text-success" />Bugünkü Gözetmenler
                            </h6>
                        </div>
                        <div className="card-body px-4 pb-4 pt-1" style={{ overflowY: 'auto', maxHeight: 280 }}>
                            {analytics.today_duty_schedules.length === 0 ? (
                                <div className="text-muted small text-center py-4">Bugün gözetmen kaydı yok.</div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {analytics.today_duty_schedules.map((d) => (
                                        <div key={d.id} className="d-flex align-items-center gap-3 p-2 rounded" style={{ background: '#f8fafc' }}>
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-circle"
                                                style={{ width: 36, height: 36, background: '#dcfce7', flexShrink: 0 }}
                                            >
                                                <i className="ti ti-user-check text-success" />
                                            </div>
                                            <div className="flex-grow-1 min-w-0">
                                                <div className="fw-semibold text-truncate small" style={{ color: '#1e293b' }}>
                                                    {d.user?.name ?? 'Atanmamış'}
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                    {fmtTime(d.start_time)} – {fmtTime(d.end_time)} · {d.location || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3">
                {/* Son Ödevler */}
                <div className="col-12 col-xl-6">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                        <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4">
                            <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>
                                <i className="ti ti-notebook me-2 text-warning" />Son Ödevler
                            </h6>
                        </div>
                        <div className="card-body px-4 pb-4 pt-1" style={{ overflowY: 'auto', maxHeight: 280 }}>
                            {analytics.recent_homeworks.length === 0 ? (
                                <div className="text-muted small text-center py-4">Ödev kaydı bulunamadı.</div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {analytics.recent_homeworks.map((hw) => (
                                        <div key={hw.id} className="d-flex align-items-start gap-3 p-2 rounded" style={{ background: '#fefce8' }}>
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-circle mt-1"
                                                style={{ width: 32, height: 32, background: '#fef9c3', flexShrink: 0 }}
                                            >
                                                <i className="ti ti-book text-warning" style={{ fontSize: 14 }} />
                                            </div>
                                            <div className="flex-grow-1 min-w-0">
                                                <div className="fw-semibold small text-truncate" style={{ color: '#1e293b' }}>{hw.title}</div>
                                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                    {hw.teacher?.name ?? '-'} · {hw.classroom?.name ?? '-'} · {hw.lesson?.name ?? '-'}
                                                </div>
                                                {hw.due_date && (
                                                    <div className="text-muted" style={{ fontSize: '0.70rem' }}>
                                                        Son teslim: {fmtDate(hw.due_date)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Son Duyurular */}
                <div className="col-12 col-xl-6">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                        <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4">
                            <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>
                                <i className="ti ti-speakerphone me-2 text-primary" />Son Duyurular
                            </h6>
                        </div>
                        <div className="card-body px-4 pb-4 pt-1" style={{ overflowY: 'auto', maxHeight: 280 }}>
                            {analytics.recent_announcements.length === 0 ? (
                                <div className="text-muted small text-center py-4">Duyuru bulunamadı.</div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {analytics.recent_announcements.map((a) => (
                                        <div key={a.id} className="d-flex align-items-start gap-3 p-2 rounded" style={{ background: '#f0f9ff' }}>
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-circle mt-1"
                                                style={{ width: 32, height: 32, background: '#e0f2fe', flexShrink: 0 }}
                                            >
                                                <i className="ti ti-bell text-primary" style={{ fontSize: 14 }} />
                                            </div>
                                            <div className="flex-grow-1 min-w-0">
                                                <div className="fw-semibold small text-truncate" style={{ color: '#1e293b' }}>{a.title}</div>
                                                <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>{a.message}</div>
                                                <div className="text-muted" style={{ fontSize: '0.70rem' }}>
                                                    {a.user_name ?? 'Sistem'} · {fmtDate(a.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
