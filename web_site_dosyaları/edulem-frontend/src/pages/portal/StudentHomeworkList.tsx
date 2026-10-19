import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

interface Homework {
    id: number;
    title: string;
    description?: string;
    due_date: string;
    is_online?: boolean;
    is_project?: boolean;
    is_checked?: boolean;
    review_status?: string | null;
    status?: string;
    lesson: {
        name: string;
    };
    teacher?: {
        name: string;
    };
    file?: {
        id: number;
        name: string;
        url: string;
    } | null;
    submission?: {
        id: number;
        status: string;
        submitted_at?: string;
        grade?: number;
        selected_topic?: string;
    } | null;
    review?: {
        status?: string | null;
        status_label: string;
        teacher_note?: string | null;
        reviewed_at?: string | null;
    };
}

const getStatusMeta = (status?: string | null, label?: string) => {
    switch (status?.toLowerCase()) {
        case 'done':
        case 'yaptı':
            return {
                label: label || 'Yaptı',
                bgSoft: 'bg-soft-success text-success',
                bgSolid: 'bg-success text-white',
                icon: 'ti ti-check',
                alertBg: '#f0fdf4',
                alertBorder: '#bbf7d0',
                textClass: 'text-success'
            };
        case 'not_done':
        case 'yapmadı':
            return {
                label: label || 'Yapmadı',
                bgSoft: 'bg-soft-danger text-danger',
                bgSolid: 'bg-danger text-white',
                icon: 'ti ti-x',
                alertBg: '#fef2f2',
                alertBorder: '#fecaca',
                textClass: 'text-danger'
            };
        case 'partial':
        case 'yarım yaptı':
        case 'kısmen yaptı':
            return {
                label: label || 'Yarım Yaptı',
                bgSoft: 'bg-soft-warning text-warning',
                bgSolid: 'bg-warning text-dark',
                icon: 'ti ti-alert-circle',
                alertBg: '#fffbeb',
                alertBorder: '#fde68a',
                textClass: 'text-warning'
            };
        case 'missing':
        case 'eksik':
            return {
                label: label || 'Eksik',
                bgSoft: 'bg-soft-warning text-warning',
                bgSolid: 'bg-warning text-dark',
                icon: 'ti ti-alert-triangle',
                alertBg: '#fffbeb',
                alertBorder: '#fde68a',
                textClass: 'text-warning'
            };
        default:
            return {
                label: label || 'Değerlendirilmedi',
                bgSoft: 'bg-soft-secondary text-secondary',
                bgSolid: 'bg-secondary text-white',
                icon: 'ti ti-clock',
                alertBg: '#f8fafc',
                alertBorder: '#e2e8f0',
                textClass: 'text-secondary'
            };
    }
};

