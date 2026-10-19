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

interface Definition {
    student_id_start: number;
    student_id_end: number;
    answers_start: number;
    answers_end: number;
    score_column?: number; // Optional if score is pre-calculated in file
}

const OpticalFormDefinition = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<Exam | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [lines, setLines] = useState<string[]>([]);
    const [definition, setDefinition] = useState<Definition>({
        student_id_start: 1,
        student_id_end: 5,
        answers_start: 10,
        answers_end: 30
    });
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchExam();
    }, [id]);

    const fetchExam = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/exams/${id}`);
            setExam(response.data.data);
        } catch (error) {
            showToast('error', 'Sınav bilgileri yüklenemedi');
            navigate('/academic/exams');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setFileContent(content);
                setLines(content.split('\n').filter(line => line.trim() !== '').slice(0, 10)); // Preview first 10 lines
            };
            reader.readAsText(selectedFile);
        }
    };

    const handleDefinitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDefinition(prev => ({
            ...prev,
            [name]: parseInt(value) || 0
        }));
    };

    const handlePreview = () => {
        if (!fileContent) return;

        const allLines = fileContent.split('\n').filter(line => line.trim() !== '');
        const preview = allLines.slice(0, 5).map(line => {
            const studentId = line.substring(definition.student_id_start - 1, definition.student_id_end).trim();
            const answers = line.substring(definition.answers_start - 1, definition.answers_end).trim();
            return { studentId, answers };
        });
        setParsedData(preview);
    };

    const handleProcess = async () => {
        if (!fileContent) {
            showToast('error', 'Lütfen bir dosya seçin');
            return;
        }

        try {
            setProcessing(true);
            const allLines = fileContent.split('\n').filter(line => line.trim() !== '');
            const formData: any = {};

            allLines.forEach(line => {
                const studentId = line.substring(definition.student_id_start - 1, definition.student_id_end).trim();
                const answers = line.substring(definition.answers_start - 1, definition.answers_end).trim();

                if (studentId) {
                    formData[studentId] = {
                        answers: answers.split(''), // Array formunda gönderiyoruz
                        score: 0 // Backend hesaplayacak veya biz basit bir puanlama yapabiliriz
                    };
                }
            });

            await axiosClient.post(`/exams/${id}/process-optical`, {
                form_data: formData
            });

            showToast('success', 'Optik form başarıyla işlendi');
            navigate('/academic/exams');
        } catch (error) {
            showToast('error', 'İşlem sırasında bir hata oluştu');
        } finally {
            setProcessing(false);
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
                    <h4 className="page-title mb-1">Optik Form Tanımlama ve İşleme</h4>
                    <p className="text-muted mb-0">
                        {exam?.lesson_name} - {exam?.classroom_name} ({new Date(exam?.exam_date || '').toLocaleDateString('tr-TR')})
                    </p>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/academic/exams')}>
                    <i className="ti ti-arrow-left me-1"></i>
                    Geri Dön
                </button>
            </div>

            <div className="row">
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-transparent border-0">
                            <h5 className="mb-0">1. Dosya Seçimi</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label">Optik Data Dosyası (.txt, .csv)</label>
                                <input type="file" className="form-control" onChange={handleFileChange} accept=".txt,.csv,.dat" />
                            </div>
                            {file && (
                                <div className="alert alert-info py-2 small mb-0">
                                    <i className="ti ti-file-description me-1"></i>
                                    {file.name} ({Math.round(file.size / 1024)} KB)
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-transparent border-0">
                            <h5 className="mb-0">2. Alan Tanımları</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-2 mb-3">
                                <label className="form-label mb-1">Öğrenci No (Okul No)</label>
                                <div className="col-6">
                                    <input type="number" name="student_id_start" className="form-control form-control-sm" placeholder="Başlangıç" value={definition.student_id_start} onChange={handleDefinitionChange} />
                                </div>
                                <div className="col-6">
                                    <input type="number" name="student_id_end" className="form-control form-control-sm" placeholder="Bitiş" value={definition.student_id_end} onChange={handleDefinitionChange} />
                                </div>
                                <small className="text-muted">Karakter aralığı (Örn: 1-5)</small>
                            </div>

                            <div className="row g-2 mb-4">
                                <label className="form-label mb-1">Cevap Anahtarı</label>
                                <div className="col-6">
                                    <input type="number" name="answers_start" className="form-control form-control-sm" placeholder="Başlangıç" value={definition.answers_start} onChange={handleDefinitionChange} />
                                </div>
                                <div className="col-6">
                                    <input type="number" name="answers_end" className="form-control form-control-sm" placeholder="Bitiş" value={definition.answers_end} onChange={handleDefinitionChange} />
                                </div>
                                <small className="text-muted">Karakter aralığı (Örn: 10-30)</small>
                            </div>

                            <button className="btn btn-info w-100" onClick={handlePreview} disabled={!fileContent}>
                                <i className="ti ti-eye me-1"></i>
                                Önizlemeyi Güncelle
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    <div className="card shadow-sm border-0 mb-4" style={{ height: 'calc(100% - 1.5rem)' }}>
                        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">3. Veri Önizleme</h5>
                            {parsedData.length > 0 && (
                                <button
                                    className="btn btn-success"
                                    onClick={handleProcess}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <span className="spinner-border spinner-border-sm me-1"></span>
                                    ) : (
                                        <i className="ti ti-check me-1"></i>
                                    )}
                                    İşleme Başlat
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            {lines.length > 0 ? (
                                <>
                                    <h6>Ham Veri (İlk 10 Satır)</h6>
                                    <pre className="bg-light p-3 rounded mb-4" style={{ fontSize: '12px', overflowX: 'auto' }}>
                                        {lines.join('\n')}
                                    </pre>

                                    {parsedData.length > 0 && (
                                        <>
                                            <h6>Eşleşen Veriler (İlk 5 Kayıt)</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm table-bordered">
                                                    <thead className="bg-light">
                                                        <tr>
                                                            <th>Öğrenci No</th>
                                                            <th>Cevaplar</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {parsedData.map((d, i) => (
                                                            <tr key={i}>
                                                                <td className="fw-bold text-primary">{d.studentId}</td>
                                                                <td className="text-break" style={{ letterSpacing: '2px' }}>{d.answers}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="ti ti-file-upload display-4 mb-3"></i>
                                    <p>Lütfen bir optik data dosyası yükleyin ve alanları tanımlayın.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpticalFormDefinition;
