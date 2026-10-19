import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface User {
    id: number;
    name: string;
}

interface Lead {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    source: string | null;
    notes: string | null;
    assigned_to?: {
        id: number;
        name: string;
    } | number | null;
}

interface LeadFormProps {
    lead?: Lead;
    onClose: () => void;
    onSuccess: () => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ lead, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        status: 'new',
        source: '',
        notes: '',
        assigned_to: ''
    });
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (lead) {
            setFormData({
                name: lead.name,
                phone: lead.phone,
                email: lead.email || '',
                status: lead.status,
                source: lead.source || '',
                notes: lead.notes || '',
                assigned_to: typeof lead.assigned_to === 'object' ? lead.assigned_to?.id.toString() || '' : lead.assigned_to?.toString() || ''
            });
        }
        fetchUsers();
    }, [lead]);

    const fetchUsers = async () => {
        try {
            const response = await axiosClient.get('/users');
            setUsers(response.data.data);
        } catch (error) {
            console.error('Error fetching users', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const data = {
                ...formData,
                assigned_to: formData.assigned_to || null
            };

            if (lead) {
                await axiosClient.put(`/leads/${lead.id}`, data);
                showToast('success', 'Aday kaydı güncellendi');
            } else {
                await axiosClient.post('/leads', data);
                showToast('success', 'Yeni aday kaydı oluşturuldu');
            }
            onSuccess();
        } catch (error: any) {
            const message = error.response?.data?.message || 'İşlem başarısız';
            showToast('error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{lead ? 'Aday Kaydı Düzenle' : 'Yeni Aday Kaydı'}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Ad Soyad *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Telefon (05XXXXXXXXX) *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder="05XXXXXXXXX"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">E-posta</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Durum</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="new">Yeni Başvuru</option>
                                        <option value="contacted">İletişime Geçildi</option>
                                        <option value="qualified">Olumlu / Potansiyel</option>
                                        <option value="converted">Kayıt Yapıldı</option>
                                        <option value="lost">Olumsuz / Kayıt Alınamadı</option>
                                    </select>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Kaynak (Instagram, Tavsiye vb.)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Atanan Personel</label>
                                    <select
                                        className="form-select"
                                        value={formData.assigned_to}
                                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                                    >
                                        <option value="">Seçiniz</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label">Görüşme Notları</label>
                                    <textarea
                                        className="form-control"
                                        rows={4}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Kaydediliyor...' : (lead ? 'Güncelle' : 'Kaydet')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LeadForm;
