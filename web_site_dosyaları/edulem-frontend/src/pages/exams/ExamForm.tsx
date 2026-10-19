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

interface Exam {
    id?: number;
    lesson_id: number;
    classroom_id: number | null;
    type: string;
    exam_date: string;
    exam_time: string;
    duration: number;
    is_active: boolean;
    is_optical_form: boolean;
    notes: string;
}

const ExamForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);

    const [exam, setExam] = useState<Exam>({
        lesson_id: 0,
        classroom_id: null,
        type: 'Yazılı',
        exam_date: new Date().toISOString().split('T')[0],
        exam_time: '09:00',
        duration: 40,
        is_active: true,
        is_optical_form: false,
        notes: '',
    });

    const examTypes = ['Yazılı', 'Sözlü', 'Deneme', 'Quiz', 'Proje', 'Ödev'];

    useEffect(() => {
        fetchDropdownData();
        if (id) {
            fetchExam();
        }
    }, [id]);

    const fetchDropdownData = async () => {
        try {
            const [lessonsRes, classroomsRes] = await Promise.all([
                axiosClient.get('/lessons'),
                axiosClient.get('/classrooms'),
            ]);
            setLessons(lessonsRes.data.data);
            setClassrooms(classroomsRes.data.data);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
            showToast('error', 'Veriler yüklenemedi');
        }
    };

    const fetchExam = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/exams/${id}`);
            const data = response.data.data;
            setExam({
                ...data,
                exam_date: data.exam_date.split(' ')[0],
                exam_time: data.exam_date.split(' ')[1]?.substring(0, 5) || '09:00',
            });
        } catch (error) {
            console.error('Sınav yüklenemedi:', error);
            showToast('error', 'Sınav yüklenemedi');
            navigate('/academic/exams');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!exam.lesson_id || !exam.exam_date || !exam.exam_time) {
            showToast('error', 'Lütfen zorunlu alanları doldurun');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                ...exam,
                exam_date: `${exam.exam_date} ${exam.exam_time}:00`,
            };

            if (id) {
                await axiosClient.put(`/exams/${id}`, payload);
                showToast('success', 'Sınav başarıyla güncellendi');
            } else {
                await axiosClient.post('/exams', payload);
                showToast('success', 'Sınav başarıyla oluşturuldu');
            }

            navigate('/academic/exams');
        } catch (error) {
            console.error('İşlem başarısız:', error);
            showToast('error', id ? 'Sınav güncellenemedi' : 'Sınav oluşturulamadı');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let val: any = value;

        if (type === 'checkbox') {
            val = (e.target as HTMLInputElement).checked;
        } else if (name === 'lesson_id' || name === 'classroom_id' || name === 'duration') {
            val = value === "" ? null : Number(value);
        }

        setExam(prev => ({
            ...prev,
            [name]: val
        }));
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">
                        {id ? 'Sınav Düzenle' : 'Yeni Sınav Oluştur'}
                    </h4>
                    <small className="text-muted">
                        {id ? 'Mevcut sınav bilgilerini güncelleyin' : 'Akademik takvime yeni bir sınav ekleyin'}
                    </small>
                </div>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/academic/exams')}
                >
                    <i className="ti ti-arrow-left me-1"></i>
                    Geri Dön
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="lesson_id" className="form-label">Ders *</label>
                                    <select
                                        className="form-select"
                                        id="lesson_id"
                                        name="lesson_id"
                                        value={exam.lesson_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Ders seçin...</option>
                                        {lessons.map((lesson) => (
                                            <option key={lesson.id} value={lesson.id}>
                                                {lesson.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="classroom_id" className="form-label">Sınıf (Opsiyonel)</label>
                                    <select
                                        className="form-select"
                                        id="classroom_id"
                                        name="classroom_id"
                                        value={exam.classroom_id || ''}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Tüm sınıflar (Deneme/Genel sınav)</option>
                                        {classrooms.map((classroom) => (
                                            <option key={classroom.id} value={classroom.id}>
                                                {classroom.name}
                                            </option>
                                        ))}
                                    </select>
                                    <small className="text-muted">Özel bir sınıf seçilmezse tüm seviyeyi kapsar.</small>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label htmlFor="type" className="form-label">Sınav Türü *</label>
                                            <select
                                                className="form-select"
                                                id="type"
                                                name="type"
                                                value={exam.type}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                {examTypes.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label htmlFor="duration" className="form-label">Süre (Dk) *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                id="duration"
                                                name="duration"
                                                value={exam.duration}
                                                onChange={handleInputChange}
                                                required
                                                min="5"
                                                max="300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label htmlFor="exam_date" className="form-label">Sınav Tarihi *</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                id="exam_date"
                                                name="exam_date"
                                                value={exam.exam_date}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label htmlFor="exam_time" className="form-label">Saat *</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                id="exam_time"
                                                name="exam_time"
                                                value={exam.exam_time}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="notes" className="form-label">Açıklama / Notlar</label>
                                    <textarea
                                        className="form-control"
                                        id="notes"
                                        name="notes"
                                        value={exam.notes}
                                        onChange={handleInputChange}
                                        rows={4}
                                        placeholder="Sınav kapsamı, gereken materyaller vb."
                                    />
                                </div>

                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="is_active"
                                        name="is_active"
                                        checked={exam.is_active}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label" htmlFor="is_active">
                                        Sınav yayında (Veliler ve öğrenciler görebilir)
                                    </label>
                                </div>

                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="is_optical_form"
                                        name="is_optical_form"
                                        checked={exam.is_optical_form}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label" htmlFor="is_optical_form">
                                        Optik Form Kullanılacak
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        {id ? 'Güncelleniyor...' : 'Kaydediliyor...'}
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-device-floppy me-1"></i>
                                        {id ? 'Güncelle' : 'Kaydet'}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate('/academic/exams')}
                                disabled={submitting}
                            >
                                İptal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ExamForm;
