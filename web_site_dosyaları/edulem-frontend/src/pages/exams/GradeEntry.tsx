import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Exam {
    id: number;
    lesson_name: string;
    classroom_name: string;
    exam_date: string;
}

interface GradeEntryRow {
    student_id: number;
    student_name: string;
    school_no: string;
    grade: string;
    notes: string;
}

const GradeEntry = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Exam ID
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [exam, setExam] = useState<Exam | null>(null);
    const [entries, setEntries] = useState<GradeEntryRow[]>([]);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Sınav detaylarını ve o sınıftaki öğrencileri çekiyoruz
            // Backend: Exam->show() sınav detaylarını ve ilişkili öğrencileri dönüyor
            const response = await axiosClient.get(`/exams/${id}`);
            const examData = response.data.data;
            setExam(examData);

            // Öğrenci listesini hazırla
            // Exam modelinde 'examClassrooms' -> 'students' ilişkisi var
            const students: GradeEntryRow[] = [];

            // Sınıf bazlı sınav ise o sınıftaki öğrencileri al
            if (examData.exam_classrooms) {
                examData.exam_classrooms.forEach((ec: any) => {
                    if (ec.students) {
                        ec.students.forEach((ecs: any) => {
                            // Mevcut notu varsa doldur (Grade modelinden gelebilir)
                            const existingGrade = examData.grades?.find((g: any) => g.student_id === ecs.student_id);

                            students.push({
                                student_id: ecs.student_id,
                                student_name: ecs.student?.name || 'Bilinmeyen Öğrenci',
                                school_no: ecs.student?.school_no || '-',
                                grade: existingGrade ? existingGrade.grade.toString() : '',
                                notes: existingGrade ? existingGrade.notes || '' : '',
                            });
                        });
                    }
                });
            }

            setEntries(students);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
            showToast('error', 'Veriler yüklenemedi');
            navigate('/academic/exams');
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (studentId: number, value: string) => {
        setEntries(prev => prev.map(entry =>
            entry.student_id === studentId ? { ...entry, grade: value } : entry
        ));
    };

    const handleNotesChange = (studentId: number, value: string) => {
        setEntries(prev => prev.map(entry =>
            entry.student_id === studentId ? { ...entry, notes: value } : entry
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Sadece notu girilmiş olanları filtrele
        const filteredGrades = entries
            .filter(entry => entry.grade !== '')
            .map(entry => ({
                student_id: entry.student_id,
                grade: Number(entry.grade),
                notes: entry.notes,
            }));

        if (filteredGrades.length === 0) {
            showToast('error', 'En az bir not girmelisiniz');
            return;
        }

        try {
            setSubmitting(true);
            await axiosClient.post('/grades/bulk', {
                exam_id: Number(id),
                grades: filteredGrades,
            });
            showToast('success', 'Notlar başarıyla kaydedildi');
            navigate('/academic/exams');
        } catch (error) {
            console.error('Notlar kaydedilemedi:', error);
            showToast('error', 'Notlar kaydedilemedi');
        } finally {
            setSubmitting(false);
        }
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
                    <h4 className="page-title mb-1">Hızlı Not Girişi</h4>
                    <p className="text-muted mb-0">
                        {exam?.lesson_name} - {exam?.classroom_name} ({new Date(exam?.exam_date || '').toLocaleDateString('tr-TR')})
                    </p>
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
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th style={{ width: '80px' }}>No</th>
                                        <th>Öğrenci Adı Soyadı</th>
                                        <th style={{ width: '150px' }}>Not (0-100)</th>
                                        <th>Açıklama (Opsiyonel)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-4 text-muted">
                                                Bu sınav için atanmış öğrenci bulunamadı.
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map((entry) => (
                                            <tr key={entry.student_id}>
                                                <td className="fw-semibold">{entry.school_no}</td>
                                                <td>{entry.student_name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        value={entry.grade}
                                                        onChange={(e) => handleGradeChange(entry.student_id, e.target.value)}
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        placeholder="Not"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={entry.notes}
                                                        onChange={(e) => handleNotesChange(entry.student_id, e.target.value)}
                                                        placeholder="Hoca notu..."
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || entries.length === 0}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-device-floppy me-1"></i>
                                        Notları Kaydet
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate('/academic/exams')}
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

export default GradeEntry;
