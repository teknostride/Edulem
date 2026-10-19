import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import TodayMealMenuCard, { type TodayMealMenu } from '../../components/meals/TodayMealMenuCard';

type DashboardData = {
    student: {
        id: number;
        name: string;
        classroom?: { id: number; name: string } | null;
    };
    summary: {
        pending_homework_count: number;
        completed_homework_count: number;
    };
    upcoming_homeworks: Array<{
        id: number;
        title: string;
        due_date: string;
        lesson?: { id: number; name: string } | null;
    }>;
    today_schedule: Array<{
        id: number;
        start_time: string;
        end_time: string;
        lesson?: { id: number; name: string } | null;
        teacher?: { id: number; name: string } | null;
    }>;
    today_menu?: {
        id: number;
        meal_type: string;
        meals: string[];
        notes?: string | null;
    } | null;
    today_menus?: TodayMealMenu[];
};

const StudentDashboard = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/portal/student/dashboard');
            setData(res.data.data);
            if (res.data.data?.student) {
                localStorage.setItem('PORTAL_ACTIVE_STUDENT', JSON.stringify(res.data.data.student));
                localStorage.setItem('PORTAL_ACTIVE_STUDENT_ID', String(res.data.data.student.id));
                const sibs = res.data.data?.students || res.data.data?.siblings || [];
                if (sibs.length > 0) {
                    localStorage.setItem('PORTAL_SIBLINGS', JSON.stringify(sibs));
                }
                window.dispatchEvent(new CustomEvent('portalStudentLoaded', {
                    detail: {
                        student: res.data.data.student,
                        siblings: sibs
                    }
                }));
            }
        } catch (error) {
            console.error('Veri yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card border-0 shadow-sm bg-primary text-white overflow-hidden" style={{ borderRadius: '15px' }}>
                        <div className="card-body p-4 d-flex align-items-center justify-content-between position-relative">
                            <div className="position-relative z-1">
                                <h2 className="fw-bold mb-1">Merhaba, {data?.student.name}! 👋</h2>
                                <p className="mb-0 opacity-75">{data?.student.classroom?.name || 'Sınıf Bilgisi Yok'} - Günlük özetin hazır.</p>
                            </div>
                            <i className="ti ti-school position-absolute opacity-10" style={{ fontSize: '150px', right: '-20px', bottom: '-40px' }}></i>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <small className="text-muted">Bekleyen Ödev</small>
                                    <h3 className="mb-0">{data?.summary.pending_homework_count ?? 0}</h3>
                                </div>
                                <i className="ti ti-clock-hour-4 text-warning fs-1"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <small className="text-muted">Tamamlanan Ödev</small>
                                    <h3 className="mb-0">{data?.summary.completed_homework_count ?? 0}</h3>
                                </div>
                                <i className="ti ti-checks text-success fs-1"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Günün Dersleri */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-transparent py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold text-primary"><i className="ti ti-calendar-event me-2"></i>Günün Dersleri</h5>
                            <Link to="/portal/schedule" className="btn btn-sm btn-soft-primary rounded-pill">Haftalık</Link>
                        </div>
                        <div className="card-body">
                            {data?.today_schedule?.length ? (
                                <div className="table-responsive">
                                    <table className="table table-borderless align-middle mb-0">
                                        <tbody>
                                            {data.today_schedule.map((lesson, idx) => (
                                                <tr key={lesson.id} className="border-bottom border-light">
                                                    <td className="ps-0 py-3" style={{ width: '80px' }}>
                                                        <span className="badge bg-soft-primary text-primary border-0 fw-bold">
                                                            {idx + 1}. Ders
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold fs-14 text-dark mb-0">{lesson.lesson?.name || '-'}</div>
                                                        <div className="text-muted small">
                                                            <i className="ti ti-clock me-1"></i>
                                                            {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                                                        </div>
                                                    </td>
                                                    <td className="ps-0 text-muted small">
                                                        <div className="fw-medium text-secondary">{lesson.teacher?.name || '-'}</div>
                                                    </td>
                                                </tr>
                                            ))}


                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-5">
                                    <div className="bg-light rounded-circle d-inline-flex p-3 mb-3">
                                        <i className="ti ti-calendar-off text-muted fs-2"></i>
                                    </div>
                                    <p className="text-muted mb-0">Bugün için ders bulunmuyor.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Yaklaşan Ödevler */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-transparent py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold text-warning"><i className="ti ti-notebook me-2"></i>Yaklaşan Ödevler</h5>
                            <Link to="/portal/homework" className="btn btn-sm btn-soft-warning rounded-pill">Tümü</Link>
                        </div>
                        <div className="card-body">
                            {data?.upcoming_homeworks.length ? (
                                <ul className="list-group list-group-flush">
                                    {data.upcoming_homeworks.map((h) => (
                                        <li className="list-group-item px-0 border-0 mb-3" key={h.id}>
                                            <div className="d-flex align-items-center">
                                                <div className="bg-light-warning rounded p-2 me-3">
                                                    <i className="ti ti-book-2 text-warning fs-4"></i>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-0 fw-bold">{h.title}</h6>
                                                    <div className="d-flex justify-content-between align-items-center mt-1">
                                                        <small className="text-muted">{h.lesson?.name || '-'}</small>
                                                        <small className="badge bg-soft-danger text-danger border-0 fw-medium">
                                                            {new Date(h.due_date).toLocaleDateString('tr-TR')}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-5">
                                    <div className="bg-light rounded-circle d-inline-flex p-3 mb-3">
                                        <i className="ti ti-notes-off text-muted fs-2"></i>
                                    </div>
                                    <p className="text-muted mb-0">Yaklaşan ödev bulunmuyor.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Günün Menüsü */}
                <div className="col-lg-4">
                    <TodayMealMenuCard
                        menus={data?.today_menus && data.today_menus.length > 0
                            ? data.today_menus
                            : data?.today_menu
                                ? [data.today_menu as TodayMealMenu]
                                : undefined}
                        portalMode
                        className="h-100"
                    />
                </div>
            </div>

            <style>{`
                .bg-light-warning { background-color: rgba(255, 193, 7, 0.1); }
            `}</style>
        </div>
    );
};

export default StudentDashboard;
