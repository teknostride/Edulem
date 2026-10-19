import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Student {
    id: number;
    name: string;
}

// Kullanılmayan interface - ileride kullanılabilir
// interface Contract {
//     id: number;
//     student_id: number;
//     contract_date: string;
//     start_date: string;
//     end_date: string | null;
//     total_amount: number;
//     status: string;
//     terms: string | null;
//     notes: string | null;
// }

interface ContractFormProps {
    contract?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const ContractForm: React.FC<ContractFormProps> = ({ contract, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        student_id: '',
        contract_date: new Date().toISOString().split('T')[0],
        start_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        status: 'draft',
        terms: '',
        notes: ''
    });
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStudents();
        if (contract) {
            setFormData({
                student_id: contract.student.id.toString(),
                contract_date: contract.contract_date,
                start_date: contract.start_date || contract.contract_date,
                total_amount: contract.total_amount || 0,
                status: contract.status,
                terms: contract.terms || '',
                notes: contract.notes || ''
            });
        }
    }, [contract]);

    const fetchStudents = async () => {
        try {
            const response = await axiosClient.get('/students');
            setStudents(response.data.data);
        } catch (error) {
            console.error('Error fetching students', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (contract) {
                await axiosClient.put(`/contracts/${contract.id}`, formData);
                showToast('success', 'Sözleşme güncellendi');
            } else {
                await axiosClient.post('/contracts', formData);
                showToast('success', 'Yeni sözleşme oluşturuldu');
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
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title text-primary">
                            <i className="ti ti-file-text me-1"></i>
                            {contract ? 'Sözleşmeyi Düzenle' : 'Yeni Sözleşme Tanımla'}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Öğrenci *</label>
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
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Durum</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="draft">Taslak</option>
                                        <option value="active">Aktif</option>
                                        <option value="expired">Süresi Doldu</option>
                                        <option value="cancelled">İptal Edildi</option>
                                    </select>
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Sözleşme Tarihi *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        required
                                        value={formData.contract_date}
                                        onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Başlangıç Tarihi *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        required
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Toplam Tutar (₺) *</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        required
                                        step="0.01"
                                        value={formData.total_amount}
                                        onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label">Özel Şartlar / Sözleşme Metni</label>
                                    <textarea
                                        className="form-control"
                                        rows={6}
                                        placeholder="Sözleşmeye özel eklemek istediğiniz maddeleri buraya yazabilirsiniz..."
                                        value={formData.terms}
                                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label">Dahili Notlar</label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        placeholder="Sadece personelin görebileceği notlar..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Kaydediliyor...' : 'Sözleşmeyi Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ContractForm;
