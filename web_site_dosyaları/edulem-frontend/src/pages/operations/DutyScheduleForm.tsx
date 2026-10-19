import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

const DutyScheduleForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [users, setUsers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        user_id: '',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '17:00',
        location: '',
        is_active: true
    });

    const [conflict, setConflict] = useState<any>(null);

    useEffect(() => {
        fetchUsers();
        if (isEdit) {
            fetchSchedule();
        }
    }, [id]);

    useEffect(() => {
        if (formData.user_id && formData.day_of_week && formData.start_time && formData.end_time) {
            checkConflict();
        }
    }, [formData.user_id, formData.day_of_week, formData.start_time, formData.end_time]);

    const fetchUsers = async () => {
        try {
            const res = await axiosClient.get('/users?duty_assignable=1&per_page=200');
            setUsers(res.data.data.items || res.data.data);
        } catch (error) {
            console.error('Öğretmenler yüklenemedi');
        }
    };

    const fetchSchedule = async () => {
        try {
            const res = await axiosClient.get(`/duty-schedules/${id}`);
            const data = res.data.data;
            setFormData({
                user_id: data.user_id,
                day_of_week: data.day_of_week,
                start_time: data.start_time.substring(0, 5),
                end_time: data.end_time.substring(0, 5),
                location: data.location || '',
                is_active: data.is_active
            });
        } catch (error) {
            showToast('error', 'Nöbet bilgileri yüklenemedi');
            navigate('/operations/duty-schedules');
        } finally {
            setFetching(false);
        }
    };

    const checkConflict = async () => {
        try {
            const res = await axiosClient.post('/duty-schedules/check-conflict', {
                user_id: formData.user_id,
                day_of_week: formData.day_of_week,
                start_time: formData.start_time,
                end_time: formData.end_time
            });
            if (res.data.data.has_conflict) {
                // Filter out current schedule if editing
                const otherConflicts = isEdit
                    ? res.data.data.conflicts.filter((c: any) => c.id !== parseInt(id))
                    : res.data.data.conflicts;

                if (otherConflicts.length > 0) {
                    setConflict(otherConflicts[0]);
                } else {
                    setConflict(null);
                }
            } else {
                setConflict(null);
            }
        } catch (error) {
            console.error('Çakışma kontrolü başarısız');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (conflict) {
            const ok = await confirmDialog({
                title: 'Çakışma Uyarısı',
                text: 'Bu saatlerde öğretmenin başka bir nöbeti bulunuyor. Yine de devam etmek istiyor musunuz?',
                confirmText: 'Devam Et',
                cancelText: 'İptal',
                icon: 'warning',
            });
            if (!ok) return;
        }

        setLoading(true);
        try {
            if (isEdit) {
                await axiosClient.put(`/duty-schedules/${id}`, formData);
                showToast('success', 'Nöbet görevi güncellendi');
            } else {
                await axiosClient.post('/duty-schedules', formData);
                showToast('success', 'Nöbet görevi oluşturuldu');
            }
            navigate('/operations/duty-schedules');
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
                <h4 className="page-title">{isEdit ? 'Nöbet Düzenle' : 'Yeni Nöbet Görevi'}</h4>
                <p className="text-muted">Öğretmen için haftalık nöbet zamanını ve yerini tanımlayın.</p>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-6">
                    <form onSubmit={handleSubmit} className="card border-0 shadow-sm">
                        <div className="card-body">
                            {conflict && (
                                <div className="alert alert-warning mb-4">
                                    <div className="d-flex align-items-center">
                                        <i className="ti ti-alert-triangle fs-4 me-2"></i>
                                        <div>
                                            <strong>Çakışma Uyarısı!</strong><br />
                                            Bu öğretmenin {conflict.start_time.substring(0, 5)} - {conflict.end_time.substring(0, 5)} saatleri arasında <strong>{conflict.location || 'belirsiz'}</strong> noktasında zaten bir nöbeti bulunuyor.
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="form-label">Öğretmen</label>
                                    <select
                                        className="form-select"
                                        value={formData.user_id}
                                        onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Öğretmen Seçin...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Gün</label>
                                    <select
                                        className="form-select"
                                        value={formData.day_of_week}
                                        onChange={e => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                                        required
                                    >
                                        <option value={1}>Pazartesi</option>
                                        <option value={2}>Salı</option>
                                        <option value={3}>Çarşamba</option>
                                        <option value={4}>Perşembe</option>
                                        <option value={5}>Cuma</option>
                                        <option value={6}>Cumartesi</option>
                                        <option value={7}>Pazar</option>
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Başlangıç Saati</label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Bitiş Saati</label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Nöbet Yeri / Bölgesi</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Örn: Bahçe, Kantin Katı, A Blok 1. Kat"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>

                                <div className="col-md-12">
                                    <div className="form-check form-switch mt-2">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isActiveDuty"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <label className="form-check-label" htmlFor="isActiveDuty">Nöbet Görevi Aktif</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-top p-3 d-flex justify-content-between">
                            <button type="button" className="btn btn-light" onClick={() => navigate('/operations/duty-schedules')}>Vazgeç</button>
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

export default DutyScheduleForm;
