import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { useParams, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface Application {
    id: number;
    name: string;
    phone: string;
    school_name: string | null;
    grade_level: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'attended';
    application_number: string;
}

const ScholarshipApplicationList: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [exam, setExam] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        phone: '',
        email: '',
        tc_identity_number: '',
        school_name: '',
        grade_level: '',
        session_id: '',
        session_time: '',
    });

    const fetchExam = async () => {
        try {
            if (!examId) return;
            const res = await axiosClient.get(`/scholarship-exams/${examId}`);
            const d = res.data?.data ?? res.data;
            setExam(d);
        } catch (e) {
            setExam(null);
        }
    };

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/scholarship-exams/${examId}/applications`);
            const d = response.data?.data ?? response.data;
            const raw = d?.applications;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data)
                    ? raw.data
                    : [];
            setApplications(list);
        } catch (error) {
            showToast('error', 'Başvuru listesi yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
        fetchExam();
    }, [examId]);

    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            phone: '',
            email: '',
            tc_identity_number: '',
            school_name: '',
            grade_level: '',
            session_id: '',
            session_time: '',
        });
    };

    const handleCreateApplication = async () => {
        if (!examId) return;

        try {
            setCreateLoading(true);
            await axiosClient.post('/scholarship-exams/applications', {
                scholarship_exam_id: Number(examId),
                name: createForm.name,
                phone: createForm.phone,
                email: createForm.email || null,
                tc_identity_number: createForm.tc_identity_number || null,
                school_name: createForm.school_name || null,
                grade_level: createForm.grade_level || null,
                session_id: createForm.session_id || null,
                session_time: createForm.session_time || null,
            });

            showToast('success', 'Başvuru başarıyla kaydedildi');
            setShowCreateModal(false);
            resetCreateForm();
            fetchApplications();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Başvuru kaydedilemedi');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleProcess = async (id: number, status: string) => {
        try {
            await axiosClient.post(`/scholarship-exams/applications/${id}/process`, { status });
            showToast('success', `Başvuru durumu ${status} olarak güncellendi`);
            fetchApplications();
        } catch (error) {
            showToast('error', 'İşlem başarısız');
        }
    };

    const handleGenerateEntryDoc = async () => {
        try {
            showToast('info', 'Giriş belgeleri toplu olarak hazırlanıyor...');
            await axiosClient.post(`/scholarship-exams/${examId}/generate-entry-document`);
            showToast('success', 'Belgeler hazırlandı');
            fetchApplications();
        } catch (error) {
            showToast('error', 'Belge hazırlama hatası');
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Beklemede';
            case 'approved': return 'Onaylandı';
            case 'rejected': return 'Reddedildi';
            case 'attended': return 'Katıldı';
            default: return status;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="badge bg-warning">Beklemede</span>;
            case 'approved': return <span className="badge bg-success">Onaylandı</span>;
            case 'rejected': return <span className="badge bg-danger">Reddedildi</span>;
            case 'attended': return <span className="badge bg-info">Katıldı</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    const filteredApplications = (Array.isArray(applications) ? applications : []).filter(app =>
        (app.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.application_number || '').includes(searchTerm)
    );

    const handleExportExcel = () => {
        if (filteredApplications.length === 0) {
            showToast('warning', 'Dışa aktarılacak kayıt bulunamadı');
            return;
        }

        const exportData = filteredApplications.map(app => ({
            'Başvuru No': app.application_number,
            'Aday Adı': app.name,
            'Okul': app.school_name || '-',
            'Sınıf': app.grade_level ? `${app.grade_level}. Sınıf` : '-',
            'İletişim': app.phone,
            'Durum': getStatusText(app.status),
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Başvurular');
        XLSX.writeFile(wb, `Bursluluk_Basvurulari_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const tcValid = !createForm.tc_identity_number || createForm.tc_identity_number.length === 11;

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <div>
                            <Link to="/scholarship/exams" className="btn btn-sm btn-soft-secondary me-2">
                                <i className="ti ti-arrow-left"></i>
                            </Link>
                            <h4 className="mb-sm-0 d-inline-block">Sınav Başvuruları</h4>
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-soft-success"
                                onClick={() => {
                                    setShowCreateModal(true);
                                }}
                            >
                                <i className="ti ti-plus me-1"></i> Manuel Başvuru Ekle
                            </button>
                            <button className="btn btn-soft-primary" onClick={handleGenerateEntryDoc}>
                                <i className="ti ti-file-text me-1"></i> Giriş Belgelerini Hazırla
                            </button>
                            <button className="btn btn-success" onClick={handleExportExcel}>
                                <i className="ti ti-download me-1"></i> Excel İndir
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showCreateModal && (
                <div className="modal fade show" style={{ display: 'block' }} role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-lg" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Manuel Başvuru Ekle</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Close"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetCreateForm();
                                    }}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Ad Soyad *</label>
                                        <input
                                            className="form-control"
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Telefon *</label>
                                        <input
                                            className="form-control"
                                            value={createForm.phone}
                                            onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">E-posta</label>
                                        <input
                                            className="form-control"
                                            value={createForm.email}
                                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">T.C. Kimlik</label>
                                        <input
                                            className="form-control"
                                            value={createForm.tc_identity_number}
                                            inputMode="numeric"
                                            maxLength={11}
                                            onChange={(e) => {
                                                const digitsOnly = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
                                                setCreateForm({ ...createForm, tc_identity_number: digitsOnly });
                                            }}
                                        />
                                        {!tcValid && (
                                            <div className="text-danger small mt-1">T.C. Kimlik No 11 haneli olmalıdır.</div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Okul</label>
                                        <input
                                            className="form-control"
                                            value={createForm.school_name}
                                            onChange={(e) => setCreateForm({ ...createForm, school_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Sınıf</label>
                                        <input
                                            className="form-control"
                                            value={createForm.grade_level}
                                            onChange={(e) => setCreateForm({ ...createForm, grade_level: e.target.value })}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">Seans</label>
                                        <select
                                            className="form-select"
                                            value={createForm.session_id}
                                            onChange={(e) => {
                                                const sessionId = e.target.value;
                                                const s = Array.isArray(exam?.sessions)
                                                    ? exam.sessions.find((x: any) => String(x.id) === String(sessionId))
                                                    : null;
                                                setCreateForm({
                                                    ...createForm,
                                                    session_id: sessionId,
                                                    session_time: s?.time ? String(s.time).slice(0, 5) : createForm.session_time,
                                                });
                                            }}
                                        >
                                            <option value="">Seçiniz</option>
                                            {(Array.isArray(exam?.sessions) ? exam.sessions : []).map((s: any) => (
                                                <option key={s.id} value={String(s.id)}>
                                                    {s.time}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Seans Saati (HH:mm)</label>
                                        <input
                                            className="form-control"
                                            placeholder="09:00"
                                            value={createForm.session_time}
                                            onChange={(e) => setCreateForm({ ...createForm, session_time: e.target.value })}
                                        />
                                    </div>

                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-soft-secondary"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetCreateForm();
                                    }}
                                    disabled={createLoading}
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleCreateApplication}
                                    disabled={createLoading || !createForm.name.trim() || !createForm.phone.trim() || !tcValid}
                                >
                                    {createLoading ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && <div className="modal-backdrop fade show"></div>}

            <div className="card mt-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Başvuru Listesi ({filteredApplications.length})</h5>
                    <input
                        type="text"
                        className="form-control form-control-sm w-25"
                        placeholder="İsim veya başvuru no ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-centered table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>No</th>
                                    <th>Aday Adı</th>
                                    <th>Okul</th>
                                    <th>Sınıf</th>
                                    <th>İletişim</th>
                                    <th>Durum</th>
                                    <th className="text-end">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-4">Yükleniyor...</td></tr>
                                ) : filteredApplications.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-4">Başvuru bulunamadı.</td></tr>
                                ) : filteredApplications.map(app => (
                                    <tr key={app.id}>
                                        <td><strong>{app.application_number}</strong></td>
                                        <td>{app.name}</td>
                                        <td>{app.school_name || '-'}</td>
                                        <td>{app.grade_level ? `${app.grade_level}. Sınıf` : '-'}</td>
                                        <td>{app.phone}</td>
                                        <td>{getStatusBadge(app.status)}</td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-1">
                                                {app.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-soft-success"
                                                            onClick={() => handleProcess(app.id, 'approved')}
                                                        >
                                                            <i className="ti ti-check"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-soft-danger"
                                                            onClick={() => handleProcess(app.id, 'rejected')}
                                                        >
                                                            <i className="ti ti-x"></i>
                                                        </button>
                                                    </>
                                                )}
                                                {app.status === 'approved' && (
                                                    <button
                                                        className="btn btn-sm btn-soft-info"
                                                        onClick={() => handleProcess(app.id, 'attended')}
                                                        title="Sınava Girdi"
                                                    >
                                                        <i className="ti ti-user-check"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScholarshipApplicationList;
