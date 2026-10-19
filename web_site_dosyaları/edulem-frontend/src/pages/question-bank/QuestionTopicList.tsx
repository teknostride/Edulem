import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Lesson {
    id: number;
    name: string;
}

interface Topic {
    id: number;
    name: string;
    lesson_id: number;
    lesson_name: string;
    is_active: boolean;
    questions_count: number;
}

const QuestionTopicList = () => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingTopic, setEditingTopic] = useState<Partial<Topic> | null>(null);

    useEffect(() => {
        fetchTopics();
        fetchLessons();
    }, []);

    const fetchTopics = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/question-bank-topics');
            setTopics(response.data.data.topics || response.data.data);
        } catch (error) {
            console.error('Konular yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLessons = async () => {
        try {
            const response = await axiosClient.get('/lessons');
            setLessons(response.data.data);
        } catch (error) {
            console.error('Dersler yüklenemedi:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTopic?.name || !editingTopic?.lesson_id) {
            showToast('error', 'Lütfen tüm alanları doldurun');
            return;
        }

        try {
            setSubmitting(true);
            if (editingTopic.id) {
                await axiosClient.put(`/question-bank-topics/${editingTopic.id}`, editingTopic);
                showToast('success', 'Konu güncellendi');
            } else {
                await axiosClient.post('/question-bank-topics', editingTopic);
                showToast('success', 'Konu oluşturuldu');
            }
            setShowModal(false);
            fetchTopics();
        } catch (error) {
            showToast('error', 'İşlem başarısız');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu konuyu silmek istediğinizden emin misiniz? (İçinde soru varsa silinemez)',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/question-bank-topics/${id}`);
            showToast('success', 'Konu silindi');
            fetchTopics();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Konu silinemedi';
            showToast('error', msg);
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Soru Konuları / Kategoriler</h4>
                    <p className="text-muted small mb-0">Soruları derslere göre organize edin</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingTopic({ name: '', lesson_id: 0, is_active: true });
                        setShowModal(true);
                    }}
                >
                    <i className="ti ti-plus me-1"></i>
                    Yeni Konu Ekle
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Konu Adı</th>
                                    <th>Ders</th>
                                    <th>Soru Sayısı</th>
                                    <th>Durum</th>
                                    <th className="text-end pe-4">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                                ) : topics.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-5 text-muted">Konu bulunamadı</td></tr>
                                ) : (
                                    topics.map((topic) => (
                                        <tr key={topic.id}>
                                            <td className="ps-4 fw-medium">{topic.name}</td>
                                            <td>{topic.lesson_name}</td>
                                            <td>
                                                <span className="badge bg-soft-primary text-primary px-3">{topic.questions_count || 0}</span>
                                            </td>
                                            <td>
                                                {topic.is_active ?
                                                    <span className="badge bg-soft-success text-success">Aktif</span> :
                                                    <span className="badge bg-soft-danger text-danger">Pasif</span>
                                                }
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-soft-info"
                                                        onClick={() => {
                                                            setEditingTopic(topic);
                                                            setShowModal(true);
                                                        }}
                                                    >
                                                        <i className="ti ti-edit"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-soft-danger"
                                                        onClick={() => handleDelete(topic.id)}
                                                        disabled={topic.questions_count > 0}
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
            </div>

            {showModal && (
                <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <h5 className="modal-title">{editingTopic?.id ? 'Konuyu Düzenle' : 'Yeni Konu'}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Konu Adı</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editingTopic?.name || ''}
                                            onChange={e => setEditingTopic({ ...editingTopic!, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Ders</label>
                                        <select
                                            className="form-select"
                                            value={editingTopic?.lesson_id || ''}
                                            onChange={e => setEditingTopic({ ...editingTopic!, lesson_id: Number(e.target.value) })}
                                            required
                                        >
                                            <option value="">Ders Seçin...</option>
                                            {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={editingTopic?.is_active || false}
                                            onChange={e => setEditingTopic({ ...editingTopic!, is_active: e.target.checked })}
                                        />
                                        <label className="form-check-label">Aktif</label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>İptal</button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionTopicList;
