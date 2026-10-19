import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Stats {
    total_students: number;
    active_students: number;
    completed_students: number;
    total_sessions: number;
    completed_sessions: number;
    scheduled_sessions: number;
    cancelled_sessions: number;
    this_month_sessions: number;
    counselors: number;
}

const CounselingReport = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/counseling/statistics');
            setStats(response.data.data);
        } catch (error) {
            console.error('İstatistikler yüklenemedi:', error);
            showToast('error', 'İstatistikler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="page-title-head d-flex align-items-center mb-4">
                <div className="flex-grow-1">
                    <h4 className="page-main-title m-0">Rehberlik Raporları</h4>
                    <small className="text-muted d-block mt-1">Sistem genelindeki rehberlik verilerinin özeti</small>
                </div>
            </div>

            <div className="row g-4">
                {/* Danışan İstatistikleri */}
                <div className="col-md-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm overflow-hidden">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="avatar-md bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center me-3">
                                    <i className="ti ti-users fs-1"></i>
                                </div>
                                <div>
                                    <h6 className="text-muted text-uppercase fw-semibold mb-1">Toplam Danışan</h6>
                                    <h3 className="mb-0">{stats?.total_students || 0}</h3>
                                </div>
                            </div>
                            <div className="progress progress-sm" style={{ height: '5px' }}>
                                <div className="progress-bar bg-primary" role="progressbar" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm overflow-hidden">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="avatar-md bg-soft-success text-success rounded-circle d-flex align-items-center justify-content-center me-3">
                                    <i className="ti ti-user-check fs-1"></i>
                                </div>
                                <div>
                                    <h6 className="text-muted text-uppercase fw-semibold mb-1">Aktif Danışan</h6>
                                    <h3 className="mb-0">{stats?.active_students || 0}</h3>
                                </div>
                            </div>
                            <div className="progress progress-sm" style={{ height: '5px' }}>
                                <div className="progress-bar bg-success" role="progressbar" style={{ width: `${(stats?.active_students || 0) / (stats?.total_students || 1) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm overflow-hidden">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="avatar-md bg-soft-info text-info rounded-circle d-flex align-items-center justify-content-center me-3">
                                    <i className="ti ti-calendar-event fs-1"></i>
                                </div>
                                <div>
                                    <h6 className="text-muted text-uppercase fw-semibold mb-1">Toplam Görüşme</h6>
                                    <h3 className="mb-0">{stats?.total_sessions || 0}</h3>
                                </div>
                            </div>
                            <div className="progress progress-sm" style={{ height: '5px' }}>
                                <div className="progress-bar bg-info" role="progressbar" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="card h-100 border-0 shadow-sm overflow-hidden">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div className="avatar-md bg-soft-warning text-warning rounded-circle d-flex align-items-center justify-content-center me-3">
                                    <i className="ti ti-calendar-time fs-1"></i>
                                </div>
                                <div>
                                    <h6 className="text-muted text-uppercase fw-semibold mb-1">Bu Ayki Görüşmeler</h6>
                                    <h3 className="mb-0">{stats?.this_month_sessions || 0}</h3>
                                </div>
                            </div>
                            <div className="progress progress-sm" style={{ height: '5px' }}>
                                <div className="progress-bar bg-warning" role="progressbar" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-transparent border-0 d-flex align-items-center justify-content-between p-3">
                            <h5 className="mb-0">Görüşme Dağılımı</h5>
                        </div>
                        <div className="card-body">
                            <div className="row text-center mb-4">
                                <div className="col-4">
                                    <h4 className="fw-bold">{stats?.completed_sessions || 0}</h4>
                                    <p className="text-muted mb-0">Tamamlanan</p>
                                </div>
                                <div className="col-4 border-start">
                                    <h4 className="fw-bold">{stats?.scheduled_sessions || 0}</h4>
                                    <p className="text-muted mb-0">Bekleyen</p>
                                </div>
                                <div className="col-4 border-start">
                                    <h4 className="fw-bold">{stats?.cancelled_sessions || 0}</h4>
                                    <p className="text-muted mb-0">İptal Edilen</p>
                                </div>
                            </div>

                            {/* Buraya grafik gelebilir, şimdilik görsel bir bar kullanalım */}
                            <div className="mt-4">
                                <p className="text-muted mb-2 d-flex justify-content-between">
                                    <span>Tamamlanma Oranı</span>
                                    <span>{Math.round(((stats?.completed_sessions || 0) / (stats?.total_sessions || 1)) * 100)}%</span>
                                </p>
                                <div className="progress" style={{ height: '10px' }}>
                                    <div
                                        className="progress-bar bg-primary"
                                        role="progressbar"
                                        style={{ width: `${((stats?.completed_sessions || 0) / (stats?.total_sessions || 1)) * 100}%` }}
                                    ></div>
                                    <div
                                        className="progress-bar bg-warning"
                                        role="progressbar"
                                        style={{ width: `${((stats?.scheduled_sessions || 0) / (stats?.total_sessions || 1)) * 100}%` }}
                                    ></div>
                                    <div
                                        className="progress-bar bg-danger"
                                        role="progressbar"
                                        style={{ width: `${((stats?.cancelled_sessions || 0) / (stats?.total_sessions || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="mt-3 d-flex gap-3 justify-content-center">
                                    <small className="d-flex align-items-center">
                                        <span className="badge bg-primary p-1 me-1"> </span> Tamamlanan
                                    </small>
                                    <small className="d-flex align-items-center">
                                        <span className="badge bg-warning p-1 me-1"> </span> Bekleyen
                                    </small>
                                    <small className="d-flex align-items-center">
                                        <span className="badge bg-danger p-1 me-1"> </span> İptal
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-transparent border-0 p-3">
                            <h5 className="mb-0">Genel Bilgiler</h5>
                        </div>
                        <div className="card-body">
                            <ul className="list-group list-group-flush mt-n3">
                                <li className="list-group-item d-flex justify-content-between align-items-center border-0 px-0">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center me-2">
                                            <i className="ti ti-user-star"></i>
                                        </div>
                                        <span>Danışman Sayısı</span>
                                    </div>
                                    <span className="fw-bold">{stats?.counselors || 0}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center border-0 px-0">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs bg-soft-success text-success rounded-circle d-flex align-items-center justify-content-center me-2">
                                            <i className="ti ti-check"></i>
                                        </div>
                                        <span>Bitirilmiş Takipler</span>
                                    </div>
                                    <span className="fw-bold">{stats?.completed_students || 0}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center border-0 px-0">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs bg-soft-danger text-danger rounded-circle d-flex align-items-center justify-content-center me-2">
                                            <i className="ti ti-alert-circle"></i>
                                        </div>
                                        <span>Pasif Danışanlar</span>
                                    </div>
                                    <span className="fw-bold">{(stats?.total_students || 0) - (stats?.active_students || 0) - (stats?.completed_students || 0)}</span>
                                </li>
                            </ul>

                            <div className="text-center mt-4">
                                <button className="btn btn-primary w-100" onClick={() => window.print()}>
                                    <i className="ti ti-printer me-1"></i>
                                    Raporu Yazdır
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CounselingReport;
