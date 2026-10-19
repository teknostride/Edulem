import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/common/StatCard'; // Reusing existing card
import axiosClient from '../../api/axiosClient';
import { getMyEducationLevelIds, getMyPrimaryEducationLevelId } from '../../utils/userScope';
import TodayMealMenuCard from '../../components/meals/TodayMealMenuCard';

interface TeacherStats {
    total_students: number;
    total_classes: number;
    next_lesson: {
        course: string;
        classroom: string;
        time: string;
    } | null;
    today_timeline: Array<{
        id: number;
        course: string;
        classroom: string;
        room: string;
        time_start: string;
        time_end: string;
        status: 'past' | 'current' | 'future';
    }>;
    recent_announcements: Array<{
        id: number;
        title: string;
        created_at: string;
        message: string;
    }>;
    today_meal_menus?: Array<any>;
}

const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
};

const TeacherDashboard = () => {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<TeacherStats | null>(null); // Placeholder for real stats
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user data
        const userData = localStorage.getItem('USER_DATA');
        if (userData) {
            setUser(JSON.parse(userData));
        }

        const fetchData = async () => {
            try {
                const primaryEducationLevelId = getMyPrimaryEducationLevelId();
                const params: any = {};
                if (primaryEducationLevelId) {
                    params.education_level_id = primaryEducationLevelId;
                }

                const res = await axiosClient.get('/dashboard/stats', { params });
                const analytics = res.data?.data?.stats?.teacher_analytics;

                if (analytics) {
                    const educationLevelIds = getMyEducationLevelIds();
                    const scopedTimeline = Array.isArray(analytics.today_timeline)
                        ? analytics.today_timeline.filter((x: any) => {
                            if (!educationLevelIds.length) return true;
                            const levelId = x?.education_level_id ?? x?.classroom?.education_level_id ?? null;
                            if (levelId == null) return true;
                            return educationLevelIds.includes(Number(levelId));
                        })
                        : [];

                    setStats({
                        total_students: analytics.total_students || 0,
                        total_classes: analytics.total_classes || 0,
                        next_lesson: analytics.next_lesson ? {
                            course: analytics.next_lesson.course,
                            classroom: analytics.next_lesson.classroom,
                            time: `${analytics.next_lesson.time_start} - ${analytics.next_lesson.time_end}`
                        } : null,
                        today_timeline: scopedTimeline,
                        recent_announcements: analytics.recent_announcements || [],
                        today_meal_menus: analytics.today_meal_menus || []
                    });
                }
            } catch (error) {
                console.error('Gösterge paneli verisi alınamadı:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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

    return (
        <div className="container-fluid">
            {/* 1. Header & Welcome */}
            <div className="d-flex justify-content-between align-items-center my-4">
                <div>
                    <h3 className="fw-bold m-0">Hoş Geldiniz, {user?.name} 👋</h3>
                    <p className="text-muted mb-0">Bugünkü ders programınız ve önemli hatırlatmalar.</p>
                </div>
                <div className="d-flex gap-2">
                    <span className="badge bg-soft-primary text-primary fs-6 px-3 py-2">
                        <i className="ti ti-calendar me-1"></i> {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Günün Menüsü */}
            <TodayMealMenuCard menus={stats?.today_meal_menus} className="mb-4" />

            {/* 2. Quick Actions & Status Cards */}
            <div className="row g-3 mb-4">
                {/* Status Card: Next Lesson */}
                <div className="col-md-6 col-xl-4">
                    <div className="card h-100 border-0 shadow-sm bg-primary text-white position-relative overflow-hidden">
                        <div className="card-body position-relative z-1">
                            <h5 className="card-title text-white-50 mb-3">Sıradaki Ders</h5>
                            {stats?.next_lesson ? (
                                <div>
                                    <h2 className="fw-bold mb-1">{stats.next_lesson.course}</h2>
                                    <div className="d-flex align-items-center mt-2">
                                        <span className="badge bg-white bg-opacity-25 me-2">
                                            <i className="ti ti-clock me-1"></i> {stats.next_lesson.time}
                                        </span>
                                        <span className="badge bg-white bg-opacity-25">
                                            <i className="ti ti-map-pin me-1"></i> {stats.next_lesson.classroom}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="mb-0 fs-5">Bugün başka dersiniz görünmüyor.</p>
                            )}
                            <div className="mt-4">
                                <Link to="/attendances/create" className="btn btn-light text-primary fw-bold w-100">
                                    <i className="ti ti-user-check me-2"></i> Yoklama Al
                                </Link>
                            </div>
                        </div>
                        {/* Decoration */}
                        <div className="position-absolute top-0 end-0 opacity-10 translate-middle-y me-n5 mt-n5">
                            <i className="ti ti-book fs-1" style={{ fontSize: '10rem' }}></i>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="col-md-3 col-xl-2">
                    <StatCard
                        title="Öğrencilerim"
                        amount={stats?.total_students.toString() || "0"}
                        iconName="ti ti-users"
                        iconColor="text-info"
                        trend="Aktif"
                        trendColor="badge-soft-info"
                        trendIcon="ti-check"
                    />
                </div>

                <div className="col-md-3 col-xl-2">
                    <StatCard
                        title="Sınıflarım"
                        amount={stats?.total_classes.toString() || "0"}
                        iconName="ti ti-chalkboard"
                        iconColor="text-warning"
                        trend="Atanan"
                        trendColor="badge-soft-warning"
                        trendIcon="ti-building"
                    />
                </div>

                <div className="col-md-6 col-xl-4">
                    {/* Placeholder for Quick Links or Announcements */}
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body">
                            <h5 className="card-title mb-3">Hızlı İşlemler</h5>
                            <div className="d-grid gap-2">
                                <Link to="/schedules" className="btn btn-outline-secondary text-start">
                                    <i className="ti ti-calendar-event me-2"></i> Ders Programımı Gör
                                </Link>
                                <button className="btn btn-outline-secondary text-start" disabled>
                                    <i className="ti ti-file-analytics me-2"></i> Sınav Sonucu Gir (Yakında)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Main Content Area */}
            <div className="row">
                {/* Left: Schedule Timeline */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                            <h5 className="card-title m-0">Bugünkü Program</h5>
                            <Link to="/schedules" className="btn btn-sm btn-light">Tümü</Link>
                        </div>
                        <div className="card-body">
                            <div className="timeline-widget">
                                {stats?.today_timeline && stats.today_timeline.length > 0 ? (
                                    stats.today_timeline.map((lesson) => {
                                        const isCurrent = lesson.status === 'current';
                                        const isPast = lesson.status === 'past';
                                        return (
                                            <div key={lesson.id} className="d-flex mb-4">
                                                <div className="flex-shrink-0 text-center me-3" style={{ width: '60px' }}>
                                                    <span className={`d-block ${isCurrent ? 'text-primary' : 'text-muted'} small`}>{lesson.time_start}</span>
                                                    <span className={`d-block fw-bold ${isCurrent ? 'text-primary' : ''}`}>{lesson.time_end}</span>
                                                </div>
                                                <div className={`flex-grow-1 border-start ps-4 position-relative ${isCurrent ? 'border-primary border-3' : (isPast ? 'border-primary border-3' : 'border-2')}`}>
                                                    <span className={`position-absolute top-0 start-0 translate-middle rounded-circle p-1 ${isCurrent ? 'bg-primary' : 'bg-white border border-primary'}`} style={{ width: '12px', height: '12px' }}></span>
                                                    <div className={`card mb-0 ${isCurrent ? 'bg-soft-primary border-0' : (isPast ? 'bg-light border-0' : 'border')}`}>
                                                        <div className="card-body p-3">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <h6 className={`mb-1 fw-bold ${isCurrent ? 'text-primary' : (isPast ? 'text-decoration-line-through text-muted' : '')}`}>{lesson.course} - {lesson.classroom}</h6>
                                                                    <small className={isCurrent ? 'text-primary' : 'text-muted'}><i className="ti ti-map-pin me-1"></i> {lesson.room || 'Derslik Belirtilmemiş'}</small>
                                                                </div>
                                                                {isCurrent && <span className="badge bg-primary">Şimdi</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-muted py-4">Bugün için programınız bulunmamaktadır.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Notifications */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-transparent border-0 py-3">
                            <h5 className="card-title m-0">Duyurular</h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="list-group list-group-flush">
                                {stats?.recent_announcements && stats.recent_announcements.length > 0 ? (
                                    stats.recent_announcements.map((announcement) => {
                                        const dt = new Date(announcement.created_at);
                                        const isToday = dt.toDateString() === new Date().toDateString();
                                        return (
                                            <a key={announcement.id} href="#" className="list-group-item list-group-item-action p-3 border-0">
                                                <div className="d-flex w-100 justify-content-between">
                                                    <h6 className="mb-1 fw-bold">{announcement.title}</h6>
                                                    <small className="text-muted">{isToday ? "Bugün" : dt.toLocaleDateString('tr-TR')}</small>
                                                </div>
                                                <p className="mb-1 small text-muted text-truncate">{stripHtmlTags(announcement.message)}</p>
                                            </a>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 text-center text-muted">Mevcut duyuru bulunmamaktadır.</div>
                                )}
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-0 text-center pb-3">
                            <Link to="/notifications" className="btn btn-link btn-sm text-decoration-none">Tüm Duyurular</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
