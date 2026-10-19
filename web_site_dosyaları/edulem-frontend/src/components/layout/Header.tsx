import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { getRoleLabel } from '../../utils/roleRouting';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMonochrome, setIsMonochrome] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messageConversations, setMessageConversations] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState({
    name: 'Kullanıcı',
    email: '',
    role_name: 'Görev Belirtilmedi',
    role: '',
    avatar: 'https://ui-avatars.com/api/?name=Kullanici&background=random',
    campus_name: ''
  });
  const isPortalRole = (role?: string | null) => {
    const r = (role || '').toLowerCase();
    return r === 'student' || r === 'guardian' || r === 'veli' || r === 'öğrenci' || r === 'ogrenci';
  };

  const [siblings, setSiblings] = useState<any[]>(() => {
    try {
      const role = localStorage.getItem('USER_ROLE');
      if (!isPortalRole(role)) return [];
      return JSON.parse(localStorage.getItem('PORTAL_SIBLINGS') || '[]');
    } catch {
      return [];
    }
  });
  const [activeStudent, setActiveStudent] = useState<any>(() => {
    try {
      const role = localStorage.getItem('USER_ROLE');
      if (!isPortalRole(role)) return null;
      return JSON.parse(localStorage.getItem('PORTAL_ACTIVE_STUDENT') || 'null');
    } catch {
      return null;
    }
  });
  const [switchingSibling, setSwitchingSibling] = useState(false);

  // Kullanıcı bilgilerini localStorage'dan al
  useEffect(() => {
    const loadUserData = () => {
      const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      if (userData.name) {
        const roleRaw = userData.role_name || userData.role_label || userData.role || localStorage.getItem('USER_ROLE');
        setUserProfile({
          name: userData.name || 'Kullanıcı',
          email: userData.email || '',
          role_name: getRoleLabel(roleRaw),
          role: typeof userData.role === 'string' ? userData.role : (userData.role && typeof userData.role === 'object' ? (userData.role.name || userData.role.display_name || '') : (userData.role_name || '')),
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Kullanıcı')}&background=random`,
          campus_name: userData.campus_name || ''
        });
      }
    };

    loadUserData();

    // Storage değişikliklerini dinle
    const handleStorageChange = () => {
      loadUserData();
      const role = localStorage.getItem('USER_ROLE');
      if (isPortalRole(role)) {
        try {
          const cached = JSON.parse(localStorage.getItem('PORTAL_ACTIVE_STUDENT') || 'null');
          if (cached) setActiveStudent(cached);
          const cachedSibs = JSON.parse(localStorage.getItem('PORTAL_SIBLINGS') || '[]');
          if (Array.isArray(cachedSibs)) setSiblings(cachedSibs);
        } catch {}
      } else {
        setActiveStudent(null);
        setSiblings([]);
      }
    };

    const handleUserDataUpdated = (event: any) => {
      if (event.detail) {
        const roleRaw = event.detail.role_name || event.detail.role_label || event.detail.role || localStorage.getItem('USER_ROLE');
        setUserProfile({
          name: event.detail.name || 'Kullanıcı',
          email: event.detail.email || '',
          role_name: getRoleLabel(roleRaw),
          role: typeof event.detail.role === 'string' ? event.detail.role : (event.detail.role && typeof event.detail.role === 'object' ? (event.detail.role.name || event.detail.role.display_name || '') : (event.detail.role_name || '')),
          avatar: event.detail.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.detail.name || 'Kullanıcı')}&background=random`,
          campus_name: event.detail.campus_name || ''
        });
      }
    };

    const handlePortalStudentLoaded = (event: any) => {
      if (event.detail) {
        const st = event.detail.student || (event.detail.name ? event.detail : null);
        if (st) {
          setActiveStudent(st);
        }
        const sibs = event.detail.siblings || event.detail.students;
        if (Array.isArray(sibs) && sibs.length > 0) {
          setSiblings(sibs);
        }
      }
    };

    const handleMessageRead = () => {
      setMessageCount(prev => {
        const newCount = Math.max(0, prev - 1);
        window.dispatchEvent(new CustomEvent('badgeCounts', { detail: { type: 'message', count: newCount } }));
        return newCount;
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    window.addEventListener('portalStudentLoaded', handlePortalStudentLoaded);
    window.addEventListener('messageRead', handleMessageRead);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleUserDataUpdated);
      window.removeEventListener('portalStudentLoaded', handlePortalStudentLoaded);
      window.removeEventListener('messageRead', handleMessageRead);
    };
  }, []);

  // --- 1. ÇIKIŞ YAP ---
  const handleLogout = () => {
    localStorage.removeItem('ACCESS_TOKEN');
    localStorage.removeItem('USER_DATA');
    localStorage.removeItem('USER_ROLE');
    localStorage.removeItem('PORTAL_ACTIVE_STUDENT');
    localStorage.removeItem('PORTAL_ACTIVE_STUDENT_ID');
    localStorage.removeItem('PORTAL_SIBLINGS');
    navigate('/login');
  };

  // --- 3. TEMA DEĞİŞTİRME (Light/Dark) ---
  const changeTheme = (mode: string) => {
    localStorage.setItem('theme', mode);
    if (mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-bs-theme', mode);
    }
  };

  // --- 2. RENK PALETİ (Monochrome) ---
  const toggleMonochrome = () => {
    const html = document.documentElement;
    if (isMonochrome) {
      html.removeAttribute('data-monochrome'); // Kapat
      html.style.filter = ""; // CSS filtresini kaldır
      setIsMonochrome(false);
      localStorage.removeItem('monochrome');
    } else {
      html.setAttribute('data-monochrome', 'true'); // Aç
      html.style.filter = "grayscale(100%)"; // Sayfayı gri yap
      setIsMonochrome(true);
      localStorage.setItem('monochrome', 'true');
    }
  };

  // --- 4. HIZLI ARAMA ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Arama sonucu sayfasına yönlendir
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // --- 5. TAM EKRAN ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // --- 4. SAYFA YÜKLENİNCE AYARLARI HATIRLA ---
  useEffect(() => {
    // Temayı yükle
    const savedTheme = localStorage.getItem('theme') || 'light';
    changeTheme(savedTheme);

    // Monochrome modunu yükle
    const savedMono = localStorage.getItem('monochrome');
    if (savedMono === 'true') {
      setIsMonochrome(true);
      document.documentElement.setAttribute('data-monochrome', 'true');
      document.documentElement.style.filter = "grayscale(100%)";
    }

    // Bootstrap Dropdown'larını tetikle
    // @ts-ignore
    if (window.bootstrap) {
      const dropdownElementList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
      dropdownElementList.map(function (dropdownToggleEl) {
        // @ts-ignore
        return new window.bootstrap.Dropdown(dropdownToggleEl);
      });
    }

    // Tüm header badge + özet verilerini tek istekte çek
    fetchLayoutInit();

    const isPortal = location.pathname.startsWith('/portal') ||
      localStorage.getItem('USER_ROLE') === 'student' ||
      localStorage.getItem('USER_ROLE') === 'guardian';

    if (isPortal) {
      fetchPortalProfile();
    }
  }, [location.pathname]);

  const fetchPortalProfile = async () => {
    try {
      if (location.pathname.startsWith('/portal')) {
        const dashRes = await axiosClient.get('/portal/student/dashboard').catch(() => null);
        if (dashRes?.data?.data?.student) {
          const st = dashRes.data.data.student;
          setActiveStudent((prev: any) => ({ ...prev, ...st }));
          localStorage.setItem('PORTAL_ACTIVE_STUDENT', JSON.stringify(st));
          localStorage.setItem('PORTAL_ACTIVE_STUDENT_ID', String(st.id));

          const sibList = dashRes.data.data.students || dashRes.data.data.siblings || [];
          if (sibList.length > 0) {
            setSiblings(sibList);
            localStorage.setItem('PORTAL_SIBLINGS', JSON.stringify(sibList));
          }
          return;
        }
      }

      const response = await axiosClient.get('/portal/student/profile').catch(() => null);
      const d = response?.data?.data;
      if (d?.student) {
        setActiveStudent(d.student);
        localStorage.setItem('PORTAL_ACTIVE_STUDENT', JSON.stringify(d.student));
        localStorage.setItem('PORTAL_ACTIVE_STUDENT_ID', String(d.student.id));
        const sibList = d.students || d.siblings || [];
        if (sibList.length > 0) {
          setSiblings(sibList);
          localStorage.setItem('PORTAL_SIBLINGS', JSON.stringify(sibList));
        }
      }
    } catch {
      // ignore silently for non-portal users
    }
  };

  const handleSwitchSibling = async (targetStudent: any) => {
    try {
      setSwitchingSibling(true);
      const targetId = typeof targetStudent === 'object' ? targetStudent.id : targetStudent;
      const res = await axiosClient.post('/portal/student/switch-sibling', {
        target_student_id: targetId,
      });
      const data = res.data?.data;
      if (data?.token) {
        localStorage.setItem('ACCESS_TOKEN', data.token);
      }
      const st = data?.student || (typeof targetStudent === 'object' ? targetStudent : null);
      if (st) {
        setActiveStudent(st);
        localStorage.setItem('PORTAL_ACTIVE_STUDENT', JSON.stringify(st));
        localStorage.setItem('PORTAL_ACTIVE_STUDENT_ID', String(st.id));
        const storedUser: any = { ...st, role: 'student', name: st.name };
        localStorage.setItem('USER_DATA', JSON.stringify(storedUser));
        localStorage.setItem('USER_ROLE', 'student');
      }
      window.location.href = '/portal/dashboard';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Öğrenci geçişi yapılamadı.');
    } finally {
      setSwitchingSibling(false);
    }
  };

  // --- 5. LAYOUT INIT: 4 ayrı API → tek endpoint ---
  const fetchLayoutInit = async () => {
    try {
      const response = await axiosClient.get('/layout/init');
      const d = response.data?.data ?? response.data;

      const notifCount = d?.unread_announcements ?? 0;
      setNotificationCount(notifCount);
      window.dispatchEvent(new CustomEvent('badgeCounts', { detail: { type: 'notification', count: notifCount } }));

      const notifList = Array.isArray(d?.recent_notifications) ? d.recent_notifications : [];
      setNotifications(notifList);

      const msgCount = d?.unread_messages ?? 0;
      setMessageCount(msgCount);
      window.dispatchEvent(new CustomEvent('badgeCounts', { detail: { type: 'message', count: msgCount } }));

      const convList = Array.isArray(d?.recent_conversations) ? d.recent_conversations : [];
      setMessageConversations(convList.slice(0, 5));
    } catch (error) {
      console.error('Layout verileri çekilemedi:', error);
      setNotificationCount(0);
      setNotifications([]);
      setMessageCount(0);
      setMessageConversations([]);
    }
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || d.innerText || '';
  };

  const formatNotifTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 60000;
    if (diff < 1) return 'Az önce';
    if (diff < 60) return `${Math.floor(diff)} dakika önce`;
    if (diff < 1440) return `${Math.floor(diff / 60)} saat önce`;
    return `${Math.floor(diff / 1440)} gün önce`;
  };

  const isPortalStudent = (() => {
    const role = (localStorage.getItem('USER_ROLE') || (() => {
      try {
        return JSON.parse(localStorage.getItem('USER_DATA') || '{}')?.role ?? null;
      } catch {
        return null;
      }
    })() || '').toLowerCase();
    return role === 'student' || role === 'öğrenci' || role === 'ogrenci';
  })();

  const currentRoleStr = (localStorage.getItem('USER_ROLE') || userProfile.role || '').toLowerCase();
  const isPortalMode = location.pathname.startsWith('/portal') ||
    currentRoleStr === 'student' ||
    currentRoleStr === 'guardian' ||
    currentRoleStr === 'veli' ||
    currentRoleStr === 'öğrenci' ||
    currentRoleStr === 'ogrenci';

  const rawUserData = (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}');
    } catch {
      return {};
    }
  })();

  const studentDisplayName = activeStudent?.name || 
    activeStudent?.student_name || 
    rawUserData?.student_name || 
    (isPortalMode ? 'Öğrenci' : userProfile.name);

  const studentDisplayClass = activeStudent?.classroom?.name || 
    activeStudent?.classroom_name || 
    activeStudent?.classroom || 
    (isPortalMode ? 'Öğrenci Portalı' : userProfile.role_name);

  // Öğrencileri/kardeşleri tekil hale getir (yalnızca portal modunda ve veli/öğrenci için)
  const uniqueSiblings = (() => {
    if (!isPortalMode) return [];
    const list = Array.isArray(siblings) ? siblings : [];
    const seen = new Set<string>();
    const result: any[] = [];

    for (const item of list) {
      if (!item) continue;
      const tc = item.tc_no ? String(item.tc_no).trim() : null;
      const name = (item.name || item.student_name || '').trim().toLowerCase();
      const key = tc ? `tc_${tc}` : `name_${name}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  })();

  const announcementsRoute = isPortalStudent ? '/portal/announcements' : '/notifications';

  const isSuperAdmin = !!(rawUserData?.is_super_admin || rawUserData?.is_superadmin || localStorage.getItem('USER_ROLE') === 'super-admin');

  return (
    <header className="app-topbar">
      <div className="container-fluid topbar-menu">
        <div className="d-flex align-items-center gap-2">



          {/* --- MOBİL MENÜ BUTONU --- */}
          <button
            className="topnav-toggle-button btn btn-outline-primary btn-sm d-md-none"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobile-sidebar"
            aria-controls="mobile-sidebar"
            aria-label="Menüyü Aç"
            type="button"
          >
            <i className="ti ti-menu-4"></i>
          </button>

          {/* --- ARAMA (Portal modunda ve Süper Admin'de gizlenir) --- */}
          {!isPortalMode && !isSuperAdmin && (
            <div className="app-search d-none d-xl-flex" id="search-box-rounded">
              <form onSubmit={handleSearch} className="d-flex">
                <input
                  type="search"
                  className="form-control rounded-pill topbar-search"
                  name="search"
                  placeholder="Öğrenci, ders, ödeme ara..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                <button type="submit" className="btn btn-link p-0 ms-2">
                  <i className="ti ti-search app-search-icon text-muted"></i>
                </button>
              </form>
            </div>
          )}

        </div>

        {/* --- SAĞ TARAF İKONLAR --- */}
        <div className="d-flex align-items-center gap-2">

          {/* AYAR BUTONU: Tema, Hızlı Erişim, Tam Ekran, Renk Paleti */}
          <div id="settings-dropdown" className="topbar-item d-none d-sm-flex">
            <div className="dropdown">
              <button className="topbar-link dropdown-toggle drop-arrow-none" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-haspopup="true" aria-expanded="false" title="Ayarlar">
                <i className="ti ti-settings topbar-link-icon"></i>
              </button>
              <div className="dropdown-menu dropdown-menu-xxl p-3 dropdown-menu-end">
                <h6 className="mb-2 fw-semibold dropdown-header">Ayarlar</h6>

                <div className="mb-3">
                  <span className="dropdown-header text-muted small">Tema</span>
                  <div className="d-flex gap-1 flex-wrap">
                    <button type="button" className="btn btn-soft-secondary btn-sm" onClick={() => changeTheme('light')}>
                      <i className="ti ti-sun me-1"></i> Açık
                    </button>
                    <button type="button" className="btn btn-soft-secondary btn-sm" onClick={() => changeTheme('dark')}>
                      <i className="ti ti-moon me-1"></i> Koyu
                    </button>
                    <button type="button" className="btn btn-soft-secondary btn-sm" onClick={() => changeTheme('system')}>
                      <i className="ti ti-device-desktop me-1"></i> Sistem
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="dropdown-header text-muted small">Görünüm</span>
                  <div className="d-flex flex-column gap-1">
                    <button type="button" className="dropdown-item cursor-pointer d-flex align-items-center" onClick={toggleFullScreen}>
                      <i className="ti ti-maximize align-middle me-2"></i>
                      <span className="align-middle">Tam ekran</span>
                    </button>
                    <button type="button" className="dropdown-item cursor-pointer d-flex align-items-center" onClick={toggleMonochrome}>
                      <i className="ti ti-palette align-middle me-2"></i>
                      <span className="align-middle">{isMonochrome ? 'Renkli mod' : 'Gri ton (monochrome)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BİLDİRİMLER (Çan) */}
          <div id="notification-dropdown-people" className="topbar-item">
            <div className="dropdown">
              <button type="button" className="topbar-link dropdown-toggle drop-arrow-none" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="ti ti-bell topbar-link-icon animate-ring"></i>
                {notificationCount > 0 && (
                  <span className="badge text-bg-danger badge-circle topbar-badge">{notificationCount}</span>
                )}
              </button>
              <div className="dropdown-menu p-0 dropdown-menu-end dropdown-menu-lg">
                <div className="px-3 py-2 border-bottom">
                  <div className="row align-items-center">
                    <div className="col"><h6 className="m-0 fs-md fw-semibold">Bildirimler</h6></div>
                    <div className="col text-end">
                      <span className="badge badge-soft-success badge-label py-1">{String(notifications.length).padStart(2, '0')} Duyuru</span>
                    </div>
                  </div>
                </div>
                <div className="p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <Link
                        to={announcementsRoute}
                        key={notification.id}
                        className="dropdown-item notification-item py-2 text-wrap"
                        onClick={() => {
                          // Bildirime tıklandığında okundu işaretle (eğer okunmamışsa)
                          if (!notification.read) {
                            axiosClient.put(`/announcements/${notification.id}/read`).catch(() => { });
                            // Local state güncelle
                            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                            const newCount = Math.max(0, notificationCount - 1);
                            setNotificationCount(newCount);
                            window.dispatchEvent(new CustomEvent('badgeCounts', { detail: { type: 'notification', count: newCount } }));
                          }
                        }}
                      >
                        <span className="d-flex align-items-center gap-3">
                          <span className="flex-shrink-0 position-relative">
                            {notification.user_avatar ? (
                              <img src={notification.user_avatar} className="avatar-md rounded-circle" alt="" />
                            ) : (
                              <span className="avatar-md rounded-circle bg-light d-flex align-items-center justify-content-center fw-bold">{(notification.user_name || '?')[0]}</span>
                            )}
                            <span className={`position-absolute rounded-pill bg-${notification.type === 'success' ? 'success' :
                              notification.type === 'warning' ? 'warning' :
                                notification.type === 'error' ? 'danger' : 'info'
                              } notification-badge`}>
                              <i className={`ti ti-${notification.type === 'success' ? 'check' :
                                notification.type === 'warning' ? 'alert-triangle' :
                                  notification.type === 'error' ? 'alert-circle' : 'bell'
                                } align-middle`}></i>
                              <span className="visually-hidden">bildirim</span>
                            </span>
                          </span>
                          <span className="flex-grow-1 text-muted">
                            <span className="fw-medium text-body">{notification.user_name || '—'}</span>
                            {' — '}{notification.title}
                            <br />
                            <span className="fs-xs">{stripHtml(notification.message || '').slice(0, 70)}{stripHtml(notification.message || '').length > 70 ? '...' : ''}</span>
                            <br />
                            <span className="fs-xs">{notification.created_at ? formatNotifTime(notification.created_at) : '—'}</span>
                          </span>
                        </span>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-3 text-muted">
                      <small>Bildirim bulunmuyor</small>
                    </div>
                  )}
                </div>
                <Link to={announcementsRoute} className="dropdown-item text-center text-reset text-decoration-underline link-offset-2 fw-bold notify-item border-top border-light py-2">Tüm Bildirimler</Link>
              </div>
            </div>
          </div>

          {/* 4. MESAJLAR - tema: Mesaj dropdown API'den */}
          <div id="message-dropdown-people" className="topbar-item">
            <div className="dropdown">
              <button type="button" className="topbar-link dropdown-toggle drop-arrow-none" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="ti ti-mail topbar-link-icon"></i>
                {messageCount > 0 && (
                  <span className="badge text-bg-danger badge-circle topbar-badge">{messageCount}</span>
                )}
              </button>
              <div className="dropdown-menu p-0 dropdown-menu-end dropdown-menu-lg">
                <div className="px-3 py-2 border-bottom">
                  <div className="row align-items-center">
                    <div className="col"><h6 className="m-0 fs-md fw-semibold">Mesajlar</h6></div>
                    <div className="col text-end">
                      <span className="badge badge-soft-success badge-label py-1">{String(messageConversations.length).padStart(2, '0')} Mesaj</span>
                    </div>
                  </div>
                </div>
                <div className="p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {messageConversations.length > 0 ? (
                    messageConversations.map((c: any) => (
                      <Link to="/messages" key={c.id} className="dropdown-item notification-item py-2 text-wrap">
                        <span className="d-flex align-items-center gap-3">
                          <span className="flex-shrink-0 position-relative">
                            {c.user?.avatar ? (
                              <img src={c.user.avatar} className="avatar-md rounded-circle" alt="" />
                            ) : (
                              <span className="avatar-md rounded-circle bg-light d-flex align-items-center justify-content-center fw-bold">
                                {((c.user?.first_name || '')[0] || '') + ((c.user?.last_name || '')[0] || '') || '?'}
                              </span>
                            )}
                            {c.unread_count > 0 && (
                              <span className="position-absolute rounded-pill bg-success notification-badge">
                                <i className="ti ti-circle-filled align-middle fs-xxs"></i>
                                <span className="visually-hidden">okunmamış</span>
                              </span>
                            )}
                          </span>
                          <span className="flex-grow-1 text-muted">
                            <span className="fw-medium text-body">{c.user?.first_name} {c.user?.last_name}</span>
                            <br />
                            <span className="fs-xs">{(c.last_message?.content || '—').slice(0, 50)}{(c.last_message?.content || '').length > 50 ? '...' : ''}</span>
                            <br />
                            <span className="fs-xs">{c.updated_at ? formatNotifTime(c.updated_at) : '—'}</span>
                          </span>
                        </span>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-3 text-muted">
                      <small>Mesaj bulunmuyor</small>
                    </div>
                  )}
                </div>
                <Link to="/messages" className="dropdown-item text-center text-reset text-decoration-underline link-offset-2 fw-bold notify-item border-top border-light py-2">Tüm Mesajlar</Link>
              </div>
            </div>
          </div>



          {/* 8. KULLANICI PROFİLİ / AKTİF ÖĞRENCİ */}
          <div id="user-dropdown-detailed" className="topbar-item nav-user">
            <div className="dropdown">
              <a className="topbar-link dropdown-toggle drop-arrow-none px-2 d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img
                  src={isPortalMode && studentDisplayName
                    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(studentDisplayName)}&background=0D8ABC&color=fff`
                    : userProfile.avatar}
                  width="32"
                  height="32"
                  className="rounded-circle me-lg-2 d-flex"
                  alt="user-image"
                />
                <div className="d-lg-flex align-items-center gap-1 d-none">
                  <span>
                    <h5 className="my-0 lh-1 pro-username">
                      {isPortalMode ? studentDisplayName : userProfile.name}
                    </h5>
                    <span className="fs-xs lh-1 text-muted">
                      {isPortalMode ? studentDisplayClass : userProfile.role_name}
                    </span>
                  </span>
                  <i className="ti ti-chevron-down align-middle ms-1"></i>
                </div>
              </a>
              <div className="dropdown-menu dropdown-menu-end">
                <div className="dropdown-header noti-title">
                  <h6 className="text-overflow m-0">
                    {isPortalMode ? studentDisplayName : 'Hoş Geldiniz!'}
                  </h6>
                  <small className="text-muted">
                    {isPortalMode
                      ? (userProfile.name ? `Veli: ${userProfile.name}` : (userProfile.campus_name || 'EduLem Portal'))
                      : userProfile.campus_name}
                  </small>
                </div>
                {/* Yalnızca portal modunda ve geçiş yapılabilecek birden fazla kardeş varsa göster */}
                {isPortalMode && uniqueSiblings.length > 1 && (
                  <>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-header noti-title py-1">
                      <small className="text-uppercase fw-bold text-muted d-flex align-items-center gap-1">
                        <i className="ti ti-users fs-xs"></i>
                        Öğrenciler / Kardeşler
                      </small>
                    </div>
                    {uniqueSiblings.map((sib: any) => {
                      const sibName = (sib.name || sib.student_name || '').trim().toLowerCase();
                      const activeNameClean = (activeStudent?.name || activeStudent?.student_name || '').trim().toLowerCase();
                      const isCurrent = (activeStudent?.id && sib.id && Number(activeStudent.id) === Number(sib.id)) ||
                        (Boolean(activeNameClean && sibName) && activeNameClean === sibName);
                      return (
                        <button
                          key={sib.id}
                          type="button"
                          className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${isCurrent ? 'bg-light fw-bold text-primary active' : ''}`}
                          onClick={() => !isCurrent && handleSwitchSibling(sib)}
                          disabled={switchingSibling}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar-xs rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-xs">
                              {(sib.name || sib.student_name || 'Ö').charAt(0)}
                            </span>
                            <div className="text-start">
                              <div className="fs-sm lh-sm">{sib.name || sib.student_name}</div>
                              {(sib.classroom?.name || sib.classroom || sib.classroom_name) && (
                                <small className="text-muted fs-xxs d-block">{sib.classroom?.name || sib.classroom || sib.classroom_name}</small>
                              )}
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="badge badge-soft-primary fs-xxs ms-2">
                              <i className="ti ti-check me-1"></i>Aktif
                            </span>
                          ) : (
                            <span className="badge badge-soft-secondary fs-xxs ms-2">
                              Geçiş Yap
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
                <div className="dropdown-divider"></div>
                <Link to="/profile" className="dropdown-item">
                  <i className="ti ti-user-circle me-1 fs-lg align-middle"></i>
                  <span className="align-middle">Profilim</span>
                </Link>
                <Link to="/profile" className="dropdown-item">
                  <i className="ti ti-settings me-1 fs-lg align-middle"></i>
                  <span className="align-middle">Ayarlar</span>
                </Link>
                <Link to="/profile" className="dropdown-item">
                  <i className="ti ti-key me-1 fs-lg align-middle"></i>
                  <span className="align-middle">Şifre Değiştir</span>
                </Link>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item text-danger fw-semibold" onClick={handleLogout}>
                  <i className="ti ti-logout me-1 fs-lg align-middle"></i>
                  <span className="align-middle">Çıkış Yap</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;