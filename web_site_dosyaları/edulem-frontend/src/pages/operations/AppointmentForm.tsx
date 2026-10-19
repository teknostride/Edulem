import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

const AppointmentForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [leads, setLeads] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        appointment_date: new Date().toISOString().split('T')[0] + 'T09:00',
        status: 'scheduled',
        assigned_to: '',
        lead_id: '',
        notes: ''
    });

    useEffect(() => {
        fetchInitialData();
        if (isEdit) {
            fetchAppointment();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [leadsRes, staffRes] = await Promise.all([
                axiosClient.get('/leads'),
                axiosClient.get('/users?role=manager,teacher,general_manager')
            ]);
            setLeads(leadsRes.data.data.items || leadsRes.data.data);
            setStaff(staffRes.data.data.items || staffRes.data.data);
        } catch (error) {
            console.error('Başlangıç verileri yüklenemedi');
        }
    };

    const fetchAppointment = async () => {
        try {
            const res = await axiosClient.get(`/appointments/${id}`);
            const data = res.data.data;
            setFormData({
                name: data.name,
                phone: data.phone || '',
                email: data.email || '',
                appointment_date: data.appointment_date.substring(0, 16),
                status: data.status,
                assigned_to: data.assigned_to || '',
                lead_id: data.lead_id || '',
                notes: data.notes || ''
            });
        } catch (error) {
            showToast('error', 'Randevu bilgileri yüklenemedi');
            navigate('/operations/appointments');
        } finally {
            setFetching(false);
        }
    };

    const handleLeadChange = (leadId: string) => {
        const lead = leads.find(l => l.id.toString() === leadId);
        if (lead) {
            setFormData({
                ...formData,
                lead_id: leadId,
                name: `${lead.first_name} ${lead.last_name}`,
                phone: lead.phone || '',
                email: lead.email || ''
            });
        } else {
            setFormData({ ...formData, lead_id: '' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                assigned_to: formData.assigned_to || null,
                lead_id: formData.lead_id || null
            };

            if (isEdit) {
                await axiosClient.put(`/appointments/${id}`, payload);
                showToast('success', 'Randevu güncellendi');
            } else {
                await axiosClient.post('/appointments', payload);
                showToast('success', 'Randevu oluşturuldu');
            }
            navigate('/operations/appointments');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">{isEdit ? 'Randevu Düzenle' : 'Yeni Randevu'}</h4>
                <p className="text-muted">Görüşme detaylarını ve atanan personeli belirleyin.</p>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSubmit} className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="form-label">Aday Kayıt Bağlantısı (Opsiyonel)</label>
                                    <select
                                        className="form-select border-primary border-dashed"
                                        value={formData.lead_id}
                                        onChange={e => handleLeadChange(e.target.value)}
                                    >
                                        <option value="">Aday Kaydı Seçin (Yoksa boş bırakın)</option>
                                        {leads.map(l => (
                                            <option key={l.id} value={l.id}>{l.first_name} {l.last_name} ({l.phone})</option>
                                        ))}
                                    </select>
                                    <small className="text-muted">Aday seçerseniz bilgiler otomatik dolacaktır.</small>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Görüşmeci Adı / Konu</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Örn: Ahmet Yılmaz - Veli Görüşmesi"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Telefon</label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">E-posta</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Randevu Tarih & Saat</label>
                                    <input
                                        type="datetime-local"
                                        className="form-control"
                                        value={formData.appointment_date}
                                        onChange={e => setFormData({ ...formData, appointment_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Durum</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="scheduled">Planlandı</option>
                                        <option value="completed">Tamamlandı</option>
                                        <option value="cancelled">İptal Edildi</option>
                                        <option value="no_show">Gelinmedi</option>
                                    </select>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Atanan Personel</label>
                                    <select
                                        className="form-select"
                                        value={formData.assigned_to}
                                        onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                                    >
                                        <option value="">Personel Seçin...</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Notlar</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        placeholder="Randevu ile ilgili ek notlar..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-top p-3 d-flex justify-content-between">
                            <button type="button" className="btn btn-light" onClick={() => navigate('/operations/appointments')}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading && <span className="spinner-border spinner-border-sm me-1"></span>}
                                {isEdit ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AppointmentForm;
