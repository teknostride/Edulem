import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Student {
    id: number;
    name: string;
}

// Kullanılmayan interface - ileride kullanılabilir
// interface Certificate {
//     id: number;
//     student_id: number;
//     certificate_type: string;
//     title: string;
//     description: string;
//     achievement_date: string;
//     file_id?: number | null;
// }

interface CertificateFormProps {
    certificate?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const CertificateForm: React.FC<CertificateFormProps> = ({ certificate, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        student_id: '',
        certificate_type: 'Onur Belgesi',
        title: '',
        description: '',
        achievement_date: new Date().toISOString().split('T')[0],
        file_id: '' as string | number
    });
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchStudents();
        if (certificate) {
            setFormData({
                student_id: certificate.student.id.toString(),
                certificate_type: certificate.certificate_type,
                title: certificate.title || '',
                description: certificate.description || '',
                achievement_date: certificate.achievement_date,
                file_id: certificate.file?.id || ''
            });
        }
    }, [certificate]);

    const fetchStudents = async () => {
        try {
            const response = await axiosClient.get('/students');
            setStudents(response.data.data);
        } catch (error) {
            console.error('Error fetching students', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            setUploading(true);
            const response = await axiosClient.post('/files/upload', uploadData);
            setFormData({ ...formData, file_id: response.data.data.id });
            showToast('success', 'Dosya başarıyla yüklendi');
        } catch (error) {
            showToast('error', 'Dosya yükleme başarısız');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (certificate) {
                await axiosClient.put(`/achievement-certificates/${certificate.id}`, formData);
                showToast('success', 'Başarı belgesi güncellendi');
            } else {
                await axiosClient.post('/achievement-certificates', formData);
                showToast('success', 'Yeni başarı belgesi oluşturuldu');
            }
            onSuccess();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{certificate ? 'Belgeyi Düzenle' : 'Yeni Başarı Belgesi'}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Öğrenci Seçiniz *</label>
                                <select
                                    className="form-select"
                                    required
                                    value={formData.student_id}
                                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                                >
                                    <option value="">Seçiniz</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Belge Türü *</label>
                                <select
                                    className="form-select"
                                    value={formData.certificate_type}
                                    onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value })}
                                >
                                    <option value="Onur Belgesi">Onur Belgesi</option>
                                    <option value="Başarı Belgesi">Başarı Belgesi</option>
                                    <option value="Üstün Başarı Belgesi">Üstün Başarı Belgesi</option>
                                    <option value="Sertifika">Sertifika</option>
                                    <option value="Katılım Belgesi">Katılım Belgesi</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Belge Başlığı *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="Örn: Matematik Olimpiyatı 1.lik Ödülü"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Açıklama</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Başarı Tarihi *</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    required
                                    value={formData.achievement_date}
                                    onChange={(e) => setFormData({ ...formData, achievement_date: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Belge Dosyası (PDF/Görsel)</label>
                                <input
                                    type="file"
                                    className="form-control"
                                    onChange={handleFileUpload}
                                />
                                {uploading && <small className="text-info">Yükleniyor...</small>}
                                {formData.file_id && !uploading && <small className="text-success">Dosya seçildi (ID: {formData.file_id})</small>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
                            <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
                                {loading ? 'Kaydediliyor...' : 'Belgeyi Oluştur'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CertificateForm;
