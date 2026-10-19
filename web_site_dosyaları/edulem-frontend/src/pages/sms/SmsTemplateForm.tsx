import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

const SmsTemplateForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        content: '',
        type: 'general',
        is_active: true
    });

    const [charCount, setCharCount] = useState(0);
    const [smsCount, setSmsCount] = useState(1);

    useEffect(() => {
        if (isEdit) {
            fetchTemplate();
        }
    }, [id]);

    useEffect(() => {
        const count = formData.content.length;
        setCharCount(count);
        setSmsCount(count <= 160 ? 1 : Math.ceil(count / 153)); // Standard GSM segments
    }, [formData.content]);

    const fetchTemplate = async () => {
        try {
            const res = await axiosClient.get(`/sms/templates/${id}`);
            const data = res.data.data;
            setFormData({
                name: data.name,
                code: data.code,
                content: data.content,
                type: data.type,
                is_active: data.is_active
            });
        } catch (error) {
            showToast('error', 'Şablon bilgileri yüklenemedi');
            navigate('/sms/templates');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEdit) {
                await axiosClient.put(`/sms/templates/${id}`, formData);
                showToast('success', 'Şablon güncellendi');
            } else {
                await axiosClient.post('/sms/templates', formData);
                showToast('success', 'Şablon oluşturuldu');
            }
            navigate('/sms/templates');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    const insertVariable = (variable: string) => {
        setFormData({
            ...formData,
            content: formData.content + `{${variable}}`
        });
    };

    if (fetching) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="mb-4">
                <h4 className="page-title">{isEdit ? 'Şablonu Düzenle' : 'Yeni SMS Şablonu'}</h4>
                <p className="text-muted">Dinamik değişkenler içeren SMS taslakları oluşturun.</p>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSubmit} className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <label className="form-label">Şablon Başlığı</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Örn: Sınav Bilgilendirme"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Şablon Kodu</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Örn: SINAV_BILGI"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                                        required
                                    />
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Şablon Türü</label>
                                    <select
                                        className="form-select"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="general">Genel Duyuru</option>
                                        <option value="attendance">Yoklama Bilgisi</option>
                                        <option value="exam">Sınav Sonucu</option>
                                        <option value="payment">Ödeme Hatırlatma</option>
                                    </select>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label d-flex justify-content-between">
                                        Mesaj İçeriği
                                        <span className={`small ${charCount > 160 ? 'text-warning' : 'text-muted'}`}>
                                            {charCount} Karakter / {smsCount} SMS
                                        </span>
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={5}
                                        placeholder="Mesajınızı buraya yazın..."
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        required
                                    ></textarea>
                                    <div className="mt-2">
                                        <small className="text-muted d-block mb-2">Değişken Ekle:</small>
                                        <div className="d-flex flex-wrap gap-1">
                                            {['student_name', 'parent_name', 'exam_name', 'score', 'date', 'lesson'].map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => insertVariable(v)}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-12">
                                    <div className="form-check form-switch mt-2">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <label className="form-check-label" htmlFor="isActive">Şablon Aktif mi?</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-transparent border-top p-3 d-flex justify-content-between">
                            <button type="button" className="btn btn-light" onClick={() => navigate('/sms/templates')}>Vazgeç</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading && <span className="spinner-border spinner-border-sm me-1"></span>}
                                {isEdit ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SmsTemplateForm;
