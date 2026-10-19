import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Activity {
    id: number;
    title: string;
    description: string;
    category: string;
    activity_date: string;
    activity_time: string;
    location: string;
    is_published: boolean;
    is_admin_approved: boolean;
    like_count: number;
    view_count: number;
    creator: {
        id: number;
        name: string;
    };
    classroom?: {
        id: number;
        name: string;
    };
    participants_count?: number;
}

const ActivityList = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [filter, setFilter] = useState({
        category: '',
        date_from: '',
        date_to: ''
    });

    useEffect(() => {
        fetchActivities();
        fetchStats();
    }, [filter]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/activities', { params: filter });
            setActivities(response.data.data.activities);
        } catch (error) {
            showToast('error', 'Etkinlikler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axiosClient.get('/activities/statistics');
            setStats(response.data.data);
        } catch (error) {
            console.error('İstatistikler yüklenemedi');
        }
    };

    const handleLike = async (id: number) => {
        try {
            await axiosClient.post(`/activities/${id}/like`);
            setActivities(prev => prev.map(activity =>
                activity.id === id ? { ...activity, like_count: activity.like_count + 1 } : activity
            ));
        } catch (error) {
            showToast('error', 'Beğeni işlemi başarısız');
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu etkinliği silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/activities/${id}`);
            showToast('success', 'Etkinlik başarıyla silindi');
            fetchActivities();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    return (
        <div className="container-fluid">
            <div className="page-title-head d-flex align-items-center justify-content-between mb-4">
                <div className="flex-grow-1">
                    <h4 className="page-main-title m-0">Etkinlik Akışı</h4>
                    <small className="text-muted">Okul içi sosyal etkinlikler ve paylaşımlar</small>
                </div>
                <Link to="/communication/activities/create" className="btn btn-primary d-flex align-items-center">
                    <i className="ti ti-plus me-1"></i>
                    Yeni Etkinlik Paylaş
                </Link>
            </div>

            {/* İstatistik Kartları */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 bg-soft-primary h-100">
                        <div className="card-body py-3">
                            <div className="d-flex align-items-center">
                                <div className="avatar-md bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                                    <i className="ti ti-activity fs-1"></i>
                                </div>
                                <div>
                                    <h6 className="text-muted mb-1 small text-uppercase fw-bold">Toplam Etkinlik</h6>
                                    <h3 className="mb-0">{stats?.total_activities || 0}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 bg-soft-success h-100">
                        <div className="card-body py-3">
                            <div className="d-flex align-items-center">
                                <div className="avatar-md bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                                    <i className="ti ti-eye fs-1"></i>
                                </div>
                                <div>
                                    <h6 className="text-muted mb-1 small text-uppercase fw-bold">Görüntülenme</h6>
                                    <h3 className="mb-0">{stats?.total_views || 0}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 bg-soft-danger h-100">
                        <div className="card-body py-3">
                            <div className="d-flex align-items-center">
                                <div className="avatar-md bg-danger text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                                    <i className="ti ti-heart fs-1"></i>
                                </div>
                                <div>
                                    <h6 className="text-muted mb-1 small text-uppercase fw-bold">Toplam Etkileşim</h6>
                                    <h3 className="mb-0">{stats?.total_likes || 0}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-md-9">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : (
                        <div className="activity-feed">
                            {activities.length === 0 ? (
                                <div className="card border-0 shadow-sm p-5 text-center">
                                    <i className="ti ti-news display-1 text-muted mb-3"></i>
                                    <h5>Henüz bir etkinlik paylaşılmamış</h5>
                                </div>
                            ) : (
                                activities.map(activity => (
                                    <div key={activity.id} className="card border-0 shadow-sm mb-4 overflow-hidden">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between mb-3">
                                                <div className="d-flex align-items-center">
                                                    <div className="avatar bg-soft-info text-info rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
                                                        <i className="ti ti-user fs-4"></i>
                                                    </div>
                                                    <div>
                                                        <h6 className="mb-0">{activity.creator.name}</h6>
                                                        <small className="text-muted">
                                                            {new Date(activity.activity_date).toLocaleDateString('tr-TR')} {activity.activity_time} • {activity.category}
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="dropdown">
                                                    <button className="btn btn-link link-muted p-0" data-bs-toggle="dropdown">
                                                        <i className="ti ti-dots-vertical fs-4"></i>
                                                    </button>
                                                    <ul className="dropdown-menu dropdown-menu-end">
                                                        <li>
                                                            <Link to={`/communication/activities/${activity.id}/edit`} className="dropdown-item">
                                                                <i className="ti ti-edit me-1 text-info"></i> Düzenle
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <button className="dropdown-item text-danger" onClick={() => handleDelete(activity.id)}>
                                                                <i className="ti ti-trash me-1"></i> Sil
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>

                                            <h5 className="card-title fw-bold mb-2">{activity.title}</h5>
                                            <p className="card-text text-muted mb-3">{activity.description}</p>

                                            {activity.location && (
                                                <div className="mb-3">
                                                    <span className="badge bg-light text-dark fw-normal border">
                                                        <i className="ti ti-map-pin me-1 text-primary"></i>
                                                        {activity.location}
                                                    </span>
                                                    {activity.classroom && (
                                                        <span className="badge bg-light text-dark fw-normal border ms-2">
                                                            <i className="ti ti-school me-1 text-primary"></i>
                                                            {activity.classroom.name}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="border-top pt-3 d-flex align-items-center justify-content-between">
                                                <div className="d-flex gap-4">
                                                    <button
                                                        className="btn btn-link link-danger p-0 d-flex align-items-center text-decoration-none"
                                                        onClick={() => handleLike(activity.id)}
                                                    >
                                                        <i className="ti ti-heart-filled me-1 fs-4"></i>
                                                        <span className="fw-bold">{activity.like_count}</span>
                                                    </button>
                                                    <div className="d-flex align-items-center text-muted">
                                                        <i className="ti ti-eye me-1 fs-4"></i>
                                                        <span>{activity.view_count}</span>
                                                    </div>
                                                    <div className="d-flex align-items-center text-muted">
                                                        <i className="ti ti-users me-1 fs-4"></i>
                                                        <span>{activity.participants_count || 0} Katılımcı</span>
                                                    </div>
                                                </div>
                                                {!activity.is_admin_approved && (
                                                    <span className="badge bg-soft-warning text-warning border-warning">İdare Onayı Bekliyor</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="col-md-3">
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-transparent py-3">
                            <h6 className="mb-0 fw-bold">Hızlı Filtre</h6>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Kategori</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={filter.category}
                                    onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                                >
                                    <option value="">Tümü</option>
                                    <option value="Social">Sosyal</option>
                                    <option value="Academic">Akademik</option>
                                    <option value="Sport">Spor</option>
                                    <option value="Art">Sanat</option>
                                    <option value="Science">Bilim</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={filter.date_from}
                                    onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={filter.date_to}
                                    onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
                                />
                            </div>
                            <button
                                className="btn btn-outline-secondary btn-sm w-100 mt-2"
                                onClick={() => setFilter({ category: '', date_from: '', date_to: '' })}
                            >
                                Filtreleri Temizle
                            </button>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm bg-primary text-white">
                        <div className="card-body py-4 text-center">
                            <i className="ti ti-star-filled display-4 mb-3"></i>
                            <h6 className="fw-bold mb-2">Popüler Etkinlikler</h6>
                            <p className="small mb-0 opacity-75">En çok etkileşim alan etkinlikleri keşfedin.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityList;
