import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { Link, useParams } from 'react-router-dom';

interface SessionStat {
    id: string;
    time: string;
    capacity: number;
    total: number;
    approved: number;
}

interface Statistics {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    attended: number;
    absent: number;
    sessions: SessionStat[];
}

const ScholarshipExamStatistics: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        if (!examId) return;
        try {
            setLoading(true);
            const res = await axiosClient.get(`/scholarship-exams/${examId}/statistics`);
            const d = res.data?.data ?? res.data;
            setStats(d);
        } catch (e) {
            setStats(null);
            showToast('error', 'İstatistikler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [examId]);

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">Bursluluk Sınavı İstatistikleri</h4>
                        <Link to={`/scholarship/exams/${examId}/applications`} className="btn btn-soft-secondary">
                            <i className="ti ti-arrow-left me-1"></i> Başvurulara Dön
                        </Link>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted">Yükleniyor...</div>
                </div>
            ) : !stats ? (
                <div className="alert alert-warning">İstatistik bulunamadı.</div>
            ) : (
                <>
                    <div className="row g-3 mt-1">
                        <div className="col-md-2 col-6">
                            <div className="card">
                                <div className="card-body text-center">
                                    <div className="text-muted">Toplam</div>
                                    <div className="fs-2 fw-bold">{stats.total}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2 col-6">
                            <div className="card">
                                <div className="card-body text-center">
                                    <div className="text-muted">Beklemede</div>
                                    <div className="fs-2 fw-bold">{stats.pending}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2 col-6">
                            <div className="card">
                                <div className="card-body text-center">
                                    <div className="text-muted">Onaylı</div>
                                    <div className="fs-2 fw-bold">{stats.approved}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2 col-6">
                            <div className="card">
                                <div className="card-body text-center">
                                    <div className="text-muted">Reddedildi</div>
                                    <div className="fs-2 fw-bold">{stats.rejected}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2 col-6">
                            <div className="card">
                                <div className="card-body text-center">
                                    <div className="text-muted">Katıldı</div>
                                    <div className="fs-2 fw-bold">{stats.attended}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2 col-6">
                            <div className="card">
                                <div className="card-body text-center">
                                    <div className="text-muted">Gelmedi</div>
                                    <div className="fs-2 fw-bold">{stats.absent}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card mt-3">
                        <div className="card-header">
                            <h5 className="card-title mb-0">Seans Bazlı</h5>
                        </div>
                        <div className="card-body">
                            {stats.sessions?.length ? (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead>
                                            <tr>
                                                <th>Seans</th>
                                                <th>Saat</th>
                                                <th>Kapasite</th>
                                                <th>Toplam</th>
                                                <th>Onaylı</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.sessions.map((s) => (
                                                <tr key={s.id}>
                                                    <td>{s.id}</td>
                                                    <td>{s.time}</td>
                                                    <td>{s.capacity}</td>
                                                    <td>{s.total}</td>
                                                    <td>{s.approved}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-muted">Seans istatistiği bulunamadı.</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ScholarshipExamStatistics;
