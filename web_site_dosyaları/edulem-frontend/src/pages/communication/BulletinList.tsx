import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Bulletin {
    id: number;
    title: string;
    bulletin_date: string;
    category: string;
    is_published_to_guardian: boolean;
    is_added_to_portfolio: boolean;
    student?: {
        id: number;
        name: string;
    };
    template?: {
        id: number;
        name: string;
    };
    creator: {
        id: number;
        name: string;
    };
}

const BulletinList = () => {
    const [bulletins, setBulletins] = useState<Bulletin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        student_id: '',
        category: '',
        published_only: false
    });

    useEffect(() => {
        fetchBulletins();
    }, [filter]);

    const fetchBulletins = async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/bulletins', { params: filter });
            setBulletins(response.data.data.bulletins);
        } catch (error) {
            showToast('error', 'Bültenler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (id: number) => {
        try {
            await axiosClient.post(`/bulletins/${id}/publish`);
            showToast('success', 'Bülten veli sayfasında yayınlandı');
            fetchBulletins();
        } catch (error) {
            showToast('error', 'Yayınlama işlemi başarısız');
        }
    };

    const handlePortfolio = async (id: number) => {
        try {
            await axiosClient.post(`/bulletins/${id}/portfolio`);
            showToast('success', 'Bülten öğrenci portfolyosuna eklendi');
            fetchBulletins();
        } catch (error) {
            showToast('error', 'Portfolyoya ekleme işlemi başarısız');
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu bülteni silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/bulletins/${id}`);
            showToast('success', 'Bülten silindi');
            fetchBulletins();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    return (
        <div className="container-fluid">
            <div className="page-title-head d-flex align-items-center justify-content-between mb-4">
                <div className="flex-grow-1">
                    <h4 className="page-main-title m-0">Kurumsal Bültenler</h4>
                    <p className="text-muted mb-0">Öğrenci gelişim raporları ve okul duyuru bültenleri</p>
                </div>
                <Link to="/communication/bulletins/create" className="btn btn-primary">
                    <i className="ti ti-plus me-1"></i>
                    Yeni Bülten Oluştur
                </Link>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Öğrenci ID ile ara..."
                                value={filter.student_id}
                                onChange={(e) => setFilter({ ...filter, student_id: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                value={filter.category}
                                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                            >
                                <option value="">Tüm Kategoriler</option>
                                <option value="Academic">Akademik Değerlendirme</option>
                                <option value="Social">Sosyal Gelişim</option>
                                <option value="Institutional">Kurumsal Haber</option>
                            </select>
                        </div>
                        <div className="col-md-3 d-flex align-items-center">
                            <div className="form-check form-switch">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="published_only"
                                    checked={filter.published_only}
                                    onChange={(e) => setFilter({ ...filter, published_only: e.target.checked })}
                                />
                                <label className="form-check-label" htmlFor="published_only">Sadece Yayınlananlar</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Bülten Başlığı / Tarih</th>
                                <th>Kategori</th>
                                <th>Öğrenci</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status"></div>
                                    </td>
                                </tr>
                            ) : bulletins.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5 text-muted">Bülten bulunamadı.</td>
                                </tr>
                            ) : (
                                bulletins.map(bulletin => (
                                    <tr key={bulletin.id}>
                                        <td>
                                            <div className="fw-bold">{bulletin.title}</div>
                                            <small className="text-muted">{new Date(bulletin.bulletin_date).toLocaleDateString('tr-TR')}</small>
                                        </td>
                                        <td>
                                            <span className={`badge ${bulletin.category === 'Academic' ? 'bg-soft-primary text-primary' :
                                                    bulletin.category === 'Social' ? 'bg-soft-success text-success' : 'bg-soft-info text-info'
                                                }`}>
                                                {bulletin.category}
                                            </span>
                                        </td>
                                        <td>{bulletin.student?.name || <span className="text-muted">- Genel -</span>}</td>
                                        <td>
                                            <div className="d-flex flex-column gap-1">
                                                {bulletin.is_published_to_guardian ? (
                                                    <span className="badge bg-success small" style={{ fontSize: '10px' }}>Veli Yayında</span>
                                                ) : (
                                                    <span className="badge bg-secondary small" style={{ fontSize: '10px' }}>Taslak</span>
                                                )}
                                                {bulletin.is_added_to_portfolio && (
                                                    <span className="badge bg-info small" style={{ fontSize: '10px' }}>Portfolyoda</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="btn-group">
                                                {!bulletin.is_published_to_guardian && (
                                                    <button className="btn btn-sm btn-outline-success" onClick={() => handlePublish(bulletin.id)} title="Yayınla">
                                                        <i className="ti ti-broadcast"></i>
                                                    </button>
                                                )}
                                                {!bulletin.is_added_to_portfolio && bulletin.student && (
                                                    <button className="btn btn-sm btn-outline-info" onClick={() => handlePortfolio(bulletin.id)} title="Portfolyoya Ekle">
                                                        <i className="ti ti-briefcase"></i>
                                                    </button>
                                                )}
                                                <Link to={`/communication/bulletins/${bulletin.id}/edit`} className="btn btn-sm btn-outline-primary" title="Düzenle">
                                                    <i className="ti ti-edit"></i>
                                                </Link>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(bulletin.id)} title="Sil">
                                                    <i className="ti ti-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BulletinList;
