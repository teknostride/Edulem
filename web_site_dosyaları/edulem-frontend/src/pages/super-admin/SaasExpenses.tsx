import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface SaasExpense {
  id: number;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  vendor?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

interface ExpenseSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  by_category: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  server: { label: 'Sunucu & Bulut Hosting', icon: 'ti-server', color: 'primary' },
  sms: { label: 'Toplu SMS Maliyetleri', icon: 'ti-message-dots', color: 'info' },
  domain: { label: 'Domain & SSL Sertifikaları', icon: 'ti-world', color: 'warning' },
  salary: { label: 'Personel & Maaş Giderleri', icon: 'ti-users', color: 'success' },
  marketing: { label: 'Pazarlama & Reklam', icon: 'ti-ad', color: 'danger' },
  office: { label: 'Ofis & İdari Giderler', icon: 'ti-building', color: 'secondary' },
  other: { label: 'Diğer Genel Giderler', icon: 'ti-receipt', color: 'dark' },
};

const SaasExpenses = () => {
  const [expenses, setExpenses] = useState<SaasExpense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    by_category: {},
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SaasExpense | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'server',
    amount: '',
    expense_date: new Date().toISOString().substring(0, 10),
    vendor: '',
    payment_method: 'credit_card',
    notes: '',
  });

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/super-admin/expenses');
      const data = res.data.data;
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data?.expenses)
            ? data.expenses
            : (Array.isArray(data?.expenses?.data) ? data.expenses.data : []));
      setExpenses(list);
    } catch (error) {
      console.error('Giderler yüklenemedi:', error);
      showToast('error', 'Gider kayıtları yüklenemedi.');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axiosClient.get('/super-admin/expenses/summary');
      const sum = res.data.data?.summary || res.data.data?.financial_summary || res.data.data;
      if (sum && typeof sum === 'object') {
        setSummary({
          total_revenue: Number(sum.total_revenue || 0),
          total_expenses: Number(sum.total_expenses || 0),
          net_profit: Number(sum.net_profit || 0),
          by_category: sum.by_category || {},
        });
      }
    } catch (error) {
      console.error('Özet yüklenemedi:', error);
    }
  };

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'server',
      amount: '',
      expense_date: new Date().toISOString().substring(0, 10),
      vendor: '',
      payment_method: 'credit_card',
      notes: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        amount: Number(formData.amount),
        expense_date: formData.expense_date,
        vendor: formData.vendor,
        payment_method: formData.payment_method,
        notes: formData.notes,
      };

      if (editingExpense) {
        await axiosClient.put(`/super-admin/expenses/${editingExpense.id}`, payload);
        showToast('success', 'Gider güncellendi.');
      } else {
        await axiosClient.post('/super-admin/expenses', payload);
        showToast('success', 'Gider kaydı eklendi.');
      }

      setShowModal(false);
      fetchExpenses();
      fetchSummary();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'İşlem başarısız.');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu gider kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/super-admin/expenses/${id}`);
      showToast('success', 'Gider silindi.');
      fetchExpenses();
      fetchSummary();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Silinemedi.');
    }
  };

  const netProfit = (summary.total_revenue || 0) - (summary.total_expenses || 0);

  return (
    <div className="py-2">
      {/* HEADER */}
      <div className="page-title-head d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="page-main-title m-0">EduLem SaaS Şirket Giderleri & Net Kâr</h4>
          <p className="text-muted small mb-0">
            Sunucu, toplu SMS, personel ve operasyonel şirket giderlerini takip edin.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
          <i className="ti ti-plus me-1"></i> Yeni Gider Ekle
        </button>
      </div>

      {/* ÖZET KARTLAR (GELİR, GİDER, NET KÂR) */}
      <div className="row g-3 mb-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">TOPLAM TAHSİLAT (GELİR)</div>
                  <h3 className="mb-0 text-white mt-1">
                    {Number(summary.total_revenue || 0).toLocaleString('tr-TR')} ₺
                  </h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fs-24">
                  <i className="ti ti-arrow-up-right"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm bg-danger text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">TOPLAM ŞİRKET GİDERİ</div>
                  <h3 className="mb-0 text-white mt-1">
                    {Number(summary.total_expenses || 0).toLocaleString('tr-TR')} ₺
                  </h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fs-24">
                  <i className="ti ti-arrow-down-left"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className={`card border-0 shadow-sm ${netProfit >= 0 ? 'bg-primary' : 'bg-dark'} text-white`}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small fw-bold">NET SAAS KÂRI / ZARARI</div>
                  <h3 className="mb-0 text-white mt-1">
                    {netProfit.toLocaleString('tr-TR')} ₺
                  </h3>
                </div>
                <div className="avatar-md bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fs-24">
                  <i className={`ti ${netProfit >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GİDERLER TABLOSU */}
      <div className="card border shadow-sm">
        <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
          <h5 className="card-title m-0">Gider Kayıtları</h5>
          <span className="badge bg-light text-dark">{expenses.length} Kayıt</span>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary"></div>
              <div className="mt-2">Giderler yükleniyor...</div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="ti ti-receipt-2 fs-1 d-block mb-2"></i>
              Henüz kaydedilmiş bir şirket gideri bulunmuyor.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Gider Başlığı</th>
                    <th>Kategori</th>
                    <th>Tarih</th>
                    <th>Tutar</th>
                    <th>Tedarikçi / Kurum</th>
                    <th>Ödeme Yöntemi</th>
                    <th className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => {
                    const catInfo = CATEGORY_LABELS[exp.category] || CATEGORY_LABELS['other'];
                    return (
                      <tr key={exp.id}>
                        <td>
                          <div className="fw-bold">{exp.title}</div>
                          {exp.notes && <div className="text-muted small">{exp.notes}</div>}
                        </td>
                        <td>
                          <span className={`badge bg-${catInfo.color}`}>
                            <i className={`ti ${catInfo.icon} me-1`}></i>
                            {catInfo.label}
                          </span>
                        </td>
                        <td>{exp.expense_date}</td>
                        <td className="fw-bold fs-15 text-danger">
                          -{Number(exp.amount).toLocaleString('tr-TR')} ₺
                        </td>
                        <td>{exp.vendor || '-'}</td>
                        <td>
                          <span className="small text-muted font-monospace">{exp.payment_method || '-'}</span>
                        </td>
                        <td className="text-end">
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(exp.id)}
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

      {/* YENİ GİDER MODALI */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Yeni Şirket Gideri Kaydet</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Gider Başlığı <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Örn: Hetzner Sunucu Faturası veya NetGSM SMS Paketi"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Kategori <span className="text-danger">*</span></label>
                      <select 
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="server">Sunucu & Bulut Hosting</option>
                        <option value="sms">Toplu SMS Maliyetleri</option>
                        <option value="domain">Domain & SSL Sertifikaları</option>
                        <option value="salary">Personel & Maaş</option>
                        <option value="marketing">Pazarlama & Reklam</option>
                        <option value="office">Ofis & İdari</option>
                        <option value="other">Diğer Genel Giderler</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Tutar (₺) <span className="text-danger">*</span></label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-control"
                        placeholder="Örn: 4200"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Gider Tarihi <span className="text-danger">*</span></label>
                      <input 
                        type="date" 
                        className="form-control"
                        value={formData.expense_date}
                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Tedarikçi / Firma</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="Hetzner, NetGSM, Google Cloud..."
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Ödeme Yöntemi</label>
                    <select 
                      className="form-select"
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    >
                      <option value="credit_card">Şirket Kredi Kartı</option>
                      <option value="bank_transfer">Banka Havalesi</option>
                      <option value="cash">Nakit</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notlar / Fatura No</label>
                    <textarea 
                      className="form-control"
                      rows={2}
                      placeholder="Fatura numarası veya açıklama..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Gideri Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasExpenses;
