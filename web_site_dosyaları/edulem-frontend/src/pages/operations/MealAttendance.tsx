import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
}

const MealAttendance = () => {
    const [loading, setLoading] = useState(false);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [menus, setMenus] = useState<any[]>([]);
    const [selectedMenu, setSelectedMenu] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceRows, setAttendanceRows] = useState<any>({});

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [mealType, setMealType] = useState('lunch');

    useEffect(() => {
        fetchClassrooms();
    }, []);

    useEffect(() => {
        if (date && mealType) {
            fetchMenus();
        }
    }, [date, mealType]);

    useEffect(() => {
        if (selectedClassroom) {
            fetchStudents();
        } else {
            setStudents([]);
        }
    }, [selectedClassroom]);

    const fetchClassrooms = async () => {
        try {
            const res = await axiosClient.get('/classrooms');
            setClassrooms(res.data.data.classrooms || res.data.data);
        } catch (error) {
            console.error('Sınıflar yüklenemedi');
        }
    };

    const fetchMenus = async () => {
        try {
            const res = await axiosClient.get(`/meal-menus?menu_date_from=${date}&menu_date_to=${date}&meal_type=${mealType}`);
            setMenus(res.data.data.menus);
            if (res.data.data.menus.length > 0) {
                // If there's a general menu OR one for the selected classroom
                const general = res.data.data.menus.find((m: any) => !m.classroom_id);
                if (general) setSelectedMenu(general.id);
            }
        } catch (error) {
            console.error('Menüler yüklenemedi');
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/students?classroom_id=${selectedClassroom}`);
            setStudents(res.data.data.students || res.data.data);

            // Initialize attendance states
            const initial: any = {};
            (res.data.data.students || res.data.data).forEach((s: Student) => {
                initial[s.id] = { status: 'present', notes: '' };
            });
            setAttendanceRows(initial);
        } catch (error) {
            showToast('error', 'Öğrenciler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId: number, status: string) => {
        setAttendanceRows({
            ...attendanceRows,
            [studentId]: { ...attendanceRows[studentId], status }
        });
    };

    const handleNoteChange = (studentId: number, notes: string) => {
        setAttendanceRows({
            ...attendanceRows,
            [studentId]: { ...attendanceRows[studentId], notes }
        });
    };

    const saveAttendance = async () => {
        if (!selectedMenu) {
            showToast('error', 'Lütfen bir menü seçin (Önce o güne menü eklenmiş olmalı)');
            return;
        }

        setLoading(true);
        try {
            const promises = Object.entries(attendanceRows).map(([studentId, data]: [string, any]) => {
                return axiosClient.post('/meal-attendance', {
                    meal_menu_id: selectedMenu,
                    student_id: studentId,
                    attendance_date: date,
                    meal_type: mealType,
                    status: data.status,
                    notes: data.notes
                });
            });

            await Promise.all(promises);
            showToast('success', 'Yoklama başarıyla kaydedildi');
        } catch (error) {
            showToast('error', 'Yoklama kaydedilirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">Yemek Yoklaması</h4>
                <p className="text-muted">Öğrencilerin yemek katılım durumlarını kaydedin.</p>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Tarih</label>
                            <input
                                type="date"
                                className="form-control"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Öğün</label>
                            <select
                                className="form-select"
                                value={mealType}
                                onChange={e => setMealType(e.target.value)}
                            >
                                <option value="breakfast">Kahvaltı</option>
                                <option value="lunch">Öğle Yemeği</option>
                                <option value="snack">İkindi Kahvaltısı</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Sınıf Seçimi</label>
                            <select
                                className="form-select"
                                value={selectedClassroom}
                                onChange={e => setSelectedClassroom(e.target.value)}
                            >
                                <option value="">Sınıf Seçin...</option>
                                {classrooms.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Aktif Menü</label>
                            <select
                                className="form-select"
                                value={selectedMenu}
                                onChange={e => setSelectedMenu(e.target.value)}
                                disabled={menus.length === 0}
                            >
                                <option value="">{menus.length === 0 ? 'Menü Bulunamadı' : 'Menü Seçin...'}</option>
                                {menus.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.classroom ? `[${m.classroom.name}] ` : '[Genel] '} {m.items.slice(0, 2).join(', ')}...
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {selectedClassroom && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3">
                        <h5 className="mb-0">Öğrenci Listesi</h5>
                        <div className="d-flex gap-2">
                            <button className="btn btn-soft-success btn-sm" onClick={() => {
                                const updated = { ...attendanceRows };
                                students.forEach(s => updated[s.id].status = 'present');
                                setAttendanceRows(updated);
                            }}>Tümü Geldi</button>
                            <button className="btn btn-soft-danger btn-sm" onClick={() => {
                                const updated = { ...attendanceRows };
                                students.forEach(s => updated[s.id].status = 'absent');
                                setAttendanceRows(updated);
                            }}>Tümü Gelmedi</button>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-3" style={{ width: '300px' }}>Öğrenci</th>
                                        <th className="text-center">Durum</th>
                                        <th>Notlar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="text-center py-5">
                                                <div className="spinner-border text-primary" role="status"></div>
                                            </td>
                                        </tr>
                                    ) : students.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="text-center py-5 text-muted">Sınıfta kayıtlı öğrenci bulunamadı.</td>
                                        </tr>
                                    ) : (
                                        students.map(student => (
                                            <tr key={student.id}>
                                                <td className="ps-3 fw-medium">{student.first_name} {student.last_name}</td>
                                                <td className="text-center">
                                                    <div className="btn-group" role="group">
                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`present-${student.id}`}
                                                            autoComplete="off"
                                                            checked={attendanceRows[student.id]?.status === 'present'}
                                                            onChange={() => handleStatusChange(student.id, 'present')}
                                                        />
                                                        <label className="btn btn-outline-success btn-sm" htmlFor={`present-${student.id}`}>Yedi</label>

                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`absent-${student.id}`}
                                                            autoComplete="off"
                                                            checked={attendanceRows[student.id]?.status === 'absent'}
                                                            onChange={() => handleStatusChange(student.id, 'absent')}
                                                        />
                                                        <label className="btn btn-outline-danger btn-sm" htmlFor={`absent-${student.id}`}>Yemedi</label>

                                                        <input
                                                            type="radio"
                                                            className="btn-check"
                                                            name={`status-${student.id}`}
                                                            id={`excused-${student.id}`}
                                                            autoComplete="off"
                                                            checked={attendanceRows[student.id]?.status === 'excused'}
                                                            onChange={() => handleStatusChange(student.id, 'excused')}
                                                        />
                                                        <label className="btn btn-outline-info btn-sm" htmlFor={`excused-${student.id}`}>İzinli</label>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm border-0 bg-light"
                                                        placeholder="Not ekle..."
                                                        value={attendanceRows[student.id]?.notes || ''}
                                                        onChange={e => handleNoteChange(student.id, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="card-footer bg-transparent border-top p-3 text-end">
                        <button
                            className="btn btn-primary px-4"
                            onClick={saveAttendance}
                            disabled={loading || students.length === 0}
                        >
                            {loading && <span className="spinner-border spinner-border-sm me-1"></span>}
                            Yoklamayı Tamamla
                        </button>
                    </div>
                </div>
            )}
            <style>{`
                .btn-soft-success { background-color: rgba(25, 135, 84, 0.1); color: #198754; }
                .btn-soft-danger { background-color: rgba(220, 53, 69, 0.1); color: #dc3545; }
            `}</style>
        </div>
    );
};

export default MealAttendance;
