import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import StaffAssignmentForm from './StaffAssignmentForm';

interface StaffAssignment {
    id: number;
    title: string;
    description: string;
    assigned_to_user: { id: number; name: string };
    assigned_by_user: { id: number; name: string };
    due_date: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    progress_percentage: number;
}

interface Statistics {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
}

const StaffAssignmentList: React.FC = () => {
    const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<StaffAssignment | undefined>(undefined);
    const [mobileOpenAssignmentId, setMobileOpenAssignmentId] = useState<number | null>(null);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/staff-assignments');
            setAssignments(response.data.data.assignments);
            setStats(response.data.data.statistics);
        } catch (error) {
            showToast('error', 'Görev listesi yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu görevi silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/staff-assignments/${id}`);
            showToast('success', 'Görev silindi');
            fetchAssignments();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await axiosClient.patch(`/staff-assignments/${id}/status`, { status });
            showToast('success', 'Görev durumu güncellendi');
            fetchAssignments();
        } catch (error) {
            showToast('error', 'Durum güncellenemedi');
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent': return <span className="badge bg-danger">Acil</span>;
            case 'high': return <span className="badge bg-warning">Yüksek</span>;
            case 'medium': return <span className="badge bg-info">Orta</span>;
            case 'low': return <span className="badge bg-secondary">Düşük</span>;
            default: return <span className="badge bg-light text-dark">{priority}</span>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="badge bg-soft-warning text-warning">Beklemede</span>;
            case 'in_progress': return <span className="badge bg-soft-info text-info">Devam Ediyor</span>;
            case 'completed': return <span className="badge bg-soft-success text-success">Tamamlandı</span>;
            case 'cancelled': return <span className="badge bg-soft-danger text-danger">İptal Edildi</span>;
            default: return <span className="badge bg-soft-dark text-dark">{status}</span>;
        }
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">Personel Görev & İş Takibi</h4>
                        <button className="btn btn-primary" onClick={() => { setSelectedAssignment(undefined); setShowForm(true); }}>
                            <i className="ti ti-plus me-1"></i> Yeni Görev Ata
                        </button>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="row mt-3">
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h4 className="mb-1">{stats.total}</h4>
                                <p className="text-muted mb-0">Toplam Görev</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center text-warning">
                            <div className="card-body border-warning border-bottom border-3">
                                <h4 className="mb-1 text-warning">{stats.pending}</h4>
                                <p className="text-muted mb-0">Bekleyen</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center text-success">
                            <div className="card-body border-success border-bottom border-3">
                                <h4 className="mb-1 text-success">{stats.completed}</h4>
                                <p className="text-muted mb-0">Tamamlanan</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center text-danger">
                            <div className="card-body border-danger border-bottom border-3">
                                <h4 className="mb-1 text-danger">{stats.overdue}</h4>
                                <p className="text-muted mb-0">Geciken</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card mt-3">
                <div className="card-body">
                    <div className="d-md-none mobile-card-list">
                        {loading ? (
                            <div className="text-center py-4">Yükleniyor...</div>
                        ) : assignments.length === 0 ? (
                            <div className="text-center py-4">Hiç görev bulunamadı.</div>
                        ) : (
                            <div className="d-flex flex-column gap-2">
                                {assignments.map((a) => {
                                    const open = mobileOpenAssignmentId === a.id;
                                    const dueText = a.due_date ? new Date(a.due_date).toLocaleDateString('tr-TR') : '—';
                                    return (
                                        <div key={a.id} className="card border">
                                            <button
                                                type="button"
                                                className="card-body w-100 text-start p-3 border-0 bg-transparent"
                                                onClick={() => setMobileOpenAssignmentId((prev) => (prev === a.id ? null : a.id))}
                                                aria-expanded={open}
                                            >
                                                <div className="d-flex align-items-start justify-content-between gap-2">
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className="mobile-card-list__header">
                                                            <div className="fw-semibold text-dark text-truncate">
                                                                {a.title}
                                                            </div>
                                                            <div className="mobile-card-list__role">
                                                                {getStatusBadge(a.status)}
                                                            </div>
                                                        </div>

                                                        <div className="mobile-card-list__sub small text-muted mt-1">
                                                            <span>{a.assigned_to_user?.name || '—'}</span>
                                                            <span className="mx-1">•</span>
                                                            <span>Son Tarih: {dueText}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-muted" style={{ flex: '0 0 auto' }}>
                                                        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}></i>
                                                    </div>
                                                </div>
                                            </button>

                                            {open && (
                                                <div className="card-body border-top p-3">
                                                    <div className="row g-2">
                                                        <div className="col-12">
                                                            <div className="small text-muted">Açıklama</div>
                                                            <div className="small">{a.description || '—'}</div>
                                                        </div>

                                                        <div className="col-12">
                                                            <div className="small text-muted">Öncelik</div>
                                                            <div>{getPriorityBadge(a.priority)}</div>
                                                        </div>

                                                        <div className="col-12">
                                                            <div className="small text-muted">İlerleme</div>
                                                            <div className="progress progress-sm">
                                                                <div
                                                                    className={`progress-bar ${a.progress_percentage === 100 ? 'bg-success' : 'bg-primary'}`}
                                                                    style={{ width: `${a.progress_percentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="small text-muted mt-1">{a.progress_percentage}%</div>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex gap-2 mt-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-info"
                                                            onClick={() => handleUpdateStatus(a.id, 'in_progress')}
                                                        >
                                                            Devam Ediyor
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-success"
                                                            onClick={() => handleUpdateStatus(a.id, 'completed')}
                                                        >
                                                            Tamamla
                                                        </button>
                                                    </div>

                                                    <div className="d-flex gap-2 mt-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-primary"
                                                            onClick={() => { setSelectedAssignment(a); setShowForm(true); }}
                                                        >
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            onClick={() => handleDelete(a.id)}
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="table-responsive d-none d-md-block">
                        <table className="table table-hover table-centered mb-0 text-nowrap">
                            <thead className="table-light">
                                <tr>
                                    <th>Görev / Konu</th>
                                    <th>Atanan Personel</th>
                                    <th>Son Tarih</th>
                                    <th>Öncelik</th>
                                    <th>İlerleme</th>
                                    <th>Durum</th>
                                    <th className="text-end">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-4">Yükleniyor...</td></tr>
                                ) : assignments.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-4">Hiç görev bulunamadı.</td></tr>
                                ) : assignments.map(a => (
                                    <tr key={a.id}>
                                        <td style={{ minWidth: '250px' }}>
                                            <h6 className="mb-1">{a.title}</h6>
                                            <small className="text-muted text-truncate d-block" style={{ maxWidth: '200px' }}>{a.description}</small>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div className="avatar-xs me-2">
                                                    <div className="avatar-title bg-soft-primary text-primary rounded-circle">
                                                        {a.assigned_to_user.name.charAt(0)}
                                                    </div>
                                                </div>
                                                {a.assigned_to_user.name}
                                            </div>
                                        </td>
                                        <td>{new Date(a.due_date).toLocaleDateString('tr-TR')}</td>
                                        <td>{getPriorityBadge(a.priority)}</td>
                                        <td style={{ width: '150px' }}>
                                            <div className="progress progress-sm">
                                                <div
                                                    className={`progress-bar ${a.progress_percentage === 100 ? 'bg-success' : 'bg-primary'}`}
                                                    style={{ width: `${a.progress_percentage}%` }}
                                                ></div>
                                            </div>
                                            <small className="text-muted">{a.progress_percentage}%</small>
                                        </td>
                                        <td>{getStatusBadge(a.status)}</td>
                                        <td className="text-end">
                                            <div className="dropdown d-inline-block">
                                                <button className="btn btn-soft-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                                    İşlem
                                                </button>
                                                <ul className="dropdown-menu">
                                                    <li><button className="dropdown-item" onClick={() => handleUpdateStatus(a.id, 'in_progress')}>Devam Ediyor Yap</button></li>
                                                    <li><button className="dropdown-item" onClick={() => handleUpdateStatus(a.id, 'completed')}>Tamamla</button></li>
                                                    <li><hr className="dropdown-divider" /></li>
                                                    <li><button className="dropdown-item" onClick={() => { setSelectedAssignment(a); setShowForm(true); }}>Düzenle</button></li>
                                                    <li><button className="dropdown-item text-danger" onClick={() => handleDelete(a.id)}>Sil</button></li>
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <StaffAssignmentForm
                    assignment={selectedAssignment}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchAssignments(); }}
                />
            )}
        </div>
    );
};

export default StaffAssignmentList;
