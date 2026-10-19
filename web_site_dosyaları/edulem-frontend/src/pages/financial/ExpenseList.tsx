import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Expense {
    id: number;
    description: string;
    amount: number;
    category: string;
    expense_date: string;
    payment_method: string;
    paid_by?: {
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
    total_count: number;
    by_category: Record<string, number>;
}

const ExpenseList = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    useEffect(() => {
        fetchExpenses();
    }, [currentPage, categoryFilter, paymentMethodFilter, dateFrom, dateTo]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                per_page: 15
            };

            if (categoryFilter) params.expense_category = categoryFilter;
            if (paymentMethodFilter) params.payment_method = paymentMethodFilter;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await axiosClient.get('/v1/expenses', { params });
            const data = response.data.data || response.data;

            setExpenses(data.expenses || []);
            setSummary(data.summary || null);
            setPagination(data.pagination || null);
            setLoading(false);
        } catch (error) {
            console.error('Giderler yüklenemedi:', error);
            showToast('error', 'Giderler yüklenemedi');
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu gideri silmek istediğinizden emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/v1/expenses/${id}`);
            showToast('success', 'Gider başarıyla silindi');
            fetchExpenses();
        } catch (error) {
            showToast('error', 'Gider silinemedi');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    };

    if (loading && expenses.length === 0) return (
        <div className="text-center p-5">
            <div className="spinner-border text-primary"></div>
            <div className="mt-2">Giderler yükleniyor...</div>
        </div>
    );

    return (
        <div className="container-fluid">
            <div className="page-title-head d-flex align-items-center">
                <div className="flex-grow-1">
                    <h4 className="page-main-title m-0">Gider Yönetimi</h4>
                </div>
                <div className="text-end">
                    <ol className="breadcrumb m-0 py-0">
                        <li className="breadcrumb-item"><Link to="/">EduLem</Link></li>
                        <li className="breadcrumb-item active">Giderler</li>
                    </ol>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="row mt-4">
                <div className="col-md-6">
                    <div className="card border-start border-danger border-4">
                        <div className="card-body">
                            <h6 className="text-muted text-uppercase mt-0">Toplam Gider</h6>
                            <h3 className="mb-0">{summary ? formatCurrency(summary.total_amount) : '-'}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card border-start border-info border-4">
                        <div className="card-body">
                            <h6 className="text-muted text-uppercase mt-0">Gider Adedi</h6>
                            <h3 className="mb-0">{summary ? summary.total_count : '-'}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="card border p-3 mt-3">
                <div className="row g-2 align-items-center">
                    <div className="col-md-3">
                        <div className="app-search">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Açıklama ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <i className="ti ti-search app-search-icon text-muted"></i>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <select
                            className="form-select"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">Tüm Kategoriler</option>
                            {summary?.by_category && Object.keys(summary.by_category).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Maaş">Maaş</option>
                            <option value="Kira">Kira</option>
                            <option value="Fatura">Fatura</option>
                            <option value="Malzeme">Malzeme</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <select
                            className="form-select"
                            value={paymentMethodFilter}
                            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        >
                            <option value="">Ödeme Yöntemi</option>
                            <option value="cash">Nakit</option>
                            <option value="bank_transfer">Banka Havalesi</option>
                            <option value="credit_card">Kredi Kartı</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div className="col-md-2">
                        <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                    <div className="col text-end">
                        <button className="btn btn-primary">
                            <i className="ti ti-plus me-1"></i> Yeni Gider
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
                                    <th>Açıklama</th>
                                    <th>Kategori</th>
                                    <th>Tutar</th>
                                    <th>Tarih</th>
                                    <th>Ödeme Yöntemi</th>
                                    <th>Ödeyen</th>
                                    <th className="text-end">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted">Gider bulunamadı.</td>
                                    </tr>
                                ) : (
                                    expenses.filter(exp =>
                                        exp.description.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map((expense) => (
                                        <tr key={expense.id}>
                                            <td className="fw-bold">{expense.description}</td>
                                            <td>
                                                <span className="badge bg-soft-dark text-dark">{expense.category}</span>
                                            </td>
                                            <td className="text-danger fw-bold">{formatCurrency(expense.amount)}</td>
                                            <td>{new Date(expense.expense_date).toLocaleDateString('tr-TR')}</td>
                                            <td>{expense.payment_method === 'cash' ? 'Nakit' :
                                                expense.payment_method === 'bank_transfer' ? 'Havale' : 'K. Kartı'}</td>
                                            <td>{expense.paid_by?.name || '-'}</td>
                                            <td className="text-end">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-outline-warning"
                                                        title="Düzenle"
                                                    >
                                                        <i className="ti ti-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleDelete(expense.id)}
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
                    <div className="text-muted">Toplam {pagination.total} gider</div>
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

export default ExpenseList;
