import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Topic {
    id: number;
    name: string;
}

const TestGeneration = () => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [_topicLoading, _setTopicLoading] = useState(true);
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

    // Form states
    const [testType, setTestType] = useState('topic');
    const [topicId, setTopicId] = useState('');
    const [questionCount, setQuestionCount] = useState(10);
    const [difficulty, setDifficulty] = useState('medium');
    const [distribution, setDistribution] = useState({
        easy: 0.3,
        medium: 0.4,
        hard: 0.2,
        very_hard: 0.1
    });

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        try {
            const res = await axiosClient.get('/question-bank-topics');
            setTopics(res.data.data.topics);
        } catch (error) {
            console.error('Konular yüklenemedi:', error);
        } finally {
            _setTopicLoading(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setGeneratedQuestions([]);

        try {
            let res;
            if (testType === 'topic') {
                res = await axiosClient.get('/question-bank/prepare-topic-test', {
                    params: {
                        topic_id: topicId,
                        count: questionCount,
                        difficulty_level: difficulty
                    }
                });
            } else if (testType === 'practice') {
                res = await axiosClient.get('/question-bank/prepare-practice-test', {
                    params: {
                        total_questions: questionCount,
                        difficulty_distribution: distribution
                    }
                });
            }

            if (res?.data?.status) {
                setGeneratedQuestions(res.data.data.questions);
                showToast('success', `${res.data.data.total_count} adet soru başarıyla seçildi.`);
            }
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Soru oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Otomatik Test Oluşturucu</h4>
                    <p className="text-muted mb-0">Kriterlere göre soru bankasından otomatik soru seçimi yapın.</p>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <h5 className="card-title mb-3">Test Kriterleri</h5>
                            <form onSubmit={handleGenerate}>
                                <div className="mb-3">
                                    <label className="form-label">Test Türü</label>
                                    <select
                                        className="form-select"
                                        value={testType}
                                        onChange={(e) => setTestType(e.target.value)}
                                    >
                                        <option value="topic">Konu Tarama Testi</option>
                                        <option value="practice">Karma Deneme Sınavı</option>
                                    </select>
                                </div>

                                {testType === 'topic' && (
                                    <div className="mb-3">
                                        <label className="form-label">Konu</label>
                                        <select
                                            className="form-select"
                                            value={topicId}
                                            onChange={(e) => setTopicId(e.target.value)}
                                            required
                                        >
                                            <option value="">Konu Seçin</option>
                                            {topics.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="form-label">Soru Sayısı</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={questionCount}
                                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                        min="1"
                                        max="100"
                                        required
                                    />
                                </div>

                                {testType === 'topic' ? (
                                    <div className="mb-3">
                                        <label className="form-label">Zorluk Seviyesi</label>
                                        <select
                                            className="form-select"
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                        >
                                            <option value="easy">Kolay</option>
                                            <option value="medium">Orta</option>
                                            <option value="hard">Zor</option>
                                            <option value="very_hard">Çok Zor</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="mb-3">
                                        <label className="form-label">Zorluk Dağılımı</label>
                                        <div className="row g-2">
                                            <div className="col-6">
                                                <small className="text-muted">Kolay</small>
                                                <input type="number" step="0.1" className="form-control form-control-sm" value={distribution.easy} onChange={(e) => setDistribution({ ...distribution, easy: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Orta</small>
                                                <input type="number" step="0.1" className="form-control form-control-sm" value={distribution.medium} onChange={(e) => setDistribution({ ...distribution, medium: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Zor</small>
                                                <input type="number" step="0.1" className="form-control form-control-sm" value={distribution.hard} onChange={(e) => setDistribution({ ...distribution, hard: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Çok Zor</small>
                                                <input type="number" step="0.1" className="form-control form-control-sm" value={distribution.very_hard} onChange={(e) => setDistribution({ ...distribution, very_hard: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={loading}
                                >
                                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="ti ti-wand me-2"></i>}
                                    Soru Seç ve Oluştur
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-transparent border-bottom">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="card-title mb-0">Seçilen Sorular</h5>
                                {generatedQuestions.length > 0 && (
                                    <button className="btn btn-sm btn-success">
                                        <i className="ti ti-download me-1"></i> PDF Olarak İndir
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="card-body">
                            {generatedQuestions.length > 0 ? (
                                <div className="list-group list-group-flush">
                                    {generatedQuestions.map((q, idx) => (
                                        <div key={q.id} className="list-group-item border-0 px-0 mb-3 bg-light rounded p-3">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="badge bg-soft-primary text-primary">Soru {idx + 1}</span>
                                                <span className={`badge bg-soft-${getDifficultyColor(q.difficulty_level)} text-${getDifficultyColor(q.difficulty_level)}`}>
                                                    {q.difficulty_level_label}
                                                </span>
                                            </div>
                                            <div dangerouslySetInnerHTML={{ __html: q.content }}></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-5">
                                    <i className="ti ti-files display-4 text-muted mb-3"></i>
                                    <h5>Hazırlanan sorular burada listelenecek. ✨</h5>
                                    <p className="text-muted">Soldaki panelden kriterleri belirleyip butona basın.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .bg-soft-primary { background-color: rgba(13, 110, 253, 0.1); }
                .bg-soft-success { background-color: rgba(25, 135, 84, 0.1); }
                .bg-soft-warning { background-color: rgba(255, 193, 7, 0.1); }
                .bg-soft-danger { background-color: rgba(220, 53, 69, 0.1); }
            `}</style>
        </div>
    );

    function getDifficultyColor(level: string) {
        switch (level) {
            case 'easy': return 'success';
            case 'medium': return 'warning';
            case 'hard': return 'danger';
            case 'very_hard': return 'dark';
            default: return 'primary';
        }
    }
};

export default TestGeneration;
