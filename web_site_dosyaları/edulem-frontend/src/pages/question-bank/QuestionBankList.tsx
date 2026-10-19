import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Topic {
    id: number;
    name: string;
}

interface Lesson {
    id: number;
    name: string;
}

interface Question {
    id: number;
    question_text: string;
    question_type: string;
    difficulty_level: string;
    lesson_name: string;
    topic_name: string;
    points: number;
    is_active: boolean;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

const QuestionBankList = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    const [filters, setFilters] = useState({
        page: 1,
        lesson_id: '',
        topic_id: '',
        difficulty_level: '',
        search: ''
    });

    useEffect(() => {
        fetchDropdownData();
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [filters.page, filters.lesson_id, filters.topic_id, filters.difficulty_level]);

    const fetchDropdownData = async () => {
        try {
            const [lessonsRes, topicsRes] = await Promise.all([
                axiosClient.get('/lessons'),
                axiosClient.get('/question-bank-topics')
            ]);
            setLessons(lessonsRes.data.data);
            setTopics(topicsRes.data.data.topics || topicsRes.data.data);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value.toString());
            });

            const response = await axiosClient.get(`/question-bank?${params.toString()}`);
            setQuestions(response.data.data.questions);
            setPagination(response.data.data.pagination);
        } catch (error) {
            console.error('Sorular yüklenemedi:', error);
            showToast('error', 'Sorular yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu soruyu silmek istediğinizden emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;

        try {
            await axiosClient.delete(`/question-bank/${id}`);
            showToast('success', 'Soru silindi');
            fetchQuestions();
        } catch (error) {
            showToast('error', 'Soru silinemedi');
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const getDifficultyBadge = (level: string) => {
        const maps: Record<string, { label: string, class: string }> = {
            easy: { label: 'Kolay', class: 'bg-soft-success text-success' },
            medium: { label: 'Orta', class: 'bg-soft-warning text-warning' },
            hard: { label: 'Zor', class: 'bg-soft-danger text-danger' },
            very_hard: { label: 'Çok Zor', class: 'bg-danger text-white' }
        };
        const levelData = maps[level] || { label: level, class: 'bg-secondary' };
        return <span className={`badge ${levelData.class}`}>{levelData.label}</span>;
    };

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Soru Bankası</h4>
                    <p className="text-muted small mb-0">Soru havuzunu yönetin ve sınav kitapçıkları hazırlayın</p>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-primary"
                        onClick={() => navigate('/academic/question-bank/topics')}
                    >
                        <i className="ti ti-category me-1"></i>
                        Konuları Yönet
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/academic/question-bank/create')}
                    >
                        <i className="ti ti-plus me-1"></i>
                        Yeni Soru Ekle
                    </button>
                </div>
            </div>

            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <div className="row g-3">
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
                            <label className="form-label small">Konu</label>
                            <select
                                className="form-select"
                                name="topic_id"
                                value={filters.topic_id}
                                onChange={handleFilterChange}
                            >
                                <option value="">Tüm Konular</option>
                                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Zorluk</label>
                            <select
                                className="form-select"
                                name="difficulty_level"
                                value={filters.difficulty_level}
                                onChange={handleFilterChange}
                            >
                                <option value="">Hepsi</option>
                                <option value="easy">Kolay</option>
                                <option value="medium">Orta</option>
                                <option value="hard">Zor</option>
                                <option value="very_hard">Çok Zor</option>
                            </select>
                        </div>
                        <div className="col-md-4 d-flex align-items-end">
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Soru metninde ara..."
                                    name="search"
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                />
                                <button className="btn btn-primary" onClick={fetchQuestions}>
                                    <i className="ti ti-search"></i>
                                </button>
                            </div>
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
                                    <th className="ps-4" style={{ width: '40%' }}>Soru</th>
                                    <th>Ders / Konu</th>
                                    <th>Tip / Puan</th>
                                    <th>Zorluk</th>
                                    <th className="text-end pe-4">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : questions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-muted">Soru bulunamadı</td>
                                    </tr>
                                ) : (
                                    questions.map((q) => (
                                        <tr key={q.id}>
                                            <td className="ps-4">
                                                <div className="text-truncate-2 fw-medium" title={q.question_text}>
                                                    {q.question_text}
                                                </div>
                                                <small className="text-muted">ID: #{q.id}</small>
                                            </td>
                                            <td>
                                                <div>{q.lesson_name}</div>
                                                <small className="text-muted">{q.topic_name}</small>
                                            </td>
                                            <td>
                                                <span className="badge bg-soft-info text-info me-1">{q.question_type}</span>
                                                <span className="badge bg-soft-secondary text-secondary">{q.points} Puan</span>
                                            </td>
                                            <td>{getDifficultyBadge(q.difficulty_level)}</td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-soft-info"
                                                        onClick={() => navigate(`/academic/question-bank/${q.id}/edit`)}
                                                    >
                                                        <i className="ti ti-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-soft-danger"
                                                        onClick={() => handleDelete(q.id)}
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

export default QuestionBankList;
