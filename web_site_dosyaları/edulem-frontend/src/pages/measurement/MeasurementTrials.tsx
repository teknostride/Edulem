import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import SeasonFilter from '../../components/shared/SeasonFilter';

// type TrialStatus = 'draft' | 'published' | 'archived';

interface TrialItem {
  id: number;
  name: string;
  description?: string | null;
  exam_date?: string | null;
  booklets_count?: number;
  results_count?: number;
  created_at?: string;
}

const MeasurementTrials = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<string>('');

  // SeasonFilter bileşenini import et
  // import SeasonFilter from '../../components/shared/SeasonFilter';


  // Kullanıcı rol bilgisi
  const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
  const userRole = userData.role || userData.role_name || userData.role_id || localStorage.getItem('USER_ROLE');
  const isMiddleSchool = userRole === 'Müdür' || userRole === 'Müdür Yardımcısı' || userRole === 'Kampüs Müdürü';

  const [form, setForm] = useState({
    name: '',
    description: '',
    exam_date: '',
    season: '',
    test_code: '',
    test_category: '',
    level: '',
    session: '', // Oturum bilgisi
    subject_learning_outcome: '',
    omr_sheet: '',
    duration: 120,
  });

  /*
  const statusLabel = useMemo(() => {
    return {
      draft: 'Taslak',
      published: 'Yayınlandı',
      archived: 'Arşiv',
    } as Record<TrialStatus, string>;
  }, []);
  */

  // Sınav türüne göre seviye seçenekleri
  const getLevelOptions = () => {
    if (isMiddleSchool) {
      // Ortaokul müdürleri sadece ortaokul seviyelerini görebilir
      return [
        <option key="" value="">Seçiniz...</option>,
        <option key="4.SINIF" value="4.SINIF">4.SINIF</option>,
        <option key="5.SINIF" value="5.SINIF">5.SINIF</option>,
        <option key="6.SINIF" value="6.SINIF">6.SINIF</option>,
        <option key="7.SINIF" value="7.SINIF">7.SINIF</option>,
        <option key="8.SINIF" value="8.SINIF">8.SINIF</option>,
      ];
    }

    // Diğer roller için tüm seviyeler
    const levels = [
      <option key="" value="">Seçiniz...</option>,
      <option key="4.SINIF" value="4.SINIF">4.SINIF</option>,
      <option key="5.SINIF" value="5.SINIF">5.SINIF</option>,
      <option key="6.SINIF" value="6.SINIF">6.SINIF</option>,
      <option key="7.SINIF" value="7.SINIF">7.SINIF</option>,
      <option key="8.SINIF" value="8.SINIF">8.SINIF</option>,
      <option key="9.SINIF" value="9.SINIF">9.SINIF</option>,
      <option key="10.SINIF" value="10.SINIF">10.SINIF</option>,
      <option key="11.SINIF" value="11.SINIF">11.SINIF</option>,
      <option key="12.SINIF" value="12.SINIF">12.SINIF</option>,
      <option key="YKS" value="YKS">YKS</option>,
    ];

    // Seçilen sınav türüne göre filtreleme
    if (form.test_category === 'LGS') {
      return levels.filter(level =>
        level.props.value === '' ||
        level.props.value?.includes('SINIF')
      );
    } else if (form.test_category === 'YKS' || form.test_category === 'YKS-DIL') {
      return levels.filter(level =>
        level.props.value === '' ||
        level.props.value === 'YKS'
      );
    } else if (form.test_category === 'Bursluluk') {
      return levels.filter(level =>
        level.props.value === '' ||
        (level.props.value?.includes('SINIF') && !level.props.value?.includes('9.') && !level.props.value?.includes('10.') && !level.props.value?.includes('11.') && !level.props.value?.includes('12.'))
      );
    }

    return levels;
  };

  // Sınav türüne göre oturum seçenekleri
  const getSessionOptions = () => {
    if (form.test_category === 'LGS') {
      return (
        <>
          <option value="">Seçiniz...</option>
          <option value="Sözel">Sözel</option>
          <option value="Sayısal">Sayısal</option>
        </>
      );
    } else if (form.test_category === 'YKS') {
      return (
        <>
          <option value="">Seçiniz...</option>
          <option value="TYT">TYT</option>
          <option value="AYT">AYT</option>
        </>
      );
    } else if (form.test_category === 'YKS-DIL') {
      return (
        <>
          <option value="">Seçiniz...</option>
          <option value="DİL">DİL</option>
        </>
      );
    }

    return <option value="">Seçiniz...</option>;
  };

  // Sınav türüne göre test kategorisi seçenekleri
  const getTestCategoryOptions = () => {
    const allOptions = [
      <option key="" value="">Seçiniz...</option>,
      <option key="LGS" value="LGS">LGS</option>,
      <option key="YKS" value="YKS">YKS</option>,
      <option key="YKS-DIL" value="YKS-DIL">YKS-DİL</option>,
      <option key="Bursluluk" value="Bursluluk">Bursluluk</option>,
      <option key="Diğer" value="Diğer">Diğer</option>,
    ];

    if (isMiddleSchool) {
      // Ortaokul müdürleri sadece LGS, Bursluluk ve Diğer görebilir
      return allOptions.filter(option =>
        option.props.value === '' ||
        option.props.value === 'LGS' ||
        option.props.value === 'Bursluluk' ||
        option.props.value === 'Diğer'
      );
    }

    return allOptions;
  };

  /*
  const statusBadge = (status: TrialStatus) => {
    if (status === 'published') return 'badge bg-success';
    if (status === 'archived') return 'badge bg-secondary';
    return 'badge bg-warning text-dark';
  };
  */

  const fetchTrials = async () => {
    try {
      setLoading(true);
      const params = { 
        per_page: 200,
        ...(seasonFilter && { season_id: seasonFilter })
      };
      const res = await axiosClient.get('/measurement/trials', { params });
      const d = res.data?.data ?? res.data;
      const raw = d?.trials;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setTrials(list);
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Denemeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, [seasonFilter]);

  const openCreate = () => {
    setForm({
      name: '',
      description: '',
      exam_date: new Date().toISOString().slice(0, 10),
      season: '',
      test_code: '',
      test_category: '',
      level: '',
      session: '',
      subject_learning_outcome: '',
      omr_sheet: '',
      duration: 120,
    });
    setShowModal(true);
  };

  const createTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        exam_date: form.exam_date || null,
        season: form.season,
        test_code: form.test_code,
        test_category: form.test_category,
        level: form.level,
        session: form.session,
        subject_learning_outcome: form.subject_learning_outcome,
        omr_sheet: form.omr_sheet,
        duration: form.duration,
      };
      const res = await axiosClient.post('/measurement/trials', payload);
      const msg = res.data?.message || 'Deneme oluşturuldu';
      showToast('success', msg);
      setShowModal(false);
      fetchTrials();
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const deleteTrial = async (trial: TrialItem) => {
    const ok = await confirmDialog({
      text: `"${trial.name}" denemesini silmek istediğinizden emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;
    try {
      await axiosClient.delete(`/measurement/trials/${trial.id}`);
      showToast('success', 'Deneme silindi');
      fetchTrials();
    } catch (e: any) {
      showToast('error', e?.response?.data?.message || 'Silme başarısız');
    }
  };

  const openEdit = (trial: TrialItem) => {
    // Düzenleme modalını açmak için formu doldur
    setForm({
      name: trial.name,
      description: trial.description || '',
      exam_date: trial.exam_date || '',
      season: '',
      test_code: '',
      test_category: '',
      level: '',
      session: '',
      subject_learning_outcome: '',
      omr_sheet: '',
      duration: 120,
    });
    setShowModal(true);
  };

  const goDetail = (id: number) => {
    navigate(`/measurement/trials/${id}`);
  };

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-1">Deneme Sınavları</h4>
          <p className="text-muted mb-0">Deneme sınavlarını oluşturun, optik yükleyin ve sonuçları görüntüleyin.</p>
        </div>
        <div className="d-flex gap-2">
          <div style={{ width: '200px' }}>
            <SeasonFilter 
              value={seasonFilter} 
              onChange={setSeasonFilter} 
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <i className="ti ti-plus me-1"></i> Yeni Deneme
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : trials.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-2 fw-semibold">Henüz deneme yok</div>
              <button type="button" className="btn btn-outline-primary" onClick={openCreate}>
                İlk denemeyi oluştur
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Ad</th>
                    <th>Tarih</th>
                    <th className="text-center">Kitapçık</th>
                    <th className="text-center">Sonuç</th>
                    <th className="text-end" style={{ width: 280 }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {trials.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="fw-semibold">{t.name}</div>
                        {t.description ? (
                          <div className="text-muted small" style={{ maxWidth: 520 }}>
                            {t.description}
                          </div>
                        ) : null}
                      </td>
                      <td>{t.exam_date ? new Date(t.exam_date).toLocaleDateString('tr-TR') : '-'}</td>
                      <td className="text-center">{typeof t.booklets_count === 'number' ? t.booklets_count : '-'}</td>
                      <td className="text-center">{typeof t.results_count === 'number' ? t.results_count : '-'}</td>
                      <td className="text-end">
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-soft-info"
                            onClick={() => openEdit(t)}
                            title="Deneme Bilgileri"
                          >
                            <i className="ti ti-info-circle me-1"></i> Bilgiler
                          </button>
                          <button
                            className="btn btn-sm btn-soft-primary"
                            onClick={() => goDetail(t.id)}
                            title="Detay"
                          >
                            <i className="ti ti-eye me-1"></i> Detay
                          </button>
                          <Link
                            className="btn btn-sm btn-soft-secondary"
                            to={`/measurement/trials/${t.id}`}
                            title="Optik"
                          >
                            <i className="ti ti-upload me-1"></i> Optik
                          </Link>
                          <button
                            className="btn btn-sm btn-soft-danger"
                            onClick={() => deleteTrial(t)}
                            title="Sil"
                          >
                            <i className="ti ti-trash me-1"></i> Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title mb-0">Yeni Deneme Oluştur</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={createTrial}>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Sol Kolon - Temel Bilgiler */}
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">Temel Bilgiler</h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">Dönem <span className="text-danger">*</span></label>
                              <select
                                className="form-select"
                                value={form.season}
                                onChange={(e) => setForm({ ...form, season: e.target.value })}
                                required
                              >
                                <option value="">Seçiniz...</option>
                                <option value="2025-2026">2025-2026</option>
                                <option value="2024-2025">2024-2025</option>
                                <option value="2023-2024">2023-2024</option>
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Sınav Kodu <span className="text-danger">*</span></label>
                              <input
                                type="text"
                                className="form-control"
                                value={form.test_code}
                                onChange={(e) => setForm({ ...form, test_code: e.target.value })}
                                required
                                placeholder="Örn: 12345"
                              />
                            </div>
                            <div className="col-md-12">
                              <label className="form-label">Sınav Adı <span className="text-danger">*</span></label>
                              <input
                                className="form-control"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                placeholder="Örn: 8. Sınıf Türkiye Geneli - 1"
                              />
                            </div>
                            <div className="col-md-12">
                              <label className="form-label">Açıklama</label>
                              <textarea
                                className="form-control"
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Opsiyonel açıklama"
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Sınav Tarihi <span className="text-danger">*</span></label>
                              <input
                                type="date"
                                className="form-control"
                                value={form.exam_date}
                                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                                required
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Süre (Dakika) <span className="text-danger">*</span></label>
                              <input
                                type="number"
                                className="form-control"
                                value={form.duration}
                                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
                                required
                                min="5"
                                max="300"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">Sınav Türü</h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">Sınav Türü <span className="text-danger">*</span></label>
                              <select
                                className="form-select"
                                value={form.test_category}
                                onChange={(e) => {
                                  setForm({
                                    ...form,
                                    test_category: e.target.value,
                                    level: '', // Sınav türü değişince seviyeyi sıfırla
                                    session: '' // Oturumu da sıfırla
                                  });
                                }}
                                required
                              >
                                {getTestCategoryOptions()}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Seviye <span className="text-danger">*</span></label>
                              <select
                                className="form-select"
                                value={form.level}
                                onChange={(e) => setForm({ ...form, level: e.target.value })}
                                required
                              >
                                {getLevelOptions()}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Oturum</label>
                              <select
                                className="form-select"
                                value={form.session}
                                onChange={(e) => setForm({ ...form, session: e.target.value })}
                              >
                                {getSessionOptions()}
                              </select>
                            </div>
                            <div className="col-md-12">
                              <label className="form-label">Kazanım/Konu <span className="text-danger">*</span></label>
                              <div>
                                <div className="form-check form-check-inline">
                                  <input
                                    className="form-check-input"
                                    type="radio"
                                    name="subject_learning_outcome"
                                    id="kazanim"
                                    value="Kazanım"
                                    checked={form.subject_learning_outcome === 'Kazanım'}
                                    onChange={(e) => setForm({ ...form, subject_learning_outcome: e.target.value })}
                                    required
                                  />
                                  <label className="form-check-label" htmlFor="kazanim">Kazanım</label>
                                </div>
                                <div className="form-check form-check-inline">
                                  <input
                                    className="form-check-input"
                                    type="radio"
                                    name="subject_learning_outcome"
                                    id="konu"
                                    value="Konu"
                                    checked={form.subject_learning_outcome === 'Konu'}
                                    onChange={(e) => setForm({ ...form, subject_learning_outcome: e.target.value })}
                                  />
                                  <label className="form-check-label" htmlFor="konu">Konu</label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sağ Kolon - Optik Şablonu */}
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">Optik Şablonu</h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-12">
                              <label className="form-label">Optik Şablonu <span className="text-danger">*</span></label>
                              <select
                                className="form-select"
                                value={form.omr_sheet}
                                onChange={(e) => setForm({ ...form, omr_sheet: e.target.value })}
                                required
                              >
                                <option value="">Seçiniz...</option>
                                <option value="LGS_4_SNIF">LGS_4 SNIF</option>
                                <option value="LGS_5_SNIF">LGS_5 SNIF</option>
                                <option value="LGS_6_SNIF">LGS_6 SNIF</option>
                                <option value="LGS_7_SNIF">LGS_7 SNIF</option>
                                <option value="LGS_8_SNIF">LGS_8 SNIF</option>
                                <option value="YKS_TYT">YKS_TYT</option>
                                <option value="YKS_AYT">YKS_AYT</option>
                                <option value="YKS_DIL">YKS_DİL</option>
                                <option value="Bursluluk_4_SNIF">Bursluluk_4 SNIF</option>
                                <option value="Bursluluk_5_SNIF">Bursluluk_5 SNIF</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)} disabled={saving}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (<span className="spinner-border spinner-border-sm me-1"></span>) : null}
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeasurementTrials;
