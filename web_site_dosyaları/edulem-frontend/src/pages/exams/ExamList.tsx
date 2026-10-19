import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Exam {
    id: number;
    lesson_name: string;
    classroom_name: string;
    type: string;
    exam_date: string;
    is_active: boolean;
    is_optical_form?: boolean;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Statistics {
    total: number;
    active: number;
    upcoming: number;
    past: number;
}

const ExamList = () => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        fetchExams();
    }, [currentPage]);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/exams?page=${currentPage}`);
            setExams(response.data.data.exams);
            setStats(response.data.data.statistics);
            setPagination(response.data.data.pagination);
        } catch (error) {
            console.error('Sınavlar yüklenemedi:', error);
            showToast('error', 'Sınavlar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu sınavı silmek istediğinizden emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;

        try {
            await axiosClient.delete(`/exams/${id}`);
            showToast('success', 'Sınav silindi');
            fetchExams();
        } catch (error) {
            showToast('error', 'Sınav silinemedi');
        }
    };

    if (loading && exams.length === 0) {
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
                    <h4 className="page-title mb-1">Sınav Yönetimi</h4>
                    <small className="text-muted">Tüm sınavları ve not girişlerini yönetin</small>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/academic/exams/create')}
                >
                    <i className="ti ti-plus me-1"></i>
                    Yeni Sınav Oluştur
                </button>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-md-3">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Toplam Sınav</h6>
                            <h3>{stats?.total || 0}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Gelecek Sınavlar</h6>
                            <h3 className="text-primary">{stats?.upcoming || 0}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Aktif Sınavlar</h6>
                            <h3 className="text-success">{stats?.active || 0}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Geçmiş Sınavlar</h6>
                            <h3 className="text-secondary">{stats?.past || 0}</h3>
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
                                    <th className="ps-4">Sınav Bilgisi</th>
                                    <th>Ders / Sınıf</th>
                                    <th>Tarih</th>
                                    <th>Tür</th>
                                    <th>Durum</th>
                                    <th className="text-end pe-4">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted">
                                            Henüz sınav oluşturulmamış
                                        </td>
                                    </tr>
                                ) : (
                                    exams.map((exam) => (
                                        <tr key={exam.id}>
                                            <td className="ps-4">
                                                <div className="fw-semibold">Sınav #{exam.id}</div>
                                            </td>
                                            <td>
                                                <div className="mb-0">{exam.lesson_name}</div>
                                                <small className="text-muted">{exam.classroom_name}</small>
                                            </td>
                                            <td>{new Date(exam.exam_date).toLocaleDateString('tr-TR')}</td>
                                            <td>
                                                <span className="badge bg-soft-info text-info">
                                                    {exam.type}
                                                </span>
                                            </td>
                                            <td>
                                                {exam.is_active ? (
                                                    <span className="badge bg-soft-success text-success">Aktif</span>
                                                ) : (
                                                    <span className="badge bg-soft-danger text-danger">Pasif</span>
                                                )}
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-soft-primary"
                                                        onClick={() => navigate(`/academic/exams/${exam.id}/grades`)}
                                                        title="Not Girişi"
                                                    >
                                                        <i className="ti ti-checklist"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-soft-warning"
                                                        onClick={() => navigate(`/academic/exams/${exam.id}/optical`)}
                                                        title="Optik Form"
                                                    >
                                                        <i className="ti ti-scan"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-soft-info"
                                                        onClick={() => navigate(`/academic/exams/${exam.id}/edit`)}
                                                    >
                                                        <i className="ti ti-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-soft-danger"
                                                        onClick={() => handleDelete(exam.id)}
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
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        Önceki
                                    </button>
                                </li>
                                {[...Array(pagination.last_page)].map((_, i) => (
                                    <li
                                        key={i + 1}
                                        className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}
                                    >
                                        <button
                                            className="page-link"
                                            onClick={() => setCurrentPage(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}
                                <li className={`page-item ${currentPage === pagination.last_page ? 'disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        Sonraki
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamList;
