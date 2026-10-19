import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Hatırlanan e-posta varsa yükle
    const savedEmail = localStorage.getItem('SUPERADMIN_REMEMBER_EMAIL');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.email.trim() || !formData.password) {
      setErrorMessage('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    try {
      setLoading(true);

      const response = await axiosClient.post('/super-admin/auth/login', {
        email: formData.email.trim(),
        password: formData.password
      });

      if (!response.data?.data?.token) {
        throw new Error(response.data?.message || 'Geçersiz yanıt alındı.');
      }

      const { token, user } = response.data.data;

      // Token ve Kullanıcı Bilgilerini sakla
      localStorage.setItem('ACCESS_TOKEN', token);
      const normalizedUser = {
        ...user,
        role: 'superadmin',
        role_name: 'Süper Admin',
        role_label: 'Süper Admin',
        is_superadmin: true,
        is_super_admin: true,
      };
      localStorage.setItem('USER_DATA', JSON.stringify(normalizedUser));
      localStorage.setItem('USER_ROLE', 'superadmin');

      if (rememberMe) {
        localStorage.setItem('SUPERADMIN_REMEMBER_EMAIL', formData.email.trim());
      } else {
        localStorage.removeItem('SUPERADMIN_REMEMBER_EMAIL');
      }

      showToast('success', 'Yönetim Konsoluna başarıyla giriş yapıldı.');
      navigate('/super-admin');
    } catch (error: any) {
      console.error('Süper admin giriş hatası:', error);
      const msg = error.response?.data?.message || error.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol ediniz.';
      setErrorMessage(msg);
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 50%, #020617 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Arka Plan Dekoratif Işık Efektleri */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '10%',
          width: '450px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />

      {/* Kart Kutusu */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          padding: '40px 36px',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Üst Logo ve Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.45)',
              color: '#ffffff',
              fontSize: '28px'
            }}
          >
            <i className="ti ti-shield-lock"></i>
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}
          >
            SaaS Yönetim Merkezi
          </div>

          <h2 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            EduLem Konsol
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            Merkezi Kurum ve Platform Yönetim Sistemi
          </p>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <i className="ti ti-alert-triangle" style={{ fontSize: '18px', flexShrink: 0 }}></i>
            <span style={{ lineHeight: '1.4' }}>{errorMessage}</span>
          </div>
        )}

        {/* Form Alanı */}
        <form onSubmit={handleSubmit}>
          {/* E-posta */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="sa-email"
              style={{
                display: 'block',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px'
              }}
            >
              Yönetici E-Posta Adresi
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <i
                className="ti ti-mail"
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: '#64748b',
                  fontSize: '18px',
                  pointerEvents: 'none'
                }}
              />
              <input
                id="sa-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@edulem.com"
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 42px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.25)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.2)';
                }}
              />
            </div>
          </div>

          {/* Şifre */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="sa-password"
              style={{
                display: 'block',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px'
              }}
            >
              Yönetici Şifresi
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <i
                className="ti ti-lock"
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: '#64748b',
                  fontSize: '18px',
                  pointerEvents: 'none'
                }}
              />
              <input
                id="sa-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 42px 12px 42px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.25)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.2)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '18px'
                }}
              >
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Beni Hatırla & Güvenli Oturum */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: '#3b82f6',
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              Beni hatırla
            </label>
            <span
              style={{
                color: '#10b981',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <i className="ti ti-shield-check" style={{ fontSize: '14px' }}></i>
              Uçtan Uca Şifreli
            </span>
          </div>

          {/* Giriş Butonu */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: loading
                ? '#334155'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading
                ? 'none'
                : '0 10px 20px -5px rgba(37, 99, 235, 0.45)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 14px 24px -5px rgba(37, 99, 235, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(37, 99, 235, 0.45)';
            }}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  style={{ width: '18px', height: '18px' }}
                ></span>
                <span>Oturum Doğrulanıyor...</span>
              </>
            ) : (
              <>
                <i className="ti ti-login" style={{ fontSize: '18px' }}></i>
                <span>Yönetim Konsoluna Giriş Yap</span>
              </>
            )}
          </button>
        </form>

        {/* Alt Güvenlik Notu */}
        <div
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '11px',
            lineHeight: '1.5'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
            <i className="ti ti-lock-access" style={{ fontSize: '14px', color: '#94a3b8' }}></i>
            <span style={{ color: '#94a3b8', fontWeight: 500 }}>Yalnızca Yetkili Süper Yöneticiler</span>
          </div>
          Yetkisiz erişim girişimleri IP bazında loglanmakta ve engellenmektedir.
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