const StudentHomeworkList = () => {
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);

    useEffect(() => {
        fetchHomeworks();
    }, []);

    const fetchHomeworks = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/portal/student/homework');
            const data = res.data?.data;
            if (Array.isArray(data?.homeworks)) {
                setHomeworks(data.homeworks);
            } else if (Array.isArray(data)) {
                setHomeworks(data);
            } else {
                setHomeworks([]);
            }
        } catch (error) {
            console.error('Ödevler yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
            </div>
        </div>
    );

    const modalMeta = selectedHomework ? getStatusMeta(selectedHomework.review?.status, selectedHomework.review?.status_label) : null;

    return (
        <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="page-title mb-1">Ödevlerim</h4>
                    <p className="text-muted mb-0">Derslere ait ödevleri ve öğretmen kontrol durumunu buradan takip edebilir, detayları inceleyebilirsiniz.</p>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4">Ders / Ödev</th>
                                            <th>Teslim Tarihi</th>
                                            <th>Durum</th>
                                            <th>Öğretmen Kontrolü</th>
                                            <th className="text-end pe-4">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {homeworks.map((hw) => {
                                            const meta = getStatusMeta(hw.review?.status, hw.review?.status_label);

                                            return (
                                                <tr 
                                                    key={hw.id}
                                                    onClick={() => setSelectedHomework(hw)}
                                                    className="homework-table-row"
                                                    style={{ cursor: 'pointer' }}
                                                    title="Ödev detaylarını görmek için tıklayın"
                                                >
                                                    <td className="ps-4">
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar-sm bg-soft-primary rounded p-2 me-3 flex-shrink-0">
                                                                <i className="ti ti-book-2 text-primary fs-4"></i>
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0 fw-bold">{hw.title}</h6>
                                                                <small className="text-muted">{hw.lesson?.name || '---'}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center text-nowrap">
                                                            <i className="ti ti-calendar me-2 text-muted"></i>
                                                            {hw.due_date ? new Date(hw.due_date).toLocaleDateString('tr-TR') : '---'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge w-fit ${meta.bgSoft}`}>
                                                            <i className={`${meta.icon} me-1`}></i>
                                                            {meta.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column" style={{ maxWidth: '280px' }}>
                                                            {hw.review?.teacher_note ? (
                                                                <small className="text-muted text-truncate" title={hw.review.teacher_note}>
                                                                    <i className="ti ti-message me-1"></i>
                                                                    {hw.review.teacher_note}
                                                                </small>
                                                            ) : (
                                                                <small className="text-muted fst-italic">Not girilmedi</small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-end pe-4 text-nowrap">
                                                        <div className="d-flex align-items-center justify-content-end gap-2">
                                                            {hw.review?.status ? (
                                                                <span className={`badge ${meta.bgSolid}`}>
                                                                    <i className={`${meta.icon} me-1`}></i>
                                                                    {meta.label}
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-secondary text-white">
                                                                    <i className="ti ti-clock me-1"></i>Bekliyor
                                                                </span>
                                                            )}
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedHomework(hw);
                                                                }}
                                                            >
                                                                <i className="ti ti-eye"></i>
                                                                <span>Detay</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {homeworks.length === 0 && (
                                <div className="text-center py-5">
                                    <i className="ti ti-mood-empty display-4 text-muted mb-3"></i>
                                    <h5>Henüz tanımlanmış bir ödev bulunmamaktadır. ✨</h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ödev Detay Modalı */}
            {selectedHomework && (
                <div 
                    className="modal fade show d-block" 
                    tabIndex={-1} 
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}
                    onClick={() => setSelectedHomework(null)}
                >
                    <div 
                        className="modal-dialog modal-dialog-centered modal-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                            <div className="modal-header bg-light py-3 px-4 border-0">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="avatar-sm bg-soft-primary rounded p-2 d-flex align-items-center justify-content-center">
                                        <i className="ti ti-book-2 text-primary fs-3"></i>
                                    </div>
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0 text-dark">{selectedHomework.title}</h5>
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            <span className="badge bg-soft-primary text-primary">
                                                {selectedHomework.lesson?.name || 'Ders'}
                                            </span>
                                            {selectedHomework.teacher?.name && (
                                                <small className="text-muted">
                                                    <i className="ti ti-user me-1"></i>
                                                    {selectedHomework.teacher.name}
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setSelectedHomework(null)}
                                    aria-label="Kapat"
                                ></button>
                            </div>

                            <div className="modal-body p-4">
                                {/* Bilgi Kartları */}
                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-md-4">
                                        <div className="p-3 bg-light rounded-3 h-100">
                                            <div className="text-muted small mb-1">
                                                <i className="ti ti-calendar me-1"></i>Son Teslim Tarihi
                                            </div>
                                            <div className="fw-bold text-dark">
                                                {selectedHomework.due_date ? new Date(selectedHomework.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <div className="p-3 bg-light rounded-3 h-100">
                                            <div className="text-muted small mb-1">
                                                <i className="ti ti-checkup-list me-1"></i>Kontrol Durumu
                                            </div>
                                            <div>
                                                {selectedHomework.review?.status ? (
                                                    <span className={`badge ${modalMeta?.bgSolid}`}>
                                                        <i className={`${modalMeta?.icon} me-1`}></i>
                                                        Kontrol Edildi: {modalMeta?.label}
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-secondary text-white">
                                                        <i className="ti ti-clock me-1"></i>Bekliyor
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4">
                                        <div className="p-3 bg-light rounded-3 h-100">
                                            <div className="text-muted small mb-1">
                                                <i className="ti ti-award me-1"></i>Değerlendirme
                                            </div>
                                            <div className="fw-bold text-dark">
                                                <span className={`badge ${modalMeta?.bgSoft}`}>
                                                    <i className={`${modalMeta?.icon} me-1`}></i>
                                                    {modalMeta?.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ödev Açıklaması */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-2 text-dark d-flex align-items-center gap-1">
                                        <i className="ti ti-file-text text-primary"></i>
                                        Ödev Açıklaması
                                    </h6>
                                    <div 
                                        className="p-3 rounded-3 text-break" 
                                        style={{ 
                                            backgroundColor: '#f8fafc', 
                                            border: '1px solid #e2e8f0', 
                                            minHeight: '80px',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    >
                                        {selectedHomework.description?.trim() ? (
                                            selectedHomework.description
                                        ) : (
                                            <span className="text-muted fst-italic">Açıklama belirtilmemiş.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Öğretmen Değerlendirmesi ve Notu */}
                                {(selectedHomework.review?.status || selectedHomework.review?.teacher_note) && (
                                    <div className="mb-4">
                                        <div 
                                            className="p-3 rounded-3" 
                                            style={{ 
                                                backgroundColor: modalMeta?.alertBg, 
                                                border: `1px solid ${modalMeta?.alertBorder}` 
                                            }}
                                        >
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <h6 className={`fw-bold mb-0 d-flex align-items-center gap-2 ${modalMeta?.textClass}`}>
                                                    <i className={`${modalMeta?.icon} fs-5`}></i>
                                                    Öğretmen Değerlendirmesi
                                                </h6>
                                                {selectedHomework.review?.reviewed_at && (
                                                    <small className="text-muted">
                                                        <i className="ti ti-clock me-1"></i>
                                                        {new Date(selectedHomework.review.reviewed_at).toLocaleDateString('tr-TR')}
                                                    </small>
                                                )}
                                            </div>
                                            <div className="mb-2">
                                                <span className="fw-semibold text-dark me-2">Sonuç:</span>
                                                <span className={`badge ${modalMeta?.bgSolid}`}>
                                                    {modalMeta?.label}
                                                </span>
                                            </div>
                                            {selectedHomework.review?.teacher_note && (
                                                <div className="mt-2 pt-2 border-top" style={{ borderColor: modalMeta?.alertBorder }}>
                                                    <span className="fw-semibold text-dark d-block mb-1">Öğretmen Notu:</span>
                                                    <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                                                        {selectedHomework.review.teacher_note}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Proje Konusu Bilgisi (varsa) */}
                                {selectedHomework.submission?.selected_topic && (
                                    <div className="mb-4">
                                        <div className="p-3 rounded-3 bg-light border">
                                            <h6 className="fw-bold text-dark mb-1">
                                                <i className="ti ti-bulb text-warning me-1"></i>
                                                Seçilen Proje Konusu
                                            </h6>
                                            <p className="mb-0 text-muted">{selectedHomework.submission.selected_topic}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Ekli Dosya (varsa) */}
                                {selectedHomework.file && (
                                    <div className="mb-2">
                                        <h6 className="fw-bold mb-2 text-dark d-flex align-items-center gap-1">
                                            <i className="ti ti-paperclip text-primary"></i>
                                            Ödev Dosyası
                                        </h6>
                                        <div className="p-3 rounded-3 border d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center gap-2 overflow-hidden me-3">
                                                <i className="ti ti-file-description text-primary fs-3 flex-shrink-0"></i>
                                                <span className="fw-medium text-dark text-truncate" title={selectedHomework.file.name}>
                                                    {selectedHomework.file.name}
                                                </span>
                                            </div>
                                            {selectedHomework.file.url && (
                                                <a 
                                                    href={selectedHomework.file.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="btn btn-sm btn-primary rounded-pill px-3 text-nowrap flex-shrink-0"
                                                >
                                                    <i className="ti ti-download me-1"></i>
                                                    İndir
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer bg-light py-2 px-4 border-0">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary rounded-pill px-4"
                                    onClick={() => setSelectedHomework(null)}
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .homework-table-row:hover {
                    background-color: rgba(13, 110, 253, 0.04) !important;
                }
                .bg-soft-primary { background-color: rgba(13, 110, 253, 0.1); }
                .bg-soft-info { background-color: rgba(13, 202, 240, 0.1); }
                .bg-soft-success { background-color: rgba(25, 135, 84, 0.1); }
                .bg-soft-danger { background-color: rgba(220, 53, 69, 0.1); }
                .bg-soft-warning { background-color: rgba(255, 193, 7, 0.18); }
                .bg-soft-secondary { background-color: rgba(108, 117, 125, 0.1); }
                .w-fit { width: fit-content; }
            `}</style>
        </div>
    );
};

export default StudentHomeworkList;
