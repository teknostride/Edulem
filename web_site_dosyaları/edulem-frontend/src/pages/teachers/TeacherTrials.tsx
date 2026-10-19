import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Layers, Download, Loader2 } from 'lucide-react';

interface OmrExam {
    id: number;
    name: string;
    exam_type: string;
    exam_date: string;
    session: string | null;
    status: string;
}

interface OmrSession {
    id: number;
    name: string;
    exam_type: string;
    exam_date: string;
    exam_ids: number[];
    created_at: string;
}

const TeacherTrials: React.FC = () => {
    const [exams, setExams] = useState<OmrExam[]>([]);
    const [sessions, setSessions] = useState<OmrSession[]>([]);

    const [selectedExams, setSelectedExams] = useState<number[]>([]);

    const [loadingExams, setLoadingExams] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [isMerging, setIsMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sessionName, setSessionName] = useState('');

    const fetchExams = async () => {
        try {
            setLoadingExams(true);
            const res = await axiosClient.get('/omr/exams');
            if (res.data?.data?.exams) {
                setExams(res.data.data.exams);
            }
        } catch (err: unknown) {
            console.error('Sınavlar getirilirken hata:', err);
        } finally {
            setLoadingExams(false);
        }
    };

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const res = await axiosClient.get('/omr/sessions');
            if (res.data?.data?.sessions) {
                setSessions(res.data.data.sessions);
            }
        } catch (err: unknown) {
            console.error('Oturumlar getirilirken hata:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        fetchExams();
        fetchSessions();
    }, []);

    const handleExamSelect = (id: number) => {
        setSelectedExams((prev) =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const handleMerge = async () => {
        if (selectedExams.length < 2) {
            setError('Birleştirme için en az 2 sınav seçmelisiniz.');
            return;
        }
        if (!sessionName.trim()) {
            setError('Lütfen birleştirilmiş oturum için bir ad giriniz.');
            return;
        }

        try {
            setIsMerging(true);
            setError(null);

            const payload = {
                name: sessionName,
                exam_type: exams.find(e => e.id === selectedExams[0])?.exam_type || 'MIXED',
                exam_ids: selectedExams
            };

            await axiosClient.post('/omr/sessions', payload);

            setSessionName('');
            setSelectedExams([]);
            await fetchSessions();
        } catch (err: unknown) {
            let msg = 'Birleştirme işlemi sırasında hata oluştu.';
            if (typeof err === 'object' && err !== null && 'response' in err) {
                msg = (err as any).response?.data?.message || msg;
            }
            setError(msg);
        } finally {
            setIsMerging(false);
        }
    };

    const handleDownloadBulkReportCard = async (sessionId: number, sessionNameArg: string) => {
        try {
            const response = await axiosClient.get(`/omr/sessions/${sessionId}/report-card/bulk`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${sessionNameArg}-Karneler.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: unknown) {
            console.error('Karne indirirken hata:', err);
            setError('Karne indirilemedi. Lütfen daha sonra tekrar deneyin.');
        }
    };

    return (
        <>
            <div className="container-fluid px-4 py-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h4 className="mb-0 fw-bold">Deneme Sınavları</h4>
                        <span className="text-muted d-block mt-1">Sınavları görüntüleyin ve oturumları birleştirin</span>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                        {error}
                        <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                    </div>
                )}

                <div className="row">
                    <div className="col-md-7">
                        <div className="card shadow-sm border-0 mb-4 h-100">
                            <div className="card-body">
                                <h5 className="card-title mb-4 border-bottom pb-2">1. Birleştirilecek Sınavları Seçin</h5>

                                {loadingExams ? (
                                    <div className="text-center py-5">
                                        <Loader2 className="spinner-border text-primary" size={32} />
                                        <div className="mt-2 text-muted">Sınavlar yükleniyor...</div>
                                    </div>
                                ) : exams.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        Sistemde aktif deneme sınavı bulunmuyor.
                                    </div>
                                ) : (
                                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table className="table table-hover align-middle">
                                            <thead className="table-light sticky-top">
                                                <tr>
                                                    <th style={{ width: '40px' }}></th>
                                                    <th>Sınav Adı</th>
                                                    <th>Tarih</th>
                                                    <th>Tür</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exams.map(exam => (
                                                    <tr key={exam.id} onClick={() => handleExamSelect(exam.id)} style={{ cursor: 'pointer' }}>
                                                        <td>
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                checked={selectedExams.includes(exam.id)}
                                                                onChange={() => handleExamSelect(exam.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </td>
                                                        <td>
                                                            <div className="fw-medium">{exam.name}</div>
                                                            {exam.session && <small className="text-muted">Oturum: {exam.session}</small>}
                                                        </td>
                                                        <td>
                                                            {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('tr-TR') : '-'}
                                                        </td>
                                                        <td><span className="badge bg-info">{exam.exam_type}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-4 p-3 bg-light rounded border">
                                    <h6>Seçili Sınavları Birleştir ({selectedExams.length} seçili)</h6>
                                    <div className="d-flex gap-2 align-items-center mt-3">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Örn: 1. Dönem TYT-AYT Birleştirilmiş Oturumu"
                                            value={sessionName}
                                            onChange={(e) => setSessionName(e.target.value)}
                                            disabled={selectedExams.length < 2 || isMerging}
                                        />
                                        <button
                                            className="btn btn-primary d-flex align-items-center gap-2"
                                            onClick={handleMerge}
                                            disabled={selectedExams.length < 2 || isMerging || !sessionName.trim()}
                                        >
                                            {isMerging ? <Loader2 size={16} className="fa-spin spinner-border" /> : <Layers size={16} />}
                                            Birleştir
                                        </button>
                                    </div>
                                    {selectedExams.length < 2 && (
                                        <small className="text-muted d-block mt-2">
                                            Birleştirme yapabilmek için listeden en az 2 sınav seçmelisiniz.
                                        </small>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-5">
                        <div className="card shadow-sm border-0 mb-4 h-100">
                            <div className="card-body">
                                <h5 className="card-title mb-4 border-bottom pb-2">2. Toplu Karneleri Alın</h5>

                                {loadingSessions ? (
                                    <div className="text-center py-5">
                                        <Loader2 className="spinner-border text-success" size={32} />
                                        <div className="mt-2 text-muted">Oturumlar yükleniyor...</div>
                                    </div>
                                ) : sessions.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        <Layers size={40} className="mb-3 text-secondary opacity-50" />
                                        <p>Henüz birleştirilmiş oturum bulunmuyor.</p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                        {sessions.map(session => (
                                            <div key={session.id} className="p-3 border rounded shadow-sm d-flex flex-column bg-white">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <h6 className="fw-bold mb-0 text-primary">{session.name}</h6>
                                                    <span className="badge bg-secondary">{session.exam_type}</span>
                                                </div>
                                                <div className="text-muted small mb-3">
                                                    <span className="d-block">Birleştirilen Sınav Sayısı: {session.exam_ids?.length || 0}</span>
                                                    <span className="d-block">Tarih: {new Date(session.created_at).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                                <button
                                                    className="btn btn-success d-flex justify-content-center align-items-center gap-2"
                                                    onClick={() => handleDownloadBulkReportCard(session.id, session.name)}
                                                >
                                                    <Download size={16} />
                                                    Toplu Karne İndir
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TeacherTrials;
