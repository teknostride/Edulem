import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import ContractForm from './ContractForm';

interface Contract {
    id: number;
    contract_no: string;
    student: {
        id: number;
        name: string;
    };
    status: 'draft' | 'active' | 'expired' | 'cancelled';
    contract_date: string;
    file: {
        id: number;
        url: string;
        path: string;
    } | null;
}

interface Statistics {
    total: number;
    draft: number;
    active: number;
    expired: number;
    cancelled: number;
}

const ContractList: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | undefined>();

    const fetchContracts = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/contracts');
            setContracts(response.data.data.contracts);
            setStats(response.data.data.statistics);
        } catch (error) {
            showToast('error', 'Sözleşme listesi yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContracts();
    }, []);

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu sözleşmeyi silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/contracts/${id}`);
            showToast('success', 'Sözleşme silindi');
            fetchContracts();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    const handleGeneratePdf = async (id: number) => {
        try {
            showToast('info', 'PDF oluşturuluyor, lütfen bekleyin...');
            await axiosClient.post('/contracts/generate-pdf', {
                contract_id: id,
                queue: false
            });
            showToast('success', 'PDF başarıyla oluşturuldu');
            fetchContracts();
        } catch (error) {
            showToast('error', 'PDF oluşturulurken hata oluştu');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="badge bg-secondary">Taslak</span>;
            case 'active': return <span className="badge bg-success">Aktif</span>;
            case 'expired': return <span className="badge bg-warning text-dark">Süresi Doldu</span>;
            case 'cancelled': return <span className="badge bg-danger">İptal Edildi</span>;
            default: return <span className="badge bg-info">{status}</span>;
        }
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">Sözleşme & Kayıt Evrak Yönetimi</h4>
                        <button className="btn btn-primary" onClick={() => { setSelectedContract(undefined); setShowForm(true); }}>
                            <i className="ti ti-plus me-1"></i> Yeni Sözleşme
                        </button>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="row mt-3">
                    <div className="col-md-3">
                        <div className="card text-center border-success">
                            <div className="card-body">
                                <h6 className="text-success mb-2">Aktif Sözleşmeler</h6>
                                <h4 className="mb-0">{stats.active}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center border-secondary">
                            <div className="card-body">
                                <h6 className="text-muted mb-2">Taslaklar</h6>
                                <h4 className="mb-0">{stats.draft}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center border-danger">
                            <div className="card-body">
                                <h6 className="text-danger mb-2">İptal Edilenler</h6>
                                <h4 className="mb-0">{stats.cancelled}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="text-muted mb-2">Toplam Kayıt</h6>
                                <h4 className="mb-0">{stats.total}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card mt-3">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover table-centered mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Sözleşme No</th>
                                    <th>Öğrenci</th>
                                    <th>Durum</th>
                                    <th>Sözleşme Tarihi</th>
                                    <th className="text-end">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center">Yükleniyor...</td></tr>
                                ) : contracts.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center">Kayıtlı sözleşme bulunamadı.</td></tr>
                                ) : contracts.map(contract => (
                                    <tr key={contract.id}>
                                        <td><strong>{contract.contract_no}</strong></td>
                                        <td>{contract.student.name}</td>
                                        <td>{getStatusBadge(contract.status)}</td>
                                        <td>{new Date(contract.contract_date).toLocaleDateString('tr-TR')}</td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-1">
                                                {contract.file ? (
                                                    <a href={contract.file.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-soft-info" title="PDF İndir">
                                                        <i className="ti ti-file-download"></i>
                                                    </a>
                                                ) : (
                                                    <button className="btn btn-sm btn-soft-warning" onClick={() => handleGeneratePdf(contract.id)} title="PDF Oluştur">
                                                        <i className="ti ti-file-pencil"></i>
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-soft-primary" onClick={() => { setSelectedContract(contract); setShowForm(true); }}>
                                                    <i className="ti ti-edit"></i>
                                                </button>
                                                <button className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(contract.id)}>
                                                    <i className="ti ti-trash"></i>
                                                </button>
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
                <ContractForm
                    contract={selectedContract}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchContracts(); }}
                />
            )}
        </div>
    );
};

export default ContractList;
