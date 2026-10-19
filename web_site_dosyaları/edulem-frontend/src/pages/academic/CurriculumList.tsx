import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

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

interface CurriculumRecord {
    id: number;
    topic: string;
    teaching_date: string;
    lesson_hour: number;
    is_completed: boolean;
    lesson: Lesson;
    classroom: Classroom;
    teacher: Teacher;
    notes?: string;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

const CurriculumList = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState<CurriculumRecord[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    const [filters, setFilters] = useState({
        page: 1,
        lesson_id: '',
        classroom_id: '',
        teaching_date_from: '',
        teaching_date_to: '',
        is_completed: ''
    });

    useEffect(() => {
        fetchDropdownData();
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [filters.page, filters.lesson_id, filters.classroom_id, filters.is_completed]);

    const fetchDropdownData = async () => {
        try {
            const [lessonsRes, classroomsRes] = await Promise.all([
                axiosClient.get('/lessons'),
                axiosClient.get('/classrooms')
            ]);
            setLessons(lessonsRes.data.data);
            setClassrooms(classroomsRes.data.data);
        } catch (error) {
            console.error('Dropdown verileri yüklenemedi:', error);
        }
    };

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== '') params.append(key, value.toString());
            });

            const response = await axiosClient.get(`/curriculum-tracking?${params.toString()}`);
            setRecords(response.data.data.trackings);
            setPagination(response.data.data.pagination);
        } catch (error) {
            console.error('Kayıtlar yüklenemedi:', error);
            showToast('error', 'Müfredat kayıtları yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu kaydı silmek istediğinizden emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;

        try {
            await axiosClient.delete(`/curriculum-tracking/${id}`);
            showToast('success', 'Kayıt silindi');
            fetchRecords();
        } catch (error) {
            showToast('error', 'Kayıt silinemedi');
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Müfredat Takibi</h4>
                    <p className="text-muted small mb-0">İşlenen konuları ve ders ilerlemelerini izleyin</p>
                </div>
                <div>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/academic/curriculum/create')}
                    >
                        <i className="ti ti-plus me-1"></i>
                        Yeni Kayıt Ekle
                    </button>
                </div>
            </div>

            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label small">Sınıf</label>
                            <select
                                className="form-select"
                                name="classroom_id"
                                value={filters.classroom_id}
                                onChange={handleFilterChange}
                            >
                                <option value="">Tüm Sınıflar</option>
                                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">Ders</label>
                            <select
                                className="form-select"
                                name="lesson_id"
                                value={filters.lesson_id}
                                onChange={handleFilterChange}
                            >
                                <option value="">Tüm Dersler</option>
                                {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">Durum</label>
                            <select
                                className="form-select"
                                name="is_completed"
                                value={filters.is_completed}
                                onChange={handleFilterChange}
                            >
                                <option value="">Hepsi</option>
                                <option value="1">Tamamlandı</option>
                                <option value="0">Devam Ediyor</option>
                            </select>
                        </div>
                        <div className="col-md-3 d-flex align-items-end">
                            <button className="btn btn-primary w-100" onClick={fetchRecords}>
                                <i className="ti ti-filter me-1"></i>
                                Filtrele
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Tarih</th>
                                    <th>Sınıf / Ders</th>
                                    <th>İşlenen Konu</th>
                                    <th>Öğretmen</th>
                                    <th>Durum</th>
                                    <th className="text-end pe-4">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted">Kayıt bulunamadı</td>
                                    </tr>
                                ) : (
                                    records.map((r) => (
                                        <tr key={r.id}>
                                            <td className="ps-4">
                                                <div className="fw-medium">{new Date(r.teaching_date).toLocaleDateString('tr-TR')}</div>
                                                <small className="text-muted">{r.lesson_hour}. Saat</small>
                                            </td>
                                            <td>
                                                <div className="fw-medium">{r.classroom?.name || 'Genel'}</div>
                                                <small className="text-muted">{r.lesson?.name}</small>
                                            </td>
                                            <td>
                                                <div className="text-truncate-2" style={{ maxWidth: '300px' }} title={r.topic}>
                                                    {r.topic}
                                                </div>
                                            </td>
                                            <td>{r.teacher?.name}</td>
                                            <td>
                                                {r.is_completed ? (
                                                    <span className="badge bg-soft-success text-success">Tamamlandı</span>
                                                ) : (
                                                    <span className="badge bg-soft-warning text-warning">Devam Ediyor</span>
                                                )}
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-soft-info"
                                                        onClick={() => navigate(`/academic/curriculum/${r.id}/edit`)}
                                                    >
                                                        <i className="ti ti-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-soft-danger"
                                                        onClick={() => handleDelete(r.id)}
                                                    >
                                                        <i className="ti ti-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {pagination && pagination.last_page > 1 && (
                    <div className="card-footer bg-transparent border-0 py-3">
                        <nav>
                            <ul className="pagination justify-content-center mb-0">
                                <li className={`page-item ${filters.page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Önceki</button>
                                </li>
                                {[...Array(pagination.last_page)].map((_, i) => (
                                    <li key={i + 1} className={`page-item ${filters.page === i + 1 ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setFilters(f => ({ ...f, page: i + 1 }))}>{i + 1}</button>
                                    </li>
                                ))}
                                <li className={`page-item ${filters.page === pagination.last_page ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Sonraki</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurriculumList;
