import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

const STORAGE_KEYS = {
    username: 'iletibilgi_username',
    password: 'iletibilgi_password',
    baseUrl: 'iletibilgi_base_url',
    sender: 'iletibilgi_sender',
    enabled: 'iletibilgi_enabled',
};

interface AccountInfo {
    credit?: number | string;
    balance?: number | string;
    mainCredit?: number | string;
    usedCredit?: number | string;
    originators?: string[];
    company?: string;
    username?: string;
    title?: string;
    [key: string]: any;
}

const SmsApiSettings = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [baseUrl, setBaseUrl] = useState('https://panel.iletibilgi.com.tr:9588');
    const [sender, setSender] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    // Account & Credit Info
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [infoError, setInfoError] = useState<string | null>(null);

    // Test SMS
    const [testPhone, setTestPhone] = useState('');
    const [testMsg, setTestMsg] = useState('EduLem SMS entegrasyon test mesajıdır.');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        // Eski ortak localStorage kalıntılarını temizle
        localStorage.removeItem(STORAGE_KEYS.username);
        localStorage.removeItem(STORAGE_KEYS.password);
        localStorage.removeItem(STORAGE_KEYS.baseUrl);
        localStorage.removeItem(STORAGE_KEYS.sender);
        localStorage.removeItem(STORAGE_KEYS.enabled);
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await axiosClient.get('/sms/settings');
            const data = res.data?.data;
            if (data) {
                const u = data.username || '';
                const p = data.password || '';
                const b = data.base_url || 'https://panel.iletibilgi.com.tr:9588';
                const s = data.sender || '';
                const e = Boolean(data.enabled);

                setUsername(u);
                setPassword(p);
                setBaseUrl(b);
                setSender(s);
                setEnabled(e);

                if (data.credit !== undefined && data.credit !== null) {
                    setAccountInfo(data);
                } else if (u && p) {
                    fetchAccountInfo(u, p, b);
                } else {
                    setAccountInfo(null);
                }
                return;
            }
        } catch {
            // fallback
        }

        setUsername('');
        setPassword('');
        setBaseUrl('https://panel.iletibilgi.com.tr:9588');
        setSender('');
        setEnabled(false);
        setAccountInfo(null);
    };

    const fetchAccountInfo = async (u?: string, p?: string, b?: string) => {
        const user = (u !== undefined ? u : username).trim();
        const pass = (p !== undefined ? p : password).trim();
        const base = (b !== undefined ? b : baseUrl).trim() || 'https://panel.iletibilgi.com.tr:9588';

        setLoadingInfo(true);
        setInfoError(null);

        try {
            const payload: Record<string, string> = {};
            if (user) payload.username = user;
            if (pass) payload.password = pass;
            if (base) payload.base_url = base;

            const res = await axiosClient.post('/sms/user-info', payload);
            const responseData = res.data;
            const info = responseData?.data ?? responseData;

            if (info && (info.credit !== undefined || info.balance !== undefined || info.usedCredit !== undefined || info.company !== undefined)) {
                setAccountInfo(info);
                setInfoError(null);
            } else if (responseData?.status === true && responseData?.data) {
                setAccountInfo(responseData.data);
                setInfoError(null);
            } else {
                setInfoError(responseData?.message || 'Bakiye bilgileri alınamadı.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.err?.message || 'Bakiye bilgisi alınamadı.';
            setInfoError(msg);
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const finalBaseUrl = (baseUrl.trim() || 'https://panel.iletibilgi.com.tr:9588');

            await axiosClient.post('/sms/settings', {
                username: username.trim(),
                password: password.trim(),
                base_url: finalBaseUrl,
                sender: sender.trim(),
                enabled: enabled,
            });

            showToast('success', 'SMS API Ayarları başarıyla kaydedildi.');
            fetchAccountInfo();
        } catch {
            showToast('error', 'SMS ayarları kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };

    const handleSendTestSms = async () => {
        if (!testPhone.trim()) {
            setTestResult({ success: false, message: 'Lütfen test telefon numarası girin.' });
            return;
        }
        if (!username.trim() || !password.trim()) {
            setTestResult({ success: false, message: 'Lütfen önce API kullanıcı adı ve şifre alanlarını doldurun.' });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const res = await axiosClient.post('/sms/test', {
                username: username.trim(),
                password: password.trim(),
                base_url: baseUrl.trim(),
                sender: sender.trim(),
                phone: testPhone.trim(),
                message: testMsg.trim(),
            });

            const pkgID = res.data?.data?.pkgID;
            if (pkgID) {
                setTestResult({
                    success: true,
                    message: `✅ SMS başarıyla gönderildi! Paket ID: ${pkgID} — Alıcı: ${testPhone}`,
                });
                showToast('success', 'Test SMS başarıyla gönderildi!');
                fetchAccountInfo();
            } else {
                setTestResult({
                    success: true,
                    message: `✅ ${res.data?.message || 'SMS başarıyla gönderildi!'}`,
                });
                showToast('success', 'Test SMS gönderildi!');
            }
        } catch (err: any) {
            const errMsg = err.response?.data?.message || err.response?.data?.err?.message || err.message || 'Bağlantı hatası oluştu.';
            setTestResult({
                success: false,
                message: `❌ ${errMsg}`,
            });
            showToast('error', errMsg);
        } finally {
            setTesting(false);
        }
    };

    // Calculate remaining and used credits
    const getRemaining = () => {
        if (!accountInfo) return '—';
        const candidates = [
            accountInfo.credit,
            accountInfo.balance,
            accountInfo.mainCredit,
            accountInfo.sms_credit,
            accountInfo.smsCredit,
            accountInfo.credits,
            accountInfo.amount,
            accountInfo.raw?.data?.credit,
            accountInfo.raw?.data?.balance,
            accountInfo.raw?.data?.mainCredit,
            accountInfo.raw?.data?.sms?.balance,
            accountInfo.raw?.data?.sms?.credit,
            accountInfo.raw?.data?.user?.credit,
            accountInfo.raw?.data?.user?.balance,
            accountInfo.raw?.credit,
            accountInfo.raw?.balance,
        ];
        for (const c of candidates) {
            if (c !== undefined && c !== null && c !== '') {
                return typeof c === 'number' ? c.toLocaleString('tr-TR') : c;
            }
        }
        return '0';
    };

    const getUsed = () => {
        if (!accountInfo) return '—';
        const candidates = [
            accountInfo.usedCredit,
            accountInfo.used_credit,
            accountInfo.spent,
            accountInfo.used,
            accountInfo.total_sent,
            accountInfo.sent,
            accountInfo.raw?.data?.used_credit,
            accountInfo.raw?.data?.usedCredit,
            accountInfo.raw?.data?.spent,
            accountInfo.raw?.data?.used,
            accountInfo.raw?.data?.sms?.used,
            accountInfo.raw?.data?.user?.used,
            accountInfo.raw?.used_credit,
            accountInfo.raw?.spent,
        ];
        for (const c of candidates) {
            if (c !== undefined && c !== null && c !== '') {
                return typeof c === 'number' ? c.toLocaleString('tr-TR') : c;
            }
        }
        return '0';
    };

    const remainingCredits = getRemaining();
    const usedCredits = getUsed();

    return (
        <div className="container-fluid">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0">SMS API Ayarları & Kredi Durumu</h3>
                    <p className="text-muted mb-0">İleti Bilgi SMS servisi entegrasyonu, bakiye sorgulama ve bağlantı yönetimi.</p>
                </div>
                <div className="text-end d-none d-md-block ms-3">
                    <ol className="breadcrumb m-0 py-0">
                        <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Anasayfa</Link></li>
                        <li className="breadcrumb-item"><Link to="/sms/history" className="text-decoration-none text-muted">SMS Merkezi</Link></li>
                        <li className="breadcrumb-item active fw-medium">API Ayarları</li>
                    </ol>
                </div>
            </div>

            {/* Status Banner */}
            <div className={`card border-0 shadow-sm mb-4 text-white ${enabled ? 'bg-success' : 'bg-secondary'}`}>
                <div className="card-body p-3 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="p-2 bg-white bg-opacity-20 rounded">
                            <i className={`ti ${enabled ? 'ti-mail-check' : 'ti-mail-off'} fs-3`}></i>
                        </div>
                        <div>
                            <h5 className="mb-0 fw-bold">{enabled ? 'SMS Servisi Aktif' : 'SMS Servisi Pasif'}</h5>
                            <small className="opacity-75">
                                {enabled && username ? `İleti Bilgi — ${username}` : 'Sistem SMS gönderimleri şu an kapalı.'}
                            </small>
                        </div>
                    </div>
                    <span className="badge bg-white text-dark fw-bold px-3 py-2">
                        {enabled ? 'AKTİF' : 'PASİF'}
                    </span>
                </div>
            </div>

            {/* SMS Bakiye & Kredi İstatistikleri */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm p-3 h-100 bg-white">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="text-muted small fw-bold text-uppercase">Kalan SMS Kredisi</span>
                            <div className="badge bg-primary-subtle text-primary p-2 rounded">
                                <i className="ti ti-message-2 fs-5"></i>
                            </div>
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <h2 className="fw-bold mb-0 text-primary">
                                {loadingInfo ? (
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                    remainingCredits
                                )}
                            </h2>
                            <small className="text-muted">Adet Kredi</small>
                        </div>
                        <small className="text-muted mt-2">Hesabınızda kullanıma hazır SMS adedi</small>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm p-3 h-100 bg-white">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="text-muted small fw-bold text-uppercase">Kullanılan SMS</span>
                            <div className="badge bg-warning-subtle text-warning p-2 rounded">
                                <i className="ti ti-send fs-5"></i>
                            </div>
                        </div>
                        <div className="d-flex align-items-baseline gap-2">
                            <h2 className="fw-bold mb-0 text-warning">
                                {loadingInfo ? (
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                    usedCredits
                                )}
                            </h2>
                            <small className="text-muted">Adet</small>
                        </div>
                        <small className="text-muted mt-2">Hesap üzerinden harcanan toplam SMS</small>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm p-3 h-100 bg-white">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="text-muted small fw-bold text-uppercase">Hesap Bilgisi</span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-0 px-2"
                                onClick={() => fetchAccountInfo()}
                                disabled={loadingInfo}
                                title="Bakiye bilgilerini yenile"
                            >
                                <i className={`ti ti-refresh ${loadingInfo ? 'ti-spin' : ''} me-1`}></i>
                                Yenile
                            </button>
                        </div>
                        <div>
                            <div className="fw-bold text-dark">{accountInfo?.company || accountInfo?.title || username || '—'}</div>
                            <small className="text-muted d-block">
                                {accountInfo?.originators && accountInfo.originators.length > 0 ? (
                                    <>Başlıklar: {accountInfo.originators.join(', ')}</>
                                ) : (
                                    <>Aktif Gönderen: <strong>{sender}</strong></>
                                )}
                            </small>
                            {infoError && <small className="text-danger d-block mt-1">{infoError}</small>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Sol Kolon - Ayarlar Formu */}
                <div className="col-lg-7 mb-4">
                    <form onSubmit={handleSave}>
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-transparent border-0 pt-3 pb-0">
                                <h5 className="fw-bold mb-0 text-primary">
                                    <i className="ti ti-settings me-2"></i>API Kimlik & Bağlantı Ayarları
                                </h5>
                            </div>
                            <div className="card-body">
                                {/* Aktiflik Switch */}
                                <div className="form-check form-switch mb-4 p-3 bg-light rounded d-flex justify-content-between align-items-center">
                                    <div>
                                        <label className="form-check-label fw-bold cursor-pointer" htmlFor="smsEnableSwitch">
                                            İleti Bilgi SMS Servisini Etkinleştir
                                        </label>
                                        <div className="text-muted small">Tüm sistem SMS'leri İleti Bilgi altyapısı üzerinden iletilir.</div>
                                    </div>
                                    <input
                                        className="form-check-input ms-0 fs-4 cursor-pointer"
                                        type="checkbox"
                                        id="smsEnableSwitch"
                                        checked={enabled}
                                        onChange={e => setEnabled(e.target.checked)}
                                    />
                                </div>

                                {/* Kullanıcı Adı */}
                                <div className="mb-3">
                                    <label className="form-label fw-medium">API Kullanıcı Adı <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <span className="input-group-text"><i className="ti ti-user"></i></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Örn: smsuser"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-text">İleti Bilgi panel kullanıcı adınız.</div>
                                </div>

                                {/* Şifre */}
                                <div className="mb-3">
                                    <label className="form-label fw-medium">API Şifresi <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <span className="input-group-text"><i className="ti ti-key"></i></span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="form-control"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
                                        </button>
                                    </div>
                                    <div className="form-text">İleti Bilgi panel şifreniz.</div>
                                </div>

                                {/* Sender Header */}
                                <div className="mb-3">
                                    <label className="form-label fw-medium">Gönderen Başlığı (Sender) <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <span className="input-group-text"><i className="ti ti-id"></i></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Örn: OKUL ADI"
                                            value={sender}
                                            onChange={e => setSender(e.target.value)}
                                            required
                                        />
                                    </div>
                                    {accountInfo?.originators && accountInfo.originators.length > 0 && (
                                        <div className="mt-2">
                                            <small className="text-muted me-2">Onaylı Başlıklar:</small>
                                            {accountInfo.originators.map((orig, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className={`btn btn-xs badge me-1 ${sender === orig ? 'bg-primary text-white' : 'bg-light text-dark border'}`}
                                                    onClick={() => setSender(orig)}
                                                >
                                                    {orig}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="form-text">İleti Bilgi panelinizde tanımlı ve onaylı başlık adı.</div>
                                </div>

                                {/* API URL (İsteğe bağlı) */}
                                <div className="mb-4">
                                    <label className="form-label fw-medium">API Base URL</label>
                                    <div className="input-group">
                                        <span className="input-group-text"><i className="ti ti-link"></i></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="https://panel.iletibilgi.com.tr:9588"
                                            value={baseUrl}
                                            onChange={e => setBaseUrl(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-text">Varsayılan: <code>https://panel.iletibilgi.com.tr:9588</code></div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => fetchAccountInfo()}
                                        disabled={loadingInfo}
                                    >
                                        <i className={`ti ti-refresh ${loadingInfo ? 'ti-spin' : ''} me-2`}></i>
                                        Bakiyeyi Sorgula
                                    </button>
                                    <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ti ti-device-floppy me-2"></i>Ayarları Kaydet
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Sağ Kolon - Bağlantı Testi (Tekli SMS) & Bilgiler */}
                <div className="col-lg-5 mb-4">
                    {/* Test SMS Kartı */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-transparent border-0 pt-3 pb-0">
                            <h5 className="fw-bold mb-0 text-teal" style={{ color: '#0d9488' }}>
                                <i className="ti ti-send me-2"></i>Bağlantı Testi — Tekli SMS
                            </h5>
                        </div>
                        <div className="card-body">
                            <p className="text-muted small">
                                Girilen veya kayıtlı kimlik bilgileriyle sunucu üzerinden anında test SMS'i göndererek bağlantıyı doğrulayabilirsiniz.
                            </p>

                            <div className="mb-3">
                                <label className="form-label small fw-medium">Test Telefon Numarası</label>
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text"><i className="ti ti-phone"></i></span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="905XXXXXXXXX"
                                        value={testPhone}
                                        onChange={e => setTestPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-medium">Test Mesaj Metni</label>
                                <textarea
                                    className="form-control form-control-sm"
                                    rows={2}
                                    maxLength={160}
                                    value={testMsg}
                                    onChange={e => setTestMsg(e.target.value)}
                                ></textarea>
                            </div>

                            {testResult && (
                                <div className={`alert ${testResult.success ? 'alert-success' : 'alert-danger'} p-2 small mb-3 style-pre-line`}>
                                    <div className="d-flex align-items-start gap-2">
                                        <i className={`ti ${testResult.success ? 'ti-check' : 'ti-alert-circle'} fs-5`}></i>
                                        <div style={{ whiteSpace: 'pre-line' }}>{testResult.message}</div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className="btn btn-outline-teal btn-sm w-100"
                                style={{ borderColor: '#0d9488', color: '#0d9488' }}
                                onClick={handleSendTestSms}
                                disabled={testing}
                            >
                                {testing ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        SMS Gönderiliyor...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-send me-2"></i>Test SMS Gönder
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Entegrasyon Bilgi Kartı */}
                    <div className="card border-0 shadow-sm bg-light">
                        <div className="card-body">
                            <h6 className="fw-bold mb-3 text-dark">
                                <i className="ti ti-info-circle text-info me-2"></i>İleti Bilgi API Detayları
                            </h6>
                            <ul className="list-unstyled small text-muted mb-0 space-y-2">
                                <li className="mb-2"><strong>Sağlayıcı:</strong> İleti Bilgi (panel.iletibilgi.com.tr)</li>
                                <li className="mb-2"><strong>Auth Yöntemi:</strong> HTTP Basic Authentication</li>
                                <li className="mb-2"><strong>Karakter Seti:</strong> Encoding = 1 (Türkçe Karakter Desteği)</li>
                                <li className="mb-2"><strong>Bakiye Servisi:</strong> <code>/user/information</code></li>
                                <li className="mb-2"><strong>SMS Gönderim:</strong> <code>/sms/create</code></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmsApiSettings;
