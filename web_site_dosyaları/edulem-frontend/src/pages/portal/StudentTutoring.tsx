import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface TutoringSession {
    id: number;
    title: string;
    type: string;
    date: string;
    start_time: string;
    end_time: string;
    room: string;
    remote_link?: string;
    teacher: {
        name: string;
    };
    lesson: {
        name: string;
    };
    attendance_status?: string;
}

const StudentTutoring = () => {
    const [sessions, setSessions] = useState<TutoringSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            // Student portal endpoint for tutoring
            const res = await axiosClient.get('/portal/tutoring');
            setSessions(res.data.data.sessions || res.data.data);
        } catch (error) {
            showToast('error', 'Etütleriniz yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">Etüt ve Özel Derslerim</h4>
                <p className="text-muted">Size tanımlanan veya başvurduğunuz tüm ek çalışma programları.</p>
            </div>

            <div className="row">
                {loading ? (
                    <div className="col-12 text-center py-5">
                        <div className="spinner-border text-primary"></div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="col-12 text-center py-5">
                        <div className="card border-0 shadow-sm p-4">
                            <i className="ti ti-calendar-off fs-1 text-muted mb-3"></i>
                            <h5>Henüz planlanmış bir etütünüz yok.</h5>
                            <p className="text-muted">Yeni bir program eklendiğinde burada görünecektir.</p>
                        </div>
                    </div>
                ) : sessions.map(session => (
                    <div className="col-md-6 col-lg-4 mb-4" key={session.id}>
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <span className={`badge ${session.type === 'private_lesson' ? 'bg-soft-danger text-danger' : 'bg-soft-primary text-primary'}`}>
                                        {session.type === 'private_lesson' ? 'Özel Ders' : 'Grup Etüt'}
                                    </span>
                                    <span className="text-muted small">
                                        <i className="ti ti-clock me-1"></i>
                                        {session.start_time.substring(11, 16)}
                                    </span>
                                </div>
                                <h5 className="card-title fw-bold mb-1">{session.title}</h5>
                                <p className="text-muted mb-3">{session.lesson.name} - {session.teacher.name}</p>

                                <div className="d-flex flex-column gap-2 mb-3">
                                    <div className="d-flex align-items-center text-muted small">
                                        <i className="ti ti-calendar me-2"></i>
                                        {new Date(session.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                    <div className="d-flex align-items-center text-muted small">
                                        <i className="ti ti-map-pin me-2"></i>
                                        {session.room || 'Sınıf Belirtilmedi'}
                                    </div>
                                </div>

                                {session.remote_link && (
                                    <a
                                        href={session.remote_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline-info w-100 mb-2"
                                    >
                                        <i className="ti ti-video me-1"></i> Derse Katıl
                                    </a>
                                )}
                            </div>
                            <div className="card-footer bg-transparent border-top p-3 text-center">
                                {session.attendance_status === 'present' ? (
                                    <span className="text-success small fw-medium">
                                        <i className="ti ti-check me-1"></i> Katıldınız
                                    </span>
                                ) : (
                                    <span className="text-muted small">
                                        {session.date < new Date().toISOString() ? 'Katılmadınız' : 'Bekleniyor'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                .bg-soft-primary { background-color: rgba(13, 110, 253, 0.1); }
                .bg-soft-danger { background-color: rgba(220, 53, 69, 0.1); }
            `}</style>
        </div>
    );
};

export default StudentTutoring;
