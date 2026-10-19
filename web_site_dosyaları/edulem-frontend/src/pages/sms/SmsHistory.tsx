import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface SmsRecipientItem {
    phone: string;
    name?: string | null;
    status?: string;
    sent_at?: string;
    error_message?: string;
}

interface SmsHistoryItem {
    id: number;
    title: string;
    message: string;
    recipient_type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    scheduled_at: string;
    created_at: string;
    sent_at?: string;
    sent_count: number;
    failed_count: number;
    error_message?: string;
    recipient_phones?: string[];
    sent_recipients?: SmsRecipientItem[];
    failed_recipients?: SmsRecipientItem[];
    creator?: {
        name: string;
    };
}

const SmsHistory = () => {
    const [history, setHistory] = useState<SmsHistoryItem[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSms, setSelectedSms] = useState<SmsHistoryItem | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [detailTab, setDetailTab] = useState<'sent' | 'failed'>('sent');
    const [recipientSearch, setRecipientSearch] = useState('');
    const [itemToDelete, setItemToDelete] = useState<SmsHistoryItem | null>(null);
    const [filters, setFilters] = useState({
        status: '',
        title: '',
        scheduled_from: '',
        scheduled_to: ''
    });

    useEffect(() => {
        fetchHistory();
    }, [filters]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams(Object.entries(filters).filter(([_, v]) => v !== ''));
            const res = await axiosClient.get(`/sms/scheduled?${params}`);
            const rawList = res.data?.data?.scheduled_sms ?? res.data?.data;
            const list = Array.isArray(rawList) ? rawList : (Array.isArray(rawList?.data) ? rawList.data : []);
            setHistory(list);
            setStats(res.data?.data?.statistics || null);
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Geçmiş yüklenemedi';
            showToast('error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (item: SmsHistoryItem) => {
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await axiosClient.delete(`/sms/scheduled/${itemToDelete.id}`);
            showToast('success', 'Kayıt başarıyla silindi');
            setItemToDelete(null);
            fetchHistory();
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Kayıt silinirken bir hata oluştu';
            showToast('error', msg);
        }
    };

    const handleShowDetail = async (item: SmsHistoryItem, initialTab?: 'sent' | 'failed') => {
        setSelectedSms(item);
        setRecipientSearch('');
        if (initialTab) {
            setDetailTab(initialTab);
        } else if (item.sent_count > 0) {
            setDetailTab('sent');
        } else if (item.failed_count > 0) {
            setDetailTab('failed');
        } else {
            setDetailTab('sent');
        }
        setShowModal(true);

        try {
            const res = await axiosClient.get(`/sms/scheduled/${item.id}`);
            const fresh = res.data?.data?.scheduled_sms ?? res.data?.data;
            if (fresh) {
                setSelectedSms(prev => prev && prev.id === item.id ? { ...prev, ...fresh } : prev);
            }
        } catch (_) {}
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <span className="badge bg-success">Tamamlandı</span>;
            case 'processing': return <span className="badge bg-primary">İşleniyor</span>;
            case 'failed': return <span className="badge bg-danger">Başarısız</span>;
            case 'pending': return <span className="badge bg-warning text-dark">Bekliyor</span>;
            case 'cancelled': return <span className="badge bg-secondary">İptal Edildi</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    const getRecipientLabel = (type: string) => {
        switch (type) {
            case 'classroom': return 'Sınıflar';
            case 'students': return 'Öğrenciler';
            case 'guardians': return 'Veliler';
            case 'users': return 'Personel';
            case 'all': return 'Herkes';
            default: return type || 'Bilinmiyor';
        }
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
        if (match) {
            const [, year, month, day, hour, min, sec] = match;
            return `${day}.${month}.${year} ${hour}:${min}:${sec || '00'}`;
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleString('tr-TR');
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0">SMS Gönderim Geçmişi</h3>
                    <p className="text-muted mb-0">Gönderilen tüm SMS'lerin durumunu ve raporlarını inceleyin.</p>
                </div>
                <div className="text-end d-none d-md-block ms-3">
                    <ol className="breadcrumb m-0 py-0">
                        <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
                        <li className="breadcrumb-item"><a href="/sms" className="text-decoration-none text-muted">Haberleşme</a></li>
                        <li className="breadcrumb-item active fw-medium">SMS Geçmişi</li>
                    </ol>
                </div>
            </div>

            {stats && (
                <div className="row g-3 mb-4">
                    <div className="col-md-2">
                        <div className="card border-0 shadow-sm text-center p-3">
                            <h3 className="fw-bold mb-0 text-primary">{stats.total || 0}</h3>
                            <small className="text-muted">Toplam Görev</small>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card border-0 shadow-sm text-center p-3">
                            <h3 className="fw-bold mb-0 text-success">{stats.completed || 0}</h3>
                            <small className="text-muted">Tamamlanan</small>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card border-0 shadow-sm text-center p-3">
                            <h3 className="fw-bold mb-0 text-warning">{stats.pending || 0}</h3>
                            <small className="text-muted">Bekleyen</small>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card border-0 shadow-sm text-center p-3">
                            <h3 className="fw-bold mb-0 text-info">{stats.processing || 0}</h3>
                            <small className="text-muted">İşlenen</small>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="card border-0 shadow-sm text-center p-3">
                            <h3 className="fw-bold mb-0 text-danger">{stats.failed || 0}</h3>
                            <small className="text-muted">Hatalı</small>
                        </div>
                    </div>
                </div>
            )}

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body bg-light rounded shadow-none p-3">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Başlık Ara..."
                                value={filters.title}
                                onChange={e => setFilters({ ...filters, title: e.target.value })}
                            />
                        </div>
                        <div className="col-md-2">
                            <select
                                className="form-select"
                                value={filters.status}
                                onChange={e => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">Tüm Durumlar</option>
                                <option value="completed">Tamamlandı</option>
                                <option value="processing">İşleniyor</option>
                                <option value="failed">Hatalı</option>
                                <option value="pending">Bekliyor</option>
                                <option value="cancelled">İptal Edildi</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <input
                                type="date"
                                className="form-control"
                                value={filters.scheduled_from}
                                onChange={e => setFilters({ ...filters, scheduled_from: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <input
                                type="date"
                                className="form-control"
                                value={filters.scheduled_to}
                                onChange={e => setFilters({ ...filters, scheduled_to: e.target.value })}
                            />
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-outline-secondary w-100" onClick={() => setFilters({ status: '', title: '', scheduled_from: '', scheduled_to: '' })}>
                                <i className="ti ti-rotate"></i>
                            </button>
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
                                    <th className="ps-3 text-nowrap">Tarih / Gönderen</th>
                                    <th>Alıcı Tipi</th>
                                    <th>Mesaj Başlığı / Metni</th>
                                    <th>Sonuç</th>
                                    <th>Durum</th>
                                    <th className="text-end">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-5 text-muted">Arama sonucunda kayıt bulunamadı.</td>
                                    </tr>
                                ) : (
                                    history.map(item => (
                                        <tr key={item.id}>
                                            <td className="ps-3">
                                                <div className="fw-medium">{formatDateTime(item.scheduled_at || item.created_at)}</div>
                                                <small className="text-muted">{item.creator?.name || 'Sistem'}</small>
                                            </td>
                                            <td>
                                                <div className="fw-bold">{getRecipientLabel(item.recipient_type)}</div>
                                            </td>
                                            <td>
                                                <div className="fw-bold small mb-1">{item.title}</div>
                                                <div className="text-wrap text-muted" style={{ minWidth: '200px', fontSize: '12px' }}>
                                                    {item.message?.substring(0, 100)}{item.message?.length > 100 ? '...' : ''}
                                                </div>
                                            </td>
                                            <td>
                                                {(item.sent_count > 0 || item.failed_count > 0) ? (
                                                    <div className="small d-flex flex-column gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-link btn-xs text-success p-0 text-start text-decoration-none d-inline-flex align-items-center"
                                                            title="İletilen numaraları gör"
                                                            onClick={() => handleShowDetail(item, 'sent')}
                                                        >
                                                            <i className="ti ti-check me-1"></i>
                                                            <span className="fw-semibold text-decoration-underline">{item.sent_count} Giden</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-link btn-xs ${item.failed_count > 0 ? 'text-danger fw-semibold text-decoration-underline' : 'text-muted'} p-0 text-start text-decoration-none d-inline-flex align-items-center`}
                                                            title={item.failed_count > 0 ? 'Hata alan numaraları gör' : 'Hata yok'}
                                                            onClick={() => handleShowDetail(item, 'failed')}
                                                        >
                                                            <i className="ti ti-x me-1"></i>
                                                            <span>{item.failed_count} Hata</span>
                                                        </button>
                                                    </div>
                                                ) : <span className="text-muted small">-</span>}
                                            </td>
                                            <td>{getStatusBadge(item.status)}</td>
                                            <td className="text-end pe-3">
                                                <button
                                                    className="btn btn-sm btn-outline-info me-1"
                                                    onClick={() => handleShowDetail(item)}
                                                    title="Detay"
                                                >
                                                    <i className="ti ti-eye"></i> Detay
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDeleteClick(item)}
                                                    title="Sil"
                                                >
                                                    <i className="ti ti-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detay Modalı */}
            {showModal && selectedSms && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">SMS Detayı</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6 mb-3 mb-md-0">
                                        <p className="mb-1 text-muted small"><i className="ti ti-heading me-1"></i> Başlık</p>
                                        <p className="fw-medium mb-0">{selectedSms.title}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="mb-1 text-muted small"><i className="ti ti-activity me-1"></i> Durum</p>
                                        <p className="mb-0">{getStatusBadge(selectedSms.status)}</p>
                                    </div>
                                </div>
                                <div className="row mb-3">
                                    <div className="col-md-6 mb-3 mb-md-0">
                                        <p className="mb-1 text-muted small"><i className="ti ti-users me-1"></i> Alıcı Tipi</p>
                                        <p className="fw-medium mb-0">{getRecipientLabel(selectedSms.recipient_type)}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="mb-1 text-muted small"><i className="ti ti-calendar me-1"></i> Tarih</p>
                                        <p className="fw-medium mb-0">{formatDateTime(selectedSms.scheduled_at || selectedSms.created_at)}</p>
                                    </div>
                                </div>
                                <div className="row mb-3 align-items-center">
                                    <div className="col-md-6 mb-3 mb-md-0">
                                        <p className="mb-1 text-muted small"><i className="ti ti-chart-pie me-1"></i> Gönderim Sonucu (Numaraları görmek için tıklayın)</p>
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${detailTab === 'sent' ? 'btn-success text-white shadow-sm' : 'btn-outline-success'} py-1 px-3 d-inline-flex align-items-center gap-1 rounded-pill`}
                                                onClick={() => setDetailTab('sent')}
                                            >
                                                <i className="ti ti-check"></i>
                                                <span className="fw-semibold">{selectedSms.sent_count} İletildi</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${detailTab === 'failed' ? 'btn-danger text-white shadow-sm' : 'btn-outline-danger'} py-1 px-3 d-inline-flex align-items-center gap-1 rounded-pill`}
                                                onClick={() => setDetailTab('failed')}
                                            >
                                                <i className="ti ti-x"></i>
                                                <span className="fw-semibold">{selectedSms.failed_count} Hata</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="mb-1 text-muted small"><i className="ti ti-user me-1"></i> Oluşturan</p>
                                        <p className="fw-medium mb-0">{selectedSms.creator?.name || 'Sistem'}</p>
                                    </div>
                                </div>

                                {/* Numaralar Listesi Kutusu */}
                                {(() => {
                                    const sentRecipients: SmsRecipientItem[] = selectedSms.sent_recipients ?? 
                                        (selectedSms.status === 'completed' && selectedSms.failed_count === 0 && selectedSms.recipient_phones 
                                            ? selectedSms.recipient_phones.map(p => ({ phone: p, status: 'sent', sent_at: selectedSms.sent_at || selectedSms.created_at })) 
                                            : []);

                                    const failedRecipients: SmsRecipientItem[] = selectedSms.failed_recipients ?? 
                                        (selectedSms.status === 'failed' && selectedSms.sent_count === 0 && selectedSms.recipient_phones 
                                            ? selectedSms.recipient_phones.map(p => ({ phone: p, status: 'failed', error_message: selectedSms.error_message })) 
                                            : []);

                                    const activeList = detailTab === 'sent' ? sentRecipients : failedRecipients;
                                    const filteredList = activeList.filter(item => {
                                        if (!recipientSearch.trim()) return true;
                                        const q = recipientSearch.toLowerCase();
                                        return (
                                            item.phone.toLowerCase().includes(q) ||
                                            (item.name && item.name.toLowerCase().includes(q)) ||
                                            (item.error_message && item.error_message.toLowerCase().includes(q))
                                        );
                                    });

                                    return (
                                        <div className="card border mb-3 shadow-none bg-light-subtle">
                                            <div className="card-header py-2 px-3 bg-white border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className={`fw-bold small ${detailTab === 'sent' ? 'text-success' : 'text-danger'} d-flex align-items-center gap-1`}>
                                                        <i className={`ti ${detailTab === 'sent' ? 'ti-circle-check' : 'ti-alert-circle'}`}></i>
                                                        {detailTab === 'sent' ? 'İletilen Numaralar' : 'Hata Alan Numaralar'} ({activeList.length})
                                                    </span>
                                                </div>
                                                {activeList.length > 5 && (
                                                    <div className="input-group input-group-sm" style={{ width: '220px' }}>
                                                        <span className="input-group-text py-0"><i className="ti ti-search fs-xs"></i></span>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Numara veya isim ara..."
                                                            value={recipientSearch}
                                                            onChange={e => setRecipientSearch(e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="card-body p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {filteredList.length === 0 ? (
                                                    <div className="text-center text-muted small py-3">
                                                        <i className="ti ti-info-circle me-1"></i>
                                                        {detailTab === 'sent' ? 'İletilen numara kaydı bulunamadı.' : 'Hata alan numara bulunmamaktadır.'}
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-column gap-1">
                                                        {filteredList.map((item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="d-flex justify-content-between align-items-center px-2 py-1 bg-white rounded border small"
                                                            >
                                                                <div className="d-flex align-items-center gap-2 overflow-hidden text-truncate">
                                                                    <span className="badge bg-light text-dark border font-monospace px-2">
                                                                        {item.phone}
                                                                    </span>
                                                                    {item.name ? (
                                                                        <span className="fw-semibold text-dark text-truncate">
                                                                            {item.name}
                                                                        </span>
                                                                    ) : null}
                                                                    {item.error_message && (
                                                                        <span className="text-danger small text-truncate" title={item.error_message}>
                                                                            ({item.error_message})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.sent_at && (
                                                                    <span className="text-muted small ms-2 flex-shrink-0" style={{ fontSize: '0.75rem' }}>
                                                                        {formatDateTime(item.sent_at)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                                {selectedSms.error_message && (
                                    <div className="alert alert-danger mb-3 py-2 small">
                                        <div className="fw-bold mb-1"><i className="ti ti-alert-circle me-1"></i> Hata Açıklaması:</div>
                                        <div>{selectedSms.error_message}</div>
                                    </div>
                                )}
                                <div>
                                    <p className="mb-2 text-muted small"><i className="ti ti-message me-1"></i> Mesaj Metni</p>
                                    <div className="p-3 bg-light rounded text-wrap" style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                        {selectedSms.message}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Kapat</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Onay Modalı */}
            {itemToDelete && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title fw-bold">Kaydı Sil</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setItemToDelete(null)}></button>
                            </div>
                            <div className="modal-body text-center py-4">
                                <div className="mb-3">
                                    <i className="ti ti-alert-triangle text-danger" style={{ fontSize: '48px' }}></i>
                                </div>
                                <h5 className="mb-2">Bu SMS kaydını silmek istediğinizden emin misiniz?</h5>
                                <p className="text-muted mb-0">Bu işlem geri alınamaz ve gönderim raporları da silinecektir.</p>
                                <div className="mt-3 bg-light p-2 rounded text-start small border">
                                    <strong>Başlık:</strong> {itemToDelete.title} <br />
                                    <strong>Hedef:</strong> {getRecipientLabel(itemToDelete.recipient_type)}
                                </div>
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary px-4" onClick={() => setItemToDelete(null)}>İptal</button>
                                <button type="button" className="btn btn-danger px-4" onClick={confirmDelete}>
                                    <i className="ti ti-trash me-1"></i> Evet, Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmsHistory;
