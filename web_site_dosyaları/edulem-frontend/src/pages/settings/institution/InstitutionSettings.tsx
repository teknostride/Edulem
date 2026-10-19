import { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';
import Cropper from 'react-easy-crop';
interface Institution {
  id: number;
  name: string;
  domain: string;
  is_active: boolean;
  student_count: number;
  subscription_expires_at?: string;
  logo?: string | null;
  logo_url?: string | null;
}

interface Stats {
  campuses: number;
  education_levels: number;
  classrooms: number;
  students: number;
  teachers: number;
  staff: number;
}

const InstitutionSettings = () => {
  const isOwner = (() => {
    try {
      const role = String(localStorage.getItem('USER_ROLE') || '').toLowerCase().trim();
      if (['owner', 'kurucu', 'founder', 'superadmin', 'admin'].includes(role)) return true;
      const user = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      const userRole = String(user.role || user.role_name || user.role_id || '').toLowerCase().trim();
      return ['owner', 'kurucu', 'founder', 'superadmin', 'admin'].includes(userRole);
    } catch {
      return false;
    }
  })();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [stats, setStats] = useState<Stats>({
    campuses: 0,
    education_levels: 0,
    classrooms: 0,
    students: 0,
    teachers: 0,
    staff: 0
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<{ name: string; domain: string }>({
    name: '',
    domain: ''
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; domain?: string }>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // --- MOBİL UYGULAMA SÜRÜM BİLGİSİ STATE ---
  const [appVersion, setAppVersion] = useState<{
    latest_version: string;
    min_required_version: string;
  }>({
    latest_version: '1.3.2',
    min_required_version: '1.3.2',
  });
  const [versionFormData, setVersionFormData] = useState<{
    latest_version: string;
    min_required_version: string;
  }>({
    latest_version: '1.3.2',
    min_required_version: '1.3.2',
  });
  const [versionCardEditing, setVersionCardEditing] = useState(false);
  const [versionSaving, setVersionSaving] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedLogoSrc, setSelectedLogoSrc] = useState<string | null>(null);
  const [selectedLogoObjectUrl, setSelectedLogoObjectUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const fileToObjectUrl = (file: File) => URL.createObjectURL(file);

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Görsel yüklenemedi'));
      image.src = url;
    });

  const canvasToPngBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Görsel dönüştürülemedi'));
          resolve(blob);
        },
        'image/png'
      );
    });

  const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Görsel dönüştürülemedi'));
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });

  const getCroppedLogoBlob = async (imageSrc: string, areaPixels: { x: number; y: number; width: number; height: number }) => {
    const img = await createImage(imageSrc);
    const target = 512;
    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas desteklenmiyor');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img,
      areaPixels.x,
      areaPixels.y,
      areaPixels.width,
      areaPixels.height,
      0,
      0,
      target,
      target
    );

    const png = await canvasToPngBlob(canvas);
    if (png.size <= 2 * 1024 * 1024) return png;

    let quality = 0.9;
    let blob = await canvasToJpegBlob(canvas, quality);
    while (blob.size > 2 * 1024 * 1024 && quality > 0.4) {
      quality = Math.max(0.4, quality - 0.1);
      blob = await canvasToJpegBlob(canvas, quality);
    }
    return blob;
  };

  const resetCropState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    setSelectedLogoSrc(null);
    if (selectedLogoObjectUrl) URL.revokeObjectURL(selectedLogoObjectUrl);
    setSelectedLogoObjectUrl(null);
    resetCropState();
  };

  const applyCroppedLogo = async () => {
    if (!selectedLogoSrc || !croppedAreaPixels) {
      showToast('error', 'Kırpma alanı seçilemedi.');
      return;
    }
    setLogoProcessing(true);
    try {
      const blob = await getCroppedLogoBlob(selectedLogoSrc, croppedAreaPixels);
      if (blob.size > 2 * 1024 * 1024) {
        showToast('error', 'Görsel 2MB altına indirilemedi. Daha küçük bir görsel seçin.');
        return;
      }
      const file = new File([blob], 'institution_logo.png', { type: blob.type });
      setLogoFile(file);
      try {
        const u = URL.createObjectURL(file);
        setLogoPreviewUrl(u);
      } catch {
        setLogoPreviewUrl(null);
      }
      closeCropModal();
    } catch {
      showToast('error', 'Logo hazırlanamadı.');
    } finally {
      setLogoProcessing(false);
    }
  };

  const fetchInstitution = async () => {
    try {
      const response = await axiosClient.get('/tenant/profile');
      const d = response.data?.data;
      if (d) {
        setInstitution(d);
        setFormData({
          name: d.name ?? '',
          domain: d.domain ?? ''
        });
        setErrorMessage('');
      }
    } catch (err: unknown) {
      console.error('Kurum bilgileri yüklenemedi:', err);
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      setErrorMessage(res?.data?.message || 'Kurum bilgileri yüklenemedi.');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axiosClient.get('/tenant/statistics');
      const s = response.data?.data?.statistics;
      if (s) {
        setStats({
          campuses: s.campuses ?? 0,
          education_levels: s.education_levels ?? 0,
          classrooms: s.classrooms ?? 0,
          students: s.students ?? 0,
          teachers: s.teachers ?? 0,
          staff: s.staff ?? 0
        });
      }
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const fetchAppVersion = async () => {
    try {
      const response = await axiosClient.get('/app/version');
      const d = response.data;
      if (d) {
        const latest = String(d.latest_version ?? d.data?.latest_version ?? '1.0.0').trim();
        const minReq = String(d.min_required_version ?? d.data?.min_required_version ?? '1.0.0').trim();
        setAppVersion({ latest_version: latest, min_required_version: minReq });
        setVersionFormData({ latest_version: latest, min_required_version: minReq });
      }
    } catch (e) {
      console.warn('App version getirilemedi:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    await Promise.all([fetchInstitution(), fetchStats(), fetchAppVersion()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = () => {
    setFormErrors({});
    setSuccessMessage('');
    setErrorMessage('');
    setVersionFormData(appVersion);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setVersionCardEditing(false);
    setVersionFormData(appVersion);
    setFormErrors({});
    setErrorMessage('');
    setLogoFile(null);
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
    }
    if (institution) {
      setFormData({
        name: institution.name,
        domain: institution.domain
      });
    }
  };

  const validateForm = (): boolean => {
    const err: { name?: string; domain?: string } = {};
    if (!formData.name || !String(formData.name).trim()) err.name = 'Kurum adı zorunludur.';
    if (!formData.domain || !String(formData.domain).trim()) err.domain = 'Domain zorunludur.';
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSaveAppVersion = async (customPayload?: { latest_version: string; min_required_version: string }) => {
    const payload = customPayload || versionFormData;
    const latest = String(payload.latest_version || '').trim();
    const minReq = String(payload.min_required_version || '').trim();

    if (!latest || !minReq) {
      showToast('error', 'Lütfen en son sürüm ve minimum zorunlu sürüm alanlarını doldurun.');
      return false;
    }

    setVersionSaving(true);
    try {
      let saved = false;
      try {
        await axiosClient.put('/app/version', {
          latest_version: latest,
          min_required_version: minReq,
        });
        saved = true;
      } catch {
        // Fallback: tenant profile endpoint
        await axiosClient.put('/tenant/profile', {
          name: formData.name || institution?.name,
          domain: formData.domain || institution?.domain,
          app_version: latest,
          min_required_version: minReq,
        });
        saved = true;
      }

      if (saved) {
        setAppVersion({ latest_version: latest, min_required_version: minReq });
        setVersionFormData({ latest_version: latest, min_required_version: minReq });
        setVersionCardEditing(false);
        showToast('success', 'Edulem mobil uygulama sürüm bilgileri başarıyla güncellendi.');
        return true;
      }
    } catch (err: unknown) {
      console.error('Sürüm güncellenemedi:', err);
      showToast('error', 'Sürüm güncellenirken bir hata oluştu.');
    } finally {
      setVersionSaving(false);
    }
    return false;
  };

  const handleSave = async () => {
    setFormErrors({});
    setSuccessMessage('');
    setErrorMessage('');
    if (!validateForm()) return;
    setSaving(true);
    try {
      const name = String(formData.name).trim();
      const domain = String(formData.domain).trim();

      if (logoFile) {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('domain', domain);
        fd.append('logo', logoFile);
        if (isOwner) {
          fd.append('app_version', versionFormData.latest_version.trim());
          fd.append('min_required_version', versionFormData.min_required_version.trim());
        }
        await axiosClient.post('/tenant/profile', fd);
      } else {
        const payload: Record<string, string> = { name, domain };
        if (isOwner) {
          payload.app_version = versionFormData.latest_version.trim();
          payload.min_required_version = versionFormData.min_required_version.trim();
        }
        await axiosClient.put('/tenant/profile', payload);
      }

      // Ayrıca /app/version endpoint'ini de güncelle
      if (isOwner) {
        try {
          await axiosClient.put('/app/version', {
            latest_version: versionFormData.latest_version.trim(),
            min_required_version: versionFormData.min_required_version.trim(),
          });
        } catch {
          // ignore if already saved via tenant profile
        }
        setAppVersion({
          latest_version: versionFormData.latest_version.trim(),
          min_required_version: versionFormData.min_required_version.trim(),
        });
      }

      setSuccessMessage('Kurum ve sürüm bilgileri başarıyla güncellendi.');
      await fetchInstitution();
      setEditing(false);
      setVersionCardEditing(false);
      setLogoFile(null);
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
        setLogoPreviewUrl(null);
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
      setErrorMessage(res?.data?.message || 'Kurum bilgileri güncellenemedi.');
      const e = res?.data?.errors;
      if (e && typeof e === 'object') {
        const next: { name?: string; domain?: string } = {};
        if (Array.isArray(e.name)) next.name = e.name[0]; else if (typeof e.name === 'string') next.name = e.name;
        if (Array.isArray(e.domain)) next.domain = e.domain[0]; else if (typeof e.domain === 'string') next.domain = e.domain;
        setFormErrors(next);
      }
    } finally {
      setSaving(false);
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

  if (!institution) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center">
          <p className="text-muted">{errorMessage || 'Kurum bilgileri bulunamadı.'}</p>
          <p className="small text-muted mt-2">Yöneticinizle iletişime geçerek hesabınızın bir kuruma atanmasını isteyebilirsiniz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* BAŞLIK */}
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Kurum Ayarları</h3>
          <p className="text-muted mb-0">Kurumunuzun temel bilgileri ve istatistikleri</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {isOwner && (
            !editing ? (
              <div className="btn-group">
                <button className="btn btn-primary" onClick={handleEdit}>
                  <i className="ti ti-edit me-1"></i>
                  Düzenle
                </button>
              </div>
            ) : (
              <div className="btn-group">
                <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                  <i className="ti ti-check me-1"></i>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                  <i className="ti ti-x me-1"></i>
                  İptal
                </button>
              </div>
            )
          )}
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item"><a href="/settings" className="text-decoration-none text-muted">Ayarlar</a></li>
              <li className="breadcrumb-item active fw-medium">Kurum Ayarları</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Başarı / Hata mesajları */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')} aria-label="Kapat" />
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
          {errorMessage}
          <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Kapat" />
        </div>
      )}

      {/* KURUM BİLGİLERİ */}
      <div className="row">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-bottom">
              <h5 className="mb-0">
                <i className="ti ti-building-arch me-2"></i>
                Kurum Bilgileri
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <strong>Kurum Logosu:</strong>
                <div className="mt-2 d-flex align-items-center gap-3 flex-wrap">
                  <div
                    className="border rounded bg-white d-flex align-items-center justify-content-center"
                    style={{ width: 96, height: 96, overflow: 'hidden' }}
                  >
                    {(logoPreviewUrl || institution.logo_url) ? (
                      <img
                        src={logoPreviewUrl ?? (institution.logo_url ?? '')}
                        alt="logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span className="text-muted small">Yok</span>
                    )}
                  </div>

                  {editing && isOwner && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            showToast('error', 'Dosya çok büyük. Lütfen daha küçük bir görsel seçin.');
                            e.currentTarget.value = '';
                            return;
                          }
                          const url = fileToObjectUrl(file);
                          setSelectedLogoSrc(url);
                          setSelectedLogoObjectUrl(url);
                          setCropModalOpen(true);
                          e.currentTarget.value = '';
                        }}
                      />
                      <div className="small text-muted mt-1">Kırpma sonrası 2MB ile sınırlandırılır.</div>
                    </div>
                  )}
                </div>
              </div>

              {editing ? (
                <div>
                  <div className="mb-3">
                    <label className="form-label">Kurum Adı</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Domain</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.domain ? 'is-invalid' : ''}`}
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    />
                    {formErrors.domain && <div className="invalid-feedback">{formErrors.domain}</div>}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <strong>Kurum Adı:</strong>
                    <p className="text-muted mb-0">{institution.name}</p>
                  </div>
                  <div className="mb-3">
                    <strong>Domain:</strong>
                    <p className="text-muted mb-0">{institution.domain}</p>
                  </div>
                  <div className="mb-3">
                    <strong>Durum:</strong>
                    <div className="mt-1">
                      <span className={`badge ${institution.is_active ? 'bg-success' : 'bg-secondary'}`}>
                        {institution.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <strong>Öğrenci Sayısı:</strong>
                    <p className="text-muted mb-0">{institution.student_count}</p>
                  </div>
                  {institution.subscription_expires_at && (
                    <div className="mb-3">
                      <strong>Abonelik Bitiş:</strong>
                      <p className="text-muted mb-0">
                        {new Date(institution.subscription_expires_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* EDULEM MOBİL UYGULAMA SÜRÜM BİLGİSİ */}
          {isOwner && (
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-header bg-light border-bottom d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                  <i className="ti ti-device-mobile text-primary fs-4"></i>
                  <span>Edulem Uygulama Sürüm Bilgisi</span>
                </h5>
                {!editing && !versionCardEditing && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                    onClick={() => {
                      setVersionFormData(appVersion);
                      setVersionCardEditing(true);
                    }}
                  >
                    <i className="ti ti-edit"></i>
                    <span>Sürümü Güncelle</span>
                  </button>
                )}
              </div>
              <div className="card-body">
                {editing || versionCardEditing ? (
                  <div>
                    <div className="alert alert-primary py-2 px-3 mb-3 d-flex align-items-start gap-2" style={{ fontSize: '0.84rem' }}>
                      <i className="ti ti-info-circle fs-5 mt-1 text-primary flex-shrink-0"></i>
                      <div>
                        Google Play ve App Store'a yeni sürüm yüklediğinizde, mobil kullanıcıların telefonunda güncelleme uyarısının çıkması için bu alana yeni sürüm numarasını girin.
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.88rem' }}>
                        En Son Yayınlanan Sürüm
                        <span className="text-muted fw-normal ms-1 small">(latest_version)</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted">v</span>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          placeholder="Örn: 1.3.4"
                          value={versionFormData.latest_version}
                          onChange={(e) =>
                            setVersionFormData({ ...versionFormData, latest_version: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-text small">Mağazadaki en güncel sürüm. Bu sürümün altındakilere güncelleme bildirimi gösterilir.</div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label fw-semibold mb-0" style={{ fontSize: '0.88rem' }}>
                          Minimum Zorunlu Sürüm
                          <span className="text-muted fw-normal ms-1 small">(min_required)</span>
                        </label>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-primary text-decoration-none fw-medium"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() =>
                            setVersionFormData({
                              ...versionFormData,
                              min_required_version: versionFormData.latest_version,
                            })
                          }
                        >
                          <i className="ti ti-copy me-1"></i>
                          Son Sürümle Eşitle (Zorunlu Yap)
                        </button>
                      </div>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted">v</span>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          placeholder="Örn: 1.3.4"
                          value={versionFormData.min_required_version}
                          onChange={(e) =>
                            setVersionFormData({ ...versionFormData, min_required_version: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-text small">
                        Bu sürümün altındaki kullanıcılar uygulamayı güncellemeden giriş yapamaz (Zorunlu Güncelleme).
                      </div>
                    </div>

                    {versionCardEditing && !editing && (
                      <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          disabled={versionSaving}
                          onClick={() => {
                            setVersionCardEditing(false);
                            setVersionFormData(appVersion);
                          }}
                        >
                          İptal
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                          disabled={versionSaving}
                          onClick={() => handleSaveAppVersion()}
                        >
                          <i className="ti ti-check"></i>
                          {versionSaving ? 'Kaydediliyor...' : 'Sürümü Kaydet'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Canlı Sürüm Rozetleri */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="p-3 rounded-3 bg-light text-center border h-100">
                          <span className="text-muted d-block small mb-1">En Son Sürüm</span>
                          <span className="badge bg-primary fs-6 px-3 py-1 font-monospace">
                            v{appVersion.latest_version || '1.0.0'}
                          </span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 rounded-3 bg-light text-center border h-100">
                          <span className="text-muted d-block small mb-1">Zorunlu Sürüm</span>
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle fs-6 px-3 py-1 font-monospace">
                            v{appVersion.min_required_version || '1.0.0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Güncelleme Türü */}
                    <div className="mb-3 p-2 rounded-2 bg-light border d-flex align-items-center justify-content-between" style={{ fontSize: '0.84rem' }}>
                      <span className="text-muted">Güncelleme Türü:</span>
                      {appVersion.latest_version === appVersion.min_required_version ? (
                        <span className="badge bg-danger d-inline-flex align-items-center gap-1">
                          <i className="ti ti-lock"></i>
                          Zorunlu Güncelleme
                        </span>
                      ) : (
                        <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
                          <i className="ti ti-bell-ringing"></i>
                          İsteğe Bağlı
                        </span>
                      )}
                    </div>

                    {/* API Durumu */}
                    <div className="small text-muted mb-3 d-flex align-items-center justify-content-between">
                      <span>Mobil API Durumu:</span>
                      <span className="badge bg-success-subtle text-success">
                        <i className="ti ti-circle-check me-1"></i>
                        Canlıda Aktif
                      </span>
                    </div>

                    {/* Aksiyon */}
                    <div className="d-grid">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-2"
                        onClick={() => {
                          setVersionFormData(appVersion);
                          setVersionCardEditing(true);
                        }}
                      >
                        <i className="ti ti-refresh"></i>
                        Sürüm Bilgisini Değiştir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* İSTATİSTİKLER */}
        <div className="col-lg-8">
          <div className="row">
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <i className="ti ti-building fs-2 text-primary mb-2"></i>
                  <h4 className="fw-bold mb-1">{stats.campuses}</h4>
                  <p className="text-muted mb-0">Kampüs</p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <i className="ti ti-school fs-2 text-info mb-2"></i>
                  <h4 className="fw-bold mb-1">{stats.education_levels}</h4>
                  <p className="text-muted mb-0">Eğitim Kademesi</p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <i className="ti ti-home fs-2 text-warning mb-2"></i>
                  <h4 className="fw-bold mb-1">{stats.classrooms}</h4>
                  <p className="text-muted mb-0">Sınıf</p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <i className="ti ti-users-group fs-2 text-success mb-2"></i>
                  <h4 className="fw-bold mb-1">{stats.students}</h4>
                  <p className="text-muted mb-0">Öğrenci</p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <i className="ti ti-user-check fs-2 text-danger mb-2"></i>
                  <h4 className="fw-bold mb-1">{stats.teachers}</h4>
                  <p className="text-muted mb-0">Öğretmen</p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <i className="ti ti-user fs-2 text-secondary mb-2"></i>
                  <h4 className="fw-bold mb-1">{stats.staff}</h4>
                  <p className="text-muted mb-0">Personel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {cropModalOpen && selectedLogoSrc && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1050 }}
        >
          <div className="position-absolute top-50 start-50 translate-middle" style={{ width: 'min(92vw, 720px)' }}>
            <div className="card shadow-lg border-0">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <div className="fw-semibold">Logo Kırp</div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeCropModal}>
                  Kapat
                </button>
              </div>
              <div className="card-body">
                <div style={{ position: 'relative', width: '100%', height: 360, background: '#111' }}>
                  <Cropper
                    image={selectedLogoSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  />
                </div>

                <div className="mt-3">
                  <label className="form-label">Yakınlaştır</label>
                  <input
                    type="range"
                    className="form-range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button type="button" className="btn btn-secondary" onClick={closeCropModal} disabled={logoProcessing}>
                    İptal
                  </button>
                  <button type="button" className="btn btn-primary" onClick={applyCroppedLogo} disabled={logoProcessing}>
                    {logoProcessing ? 'Hazırlanıyor...' : 'Uygula'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionSettings;
