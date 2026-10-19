import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Appointment {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    appointment_date: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
    assigned_user?: {
        first_name: string;
        last_name: string;
    };
    lead?: {
        first_name: string;
        last_name: string;
    };
}

const AppointmentList = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [filters, setFilters] = useState({
        status: '',
        date_from: new Date().toISOString().split('T')[0],
        date_to: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        search: ''
    });

    useEffect(() => {
        fetchAppointments();
    }, [filters]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams(Object.entries(filters).filter(([_, v]) => v !== ''));
            const res = await axiosClient.get(`/appointments?${params}`);
            setAppointments(res.data.data.appointments);
            setStats(res.data.data.statistics);
        } catch (error) {
            showToast('error', 'Randevular yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'scheduled': return <span className="badge bg-soft-primary text-primary">Planlandı</span>;
            case 'completed': return <span className="badge bg-soft-success text-success">Tamamlandı</span>;
            case 'cancelled': return <span className="badge bg-soft-danger text-danger">İptal Edildi</span>;
            case 'no_show': return <span className="badge bg-soft-warning text-warning">Gelinmedi</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Randevu Sistemi</h4>
                    <p className="text-muted mb-0">Aday veli görüşmeleri ve diğer kurumsal randevuları takip edin.</p>
                </div>
                <Link to="/operations/appointments/create" className="btn btn-primary">
                    <i className="ti ti-plus me-1"></i> Yeni Randevu Ekle
                </Link>
            </div>

            {stats && (
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <h6 className="text-muted small text-uppercase">Toplam</h6>
                                <h3 className="mb-0">{stats.total}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm border-start border-primary border-4">
                            <div className="card-body">
                                <h6 className="text-muted small text-uppercase">Bekleyen</h6>
                                <h3 className="mb-0 text-primary">{stats.scheduled}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm border-start border-success border-4">
                            <div className="card-body">
                                <h6 className="text-muted small text-uppercase">Tamamlanan</h6>
                                <h3 className="mb-0 text-success">{stats.completed}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm border-start border-danger border-4">
                            <div className="card-body">
                                <h6 className="text-muted small text-uppercase">İptal/Gelinmedi</h6>
                                <h3 className="mb-0 text-danger">{stats.cancelled + stats.no_show}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="İsim, telefon veya e-posta ile ara..."
                                value={filters.search}
                                onChange={e => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                value={filters.status}
                                onChange={e => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">Tüm Durumlar</option>
                                <option value="scheduled">Planlandı</option>
                                <option value="completed">Tamamlandı</option>
                                <option value="cancelled">İptal Edildi</option>
                                <option value="no_show">Gelinmedi</option>
                            </select>
                        </div>
                        <div className="col-md-5 d-flex gap-2">
                            <input
                                type="date"
                                className="form-control"
                                value={filters.date_from}
                                onChange={e => setFilters({ ...filters, date_from: e.target.value })}
                            />
                            <span className="align-self-center">-</span>
                            <input
                                type="date"
                                className="form-control"
                                value={filters.date_to}
                                onChange={e => setFilters({ ...filters, date_to: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-3">Görüşmeci / Konu</th>
                                    <th>Tarih & Saat</th>
                                    <th>Durum</th>
                                    <th>Atanan Personel</th>
                                    <th>İletişim</th>
                                    <th className="text-end pe-3">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : appointments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted">Belirtilen kriterlerde randevu bulunamadı.</td>
                                    </tr>
                                ) : (
                                    appointments.map(item => (
                                        <tr key={item.id}>
                                            <td className="ps-3">
                                                <div className="fw-medium text-dark">{item.name}</div>
                                                {item.lead && <small className="text-muted">Aday Kayıt: {item.lead.first_name} {item.lead.last_name}</small>}
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span>{new Date(item.appointment_date).toLocaleDateString('tr-TR')}</span>
                                                    <small className="text-muted">{new Date(item.appointment_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</small>
                                                </div>
                                            </td>
                                            <td>{getStatusBadge(item.status)}</td>
                                            <td>
                                                {item.assigned_user ?
                                                    `${item.assigned_user.first_name} ${item.assigned_user.last_name}` :
                                                    <span className="text-muted italic">Atanmamış</span>
                                                }
                                            </td>
                                            <td>
                                                <div className="small">
                                                    <div><i className="ti ti-phone me-1"></i>{item.phone || '-'}</div>
                                                    <div className="text-muted"><i className="ti ti-mail me-1"></i>{item.email || '-'}</div>
                                                </div>
                                            </td>
                                            <td className="text-end pe-3">
                                                <div className="btn-group">
                                                    <Link to={`/operations/appointments/${item.id}/edit`} className="btn btn-sm btn-outline-primary" title="Düzenle">
                                                        <i className="ti ti-edit"></i>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style>{`
                .bg-soft-primary { background-color: rgba(59, 108, 255, 0.1); }
                .bg-soft-success { background-color: rgba(25, 135, 84, 0.1); }
                .bg-soft-danger { background-color: rgba(220, 53, 69, 0.1); }
                .bg-soft-warning { background-color: rgba(255, 193, 7, 0.1); }
            `}</style>
        </div>
    );
};

export default AppointmentList;
