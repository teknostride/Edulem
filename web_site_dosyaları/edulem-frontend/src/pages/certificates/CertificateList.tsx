import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import CertificateForm from './CertificateForm';

interface Certificate {
    id: number;
    student: {
        id: number;
        name: string;
    };
    certificate_type: string;
    achievement_date: string;
    is_published_to_guardian: boolean;
    is_added_to_portfolio: boolean;
    file: {
        id: number;
        url: string;
        name: string;
    } | null;
    created_at: string;
}

const CertificateList: React.FC = () => {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState<Certificate | undefined>();

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/achievement-certificates');
            setCertificates(response.data.data.certificates);
        } catch (error) {
            showToast('error', 'Başarı belgeleri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCertificates();
    }, []);

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu belgeyi silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/achievement-certificates/${id}`);
            showToast('success', 'Belge başarıyla silindi');
            fetchCertificates();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    const handlePublish = async (id: number) => {
        try {
            await axiosClient.post(`/achievement-certificates/${id}/publish`);
            showToast('success', 'Belge veli sayfasında yayınlandı');
            fetchCertificates();
        } catch (error) {
            showToast('error', 'Yayınlama işlemi başarısız');
        }
    };

    const handlePortfolio = async (id: number) => {
        try {
            await axiosClient.post(`/achievement-certificates/${id}/portfolio`);
            showToast('success', 'Belge portfolyoya eklendi');
            fetchCertificates();
        } catch (error) {
            showToast('error', 'Portfolyo işlemi başarısız');
        }
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 className="mb-sm-0">Başarı Belgeleri & Sertifikalar</h4>
                        <button className="btn btn-primary" onClick={() => { setSelectedCertificate(undefined); setShowForm(true); }}>
                            <i className="ti ti-plus me-1"></i> Yeni Sertifika Oluştur
                        </button>
                    </div>
                </div>
            </div>

            <div className="card mt-3">
                <div className="card-header">
                    <h5 className="card-title mb-0">Verilen Belgeler</h5>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover table-centered mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Öğrenci</th>
                                    <th>Belge Türü</th>
                                    <th>Başarı Tarihi</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center">Yükleniyor...</td></tr>
                                ) : certificates.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center">Kayıtlı belge bulunamadı.</td></tr>
                                ) : certificates.map(cert => (
                                    <tr key={cert.id}>
                                        <td><strong>{cert.student.name}</strong></td>
                                        <td>{cert.certificate_type}</td>
                                        <td>{new Date(cert.achievement_date).toLocaleDateString('tr-TR')}</td>
                                        <td>
                                            {cert.is_published_to_guardian && <span className="badge bg-soft-success text-success me-1">Velide Yayında</span>}
                                            {cert.is_added_to_portfolio && <span className="badge bg-soft-info text-info">Portfolyoda</span>}
                                            {!cert.is_published_to_guardian && !cert.is_added_to_portfolio && <span className="badge bg-soft-secondary text-secondary">Taslak</span>}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                {cert.file && (
                                                    <a href={cert.file.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-soft-primary">
                                                        <i className="ti ti-download"></i>
                                                    </a>
                                                )}
                                                {!cert.is_published_to_guardian && (
                                                    <button className="btn btn-sm btn-soft-success" onClick={() => handlePublish(cert.id)} title="Velide Yayınla">
                                                        <i className="ti ti-world"></i>
                                                    </button>
                                                )}
                                                {!cert.is_added_to_portfolio && (
                                                    <button className="btn btn-sm btn-soft-info" onClick={() => handlePortfolio(cert.id)} title="Portfolyoya Ekle">
                                                        <i className="ti ti-folder-plus"></i>
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(cert.id)}>
                                                    <i className="ti ti-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <CertificateForm
                    certificate={selectedCertificate}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchCertificates(); }}
                />
            )}
        </div>
    );
};

export default CertificateList;
