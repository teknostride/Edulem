import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getDashboardRouteByRole, getRoleLabel, normalizeRole } from '../../utils/roleRouting';
import { confirmDialog } from '../../utils/toast';
import logo from '../../assets/logo.jpeg';
import axiosClient from '../../api/axiosClient';
import { getAvatarUrl, handleAvatarError } from '../../utils/media';

const Sidebar = () => {
    // --- 1. DURUMLAR (STATE) ---
    const [isLocked, setIsLocked] = useState(true);   // Başlangıç: Kilitli
    const [isHovered, setIsHovered] = useState(false); // Mouse üzerinde mi?
    const [openMenus, setOpenMenus] = useState<string[]>([]);
    const [notificationCount, setNotificationCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [schoolName, setSchoolName] = useState<string>(() => {
        try {
            const imp = localStorage.getItem('EDULEM_IMPERSONATION');
            if (imp) {
                const impData = JSON.parse(imp);
                if (impData.tenant_name) return impData.tenant_name;
            }
            const ud = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
            if (ud.tenant_name) return ud.tenant_name;
            if (ud.institution_name) return ud.institution_name;
            if (ud.tenant?.name) return ud.tenant.name;
            if (ud.school_name) return ud.school_name;
            if (ud.is_superadmin && !ud.tenant_id) return 'EduLem SaaS Yönetimi';

            const cached = localStorage.getItem('TENANT_NAME') || localStorage.getItem('INSTITUTION_NAME');
            if (cached) return cached;

            if (typeof window !== 'undefined') {
                const host = window.location.hostname.toLowerCase();
                if (host.startsWith('demo.')) return 'Demo Okul';
                if (host.startsWith('akirfan.')) return 'Ak İrfan Okulları';
                if (host.startsWith('yonetim.')) return 'EduLem SaaS Yönetimi';
            }
        } catch {}
        return '';
    });
    const [pageVisibility, setPageVisibility] = useState<Record<string, boolean>>(() => {
        try { return JSON.parse(localStorage.getItem('PAGE_VISIBILITY') || 'null') || {}; }
        catch { return {}; }
    });

    // page_visibility backend'den çek ve localStorage'a kaydet
    const fetchPageVisibility = async (roleId?: number | string | null) => {
        try {
            const userDataStored = localStorage.getItem('USER_DATA');
            let id = roleId;
            let roleName = '';
            if (userDataStored) {
                const user = JSON.parse(userDataStored);
                if (!id) id = user.role_id || (user.role && typeof user.role === 'object' ? user.role.id : null);
                roleName = String(typeof user.role === 'string' ? user.role : (user.role_name || user.role?.name || '')).trim();
            }

            if (id) {
                const res = await axiosClient.get(`/roles/${id}`);
                const pv = res.data?.data?.page_visibility;
                if (pv && typeof pv === 'object') {
                    setPageVisibility(pv);
                    localStorage.setItem('PAGE_VISIBILITY', JSON.stringify(pv));
                    return;
                }
            }

            // Fallback: roleId yoksa veya bulunamazsa tüm rolleri çekip eşleştir
            const res = await axiosClient.get('/roles');
            const roles = res.data?.data || [];
            if (Array.isArray(roles)) {
                const matched = roles.find((r: any) => 
                    (id && Number(r.id) === Number(id)) ||
                    (roleName && (
                        r.name?.toLowerCase() === roleName.toLowerCase() || 
                        r.display_name?.toLowerCase() === roleName.toLowerCase()
                    ))
                );
                if (matched && matched.page_visibility && typeof matched.page_visibility === 'object') {
                    setPageVisibility(matched.page_visibility);
                    localStorage.setItem('PAGE_VISIBILITY', JSON.stringify(matched.page_visibility));
                }
            }
        } catch { /* sessizce geç */ }
    };

    const navigate = useNavigate();
    const location = useLocation();

    const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
    const roleRaw =
        userRole ||
        userData.role ||
        userData.role_name ||
        userData.role_id ||
        localStorage.getItem('USER_ROLE');
    const roleKey = normalizeRole(roleRaw);
    const roleNameCandidate = String(userData.role_name || userData.role_label || normalizeRole(userData.role) || '').trim();
    const roleNameLower = roleNameCandidate.toLocaleLowerCase('tr-TR');
    const dashboardRoute = getDashboardRouteByRole(roleKey);
    const isSuperAdmin = Boolean(
        userData?.is_superadmin === 1 ||
        userData?.is_superadmin === true ||
        userData?.is_super_admin === 1 ||
        userData?.is_super_admin === true ||
        roleKey === 'superadmin' ||
        roleKey === 'super_admin' ||
        roleNameLower === 'superadmin' ||
        roleNameLower === 'super_admin'
    );
    const isSaasStaff = Boolean(
        isSuperAdmin ||
        userData?.saas_role ||
        (userData?.tenant_id === null && !userData?.role_id)
    );
    const getSaasRoleLabel = (role?: string) => {
        switch (role) {
            case 'super_admin': return 'Patron (Süper Yönetici)';
            case 'technical_support': return 'Teknik Destek Uzmanı';
            case 'finance': return 'Finans & Muhasebe';
            case 'sales': return 'Satış & CRM';
            default: return 'Süper Admin';
        }
    };
    const roleLabel = isSaasStaff ? getSaasRoleLabel(userData?.saas_role) : getRoleLabel(roleKey);
    const isTeacher = !isSaasStaff && (
        roleKey === 'Öğretmen' ||
        roleKey === 'Sınıf Öğretmeni' ||
        roleKey === 'teacher' ||
        roleKey === 'Rehber Öğretmen' ||
        roleKey === 'rehber_teacher' ||
        roleKey === 'guidance_teacher' ||
        roleKey === 'Rehberlik' ||
        roleKey === 'guidance' ||
        roleKey === '5' ||
        roleKey === '6' ||
        roleNameLower.includes('öğretmen') ||
        roleNameLower === 'teacher' ||
        roleNameLower === 'guidance' ||
        roleNameLower === 'rehberlik');
    const isOwner = !isSuperAdmin && (roleKey === 'owner' || roleKey === 'Admin' || roleKey === 'Genel Müdür' || roleKey === 'Kurucu' || roleKey === 'kurucu');
    const isGuidance = !isSuperAdmin && (
        roleKey === 'Rehberlik' ||
        roleKey === 'guidance' ||
        roleKey === 'Rehber Öğretmen' ||
        roleKey === 'rehber_teacher' ||
        roleKey === 'guidance_teacher' ||
        roleKey === '6');
    const isStudentAffairs = !isSuperAdmin && (roleKey === 'Öğrenci İşleri' || roleKey === 'student_affairs');
    const isManager = !isSuperAdmin && (roleKey === 'Müdür' || roleKey === 'Müdür Yardımcısı' || roleKey === 'Kampüs Müdürü' || isOwner);
    const isPrincipalOrAssistant = !isSuperAdmin && (roleKey === 'Müdür' || roleKey === 'Müdür Yardımcısı');
    const isStudent = !isSuperAdmin && (
        roleKey === 'student' ||
        roleKey === 'Öğrenci' ||
        roleKey === 'guardian' ||
        roleKey === 'Veli' ||
        roleNameLower === 'student' ||
        roleNameLower === 'öğrenci' ||
        roleNameLower === 'guardian' ||
        roleNameLower === 'veli');

    // Sayfa görünür mü? (Eğer backend'de açıkca izin verildiyse true, verilmediyse defaultAccess)
    const pageVisible = (key: string, defaultAccess: boolean = false): boolean => {
        if (isSaasStaff) return false;
        // Kurucu (Owner) her zaman tüm menüleri görür
        if (isOwner) return true;

        if (pageVisibility && key in pageVisibility) {
            return pageVisibility[key] === true;
        }
        return defaultAccess;
    };

    // Menü açık mı?
    const isExpanded = isLocked || isHovered;

    // Menu toggle
    const toggleMenu = (menuId: string) => {
        setOpenMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const handleLogout = async () => {
        const ok = await confirmDialog({
            title: 'Çıkış Yap',
            text: 'Çıkış yapmak istediğinizden emin misiniz?',
            confirmText: 'Çıkış Yap',
            cancelText: 'İptal',
            icon: 'question',
        });
        if (!ok) return;

        localStorage.removeItem('ACCESS_TOKEN');
        localStorage.removeItem('USER_DATA');
        localStorage.removeItem('PAGE_VISIBILITY');
        localStorage.removeItem('USER_ROLE');
        localStorage.removeItem('theme');
        localStorage.removeItem('monochrome');
        navigate('/login');
    };

    // Kilit Aç/Kapa
    const toggleLock = () => {
        setIsLocked(!isLocked);
        if (isLocked) setIsHovered(false);
    };

    // Mouse Giriş/Çıkış
    const handleMouseEnter = () => { if (!isLocked) setIsHovered(true); };
    const handleMouseLeave = () => { if (!isLocked) setIsHovered(false); };

    // HTML Etiketini Güncelle
    useEffect(() => {
        const html = document.documentElement;
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        if (!isDesktop) {
            return;
        }
        if (isExpanded) {
            html.setAttribute('data-sidenav-size', 'default');
        } else {
            html.setAttribute('data-sidenav-size', 'condensed');
        }
    }, [isExpanded]);

    // Badge sayılarını Header'dan event ile al (duplike API çağrısı önlendi)
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.type === 'notification') setNotificationCount(detail.count ?? 0);
            if (detail?.type === 'message') setMessageCount(detail.count ?? 0);
        };
        window.addEventListener('badgeCounts', handler);
        return () => window.removeEventListener('badgeCounts', handler);
    }, []);

    useEffect(() => {
        const storedRole = localStorage.getItem('USER_ROLE');
        if (storedRole) {
            setUserRole(storedRole);
        } else {
            const userDataStored = localStorage.getItem('USER_DATA');
            if (userDataStored) {
                try {
                    const user = JSON.parse(userDataStored);
                    const rawRole = user.role;
                    const resolvedRole =
                        typeof rawRole === 'string' ? rawRole :
                        (rawRole && typeof rawRole === 'object' ? (rawRole.name || rawRole.display_name || '') : '');
                    if (resolvedRole || user.role_name) setUserRole(resolvedRole || user.role_name);
                } catch (e) {
                    console.error("User data parse error", e);
                }
            }
        }

        // Kullanıcının rolüne ait page_visibility'yi backend'den çek
        fetchPageVisibility();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadSchoolName = async () => {
            try {
                const ud = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
                if (ud.is_superadmin && !ud.tenant_id) {
                    if (isMounted) setSchoolName('EduLem SaaS Yönetimi');
                    return;
                }

                // 1. /tenant/profile dene
                try {
                    const res = await axiosClient.get('/tenant/profile');
                    const name = res.data?.data?.name;
                    if (name && isMounted) {
                        setSchoolName(name);
                        localStorage.setItem('TENANT_NAME', name);
                        return;
                    }
                } catch {
                    // /tenant/profile kısıtlı olabilir, /profile dene
                }

                // 2. /profile dene
                const profRes = await axiosClient.get('/profile');
                const tName = profRes.data?.data?.tenant_name || profRes.data?.data?.institution_name;
                if (tName && isMounted) {
                    setSchoolName(tName);
                    localStorage.setItem('TENANT_NAME', tName);
                    try {
                        const cur = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
                        cur.tenant_name = tName;
                        localStorage.setItem('USER_DATA', JSON.stringify(cur));
                    } catch {}
                }
            } catch {}
        };

        loadSchoolName();

        const handleStorage = () => {
            try {
                const ud = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
                const name = ud.tenant_name || ud.institution_name || ud.tenant?.name || localStorage.getItem('TENANT_NAME');
                if (name && isMounted) setSchoolName(name);
            } catch {}
        };

        const handleUserDataUpdated = (e: any) => {
            if (e.detail) {
                const name = e.detail.tenant_name || e.detail.institution_name || e.detail.tenant?.name;
                if (name && isMounted) {
                    setSchoolName(name);
                    localStorage.setItem('TENANT_NAME', name);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('userDataUpdated', handleUserDataUpdated);
        return () => {
            isMounted = false;
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('userDataUpdated', handleUserDataUpdated);
        };
    }, []);

    useEffect(() => {
        const navLinks = document.querySelectorAll<HTMLAnchorElement>('#sidenav-menu a.side-nav-link[href]');

        // Alt menü linkleri olan ve prefix çakışmasına yol açabilecek yollar.
        // Bu listede olan bir link, yalnızca TAM eşleşme ile aktif sayılır.
        const exactMatchPaths = [
            '/super-admin',
            '/super-admin/tenants',
            '/super-admin/modules',
            '/super-admin/finance',
            '/super-admin/expenses',
            '/super-admin/staff',
            '/counseling',
            '/students',
            '/users',
            '/omr/exams',
            '/academic/homework',
            '/academic/exams',
            '/lessons',
        ];

        navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) {
                return;
            }

            let isActive: boolean;
            if (exactMatchPaths.includes(href)) {
                // Tam eşleşme — alt yollar bu linki aktif yapmamalı
                isActive = location.pathname === href;
            } else {
                // Normal davranış: exact veya alt yol
                isActive = location.pathname === href || location.pathname.startsWith(`${href}/`);
            }

            link.classList.toggle('active-route', isActive);
        });
    }, [location.pathname, openMenus, userRole]);

    // Sidebar animasyonları için CSS ekle
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
      .sidenav-menu {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .side-nav-item {
        transition: all 0.2s ease !important;
      }
      
      .side-nav-link {
        transition: all 0.2s ease !important;
        position: relative;
        overflow: hidden;
      }
      
      .side-nav-link::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        transition: left 0.5s ease;
      }
      
      .side-nav-link:hover::before {
        left: 100%;
      }
      
      .side-nav-link:hover {
        transform: translateX(3px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .side-nav-title {
        animation: fadeInSlide 0.4s ease-out;
      }
      
      .sub-menu {
        animation: slideDown 0.3s ease-out;
      }
      
      .menu-icon {
        transition: all 0.2s ease;
      }
      
      .side-nav-link:hover .menu-icon {
        transform: scale(1.1) rotate(5deg);
        color: var(--bs-primary) !important;
      }
      
      .menu-arrow {
        transition: transform 0.3s ease;
      }
      
      .side-nav-link:not(.collapsed) .menu-arrow {
        transform: rotate(90deg);
      }
      
      @keyframes fadeInSlide {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          max-height: 500px;
          transform: translateY(0);
        }
      }
      
      .sidenav-user {
        transition: all 0.3s ease;
      }
      
      .logo {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .logo:hover {
        transform: scale(1.02);
      }
      
      .logout-link {
        color: #ff6b6b !important;
        background: transparent !important;
      }

      .logout-link .menu-icon,
      .logout-link .menu-text {
        color: #ff6b6b !important;
      }

      .logout-link:hover {
        background-color: rgba(255, 0, 0, 0.1) !important;
      }
      
      .badge {
        transition: all 0.2s ease;
      }
      
      .side-nav-link:hover .badge {
        transform: scale(1.1);
      }

      .side-nav-link.active-route {
        background-color: rgba(255, 255, 255, 0.2) !important;
        border-left: 4px solid var(--bs-primary);
        color: #ffffff !important;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
      }

      .side-nav-link.active-route .menu-icon,
      .side-nav-link.active-route .menu-text {
        color: #ffffff !important;
        font-weight: 700;
      }
    `;

        if (!document.head.querySelector('style[data-sidebar-animations]')) {
            style.setAttribute('data-sidebar-animations', 'true');
            document.head.appendChild(style);
        }

        return () => {
            const existingStyle = document.head.querySelector('style[data-sidebar-animations]');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    return (
        <div
            className="sidenav-menu"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* --- LOGO VE OKUL BİLGİSİ ALANI --- */}
            <div style={{
                position: 'relative',
                borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                paddingBottom: isExpanded ? (schoolName ? '10px' : '4px') : '0',
                marginBottom: '4px',
                transition: 'all 0.3s ease'
            }}>
                <Link to={dashboardRoute} className="logo" style={{
                    height: '62px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isExpanded ? 'flex-start' : 'center',
                    paddingLeft: isExpanded ? '20px' : '0',
                    paddingRight: isExpanded ? '46px' : '0',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease'
                }}>
                    <img
                        src={logo}
                        alt="EduLem"
                        style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    />
                    {isExpanded ? (
                        <span style={{ marginLeft: 10, fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.06em', color: '#f1f5f9' }}>
                            EduLem
                        </span>
                    ) : null}
                </Link>

                {/* --- KİLİT BUTONU (Yuvarlak) --- */}
                <button
                    className="button-on-hover"
                    onClick={toggleLock}
                    title={isLocked ? "Kilidi Kaldır" : "Sabitle"}
                    style={{
                        opacity: isExpanded ? 1 : 0,
                        pointerEvents: isExpanded ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease',
                        display: 'block',
                        position: 'absolute',
                        right: '15px',
                        top: '18px',
                        zIndex: 1050,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--bs-primary)',
                        cursor: 'pointer'
                    }}
                >
                    <i className={`ti ${isLocked ? 'ti-circle-dot' : 'ti-circle'} align-middle fs-4`}></i>
                </button>

                {/* --- EDULEM LOGOSUNUN ALTINDA OKUL ADI --- */}
                {isExpanded && schoolName ? (
                    <div style={{
                        padding: '0 16px 2px 20px',
                        marginTop: '-4px',
                        animation: 'fadeInSlide 0.3s ease-out'
                    }}>
                        <div 
                            title={schoolName}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                color: '#38bdf8',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                letterSpacing: '0.01em',
                                lineHeight: 1.3
                            }}
                        >
                            <i className="ti ti-school" style={{ fontSize: '14px', flexShrink: 0, opacity: 0.95 }}></i>
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {schoolName}
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Mobil Kapatma Butonu */}
            <button className="button-close-offcanvas">
                <i className="ti ti-menu-4 align-middle"></i>
            </button>

            {/* --- MENÜ İÇERİĞİ --- */}
            <div className="scrollbar" data-simplebar style={{ paddingTop: '10px' }}>

                {/* Profil Kartı */}
                <div id="user-profile-settings" className="sidenav-user" style={{ backgroundImage: 'url(/assets/images/user-bg-pattern.svg)' }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <Link to="/profile" className="link-reset">
                                <img
                                    src={getAvatarUrl(userData.avatar, userData.name || 'Kullanıcı')}
                                    onError={(e) => handleAvatarError(e, userData.name || 'Kullanıcı')}
                                    alt="user-image"
                                    className="rounded-circle mb-2 avatar-md"
                                    style={{ objectFit: 'cover' }}
                                />
                                <span className="sidenav-user-name fw-bold">{userData.name || 'Kullanıcı'}</span>
                                <span className="fs-12 fw-semibold text-white-50">{roleLabel}</span>
                            </Link>
                        </div>
                        <div>
                            <a className="dropdown-toggle drop-arrow-none link-reset sidenav-user-set-icon" href="#" data-bs-toggle="dropdown" aria-expanded="false">
                                <i className="ti ti-settings fs-24 align-middle ms-1"></i>
                            </a>
                            <div className="dropdown-menu">
                                <div className="dropdown-header noti-title"><h6 className="text-overflow m-0">Hoş Geldiniz!</h6></div>
                                <Link to="/profile" className="dropdown-item"><i className="ti ti-user-circle me-1 fs-lg align-middle"></i> <span className="align-middle">Profil</span></Link>
                                <div className="dropdown-divider"></div>
                                <a href="#!" className="dropdown-item text-danger fw-semibold" onClick={handleLogout}><i className="ti ti-logout me-1 fs-lg align-middle"></i> <span className="align-middle">Çıkış Yap</span></a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linkler */}
                <div id="sidenav-menu">
                    <ul className="side-nav">
                        {isSaasStaff && (
                            <>
                                <li className="side-nav-title">SaaS Platform Yönetimi</li>
                                <li className="side-nav-item">
                                    <Link to="/super-admin" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-dashboard"></i></span>
                                        <span className="menu-text">SaaS Genel Bakış</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/super-admin/tenants" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-building"></i></span>
                                        <span className="menu-text">Kurumlar & Okul CRM</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/super-admin/tenants/create" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-plus"></i></span>
                                        <span className="menu-text">Yeni Kurum Ekle</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/super-admin/modules" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-apps"></i></span>
                                        <span className="menu-text">Modül Kataloğu (*lem)</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/super-admin/finance" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-cash"></i></span>
                                        <span className="menu-text">SaaS Gelir & Tahsilatlar</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/super-admin/expenses" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-receipt-2"></i></span>
                                        <span className="menu-text">Şirket Giderleri & Kâr</span>
                                    </Link>
                                </li>
                                {isSuperAdmin && (
                                    <li className="side-nav-item">
                                        <Link to="/super-admin/staff" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-users-group"></i></span>
                                            <span className="menu-text">Ekip & Yetkili Elemanlar</span>
                                        </Link>
                                    </li>
                                )}
                            </>
                        )}

                        {isStudent && (
                            <>
                                <li className="side-nav-item">
                                    <Link to={dashboardRoute} className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-layout-dashboard"></i></span>
                                        <span className="menu-text">Anasayfa</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/portal/schedule" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-calendar-week"></i></span>
                                        <span className="menu-text">Ders Programım</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/portal/assessment" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-chart-bar"></i></span>
                                        <span className="menu-text">Ölçme Değerlendirme</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/portal/homework" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-book"></i></span>
                                        <span className="menu-text">Ödevlerim</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/portal/meal-menus" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-tools-kitchen-2"></i></span>
                                        <span className="menu-text">Yemek Menüsü</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/portal/surveys" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-forms"></i></span>
                                        <span className="menu-text">Anketler</span>
                                    </Link>
                                </li>
                                <li className="side-nav-item">
                                    <Link to="/portal/announcements" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-bell"></i></span>
                                        <span className="menu-text">Duyurular</span>
                                    </Link>
                                </li>
                            </>
                        )}

                        {isOwner && (
                            <li className="side-nav-item">
                                <Link to={dashboardRoute} className="side-nav-link">
                                    <span className="menu-icon"><i className="ti ti-layout-dashboard"></i></span>
                                    <span className="menu-text">Anasayfa</span>
                                </Link>
                            </li>
                        )}

                        {isStudentAffairs && (
                            <li className="side-nav-item">
                                <Link to={dashboardRoute} className="side-nav-link">
                                    <span className="menu-icon"><i className="ti ti-layout-dashboard"></i></span>
                                    <span className="menu-text">Anasayfa</span>
                                </Link>
                            </li>
                        )}

                        {isManager && !isOwner && !isStudentAffairs && (
                            <li className="side-nav-item">
                                <Link to={dashboardRoute} className="side-nav-link">
                                    <span className="menu-icon"><i className="ti ti-layout-dashboard"></i></span>
                                    <span className="menu-text">Anasayfa</span>
                                </Link>
                            </li>
                        )}

                        {isTeacher && !isStudent && !isOwner && !isStudentAffairs && !isManager && (
                            <li className="side-nav-item">
                                <Link to={dashboardRoute} className="side-nav-link">
                                    <span className="menu-icon"><i className="ti ti-layout-dashboard"></i></span>
                                    <span className="menu-text">Anasayfa</span>
                                </Link>
                            </li>
                        )}


                        {/* --- YÖNETİM --- */}
                        {!isStudent && (pageVisible('students', isOwner || isManager || isStudentAffairs) || pageVisible('users', isOwner || isManager || isStudentAffairs)) && (
                            <>
                                <li className="side-nav-title mt-2">Yönetim</li>

                                {pageVisible('students', isOwner || isManager || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <a
                                            onClick={() => toggleMenu('students')}
                                            className={`side-nav-link ${openMenus.includes('students') ? '' : 'collapsed'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="menu-icon"><i className="ti ti-users-group"></i></span>
                                            <span className="menu-text">Öğrenci Yönetimi</span>
                                            <span className="menu-arrow"></span>
                                        </a>
                                        <div style={{
                                            display: openMenus.includes('students') ? 'block' : 'none',
                                            paddingLeft: '20px'
                                        }}>
                                            <ul className="sub-menu">
                                                <li className="side-nav-item">
                                                    <Link to="/students" className="side-nav-link">
                                                        <span className="menu-text">Öğrenci Listesi</span>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </li>
                                )}

                                {pageVisible('users', isOwner || isManager || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <a
                                            onClick={() => toggleMenu('users')}
                                            className={`side-nav-link ${openMenus.includes('users') ? '' : 'collapsed'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="menu-icon"><i className="ti ti-user-check"></i></span>
                                            <span className="menu-text">Kullanıcı Yönetimi</span>
                                            <span className="menu-arrow"></span>
                                        </a>
                                        <div style={{
                                            display: openMenus.includes('users') ? 'block' : 'none',
                                            paddingLeft: '20px'
                                        }}>
                                            <ul className="sub-menu">
                                                <li className="side-nav-item">
                                                    <Link to="/users" className="side-nav-link">
                                                        <span className="menu-text">Kullanıcı Listesi</span>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </li>
                                )}

                            </>
                        )}

                        {/* --- AKADEMİK --- */}
                        {!isStudent && (pageVisible('academic', isOwner || isManager || isTeacher || isStudentAffairs) || (isTeacher && pageVisible('teacher_students', true)) || (isTeacher && !isGuidance && pageVisible('teacher_measurement', true)) || pageVisible('homework', isOwner || isManager || isTeacher) || pageVisible('tutoring', isOwner || isManager || isTeacher || isStudentAffairs) || (isTeacher && pageVisible('teacher_meetings', true)) || pageVisible('meetings', isOwner || isManager || isStudentAffairs) || pageVisible('counseling', !isStudentAffairs && (isOwner || isManager || isGuidance)) || pageVisible('meal_menus', isOwner || isManager || isGuidance || isTeacher || isStudentAffairs) || pageVisible('duty_schedules', isOwner || isManager || isGuidance || isTeacher || isStudentAffairs) || pageVisible('scholarship_exams', isOwner || isManager || isStudentAffairs) || pageVisible('measurement', isOwner || isManager || isStudentAffairs || isGuidance)) && (
                            <>
                                <li className="side-nav-title mt-2">Akademik</li>

                                {isTeacher && pageVisible('teacher_students', true) && (
                                    <li className="side-nav-item">
                                        <Link to="/teacher/students" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-users"></i></span>
                                            <span className="menu-text">Öğrenciler</span>
                                        </Link>
                                    </li>
                                )}

                                {isTeacher ? (
                                    pageVisible('schedules', true) && (
                                        <li className="side-nav-item">
                                            <Link to="/schedules" className="side-nav-link">
                                                <span className="menu-icon"><i className="ti ti-calendar-week"></i></span>
                                                <span className="menu-text">Ders Programım</span>
                                            </Link>
                                        </li>
                                    )
                                ) : (
                                    (pageVisible('schedules', isOwner || isManager) || pageVisible('academic', isOwner || isManager)) && (
                                        <li className="side-nav-item">
                                            <a
                                                onClick={() => toggleMenu('academic')}
                                                className={`side-nav-link ${openMenus.includes('academic') ? '' : 'collapsed'}`}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <span className="menu-icon"><i className="ti ti-book"></i></span>
                                                <span className="menu-text">Dersler</span>
                                                <span className="menu-arrow"></span>
                                            </a>
                                            <div style={{
                                                display: openMenus.includes('academic') ? 'block' : 'none',
                                                paddingLeft: '20px'
                                            }}>
                                                <ul className="sub-menu">
                                                    <li className="side-nav-item">
                                                        <Link to="/lessons" className="side-nav-link">
                                                            <span className="menu-text">Ders Listesi</span>
                                                        </Link>
                                                    </li>
                                                    <li className="side-nav-item">
                                                        <Link to="/schedules" className="side-nav-link">
                                                            <span className="menu-text">Ders Programı</span>
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </li>
                                    )
                                )}

                                {isTeacher && !isGuidance && pageVisible('teacher_measurement', true) && (
                                    <li className="side-nav-item">
                                        <Link to="/teacher/measurement" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-chart-bar"></i></span>
                                            <span className="menu-text">Ölçme Değerlendirme</span>
                                        </Link>
                                    </li>
                                )}

                                {isTeacher ? (
                                    pageVisible('attendances', true) && (
                                        <li className="side-nav-item">
                                            <Link to="/attendances/create" className="side-nav-link">
                                                <span className="menu-icon"><i className="ti ti-clipboard-check"></i></span>
                                                <span className="menu-text">Yoklama Al</span>
                                            </Link>
                                        </li>
                                    )
                                ) : (
                                    pageVisible('attendances', isOwner || isManager) && (
                                        <li className="side-nav-item">
                                            <a
                                                onClick={() => toggleMenu('attendances')}
                                                className={`side-nav-link ${openMenus.includes('attendances') ? '' : 'collapsed'}`}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <span className="menu-icon"><i className="ti ti-clipboard-check"></i></span>
                                                <span className="menu-text">Yoklama Takibi</span>
                                                <span className="menu-arrow"></span>
                                            </a>
                                            <div style={{
                                                display: openMenus.includes('attendances') ? 'block' : 'none',
                                                paddingLeft: '20px'
                                            }}>
                                                <ul className="sub-menu">
                                                    <li className="side-nav-item">
                                                        <Link to="/attendances" className="side-nav-link">
                                                            <span className="menu-text">Yoklama Takibi</span>
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </div>
                                        </li>
                                    )
                                )}

                                {pageVisible('homework', !isStudentAffairs && (isOwner || isManager || isTeacher)) && (
                                    <li className="side-nav-item">
                                        <Link to="/academic/homework" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-book"></i></span>
                                            <span className="menu-text">Ödev Yönetimi</span>
                                        </Link>
                                    </li>
                                )}

                                {pageVisible('tutoring', isOwner || isManager || isTeacher || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/academic/tutoring" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-calendar-event"></i></span>
                                            <span className="menu-text">Etüt ve Özel Ders</span>
                                        </Link>
                                    </li>
                                )}

                                {isTeacher && pageVisible('teacher_meetings', true) && (
                                    <li className="side-nav-item">
                                        <Link to="/teacher/meetings" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-messages"></i></span>
                                            <span className="menu-text">Görüşmelerim</span>
                                        </Link>
                                    </li>
                                )}

                                {pageVisible('meetings', isOwner || isManager || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/meetings" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-messages"></i></span>
                                            <span className="menu-text">Görüşmeler</span>
                                        </Link>
                                    </li>
                                )}

                                {pageVisible('counseling', !isStudentAffairs && (isOwner || isManager || isGuidance)) && (
                                    <li className="side-nav-item">
                                        <a
                                            onClick={() => toggleMenu('counseling')}
                                            className={`side-nav-link ${openMenus.includes('counseling') ? '' : 'collapsed'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="menu-icon"><i className="ti ti-heart-handshake"></i></span>
                                            <span className="menu-text">Rehberlik Servisi</span>
                                            <span className="menu-arrow"></span>
                                        </a>
                                        <div style={{
                                            display: openMenus.includes('counseling') ? 'block' : 'none',
                                            paddingLeft: '20px'
                                        }}>
                                            <ul className="sub-menu">
                                                <li className="side-nav-item">
                                                    <Link to="/counseling" className="side-nav-link">
                                                        <span className="menu-text">Danışanlar</span>
                                                    </Link>
                                                </li>
                                                {(isOwner || isManager) && (
                                                    <li className="side-nav-item">
                                                        <Link to="/counseling/stats" className="side-nav-link">
                                                            <span className="menu-text">İstatistikler</span>
                                                        </Link>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </li>
                                )}

                                {pageVisible('meal_menus', isOwner || isManager || isGuidance || isTeacher || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/operations/meal-menus" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-tools-kitchen-2"></i></span>
                                            <span className="menu-text">Yemek Menüsü</span>
                                        </Link>
                                    </li>
                                )}
                                {pageVisible('duty_schedules', isOwner || isManager || isGuidance || isTeacher || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/operations/duty-schedules" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-shield"></i></span>
                                            <span className="menu-text">Nöbet Çizelgesi</span>
                                        </Link>
                                    </li>
                                )}

                                {pageVisible('scholarship_exams', isOwner || isManager || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/scholarship/exams" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-certificate"></i></span>
                                            <span className="menu-text">Bursluluk Sınavları</span>
                                        </Link>
                                    </li>
                                )}

                                {pageVisible('measurement', isOwner || isManager || isStudentAffairs || isGuidance) && (
                                    <li className="side-nav-item">
                                        <a
                                            onClick={() => toggleMenu('measurement')}
                                            className={`side-nav-link ${openMenus.includes('measurement') ? '' : 'collapsed'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="menu-icon"><i className="ti ti-chart-bar"></i></span>
                                            <span className="menu-text">Ölçme Değerlendirme</span>
                                            <span className="menu-arrow"></span>
                                        </a>
                                        <div style={{
                                            display: openMenus.includes('measurement') ? 'block' : 'none',
                                            paddingLeft: '20px'
                                        }}>
                                            <ul className="sub-menu">
                                                <li className="side-nav-item">
                                                    <Link to="/omr/exams" className="side-nav-link">
                                                        <span className="menu-text">Sınavlar</span>
                                                    </Link>
                                                </li>
                                                <li className="side-nav-item">
                                                    <Link to="/omr/trial-exams" className="side-nav-link">
                                                        <span className="menu-text">Deneme</span>
                                                    </Link>
                                                </li>
                                                <li className="side-nav-item">
                                                    <Link to="/omr/courses" className="side-nav-link">
                                                        <span className="menu-text">Dersler & Konular</span>
                                                    </Link>
                                                </li>
                                                <li className="side-nav-item">
                                                    <Link to="/omr/templates" className="side-nav-link">
                                                        <span className="menu-text">Optik</span>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </li>
                                )}
                            </>
                        )}

                        {/* --- İLETİŞİM --- */}
                        {!isStudent && (isOwner || isManager || isTeacher || isStudentAffairs || pageVisible('notifications', false) || pageVisible('messages', false) || pageVisible('surveys', false)) && (
                            <>
                                <li className="side-nav-title mt-2">İletişim</li>

                                {pageVisible('notifications', isTeacher || isOwner || isManager || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/notifications" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-bell"></i></span>
                                            <span className="menu-text">Duyurular</span>
                                            {notificationCount > 0 && <span className="badge bg-primary rounded-pill ms-auto">{notificationCount}</span>}
                                        </Link>
                                    </li>
                                )}

                                {pageVisible('messages', isOwner || isManager || isTeacher || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/messages" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-mail"></i></span>
                                            <span className="menu-text">Mesajlar</span>
                                            {messageCount > 0 && <span className="badge bg-danger rounded-pill ms-auto">{messageCount}</span>}
                                        </Link>
                                    </li>
                                )}
                                {pageVisible('surveys', isTeacher || isOwner || isManager) && (
                                    <li className="side-nav-item">
                                        <Link to="/surveys" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-forms"></i></span>
                                            <span className="menu-text">Anketler</span>
                                        </Link>
                                    </li>
                                )}
                            </>
                        )}



                        {/* --- KURUMSAL --- */}
                        {!isStudent && (pageVisible('institution', isOwner || isPrincipalOrAssistant || isStudentAffairs) || pageVisible('time_slots', isOwner || isPrincipalOrAssistant || isStudentAffairs) || pageVisible('sms_center', isOwner || isPrincipalOrAssistant || isStudentAffairs)) && (
                            <>
                                <li className="side-nav-title mt-2">Kurumsal</li>

                                {pageVisible('institution', isOwner || isPrincipalOrAssistant || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <a
                                            onClick={() => toggleMenu('institution')}
                                            className={`side-nav-link ${openMenus.includes('institution') ? '' : 'collapsed'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="menu-icon"><i className="ti ti-building-arch"></i></span>
                                            <span className="menu-text">Kurum Yapısı</span>
                                            <span className="menu-arrow"></span>
                                        </a>
                                        <div style={{
                                            display: openMenus.includes('institution') ? 'block' : 'none',
                                            paddingLeft: '20px'
                                        }}>
                                            <ul className="sub-menu">
                                                {!isStudentAffairs && !isPrincipalOrAssistant && isOwner && (
                                                    <li className="side-nav-item">
                                                        <Link to="/settings/institution" className="side-nav-link">
                                                            <span className="menu-text">Kurum Bilgileri</span>
                                                        </Link>
                                                    </li>
                                                )}
                                                {isOwner && (
                                                    <>
                                                        <li className="side-nav-item">
                                                            <Link to="/settings/campuses" className="side-nav-link">
                                                                <span className="menu-text">Kampüsler</span>
                                                            </Link>
                                                        </li>
                                                        <li className="side-nav-item">
                                                            <Link to="/settings/education-levels" className="side-nav-link">
                                                                <span className="menu-text">Eğitim Kademeleri</span>
                                                            </Link>
                                                        </li>
                                                    </>
                                                )}
                                                {(isOwner || isPrincipalOrAssistant || isStudentAffairs) && (
                                                    <>
                                                        <li className="side-nav-item">
                                                            <Link to="/academic/classrooms" className="side-nav-link">
                                                                <span className="menu-text">Sınıflar</span>
                                                            </Link>
                                                        </li>
                                                        <li className="side-nav-item">
                                                            <Link to="/settings/seasons" className="side-nav-link">
                                                                <span className="menu-text">Sezonlar</span>
                                                            </Link>
                                                        </li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>
                                    </li>
                                )}

                                {pageVisible('time_slots', isOwner || isPrincipalOrAssistant || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <Link to="/time-slots" className="side-nav-link">
                                            <span className="menu-icon"><i className="ti ti-clock-hour-4"></i></span>
                                            <span className="menu-text">Kurum Saatleri</span>
                                        </Link>
                                    </li>
                                )}

                                {pageVisible('sms_center', isOwner || isPrincipalOrAssistant || isStudentAffairs) && (
                                    <li className="side-nav-item">
                                        <a
                                            onClick={() => toggleMenu('sms_center')}
                                            className={`side-nav-link ${openMenus.includes('sms_center') ? '' : 'collapsed'}`}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="menu-icon"><i className="ti ti-mail"></i></span>
                                            <span className="menu-text">SMS Merkezi</span>
                                            <span className="menu-arrow"></span>
                                        </a>
                                        <div style={{
                                            display: openMenus.includes('sms_center') ? 'block' : 'none',
                                            paddingLeft: '20px'
                                        }}>
                                            <ul className="sub-menu">
                                                <li className="side-nav-item">
                                                    <Link to="/sms/templates" className="side-nav-link">
                                                        <span className="menu-text">SMS Şablonları</span>
                                                    </Link>
                                                </li>
                                                <li className="side-nav-item">
                                                    <Link to="/sms/bulk-send" className="side-nav-link">
                                                        <span className="menu-text">Toplu SMS Gönder</span>
                                                    </Link>
                                                </li>
                                                <li className="side-nav-item">
                                                    <Link to="/sms/history" className="side-nav-link">
                                                        <span className="menu-text">SMS Geçmişi</span>
                                                    </Link>
                                                </li>
                                                <li className="side-nav-item">
                                                    <Link to="/sms/api-settings" className="side-nav-link">
                                                        <span className="menu-text">API Ayarları</span>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </li>
                                )}
                            </>
                        )}

                        {/* --- YETKİLENDİRME --- */}
                        {!isStudent && pageVisible('permissions_roles', isOwner) && (
                            <>
                                <li className="side-nav-title mt-2">Yetkilendirme</li>
                                <li className="side-nav-item">
                                    <Link to="/permissions/roles" className="side-nav-link">
                                        <span className="menu-icon"><i className="ti ti-shield-lock"></i></span>
                                        <span className="menu-text">Roller</span>
                                    </Link>
                                </li>
                            </>
                        )}

                        <li className="side-nav-item">
                            <a href="#!" className="side-nav-link logout-link" onClick={handleLogout}>
                                <span className="menu-icon"><i className="ti ti-logout"></i></span>
                                <span className="menu-text">Çıkış Yap</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
