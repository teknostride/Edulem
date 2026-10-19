import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import axiosClient from '../../api/axiosClient';

const Layout = () => {
  const location = useLocation();

  const isPortalRoute = location.pathname.startsWith('/portal');

  useEffect(() => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (token && !isPortalRoute) {
      (axiosClient.get('/user/profile').catch(() => axiosClient.get('/profile'))).then((res) => {
        const u = res?.data?.data;
        if (u && u.id) {
          try {
            const storedRaw = localStorage.getItem('USER_DATA');
            const stored = storedRaw ? JSON.parse(storedRaw) : {};
            const updated = {
              ...stored,
              ...u,
              education_level_ids: u.education_level_ids ?? stored.education_level_ids ?? [],
              campus_ids: u.campus_ids ?? stored.campus_ids ?? [],
              role: u.role_name || stored.role,
              role_name: u.role_name || stored.role_name,
              role_id: u.role_id || stored.role_id,
            };
            localStorage.setItem('USER_DATA', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: updated }));
          } catch {
            // ignore
          }
        }
      }).catch(() => null);
    }
  }, [isPortalRoute]);

  useEffect(() => {
    const html = document.documentElement;
    const apply = () => {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      if (isDesktop) {
        html.setAttribute('data-sidenav-size', 'default');
      } else {
        html.removeAttribute('data-sidenav-size');
      }
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    const el = document.getElementById('mobile-sidebar');
    if (!el) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const actionable = target.closest('a,button');
      if (!actionable) return;

      const tag = actionable.tagName.toLowerCase();
      if (tag === 'a') {
        const href = (actionable as HTMLAnchorElement).getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) return;
      }

      const w = window as any;
      const Offcanvas = w?.bootstrap?.Offcanvas;
      if (!Offcanvas) return;

      const inst = Offcanvas.getInstance(el) || new Offcanvas(el);
      inst.hide();
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="wrapper">
      {/* CANLI DESTEK / OKULA SIZMA MODU BANNERI */}
      {localStorage.getItem('IMPERSONATION_DATA') && (
        <div className="bg-danger text-white py-2 px-3 d-flex align-items-center justify-content-between sticky-top shadow-sm" style={{ zIndex: 1065 }}>
          <div className="d-flex align-items-center gap-2">
            <span className="spinner-grow spinner-grow-sm text-warning" role="status"></span>
            <strong>🔴 CANLI DESTEK MODU:</strong>
            <span>
              {(() => {
                try {
                  const d = JSON.parse(localStorage.getItem('IMPERSONATION_DATA') || '{}');
                  return `${d.tenant_name || 'Okul'} sistemine yetkili sızma oturumundasınız.`;
                } catch {
                  return 'Okul sistemine yetkili sızma oturumundasınız.';
                }
              })()}
            </span>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-light text-danger fw-bold shadow-sm"
            onClick={() => {
              const impData = JSON.parse(localStorage.getItem('IMPERSONATION_DATA') || '{}');
              localStorage.removeItem('IMPERSONATION_DATA');
              if (impData.original_token) {
                localStorage.setItem('ACCESS_TOKEN', impData.original_token);
              }
              if (impData.original_user) {
                localStorage.setItem('USER_DATA', JSON.stringify(impData.original_user));
              }
              window.location.href = '/super-admin/tenants';
            }}
          >
            <i className="ti ti-arrow-left me-1"></i> EduLem Yönetim Paneline Geri Dön
          </button>
        </div>
      )}

      {localStorage.getItem('active_config_season') && (
        <div className="bg-warning text-white py-2 px-3 d-flex align-items-center justify-content-center gap-3 sticky-top shadow-sm" style={{ zIndex: 1061 }}>
          <div>
            <i className="ti ti-alert-triangle me-2"></i>
            <strong>Yapılandırma Modu Aktif:</strong> Şu anda seçili sezon için işlem yapıyorsunuz.
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-dark px-3 py-1 fw-bold shadow-sm"
            onClick={() => {
              localStorage.removeItem('active_config_season');
              window.location.reload();
            }}
          >
            Normal Moda Dön
          </button>
        </div>
      )}
      <Header />
      <div className="d-none d-md-block">
        <Sidebar />
      </div>

      <div className="offcanvas offcanvas-start d-md-none" tabIndex={-1} id="mobile-sidebar">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title m-0">Menü</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body p-0">
          <Sidebar />
        </div>
      </div>

      <div className={`content-page${isPortalRoute ? ' portal-content-page' : ''}`}>
        <div className="container-fluid">
          <Outlet /> 
        </div>
        
        <footer className="footer">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 text-center">
                        2026 &copy; EduLem
                    </div>
                </div>
            </div>
        </footer>
      </div>

      {/* --- EKSİK OLAN VE HATAYI ÇÖZEN KISIM: THEME SETTINGS OFFCANVAS --- */}
      {/* Bu div olmazsa vendors.min.js hedefi bulamadığı için 'backdrop' hatası verir */}
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="theme-settings-offcanvas">
        <div className="d-flex justify-content-between align-items-center bg-primary p-3 text-white">
            <h5 className="m-0 text-white">Tema Ayarları</h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body p-0">
            <div data-simplebar className="h-100">
                <div className="p-3">
                    <h5 className="mb-3 fw-bold">Renk Şeması</h5>
                    <div className="row g-3">
                        <div className="col-4">
                            <div className="form-check card-radio">
                                <input className="form-check-input" type="radio" name="data-bs-theme" id="layout-color-light" value="light" />
                                <label className="form-check-label p-0 w-100" htmlFor="layout-color-light">
                                    <span className="d-block bg-light p-1 rounded mb-1 border"></span>
                                    <span className="d-block text-center small">Light</span>
                                </label>
                            </div>
                        </div>
                        <div className="col-4">
                            <div className="form-check card-radio">
                                <input className="form-check-input" type="radio" name="data-bs-theme" id="layout-color-dark" value="dark" />
                                <label className="form-check-label p-0 w-100" htmlFor="layout-color-dark">
                                    <span className="d-block bg-dark p-1 rounded mb-1 border border-secondary"></span>
                                    <span className="d-block text-center small">Dark</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      {/* --- OFFCANVAS SONU --- */}

    </div>
  );
};

export default Layout;