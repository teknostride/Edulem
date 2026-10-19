import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Invoice {
    id: number;
    invoice_number: string;
    amount: number;
    total_amount?: number;
    due_date: string;
    status: 'pending' | 'paid' | 'cancelled' | 'partially_paid';
    invoice_type: string;
    student?: {
        id: number;
        student_name: string;
    };
    created_by?: {
        name: string;
    };
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Summary {
    total_amount: number;
    pending_amount: number;
    paid_amount: number;
}

const InvoiceList = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    useEffect(() => {
        fetchInvoices();
    }, [currentPage, statusFilter, dateFrom, dateTo]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                per_page: 15
            };

            if (statusFilter) params.status = statusFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await axiosClient.get('/v1/invoices', { params });
            const data = response.data.data || response.data;

            setInvoices(data.invoices || []);
            setSummary(data.summary || null);
            setPagination(data.pagination || null);
            setLoading(false);
        } catch (error) {
            console.error('Faturalar yüklenemedi:', error);
            showToast('error', 'Faturalar yüklenemedi');
            setLoading(false);
        }
    };

    const handleDownloadPdf = async (id: number) => {
        try {
            showToast('info', 'PDF oluşturuluyor...');
            await axiosClient.get(`/v1/invoices/${id}/pdf`);
            showToast('success', 'PDF oluşturma işlemi kuyruğa eklendi.');
        } catch (error) {
            showToast('error', 'PDF oluşturulamadı');
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu faturayı silmek istediğinizden emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/v1/invoices/${id}`);
            showToast('success', 'Fatura başarıyla silindi');
            fetchInvoices();
        } catch (error) {
            showToast('error', 'Fatura silinemedi');
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-success';
            case 'pending': return 'bg-warning text-dark';
            case 'cancelled': return 'bg-danger';
            case 'partially_paid': return 'bg-info';
            default: return 'bg-secondary';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    };

    if (loading && invoices.length === 0) return (
        <div className="text-center p-5">
            <div className="spinner-border text-primary"></div>
            <div className="mt-2">Faturalar yükleniyor...</div>
        </div>
    );

    return (
        <div className="container-fluid">
            <div className="page-title-head d-flex align-items-center">
                <div className="flex-grow-1">
                    <h4 className="page-main-title m-0">Fatura Yönetimi</h4>
                </div>
                <div className="text-end">
                    <ol className="breadcrumb m-0 py-0">
                        <li className="breadcrumb-item"><Link to="/">EduLem</Link></li>
                        <li className="breadcrumb-item active">Faturalar</li>
                    </ol>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            {summary && (
                <div className="row mt-4">
                    <div className="col-md-4">
                        <div className="card border-start border-primary border-4">
                            <div className="card-body">
                                <h6 className="text-muted text-uppercase mt-0">Toplam Tutar</h6>
                                <h3 className="mb-0">{formatCurrency(summary.total_amount)}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card border-start border-success border-4">
                            <div className="card-body">
                                <h6 className="text-muted text-uppercase mt-0">Ödenen Tutar</h6>
                                <h3 className="mb-0">{formatCurrency(summary.paid_amount)}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card border-start border-warning border-4">
                            <div className="card-body">
                                <h6 className="text-muted text-uppercase mt-0">Bekleyen Tutar</h6>
                                <h3 className="mb-0">{formatCurrency(summary.pending_amount)}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTERS */}
            <div className="card border p-3 mt-3">
                <div className="row g-2 align-items-center">
                    <div className="col-md-3">
                        <div className="app-search">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Fatura No veya Öğrenci ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <i className="ti ti-search app-search-icon text-muted"></i>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Tüm Durumlar</option>
                            <option value="pending">Bekliyor</option>
                            <option value="paid">Ödendi</option>
                            <option value="partially_paid">Kısmi Ödeme</option>
                            <option value="cancelled">İptal</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <input
                            type="date"
                            className="form-control"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="Başlangıç"
                        />
                    </div>
                    <div className="col-md-2">
                        <input
                            type="date"
                            className="form-control"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="Bitiş"
                        />
                    </div>
                    <div className="col text-end">
                        <button className="btn btn-primary">
                            <i className="ti ti-plus me-1"></i> Yeni Fatura
                        </button>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="card mt-3">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Fatura No</th>
                                    <th>Öğrenci</th>
                                    <th>Tutar</th>
                                    <th>Vade Tarihi</th>
                                    <th>Durum</th>
                                    <th>Oluşturan</th>
                                    <th className="text-end">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted">Fatura bulunamadı.</td>
                                    </tr>
                                ) : (
                                    invoices.filter(inv =>
                                        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        inv.student?.student_name.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="fw-bold">#{invoice.invoice_number}</td>
                                            <td>{invoice.student?.student_name || 'Genel'}</td>
                                            <td>{formatCurrency(invoice.amount || invoice.total_amount || 0)}</td>
                                            <td>{new Date(invoice.due_date).toLocaleDateString('tr-TR')}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
                                                    {invoice.status === 'paid' ? 'Ödendi' :
                                                        invoice.status === 'pending' ? 'Bekliyor' :
                                                            invoice.status === 'cancelled' ? 'İptal' : 'Kısmi'}
                                                </span>
                                            </td>
                                            <td>{invoice.created_by?.name || '-'}</td>
                                            <td className="text-end">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-outline-info"
                                                        onClick={() => handleDownloadPdf(invoice.id)}
                                                        title="PDF İndir"
                                                    >
                                                        <i className="ti ti-download"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleDelete(invoice.id)}
                                                        title="Sil"
                                                    >
                                                        <i className="ti ti-trash"></i>
                                                    </button>
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

            {/* PAGINATION */}
            {pagination && pagination.last_page > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted">Toplam {pagination.total} fatura</div>
                    <nav>
                        <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(pagination.current_page - 1)}>Önceki</button>
                            </li>
                            <li className="page-item active"><span className="page-link">{pagination.current_page}</span></li>
                            <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setCurrentPage(pagination.current_page + 1)}>Sonraki</button>
                            </li>
                        </ul>
                    </nav>
                </div>
            )}
        </div>
    );
};

export default InvoiceList;
