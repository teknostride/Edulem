import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Student {
    id: number;
    name: string;
    grade: string;
    class_name: string;
}

interface Counselor {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    role: string;
}

interface CounselingNote {
    id?: number;
    student_id: number;
    counselor_id: number;
    title: string;
    content: string;
    tags: string[];
    is_private: boolean;
}

const CounselingNoteForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [counselors, setCounselors] = useState<Counselor[]>([]);
    const [note, setNote] = useState<CounselingNote>({
        student_id: 0,
        counselor_id: 0,
        title: '',
        content: '',
        tags: [],
        is_private: false,
    });

    const [tagInput, setTagInput] = useState('');
    const [isListening, setIsListening] = useState(false);

    const toggleListening = () => {
        if (isListening) {
            const recognition = (window as any)._noteRecognition;
            if (recognition) recognition.stop();
            setIsListening(false);
        } else {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showToast('error', 'Tarayıcınız ses tanıma özelliğini desteklemiyor. (Chrome kullanın)');
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'tr-TR';
            recognition.continuous = true;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: any) => {
                let newText = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) newText += event.results[i][0].transcript + ' ';
                }
                if (newText) {
                    setNote(prev => ({ ...prev, content: prev.content + newText }));
                }
            };
            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);

            (window as any)._noteRecognition = recognition;
            recognition.start();
        }
    };

    useEffect(() => {
        fetchDropdownData();
        if (id) {
            fetchNote();
        }
    }, [id]);

    const fetchDropdownData = async () => {
        try {
            const [studentsRes] = await Promise.all([
                axiosClient.get('/counseling/students'),
            ]);

            // Not: Counselor endpointi CounselingController içinde getCounselors olarak tanımlandı
            // api.php: Route::get('/counselors', [CounselingController::class, 'getCounselors']);
            // Ama api.php'de prefix 'counseling' altında. Yani /counseling/counselors olmalı.

            const counselorsResponse = await axiosClient.get('/counseling/counselors');

            setStudents(studentsRes.data.data);
            setCounselors(counselorsResponse.data.data);
        } catch (error) {
            console.error('Veriler yüklenemedi:', error);
            showToast('error', 'Veriler yüklenemedi');
        }
    };

    const fetchNote = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/counseling/notes/${id}`);
            setNote(response.data.data);
        } catch (error) {
            console.error('Not yüklenemedi:', error);
            showToast('error', 'Not yüklenemedi');
            navigate('/counseling');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!note.student_id || !note.counselor_id || !note.title || !note.content) {
            showToast('error', 'Tüm zorunlu alanları doldurun');
            return;
        }

        try {
            setSubmitting(true);

            if (id) {
                await axiosClient.put(`/counseling/notes/${id}`, note);
                showToast('success', 'Not başarıyla güncellendi');
            } else {
                await axiosClient.post('/counseling/notes', note);
                showToast('success', 'Not başarıyla oluşturuldu');
            }

            navigate('/counseling');
        } catch (error) {
            console.error('İşlem başarısız:', error);
            showToast('error', id ? 'Not güncellenemedi' : 'Not oluşturulamadı');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setNote(prev => ({
            ...prev,
            [name]: val
        }));
    };

    const addTag = () => {
        if (tagInput && !note.tags.includes(tagInput)) {
            setNote(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setNote(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
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
                    <h4 className="page-title mb-1">
                        {id ? 'Not Düzenle' : 'Yeni Rehberlik Notu'}
                    </h4>
                    <small className="text-muted">
                        {id ? 'Mevcut notu güncelleyin' : 'Öğrenci hakkında yeni bir not ekleyin'}
                    </small>
                </div>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/counseling')}
                >
                    <i className="ti ti-arrow-left me-1"></i>
                    Geri Dön
                </button>
            </div>

            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label htmlFor="student_id" className="form-label">Öğrenci *</label>
                                    <select
                                        className="form-select"
                                        id="student_id"
                                        name="student_id"
                                        value={note.student_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Öğrenci seçin...</option>
                                        {students.map((student) => (
                                            <option key={student.id} value={student.id}>
                                                {student.name} ({student.class_name} - {student.grade})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="counselor_id" className="form-label">Danışman *</label>
                                    <select
                                        className="form-select"
                                        id="counselor_id"
                                        name="counselor_id"
                                        value={note.counselor_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Danışman seçin...</option>
                                        {counselors.map((counselor) => (
                                            <option key={counselor.id} value={counselor.id}>
                                                {counselor.name || `${counselor.first_name} ${counselor.last_name}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="title" className="form-label">Başlık *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="title"
                                        name="title"
                                        value={note.title}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Not başlığı..."
                                    />
                                </div>

                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="is_private"
                                        name="is_private"
                                        checked={note.is_private}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label" htmlFor="is_private">
                                        Gizli Not (Sadece siz görebilirsiniz)
                                    </label>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Etiketler</label>
                                    <div className="input-group mb-2">
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            placeholder="Etiket ekle..."
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        />
                                        <button className="btn btn-outline-primary" type="button" onClick={addTag}>Ekle</button>
                                    </div>
                                    <div className="d-flex flex-wrap gap-1">
                                        {note.tags.map(tag => (
                                            <span key={tag} className="badge bg-soft-info text-info d-flex align-items-center">
                                                {tag}
                                                <i className="ti ti-x ms-1 style={{cursor: 'pointer'}}" onClick={() => removeTag(tag)}></i>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-12">
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label htmlFor="content" className="form-label mb-0">İçerik *</label>
                                        <button
                                            type="button"
                                            className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-outline-primary'}`}
                                            onClick={toggleListening}
                                            title={isListening ? 'Dinlemeyi Durdur' : 'Sesle Yazdır'}
                                        >
                                            <i className={`ti ${isListening ? 'ti-microphone' : 'ti-microphone'} me-1`}></i>
                                            {isListening ? 'Dinleniyor...' : 'Sesle Yazdır'}
                                        </button>
                                    </div>
                                    <textarea
                                        className="form-control"
                                        id="content"
                                        name="content"
                                        value={note.content}
                                        onChange={handleInputChange}
                                        rows={8}
                                        required
                                        placeholder="Detaylı not içeriği..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        {id ? 'Güncelleniyor...' : 'Kaydediliyor...'}
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-device-floppy me-1"></i>
                                        {id ? 'Güncelle' : 'Kaydet'}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate('/counseling')}
                                disabled={submitting}
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

export default CounselingNoteForm;
