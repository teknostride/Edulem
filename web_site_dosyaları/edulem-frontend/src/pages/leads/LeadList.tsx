import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import LeadForm from './LeadForm';

interface Lead {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    source: string | null;
    notes: string | null;
    assigned_user: {
        id: number;
        name: string;
    } | null;
    created_at: string;
}

interface Statistics {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    lost: number;
}

const LeadList: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | undefined>();

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/leads', {
                params: {
                    search: searchTerm,
                    status: statusFilter,
                }
            });
            setLeads(response.data.data.leads);
            setStats(response.data.data.statistics);
        } catch (error) {
            showToast('error', 'Aday öğrenci listesi yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [searchTerm, statusFilter]);

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu aday kaydını silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/leads/${id}`);
            showToast('success', 'Kayıt başarıyla silindi');
            fetchLeads();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new': return <span className="badge bg-info">Yeni Başvuru</span>;
            case 'contacted': return <span className="badge bg-primary">İletişime Geçildi</span>;
            case 'qualified': return <span className="badge bg-warning">Olumlu / Potansiyel</span>;
            case 'converted': return <span className="badge bg-success">Kayıt Yapıldı</span>;
            case 'lost': return <span className="badge bg-danger">Kayıt Alınamadı</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">Aday Öğrenci & CRM</h4>
                        <button className="btn btn-primary" onClick={() => { setSelectedLead(undefined); setShowForm(true); }}>
                            <i className="ti ti-plus me-1"></i> Yeni Aday Kaydı
                        </button>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="row mt-3">
                    <div className="col-md-2">
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="text-muted mb-2">Toplam</h6>
                                <h4 className="mb-0">{stats.total}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card text-center border-info">
                            <div className="card-body">
                                <h6 className="text-info mb-2">Yeni</h6>
                                <h4 className="mb-0">{stats.new}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card text-center border-primary">
                            <div className="card-body">
                                <h6 className="text-primary mb-2">İletişimde</h6>
                                <h4 className="mb-0">{stats.contacted}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card text-center border-warning">
                            <div className="card-body">
                                <h6 className="text-warning mb-2">Potansiyel</h6>
                                <h4 className="mb-0">{stats.qualified}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card text-center border-success">
                            <div className="card-body">
                                <h6 className="text-success mb-2">Kayıt</h6>
                                <h4 className="mb-0">{stats.converted}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card text-center border-danger">
                            <div className="card-body">
                                <h6 className="text-danger mb-2">Olumsuz</h6>
                                <h4 className="mb-0">{stats.lost}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card mt-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Aday Listesi</h5>
                    <div className="d-flex gap-2">
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '150px' }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Tüm Durumlar</option>
                            <option value="new">Yeni</option>
                            <option value="contacted">İletişimde</option>
                            <option value="qualified">Potansiyel</option>
                            <option value="converted">Kayıt</option>
                            <option value="lost">Olumsuz</option>
                        </select>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="İsim, telefon veya e-posta ara..."
                            style={{ width: '250px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover table-centered mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Aday Adı</th>
                                    <th>İletişim</th>
                                    <th>Durum</th>
                                    <th>Kaynak</th>
                                    <th>Atanan Personel</th>
                                    <th>Kayıt Tarihi</th>
                                    <th className="text-end">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center">Yükleniyor...</td></tr>
                                ) : leads.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center">Aday kaydı bulunamadı.</td></tr>
                                ) : leads.map(lead => (
                                    <tr key={lead.id}>
                                        <td><strong>{lead.name}</strong></td>
                                        <td>
                                            <div>{lead.phone}</div>
                                            <small className="text-muted">{lead.email}</small>
                                        </td>
                                        <td>{getStatusBadge(lead.status)}</td>
                                        <td>{lead.source || '-'}</td>
                                        <td>{lead.assigned_user?.name || '-'}</td>
                                        <td>{new Date(lead.created_at).toLocaleDateString('tr-TR')}</td>
                                        <td className="text-end">
                                            <button
                                                className="btn btn-sm btn-soft-primary me-1"
                                                onClick={() => { setSelectedLead(lead); setShowForm(true); }}
                                            >
                                                <i className="ti ti-edit"></i>
                                            </button>
                                            <button
                                                className="btn btn-sm btn-soft-danger"
                                                onClick={() => handleDelete(lead.id)}
                                            >
                                                <i className="ti ti-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <LeadForm
                    lead={selectedLead}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchLeads(); }}
                />
            )}
        </div>
    );
};

export default LeadList;
