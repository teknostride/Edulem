import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface User {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
}

interface StaffAssignmentFormProps {
    assignment?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const StaffAssignmentForm: React.FC<StaffAssignmentFormProps> = ({ assignment, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_to: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        status: 'pending',
        progress_percentage: 0
    });
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
        if (assignment) {
            setFormData({
                title: assignment.title,
                description: assignment.description || '',
                assigned_to: assignment.assigned_to_user.id.toString(),
                due_date: assignment.due_date.substring(0, 10),
                priority: assignment.priority,
                status: assignment.status,
                progress_percentage: assignment.progress_percentage
            });
        }
    }, [assignment]);

    const fetchUsers = async () => {
        try {
            const response = await axiosClient.get('/users');
            // Assuming data structure matches UserList.tsx learnings
            const data = response.data?.data?.users || response.data?.data || [];
            const mappedUsers = data.map((u: any) => ({
                id: u.id,
                name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
            }));
            setUsers(mappedUsers);
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
                assigned_to: parseInt(formData.assigned_to)
            };

            if (assignment) {
                await axiosClient.put(`/staff-assignments/${assignment.id}`, data);
                showToast('success', 'Görev güncellendi');
            } else {
                await axiosClient.post('/staff-assignments', data);
                showToast('success', 'Görev atandı');
            }
            onSuccess();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title text-primary">
                            <i className="ti ti-briefcase me-1"></i>
                            {assignment ? 'Görevi Düzenle' : 'Yeni Görev Ata'}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-12 mb-3">
                                    <label className="form-label">Görev Başlığı *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        required
                                        placeholder="Örn: Hafta sonu deneme sınavı hazırlığı"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label">Açıklama</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        placeholder="Görevle ilgili detaylar..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Atanan Personel *</label>
                                    <select
                                        className="form-select"
                                        required
                                        value={formData.assigned_to}
                                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                                    >
                                        <option value="">Seçiniz</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Son Tarih *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        required
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Öncelik</label>
                                    <select
                                        className="form-select"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                    >
                                        <option value="low">Düşük</option>
                                        <option value="medium">Orta</option>
                                        <option value="high">Yüksek</option>
                                        <option value="urgent">Acil</option>
                                    </select>
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Durum</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="pending">Beklemede</option>
                                        <option value="in_progress">Devam Ediyor</option>
                                        <option value="completed">Tamamlandı</option>
                                        <option value="cancelled">İptal Edildi</option>
                                    </select>
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">İlerleme (%)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="0"
                                        max="100"
                                        value={formData.progress_percentage}
                                        onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Atanıyor...' : 'Görevi Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StaffAssignmentForm;
