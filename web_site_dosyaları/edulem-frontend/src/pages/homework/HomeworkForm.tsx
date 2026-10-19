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

interface Student {
    id: number;
    name: string;
    school_no?: string;
}

interface Homework {
    id?: number;
    title: string;
    description: string;
    lesson_id: number;
    lesson?: { id: number; name: string };
    classroom_id: number;
    classroom?: { id: number; name: string };
    assignment_mode: 'all_class' | 'selected_students';
    assigned_student_ids: number[];
    teacher_id: number;
    due_date: string;
    is_active: boolean;
}

interface ExistingHomework {
    id: number;
    title: string;
    description?: string;
    lesson_name?: string;
    due_date: string;
    teacher_name?: string;
}

const HomeworkForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [lessonClassrooms, setLessonClassrooms] = useState<Record<number, number[]>>({});
    const [students, setStudents] = useState<Student[]>([]);
    const [existingHomework, setExistingHomework] = useState<ExistingHomework[]>([]);
    const [loadingExisting, setLoadingExisting] = useState(false);

    const [homework, setHomework] = useState<Homework>({
        title: '',
        description: '',
        lesson_id: 0,
        lesson: undefined,
        classroom_id: 0,
        classroom: undefined,
        assignment_mode: 'all_class',
        assigned_student_ids: [],
        teacher_id: 0,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 hafta sonra
        is_active: true,
    });

    useEffect(() => {
        fetchDropdownData();
        if (id) {
            fetchHomework();
        } else {
            // Logged in user sets the teacher_id
            const userData = localStorage.getItem('USER_DATA');
            if (userData) {
                const user = JSON.parse(userData);
                setHomework((prev: Homework) => ({ ...prev, teacher_id: user.id }));
            }
        }
    }, [id]);

    const fetchDropdownData = async () => {
        try {
            const response = await axiosClient.get('/homework/create-options');
            const raw = response.data?.data ?? response.data;

            const lessonsList = Array.isArray(raw?.lessons) ? raw.lessons : [];
            const classroomsList = Array.isArray(raw?.classrooms) ? raw.classrooms : [];

            setLessons(
                lessonsList
                    .map((l: any) => ({ id: Number(l.id), name: String(l.name || '') }))
                    .filter((l: Lesson) => Number.isFinite(l.id) && !!l.name)
                    .sort((a: Lesson, b: Lesson) => a.name.localeCompare(b.name, 'tr'))
            );

            setClassrooms(
                classroomsList
                    .map((c: any) => ({ id: Number(c.id), name: String(c.name || '') }))
                    .filter((c: Classroom) => Number.isFinite(c.id) && !!c.name)
                    .sort((a: Classroom, b: Classroom) => {
                        const parse = (name: string) => {
                            const m = name.trim().match(/^(\d+)\s*[-\s]?\s*([A-Za-zÇĞİÖŞÜçğıöşü])?\b/);
                            if (!m) return { n: Number.POSITIVE_INFINITY, s: name.trim().toLowerCase() };
                            const n = Number.parseInt(m[1], 10);
                            const section = (m[2] ?? '').toString().toLowerCase();
                            return { n: Number.isFinite(n) ? n : Number.POSITIVE_INFINITY, s: section };
                        };
                        const pa = parse(a.name);
                        const pb = parse(b.name);
                        if (pa.n !== pb.n) return pa.n - pb.n;
                        return pa.s.localeCompare(pb.s, 'tr');
                    })
            );
            const rawMap = raw?.lesson_classrooms ?? {};
            const map: Record<number, number[]> = {};
            if (rawMap && typeof rawMap === 'object') {
                for (const [k, v] of Object.entries(rawMap)) {
                    map[Number(k)] = Array.isArray(v) ? (v as any[]).map(Number) : [];
                }
            }
            setLessonClassrooms(map);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
            showToast('error', 'Ders ve sınıf seçenekleri yüklenemedi');
        }
    };

    const fetchClassroomStudents = async (classroomId: number) => {
        if (!classroomId || !Number.isFinite(classroomId)) {
            setStudents([]);
            return;
        }

        try {
            const response = await axiosClient.get(`/homework/classrooms/${classroomId}/students`);
            const raw = response.data?.data ?? response.data;
            const studentsList = Array.isArray(raw?.students) ? raw.students : [];

            setStudents(
                studentsList
                    .map((s: any) => ({
                        id: Number(s.id),
                        name: String(s.name || ''),
                        school_no: s.school_no ? String(s.school_no) : undefined,
                    }))
                    .filter((s: Student) => Number.isFinite(s.id) && !!s.name)
            );
        } catch (error) {
            console.error('Sınıf öğrencileri yüklenemedi:', error);
            showToast('error', 'Sınıf öğrenci listesi yüklenemedi');
            setStudents([]);
        }
    };

    useEffect(() => {
        if (homework.classroom_id > 0) {
            fetchClassroomStudents(homework.classroom_id);
        } else {
            setStudents([]);
            setHomework((prev: Homework) => ({
                ...prev,
                assigned_student_ids: [],
            }));
        }
    }, [homework.classroom_id]);

    useEffect(() => {
        if (homework.classroom_id > 0 && homework.due_date) {
            fetchExistingHomework(homework.classroom_id, homework.due_date);
        } else {
            setExistingHomework([]);
        }
    }, [homework.classroom_id, homework.due_date]);

    const fetchExistingHomework = async (classroomId: number, dueDate: string) => {
        try {
            setLoadingExisting(true);
            const response = await axiosClient.get(`/homework?classroom_id=${classroomId}&due_date_from=${dueDate}&due_date_to=${dueDate}&per_page=50&check_existing=true`);
            const raw = response.data?.data ?? response.data;
            const homeworkList = Array.isArray(raw?.homeworks) ? raw.homeworks : (Array.isArray(raw) ? raw : []);

            setExistingHomework(
                homeworkList
                    .filter((h: any) => !id || h.id !== Number(id))
                    .map((h: any) => ({
                        id: Number(h.id),
                        title: String(h.title || ''),
                        description: h.description ? String(h.description) : undefined,
                        lesson_name: h.lesson?.name || h.lesson_name || '',
                        due_date: String(h.due_date || ''),
                        teacher_name: h.teacher?.name || h.teacher_name || '',
                    }))
            );
        } catch (error) {
            console.error('Mevcut ödevler yüklenemedi:', error);
            setExistingHomework([]);
        } finally {
            setLoadingExisting(false);
        }
    };

    const fetchHomework = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/homework/${id}`);
            const data = response.data.data;
            setHomework({
                ...data,
                assignment_mode: data.assignment_mode === 'selected_students' ? 'selected_students' : 'all_class',
                assigned_student_ids: Array.isArray(data.assigned_student_ids)
                    ? data.assigned_student_ids.map((s: any) => Number(s)).filter((s: number) => Number.isFinite(s))
                    : [],
                due_date: data.due_date.split(' ')[0],
            });
        } catch (error) {
            console.error('Ödev yüklenemedi:', error);
            showToast('error', 'Ödev yüklenemedi');
            navigate('/academic/homework');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!homework.title || !homework.lesson_id || !homework.classroom_id || !homework.due_date) {
            showToast('error', 'Lütfen zorunlu alanları doldurun');
            return;
        }

        if (homework.assignment_mode === 'selected_students' && homework.assigned_student_ids.length === 0) {
            showToast('error', 'Seçili öğrenciler için en az bir öğrenci seçmelisiniz');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                ...homework,
                classroom_id: homework.classroom_id ? homework.classroom_id : null,
                assigned_student_ids:
                    homework.assignment_mode === 'selected_students'
                        ? homework.assigned_student_ids
                        : [],
            };
            console.log('Homework payload:', payload);
            if (id) {
                await axiosClient.put(`/homework/${id}`, payload);
                showToast('success', 'Ödev başarıyla güncellendi');
            } else {
                await axiosClient.post('/homework', payload);
                showToast('success', 'Ödev başarıyla oluşturuldu');
            }
            navigate('/academic/homework');
        } catch (error: any) {
            console.error('İşlem başarısız:', error);
            const data = error?.response?.data;
            console.log('Homework error response:', data);

            const msg = data?.message;
            const errors = data?.errors;
            const firstError = errors && typeof errors === 'object'
                ? (Object.values(errors)[0] as any)?.[0]
                : null;

            showToast(
                'error',
                firstError ?? msg ?? (id ? 'Ödev güncellenemedi' : 'Ödev oluşturulamadı')
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let val: any = value;

        if (type === 'checkbox') {
            val = (e.target as HTMLInputElement).checked;
        } else if (name === 'lesson_id' || name === 'classroom_id' || name === 'teacher_id') {
            val = Number(value);
        }

        setHomework((prev: Homework) => {
            let nextClassroomId = prev.classroom_id;
            if (name === 'lesson_id') {
                const newLessonId = Number(value);
                const allowed = lessonClassrooms[newLessonId];
                if (allowed && Array.isArray(allowed) && !allowed.includes(nextClassroomId)) {
                    nextClassroomId = 0;
                }
            } else if (name === 'classroom_id') {
                nextClassroomId = val;
            }

            return {
                ...prev,
                ...(name === 'assignment_mode' && value === 'all_class' ? { assigned_student_ids: [] } : {}),
                ...(name === 'classroom_id' || name === 'lesson_id' ? { assigned_student_ids: [] } : {}),
                classroom_id: nextClassroomId,
                [name]: val
            };
        });
    };

    const availableClassrooms = (() => {
        if (!homework.lesson_id) return [];
        const allowed = lessonClassrooms[homework.lesson_id];
        if (allowed && Array.isArray(allowed) && allowed.length > 0) {
            return classrooms.filter((c) => allowed.includes(c.id));
        }
        return classrooms;
    })();

    const handleStudentSelection = (studentId: number, checked: boolean) => {
        setHomework((prev: Homework) => {
            const current = new Set(prev.assigned_student_ids);
            if (checked) {
                current.add(studentId);
            } else {
                current.delete(studentId);
            }
            return {
                ...prev,
                assigned_student_ids: Array.from(current),
            };
        });
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
                        {id ? 'Ödevi Düzenle' : 'Yeni Ödev Oluştur'}
                    </h4>
                    <small className="text-muted">
                        Öğrencilere yeni bir görev atayın veya mevcut olanı güncelleyin
                    </small>
                </div>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/academic/homework')}
                >
                    <i className="ti ti-arrow-left me-1"></i>
                    Geri Dön
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-8">
                                <div className="mb-3">
                                    <label htmlFor="title" className="form-label">Ödev Başlığı *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="title"
                                        name="title"
                                        value={homework.title}
                                        onChange={handleInputChange}
                                        placeholder="Örn: 2. Ünite Değerlendirme Soruları"
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="description" className="form-label">Ödev Açıklaması / Detaylar</label>
                                    <textarea
                                        className="form-control"
                                        id="description"
                                        name="description"
                                        value={homework.description}
                                        onChange={handleInputChange}
                                        rows={6}
                                        placeholder="Ödevin içeriği, sayfa numaraları vb. detayları buraya yazın..."
                                    />
                                </div>
                            </div>

                            <div className="col-md-4">
                                <div className="mb-3">
                                    <label htmlFor="lesson_id" className="form-label">Ders *</label>
                                    <select
                                        className="form-select"
                                        id="lesson_id"
                                        name="lesson_id"
                                        value={homework.lesson_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">
                                            {homework.lesson?.name
                                                ? `Seçili: ${homework.lesson.name}`
                                                : 'Ders seçin...'}
                                        </option>
                                        {lessons.map((lesson) => (
                                            <option key={lesson.id} value={lesson.id}>
                                                {lesson.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="classroom_id" className="form-label">Sınıf *</label>
                                    <select
                                        className="form-select"
                                        id="classroom_id"
                                        name="classroom_id"
                                        value={homework.classroom_id || ''}
                                        onChange={handleInputChange}
                                        required
                                        disabled={!homework.lesson_id}
                                    >
                                        <option value="">
                                            {!homework.lesson_id
                                                ? 'Önce ders seçin...'
                                                : availableClassrooms.length === 0
                                                ? 'Bu derse tanımlı sınıf bulunamadı'
                                                : 'Sınıf seçin...'}
                                        </option>
                                        {availableClassrooms.map((classroom) => (
                                            <option key={classroom.id} value={classroom.id}>
                                                {classroom.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label d-block">Atama Türü</label>
                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="assignment_mode"
                                            id="assignment_mode_all"
                                            value="all_class"
                                            checked={homework.assignment_mode === 'all_class'}
                                            onChange={handleInputChange}
                                            disabled={!homework.classroom_id}
                                        />
                                        <label className="form-check-label" htmlFor="assignment_mode_all">
                                            Tüm Sınıf
                                        </label>
                                    </div>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="assignment_mode"
                                            id="assignment_mode_selected"
                                            value="selected_students"
                                            checked={homework.assignment_mode === 'selected_students'}
                                            onChange={handleInputChange}
                                            disabled={!homework.classroom_id}
                                        />
                                        <label className="form-check-label" htmlFor="assignment_mode_selected">
                                            Seçili Öğrenciler
                                        </label>
                                    </div>
                                </div>

                                {homework.assignment_mode === 'selected_students' && homework.classroom_id > 0 && (
                                    <div className="mb-3 border rounded p-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <label className="form-label mb-0">Öğrenci Seçimi</label>
                                            <small className="text-muted">{homework.assigned_student_ids.length} öğrenci seçildi</small>
                                        </div>
                                        {students.length === 0 ? (
                                            <small className="text-muted">Bu sınıfta aktif öğrenci bulunamadı.</small>
                                        ) : (
                                            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                                {students.map((student) => (
                                                    <div className="form-check" key={student.id}>
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`student_${student.id}`}
                                                            checked={homework.assigned_student_ids.includes(student.id)}
                                                            onChange={(e) => handleStudentSelection(student.id, e.target.checked)}
                                                        />
                                                        <label className="form-check-label" htmlFor={`student_${student.id}`}>
                                                            {student.name}
                                                            {student.school_no ? ` (${student.school_no})` : ''}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label htmlFor="due_date" className="form-label">Teslim Tarihi *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        id="due_date"
                                        name="due_date"
                                        value={homework.due_date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                {loadingExisting && (
                                    <div className="mb-3">
                                        <small className="text-muted">
                                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                            Mevcut ödevler kontrol ediliyor...
                                        </small>
                                    </div>
                                )}

                                {existingHomework.length > 0 && (
                                    <div className="mb-3">
                                        <div className="alert alert-warning">
                                            <h6 className="alert-heading mb-2">
                                                <i className="ti ti-alert-circle me-1"></i>
                                                Bu Tarihte Mevcut Ödevler ({existingHomework.length})
                                            </h6>
                                            <ul className="list-unstyled mb-0" style={{ fontSize: '0.9rem' }}>
                                                {existingHomework.map((hw) => (
                                                    <li key={hw.id} className="mb-1">
                                                        <strong>{hw.title}</strong>
                                                        {hw.lesson_name && <span className="text-muted"> - {hw.lesson_name}</span>}
                                                        {hw.teacher_name && <small className="text-muted d-block">Öğretmen: {hw.teacher_name}</small>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                <div className="form-check form-switch mt-4">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="is_active"
                                        name="is_active"
                                        checked={homework.is_active}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label" htmlFor="is_active">
                                        Ödevi yayınla
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4 pt-3 border-top">
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
                                onClick={() => navigate('/academic/homework')}
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

export default HomeworkForm;
