import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Student {
    id: number;
    name: string;
    school_no: string;
    status: string;
}

const normalizeAttendanceStatus = (value: unknown): string => {
    const status = String(value || '').trim().toLowerCase();
    const map: Record<string, string> = {
        present: 'present',
        geldi: 'present',
        absent: 'absent',
        gelmedi: 'absent',
        late: 'late',
        gc: 'late',
        excused: 'excused',
        izinli: 'excused',
        sick: 'sick',
        raporlu: 'sick',
    };

    return map[status] || 'present';
};

interface Schedule {
    id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    classroom_id: number;
    classroom: {
        id: number;
        name: string;
    };
    lesson: {
        id: number;
        name: string;
    };
}

const AttendanceForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [savedScheduleIds, setSavedScheduleIds] = useState<number[]>([]);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const todayStr = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(todayStr);

    // Kullanıcı bilgileri
    const userData = (() => {
        try {
            return JSON.parse(localStorage.getItem('USER_DATA') || '{}');
        } catch {
            return {};
        }
    })();
    const userRole = localStorage.getItem('USER_ROLE') || userData.role || userData.role_name || null;
    const isTeacher =
        userRole === 'Öğretmen' ||
        userRole === 'Sınıf Öğretmeni' ||
        userRole === 'teacher' ||
        userRole === 'Rehber Öğretmen' ||
        userRole === 'rehber_teacher' ||
        userRole === 'guidance_teacher' ||
        userRole === 'Rehberlik' ||
        userRole === 'guidance' ||
        userRole === '5' ||
        userRole === '6';
    const teacherId = userData.id;

    useEffect(() => {
        void fetchSchedule();
    }, [date]);

    const shiftDate = (days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        setDate(d.toISOString().split('T')[0]);
    };

    useEffect(() => {
        if (!selectedScheduleId) {
            return;
        }
        const schedule = schedules.find((s) => s.id.toString() === selectedScheduleId);
        if (!schedule) {
            setStudents([]);
            return;
        }
        fetchStudents(schedule.classroom_id, schedule.id, date);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedScheduleId]);

    const fetchSavedScheduleIds = async (effectiveDate: string): Promise<number[]> => {
        try {
            const dailyRes = await axiosClient.get('/attendances/daily', { params: { date: effectiveDate } });
            const raw = dailyRes.data?.data ?? dailyRes.data;
            const dersler = Array.isArray(raw?.dersler) ? raw.dersler : [];

            return dersler
                .filter((d: any) => d?.yoklama_alindi)
                .map((d: any) => Number(d?.schedule_id))
                .filter((id: number) => Number.isFinite(id));
        } catch {
            return [];
        }
    };

    const fetchSchedule = async (preferredScheduleId?: string) => {
        try {
            setLoading(true);
            const effectiveDate = date;
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const todayIndex = new Date(effectiveDate).getDay();
            const dayOfWeek = days[todayIndex];

            const params: any = {
                day_of_week: dayOfWeek,
            };

            if (isTeacher) {
                params.teacher_id = teacherId;
            }

            const response = await axiosClient.get('/schedules', { params });
            const d = response.data?.data ?? response.data;
            const data = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
            setSchedules(data);

            const savedIds = await fetchSavedScheduleIds(effectiveDate);
            setSavedScheduleIds(savedIds);

            const preferredIdNum = Number(preferredScheduleId || selectedScheduleId);
            const hasPreferred = Number.isFinite(preferredIdNum) && data.some((s: any) => Number(s.id) === preferredIdNum);
            const nextSchedule = hasPreferred ? data.find((s: any) => Number(s.id) === preferredIdNum) : data[0];

            if (nextSchedule) {
                setSelectedScheduleId(String(nextSchedule.id));
                fetchStudents(nextSchedule.classroom_id, nextSchedule.id, effectiveDate);
            } else {
                setStudents([]);
                setSelectedScheduleId('');
            }
            setLoading(false);
        } catch (error) {
            console.error('Program yüklenemedi:', error);
            showToast('error', 'Ders programı yüklenemedi');
            setLoading(false);
        }
    };

    const fetchStudents = async (classroomId: number, scheduleId: number, atDate: string) => {
        try {
            const response = await axiosClient.get('/students', {
                params: { classroom_id: classroomId, per_page: 100 }
            });
            const d = response.data?.data ?? response.data;
            const rawList = d?.students ?? d?.data ?? d ?? [];
            const arr = Array.isArray(rawList) ? rawList : [];

            const defaultStatusByStudentId = new Map<number, string>();
            try {
                const attRes = await axiosClient.get('/attendances', {
                    params: {
                        schedule_id: scheduleId,
                        date_from: atDate,
                        date_to: atDate,
                        per_page: 500,
                    },
                });
                const attD = attRes.data?.data ?? attRes.data;
                const list = attD?.attendances ?? [];
                const items = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
                items.forEach((a: any) => {
                    const sid = Number(a?.student_id ?? a?.student?.id);
                    const st = normalizeAttendanceStatus(a?.status);
                    if (sid && st) defaultStatusByStudentId.set(sid, st);
                });
            } catch {
                // noop
            }

            const studentList = arr.map((s: any) => {
                const sid = Number(s.id);
                const existingStatus = defaultStatusByStudentId.get(sid);
                const fullName = String(
                    s.student_name || s.name || [s.first_name, s.last_name].filter(Boolean).join(' ') || `Öğrenci #${sid || ''}`
                ).trim();
                return {
                id: s.id,
                name: fullName || 'Öğrenci',
                school_no: s.school_no || '-',
                status: existingStatus || 'present',
                };
            });
            setStudents(studentList);
        } catch (error) {
            showToast('error', 'Öğrenci listesi yüklenemedi');
        }
    };

    const handleScheduleChange = (scheduleId: string) => {
        setSelectedScheduleId(scheduleId);
        const schedule = schedules.find(s => s.id.toString() === scheduleId);
        if (schedule) {
            fetchStudents(schedule.classroom_id, schedule.id, date);
        }
    };

    const handleStatusChange = (id: number, status: string) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedScheduleId) {
            showToast('error', 'Lütfen bir ders seçin');
            return;
        }

        try {
            setSubmitting(true);

            const attendanceData = {
                schedule_id: parseInt(selectedScheduleId),
                date,
                attendances: students.map(s => ({
                    student_id: s.id,
                    status: s.status,
                    notes: ''
                }))
            };

            await axiosClient.post('/attendances/bulk', attendanceData);
            showToast('success', 'Yoklama kaydedildi');
            navigate('/attendances');
        } catch (error) {
            console.error('Yoklama kaydedilemedi:', error);
            const err = error as any;
            const message = err?.response?.data?.message;
            const errors = err?.response?.data?.errors;

            if (errors && typeof errors === 'object') {
                const firstError = Object.values(errors)
                    .flat()
                    .find(Boolean) as string | undefined;
                showToast('error', firstError || message || 'Yoklama kaydedilirken bir hata oluştu');
            } else {
                showToast('error', message || 'Yoklama kaydedilirken bir hata oluştu');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && schedules.length === 0) return (
        <div className="text-center p-5">
            <div className="spinner-border text-primary"></div>
            <div className="mt-2">Veriler yükleniyor...</div>
        </div>
    );

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center my-4">
                <div>
                    <h4 className="fw-bold m-0">Yoklama Al</h4>
                    <div className="d-flex align-items-center gap-2 mt-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => shiftDate(-1)}>
                            <i className="ti ti-chevron-left"></i>
                        </button>
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            style={{ width: 170 }}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => shiftDate(1)}>
                            <i className="ti ti-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <button onClick={() => navigate(-1)} className="btn btn-outline-secondary btn-sm">Geri Dön</button>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3 mb-4">
                            <div className="col-md-12">
                                <label className="form-label">Ders / Sınıf Seçimi</label>
                                <select
                                    className="form-select"
                                    value={selectedScheduleId}
                                    onChange={(e) => handleScheduleChange(e.target.value)}
                                    disabled={loading}
                                >
                                    {schedules.length === 0 ? (
                                        <option value="">Bu güne ait ders bulunamadı</option>
                                    ) : (
                                        schedules.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {String(s.start_time || '').slice(0, 5)} - {s.classroom.name} ({s.lesson.name})
                                                {savedScheduleIds.includes(Number(s.id)) ? ' ✅ Kaydedildi' : ''}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {selectedScheduleId && savedScheduleIds.includes(Number(selectedScheduleId)) && (
                                    <small className="text-success d-block mt-2">
                                        <i className="ti ti-check me-1"></i>Bu dersin yoklaması kaydedildi. Seçip güncelleyebilirsiniz.
                                    </small>
                                )}
                            </div>
                        </div>

                        {students.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Öğrenci</th>
                                            <th className="text-center">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(student => (
                                            <tr key={student.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar-sm bg-light rounded-circle d-flex align-items-center justify-content-center me-3 text-primary fw-bold">
                                                            {(student.name || '?').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h6 className="mb-0">{student.name}</h6>
                                                            <small className="text-muted">{student.school_no}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`present-${student.id}`}
                                                            checked={student.status === 'present'}
                                                            onChange={() => handleStatusChange(student.id, 'present')}
                                                        />
                                                        <label className="btn btn-outline-success btn-sm" htmlFor={`present-${student.id}`}>Geldi</label>

                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`late-${student.id}`}
                                                            checked={student.status === 'late'}
                                                            onChange={() => handleStatusChange(student.id, 'late')}
                                                        />
                                                        <label className="btn btn-outline-warning btn-sm" htmlFor={`late-${student.id}`}>Geç</label>

                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`excused-${student.id}`}
                                                            checked={student.status === 'excused'}
                                                            onChange={() => handleStatusChange(student.id, 'excused')}
                                                        />
                                                        <label className="btn btn-outline-info btn-sm" htmlFor={`excused-${student.id}`}>İzinli</label>

                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`sick-${student.id}`}
                                                            checked={student.status === 'sick'}
                                                            onChange={() => handleStatusChange(student.id, 'sick')}
                                                        />
                                                        <label className="btn btn-outline-secondary btn-sm" htmlFor={`sick-${student.id}`}>Raporlu</label>

                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`absent-${student.id}`}
                                                            checked={student.status === 'absent'}
                                                            onChange={() => handleStatusChange(student.id, 'absent')}
                                                        />
                                                        <label className="btn btn-outline-danger btn-sm" htmlFor={`absent-${student.id}`}>Gelmedi</label>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-5 text-muted">
                                {loading ? 'Yükleniyor...' : 'Seçili derse ait öğrenci bulunamadı.'}
                            </div>
                        )}

                        <div className="d-flex justify-content-end mt-4">
                            <button type="button" className="btn btn-light me-2" onClick={() => navigate(-1)}>İptal</button>
                            <button
                                type="submit"
                                className="btn btn-primary px-4"
                                disabled={submitting || students.length === 0}
                            >
                                {submitting ? 'Kaydediliyor...' : 'Yoklamayı Tamamla'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AttendanceForm;
