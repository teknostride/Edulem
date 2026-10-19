import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface FinanceSummary {
  total_contract_volume: number;
  total_collected: number;
  total_pending: number;
  total_overdue: number;
}

interface PaymentRecord {
  id: number;
  tenant_id: number;
  title: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  payment_method?: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  notes?: string;
  tenant?: {
    id: number;
    name: string;
    domain: string;
  };
}

const FinanceDashboard = () => {
  const [summary, setSummary] = useState<FinanceSummary>({
    total_contract_volume: 0,
    total_collected: 0,
    total_pending: 0,
    total_overdue: 0,
  });
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/super-admin/finance/dashboard');
      const data = res.data.data;
      setSummary(data.summary || {});
      setPayments(data.recent_payments || []);
    } catch (error) {
      console.error('Finans verileri yüklenemedi:', error);
      showToast('error', 'Finans verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (paymentId: number) => {
    try {
      await axiosClient.post(`/super-admin/payments/${paymentId}/mark-paid`);
      showToast('success', 'Ödeme tahsil edildi olarak işaretlendi.');
      fetchFinanceData();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız.');
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    const ok = await confirmDialog({
      text: 'Bu ödeme kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/super-admin/payments/${paymentId}`);
      showToast('success', 'Ödeme kaydı silindi.');
      fetchFinanceData();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Silinemedi.');
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = !searchTerm || 
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="py-2">
      {/* BAŞLIK */}
      <div className="page-title-head d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-main-title m-0">SaaS Finans & Alacak Takip Merkezi</h4>
          <p className="text-muted small mb-0">
            Okullarla yapılan sözleşmeler, bekleyen taksitler ve gerçekleşen tahsilatlar.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Link to="/super-admin/expenses" className="btn btn-outline-danger">
            <i className="ti ti-receipt-2 me-1"></i> Şirket Giderleri & Net Kâr
          </Link>
          <button type="button" className="btn btn-outline-secondary" onClick={fetchFinanceData}>
            <i className="ti ti-refresh me-1"></i> Yenile
          </button>
        </div>
      </div>

      {/* METRİK KARTLARI */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">TOPLAM SÖZLEŞME HACMİ</div>
                  <h3 className="mb-0 text-white mt-1">
                    {Number(summary.total_contract_volume || 0).toLocaleString('tr-TR')} ₺
                  </h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fs-24">
                  <i className="ti ti-building-bank"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">TAHSİL EDİLEN GELİR</div>
                  <h3 className="mb-0 text-white mt-1">
                    {Number(summary.total_collected || 0).toLocaleString('tr-TR')} ₺
                  </h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fs-24">
                  <i className="ti ti-check"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">BEKLEYEN ALACAKLAR</div>
                  <h3 className="mb-0 text-white mt-1">
                    {Number(summary.total_pending || 0).toLocaleString('tr-TR')} ₺
                  </h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fs-24">
                  <i className="ti ti-hourglass-empty"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm bg-danger text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">VADESİ GEÇEN / GECİKMİŞ</div>
                  <h3 className="mb-0 text-white mt-1">
                    {Number(summary.total_overdue || 0).toLocaleString('tr-TR')} ₺
                  </h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fs-24">
                  <i className="ti ti-alert-triangle"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FİLTRE VE TABLO */}
      <div className="card border shadow-sm">
        <div className="card-header bg-white border-bottom p-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-light"><i className="ti ti-search"></i></span>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Okul adı veya taksit ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-7 text-md-end">
              <div className="btn-group" role="group">
                <button 
                  type="button" 
                  className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('all')}
                >
                  Tümü ({payments.length})
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('pending')}
                >
                  Bekleyenler
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${statusFilter === 'overdue' ? 'btn-danger' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('overdue')}
                >
                  Gecikenler
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${statusFilter === 'paid' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setStatusFilter('paid')}
                >
                  Tahsil Edilenler
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary"></div>
              <div className="mt-2">Ödemeler yükleniyor...</div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-receipt-off fs-1 d-block mb-2"></i>
              Kriterlere uygun ödeme kaydı bulunamadı.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Kurum (Okul)</th>
                    <th>Taksit / Açıklama</th>
                    <th>Vade Tarihi</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                    <th>Tahsilat Tarihi</th>
                    <th>Ödeme Yöntemi</th>
                    <th className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const isOverdue = p.status === 'overdue' || (p.status === 'pending' && new Date(p.due_date) < new Date());
                    return (
                      <tr key={p.id}>
                        <td>
                          {p.tenant ? (
                            <Link to={`/super-admin/tenants/${p.tenant.id}`} className="fw-bold text-dark text-decoration-none">
                              {p.tenant.name}
                            </Link>
                          ) : (
                            <span className="text-muted">Bilinmeyen Kurum</span>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold">{p.title}</div>
                          {p.notes && <div className="text-muted small">{p.notes}</div>}
                        </td>
                        <td>
                          <span className={`badge ${isOverdue ? 'bg-danger' : 'bg-light text-dark'}`}>
                            {p.due_date}
                          </span>
                        </td>
                        <td className="fw-bold fs-15">{Number(p.amount).toLocaleString('tr-TR')} ₺</td>
                        <td>
                          {p.status === 'paid' ? (
                            <span className="badge bg-success">✓ Tahsil Edildi</span>
                          ) : isOverdue ? (
                            <span className="badge bg-danger">⚠ Vadesi Geçti</span>
                          ) : (
                            <span className="badge bg-warning">Bekliyor</span>
                          )}
                        </td>
                        <td>{p.paid_date || '-'}</td>
                        <td>
                          <span className="small text-muted font-monospace">{p.payment_method || '-'}</span>
                        </td>
                        <td className="text-end">
                          {p.status !== 'paid' && (
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-success me-2"
                              onClick={() => handleMarkPaid(p.id)}
                              title="Tahsil Edildi İşaretle"
                            >
                              <i className="ti ti-check me-1"></i> Tahsil Et
                            </button>
                          )}
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeletePayment(p.id)}
                            title="Sil"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
