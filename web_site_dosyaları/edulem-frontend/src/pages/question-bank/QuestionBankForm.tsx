import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Lesson {
    id: number;
    name: string;
}

interface Topic {
    id: number;
    name: string;
    lesson_id: number;
}

interface Question {
    id?: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'short_answer' | 'essay';
    options: string[];
    correct_answer: string;
    explanation: string;
    lesson_id: number;
    question_bank_topic_id: number;
    difficulty_level: 'easy' | 'medium' | 'hard' | 'very_hard';
    points: number;
    is_active: boolean;
}

const QuestionBankForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    const [question, setQuestion] = useState<Question>({
        question_text: '',
        question_type: 'multiple_choice',
        options: ['', '', '', '', ''],
        correct_answer: '',
        explanation: '',
        lesson_id: 0,
        question_bank_topic_id: 0,
        difficulty_level: 'medium',
        points: 5,
        is_active: true
    });

    useEffect(() => {
        fetchInitialData();
        if (id) fetchQuestion();
    }, [id]);

    const fetchInitialData = async () => {
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

    const fetchQuestion = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/question-bank/${id}`);
            setQuestion(response.data.data);
        } catch (error) {
            showToast('error', 'Soru yüklenemedi');
            navigate('/academic/question-bank');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.question_text || !question.lesson_id || !question.question_bank_topic_id) {
            showToast('error', 'Lütfen zorunlu alanları doldurun');
            return;
        }

        try {
            setSubmitting(true);
            const payload = { ...question };

            if (id) {
                await axiosClient.put(`/question-bank/${id}`, payload);
                showToast('success', 'Soru güncellendi');
            } else {
                await axiosClient.post('/question-bank', payload);
                showToast('success', 'Soru eklendi');
            }
            navigate('/academic/question-bank');
        } catch (error) {
            showToast('error', 'İşlem başarısız');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let val: any = value;
        if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;
        if (name === 'lesson_id' || name === 'question_bank_topic_id' || name === 'points') val = Number(value);

        setQuestion(prev => ({ ...prev, [name]: val }));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        setQuestion(prev => ({ ...prev, options: newOptions }));
    };

    const filteredTopics = topics.filter(t => t.lesson_id === question.lesson_id);

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">{id ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</h4>
                    <p className="text-muted small mb-0">Soru bankasına yeni bir içerik ekleyin</p>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/academic/question-bank')}>
                    <i className="ti ti-arrow-left me-1"></i> Geri Dön
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    <div className="col-md-8">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h6 className="mb-0">Soru İçeriği</h6>
                            </div>
                            <div className="card-body">
                                <div className="mb-4">
                                    <label className="form-label">Soru Metni *</label>
                                    <textarea
                                        className="form-control"
                                        rows={6}
                                        name="question_text"
                                        value={question.question_text}
                                        onChange={handleInputChange}
                                        placeholder="Soru metnini buraya yazın..."
                                        required
                                    />
                                </div>

                                {/* Soru Tipine Göre Alanlar */}
                                {question.question_type === 'multiple_choice' && (
                                    <div className="mb-4">
                                        <label className="form-label d-block mb-3">Seçenekler ve Doğru Cevap</label>
                                        {['A', 'B', 'C', 'D', 'E'].map((letter, index) => (
                                            <div key={letter} className="input-group mb-2">
                                                <div className="input-group-text">
                                                    <input
                                                        className="form-check-input mt-0"
                                                        type="radio"
                                                        name="correct_answer"
                                                        value={letter}
                                                        checked={question.correct_answer === letter}
                                                        onChange={e => setQuestion({ ...question, correct_answer: e.target.value })}
                                                    />
                                                    <span className="ms-2 fw-bold">{letter}</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={question.options[index] || ''}
                                                    onChange={e => handleOptionChange(index, e.target.value)}
                                                    placeholder={`Seçenek ${letter} metni...`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {question.question_type === 'true_false' && (
                                    <div className="mb-4">
                                        <label className="form-label">Doğru Cevap</label>
                                        <div className="d-flex gap-4 mt-2">
                                            <div className="form-check">
                                                <input className="form-check-input" type="radio" name="correct_answer" value="true" checked={question.correct_answer === 'true'} onChange={handleInputChange} />
                                                <label className="form-check-label">Doğru</label>
                                            </div>
                                            <div className="form-check">
                                                <input className="form-check-input" type="radio" name="correct_answer" value="false" checked={question.correct_answer === 'false'} onChange={handleInputChange} />
                                                <label className="form-check-label">Yanlış</label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mb-0">
                                    <label className="form-label">Çözüm / Açıklama</label>
                                    <textarea
                                        className="form-control"
                                        rows={4}
                                        name="explanation"
                                        value={question.explanation}
                                        onChange={handleInputChange}
                                        placeholder="Doğru cevabın açıklamasını buraya yazabilirsiniz..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h6 className="mb-0">Kategorizasyon</h6>
                            </div>
                            <div className="card-body">
                                <div className="mb-3">
                                    <label className="form-label">Ders *</label>
                                    <select className="form-select" name="lesson_id" value={question.lesson_id} onChange={handleInputChange} required>
                                        <option value="">Ders Seçin...</option>
                                        {lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Konu *</label>
                                    <select className="form-select" name="question_bank_topic_id" value={question.question_bank_topic_id} onChange={handleInputChange} required>
                                        <option value="">Konu Seçin...</option>
                                        {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Soru Tipi</label>
                                    <select className="form-select" name="question_type" value={question.question_type} onChange={handleInputChange}>
                                        <option value="multiple_choice">Çoktan Seçmeli</option>
                                        <option value="true_false">Doğru / Yanlış</option>
                                        <option value="fill_in_blank">Boşluk Doldurma</option>
                                        <option value="short_answer">Kısa Cevap</option>
                                        <option value="essay">Açık Uçlu (Essay)</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Zorluk Seviyesi</label>
                                    <select className="form-select" name="difficulty_level" value={question.difficulty_level} onChange={handleInputChange}>
                                        <option value="easy">Kolay</option>
                                        <option value="medium">Orta</option>
                                        <option value="hard">Zor</option>
                                        <option value="very_hard">Çok Zor</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Puan Değeri</label>
                                    <input type="number" className="form-control" name="points" value={question.points} onChange={handleInputChange} />
                                </div>
                                <div className="form-check form-switch mt-4">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        name="is_active"
                                        checked={question.is_active}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label">Aktif Soru</label>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <button type="submit" className="btn btn-primary w-100 mb-2" disabled={submitting}>
                                    {submitting ? 'Kaydediliyor...' : 'Soruyu Kaydet'}
                                </button>
                                <button type="button" className="btn btn-outline-secondary w-100" onClick={() => navigate('/academic/question-bank')}>
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default QuestionBankForm;
