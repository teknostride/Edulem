import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Lesson {
    id: number;
    name: string;
}

interface Classroom {
    id: number;
    name: string;
}

interface Teacher {
    id: number;
    name: string;
}

interface CurriculumFormState {
    lesson_id: number;
    classroom_id: number | '';
    teacher_id: number;
    teaching_date: string;
    topic: string;
    topic_description: string;
    lesson_hour: number;
    notes: string;
    materials: string; // Will be converted to array
    activities: string; // Will be converted to array
    is_completed: boolean;
}

const CurriculumForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    const [form, setForm] = useState<CurriculumFormState>({
        lesson_id: 0,
        classroom_id: '',
        teacher_id: 0,
        teaching_date: new Date().toISOString().split('T')[0],
        topic: '',
        topic_description: '',
        lesson_hour: 1,
        notes: '',
        materials: '',
        activities: '',
        is_completed: true
    });

    useEffect(() => {
        fetchInitialData();
        if (id) fetchRecord();
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [lessonsRes, classroomsRes, teachersRes] = await Promise.all([
                axiosClient.get('/lessons'),
                axiosClient.get('/classrooms'),
                axiosClient.get('/users?role=Öğretmen,Sınıf Öğretmeni&per_page=100')
            ]);
            setLessons(lessonsRes.data.data);
            setClassrooms(classroomsRes.data.data);
            setTeachers(teachersRes.data.data.users || teachersRes.data.data);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
        }
    };

    const fetchRecord = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/curriculum-tracking/${id}`);
            const data = response.data.data;
            setForm({
                ...data,
                lesson_id: data.lesson?.id || 0,
                classroom_id: data.classroom?.id || '',
                teacher_id: data.teacher?.id || 0,
                teaching_date: data.teaching_date ? new Date(data.teaching_date).toISOString().split('T')[0] : '',
                materials: Array.isArray(data.materials) ? data.materials.join(', ') : '',
                activities: Array.isArray(data.activities) ? data.activities.join(', ') : ''
            });
        } catch (error) {
            showToast('error', 'Kayıt yüklenemedi');
            navigate('/academic/curriculum');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.lesson_id || !form.teacher_id || !form.topic || !form.teaching_date) {
            showToast('error', 'Lütfen zorunlu alanları doldurun');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                ...form,
                materials: form.materials ? form.materials.split(',').map(s => s.trim()).filter(s => s !== '') : [],
                activities: form.activities ? form.activities.split(',').map(s => s.trim()).filter(s => s !== '') : []
            };

            if (id) {
                await axiosClient.put(`/curriculum-tracking/${id}`, payload);
                showToast('success', 'Kayıt güncellendi');
            } else {
                await axiosClient.post('/curriculum-tracking', payload);
                showToast('success', 'Kayıt oluşturuldu');
            }
            navigate('/academic/curriculum');
        } catch (error) {
            showToast('error', 'İşlem başarısız');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let val: any = value;
        if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;
        if (['lesson_id', 'classroom_id', 'teacher_id', 'lesson_hour'].includes(name)) {
            val = value === '' ? '' : Number(value);
        }

        setForm(prev => ({ ...prev, [name]: val }));
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">{id ? 'Kaydı Düzenle' : 'Yeni Müfredat Kaydı'}</h4>
                    <p className="text-muted small mb-0">İşlenen ders konusunu ve ayrıntılarını kaydedin</p>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/academic/curriculum')}>
                    <i className="ti ti-arrow-left me-1"></i> Geri Dön
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    <div className="col-md-8">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h6 className="mb-0">Ders ve Konu Bilgileri</h6>
                            </div>
                            <div className="card-body">
                                <div className="mb-4">
                                    <label className="form-label">İşlenen Konu *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="topic"
                                        value={form.topic}
                                        onChange={handleInputChange}
                                        placeholder="Örn: Newton Hareket Yasaları"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Konu Açıklaması</label>
                                    <textarea
                                        className="form-control"
                                        rows={4}
                                        name="topic_description"
                                        value={form.topic_description}
                                        onChange={handleInputChange}
                                        placeholder="Konu kapsamı ve detayları..."
                                    />
                                </div>
                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label">Kullanılan Materyaller</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="materials"
                                            value={form.materials}
                                            onChange={handleInputChange}
                                            placeholder="Kitap, Slayt, Deney seti... (Virgülle ayırın)"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Yapılan Etkinlikler</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="activities"
                                            value={form.activities}
                                            onChange={handleInputChange}
                                            placeholder="Grup çalışması, Soru-Cevap... (Virgülle ayırın)"
                                        />
                                    </div>
                                </div>
                                <div className="mb-0">
                                    <label className="form-label">Planlama Notları</label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        name="notes"
                                        value={form.notes}
                                        onChange={handleInputChange}
                                        placeholder="Bir sonraki ders için hatırlatmalar..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h6 className="mb-0">Uygulama Detayları</h6>
                            </div>
                            <div className="card-body">
                                <div className="mb-3">
                                    <label className="form-label">Tarih *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="teaching_date"
                                        value={form.teaching_date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Ders Saati</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="lesson_hour"
                                        value={form.lesson_hour}
                                        onChange={handleInputChange}
                                        min="1"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Ders *</label>
                                    <select className="form-select" name="lesson_id" value={form.lesson_id} onChange={handleInputChange} required>
                                        <option value="">Ders Seçin...</option>
                                        {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Sınıf</label>
                                    <select className="form-select" name="classroom_id" value={form.classroom_id} onChange={handleInputChange}>
                                        <option value="">Sınıf Seçin...</option>
                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Öğretmen *</label>
                                    <select className="form-select" name="teacher_id" value={form.teacher_id} onChange={handleInputChange} required>
                                        <option value="">Öğretmen Seçin...</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-check form-switch mt-4">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        name="is_completed"
                                        checked={form.is_completed}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label">Tamamlandı mı?</label>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <button type="submit" className="btn btn-primary w-100 mb-2" disabled={submitting}>
                                    {submitting ? 'Kaydediliyor...' : 'Kaydı Kaydet'}
                                </button>
                                <button type="button" className="btn btn-outline-secondary w-100" onClick={() => navigate('/academic/curriculum')}>
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CurriculumForm;
