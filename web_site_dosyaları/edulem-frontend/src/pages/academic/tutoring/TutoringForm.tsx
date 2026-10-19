import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';

const TutoringForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [lessons, setLessons] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [homeworks, setHomeworks] = useState<any[]>([]);

    // Öğrenci arama ve sınıf filtreleme state'leri
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedClassFilter, setSelectedClassFilter] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        type: 'tutoring',
        lesson_id: '',
        teacher_id: '',
        date: '',
        start_time: '',
        end_time: '',
        duration: 40,
        room: '',
        remote_link: '',
        max_students: 20,
        weekly_max_count: 5,
        homework_id: '',
        notes: '',
        student_ids: [] as number[],
        is_active: true
    });

    useEffect(() => {
        fetchDropdowns();
        if (isEdit) fetchSession();
    }, [id]);

    const fetchDropdowns = async () => {
        try {
            const [lRes, tRes, hRes, sRes, cRes] = await Promise.all([
                axiosClient.get('/lessons?per_page=200'),
                axiosClient.get('/users?role_id=5&per_page=200'),
                axiosClient.get('/homework'),
                axiosClient.get('/students?per_page=5000&is_active=1'),
                axiosClient.get('/classrooms?per_page=500')
            ]);

            const lessonData = lRes.data?.data?.lessons ?? lRes.data?.data?.data ?? lRes.data?.data ?? lRes.data;
            const lessonList = Array.isArray(lessonData) ? lessonData : [];
            const lessonSorted = [...lessonList].sort((a: any, b: any) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'tr'));
            setLessons(lessonSorted);

            const teacherData = tRes.data?.data?.users ?? tRes.data?.data ?? tRes.data;
            const teacherList = Array.isArray(teacherData) ? teacherData : [];
            const teacherSorted = [...teacherList].sort((a: any, b: any) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'tr'));
            setTeachers(teacherSorted);

            const homeworkData = hRes.data.data?.homeworks || hRes.data.data || hRes.data;
            setHomeworks(Array.isArray(homeworkData) ? homeworkData : []);

            const studentData = sRes.data?.data?.students?.data || sRes.data?.data?.students || sRes.data?.data || sRes.data;
            const rawStudentList = Array.isArray(studentData) ? studentData : [];
            const studentSorted = [...rawStudentList].sort((a: any, b: any) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'tr'));
            setStudents(studentSorted);

            const classroomData = cRes.data?.data?.classrooms || cRes.data?.data || cRes.data;
            const classroomList = Array.isArray(classroomData) ? classroomData : [];
            const classroomSorted = [...classroomList].sort((a: any, b: any) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'tr'));
            setClassrooms(classroomSorted);
        } catch (error) {
            console.error('Dropdown verileri çekilemedi', error);
        }
    };

    const fetchSession = async () => {
        try {
            const res = await axiosClient.get(`/tutoring/${id}`);
            const data = res.data.data;
            const extractedStudentIds = Array.isArray(data.students)
                ? data.students.map((s: any) => typeof s === 'object' ? Number(s.id) : Number(s))
                : (Array.isArray(data.student_ids) ? data.student_ids.map(Number) : []);

            const parseTime = (val: any) => {
                if (!val) return '';
                const str = String(val);
                if (str.length === 5) return str;
                if (str.length === 8 && str.includes(':')) return str.substring(0, 5);
                if (str.includes('T') || str.includes(' ')) {
                    const timePart = str.split(/[T ]/)[1];
                    return timePart ? timePart.substring(0, 5) : '';
                }
                return str.substring(0, 5);
            };

            setFormData({
                ...data,
                date: data.date ? data.date.substring(0, 10) : '',
                start_time: parseTime(data.start_time),
                end_time: parseTime(data.end_time),
                lesson_id: data.lesson?.id || data.lesson_id || '',
                teacher_id: data.teacher?.id || data.teacher_id || '',
                homework_id: data.homework?.id || data.homework_id || '',
                student_ids: extractedStudentIds
            });
        } catch (error) {
            showToast('error', 'Oturum bilgileri yüklenemedi');
        } finally {
            setFetching(false);
        }
    };

    // Filtrelenmiş öğrenci listesi
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            if (selectedClassFilter) {
                const cId = student.classroom_id || student.classroom?.id;
                if (String(cId) !== String(selectedClassFilter)) {
                    return false;
                }
            }

            if (studentSearch.trim()) {
                const query = studentSearch.trim().toLocaleLowerCase('tr');
                const nameMatch = (student.name || '').toLocaleLowerCase('tr').includes(query);
                const noMatch = String(student.school_no || '').includes(query);
                const classMatch = (student.classroom?.name || '').toLocaleLowerCase('tr').includes(query);
                if (!nameMatch && !noMatch && !classMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [students, selectedClassFilter, studentSearch]);

    // Öğrenci tekli seçim toggle
    const handleToggleStudent = (studentId: number) => {
        setFormData(prev => {
            const exists = prev.student_ids.includes(studentId);
            return {
                ...prev,
                student_ids: exists
                    ? prev.student_ids.filter(id => id !== studentId)
                    : [...prev.student_ids, studentId]
            };
        });
    };

    // Filtredeki tüm öğrencileri seç
    const handleSelectFilteredStudents = () => {
        const idsToAdd = filteredStudents.map(s => Number(s.id));
        setFormData(prev => {
            const merged = Array.from(new Set([...prev.student_ids, ...idsToAdd]));
            return { ...prev, student_ids: merged };
        });
        showToast('success', `${idsToAdd.length} öğrenci seçildi`);
    };

    // Filtredeki öğrencilerin seçimini kaldır
    const handleDeselectFilteredStudents = () => {
        const idsToRemove = new Set(filteredStudents.map(s => Number(s.id)));
        setFormData(prev => ({
            ...prev,
            student_ids: prev.student_ids.filter(id => !idsToRemove.has(id))
        }));
        showToast('info', 'Filtredeki öğrencilerin seçimi kaldırıldı');
    };

    // Tüm seçimi temizle
    const handleClearAllStudents = () => {
        setFormData(prev => ({ ...prev, student_ids: [] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEdit) {
                await axiosClient.put(`/tutoring/${id}`, formData);
                showToast('success', 'Oturum güncellendi');
            } else {
                await axiosClient.post('/tutoring', formData);
                showToast('success', 'Oturum başarıyla oluşturuldu');
            }
            navigate('/academic/tutoring');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    const isOverCapacity = Boolean(formData.max_students && formData.student_ids.length > formData.max_students);

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">{isEdit ? 'Oturumu Düzenle' : 'Yeni Etüt/Özel Ders Oluştur'}</h4>
                <p className="text-muted">Gerekli bilgileri doldurarak oturumu kaydedin.</p>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-9">
                    <form onSubmit={handleSubmit} className="card border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="form-label fw-semibold">Oturum Başlığı <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Örn: Matematik Soru Çözümü"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Oturum Tipi</label>
                                    <select
                                        className="form-select"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="tutoring">Grup Etüt</option>
                                        <option value="extra_lesson">Ek Ders</option>
                                        <option value="private_lesson">Özel Ders</option>
                                        <option value="class_tutoring">Sınıf Etütü</option>
                                        <option value="seminar">Seminer</option>
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Ders <span className="text-danger">*</span></label>
                                    <select
                                        className="form-select"
                                        value={formData.lesson_id}
                                        onChange={e => setFormData({ ...formData, lesson_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Ders Seçin</option>
                                        {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Öğretmen <span className="text-danger">*</span></label>
                                    <select
                                        className="form-select"
                                        value={formData.teacher_id}
                                        onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Öğretmen Seçin</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Tarih <span className="text-danger">*</span></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Başlangıç Saati <span className="text-danger">*</span></label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Bitiş Saati <span className="text-danger">*</span></label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Süre (Dakika) <span className="text-danger">*</span></label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                        min="15"
                                        max="240"
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Sınıf/Lokal</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Örn: A-101"
                                        value={formData.room}
                                        onChange={e => setFormData({ ...formData, room: e.target.value })}
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">Kontenjan (Öğrenci Sayısı)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={formData.max_students}
                                        onChange={e => setFormData({ ...formData, max_students: parseInt(e.target.value) || 0 })}
                                        min="1"
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-semibold">İlgili Ödev (Opsiyonel)</label>
                                    <select
                                        className="form-select"
                                        value={formData.homework_id}
                                        onChange={e => setFormData({ ...formData, homework_id: e.target.value })}
                                    >
                                        <option value="">Seçilmedi</option>
                                        {homeworks.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
                                    </select>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label fw-semibold">Online Ders Linki (Eğer Varsa)</label>
                                    <input
                                        type="url"
                                        className="form-control"
                                        placeholder="https://zoom.us/..."
                                        value={formData.remote_link}
                                        onChange={e => setFormData({ ...formData, remote_link: e.target.value })}
                                    />
                                </div>

                                {/* ÖĞRENCİ SEÇİM ALANI */}
                                <div className="col-12 mt-4">
                                    <div className="card border bg-light-subtle shadow-none">
                                        <div className="card-header bg-white border-bottom py-3">
                                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                                <div>
                                                    <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-primary">
                                                        <i className="ti ti-users fs-5"></i>
                                                        Öğrenci Seçimi (Etüt Kaydı İçin)
                                                    </h6>
                                                    <small className="text-muted">
                                                        Öğrenci adı, okul numarası veya sınıf bazlı arama yapabilir; tek tıkla toplu sınıf ekleyebilirsiniz.
                                                    </small>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className={`badge ${isOverCapacity ? 'bg-danger' : 'bg-primary'} fs-7 px-3 py-2 rounded-pill`}>
                                                        Seçilen: {formData.student_ids.length} / Kontenjan: {formData.max_students || 'Limitsiz'}
                                                    </span>
                                                    {formData.student_ids.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={handleClearAllStudents}
                                                        >
                                                            <i className="ti ti-trash me-1"></i> Tümünü Kaldır
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="card-body p-3">
                                            {/* Filtre ve Arama Çubuğu */}
                                            <div className="row g-2 mb-3 align-items-end">
                                                <div className="col-md-4">
                                                    <label className="form-label small fw-semibold text-muted mb-1">
                                                        <i className="ti ti-building me-1"></i> Sınıfa Göre Filtrele
                                                    </label>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={selectedClassFilter}
                                                        onChange={e => setSelectedClassFilter(e.target.value)}
                                                    >
                                                        <option value="">Tüm Sınıflar ({students.length} Öğrenci)</option>
                                                        {classrooms.map(c => {
                                                            const count = students.filter(s => s.classroom_id === c.id || s.classroom?.id === c.id).length;
                                                            return (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.name} {count > 0 ? `(${count} öğrenci)` : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <div className="col-md-5">
                                                    <label className="form-label small fw-semibold text-muted mb-1">
                                                        <i className="ti ti-search me-1"></i> Öğrenci Adı / No Ara
                                                    </label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text bg-white border-end-0">
                                                            <i className="ti ti-search text-muted"></i>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className="form-control border-start-0"
                                                            placeholder="İsim veya okul numarası yazın..."
                                                            value={studentSearch}
                                                            onChange={e => setStudentSearch(e.target.value)}
                                                        />
                                                        {studentSearch && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setStudentSearch('')}
                                                            >
                                                                <i className="ti ti-x"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="col-md-3 d-flex gap-1">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm flex-fill"
                                                        onClick={handleSelectFilteredStudents}
                                                        disabled={filteredStudents.length === 0}
                                                        title="Filtrelenen tüm öğrencileri seç"
                                                    >
                                                        <i className="ti ti-check-all me-1"></i>
                                                        {selectedClassFilter ? 'Sınıfı Ekle' : 'Filtreyi Ekle'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={handleDeselectFilteredStudents}
                                                        disabled={filteredStudents.length === 0}
                                                        title="Filtredeki öğrencilerin seçimini kaldır"
                                                    >
                                                        <i className="ti ti-minus me-1"></i>
                                                        Çıkar
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Kontenjan Aşımı Uyarısı */}
                                            {isOverCapacity && (
                                                <div className="alert alert-warning py-2 px-3 small mb-3 d-flex align-items-center">
                                                    <i className="ti ti-alert-triangle fs-5 me-2 text-warning"></i>
                                                    <span>Dikkat: Seçilen öğrenci sayısı ({formData.student_ids.length}), belirlenen kontenjanı ({formData.max_students}) aşıyor.</span>
                                                </div>
                                            )}

                                            {/* Seçilmiş Öğrenciler Listesi (Etiketler) */}
                                            {formData.student_ids.length > 0 && (
                                                <div className="mb-3 p-2 bg-white rounded border">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span className="small fw-semibold text-muted">
                                                            <i className="ti ti-user-check me-1 text-success"></i>
                                                            Seçilmiş Öğrenciler ({formData.student_ids.length}):
                                                        </span>
                                                    </div>
                                                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                                                        {formData.student_ids.map(id => {
                                                            const student = students.find(s => s.id === id);
                                                            if (!student) return null;
                                                            return (
                                                                <span
                                                                    key={id}
                                                                    className="badge bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-1 py-1 px-2 rounded-pill font-size-12"
                                                                >
                                                                    <span>{student.name}</span>
                                                                    {student.school_no && <span className="opacity-75">#{student.school_no}</span>}
                                                                    {student.classroom?.name && (
                                                                        <span className="badge bg-light text-dark ms-1 py-0 px-1 border">
                                                                            {student.classroom.name}
                                                                        </span>
                                                                    )}
                                                                    <i
                                                                        className="ti ti-x ms-1 text-danger cursor-pointer"
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => handleToggleStudent(id)}
                                                                        title="Kaldır"
                                                                    ></i>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Öğrenci Seçim Listesi */}
                                            <div className="border rounded bg-white" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                                {filteredStudents.length === 0 ? (
                                                    <div className="text-center py-4 text-muted small">
                                                        <i className="ti ti-search-off fs-3 d-block mb-1 opacity-50"></i>
                                                        Aramanıza veya seçilen sınıfa uygun öğrenci bulunamadı.
                                                    </div>
                                                ) : (
                                                    <div className="list-group list-group-flush">
                                                        {filteredStudents.map(student => {
                                                            const isSelected = formData.student_ids.includes(student.id);
                                                            return (
                                                                <div
                                                                    key={student.id}
                                                                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3 ${isSelected ? 'bg-primary-subtle' : ''}`}
                                                                    style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                                                                    onClick={() => handleToggleStudent(student.id)}
                                                                >
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input mt-0"
                                                                            checked={isSelected}
                                                                            onChange={() => {}} // parent onClick yönetiyor
                                                                        />
                                                                        <span className={`fw-medium ${isSelected ? 'text-primary' : 'text-dark'}`}>
                                                                            {student.name}
                                                                        </span>
                                                                        {student.school_no && (
                                                                            <span className="badge bg-secondary-subtle text-secondary py-0 px-1">
                                                                                No: {student.school_no}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        {student.classroom?.name ? (
                                                                            <span className="badge bg-info-subtle text-info border border-info-subtle">
                                                                                {student.classroom.name}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted small">-</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mt-2 px-1">
                                                <small className="text-muted">
                                                    {filteredStudents.length} öğrenci listeleniyor (Toplam {students.length})
                                                </small>
                                                <small className="text-muted">
                                                    Öğrenciye tıklayarak seçebilir veya kaldırabilirsiniz.
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-12 mt-3">
                                    <label className="form-label fw-semibold">Öğretmen Notları</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        placeholder="Etüt konusu, kazanımlar veya oturumla ilgili özel notlar..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="col-md-12">
                                    <div className="form-check form-switch mt-2">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <label className="form-check-label fw-semibold" htmlFor="isActive">Oturum Aktif mi?</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-top p-3 d-flex justify-content-between">
                            <button type="button" className="btn btn-light" onClick={() => navigate('/academic/tutoring')}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary px-4" disabled={loading}>
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

export default TutoringForm;
