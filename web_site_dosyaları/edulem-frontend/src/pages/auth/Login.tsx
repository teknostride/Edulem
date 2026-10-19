import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { getDashboardRouteByRole } from '../../utils/roleRouting';
import logo from '../../assets/logo.jpeg';

const Login = () => {
  const [tcNo, setTcNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const msg = sessionStorage.getItem('login_message');
    if (msg) {
      setError(msg);
      sessionStorage.removeItem('login_message');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Giriş İsteği (CSRF çağrısını kaldırdık, Token tabanlı çalışıyoruz)
      const response = await axiosClient.post('/auth/login', {
        tc_no: tcNo,
        password,
        device_name: 'SchoolAdmin Web' // Backend'de hangi cihazdan girildiğini görmek için
      });

      // BACKEND YANIT YAPISI:
      // Backend'den dönen yapı: { status: true, data: { user: {...}, token: "..." }, message: "..." }
      // Axios response yapısı: response.data = { status: true, data: { user: {...}, token: "..." }, message: "..." }

      if (!response.data || !response.data.data) {
        setError('Beklenmeyen yanıt formatı. Lütfen tekrar deneyin.');
        return;
      }

      const { token, user } = response.data.data;

      if (!token || !user) {
        setError('Token veya kullanıcı bilgisi alınamadı. Lütfen tekrar deneyin.');
        return;
      }

      // 2. KRİTİK ADIM: Token'ı interceptor'ın bulabileceği isimle sakla
      localStorage.setItem('ACCESS_TOKEN', token);

      // 3. Kullanıcı detaylarını sakla (Profil göstermek için)
      // role alanını string'e normalize et (obje olarak gelirse {name, description} → string)
      const normalizedUser = {
        ...user,
        role: typeof user.role === 'string'
          ? user.role
          : (user.role && typeof user.role === 'object' ? (user.role.name || user.role.display_name || '') : (user.role_name || '')),
      };
      localStorage.setItem('USER_DATA', JSON.stringify(normalizedUser));

      // 3.1 Rol bilgisini düzgün şekilde çıkart ve sakla (Hızlı erişim için)
      let roleToSave = '';
      if (typeof user.role === 'string') {
        roleToSave = user.role;
      } else if (user.role && typeof user.role === 'object' && user.role.name) {
        roleToSave = user.role.name;
      } else if (user.role_name) {
        roleToSave = user.role_name;
      } else if (typeof user.role_id !== 'undefined' && user.role_id !== null) {
        roleToSave = String(user.role_id);
      }

      localStorage.setItem('USER_ROLE', roleToSave);

      // 3.2 Portal verilerini ve LOGIN_TYPE ayarla
      const isStudent = roleToSave === 'student' || roleToSave === 'Öğrenci';
      const isGuardian = roleToSave === 'guardian' || roleToSave === 'Veli';

      if (isStudent) {
        localStorage.setItem('LOGIN_TYPE', 'student');
      } else if (isGuardian) {
        localStorage.setItem('LOGIN_TYPE', 'guardian');
      } else {
        localStorage.setItem('LOGIN_TYPE', 'staff');
        localStorage.removeItem('PORTAL_ACTIVE_STUDENT');
        localStorage.removeItem('PORTAL_ACTIVE_STUDENT_ID');
        localStorage.removeItem('PORTAL_SIBLINGS');
      }

      // 3.3 İlk kademe ID'sini sakla (Müdür / Yönetici ilk açılışta verilerin hemen gelmesi için)
      if (Array.isArray(user.education_level_ids) && user.education_level_ids.length > 0) {
        const validEduIds = user.education_level_ids.map(Number).filter((n: number) => Number.isFinite(n) && n > 0);
        if (validEduIds.length > 0) {
          localStorage.setItem('PRIMARY_EDUCATION_LEVEL_ID', String(validEduIds[0]));
        }
      }

      console.log("Token başarıyla alındı ve kilitlendi:", token);

      // 4. Rol bazlı dashboard'a yönlendir
      if (isStudent || isGuardian) {
        window.location.href = '/portal/dashboard';
      } else {
        const dashboardRoute = getDashboardRouteByRole(roleToSave);
        navigate(dashboardRoute, { replace: true });
      }

    } catch (err: any) {
      console.error("Login Hatası:", err);

      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;

        // Backend'den gelen hata mesajını göster
        if (errorData && errorData.message) {
          setError(errorData.message);
        } else if (status === 401) {
          setError('TC Kimlik No veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.');
        } else if (status === 422) {
          setError('Eksik bilgi girdiniz. Lütfen tüm alanları doldurun.');
        } else if (status === 503) {
          setError('Sistem şu anda bakımda veya geçici olarak kullanılamıyor. Lütfen birazdan tekrar deneyin.');
        } else if (status === 500) {
          setError('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.');
        } else {
          setError('Giriş yapılamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.');
        }
      } else if (err.request) {
        setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex min-vh-100 premium-login">

      {/* SOL TARA: GÖRSEL ALANI (Mobilde Gizlenir) */}
      <div className="d-none d-lg-flex col-lg-6 align-items-center justify-content-center p-5"
        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="text-center text-white">
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '120px', height: '120px' }}>
              <img src={logo} alt="EduLem" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '28px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)' }} />
            </div>
          </div>
          <h1 className="fw-bold display-5 mb-3">EduLem</h1>
          <p className="lead text-white-50">Tüm eğitim süreçlerinizi tek noktadan, güvenle yönetin.</p>

          <div className="mt-5 d-flex justify-content-center">
            <div className="text-center px-3">
              <h4 className="fw-bold mb-0">%100</h4>
              <small className="text-white-50">Kontrol</small>
            </div>
          </div>
        </div>
      </div>

      {/* SAĞ TARAF: FORM ALANI */}
      <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center p-4">
        <div className="w-100" style={{ maxWidth: '450px' }}>
          <div className="d-lg-none premium-login-mobile__hero mb-3 text-center">
            <div className="d-flex align-items-center justify-content-center mx-auto premium-login-mobile__logoWrap">
              <img
                src={logo}
                alt="EduLem"
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 16 }}
              />
            </div>
            <div className="fw-bold mt-3" style={{ fontSize: 26, letterSpacing: '0.04em' }}>EduLem</div>
            <div className="premium-login-mobile__muted mt-1">Tüm eğitim süreçlerinizi tek noktadan, güvenle yönetin.</div>

            <div className="d-flex justify-content-center mt-3">
              <div className="text-center px-2">
                <div className="fw-bold">%100</div>
                <div className="small premium-login-mobile__muted">Kontrol</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-lg w-100" style={{ borderRadius: 18 }}>
            <div className="card-body p-4 p-sm-5">

              <div className="text-center mb-4">
                <h2 className="fw-bold text-dark">Hoş Geldiniz 👋</h2>
                <p className="text-muted mb-0">Lütfen hesabınıza giriş yapın.</p>
              </div>

              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <i className="ti ti-alert-circle me-2 fs-5"></i>
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label fw-bold">TC Kimlik No</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><i className="ti ti-id text-muted"></i></span>
                    <input
                      type="text"
                      className="form-control border-start-0 bg-light ps-0"
                      placeholder="11 haneli TC No"
                      value={tcNo}
                      onChange={(e) => setTcNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      required
                      tabIndex={1}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold mb-0">Şifre</label>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-primary fs-sm fw-semibold text-decoration-none"
                      onClick={() => setShowForgotInfo(true)}
                    >
                      Şifremi Unuttum?
                    </button>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><i className="ti ti-lock text-muted"></i></span>
                    <input
                      type="password"
                      className="form-control border-start-0 bg-light ps-0"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      tabIndex={2}
                    />
                  </div>
                </div>

                <div className="mb-4 form-check">
                  <input type="checkbox" className="form-check-input" id="remember" />
                  <label className="form-check-label text-muted" htmlFor="remember">Beni Hatırla</label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-bold shadow-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Giriş yapılıyor...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-login me-2"></i>
                      Giriş Yap
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-muted mb-0 fs-13"> 2026 EduLem v1.0</p>
          </div>

        </div>
      </div>

      {showForgotInfo && (
        <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Bilgilendirme</h5>
                <button type="button" className="btn-close" onClick={() => setShowForgotInfo(false)}></button>
              </div>
              <div className="modal-body">
                Lütfen İdari Amirinizden / Yöneticinizden Destek Alınız
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={() => setShowForgotInfo(false)}>
                  Tamam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;