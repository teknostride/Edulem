/**
 * Classlem - Sınıf Yönetimi & Öğrenci Davranış Puanlama Sistemi
 * Tek Dosya Mimarisi (app.js)
 */

// ==========================================
// 1. VERİ MODELİ VE VARSAYILAN DEĞERLER (SEED)
// ==========================================

const STORAGE_KEY = 'classlem_data_v1';

const DEFAULT_SKILLS = [
  // Pozitif Beceriler
  { id: 'sk_pos_1', title: 'Derse Katılım', points: 1, icon: '🙋', type: 'positive' },
  { id: 'sk_pos_2', title: 'Yardımseverlik', points: 1, icon: '🤝', type: 'positive' },
  { id: 'sk_pos_3', title: 'Görev Bilinci', points: 1, icon: '⭐', type: 'positive' },
  { id: 'sk_pos_4', title: 'Takım Çalışması', points: 2, icon: '👥', type: 'positive' },
  { id: 'sk_pos_5', title: 'Ödevini Yaptı', points: 1, icon: '📚', type: 'positive' },
  { id: 'sk_pos_6', title: 'Yaratıcı Fikir', points: 2, icon: '💡', type: 'positive' },
  { id: 'sk_pos_7', title: 'Çok Çalışkan', points: 2, icon: '🏆', type: 'positive' },
  { id: 'sk_pos_8', title: 'Nezaket & Saygı', points: 1, icon: '❤️', type: 'positive' },

  // Geliştirilmeli (İhtiyaç Duyulan)
  { id: 'sk_neg_1', title: 'Derse Geç Kaldı', points: -1, icon: '⏰', type: 'needs-work' },
  { id: 'sk_neg_2', title: 'Ödevini Unuttu', points: -1, icon: '📝', type: 'needs-work' },
  { id: 'sk_neg_3', title: 'Söz Almadan Konuştu', points: -1, icon: '🤫', type: 'needs-work' },
  { id: 'sk_neg_4', title: 'Dikkati Dağıldı', points: -1, icon: '⚠️', type: 'needs-work' },
  { id: 'sk_neg_5', title: 'Hazırlıksız Geldi', points: -1, icon: '🎒', type: 'needs-work' },
];

const DEFAULT_STUDENTS_SAMPLE = [
  'Ali Kaya', 'Zeynep Demir', 'Caner Şahin', 'Elif Yıldız',
  'Burak Çelik', 'Selin Öztürk', 'Emre Arslan', 'Deniz Koç',
  'Ece Aksoy', 'Kerem Yılmaz', 'Melis Güler', 'Mert Aydın'
];

function generateDefaultData() {
  const defaultClassId = 'cls_demo_1';
  const defaultClass = {
    id: defaultClassId,
    name: '4-B Yıldızlar Sınıfı',
    grade: '4. Sınıf',
    icon: '⭐',
    createdAt: new Date().toISOString()
  };

  const students = DEFAULT_STUDENTS_SAMPLE.map((name, index) => ({
    id: 'std_' + (index + 1),
    classId: defaultClassId,
    name: name,
    points: Math.floor(Math.random() * 5) + 1,
    avatarSeed: index + 1
  }));

  const defaultGroups = [
    {
      id: 'grp_1',
      classId: defaultClassId,
      name: 'Masa 1 (Aslanlar)',
      studentIds: [students[0].id, students[1].id, students[2].id, students[3].id]
    },
    {
      id: 'grp_2',
      classId: defaultClassId,
      name: 'Masa 2 (Kartallar)',
      studentIds: [students[4].id, students[5].id, students[6].id, students[7].id]
    }
  ];

  return {
    classes: [defaultClass],
    students: students,
    skills: DEFAULT_SKILLS,
    groups: defaultGroups,
    history: [
      {
        id: 'hist_1',
        classId: defaultClassId,
        studentIds: [students[0].id],
        studentNames: students[0].name,
        skillTitle: 'Derse Katılım',
        skillIcon: '🙋',
        points: 1,
        type: 'positive',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'hist_2',
        classId: defaultClassId,
        studentIds: [students[1].id],
        studentNames: students[1].name,
        skillTitle: 'Yardımseverlik',
        skillIcon: '🤝',
        points: 1,
        type: 'positive',
        timestamp: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    settings: {
      soundEnabled: true,
      noiseMeter: {
        autoPenalty: true,
        threshold: 80,
        delaySeconds: 2,
        sensitivity: 1.2,
        mode: 'microphone'
      }
    }
  };
}

// Global Durum Nesnesi
let appState = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.classes && parsed.students) {
        if (!parsed.settings) parsed.settings = {};
        if (!parsed.settings.noiseMeter) {
          parsed.settings.noiseMeter = {
            autoPenalty: true,
            threshold: 80,
            delaySeconds: 2,
            sensitivity: 1.2,
            mode: 'microphone'
          };
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('State yükleme hatası:', e);
  }
  const initial = generateDefaultData();
  saveState(initial);
  return initial;
}

function saveState(stateToSave = appState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (e) {
    console.error('State kaydetme hatası:', e);
  }
}

// ==========================================
// 1.0. KULLANICI OTURUMU VE KİMLİK DOĞRULAMA (AUTH)
// ==========================================
let currentUser = null;

function isExecutiveUser(user) {
  if (!user) return false;
  if (user.can_view_reports === true || user.is_superadmin || user.can_reset_points) return true;
  const role = (user.role || '').toLowerCase();
  const execKeywords = [
    'kurum sahibi', 'sahibi', 'kurucu', 'genel müdür', 'genel mudur',
    'kampüs müdürü', 'kampus muduru', 'müdür', 'mudur', 'müdür yardımcısı',
    'mudur yardimcisi', 'rehberlik', 'öğrenci işleri', 'ogrenci isleri',
    'yönetici', 'yonetici', 'admin'
  ];
  return execKeywords.some(k => role.includes(k)) || !!user.is_admin;
}

function getCurrentUser() {
  if (currentUser) {
    if (isExecutiveUser(currentUser)) {
      currentUser.can_view_reports = true;
      currentUser.can_view_all_classes = true;
      currentUser.can_reset_points = true;
    }
    return currentUser;
  }
  try {
    const stored = localStorage.getItem('classlem_user');
    if (stored) {
      currentUser = JSON.parse(stored);
      if (isExecutiveUser(currentUser)) {
        currentUser.can_view_reports = true;
        currentUser.can_view_all_classes = true;
        currentUser.can_reset_points = true;
        localStorage.setItem('classlem_user', JSON.stringify(currentUser));
      }
      return currentUser;
    }
  } catch (e) {}
  return null;
}

function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    if (isExecutiveUser(user)) {
      user.can_view_reports = true;
      user.can_view_all_classes = true;
      user.can_reset_points = true;
    }
    localStorage.setItem('classlem_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('classlem_user');
  }
  updateUserNavProfile();
}

function updateUserNavProfile() {
  const user = getCurrentUser();
  const navProfile = document.getElementById('userNavProfile');
  const nameEl = document.getElementById('navUserName');
  const roleEl = document.getElementById('navUserRole');
  const avatarEl = document.getElementById('navUserAvatar');
  const repNavBtn = document.getElementById('btnExecutiveReport');
  const repDashBtn = document.getElementById('btnExecutiveReportDashboard');
  const repClassroomBtn = document.getElementById('btnExecutiveReportClassroom');
  const repBanner = document.getElementById('executiveBannerCard');

  const canViewReports = isExecutiveUser(user);

  if (repNavBtn) repNavBtn.style.display = canViewReports ? 'inline-flex' : 'none';
  if (repDashBtn) repDashBtn.style.display = canViewReports ? 'inline-flex' : 'none';
  if (repClassroomBtn) repClassroomBtn.style.display = canViewReports ? 'inline-flex' : 'none';
  if (repBanner) repBanner.style.display = canViewReports ? 'flex' : 'none';

  if (user && navProfile) {
    navProfile.style.display = 'flex';
    if (nameEl) nameEl.textContent = user.name || 'Öğretmen';
    if (roleEl) roleEl.textContent = user.role || 'Öğretmen';
    if (avatarEl) {
      avatarEl.textContent = canViewReports ? '👑' : '👨‍🏫';
    }
  } else if (navProfile) {
    navProfile.style.display = 'none';
  }
}

function showLoginView() {
  const viewLogin = document.getElementById('viewLogin');
  const viewDashboard = document.getElementById('viewDashboard');
  const viewClassroom = document.getElementById('viewClassroom');
  const navProfile = document.getElementById('userNavProfile');
  const edulemBadge = document.getElementById('edulemStatusBadge');
  const syncBtn = document.getElementById('btnSyncEdulem');
  const navClassesBtn = document.getElementById('navClassesBtn');
  const repNavBtn = document.getElementById('btnExecutiveReport');
  const repDashBtn = document.getElementById('btnExecutiveReportDashboard');
  const repClassroomBtn = document.getElementById('btnExecutiveReportClassroom');
  const repBanner = document.getElementById('executiveBannerCard');

  if (viewLogin) viewLogin.style.display = 'flex';
  if (viewDashboard) viewDashboard.style.display = 'none';
  if (viewClassroom) viewClassroom.style.display = 'none';
  if (navProfile) navProfile.style.display = 'none';
  if (edulemBadge) edulemBadge.style.display = 'none';
  if (syncBtn) syncBtn.style.display = 'none';
  if (navClassesBtn) navClassesBtn.style.display = 'none';
  if (repNavBtn) repNavBtn.style.display = 'none';
  if (repDashBtn) repDashBtn.style.display = 'none';
  if (repClassroomBtn) repClassroomBtn.style.display = 'none';
  if (repBanner) repBanner.style.display = 'none';

  const alertBox = document.getElementById('loginAlertBox');
  if (alertBox) alertBox.style.display = 'none';
  const tcInput = document.getElementById('inputLoginTc');
  if (tcInput) {
    setTimeout(() => tcInput.focus(), 150);
  }
}

function showAppViews() {
  const viewLogin = document.getElementById('viewLogin');
  const edulemBadge = document.getElementById('edulemStatusBadge');
  const syncBtn = document.getElementById('btnSyncEdulem');
  const navClassesBtn = document.getElementById('navClassesBtn');

  if (viewLogin) viewLogin.style.display = 'none';
  if (edulemBadge) edulemBadge.style.display = 'flex';
  if (syncBtn) syncBtn.style.display = 'inline-flex';
  if (navClassesBtn) navClassesBtn.style.display = 'inline-flex';

  updateUserNavProfile();
}

async function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const tcInput = document.getElementById('inputLoginTc');
  const pwInput = document.getElementById('inputLoginPassword');
  const submitBtn = document.getElementById('btnLoginSubmit');
  const btnText = document.getElementById('loginBtnText');
  const alertBox = document.getElementById('loginAlertBox');
  const alertMsg = document.getElementById('loginAlertMsg');

  const tc = (tcInput ? tcInput.value : '').replace(/\D/g, '').trim();
  const password = pwInput ? pwInput.value : '';

  if (tc.length !== 11) {
    if (alertBox && alertMsg) {
      alertMsg.textContent = 'Lütfen 11 haneli geçerli bir T.C. Kimlik Numarası giriniz.';
      alertBox.style.display = 'flex';
    }
    tcInput?.focus();
    return;
  }

  if (!password) {
    if (alertBox && alertMsg) {
      alertMsg.textContent = 'Lütfen Edulem şifrenizi giriniz.';
      alertBox.style.display = 'flex';
    }
    pwInput?.focus();
    return;
  }

  if (alertBox) alertBox.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Giriş yapılıyor...';

  try {
    const res = await fetch(`${API_BASE_URL}auth.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'login',
        tc_no: tc,
        password: password
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol ediniz.');
    }

    // Başarılı Giriş
    setCurrentUser(data.user);
    if (pwInput) pwInput.value = '';
    showAppViews();
    showDashboardView();
    showToast(`Hoş geldiniz, ${data.user.name}!`, 'positive');

    // Kullanıcının sınıflarını çek
    await fetchEdulemData(null, false);

  } catch (err) {
    if (alertBox && alertMsg) {
      alertMsg.textContent = err.message || 'Giriş başarısız oldu.';
      alertBox.style.display = 'flex';
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Giriş Yap';
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE_URL}auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'logout' })
    });
  } catch (e) {}

  setCurrentUser(null);
  appState.classes = [];
  appState.students = [];
  saveState();

  showLoginView();
  showToast('Oturum kapatıldı.', 'info');
}

// ==========================================
// 1.1. EDULEM VERİTABANI KÖPRÜSÜ (API İLETİŞİMİ)
// ==========================================

const API_BASE_URL = 'api/';
let currentSelectedSeason = null;

async function fetchEdulemData(seasonId = null, showFeedback = false) {
  const user = getCurrentUser();
  if (!user) {
    showLoginView();
    return;
  }

  const syncBtn = document.getElementById('btnSyncEdulem');
  const syncIcon = document.getElementById('syncIcon');
  const badgeEl = document.getElementById('edulemStatusBadge');
  const badgeText = document.getElementById('edulemStatusText');

  if (syncIcon) syncIcon.classList.add('spin');

  try {
    let url = `${API_BASE_URL}get_data.php?teacher_id=${encodeURIComponent(user.id)}`;
    if (seasonId) {
      url += `&season_id=${encodeURIComponent(seasonId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
      cache: 'no-store'
    });

    if (response.status === 401) {
      setCurrentUser(null);
      showLoginView();
      showToast('Oturum süresi doldu. Lütfen tekrar giriş yapınız.', 'negative');
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (${response.statusText})`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Veri çekilemedi.');
    }

    // Durum rozetini güncelle
    if (badgeEl && badgeText) {
      badgeEl.classList.remove('offline');
      badgeText.textContent = 'Edulem Bağlı';
      badgeEl.title = `Edulem Canlı Veritabanı: ${data.totalClasses} Sınıf, ${data.totalStudents} Öğrenci`;
    }

    // Dönem bilgisini güncelle
    currentSelectedSeason = data.selectedSeasonId;
    const seasonBadge = document.getElementById('currentSeasonBadge');
    if (seasonBadge && data.activeSeason) {
      seasonBadge.textContent = data.activeSeason.name;
    }

    // Dönem seçim kutusunu doldur
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect && data.seasons && data.seasons.length > 0) {
      seasonSelect.innerHTML = '';
      data.seasons.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} ${s.is_active ? '(Aktif)' : ''}`;
        if (String(s.id) === String(data.selectedSeasonId)) {
          opt.selected = true;
        }
        seasonSelect.appendChild(opt);
      });
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = 'Tüm Sınıflar';
      if (data.selectedSeasonId === 'all') allOpt.selected = true;
      seasonSelect.appendChild(allOpt);
    }

    // App State güncelle
    appState.classes = data.classes || [];
    appState.students = data.students || [];
    appState.groups = data.groups || [];
    appState.history = data.history || [];
    if (data.skills && data.skills.length > 0) {
      appState.skills = data.skills;
    }

    // LocalStorage'a önbelleğe kaydet
    saveState();

    // Görünümü güncelle
    if (currentClassId) {
      const clsStillExists = appState.classes.some(c => String(c.id) === String(currentClassId));
      if (clsStillExists) {
        renderClassroom();
      } else {
        showDashboardView();
      }
    } else {
      renderDashboard();
    }

    if (showFeedback) {
      showToast(`Edulem veritabanından ${data.totalClasses} sınıf ve ${data.totalStudents} öğrenci başarıyla güncellendi!`, 'positive');
    }

  } catch (err) {
    console.error('Edulem API Hatası:', err);
    if (badgeEl && badgeText) {
      badgeEl.classList.add('offline');
      badgeText.textContent = 'Çevrimdışı (Önbellek)';
      badgeEl.title = `Edulem Bağlantı Hatası: ${err.message}`;
    }
    if (showFeedback) {
      showToast(`Edulem bağlantı hatası: ${err.message}`, 'negative');
    }
  } finally {
    if (syncIcon) syncIcon.classList.remove('spin');
  }
}

async function saveActionToServer(payload) {
  try {
    const res = await fetch(`${API_BASE_URL}save_action.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    return result;
  } catch (e) {
    console.warn('Sunucuya kaydetme uyarısı (işlem çevrimdışı önbellekte tutuldu):', e);
  }
}

// Aktif Çalışma Değişkenleri
let currentClassId = null;
let currentTab = 'students'; // 'students' | 'groups'
let selectedStudentIds = new Set();
let isMultiSelectMode = false;
let currentAwardTarget = null; // { type: 'single' | 'multi' | 'all' | 'group', ids: [], name: '', avatarSvg: '' }
let currentSkillFilter = 'positive'; // 'positive' | 'needs-work'

// ==========================================
// 2. SEVİMLİ CANAVAR AVATAR JENERATÖRÜ (SVG)
// ==========================================
// ClassDojo tarzı neşeli, renkli, tek ve çok gözlü sevimli canavarlar

const MONSTER_COLORS = [
  { bg: '#38bdf8', belly: '#bae6fd', accent: '#0284c7' }, // Gökyüzü Mavisi
  { bg: '#34d399', belly: '#a7f3d0', accent: '#059669' }, // Zümrüt Yeşili
  { bg: '#a78bfa', belly: '#ddd6fe', accent: '#7c3aed' }, // Lavanta Moru
  { bg: '#f472b6', belly: '#fbcfe8', accent: '#db2777' }, // Pembe
  { bg: '#fbbf24', belly: '#fef08a', accent: '#d97706' }, // Güneş Sarısı
  { bg: '#fb923c', belly: '#fed7aa', accent: '#ea580c' }, // Turuncu
  { bg: '#2dd4bf', belly: '#99f6e4', accent: '#0d9488' }, // Turkuaz
  { bg: '#f87171', belly: '#fecaca', accent: '#dc2626' }, // Mercan
  { bg: '#818cf8', belly: '#c7d2fe', accent: '#4f46e5' }, // İndigo
  { bg: '#a3e635', belly: '#d9f99d', accent: '#65a30d' }, // Fıstık Yeşili
];

function generateMonsterSvg(seedInput, size = 108) {
  const seed = typeof seedInput === 'number' ? seedInput : Math.abs(hashString(String(seedInput)));
  const color = MONSTER_COLORS[seed % MONSTER_COLORS.length];
  const bodyShapeIndex = seed % 5;
  const eyeStyle = (seed >> 1) % 4;
  const mouthStyle = (seed >> 2) % 4;
  const hornStyle = (seed >> 3) % 4;

  let horns = '';
  if (hornStyle === 1) {
    // Küçük sevimli boynuzlar
    horns = `
      <polygon points="28,24 35,6 42,20" fill="${color.accent}" />
      <polygon points="72,24 65,6 58,20" fill="${color.accent}" />
    `;
  } else if (hornStyle === 2) {
    // Üstte eğlenceli tek anten
    horns = `
      <path d="M50,22 Q50,6 64,8" stroke="${color.accent}" stroke-width="4" stroke-linecap="round" fill="none"/>
      <circle cx="64" cy="8" r="6" fill="#fbbf24" />
    `;
  } else if (hornStyle === 3) {
    // Sevimli kulaklar
    horns = `
      <circle cx="22" cy="28" r="10" fill="${color.accent}" />
      <circle cx="22" cy="28" r="5" fill="#fbcfe8" />
      <circle cx="78" cy="28" r="10" fill="${color.accent}" />
      <circle cx="78" cy="28" r="5" fill="#fbcfe8" />
    `;
  }

  let body = '';
  if (bodyShapeIndex === 0) {
    // Tombul Yuvarlak
    body = `
      <ellipse cx="50" cy="55" rx="38" ry="36" fill="${color.bg}" />
      <ellipse cx="50" cy="62" rx="22" ry="18" fill="${color.belly}" />
    `;
  } else if (bodyShapeIndex === 1) {
    // Armut / Koni Formu
    body = `
      <path d="M25,84 C15,80 16,52 30,34 C40,20 60,20 70,34 C84,52 85,80 75,84 C62,90 38,90 25,84 Z" fill="${color.bg}" />
      <ellipse cx="50" cy="64" rx="20" ry="18" fill="${color.belly}" />
    `;
  } else if (bodyShapeIndex === 2) {
    // Uzun Yuvarlatılmış Dikdörtgen
    body = `
      <rect x="18" y="24" width="64" height="64" rx="30" fill="${color.bg}" />
      <rect x="28" y="44" width="44" height="36" rx="18" fill="${color.belly}" />
    `;
  } else if (bodyShapeIndex === 3) {
    // Geniş ve Bodur
    body = `
      <path d="M15,62 C15,35 30,22 50,22 C70,22 85,35 85,62 C85,84 72,88 50,88 C28,88 15,84 15,62 Z" fill="${color.bg}" />
      <ellipse cx="50" cy="66" rx="24" ry="16" fill="${color.belly}" />
    `;
  } else {
    // Damla Formu
    body = `
      <ellipse cx="50" cy="54" rx="36" ry="34" fill="${color.bg}" />
      <polygon points="50,14 42,26 58,26" fill="${color.bg}" />
      <ellipse cx="50" cy="62" rx="20" ry="17" fill="${color.belly}" />
    `;
  }

  // Minik Ayaklar
  const feet = `
    <ellipse cx="36" cy="88" rx="8" ry="5" fill="${color.accent}" />
    <ellipse cx="64" cy="88" rx="8" ry="5" fill="${color.accent}" />
  `;

  // Gözler
  let eyes = '';
  if (eyeStyle === 0) {
    // Büyük Şirin Tek Göz (Cyclops)
    eyes = `
      <circle cx="50" cy="44" r="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <circle cx="50" cy="44" r="9" fill="${color.accent}" />
      <circle cx="50" cy="44" r="5" fill="#0f172a" />
      <circle cx="47" cy="41" r="3" fill="#ffffff" />
    `;
  } else if (eyeStyle === 1) {
    // Standart İki Büyük Sevimli Göz
    eyes = `
      <circle cx="36" cy="44" r="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <circle cx="64" cy="44" r="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <circle cx="37" cy="44" r="6" fill="#0f172a" />
      <circle cx="63" cy="44" r="6" fill="#0f172a" />
      <circle cx="35" cy="42" r="2.5" fill="#ffffff" />
      <circle cx="61" cy="42" r="2.5" fill="#ffffff" />
    `;
  } else if (eyeStyle === 2) {
    // Üç Gözlü Uzaylı Canavar!
    eyes = `
      <circle cx="30" cy="44" r="8" fill="#ffffff" />
      <circle cx="50" cy="38" r="9" fill="#ffffff" />
      <circle cx="70" cy="44" r="8" fill="#ffffff" />
      <circle cx="30" cy="44" r="4" fill="#0f172a" />
      <circle cx="50" cy="38" r="4.5" fill="#0f172a" />
      <circle cx="70" cy="44" r="4" fill="#0f172a" />
      <circle cx="28" cy="42" r="1.5" fill="#ffffff" />
      <circle cx="48" cy="36" r="2" fill="#ffffff" />
      <circle cx="68" cy="42" r="1.5" fill="#ffffff" />
    `;
  } else {
    // Neşeli Göz Kırpan Canavar
    eyes = `
      <circle cx="36" cy="44" r="11" fill="#ffffff" />
      <circle cx="37" cy="44" r="6" fill="#0f172a" />
      <circle cx="35" cy="42" r="2.5" fill="#ffffff" />
      <path d="M57,45 Q64,40 71,45" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none" />
    `;
  }

  // Yanak Allıkları
  const blush = `
    <circle cx="24" cy="54" r="5" fill="#f43f5e" opacity="0.3" />
    <circle cx="76" cy="54" r="5" fill="#f43f5e" opacity="0.3" />
  `;

  // Ağız
  let mouth = '';
  if (mouthStyle === 0) {
    // Büyük Neşeli Gülümseme & Dil
    mouth = `
      <path d="M36,58 Q50,75 64,58 Z" fill="#0f172a" />
      <path d="M42,66 Q50,74 58,66" fill="#f43f5e" />
    `;
  } else if (mouthStyle === 1) {
    // Sevimli Tek Dişli Gülüş
    mouth = `
      <path d="M38,58 Q50,72 62,58" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
      <polygon points="46,59 54,59 50,65" fill="#ffffff" stroke="#0f172a" stroke-width="1" />
    `;
  } else if (mouthStyle === 2) {
    // Minik Tatlı 'w' Ağzı
    mouth = `
      <path d="M40,60 Q45,66 50,61 Q55,66 60,60" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
    `;
  } else {
    // Geniş Kahkaha
    mouth = `
      <path d="M35,57 Q50,78 65,57 Q50,55 35,57 Z" fill="#b91c1c" stroke="#0f172a" stroke-width="2" />
      <path d="M42,68 Q50,75 58,68" fill="#f43f5e" />
    `;
  }

  return `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${horns}
      ${feet}
      ${body}
      ${blush}
      ${eyes}
      ${mouth}
    </svg>
  `;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// ==========================================
// 3. SES EFEKTLERİ SENTEZLEYİCİSİ (Web Audio)
// ==========================================

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = appState.settings ? appState.settings.soundEnabled : true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPositiveChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // C5, E5, G5, C6 neşeli zil dizilimi (Arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  playNeedsWorkSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Yumuşak, incitmeyen iki tonlu uyarı sesi (F4 -> D4)
    const notes = [349.23, 293.66];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.001, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.35);
    });
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Kutlama/Rastgele Seçim Fanfarı
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.5);
    });
  }

  playTimerAlarm() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + i * 0.25);

      gain.gain.setValueAtTime(0.001, now + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.25 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.25);
      osc.stop(now + i * 0.25 + 0.22);
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (!appState.settings) appState.settings = {};
    appState.settings.soundEnabled = this.enabled;
    saveState();
    return this.enabled;
  }
}

const soundManager = new SoundEffects();

// ==========================================
// 4. KONFETİ PARÇACIK MOTORU (Canvas Confetti)
// ==========================================

class ConfettiLauncher {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animating = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  launch(count = 65) {
    if (!this.canvas || !this.ctx) return;
    this.resize();

    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 300,
        y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 150,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.render();
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // Yerçekimi
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.015;

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.render());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

const confetti = new ConfettiLauncher('confetti-canvas');

// ==========================================
// 4b. SINIF AKVARYUMu - BALIK HAREKET MOTORU
// ==========================================
// Her öğrencinin avatarı canvas'ta balık olarak yüzer.
// Balık tipleri hashString ile deterministik belirlenir:
//   speedster  → Sabit yüksek hız, çok çevik
//   lazy       → Yavaş, sallanan (sinüs) hareket
//   dasher     → Zaman zaman ani hız patlaması, sonra dinlenme

class AquariumEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.fishes = [];
    this.animId = null;
    this.running = false;
    this._resizeBound = () => this._resize();
    if (this.canvas) {
      window.addEventListener('resize', this._resizeBound);
      this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));
    }
  }

  /** Balıkları öğrencilerden oluştur ve animasyonu başlat */
  init(students) {
    if (!this.canvas || !this.ctx) return;
    this._resize();
    this._spawnBubbles();
    this._buildFishes(students);
    if (!this.running) {
      this.running = true;
      this._loop();
    }
  }

  /** Animasyonu durdur (sayfa değişiminde çağrılır) */
  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
  }

  /** Balıkları yeniden oluştur (öğrenci listesi değişince) */
  refresh(students) {
    this._buildFishes(students);
  }

  // ── PRIVATE ─────────────────────────────────────────────────────────────────

  _resize() {
    if (!this.canvas) return;
    // CSS ile belirlenen gerçek piksel boyutunu al
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width  || this.canvas.offsetWidth  || this.canvas.parentElement?.offsetWidth  || 600;
    const h = rect.height || this.canvas.offsetHeight || 180;
    if (w > 0) this.canvas.width  = w;
    if (h > 0) this.canvas.height = h;
  }

  /** 3 balık tipi → deterministik olarak öğrenciden belirlenir */
  _fishType(student) {
    const h = Math.abs(hashString(String(student.avatarSeed || student.name)));
    const t = h % 3; // 0=speedster, 1=lazy, 2=dasher
    return t === 0 ? 'speedster' : t === 1 ? 'lazy' : 'dasher';
  }

  /** SVG → Image (offline canvas render için base64 data URL) */
  _svgToImg(svgStr) {
    return new Promise((resolve) => {
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const img  = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  async _buildFishes(students) {
    if (!this.canvas) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const FISH_SIZE = 44; // piksel - canvas'taki boyut
    const MARGIN = 24;

    // Önceki balıkları temizle
    this.fishes = [];

    const validStudents = (students || []).slice(0, 30); // Max 30 balık

    for (const student of validStudents) {
      const type = this._fishType(student);
      const svgStr = generateFishSvg(student.avatarSeed || student.name, FISH_SIZE);
      const img = await this._svgToImg(svgStr);

      // Başlangıç konumu
      const x = MARGIN + Math.random() * (W - MARGIN * 2 - FISH_SIZE);
      const y = MARGIN + Math.random() * (H - MARGIN * 2 - FISH_SIZE - 22);

      // Tip'e göre temel parametreler
      let baseSpeed, wobble;
      if (type === 'speedster') {
        baseSpeed = 1.8 + Math.random() * 1.0; // 1.8–2.8 px/frame
        wobble    = 0; // Düz yüzer
      } else if (type === 'lazy') {
        baseSpeed = 0.4 + Math.random() * 0.4; // 0.4–0.8 px/frame
        wobble    = 1; // Sinüs dalgası hareketi
      } else { // dasher
        baseSpeed = 0.6 + Math.random() * 0.4; // Dinlenme hızı
        wobble    = 0;
      }

      const angle = Math.random() * Math.PI * 2;

      this.fishes.push({
        student,
        type,
        img,
        size: FISH_SIZE,
        x, y,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        baseSpeed,
        // Lazy sinüs için
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp:   wobble ? (1.2 + Math.random() * 0.8) : 0,
        // Dasher burst için
        dashCooldown: 60 + Math.floor(Math.random() * 120),
        dashTimer:    0,
        isDashing:    false,
        dashDuration: 0,
        // Görsel
        facingRight: Math.cos(angle) > 0,
        // Tooltip fade
        showLabel:   false,
        labelAlpha:  0,
      });
    }
  }

  _loop() {
    if (!this.running) return;
    this._update();
    this._draw();
    this.animId = requestAnimationFrame(() => this._loop());
  }

  _update() {
    if (!this.canvas) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const BOTTOM_MARGIN = 26; // kum bölgesi
    const TOP_MARGIN    = 8;

    for (const f of this.fishes) {
      // ── DASHER patlaması ──────────────────────────────────────
      if (f.type === 'dasher') {
        if (f.isDashing) {
          f.dashDuration--;
          if (f.dashDuration <= 0) {
            // Dinlenmeye geç
            f.isDashing = false;
            const norm = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
            f.vx = (f.vx / norm) * f.baseSpeed;
            f.vy = (f.vy / norm) * f.baseSpeed;
            f.dashCooldown = 80 + Math.floor(Math.random() * 140);
          }
        } else {
          f.dashTimer++;
          if (f.dashTimer >= f.dashCooldown) {
            // Patlama başlat
            f.isDashing = true;
            f.dashTimer = 0;
            f.dashDuration = 18 + Math.floor(Math.random() * 12); // ~0.3–0.5s
            const burstSpeed = 4.5 + Math.random() * 2.0;
            const norm = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
            f.vx = (f.vx / norm) * burstSpeed;
            f.vy = (f.vy / norm) * burstSpeed;
          }
        }
      }

      // ── LAZY sinüs dalgası ───────────────────────────────────
      if (f.type === 'lazy' && f.wobbleAmp > 0) {
        f.wobblePhase += 0.045;
        const perpX = -f.vy;
        const perpY =  f.vx;
        const pLen  = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        const wave  = Math.sin(f.wobblePhase) * f.wobbleAmp;
        f.x += (perpX / pLen) * wave * 0.35;
        f.y += (perpY / pLen) * wave * 0.35;
      }

      // ── Normal hareket ───────────────────────────────────────
      f.x += f.vx;
      f.y += f.vy;

      // ── Sınır yansıması ──────────────────────────────────────
      let bounced = false;
      if (f.x < 0) {
        f.x = 0; f.vx = Math.abs(f.vx);
        bounced = true;
      } else if (f.x + f.size > W) {
        f.x = W - f.size; f.vx = -Math.abs(f.vx);
        bounced = true;
      }
      if (f.y < TOP_MARGIN) {
        f.y = TOP_MARGIN; f.vy = Math.abs(f.vy);
        bounced = true;
      } else if (f.y + f.size > H - BOTTOM_MARGIN) {
        f.y = H - BOTTOM_MARGIN - f.size; f.vy = -Math.abs(f.vy);
        bounced = true;
      }

      // Yön takibi
      if (Math.abs(f.vx) > 0.05) f.facingRight = f.vx > 0;

      // Label solma
      if (f.showLabel) {
        f.labelAlpha = Math.min(1, f.labelAlpha + 0.08);
      } else {
        f.labelAlpha = Math.max(0, f.labelAlpha - 0.06);
      }
    }
  }

  _draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;

    // Arka plan
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   '#0c1445');
    grad.addColorStop(0.5, '#0a2a5e');
    grad.addColorStop(1,   '#0a4a7a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Hafif ışık saçılması
    const spotGrad = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, H * 0.7);
    spotGrad.addColorStop(0,   'rgba(147,210,253,0.07)');
    spotGrad.addColorStop(1,   'rgba(147,210,253,0)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, W, H);

    // Dip kumu
    const sandGrad = ctx.createLinearGradient(0, H - 26, 0, H);
    sandGrad.addColorStop(0, 'rgba(194,154,93,0.0)');
    sandGrad.addColorStop(1, 'rgba(150,100,48,0.55)');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, H - 26, W, 26);

    // Balıkları çiz
    for (const f of this.fishes) {
      ctx.save();

      // Dasher patlamasında parlama
      if (f.type === 'dasher' && f.isDashing) {
        ctx.shadowColor  = '#c4b5fd';
        ctx.shadowBlur   = 14;
      } else if (f.type === 'speedster') {
        ctx.shadowColor  = '#fde68a';
        ctx.shadowBlur   = 6;
      } else {
        ctx.shadowBlur   = 0;
      }

      // Flip (yüz yönü)
      const cx = f.x + f.size / 2;
      const cy = f.y + f.size / 2;
      if (!f.facingRight) {
        ctx.translate(cx * 2, 0);
        ctx.scale(-1, 1);
      }

      if (f.img) {
        ctx.drawImage(f.img, f.x, f.y, f.size, f.size);
      } else {
        // Fallback daire
        ctx.beginPath();
        ctx.arc(cx, cy, f.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
      }

      ctx.restore();

      // İsim etiketi (hover sonrası gösterilir)
      if (f.labelAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = f.labelAlpha;
        const label = f.student.name;
        ctx.font = 'bold 10px Inter, sans-serif';
        const tw  = ctx.measureText(label).width;
        const lx  = f.x + f.size / 2 - tw / 2 - 4;
        const ly  = f.y - 16;
        // Arka plan yuvarlak
        ctx.fillStyle   = 'rgba(15,23,42,0.8)';
        ctx.beginPath();
        ctx.roundRect(lx, ly - 10, tw + 8, 14, 6);
        ctx.fill();
        ctx.fillStyle = '#e0f2fe';
        ctx.fillText(label, lx + 4, ly);
        ctx.restore();
      }
    }
  }

  _onCanvasClick(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (this.canvas.width  / rect.width);
    const my   = (e.clientY - rect.top)  * (this.canvas.height / rect.height);
    for (const f of this.fishes) {
      if (mx >= f.x && mx <= f.x + f.size && my >= f.y && my <= f.y + f.size) {
        f.showLabel = !f.showLabel;
        // Tıklanan balığı biraz ittir
        f.vx += (Math.random() - 0.5) * 3;
        f.vy += (Math.random() - 0.5) * 3;
      }
    }
  }

  /** CSS kabarcık elementleri ekle */
  _spawnBubbles() {
    const container = document.getElementById('aquariumBubbles');
    if (!container) return;
    container.innerHTML = '';
    const count = 10;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      const size     = 4 + Math.random() * 8;
      const duration = 4 + Math.random() * 6;
      const delay    = Math.random() * 6;
      b.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${5 + Math.random() * 90}%;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      container.appendChild(b);
    }
  }
}

// ── Balık SVG üreteci (canavar avatarını balık kılığında çizer) ──────────────
// Canavar avatarının üzerine balık kuyruk ve yüzgeçleri ekler
function generateFishSvg(seedInput, size = 44) {
  const seed  = typeof seedInput === 'number' ? seedInput : Math.abs(hashString(String(seedInput)));
  const color = MONSTER_COLORS[seed % MONSTER_COLORS.length];
  const type  = seed % 3; // 0=speedster 1=lazy 2=dasher

  // Tip'e göre yüzgeç rengi ve kuyruk şekli
  const finColor  = type === 0 ? '#fbbf24' : type === 1 ? '#34d399' : '#a78bfa';
  const glowColor = type === 0 ? '#fde68a' : type === 1 ? '#6ee7b7' : '#c4b5fd';

  // Canavar avatarını küçük alıp üzerine balık öğeleri ekleriz
  // SVG viewBox: 0 0 100 100
  const monsterInner = (() => {
    // Sadece iç gövde (horns + body + eyes + mouth) — feet yok
    const bodyShapeIndex = seed % 5;
    let body = '';
    if (bodyShapeIndex === 0) {
      body = `<ellipse cx="50" cy="55" rx="34" ry="32" fill="${color.bg}"/>
              <ellipse cx="50" cy="62" rx="20" ry="16" fill="${color.belly}"/>`;
    } else if (bodyShapeIndex === 1) {
      body = `<path d="M28,80 C18,76 18,50 32,34 C42,22 58,22 68,34 C82,50 82,76 72,80 C60,88 40,88 28,80 Z" fill="${color.bg}"/>
              <ellipse cx="50" cy="62" rx="18" ry="15" fill="${color.belly}"/>`;
    } else if (bodyShapeIndex === 2) {
      body = `<rect x="22" y="26" width="56" height="56" rx="26" fill="${color.bg}"/>
              <rect x="30" y="44" width="40" height="30" rx="14" fill="${color.belly}"/>`;
    } else if (bodyShapeIndex === 3) {
      body = `<path d="M18,60 C18,36 32,24 50,24 C68,24 82,36 82,60 C82,80 70,86 50,86 C30,86 18,80 18,60 Z" fill="${color.bg}"/>
              <ellipse cx="50" cy="66" rx="22" ry="14" fill="${color.belly}"/>`;
    } else {
      body = `<ellipse cx="50" cy="54" rx="32" ry="30" fill="${color.bg}"/>
              <ellipse cx="50" cy="62" rx="18" ry="14" fill="${color.belly}"/>`;
    }
    // Gözler (basit)
    const eyeStyle = (seed >> 1) % 4;
    let eyes = '';
    if (eyeStyle === 0) {
      eyes = `<circle cx="40" cy="44" r="7" fill="white"/>
              <circle cx="41" cy="44" r="3.5" fill="#1e293b"/>
              <circle cx="60" cy="44" r="7" fill="white"/>
              <circle cx="61" cy="44" r="3.5" fill="#1e293b"/>`;
    } else if (eyeStyle === 1) {
      eyes = `<circle cx="40" cy="44" r="7" fill="white"/>
              <circle cx="40" cy="44" r="3.5" fill="#1e293b"/>
              <circle cx="60" cy="44" r="7" fill="white"/>
              <circle cx="60" cy="44" r="3.5" fill="#1e293b"/>`;
    } else if (eyeStyle === 2) {
      // Tek büyük göz
      eyes = `<circle cx="50" cy="44" r="9" fill="white"/>
              <circle cx="51" cy="44" r="5" fill="#1e293b"/>`;
    } else {
      eyes = `<ellipse cx="40" cy="44" rx="8" ry="6" fill="white"/>
              <circle cx="41" cy="44" r="3" fill="#1e293b"/>
              <ellipse cx="60" cy="44" rx="8" ry="6" fill="white"/>
              <circle cx="61" cy="44" r="3" fill="#1e293b"/>`;
    }
    // Ağız
    const mouthStyle = (seed >> 2) % 4;
    let mouth = '';
    if (mouthStyle === 0) mouth = `<path d="M42,66 Q50,73 58,66" stroke="${color.accent}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    else if (mouthStyle === 1) mouth = `<path d="M42,68 Q50,62 58,68" stroke="${color.accent}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    else if (mouthStyle === 2) mouth = `<circle cx="50" cy="67" r="5" fill="${color.accent}"/>`;
    else mouth = `<path d="M44,66 L56,66" stroke="${color.accent}" stroke-width="3" stroke-linecap="round"/>`;

    return body + eyes + mouth;
  })();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 100">
    <defs>
      <filter id="glow_${seed}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Kuyruk yüzgeci (sol taraf - sağa bakan balık) -->
    <polygon points="0,30 22,50 0,70"
      fill="${finColor}" opacity="0.85"/>

    <!-- Üst yüzgeç -->
    <ellipse cx="60" cy="15" rx="18" ry="9"
      fill="${finColor}" opacity="0.75" transform="rotate(-15,60,15)"/>

    <!-- Alt yüzgeç -->
    <ellipse cx="55" cy="85" rx="12" ry="6"
      fill="${finColor}" opacity="0.65" transform="rotate(10,55,85)"/>

    <!-- Canavar gövdesi (sağ tarafa kaydırılmış) -->
    <g transform="translate(18,0) scale(0.84)">
      ${monsterInner}
    </g>

    <!-- Parlama halkası (tipe göre) -->
    <ellipse cx="68" cy="50" rx="44" ry="40"
      fill="none" stroke="${glowColor}" stroke-width="1.5" opacity="0.25"
      filter="url(#glow_${seed})"/>
  </svg>`;
}

// Global akvaryum motoru instance'ı
const aquariumEngine = new AquariumEngine('aquariumCanvas');

// ==========================================
// 5. TOAST VE GERİ BİLDİRİM BİLDİRİMLERİ
// ==========================================


function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'positive' ? 'pos' : type === 'negative' ? 'neg' : ''}`;
  
  let iconHtml = '✨';
  if (type === 'positive') iconHtml = '🎉';
  if (type === 'negative') iconHtml = '⚠️';

  toast.innerHTML = `<span>${iconHtml}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// 5.1. OTOMATİK GÜRÜLTÜ ÖLÇER YÖNETİCİSİ (NOISE METER)
// ==========================================

class NoiseMeterManager {
  constructor() {
    this.active = false;
    this.isPaused = false;
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.source = null;
    this.dataArray = null;
    this.currentLevel = 0;
    this.targetLevel = 0;
    this.animFrameId = null;
    this.simInterval = null;

    this.highNoiseStart = null;
    this.cooldownUntil = 0;
    this.isApplyingPenalty = false;
  }

  get config() {
    if (!appState.settings) appState.settings = {};
    if (!appState.settings.noiseMeter) {
      appState.settings.noiseMeter = {
        autoPenalty: true,
        threshold: 80,
        delaySeconds: 2,
        sensitivity: 1.2,
        mode: 'microphone'
      };
    }
    return appState.settings.noiseMeter;
  }

  start() {
    this.active = true;
    this.isPaused = false;
    this.highNoiseStart = null;
    this.updateControlsUI();

    if (this.config.mode === 'simulation') {
      this.startSimulation();
    } else {
      this.startMicrophone();
    }
  }

  stop() {
    this.active = false;
    this.stopMicrophone();
    this.stopSimulation();
    this.highNoiseStart = null;
    this.currentLevel = 0;
    this.updateUI(0);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.highNoiseStart = null;
    this.updateControlsUI();
    if (this.isPaused) {
      showToast('Gürültü ölçer duraklatıldı.', 'info');
    } else {
      showToast('Gürültü ölçer devam ediyor.', 'info');
    }
  }

  toggleMode() {
    if (this.config.mode === 'microphone') {
      this.config.mode = 'simulation';
      this.stopMicrophone();
      this.startSimulation();
      showToast('Gürültü ölçer Simülasyon moduna alındı.', 'info');
    } else {
      this.config.mode = 'microphone';
      this.stopSimulation();
      this.startMicrophone();
      showToast('Gürültü ölçer Canlı Mikrofon moduna alındı.', 'info');
    }
    saveState();
    this.updateControlsUI();
  }

  async startMicrophone() {
    this.stopSimulation();
    const tag = document.getElementById('noiseSourceTag');
    if (tag) tag.textContent = '🎙️ Bağlanıyor...';

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      if (tag) tag.textContent = '🎙️ Canlı Mikrofon';
      this.loopMicrophone();
    } catch (err) {
      console.warn('Mikrofon erişilemedi, simülasyon moduna geçiliyor:', err);
      if (tag) tag.textContent = '🎮 Simülasyon (Mikrofon İzni Yok)';
      this.startSimulation();
    }
  }

  stopMicrophone() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }

  loopMicrophone() {
    if (!this.active || this.config.mode !== 'microphone') return;

    if (!this.isPaused && this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const avg = sum / this.dataArray.length; // 0..255
      // 0..100 aralığına ölçeklendir
      const rawLevel = (avg / 120) * 100 * (this.config.sensitivity || 1.2);
      this.targetLevel = Math.min(100, Math.max(0, Math.round(rawLevel)));
    } else if (this.isPaused) {
      this.targetLevel = 0;
    }

    // Yumuşak geçiş
    this.currentLevel = Math.round(this.currentLevel * 0.65 + this.targetLevel * 0.35);
    this.updateUI(this.currentLevel);
    this.checkPenalty(this.currentLevel);

    this.animFrameId = requestAnimationFrame(() => this.loopMicrophone());
  }

  startSimulation() {
    this.stopMicrophone();
    const tag = document.getElementById('noiseSourceTag');
    if (tag) tag.textContent = '🎮 Simülasyon Modu';

    clearInterval(this.simInterval);
    let base = 25;
    let cycleCount = 0;

    this.simInterval = setInterval(() => {
      if (!this.active || this.isPaused) {
        this.updateUI(0);
        return;
      }

      cycleCount++;
      // Simülasyonda her 12-16 adımda bir gürültü dalgası oluştur (test için)
      if (cycleCount > 18 && Math.random() > 0.45) {
        this.targetLevel = Math.floor(Math.random() * 18) + 84; // 84-102
        if (cycleCount > 24) cycleCount = 0;
      } else {
        const jitter = (Math.random() - 0.5) * 18;
        this.targetLevel = Math.max(12, Math.min(65, Math.round(base + jitter)));
      }

      this.currentLevel = Math.round(this.currentLevel * 0.6 + this.targetLevel * 0.4);
      this.updateUI(this.currentLevel);
      this.checkPenalty(this.currentLevel);
    }, 120);
  }

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }

  updateUI(level) {
    const numEl = document.getElementById('noiseNumberVal');
    const barEl = document.getElementById('noiseMeterBar');
    const cardEl = document.getElementById('noiseCard');
    const badgeEl = document.getElementById('noiseStatusBadge');
    const thresholdMarker = document.getElementById('noiseThresholdMarker');
    const markerVal = document.getElementById('markerThresholdVal');

    if (!numEl || !barEl || !badgeEl) return;

    numEl.textContent = level;
    barEl.style.height = `${Math.min(100, Math.max(4, level))}%`;

    const thresh = this.config.threshold || 80;
    if (thresholdMarker) thresholdMarker.style.bottom = `${thresh}%`;
    if (markerVal) markerVal.textContent = thresh;

    badgeEl.className = 'noise-status-badge';
    if (cardEl) cardEl.classList.toggle('is-loud', level >= thresh);

    if (level < 40) {
      badgeEl.classList.add('status-calm');
      badgeEl.textContent = '🟢 Sessiz';
    } else if (level < thresh) {
      badgeEl.classList.add('status-moderate');
      badgeEl.textContent = '🟡 Konuşma';
    } else {
      badgeEl.classList.add('status-loud');
      badgeEl.textContent = '🔴 YÜKSEK!';
    }
  }

  checkPenalty(level) {
    const thresh = this.config.threshold || 80;
    const warnPanel = document.getElementById('noiseWarningPanel');
    const timerBar = document.getElementById('penaltyTimerBar');
    const countdownLabel = document.getElementById('penaltyCountdownLabel');
    const cooldownPanel = document.getElementById('noiseCooldownPanel');

    const now = Date.now();

    // Ceza sonrası bekleme (cooldown) süresi
    if (now < this.cooldownUntil) {
      if (warnPanel) warnPanel.style.display = 'none';
      if (cooldownPanel) {
        cooldownPanel.style.display = 'block';
        const remainingSec = Math.ceil((this.cooldownUntil - now) / 1000);
        cooldownPanel.innerHTML = `<span>⏳ Ceza uygulandı (${remainingSec} sn bekleme)</span>`;
      }
      return;
    } else {
      if (cooldownPanel) cooldownPanel.style.display = 'none';
    }

    if (level >= thresh) {
      if (!this.config.autoPenalty) {
        if (warnPanel) warnPanel.style.display = 'none';
        return;
      }

      if (!this.highNoiseStart) {
        this.highNoiseStart = now;
      }

      const elapsed = now - this.highNoiseStart;
      const totalDelay = (this.config.delaySeconds || 2) * 1000;
      const progressPercent = Math.min(100, (elapsed / totalDelay) * 100);

      if (warnPanel) warnPanel.style.display = 'block';
      if (timerBar) timerBar.style.width = `${progressPercent}%`;

      const remainingSec = Math.max(0.1, ((totalDelay - elapsed) / 1000)).toFixed(1);
      if (countdownLabel) {
        countdownLabel.textContent = `${remainingSec} sn içinde herkesden 1 puan kesilecek!`;
      }

      if (elapsed >= totalDelay) {
        this.applyPenalty();
      }
    } else {
      this.highNoiseStart = null;
      if (warnPanel) warnPanel.style.display = 'none';
    }
  }

  applyPenalty() {
    if (this.isApplyingPenalty || !currentClassId) return;
    this.isApplyingPenalty = true;
    this.highNoiseStart = null;

    const classStudents = appState.students.filter(s => String(s.classId) === String(currentClassId));
    if (classStudents.length === 0) {
      this.isApplyingPenalty = false;
      return;
    }

    // 1. Uyarı sesi çal
    soundManager.playNeedsWorkSound();

    // 2. Her öğrenciden 1 puan düşür
    const studentIds = [];
    classStudents.forEach(std => {
      std.points = (std.points || 0) - 1;
      studentIds.push(std.id);
    });

    // 3. Geçmişe kaydet
    const historyEntry = {
      id: 'hist_' + Date.now() + '_noise',
      classId: currentClassId,
      studentIds: studentIds,
      studentNames: 'Bütün Sınıf',
      skillTitle: 'Yüksek Gürültü Cezası',
      skillIcon: '📢',
      points: -1,
      type: 'needs-work',
      timestamp: new Date().toISOString()
    };

    if (!appState.history) appState.history = [];
    appState.history.unshift(historyEntry);
    saveState();

    // Edulem Veritabanına Kaydet
    saveActionToServer({
      action: 'award',
      class_id: currentClassId,
      student_ids: studentIds,
      student_names: 'Bütün Sınıf',
      skill_title: 'Yüksek Gürültü Cezası',
      skill_icon: '📢',
      points: -1,
      type: 'needs-work',
      history_id: historyEntry.id
    });

    // 4. Arayüzü güncelle ve uçuşan -1 balonlarını göster
    renderClassroom();
    studentIds.forEach(id => {
      triggerFloatingBubble(id, -1);
    });

    showToast('⚠️ Sınıf çok gürültülü oldu (+80)! Herkesten 1 puan kesildi.', 'negative');

    // 10 saniye bekleme süresi
    this.cooldownUntil = Date.now() + 10000;
    this.isApplyingPenalty = false;
  }

  updateControlsUI() {
    const pauseBtnTxt = document.getElementById('noisePauseText');
    const pauseBtnIcon = document.getElementById('noisePauseIcon');
    const modeBtnTxt = document.getElementById('noiseModeBtnText');
    const autoStatus = document.getElementById('noiseAutoPenaltyStatus');

    if (pauseBtnTxt) {
      pauseBtnTxt.textContent = this.isPaused ? 'Başlat' : 'Duraklat';
    }
    if (pauseBtnIcon) {
      pauseBtnIcon.setAttribute('data-lucide', this.isPaused ? 'play' : 'pause');
    }
    if (modeBtnTxt) {
      modeBtnTxt.textContent = this.config.mode === 'microphone' ? 'Simülasyon' : 'Mikrofon';
    }
    if (autoStatus) {
      autoStatus.textContent = this.config.autoPenalty ? 'Açık (-1 Puan)' : 'Kapalı';
      autoStatus.style.color = this.config.autoPenalty ? 'var(--positive-dark)' : 'var(--text-muted)';
    }

    if (window.lucide) lucide.createIcons();
  }
}

const noiseMeter = new NoiseMeterManager();

// ==========================================
// 6. GÖRÜNÜMLER (VIEWS) VE GEÇİŞLER
// ==========================================

function showDashboardView() {
  if (!getCurrentUser()) {
    showLoginView();
    return;
  }
  currentClassId = null;
  selectedStudentIds.clear();
  isMultiSelectMode = false;
  updateMultiActionBar();

  // Sınıftan çıkıldığında gürültü ölçeri durdur
  noiseMeter.stop();

  const viewLogin = document.getElementById('viewLogin');
  if (viewLogin) viewLogin.style.display = 'none';
  document.getElementById('viewDashboard').style.display = 'block';
  document.getElementById('viewClassroom').style.display = 'none';

  // Mobilde aktif sekme
  setMobileNavActive('mobNavClasses');

  updateUserNavProfile();
  renderDashboard();
}

function showClassroomView(classId) {
  if (!getCurrentUser()) {
    showLoginView();
    return;
  }
  const cls = appState.classes.find(c => String(c.id) === String(classId));
  if (!cls) {
    showDashboardView();
    return;
  }

  currentClassId = String(classId);
  selectedStudentIds.clear();
  isMultiSelectMode = false;
  updateMultiActionBar();

  const viewLogin = document.getElementById('viewLogin');
  if (viewLogin) viewLogin.style.display = 'none';
  document.getElementById('viewDashboard').style.display = 'none';
  document.getElementById('viewClassroom').style.display = 'block';

  // Başlık bilgilerini güncelle
  document.getElementById('classHeroTitle').textContent = cls.name;
  document.getElementById('classHeroGrade').textContent = cls.grade || 'Sınıf';
  document.getElementById('classHeroIcon').textContent = cls.icon || '🏫';

  setMobileNavActive('mobNavStudents');
  updateUserNavProfile();
  renderClassroom();

  // Sınıfa girildiğinde gürültü ölçeri otomatik başlat!
  noiseMeter.start();
}

function setMobileNavActive(activeId) {
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.id === activeId);
  });
}

// ==========================================
// 7. DASHBOARD RENDER (KADEMELERE GÖRE SINIFLAR LİSTESİ)
// ==========================================

let currentKademeFilter = 'all';

const KADEME_SECTIONS = [
  { key: 'ilkokul', title: 'İlkokul', icon: '🎒', subtitle: '1-4. Sınıflar' },
  { key: 'ortaokul', title: 'Ortaokul', icon: '🚀', subtitle: '5-8. Sınıflar' },
  { key: 'lise', title: 'Lise', icon: '🎓', subtitle: '9-12. Sınıflar' },
  { key: 'anaokulu', title: 'Anaokulu', icon: '🐣', subtitle: 'Okul Öncesi' }
];

function getClassCategoryClient(cls) {
  if (cls.category) return cls.category;
  const name = String(cls.name || '').toUpperCase();
  const grade = String(cls.grade || '').toLowerCase();
  if (/^(9|10|11|12)/.test(name) || grade.includes('lise')) return 'lise';
  if (/^[5-8]/.test(name) || grade.includes('ortaokul')) return 'ortaokul';
  if (/^[1-4]/.test(name) || grade.includes('ilkokul')) return 'ilkokul';
  if (name.includes('ANA') || grade.includes('ana')) return 'anaokulu';
  return 'ilkokul';
}

function updateGradeCounts() {
  const total = appState.classes.length;
  let ilkokul = 0, ortaokul = 0, lise = 0, anaokulu = 0;

  appState.classes.forEach(c => {
    const cat = getClassCategoryClient(c);
    if (cat === 'ilkokul') ilkokul++;
    else if (cat === 'ortaokul') ortaokul++;
    else if (cat === 'lise') lise++;
    else if (cat === 'anaokulu') anaokulu++;
  });

  const elAll = document.getElementById('countGradeAll');
  const elIlk = document.getElementById('countGradeIlkokul');
  const elOrt = document.getElementById('countGradeOrtaokul');
  const elLis = document.getElementById('countGradeLise');
  const elAna = document.getElementById('countGradeAnaokulu');

  if (elAll) elAll.textContent = total;
  if (elIlk) elIlk.textContent = ilkokul;
  if (elOrt) elOrt.textContent = ortaokul;
  if (elLis) elLis.textContent = lise;
  if (elAna) elAna.textContent = anaokulu;
}

function createClassCardElement(cls) {
  const classStudents = appState.students.filter(s => String(s.classId) === String(cls.id));
  const totalScore = classStudents.reduce((sum, s) => sum + (s.points || 0), 0);

  const card = document.createElement('div');
  card.className = 'class-card';
  card.innerHTML = `
    <div class="class-card-top">
      <div>
        <h3 class="class-card-title">${escapeHtml(cls.name)}</h3>
        <p class="class-card-grade">${escapeHtml(cls.grade || 'Kademe Belirtilmedi')}</p>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button class="btn-icon" style="display: none; width: 32px; height: 32px;" title="Sınıfı Gizle" onclick="event.stopPropagation(); deleteClass('${cls.id}')">
          <i data-lucide="trash-2" style="width: 15px; color: var(--danger);"></i>
        </button>
        <div class="class-card-icon">${cls.icon || '🏫'}</div>
      </div>
    </div>
    <div class="class-card-footer">
      <div><i data-lucide="users" style="width: 14px; vertical-align: middle;"></i> <strong>${classStudents.length}</strong> Öğrenci</div>
      <div class="class-total-score"><strong>${totalScore}</strong> Puan</div>
    </div>
  `;

  card.addEventListener('click', () => {
    showClassroomView(cls.id);
  });

  return card;
}

function renderDashboard() {
  updateGradeCounts();

  const container = document.getElementById('classesContainer') || document.getElementById('classesGrid');
  if (!container) return;

  container.innerHTML = '';

  if (appState.classes.length === 0) {
    const user = getCurrentUser();
    const emptyBox = document.createElement('div');
    emptyBox.style.textAlign = 'center';
    emptyBox.style.padding = '3.5rem 1.5rem';
    emptyBox.style.background = 'white';
    emptyBox.style.borderRadius = 'var(--radius-lg)';
    emptyBox.style.border = '2px dashed var(--border-color)';
    emptyBox.style.maxWidth = '580px';
    emptyBox.style.margin = '2rem auto';
    emptyBox.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 0.8rem;">📅</div>
      <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Ders Programınızda Sınıf Bulunamadı</h3>
      <p style="font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.2rem;">
        Sayın <strong>${escapeHtml(user?.name || 'Öğretmenimiz')}</strong>, bu dönem için ders programınıza atanmış aktif bir sınıf kaydı bulunamadı.
      </p>
      <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: #f0f9ff; border: 1.5px solid #bae6fd; color: #0369a1; padding: 0.6rem 1.1rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 700;">
        <i data-lucide="info" style="width: 16px; height: 16px;"></i>
        <span>Ders programınız Edulem'e girildiğinde sınıflarınız burada anında görünecektir.</span>
      </div>
    `;
    container.appendChild(emptyBox);
    if (window.lucide) lucide.createIcons();
    return;
  }

  const sectionsToRender = currentKademeFilter === 'all'
    ? KADEME_SECTIONS
    : KADEME_SECTIONS.filter(s => s.key === currentKademeFilter);

  let renderedAnyClass = false;

  sectionsToRender.forEach(sec => {
    const sectionClasses = appState.classes.filter(c => getClassCategoryClient(c) === sec.key);
    if (sectionClasses.length === 0 && currentKademeFilter === 'all') return;

    renderedAnyClass = true;
    const secEl = document.createElement('div');
    secEl.className = 'kademe-section';

    secEl.innerHTML = `
      <div class="kademe-section-header">
        <div class="kademe-title">
          <span>${sec.icon}</span>
          <span>${sec.title}</span>
          <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-left: 6px;">(${sec.subtitle})</span>
        </div>
        <span class="kademe-count">${sectionClasses.length} Sınıf</span>
      </div>
      <div class="classes-grid" id="grid_${sec.key}"></div>
    `;

    const gridEl = secEl.querySelector('.classes-grid');
    sectionClasses.forEach(cls => {
      gridEl.appendChild(createClassCardElement(cls));
    });

    container.appendChild(secEl);
  });

  if (!renderedAnyClass) {
    const emptyBox = document.createElement('div');
    emptyBox.style.textAlign = 'center';
    emptyBox.style.padding = '3rem 1rem';
    emptyBox.style.color = 'var(--text-muted)';
    emptyBox.innerHTML = `
      <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏫</div>
      <h3 style="font-size: 1.2rem; margin-bottom: 0.3rem;">Bu kademede sınıf bulunamadı</h3>
      <p style="font-size: 0.9rem;">Üstteki "Edulem'den Yenile" butonuna tıklayarak Edulem veritabanını senkronize edebilirsiniz.</p>
    `;
    container.appendChild(emptyBox);
  }

  // Yeni Sınıf Ekle Bölümü (Gizlendi - Edulem senkronizasyonu devrede)
  const addWrapper = document.createElement('div');
  addWrapper.style.display = 'none';
  addWrapper.style.justifyContent = 'center';
  addWrapper.style.marginTop = '1.5rem';
  addWrapper.innerHTML = `
    <button class="btn btn-secondary" onclick="openNewClassModal()" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">
      <i data-lucide="plus-circle"></i>
      <span>Yeni Sınıf Oluştur</span>
    </button>
  `;
  container.appendChild(addWrapper);

  if (window.lucide) lucide.createIcons();
}

// ==========================================
// 8. SINIF İÇİ RENDER (ÖĞRENCİLER VE GRUPLAR)
// ==========================================

let currentSortMode = 'points_desc'; // 'points_desc' | 'alphabetical'

function toggleStudentSort() {
  if (currentSortMode === 'points_desc') {
    currentSortMode = 'alphabetical';
    const textEl = document.getElementById('sortToggleText');
    const badgeEl = document.getElementById('studentsSectionBadge');
    if (textEl) textEl.textContent = 'İsme Göre (A-Z)';
    if (badgeEl) badgeEl.textContent = 'İsme Göre Sıralı';
  } else {
    currentSortMode = 'points_desc';
    const textEl = document.getElementById('sortToggleText');
    const badgeEl = document.getElementById('studentsSectionBadge');
    if (textEl) textEl.textContent = 'Puana Göre (Liderlik)';
    if (badgeEl) badgeEl.textContent = 'Puana Göre Sıralı';
  }
  renderClassroom();
}

function renderClassroom() {
  if (!currentClassId) return;

  const classStudents = appState.students.filter(s => String(s.classId) === String(currentClassId));
  const totalScore = classStudents.reduce((sum, s) => sum + (s.points || 0), 0);
  const classGroups = appState.groups.filter(g => String(g.classId) === String(currentClassId));

  // İstatistikleri güncelle
  const heroCount = document.getElementById('classHeroCount');
  const heroTotal = document.getElementById('classHeroTotalScore');
  const tabStdCount = document.getElementById('tabStudentCount');
  const tabGrpCount = document.getElementById('tabGroupCount');
  const stripTotal = document.getElementById('stripTotalScore');
  const stripRatio = document.getElementById('stripPositiveRatio');

  if (heroCount) heroCount.textContent = classStudents.length;
  if (heroTotal) heroTotal.textContent = totalScore;
  if (tabStdCount) tabStdCount.textContent = classStudents.length;
  if (tabGrpCount) tabGrpCount.textContent = classGroups.length;
  if (stripTotal) stripTotal.textContent = totalScore;

  // Pozitif davranış oranını hesapla
  const classHistory = (appState.history || []).filter(h => String(h.classId) === String(currentClassId));
  let pos = 0, neg = 0;
  classHistory.forEach(h => {
    if (h.type === 'positive') pos += Math.abs(h.points || 1);
    else neg += Math.abs(h.points || 1);
  });
  const ratio = (pos + neg > 0) ? Math.round((pos / (pos + neg)) * 100) : 100;
  if (stripRatio) stripRatio.textContent = `%${ratio}`;

  if (currentTab === 'students') {
    renderStudentsGrid(classStudents);
  } else {
    renderGroupsGrid(classGroups, classStudents);
  }
}

function renderPodium(sortedStudents) {
  const podiumContainer = document.getElementById('classroomPodium');
  if (!podiumContainer) return;

  if (sortedStudents.length === 0) {
    podiumContainer.innerHTML = `
      <div style="text-align: center; padding: 1.25rem 1rem; color: #cbd5e1;">
        <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">👑</div>
        <h3 style="font-family: 'Fredoka', cursive; font-size: 1.2rem; color: #fde047; margin-bottom: 0.2rem;">Sınıf Podyumu Henüz Boş</h3>
        <p style="font-size: 0.85rem; color: #c7d2fe;">Öğrenci ekleyip puan verdikçe ilk 3'e giren yıldızlar burada tahta oturacak!</p>
      </div>
    `;
    return;
  }

  const firstPlace = sortedStudents[0] || null;
  const secondPlace = sortedStudents[1] || null;
  const thirdPlace = sortedStudents[2] || null;
  const fourthPlace = sortedStudents[3] || null;

  let html = `
    <div class="podium-header-compact">
      <div class="podium-title-group">
        <span class="podium-mini-trophy">🏆</span>
        <h3 class="podium-compact-title">Şampiyonlar Podyumu & Altın Taht</h3>
        <span class="podium-sparkle-pill">✨ Sınıfın İlk 3 Yıldızı ✨</span>
      </div>
    </div>

    <div class="podium-stage">
  `;

  // 2. SIRA (SOL - GÜMÜŞ KÜRSÜ)
  if (secondPlace) {
    const secondSvg = generateMonsterSvg(secondPlace.avatarSeed || secondPlace.name, 74);
    html += `
      <div class="podium-slot place-2" data-student-id="${secondPlace.id}" title="${escapeHtml(secondPlace.name)} - Puan vermek için tıklayın">
        <div class="podium-crown">🥈</div>
        <div class="podium-avatar-box">
          ${secondSvg}
        </div>
        <!-- Şık ve Net İsim Levhası -->
        <div class="podium-name-plate plate-silver">
          <span class="podium-crown-icon">🥈</span>
          <span class="podium-student-name">${escapeHtml(secondPlace.name)}</span>
        </div>
        <div class="podium-block block-2">
          <div class="podium-rank-num">2</div>
          <div class="podium-score-pill">
            <span>⭐</span> <span>${secondPlace.points || 0} Puan</span>
          </div>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="podium-slot place-2" style="cursor: default; opacity: 0.65;">
        <div class="podium-crown">🥈</div>
        <div class="podium-avatar-box" style="width: 74px; height: 74px; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
          🪑
        </div>
        <div class="podium-name-plate plate-silver">
          <span class="podium-crown-icon">🥈</span>
          <span class="podium-student-name" style="color: #cbd5e1;">Boş Kürsü</span>
        </div>
        <div class="podium-block block-2">
          <div class="podium-rank-num">2</div>
          <div class="podium-score-pill" style="opacity: 0.85;">
            <span>⭐</span> <span>Sıradaki Sen Ol!</span>
          </div>
        </div>
      </div>
    `;
  }

  // 1. SIRA (ORTA - ALTIN KRALİYET TAHTI)
  if (firstPlace) {
    const firstSvg = generateMonsterSvg(firstPlace.avatarSeed || firstPlace.name, 86);
    html += `
      <div class="podium-slot place-1" data-student-id="${firstPlace.id}" title="${escapeHtml(firstPlace.name)} - Puan vermek için tıklayın">
        <div class="podium-crown">👑</div>
        <div class="royal-throne-wrapper">
          <div class="throne-backrest"></div>
          <div class="throne-cushion"></div>
          <div class="podium-avatar-box">
            ${firstSvg}
          </div>
        </div>
        <!-- Şık ve Net İsim Levhası -->
        <div class="podium-name-plate plate-gold">
          <span class="podium-crown-icon">👑</span>
          <span class="podium-student-name">${escapeHtml(firstPlace.name)}</span>
        </div>
        <div class="podium-block block-1">
          <div class="podium-rank-num">1</div>
          <div class="podium-score-pill">
            <span>🏆</span> <span>${firstPlace.points || 0} Puan</span>
          </div>
        </div>
      </div>
    `;
  }

  // 3. SIRA (SAĞ - BRONZ KÜRSÜ)
  if (thirdPlace) {
    const thirdSvg = generateMonsterSvg(thirdPlace.avatarSeed || thirdPlace.name, 68);
    html += `
      <div class="podium-slot place-3" data-student-id="${thirdPlace.id}" title="${escapeHtml(thirdPlace.name)} - Puan vermek için tıklayın">
        <div class="podium-crown">🥉</div>
        <div class="podium-avatar-box">
          ${thirdSvg}
        </div>
        <!-- Şık ve Net İsim Levhası -->
        <div class="podium-name-plate plate-bronze">
          <span class="podium-crown-icon">🥉</span>
          <span class="podium-student-name">${escapeHtml(thirdPlace.name)}</span>
        </div>
        <div class="podium-block block-3">
          <div class="podium-rank-num">3</div>
          <div class="podium-score-pill">
            <span>⚡</span> <span>${thirdPlace.points || 0} Puan</span>
          </div>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="podium-slot place-3" style="cursor: default; opacity: 0.65;">
        <div class="podium-crown">🥉</div>
        <div class="podium-avatar-box" style="width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
          🪑
        </div>
        <div class="podium-name-plate plate-bronze">
          <span class="podium-crown-icon">🥉</span>
          <span class="podium-student-name" style="color: #fed7aa;">Boş Kürsü</span>
        </div>
        <div class="podium-block block-3">
          <div class="podium-rank-num">3</div>
          <div class="podium-score-pill" style="opacity: 0.85;">
            <span>⚡</span> <span>Sıradaki Sen Ol!</span>
          </div>
        </div>
      </div>
    `;
  }

  html += `</div>`; // .podium-stage sonu

  // TEŞVİK RADARI (4. Sıradaki Öğrenci Varsa)
  if (fourthPlace && thirdPlace) {
    const gap = Math.max(1, (thirdPlace.points || 0) - (fourthPlace.points || 0) + 1);
    html += `
      <div class="podium-incentive-box">
        <span class="incentive-icon">🔥</span>
        <span class="incentive-text">
          <strong>${escapeHtml(fourthPlace.name)}</strong>, ilk 3 podyumuna sadece <strong>${gap} puan</strong> uzaktasın! Bir sonraki görevde tahta geçebilirsin! 🚀
        </span>
      </div>
    `;
  }

  podiumContainer.innerHTML = html;

  // Podyumdaki öğrencilere tıklama olaylarını bağla
  podiumContainer.querySelectorAll('.podium-slot[data-student-id]').forEach(slot => {
    slot.addEventListener('click', () => {
      const sId = slot.getAttribute('data-student-id');
      const std = appState.students.find(s => String(s.id) === String(sId));
      if (std) {
        openSkillModalForStudent(std);
      }
    });
  });
}

function renderStudentsGrid(students) {
  const container = document.getElementById('studentsGrid');
  if (!container) return;
  container.innerHTML = '';

  // Puana veya İsme Göre Sıralama
  const sortedStudents = [...students];
  if (currentSortMode === 'points_desc') {
    sortedStudents.sort((a, b) => {
      const diff = (b.points || 0) - (a.points || 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, 'tr');
    });
  } else {
    sortedStudents.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }

  // 1. Podyumu Render Et (İlk 3 Öğrenci Tahtta)
  renderPodium(sortedStudents);

  // 2. Kart: BÜTÜN SINIF KARTI (Yıldızlı Parti Kartı)
  const allClassCard = document.createElement('div');
  allClassCard.className = 'student-card all-class-card';
  allClassCard.innerHTML = `
    <div class="score-badge" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">★</div>
    <div class="student-avatar" style="font-size: 2.8rem; line-height: 1;">🌟</div>
    <div class="student-name" style="font-weight: 800; color: #b45309;">Bütün Sınıf</div>
    <span style="font-family: var(--font-fun); font-size: 0.76rem; font-weight: 700; color: #92400e; background: #fef08a; padding: 2px 8px; border-radius: 9999px; margin-top: 4px;">
      🎉 Herkese Puan
    </span>
  `;
  allClassCard.addEventListener('click', () => {
    openSkillModalForAll();
  });
  container.appendChild(allClassCard);

  // 3. Podyumda olan ilk 3 öğrenci hariç kalan öğrencileri listele (Puana göre sıralı iken)
  const gridStudents = currentSortMode === 'points_desc' ? sortedStudents.slice(3) : sortedStudents;

  // Liste başlık rozetini güncelle
  const badgeEl = document.getElementById('studentsSectionBadge');
  if (badgeEl) {
    if (currentSortMode === 'points_desc') {
      badgeEl.textContent = sortedStudents.length > 3
        ? `Sıralama (#4 - #${sortedStudents.length})`
        : `Tüm Öğrenciler Podyumda (${sortedStudents.length}/${sortedStudents.length})`;
    } else {
      badgeEl.textContent = `Alfabetik Sıralı (${sortedStudents.length})`;
    }
  }

  // Her Öğrencinin Sıralı Kartı
  gridStudents.forEach((student, index) => {
    const isSelected = selectedStudentIds.has(student.id);
    const scoreClass = student.points > 0 ? 'positive' : student.points < 0 ? 'negative' : 'neutral';
    const themeIndex = index % 6;
    // Puana göre sıralıysa gerçek sınıf sırası index + 4'tür
    const rank = currentSortMode === 'points_desc' ? index + 4 : index + 1;

    const rankBadgeClass = 'rank-other';
    const rankBadgeLabel = `#${rank}`;

    const card = document.createElement('div');
    card.className = `student-card theme-${themeIndex} ${isSelected ? 'is-selected' : ''}`;
    card.id = `studentCard_${student.id}`;

    // Kompakt 84px SVG avatar (ekranda 15-20 öğrenci rahatça görünür)
    const monsterSvg = generateMonsterSvg(student.avatarSeed || student.name, 84);

    card.innerHTML = `
      <div class="select-checkbox">${isSelected ? '✓' : ''}</div>
      <div class="student-rank-badge ${rankBadgeClass}" title="Sınıf Sıralaması: ${rank}.">${rankBadgeLabel}</div>
      <div class="score-badge ${scoreClass}">${student.points || 0}</div>
      <div class="student-avatar">${monsterSvg}</div>
      <div class="student-name" title="${escapeHtml(student.name)}">${escapeHtml(student.name)}</div>
      <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-light); margin-top: 2px;">+ Puan Ver</span>
    `;

    card.addEventListener('click', (e) => {
      if (isMultiSelectMode) {
        toggleSelectStudent(student.id);
      } else {
        openSkillModalForStudent(student);
      }
    });

    container.appendChild(card);
  });

  // 4. Öğrenci Ekle Kartı (Gizlendi - Edulem senkronizasyonu devrede)
  const addStudentCard = document.createElement('div');
  addStudentCard.className = 'student-card add-student-card';
  addStudentCard.style.display = 'none';
  addStudentCard.style.border = '2.5px dashed #0284c7';
  addStudentCard.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(224,242,254,0.6))';
  addStudentCard.innerHTML = `
    <div class="add-student-icon" style="background: #0284c7; color: white;"><i data-lucide="user-plus"></i></div>
    <span style="font-family: var(--font-fun); font-size: 0.95rem; font-weight: 700; color: #0284c7;">+ Öğrenci Ekle</span>
  `;
  addStudentCard.addEventListener('click', openAddStudentModal);
  container.appendChild(addStudentCard);

  if (window.lucide) lucide.createIcons();

  // 🐟 Akvaryumu bu sınıfın öğrencileriyle besle / güncelle
  requestAnimationFrame(() => {
    if (aquariumEngine.fishes.length === 0) {
      aquariumEngine.init(sortedStudents);
    } else {
      aquariumEngine.refresh(sortedStudents);
    }
  });
}
function renderGroupsGrid(groups, allStudents) {
  const container = document.getElementById('groupsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (groups.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <i data-lucide="users" style="width: 48px; height: 48px; color: var(--text-light); margin-bottom: 0.5rem;"></i>
        <h4 style="font-size: 1.1rem; font-weight: 700;">Henüz grup oluşturulmadı</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Sınıf masaları veya çalışma ekipleri kurarak toplu puan verebilirsiniz.</p>
        <button class="btn btn-primary" onclick="openNewGroupModal()"><i data-lucide="plus"></i> İlk Grubu Oluştur</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  groups.forEach(grp => {
    const groupStudents = allStudents.filter(s => (grp.studentIds || []).includes(s.id));
    const groupScore = groupStudents.reduce((acc, s) => acc + (s.points || 0), 0);

    const card = document.createElement('div');
    card.className = 'group-card';

    let miniAvatarsHtml = '';
    groupStudents.forEach(s => {
      miniAvatarsHtml += `
        <div class="group-mini-avatar" title="${escapeHtml(s.name)}">
          ${generateMonsterSvg(s.avatarSeed || s.name, 36)}
        </div>
      `;
    });

    card.innerHTML = `
      <div>
        <div class="group-header">
          <h4 class="group-name">${escapeHtml(grp.name)}</h4>
          <span class="class-total-score"><strong>${groupScore}</strong> Puan</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">${groupStudents.length} Öğrenci</p>
        <div class="group-student-avatars">
          ${miniAvatarsHtml || '<span style="font-size: 0.8rem; color: var(--text-light);">Henüz öğrenci atanmadı</span>'}
        </div>
      </div>
      <div class="group-actions">
        <button class="btn btn-positive" style="flex: 1;" onclick="openSkillModalForGroup('${grp.id}')">
          <i data-lucide="award"></i> Gruba Puan Ver
        </button>
        <button class="btn-icon" onclick="deleteGroup('${grp.id}')" title="Grubu Sil" style="color: var(--danger);">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

// ==========================================
// 9. ÇOKLU SEÇİM MODU (MULTI-SELECT)
// ==========================================

function toggleMultiSelectMode() {
  isMultiSelectMode = !isMultiSelectMode;
  const btn = document.getElementById('btnToggleMultiSelect');
  const txt = document.getElementById('multiSelectToggleText');
  const grid = document.getElementById('studentsGrid');

  if (isMultiSelectMode) {
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
    txt.textContent = 'Seçimi Bitir';
    if (grid) grid.classList.add('multi-select-active');
  } else {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
    txt.textContent = 'Çoklu Seçim';
    selectedStudentIds.clear();
    if (grid) grid.classList.remove('multi-select-active');
  }

  updateMultiActionBar();
  renderStudentsGrid(appState.students.filter(s => String(s.classId) === String(currentClassId)));
}

function toggleSelectStudent(studentId) {
  if (selectedStudentIds.has(studentId)) {
    selectedStudentIds.delete(studentId);
  } else {
    selectedStudentIds.add(studentId);
  }

  updateMultiActionBar();

  const card = document.getElementById(`studentCard_${studentId}`);
  if (card) {
    const isSelected = selectedStudentIds.has(studentId);
    card.classList.toggle('is-selected', isSelected);
    const cb = card.querySelector('.select-checkbox');
    if (cb) cb.textContent = isSelected ? '✓' : '';
  }
}

function updateMultiActionBar() {
  const bar = document.getElementById('multiActionBar');
  const countEl = document.getElementById('selectedCountNumber');
  if (!bar) return;

  if (selectedStudentIds.size > 0) {
    countEl.textContent = selectedStudentIds.size;
    bar.classList.add('visible');
  } else {
    bar.classList.remove('visible');
  }
}

// ==========================================
// 10. BECERİ & PUAN VERME İŞLEMLERİ
// ==========================================

function openSkillModalForStudent(student) {
  currentAwardTarget = {
    type: 'single',
    ids: [student.id],
    name: student.name,
    avatarSvg: generateMonsterSvg(student.avatarSeed || student.name, 38)
  };
  showSkillModal();
}

function openSkillModalForAll() {
  const classStudents = appState.students.filter(s => String(s.classId) === String(currentClassId));
  if (classStudents.length === 0) {
    showToast('Sınıfta henüz öğrenci yok!', 'negative');
    return;
  }

  currentAwardTarget = {
    type: 'all',
    ids: classStudents.map(s => s.id),
    name: 'Bütün Sınıf',
    avatarSvg: '🌟'
  };
  showSkillModal();
}

function openSkillModalForMulti() {
  if (selectedStudentIds.size === 0) return;
  const count = selectedStudentIds.size;
  currentAwardTarget = {
    type: 'multi',
    ids: Array.from(selectedStudentIds),
    name: `${count} Seçili Öğrenci`,
    avatarSvg: '👥'
  };
  showSkillModal();
}

window.openSkillModalForGroup = function(groupId) {
  const grp = appState.groups.find(g => g.id === groupId);
  if (!grp || !grp.studentIds || grp.studentIds.length === 0) {
    showToast('Bu grupta henüz öğrenci yok!', 'negative');
    return;
  }

  currentAwardTarget = {
    type: 'group',
    ids: grp.studentIds,
    name: grp.name,
    avatarSvg: '👥'
  };
  showSkillModal();
};

function showSkillModal() {
  if (!currentAwardTarget) return;

  document.getElementById('skillModalTargetName').textContent = currentAwardTarget.name;
  document.getElementById('skillModalSubTitle').textContent = 
    currentAwardTarget.type === 'single' ? 'Bu öğrenciye davranış puanı verin' : 'Tüm gruba davranış puanı verin';

  const avatarContainer = document.getElementById('skillModalTargetAvatar');
  avatarContainer.innerHTML = currentAwardTarget.avatarSvg;

  // Tekil öğrenci için düzenleme/silme butonlarını göster
  const manageBox = document.getElementById('studentManageActions');
  if (manageBox) {
    manageBox.style.display = currentAwardTarget.type === 'single' ? 'flex' : 'none';
  }

  renderSkillsGrid();
  openModal('skillModal');
  if (window.lucide) lucide.createIcons();
}

function renderSkillsGrid() {
  const container = document.getElementById('skillsGridList');
  if (!container) return;
  container.innerHTML = '';

  const filteredSkills = appState.skills.filter(s => s.type === currentSkillFilter);

  filteredSkills.forEach(skill => {
    const btn = document.createElement('button');
    btn.className = `skill-btn ${skill.type}`;
    const sign = skill.points > 0 ? '+' : '';

    btn.innerHTML = `
      <div class="skill-icon-circle">${skill.icon || '⭐'}</div>
      <div class="skill-title">${escapeHtml(skill.title)}</div>
      <div class="skill-val">${sign}${skill.points}</div>
    `;

    btn.addEventListener('click', () => {
      awardSkillToTarget(skill);
    });

    container.appendChild(btn);
  });
}

function awardSkillToTarget(skill) {
  if (!currentAwardTarget || !currentAwardTarget.ids.length) return;

  const pts = Number(skill.points);
  const isPositive = pts > 0;

  // 1. Ses Efekti
  if (isPositive) {
    soundManager.playPositiveChime();
    confetti.launch(currentAwardTarget.type === 'single' ? 40 : 80);
  } else {
    soundManager.playNeedsWorkSound();
  }

  // 2. Öğrenci Puanlarını Güncelle
  const affectedStudentNames = [];
  const targetIds = [...currentAwardTarget.ids];
  targetIds.forEach(studentId => {
    const std = appState.students.find(s => String(s.id) === String(studentId));
    if (std) {
      std.points = (std.points || 0) + pts;
      affectedStudentNames.push(std.name);
    }
  });

  // 3. Geçmişe Kaydet
  const historyEntry = {
    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    classId: currentClassId,
    studentIds: targetIds,
    studentNames: currentAwardTarget.name,
    skillTitle: skill.title,
    skillIcon: skill.icon || '⭐',
    points: pts,
    type: skill.type,
    timestamp: new Date().toISOString()
  };

  if (!appState.history) appState.history = [];
  appState.history.unshift(historyEntry);

  saveState();

  // Edulem Veritabanına Arka Planda Kaydet
  saveActionToServer({
    action: 'award',
    class_id: currentClassId,
    student_ids: targetIds,
    student_names: currentAwardTarget.name,
    skill_title: skill.title,
    skill_icon: skill.icon || '⭐',
    points: pts,
    type: skill.type,
    history_id: historyEntry.id
  });

  // 4. Arayüzü Güncelle
  renderClassroom();
  closeModal('skillModal');

  // Kartlar DOM'a render edildikten sonra uçuşan baloncuk animasyonunu başlat
  targetIds.forEach(studentId => {
    triggerFloatingBubble(studentId, pts);
  });

  // Bildirim göster
  const sign = pts > 0 ? '+' : '';
  showToast(`${currentAwardTarget.name} kazandı: ${skill.icon} ${skill.title} (${sign}${pts})`, isPositive ? 'positive' : 'negative');

  // Çoklu seçimde puan verildikten sonra seçimi temizle
  if (currentAwardTarget.type === 'multi') {
    selectedStudentIds.clear();
    isMultiSelectMode = false;
    updateMultiActionBar();
    const btn = document.getElementById('btnToggleMultiSelect');
    const txt = document.getElementById('multiSelectToggleText');
    if (btn) btn.classList.remove('btn-primary'), btn.classList.add('btn-secondary');
    if (txt) txt.textContent = 'Çoklu Seçim';
  }
}

function triggerFloatingBubble(studentId, points) {
  const card = document.getElementById(`studentCard_${studentId}`);
  if (!card) return;

  const bubble = document.createElement('div');
  const sign = points > 0 ? '+' : '';
  bubble.className = `floating-point-bubble ${points > 0 ? 'positive' : 'negative'}`;
  bubble.textContent = `${sign}${points}`;

  card.appendChild(bubble);

  // Animasyon bitince kaldır
  setTimeout(() => {
    bubble.remove();
  }, 1200);
}

// ==========================================
// 11. BECERİ YÖNETİCİSİ (SKILLS EDITOR)
// ==========================================

function openSkillEditor() {
  closeModal('skillModal');
  renderEditableSkillsList();
  openModal('editSkillsModal');
}

function renderEditableSkillsList() {
  const listContainer = document.getElementById('editableSkillsList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  appState.skills.forEach(skill => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const isPos = skill.type === 'positive';
    const sign = skill.points > 0 ? '+' : '';

    item.innerHTML = `
      <div class="history-left">
        <span style="font-size: 1.4rem;">${skill.icon}</span>
        <div>
          <strong>${escapeHtml(skill.title)}</strong>
          <span class="history-badge ${isPos ? 'pos' : 'neg'}" style="margin-left: 0.5rem;">${sign}${skill.points}</span>
        </div>
      </div>
      <button class="btn-icon" style="color: var(--danger); width: 32px; height: 32px;" onclick="deleteSkill('${skill.id}')" title="Beceriyi Sil">
        <i data-lucide="trash-2" style="width: 16px;"></i>
      </button>
    `;

    listContainer.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

window.deleteSkill = function(skillId) {
  if (appState.skills.length <= 1) {
    showToast('En az bir beceri kalmalıdır!', 'negative');
    return;
  }
  appState.skills = appState.skills.filter(s => s.id !== skillId);
  saveState();
  renderEditableSkillsList();
  showToast('Beceri silindi.');
};

// ==========================================
// 12. RASTGELE ÖĞRENCİ SEÇİCİ (RANDOM PICKER)
// ==========================================

let pickerTimer = null;
let lastPickedStudent = null;

function openRandomPicker() {
  const classStudents = appState.students.filter(s => String(s.classId) === String(currentClassId));
  if (classStudents.length === 0) {
    showToast('Seçim yapmak için sınıfta en az 1 öğrenci olmalı!', 'negative');
    return;
  }

  openModal('randomPickerModal');
  startPickingAnimation(classStudents);
}

function startPickingAnimation(students) {
  const nameEl = document.getElementById('pickerStudentName');
  const avatarBox = document.getElementById('pickerAvatarBox');
  const btnAward = document.getElementById('btnAwardPickedStudent');
  const btnAgain = document.getElementById('btnPickAgain');

  btnAward.disabled = true;
  btnAgain.disabled = true;

  let counter = 0;
  const totalCycles = 18;
  const speed = 75;

  clearInterval(pickerTimer);
  pickerTimer = setInterval(() => {
    counter++;
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    nameEl.textContent = randomStudent.name;
    avatarBox.innerHTML = generateMonsterSvg(randomStudent.avatarSeed || randomStudent.name, 90);

    if (counter >= totalCycles) {
      clearInterval(pickerTimer);
      // Kazananı sabitle
      const winner = students[Math.floor(Math.random() * students.length)];
      lastPickedStudent = winner;
      nameEl.textContent = winner.name;
      avatarBox.innerHTML = generateMonsterSvg(winner.avatarSeed || winner.name, 100);

      avatarBox.classList.add('bounce');
      setTimeout(() => avatarBox.classList.remove('bounce'), 500);

      soundManager.playFanfare();
      confetti.launch(50);

      btnAward.disabled = false;
      btnAgain.disabled = false;
    }
  }, speed);
}

// ==========================================
// 13. ZAMANLAYICI VE KRONOMETRE (TIMER & ACTIVITIES)
// ==========================================

let timerInterval = null;
let timerMode = 'countdown'; // 'countdown' | 'stopwatch'
let timerTotalSeconds = 900; // Varsayılan 15 dk (Sessiz Okuma)
let timerSeconds = 900;
let isTimerRunning = false;
let timerSoundEnabled = true;
let timerActivity = { title: 'Sessiz Okuma', icon: '📖' };
let isCornerTimerVisible = false;
let isFullscreenTimerVisible = false;

function formatTimerDigits(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function openTimerModal() {
  updateAllTimerDisplays();
  openModal('timerModal');
}

function updateAllTimerDisplays() {
  const timeStr = formatTimerDigits(timerSeconds);

  // 1. Modal Display
  const modalDisp = document.getElementById('timerDisplay');
  if (modalDisp) modalDisp.textContent = timeStr;
  const modalIcon = document.getElementById('timerActiveIcon');
  if (modalIcon) modalIcon.textContent = timerActivity.icon;
  const modalTitleInput = document.getElementById('timerCustomTitleInput');
  if (modalTitleInput && document.activeElement !== modalTitleInput) {
    modalTitleInput.value = timerActivity.title;
  }
  const modalPlayIcon = document.getElementById('timerPlayIcon');
  const modalPlayText = document.getElementById('timerPlayText');
  if (modalPlayText) modalPlayText.textContent = isTimerRunning ? 'Duraklat' : 'Başlat';
  if (modalPlayIcon) modalPlayIcon.setAttribute('data-lucide', isTimerRunning ? 'pause' : 'play');

  // 2. Floating Corner Widget Display
  const cornerEl = document.getElementById('floatingCornerTimer');
  const cornerDisp = document.getElementById('cornerTimerDisplay');
  const cornerIcon = document.getElementById('cornerTimerIcon');
  const cornerTitle = document.getElementById('cornerTimerTitle');
  const cornerBar = document.getElementById('cornerProgressBar');
  const cornerPlayIcon = document.getElementById('cornerPlayIcon');

  if (cornerDisp) cornerDisp.textContent = timeStr;
  if (cornerIcon) cornerIcon.textContent = timerActivity.icon;
  if (cornerTitle) cornerTitle.textContent = timerActivity.title;
  if (cornerPlayIcon) cornerPlayIcon.setAttribute('data-lucide', isTimerRunning ? 'pause' : 'play');

  if (cornerBar) {
    const ratio = (timerMode === 'countdown' && timerTotalSeconds > 0)
      ? Math.max(0, Math.min(100, (timerSeconds / timerTotalSeconds) * 100))
      : 100;
    cornerBar.style.width = `${ratio}%`;
  }

  if (cornerEl) {
    if (timerMode === 'countdown' && isTimerRunning && timerSeconds <= 30 && timerSeconds > 0) {
      cornerEl.classList.add('urgent');
    } else {
      cornerEl.classList.remove('urgent');
    }
  }

  // 3. Fullscreen Overlay Display
  const fsOverlay = document.getElementById('fullscreenTimerOverlay');
  const fsDigits = document.getElementById('fsDigitsDisplay');
  const fsIcon = document.getElementById('fsActivityIcon');
  const fsTitle = document.getElementById('fsActivityTitle');
  const fsRing = document.getElementById('fsRingCircle');
  const fsPlayIcon = document.getElementById('fsPlayIcon');
  const fsPlayText = document.getElementById('fsPlayText');
  const fsStartBtn = document.getElementById('btnFsStartPause');
  const fsStatusPill = document.getElementById('fsStatusPill');
  const fsStatusText = document.getElementById('fsStatusText');
  const fsSubLabel = document.getElementById('fsTimerSubLabel');

  if (fsDigits) fsDigits.textContent = timeStr;
  if (fsIcon) fsIcon.textContent = timerActivity.icon;
  if (fsTitle) fsTitle.textContent = timerActivity.title;
  if (fsSubLabel) fsSubLabel.textContent = timerMode === 'countdown' ? 'KALAN SÜRE' : 'GEÇEN SÜRE';

  if (fsPlayText) fsPlayText.textContent = isTimerRunning ? 'DURAKLAT' : 'BAŞLAT';
  if (fsPlayIcon) fsPlayIcon.setAttribute('data-lucide', isTimerRunning ? 'pause' : 'play');
  if (fsStartBtn) {
    if (isTimerRunning) fsStartBtn.classList.add('running');
    else fsStartBtn.classList.remove('running');
  }

  if (fsStatusPill && fsStatusText) {
    if (isTimerRunning) {
      fsStatusPill.classList.remove('paused');
      fsStatusText.textContent = 'Etkinlik Devam Ediyor...';
    } else {
      fsStatusPill.classList.add('paused');
      fsStatusText.textContent = timerSeconds === 0 ? 'Süre Bitti' : 'Duraklatıldı';
    }
  }

  // SVG Ring calculation: circumference = 2 * PI * 170 = ~1068.14
  if (fsRing) {
    const circumference = 1068.14;
    let ratio = 1;
    if (timerMode === 'countdown') {
      ratio = timerTotalSeconds > 0 ? (timerSeconds / timerTotalSeconds) : 0;
    }
    const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));
    fsRing.style.strokeDashoffset = offset;
  }

  if (fsOverlay) {
    if (timerMode === 'countdown' && timerSeconds <= 30 && timerSeconds > 0) {
      fsOverlay.classList.add('urgent');
      fsOverlay.classList.remove('warning');
    } else if (timerMode === 'countdown' && timerSeconds <= 60 && timerSeconds > 0) {
      fsOverlay.classList.add('warning');
      fsOverlay.classList.remove('urgent');
    } else {
      fsOverlay.classList.remove('urgent', 'warning');
    }
  }

  if (window.lucide) lucide.createIcons();
}

function startPauseTimer() {
  if (isTimerRunning) {
    // Duraklat
    clearInterval(timerInterval);
    isTimerRunning = false;
  } else {
    // Eğer süre 0 ise ve geri sayım ise baştan başlat
    if (timerMode === 'countdown' && timerSeconds === 0) {
      timerSeconds = timerTotalSeconds > 0 ? timerTotalSeconds : 120;
    }
    isTimerRunning = true;

    timerInterval = setInterval(() => {
      if (timerMode === 'countdown') {
        if (timerSeconds > 0) {
          timerSeconds--;
          updateAllTimerDisplays();
        } else {
          // Süre bitti!
          clearInterval(timerInterval);
          isTimerRunning = false;
          updateAllTimerDisplays();

          // Ses ve kutlama
          if (timerSoundEnabled) {
            soundManager.playTimerAlarm();
          }
          confetti.launch(50);

          const celebOverlay = document.getElementById('fsCelebrationOverlay');
          const celebText = document.getElementById('fsCelebActivityText');
          if (celebText) {
            celebText.textContent = `"${timerActivity.title}" etkinliği süresi tamamlandı. Harika iş çıkardınız çocuklar!`;
          }

          if (isFullscreenTimerVisible && celebOverlay) {
            celebOverlay.style.display = 'flex';
          } else {
            showToast(`⏰ "${timerActivity.title}" süresi doldu!`, 'positive');
          }
        }
      } else {
        // Kronometre
        timerSeconds++;
        updateAllTimerDisplays();
      }
    }, 1000);
  }

  updateAllTimerDisplays();
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerSeconds = timerMode === 'countdown' ? timerTotalSeconds : 0;
  const celebOverlay = document.getElementById('fsCelebrationOverlay');
  if (celebOverlay) celebOverlay.style.display = 'none';
  updateAllTimerDisplays();
}

function adjustTimerSeconds(deltaSec) {
  timerSeconds = Math.max(0, timerSeconds + deltaSec);
  if (timerMode === 'countdown') {
    if (timerSeconds > timerTotalSeconds) {
      timerTotalSeconds = timerSeconds;
    }
  }
  updateAllTimerDisplays();
}

function setTimerActivityPreset(title, icon, seconds) {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerMode = 'countdown';
  timerActivity = { title, icon };
  timerTotalSeconds = seconds;
  timerSeconds = seconds;

  // Modaldaki mod butonlarını güncelle
  const tabCountMode = document.getElementById('tabCountdownMode');
  const tabStopMode = document.getElementById('tabStopwatchMode');
  if (tabCountMode) tabCountMode.classList.add('active', 'positive-tab');
  if (tabStopMode) tabStopMode.classList.remove('active', 'positive-tab');

  const actSection = document.getElementById('timerActivitySection');
  if (actSection) actSection.style.display = 'block';

  // Preset butonunu active yap
  document.querySelectorAll('.activity-preset-btn').forEach(btn => {
    if (btn.getAttribute('data-title') === title) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const celebOverlay = document.getElementById('fsCelebrationOverlay');
  if (celebOverlay) celebOverlay.style.display = 'none';

  updateAllTimerDisplays();
}

function showCornerTimer() {
  const cornerEl = document.getElementById('floatingCornerTimer');
  if (cornerEl) {
    cornerEl.style.display = 'block';
    isCornerTimerVisible = true;
    updateAllTimerDisplays();
  }
}

function hideCornerTimer() {
  const cornerEl = document.getElementById('floatingCornerTimer');
  if (cornerEl) {
    cornerEl.style.display = 'none';
    isCornerTimerVisible = false;
  }
}

function toggleFullscreenTimer(open) {
  const fsOverlay = document.getElementById('fullscreenTimerOverlay');
  if (!fsOverlay) return;

  if (open) {
    // Sınıf adını güncelle
    const currentClass = (appState.classes || []).find(c => c.id === currentClassId);
    const fsClassNameText = document.getElementById('fsClassNameText');
    if (fsClassNameText) {
      fsClassNameText.textContent = currentClass ? currentClass.name : 'ClassLem Sınıfı';
    }

    fsOverlay.style.display = 'flex';
    isFullscreenTimerVisible = true;
    closeModal('timerModal');

    // Tarayıcı Fullscreen API denemesi
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}

    updateAllTimerDisplays();
  } else {
    fsOverlay.style.display = 'none';
    isFullscreenTimerVisible = false;
    const celebOverlay = document.getElementById('fsCelebrationOverlay');
    if (celebOverlay) celebOverlay.style.display = 'none';

    // Tarayıcı tam ekranından çık
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}

    // Eğer sayaç çalışıyorsa sağ altta mini widget açık kalsın
    if (isTimerRunning) {
      showCornerTimer();
    }
  }
}

function toggleTimerSound() {
  timerSoundEnabled = !timerSoundEnabled;
  const icon = document.getElementById('fsSoundIcon');
  if (icon) {
    icon.setAttribute('data-lucide', timerSoundEnabled ? 'volume-2' : 'volume-x');
  }
  showToast(timerSoundEnabled ? '🔔 Zamanlayıcı sesi açık' : '🔕 Zamanlayıcı sesi kapalı', 'positive');
  if (window.lucide) lucide.createIcons();
}

// ==========================================
// 14. ETKİNLİK GEÇMİŞİ VE RAPOR (HISTORY & UNDO)
// ==========================================

function openHistoryModal() {
  renderHistoryView();
  openModal('historyModal');
}

function renderHistoryView() {
  const classHistory = (appState.history || []).filter(h => String(h.classId) === String(currentClassId));
  const listContainer = document.getElementById('historyListContainer');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  let posCount = 0;
  let negCount = 0;

  classHistory.forEach(item => {
    if (item.type === 'positive') posCount += (item.points || 1);
    else negCount += Math.abs(item.points || 1);
  });

  document.getElementById('reportPosPoints').textContent = `+${posCount}`;
  document.getElementById('reportNegPoints').textContent = `-${negCount}`;

  const totalActions = posCount + negCount;
  const ratio = totalActions > 0 ? Math.round((posCount / totalActions) * 100) : 100;
  document.getElementById('reportPosRatio').textContent = `%${ratio}`;

  if (classHistory.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Henüz bir puan geçmişi kaydedilmedi.
      </div>
    `;
    return;
  }

  classHistory.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item';
    const isPos = item.type === 'positive';
    const sign = item.points > 0 ? '+' : '';
    const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <div class="history-left">
        <span style="font-size: 1.4rem;">${item.skillIcon || '⭐'}</span>
        <div>
          <div><strong>${escapeHtml(item.studentNames)}</strong> - ${escapeHtml(item.skillTitle)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${timeFormatted}</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span class="history-badge ${isPos ? 'pos' : 'neg'}">${sign}${item.points}</span>
        <button class="btn-icon" style="width: 32px; height: 32px; color: var(--text-muted);" onclick="undoHistoryItem('${item.id}')" title="Bu Puanı Geri Al">
          <i data-lucide="rotate-ccw" style="width: 14px;"></i>
        </button>
      </div>
    `;

    listContainer.appendChild(row);
  });

  if (window.lucide) lucide.createIcons();
}

window.undoHistoryItem = function(histId) {
  const itemIndex = appState.history.findIndex(h => h.id === histId);
  if (itemIndex === -1) return;

  const item = appState.history[itemIndex];

  // Puanları geri al
  (item.studentIds || []).forEach(stdId => {
    const std = appState.students.find(s => s.id === stdId);
    if (std) {
      std.points = (std.points || 0) - item.points;
    }
  });

  // Geçmişten çıkar
  appState.history.splice(itemIndex, 1);
  saveState();

  renderHistoryView();
  renderClassroom();
  showToast('Puan işlemi başarıyla geri alındı.', 'info');
};

// ==========================================
// 15. SINIF VE ÖĞRENCİ EKLEME/DÜZENLEME
// ==========================================

function openNewClassModal() {
  document.getElementById('editClassId').value = '';
  document.getElementById('classModalTitle').textContent = 'Yeni Sınıf Oluştur';
  document.getElementById('classNameInput').value = '';
  document.getElementById('classGradeInput').value = '';
  openModal('classModal');
}

function openAddStudentModal() {
  document.getElementById('singleStudentName').value = '';
  document.getElementById('bulkStudentsText').value = '';
  openModal('addStudentModal');
}

function handleAddSingleStudent(e) {
  e.preventDefault();
  const nameInput = document.getElementById('singleStudentName');
  const name = nameInput.value.trim();
  if (!name || !currentClassId) return;

  const newStudent = {
    id: 'std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    classId: currentClassId,
    name: name,
    points: 0,
    avatarSeed: Math.floor(Math.random() * 100) + 1
  };

  appState.students.push(newStudent);
  saveState();

  renderClassroom();
  closeModal('addStudentModal');
  showToast(`${name} sınıfa eklendi!`, 'positive');
}

function handleAddBulkStudents(e) {
  e.preventDefault();
  const textInput = document.getElementById('bulkStudentsText');
  const lines = textInput.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0 || !currentClassId) return;

  lines.forEach((name, idx) => {
    appState.students.push({
      id: 'std_' + Date.now() + '_' + idx,
      classId: currentClassId,
      name: name,
      points: 0,
      avatarSeed: Math.floor(Math.random() * 100) + idx
    });
  });

  saveState();
  renderClassroom();
  closeModal('addStudentModal');
  showToast(`${lines.length} öğrenci toplu olarak eklendi!`, 'positive');
}

function handleSaveClass(e) {
  e.preventDefault();
  const classId = document.getElementById('editClassId').value;
  const name = document.getElementById('classNameInput').value.trim();
  const grade = document.getElementById('classGradeInput').value.trim();
  const icon = document.getElementById('classIconInput').value;

  if (!name) return;

  if (classId) {
    // Düzenle
    const cls = appState.classes.find(c => c.id === classId);
    if (cls) {
      cls.name = name;
      cls.grade = grade;
      cls.icon = icon;
    }
  } else {
    // Yeni Oluştur
    const newClass = {
      id: 'cls_' + Date.now(),
      name: name,
      grade: grade,
      icon: icon,
      createdAt: new Date().toISOString()
    };
    appState.classes.push(newClass);
    saveState();
    closeModal('classModal');
    showClassroomView(newClass.id);
    showToast(`${name} oluşturuldu!`, 'positive');
    return;
  }

  saveState();
  closeModal('classModal');
  renderDashboard();
  if (currentClassId) showClassroomView(currentClassId);
  showToast('Sınıf kaydedildi.');
}

window.deleteClass = function(classId) {
  const cls = appState.classes.find(c => String(c.id) === String(classId));
  if (!cls) return;
  if (!confirm(`"${cls.name}" sınıfını ve bu sınıfa ait öğrencileri listeden kaldırmak istediğinize emin misiniz? (Edulem'den Yenile dendiğinde tekrar yüklenecektir.)`)) return;

  appState.classes = appState.classes.filter(c => String(c.id) !== String(classId));
  appState.students = appState.students.filter(s => String(s.classId) !== String(classId));
  appState.groups = (appState.groups || []).filter(g => String(g.classId) !== String(classId));
  appState.history = (appState.history || []).filter(h => String(h.classId) !== String(classId));

  saveState();
  renderDashboard();
  showToast('Sınıf silindi.', 'info');
};

function changeCurrentStudentAvatar() {
  if (!currentAwardTarget || currentAwardTarget.type !== 'single') return;
  const stdId = currentAwardTarget.ids[0];
  const std = appState.students.find(s => String(s.id) === String(stdId));
  if (!std) return;

  std.avatarSeed = Math.floor(Math.random() * 1000) + 1;
  saveState();

  // Edulem Veritabanına Arka Planda Kaydet
  saveActionToServer({
    action: 'update_avatar',
    student_id: std.id,
    avatar_seed: std.avatarSeed,
    class_id: currentClassId
  });

  currentAwardTarget.avatarSvg = generateMonsterSvg(std.avatarSeed, 38);
  document.getElementById('skillModalTargetAvatar').innerHTML = currentAwardTarget.avatarSvg;
  renderClassroom();
  soundManager.playPositiveChime();
  showToast(`${std.name} için yeni canavar avatarı atandı!`, 'positive');
}

function editCurrentStudentName() {
  if (!currentAwardTarget || currentAwardTarget.type !== 'single') return;
  const stdId = currentAwardTarget.ids[0];
  const std = appState.students.find(s => s.id === stdId);
  if (!std) return;

  const newName = prompt('Öğrencinin yeni adını girin:', std.name);
  if (newName && newName.trim() && newName.trim() !== std.name) {
    std.name = newName.trim();
    currentAwardTarget.name = std.name;
    document.getElementById('skillModalTargetName').textContent = std.name;
    saveState();
    renderClassroom();
    showToast('Öğrenci adı güncellendi.');
  }
}

function deleteCurrentStudent() {
  if (!currentAwardTarget || currentAwardTarget.type !== 'single') return;
  const stdId = currentAwardTarget.ids[0];
  const std = appState.students.find(s => s.id === stdId);
  if (!std) return;

  if (!confirm(`"${std.name}" isimli öğrenciyi sınıftan silmek istediğinize emin misiniz?`)) return;

  appState.students = appState.students.filter(s => s.id !== stdId);
  (appState.groups || []).forEach(g => {
    g.studentIds = (g.studentIds || []).filter(id => id !== stdId);
  });

  saveState();
  closeModal('skillModal');
  renderClassroom();
  showToast(`${std.name} sınıftan silindi.`, 'info');
}

// ==========================================
// 16. GRUP OLUŞTURMA & YÖNETME
// ==========================================

window.openNewGroupModal = function() {
  const container = document.getElementById('groupStudentSelectionList');
  if (!container || !currentClassId) return;
  container.innerHTML = '';

  const classStudents = appState.students.filter(s => String(s.classId) === String(currentClassId));
  document.getElementById('newGroupNameInput').value = '';

  classStudents.forEach(s => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '0.5rem';
    label.style.fontSize = '0.85rem';
    label.style.cursor = 'pointer';

    label.innerHTML = `
      <input type="checkbox" value="${s.id}" class="group-student-checkbox">
      <span>${escapeHtml(s.name)}</span>
    `;

    container.appendChild(label);
  });

  openModal('newGroupModal');
};

function handleSaveGroup(e) {
  e.preventDefault();
  const name = document.getElementById('newGroupNameInput').value.trim();
  if (!name || !currentClassId) return;

  const checkedBoxes = document.querySelectorAll('.group-student-checkbox:checked');
  const studentIds = Array.from(checkedBoxes).map(cb => cb.value);

  const newGroup = {
    id: 'grp_' + Date.now(),
    classId: currentClassId,
    name: name,
    studentIds: studentIds
  };

  if (!appState.groups) appState.groups = [];
  appState.groups.push(newGroup);
  saveState();

  // Edulem Veritabanına Arka Planda Kaydet
  saveActionToServer({
    action: 'save_group',
    id: newGroup.id,
    class_id: newGroup.classId,
    name: newGroup.name,
    student_ids: newGroup.studentIds
  });

  closeModal('newGroupModal');
  renderClassroom();
  showToast(`${name} grubu oluşturuldu!`, 'positive');
}

window.deleteGroup = function(grpId) {
  if (!confirm('Bu grubu silmek istediğinize emin misiniz?')) return;
  appState.groups = appState.groups.filter(g => g.id !== grpId);
  saveState();

  // Edulem Veritabanından Sil
  saveActionToServer({
    action: 'delete_group',
    id: grpId
  });

  renderClassroom();
  showToast('Grup silindi.');
};

// ==========================================
// 17. VERİ YEDEKLEME VE GERİ YÜKLEME
// ==========================================

function exportBackupData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `classlem_yedek_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Yedek dosyası başarıyla indirildi.', 'positive');
}

function importBackupData(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.classes && imported.students) {
        appState = imported;
        saveState();
        closeModal('backupModal');
        showDashboardView();
        showToast('Veriler başarıyla geri yüklendi!', 'positive');
      } else {
        showToast('Geçersiz dosya yapısı!', 'negative');
      }
    } catch (err) {
      showToast('Dosya okunurken hata oluştu!', 'negative');
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 17.1. REHBERLİK & İDARE RAPORLAMA MODÜLÜ
// ==========================================

let executiveReportData = null;
let currentReportFilters = {
  seasonId: null,
  grade: 'all',
  classId: 'all'
};

function getKademeBadgeHtml(kademe) {
  const k = (kademe || '').toLowerCase();
  if (k === 'ilkokul') {
    return `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.74rem; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 6px;">🎒 İlkokul</span>`;
  }
  if (k === 'ortaokul') {
    return `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.74rem; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 6px;">🚀 Ortaokul</span>`;
  }
  if (k === 'lise') {
    return `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.74rem; font-weight: 700; background: #ede9fe; color: #6d28d9; padding: 2px 7px; border-radius: 6px;">🎓 Lise</span>`;
  }
  if (k === 'anaokulu') {
    return `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.74rem; font-weight: 700; background: #fce7f3; color: #be185d; padding: 2px 7px; border-radius: 6px;">🐣 Anaokulu</span>`;
  }
  return `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.74rem; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 6px;">Genel</span>`;
}

async function openExecutiveReportsModal() {
  const user = getCurrentUser();
  if (!user || (!user.can_view_reports && !user.is_superadmin)) {
    showToast('Bu alana sadece okul yöneticileri, kurucu ve rehberlik birimi erişebilir.', 'negative');
    return;
  }
  openModal('executiveReportsModal');
  switchReportTab('repContentOverview');
  await loadExecutiveReports();
}

async function loadExecutiveReports() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    let url = `${API_BASE_URL}reports.php?action=get_reports&user_id=${encodeURIComponent(user.id)}`;
    if (currentReportFilters.seasonId) {
      url += `&season_id=${encodeURIComponent(currentReportFilters.seasonId)}`;
    }
    if (currentReportFilters.grade) {
      url += `&grade_filter=${encodeURIComponent(currentReportFilters.grade)}`;
    }
    if (currentReportFilters.classId && currentReportFilters.classId !== 'all') {
      url += `&classroom_id=${encodeURIComponent(currentReportFilters.classId)}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
      cache: 'no-store'
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Rapor verileri alınamadı.');
    }

    executiveReportData = data;
    renderExecutiveReports(data);

  } catch (err) {
    console.error('Rapor yükleme hatası:', err);
    showToast(`Rapor verileri yüklenemedi: ${err.message}`, 'negative');
  }
}

function renderExecutiveReports(data) {
  // 1. Dönem Seçiciyi Güncelle
  const repSeasonSelect = document.getElementById('repSeasonSelect');
  if (repSeasonSelect && repSeasonSelect.options.length <= 1 && data.seasons) {
    repSeasonSelect.innerHTML = '';
    data.seasons.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} ${s.is_active ? '(Aktif)' : ''}`;
      if (String(s.id) === String(data.active_season_id)) opt.selected = true;
      repSeasonSelect.appendChild(opt);
    });
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'Tüm Dönemler';
    if (data.active_season_id === 'all') allOpt.selected = true;
    repSeasonSelect.appendChild(allOpt);
  }

  // 2. Sınıf Seçiciyi Güncelle
  const repClassSelect = document.getElementById('repClassSelect');
  if (repClassSelect && data.classes_filter_list) {
    const prevVal = currentReportFilters.classId;
    repClassSelect.innerHTML = '<option value="all">Tüm Sınıflar</option>';
    data.classes_filter_list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.grade})`;
      if (String(c.id) === String(prevVal)) {
        opt.selected = true;
      }
      repClassSelect.appendChild(opt);
    });
  }

  // 3. Rozet ve Metrikler
  const summary = data.summary || {};
  const badge = document.getElementById('repNeedsSupportBadge');
  if (badge) badge.textContent = summary.support_needed_count || 0;

  const kpiStudents = document.getElementById('kpiTotalStudents');
  if (kpiStudents) kpiStudents.textContent = summary.total_students || 0;

  const kpiPoints = document.getElementById('kpiTotalPoints');
  if (kpiPoints) {
    const net = summary.total_points || 0;
    kpiPoints.textContent = (net > 0 ? '+' : '') + net;
    kpiPoints.style.color = net >= 0 ? '#16a34a' : '#dc2626';
  }

  const kpiNeedsSupport = document.getElementById('kpiNeedsSupport');
  if (kpiNeedsSupport) kpiNeedsSupport.textContent = summary.support_needed_count || 0;

  const kpiTopClass = document.getElementById('kpiTopClass');
  if (kpiTopClass) kpiTopClass.textContent = summary.top_class || '-';

  // 4. Beceri Dağılımları
  renderReportSkillsBreakdown(data.skills_breakdown);

  // 5. Yıldız Öğrenciler Tablosu (Top 25)
  renderReportTopStudentsTable(data.top_students || []);

  // 6. Rehberlik Destek Tablosu (En çok eksi puan alanlar)
  renderReportNeedsSupportTable(data.needs_support_students || []);

  // 7. Sınıf Sıralamaları Tablosu
  renderReportClassesTable(data.classes_ranking || []);

  // 8. İkonları tazele
  if (window.lucide) lucide.createIcons();
}

function renderReportTopStudentsTable(students) {
  const tbody = document.querySelector('#tableTopStudents tbody');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Henüz puan almış öğrenci bulunmuyor.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((st, idx) => {
    const rank = idx + 1;
    let rankBadge = '';
    if (rank === 1) rankBadge = `<span class="rank-badge-rep rank-1" title="1. Sıra">🥇</span>`;
    else if (rank === 2) rankBadge = `<span class="rank-badge-rep rank-2" title="2. Sıra">🥈</span>`;
    else if (rank === 3) rankBadge = `<span class="rank-badge-rep rank-3" title="3. Sıra">🥉</span>`;
    else rankBadge = `<span class="rank-badge-rep rank-other">${rank}</span>`;

    const avatarSvg = generateMonsterSvg(st.avatar_seed || st.id, 32);
    const kademeLabel = getKademeBadgeHtml(st.kademe);

    return `
      <tr>
        <td style="font-weight: 800; text-align: center;">${rankBadge}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${avatarSvg}
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(st.name)}</div>
              ${st.school_no ? `<div style="font-size: 0.72rem; color: var(--text-muted);">No: ${escapeHtml(st.school_no)}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="font-weight: 600;">${escapeHtml(st.class_name)}</td>
        <td>${kademeLabel}</td>
        <td style="text-align: right;">
          <span style="display: inline-block; padding: 3px 9px; border-radius: 9999px; background: #dcfce7; color: #16a34a; font-weight: 800; font-size: 0.85rem;">
            +${st.points}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderReportNeedsSupportTable(students) {
  const tbody = document.querySelector('#tableNeedsSupportStudents tbody');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: #16a34a;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
          <div style="font-weight: 700; font-size: 1rem;">Tebrikler! Destek İhtiyacı Olan veya Eksi Puanlı Öğrenci Yok</div>
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">Tüm öğrencilerin puanları pozitif veya dengede.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map((st, idx) => {
    const rank = idx + 1;
    const avatarSvg = generateMonsterSvg(st.avatar_seed || st.id, 32);
    const pts = Number(st.points);
    const ptsClass = pts < 0 ? 'background: #fee2e2; color: #dc2626;' : 'background: #f1f5f9; color: #64748b;';
    const ptsSign = pts > 0 ? `+${pts}` : pts;

    const skillsHtml = (st.negative_skills_summary && st.negative_skills_summary.length > 0)
      ? st.negative_skills_summary.map(sk => `
          <span class="rep-negative-chip" title="${escapeHtml(sk.title)} (${sk.count} kez)">
            <span>${sk.icon || '⚠️'}</span>
            <span>${escapeHtml(sk.title)}</span>
            <strong style="opacity: 0.85;">(${sk.count}x)</strong>
          </span>
        `).join('')
      : `<span style="font-size: 0.78rem; color: var(--text-muted);">-</span>`;

    return `
      <tr>
        <td style="font-weight: 800; text-align: center; color: #dc2626;">${rank}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #fee2e2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${avatarSvg}
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(st.name)}</div>
              ${st.school_no ? `<div style="font-size: 0.72rem; color: var(--text-muted);">No: ${escapeHtml(st.school_no)}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="font-weight: 600;">${escapeHtml(st.class_name)}</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 3px 9px; border-radius: 9999px; font-weight: 800; font-size: 0.85rem; ${ptsClass}">
            ${ptsSign}
          </span>
        </td>
        <td style="text-align: center; font-weight: 700; color: #b91c1c;">
          ${st.negative_event_count > 0 ? `${st.negative_event_count} kez` : '-'}
        </td>
        <td>
          <div style="display: flex; flex-wrap: wrap; max-width: 280px; gap: 2px;">
            ${skillsHtml}
          </div>
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 4px 8px; border-radius: 8px; background: #fef2f2; color: #b91c1c; font-size: 0.75rem; font-weight: 700; border: 1px solid #fecaca;">
            <span>⚠️</span> Takip & Destek
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderReportClassesTable(classes) {
  const tbody = document.querySelector('#tableClassRankings tbody');
  if (!tbody) return;

  if (!classes || classes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Sınıf verisi bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = classes.map((c, idx) => {
    const rank = idx + 1;
    let rankBadge = '';
    if (rank === 1) rankBadge = `<span class="rank-badge-rep rank-1">🥇</span>`;
    else if (rank === 2) rankBadge = `<span class="rank-badge-rep rank-2">🥈</span>`;
    else if (rank === 3) rankBadge = `<span class="rank-badge-rep rank-3">🥉</span>`;
    else rankBadge = `<span class="rank-badge-rep rank-other">${rank}</span>`;

    const kademeLabel = getKademeBadgeHtml(c.kademe);
    const totalPts = Number(c.total_points);
    const ptsSign = totalPts > 0 ? `+${totalPts}` : totalPts;

    return `
      <tr>
        <td style="font-weight: 800; text-align: center;">${rankBadge}</td>
        <td>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem;">
            <span>🏫</span>
            <span>${escapeHtml(c.name)}</span>
          </div>
        </td>
        <td>${kademeLabel}</td>
        <td style="text-align: center; font-weight: 600;">${c.student_count} öğrenci</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 3px 9px; border-radius: 9999px; background: ${totalPts >= 0 ? '#dcfce7' : '#fee2e2'}; color: ${totalPts >= 0 ? '#16a34a' : '#dc2626'}; font-weight: 800;">
            ${ptsSign}
          </span>
        </td>
        <td style="text-align: right; font-weight: 800; color: #4338ca;">
          ${c.avg_points} <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">puan / öğr.</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderReportSkillsBreakdown(breakdown) {
  const posListEl = document.getElementById('repTopPosSkillsList');
  const negListEl = document.getElementById('repTopNegSkillsList');

  if (posListEl) {
    const posSkills = (breakdown && breakdown.positive) || [];
    if (posSkills.length === 0) {
      posListEl.innerHTML = `<div style="text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.82rem;">Kayıtlı olumlu davranış bulunmuyor.</div>`;
    } else {
      posListEl.innerHTML = posSkills.slice(0, 6).map(sk => `
        <div class="rep-skill-item">
          <div class="skill-left">
            <span>${sk.icon || '⭐'}</span>
            <span>${escapeHtml(sk.title)}</span>
          </div>
          <div class="skill-right">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted);">${sk.count} kez</span>
            <span style="font-size: 0.8rem; font-weight: 800; color: #16a34a; background: #dcfce7; padding: 2px 7px; border-radius: 9999px;">+${sk.total_points}</span>
          </div>
        </div>
      `).join('');
    }
  }

  if (negListEl) {
    const negSkills = (breakdown && breakdown.needs_work) || [];
    if (negSkills.length === 0) {
      negListEl.innerHTML = `<div style="text-align: center; padding: 1rem; color: #16a34a; font-size: 0.82rem;">Geliştirilmeli davranış kaydı yok 🎉</div>`;
    } else {
      negListEl.innerHTML = negSkills.slice(0, 6).map(sk => `
        <div class="rep-skill-item" style="border-color: #fecaca; background: #fff5f5;">
          <div class="skill-left">
            <span>${sk.icon || '⚠️'}</span>
            <span>${escapeHtml(sk.title)}</span>
          </div>
          <div class="skill-right">
            <span style="font-size: 0.78rem; font-weight: 700; color: #b91c1c;">${sk.count} kez</span>
            <span style="font-size: 0.8rem; font-weight: 800; color: #dc2626; background: #fee2e2; padding: 2px 7px; border-radius: 9999px;">${sk.total_points}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

function switchReportTab(targetId) {
  document.querySelectorAll('#reportsNavTabs .rep-nav-tab').forEach(btn => {
    if (btn.getAttribute('data-target') === targetId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('#reportsModalBody .rep-tab-content').forEach(content => {
    if (content.id === targetId) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });

  if (targetId === 'repContentReset') {
    loadExecutiveArchives();
  }

  if (window.lucide) lucide.createIcons();
}

async function loadExecutiveArchives() {
  const container = document.getElementById('repArchivesList');
  if (!container) return;
  const user = getCurrentUser();
  if (!user) return;

  container.innerHTML = '<div style="text-align: center; padding: 0.5rem; color: var(--text-muted);">Arşivler yükleniyor...</div>';
  try {
    const res = await fetch(`${API_BASE_URL}reports.php?action=get_archives&user_id=${encodeURIComponent(user.id)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    const data = await res.json();
    if (!data.success || !data.archives || data.archives.length === 0) {
      container.innerHTML = '<div style="padding: 0.5rem; color: var(--text-muted); font-style: italic;">Henüz geçmiş sıfırlama arşivi bulunmuyor.</div>';
      return;
    }

    container.innerHTML = data.archives.map(a => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: #f8fafc; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 0.45rem;">
        <div>
          <strong style="color: var(--text-main); font-size: 0.88rem;">${escapeHtml(a.title)}</strong>
          <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
            ${new Date(a.created_at).toLocaleString('tr-TR')} • Sıfırlayan: ${escapeHtml(a.reset_by_user_name || 'Yönetici')}
          </div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 0.75rem; background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 9999px; font-weight: 700;">
            ${a.total_students_affected} öğrenci arşivlendi
          </span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div style="color: #dc2626; font-size: 0.8rem;">Arşivler alınamadı.</div>';
  }
}

async function resetPointsAndRestartMonth() {
  const user = getCurrentUser();
  if (!user) return;

  const titleInput = document.getElementById('inputResetArchiveTitle');
  const title = (titleInput && titleInput.value.trim()) || 'Aylık Puan Sıfırlaması';
  const executeBtn = document.getElementById('btnExecuteResetPoints');

  if (executeBtn) {
    executeBtn.disabled = true;
    executeBtn.innerHTML = '<span>Sıfırlanıyor...</span>';
  }

  try {
    const res = await fetch(`${API_BASE_URL}reports.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'reset_points',
        user_id: user.id,
        title: title,
        season_id: currentReportFilters.seasonId
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Sıfırlama işlemi gerçekleştirilemedi.');
    }

    closeModal('confirmResetPointsModal');
    showToast(data.message || 'Puanlar başarıyla sıfırlandı ve yeni ay rekabeti başladı!', 'positive');

    // 1. Dashboard ve sınıf verilerini sıfırlanmış puanlarla senkronize et
    await fetchEdulemData(null, false);

    // 2. Rapor modalı verilerini yenile
    await loadExecutiveReports();

    // 3. Arşiv listesini yenile
    await loadExecutiveArchives();

    // 4. Kutlama efekti
    if (window.confetti && confetti.launch) {
      confetti.launch(40);
    }

  } catch (err) {
    console.error('Puan sıfırlama hatası:', err);
    showToast(`Sıfırlama başarısız: ${err.message}`, 'negative');
  } finally {
    if (executeBtn) {
      executeBtn.disabled = false;
      executeBtn.innerHTML = '<i data-lucide="check"></i><span>Evet, Puanları Sıfırla</span>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

function exportReportToCsv() {
  if (!executiveReportData) {
    showToast('Henüz rapor verisi yüklenmedi.', 'info');
    return;
  }

  const dateStr = new Date().toLocaleDateString('tr-TR');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const filename = `ClassLem_Rehberlik_ve_Basari_Raporu_${now.toISOString().slice(0, 10)}.csv`;

  let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel Turkish
  csv += `ClassLem Okul Geneli Rehberlik ve Puan Raporu\r\n`;
  csv += `Tarih:;${dateStr} ${timeStr}\r\n`;
  csv += `Filtre:;Kademe: ${currentReportFilters.grade} | Sınıf: ${currentReportFilters.classId}\r\n\r\n`;

  // 1. Özet Metrikleri
  const sum = executiveReportData.summary || {};
  csv += `GENEL ÖZET METRİKLERİ\r\n`;
  csv += `Toplam Öğrenci;Toplam Net Puan;Rehberlik Destek İhtiyacı;En Başarılı Sınıf\r\n`;
  csv += `${sum.total_students || 0};${sum.total_points || 0};${sum.support_needed_count || 0};"${sum.top_class || '-'}"\r\n\r\n`;

  // 2. Yıldız Öğrenciler (Top 25)
  csv += `YILDIZ ÖĞRENCİLER (EN ÇOK PUAN ALAN İLK 25)\r\n`;
  csv += `Sıra;Öğrenci Adı;Okul No;Sınıf;Kademe;Toplam Puan\r\n`;
  (executiveReportData.top_students || []).forEach((st, idx) => {
    csv += `${idx + 1};"${st.name}";"${st.school_no || ''}";"${st.class_name || ''}";"${st.kademe || ''}";${st.points}\r\n`;
  });
  csv += `\r\n`;

  // 3. Rehberlik Destek Listesi
  csv += `REHBERLİK & DESTEK İHTİYACI OLAN ÖĞRENCİLER (EKSİ PUAN ALANLAR)\r\n`;
  csv += `Sıra;Öğrenci Adı;Okul No;Sınıf;Net Puan;Eksi Davranış Sayısı;Geliştirilmeli Davranışlar\r\n`;
  (executiveReportData.needs_support_students || []).forEach((st, idx) => {
    const skills = (st.negative_skills_summary || []).map(s => `${s.title} (${s.count}x)`).join(', ');
    csv += `${idx + 1};"${st.name}";"${st.school_no || ''}";"${st.class_name || ''}";${st.points};${st.negative_event_count};"${skills}"\r\n`;
  });
  csv += `\r\n`;

  // 4. Sınıf Sıralamaları
  csv += `SINIF BAŞARI SIRALAMASI\r\n`;
  csv += `Sıra;Sınıf;Kademe;Öğrenci Sayısı;Toplam Puan;Sınıf Ortalaması\r\n`;
  (executiveReportData.classes_ranking || []).forEach((c, idx) => {
    csv += `${idx + 1};"${c.name}";"${c.grade || ''}";${c.student_count};${c.total_points};${c.avg_points}\r\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Rapor Excel (CSV) dosyası olarak indirildi.', 'positive');
}

// ==========================================
// 18. MODAL KONTROL FONKSİYONLARI
// ==========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  // Eğer zamanlayıcı çalışıyorsa ve modal kapatıldıysa, köşedeki widget'ı otomatik göster
  if (modalId === 'timerModal' && isTimerRunning) {
    showCornerTimer();
  }
}

// ==========================================
// 19. EVENT LISTENERS VE BAŞLANGIÇ
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

  // Lucide İkonlarını Başlat
  if (window.lucide) lucide.createIcons();

  // Login Formu Olayları
  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', handleLoginSubmit);
  }
  document.getElementById('btnLoginSubmit')?.addEventListener('click', handleLoginSubmit);

  // TC Kimlik No Sadece Rakam Filtresi
  document.getElementById('inputLoginTc')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
  });

  // Şifre Göster / Gizle Butonu
  document.getElementById('btnToggleLoginPw')?.addEventListener('click', () => {
    const pwInput = document.getElementById('inputLoginPassword');
    const icon = document.getElementById('togglePwIcon');
    if (pwInput) {
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      icon?.setAttribute('data-lucide', isPw ? 'eye-off' : 'eye');
      if (window.lucide) lucide.createIcons();
    }
  });

  // Çıkış Yap Butonu
  document.getElementById('btnLogout')?.addEventListener('click', handleLogout);

  // Oturum Kontrolü ve Başlangıç Görünümü
  const user = getCurrentUser();
  if (user) {
    showAppViews();
    showDashboardView();
    fetchEdulemData(null, false);
  } else {
    showLoginView();
  }

  // Edulem Senkronize Et Butonu
  document.getElementById('btnSyncEdulem')?.addEventListener('click', () => {
    fetchEdulemData(currentSelectedSeason, true);
  });

  // Eğitim Dönemi Seçimi
  document.getElementById('seasonSelect')?.addEventListener('change', (e) => {
    fetchEdulemData(e.target.value, true);
  });

  // Kademe Filtre Sekmeleri Tıklama (İlkokul, Ortaokul, Lise)
  document.querySelectorAll('.grade-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.grade-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentKademeFilter = btn.getAttribute('data-grade') || 'all';
      renderDashboard();
    });
  });

  // Marka Tıklama
  document.getElementById('brandHomeBtn').addEventListener('click', showDashboardView);
  document.getElementById('navClassesBtn').addEventListener('click', showDashboardView);
  document.getElementById('btnBackToDashboard').addEventListener('click', showDashboardView);

  // Ses Aç/Kapat Butonu
  const soundBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  soundBtn.addEventListener('click', () => {
    const isEnabled = soundManager.toggleSound();
    soundIcon.setAttribute('data-lucide', isEnabled ? 'volume-2' : 'volume-x');
    if (window.lucide) lucide.createIcons();
    showToast(isEnabled ? 'Ses Efektleri Açık' : 'Ses Efektleri Kapatıldı', 'info');
  });

  // Tam Ekran Butonu
  document.getElementById('fullscreenToggleBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  // Sıralama ve Çoklu Seçim Butonları
  document.getElementById('btnToggleSort')?.addEventListener('click', toggleStudentSort);
  document.getElementById('btnToggleMultiSelect')?.addEventListener('click', toggleMultiSelectMode);
  document.getElementById('btnMultiAward')?.addEventListener('click', openSkillModalForMulti);
  document.getElementById('btnMultiClear').addEventListener('click', () => {
    selectedStudentIds.clear();
    toggleMultiSelectMode();
  });

  // Sekmeler (Öğrenciler / Gruplar)
  const tabStudentsBtn = document.getElementById('tabStudentsBtn');
  const tabGroupsBtn = document.getElementById('tabGroupsBtn');
  const tabContentStudents = document.getElementById('tabContentStudents');
  const tabContentGroups = document.getElementById('tabContentGroups');

  tabStudentsBtn.addEventListener('click', () => {
    currentTab = 'students';
    tabStudentsBtn.classList.add('active');
    tabGroupsBtn.classList.remove('active');
    tabContentStudents.style.display = 'block';
    tabContentGroups.style.display = 'none';
    renderClassroom();
  });

  tabGroupsBtn.addEventListener('click', () => {
    currentTab = 'groups';
    tabGroupsBtn.classList.add('active');
    tabStudentsBtn.classList.remove('active');
    tabContentStudents.style.display = 'none';
    tabContentGroups.style.display = 'block';
    renderClassroom();
  });

  // Hızlı Araçlar (Toolkit)
  document.getElementById('btnOpenNewClassModal').addEventListener('click', openNewClassModal);
  document.getElementById('btnOpenAddStudent').addEventListener('click', openAddStudentModal);
  document.getElementById('btnRandomPicker').addEventListener('click', openRandomPicker);
  document.getElementById('btnOpenTimer').addEventListener('click', openTimerModal);
  document.getElementById('btnOpenHistory').addEventListener('click', openHistoryModal);
  document.getElementById('btnManageSkills').addEventListener('click', openSkillEditor);
  document.getElementById('btnEditSkillsShortcut').addEventListener('click', openSkillEditor);
  document.getElementById('btnOpenNewGroupModal').addEventListener('click', window.openNewGroupModal);

  // Öğrenci Hızlı Yönetim Butonları (Avatar Değiştir, Ad Düzenle, Sil)
  document.getElementById('btnChangeStudentAvatar').addEventListener('click', changeCurrentStudentAvatar);
  document.getElementById('btnEditStudentModalBtn').addEventListener('click', editCurrentStudentName);
  document.getElementById('btnDeleteStudentModalBtn').addEventListener('click', deleteCurrentStudent);

  // Beceri Modal Sekmeleri (Pozitif / Geliştirilmeli)
  const skillTabPos = document.getElementById('skillTabPositive');
  const skillTabNeg = document.getElementById('skillTabNeedsWork');

  skillTabPos.addEventListener('click', () => {
    currentSkillFilter = 'positive';
    skillTabPos.classList.add('active', 'positive-tab');
    skillTabNeg.classList.remove('active', 'needs-work-tab');
    renderSkillsGrid();
  });

  skillTabNeg.addEventListener('click', () => {
    currentSkillFilter = 'needs-work';
    skillTabNeg.classList.add('active', 'needs-work-tab');
    skillTabPos.classList.remove('active', 'positive-tab');
    renderSkillsGrid();
  });

  // Yeni Beceri Ekle Formu
  document.getElementById('newSkillForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('newSkillTitle').value.trim();
    const type = document.getElementById('newSkillType').value;
    const points = Number(document.getElementById('newSkillPoints').value);
    const icon = document.getElementById('newSkillIcon').value;

    if (!title) return;

    appState.skills.push({
      id: 'sk_' + Date.now(),
      title: title,
      points: type === 'positive' ? points : -Math.abs(points),
      icon: icon,
      type: type
    });

    saveState();
    document.getElementById('newSkillTitle').value = '';
    renderEditableSkillsList();
    showToast('Yeni beceri başarıyla eklendi!', 'positive');
  });

  // Öğrenci Ekle Modal Sekmeleri
  const tabSingle = document.getElementById('tabAddSingleStudent');
  const tabBulk = document.getElementById('tabAddBulkStudents');
  const formSingle = document.getElementById('formAddSingleStudent');
  const formBulk = document.getElementById('formAddBulkStudents');

  tabSingle.addEventListener('click', () => {
    tabSingle.classList.add('active', 'positive-tab');
    tabBulk.classList.remove('active', 'positive-tab');
    formSingle.style.display = 'block';
    formBulk.style.display = 'none';
  });

  tabBulk.addEventListener('click', () => {
    tabBulk.classList.add('active', 'positive-tab');
    tabSingle.classList.remove('active', 'positive-tab');
    formSingle.style.display = 'none';
    formBulk.style.display = 'block';
  });

  formSingle.addEventListener('submit', handleAddSingleStudent);
  formBulk.addEventListener('submit', handleAddBulkStudents);
  document.getElementById('formClassSave').addEventListener('submit', handleSaveClass);
  document.getElementById('formNewGroup').addEventListener('submit', handleSaveGroup);

  // Rastgele Seçici Butonları
  document.getElementById('btnPickAgain').addEventListener('click', () => {
    const classStudents = appState.students.filter(s => String(s.classId) === String(currentClassId));
    startPickingAnimation(classStudents);
  });

  document.getElementById('btnAwardPickedStudent').addEventListener('click', () => {
    if (lastPickedStudent) {
      closeModal('randomPickerModal');
      openSkillModalForStudent(lastPickedStudent);
    }
  });

  // Zamanlayıcı Kontrolleri (Modal)
  document.getElementById('btnTimerStartPause')?.addEventListener('click', startPauseTimer);
  document.getElementById('btnTimerReset')?.addEventListener('click', resetTimer);

  document.getElementById('btnTimerSub1m')?.addEventListener('click', () => adjustTimerSeconds(-60));
  document.getElementById('btnTimerAdd1m')?.addEventListener('click', () => adjustTimerSeconds(60));

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      adjustTimerSeconds(Number(btn.getAttribute('data-sec')));
    });
  });

  document.querySelectorAll('.activity-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = Number(btn.getAttribute('data-sec'));
      const title = btn.getAttribute('data-title');
      const icon = btn.getAttribute('data-icon');
      setTimerActivityPreset(title, icon, sec);
    });
  });

  const customTitleInput = document.getElementById('timerCustomTitleInput');
  if (customTitleInput) {
    customTitleInput.addEventListener('input', (e) => {
      timerActivity.title = e.target.value.trim() || 'Etkinlik';
      const cornerTitle = document.getElementById('cornerTimerTitle');
      if (cornerTitle) cornerTitle.textContent = timerActivity.title;
      const fsTitle = document.getElementById('fsActivityTitle');
      if (fsTitle) fsTitle.textContent = timerActivity.title;
    });
  }

  const tabCountMode = document.getElementById('tabCountdownMode');
  const tabStopMode = document.getElementById('tabStopwatchMode');
  const presetsBox = document.getElementById('timerPresets');
  const actSection = document.getElementById('timerActivitySection');

  if (tabCountMode && tabStopMode) {
    tabCountMode.addEventListener('click', () => {
      tabCountMode.classList.add('active', 'positive-tab');
      tabStopMode.classList.remove('active', 'positive-tab');
      if (presetsBox) presetsBox.style.display = 'flex';
      if (actSection) actSection.style.display = 'block';
      timerMode = 'countdown';
      resetTimer();
    });

    tabStopMode.addEventListener('click', () => {
      tabStopMode.classList.add('active', 'positive-tab');
      tabCountMode.classList.remove('active', 'positive-tab');
      if (presetsBox) presetsBox.style.display = 'none';
      if (actSection) actSection.style.display = 'none';
      timerMode = 'stopwatch';
      resetTimer();
    });
  }

  document.getElementById('btnTimerMinimize')?.addEventListener('click', () => {
    closeModal('timerModal');
    showCornerTimer();
  });

  document.getElementById('btnTimerFullscreen')?.addEventListener('click', () => {
    toggleFullscreenTimer(true);
  });

  // Sağ Alt Köşe Mini Zamanlayıcı Kontrolleri
  document.getElementById('btnCornerPlayPause')?.addEventListener('click', startPauseTimer);
  document.getElementById('btnCornerAdd1m')?.addEventListener('click', () => adjustTimerSeconds(60));
  document.getElementById('btnCornerReset')?.addEventListener('click', resetTimer);
  document.getElementById('btnCornerOpenModal')?.addEventListener('click', openTimerModal);
  document.getElementById('btnCornerFullscreen')?.addEventListener('click', () => toggleFullscreenTimer(true));
  document.getElementById('btnCornerClose')?.addEventListener('click', hideCornerTimer);

  // Akıllı Tahta Tam Ekran Zamanlayıcı Kontrolleri
  document.getElementById('btnFsStartPause')?.addEventListener('click', startPauseTimer);
  document.getElementById('btnFsReset')?.addEventListener('click', resetTimer);
  document.getElementById('btnFsSub1m')?.addEventListener('click', () => adjustTimerSeconds(-60));
  document.getElementById('btnFsAdd1m')?.addEventListener('click', () => adjustTimerSeconds(60));
  document.getElementById('btnFsAdd5m')?.addEventListener('click', () => adjustTimerSeconds(300));
  document.getElementById('btnFsToggleSound')?.addEventListener('click', toggleTimerSound);
  document.getElementById('btnFsMinimizeToCorner')?.addEventListener('click', () => {
    toggleFullscreenTimer(false);
    showCornerTimer();
  });
  document.getElementById('btnFsClose')?.addEventListener('click', () => toggleFullscreenTimer(false));

  document.getElementById('btnFsCelebAgain')?.addEventListener('click', () => {
    resetTimer();
    startPauseTimer();
  });
  document.getElementById('btnFsCelebClose')?.addEventListener('click', () => {
    toggleFullscreenTimer(false);
  });

  // Escape tuşu ve Tam Ekran değişim dinleyicisi
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreenTimerVisible) {
      toggleFullscreenTimer(false);
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreenTimerVisible) {
      toggleFullscreenTimer(false);
    }
  });

  // Gürültü Ölçer Kontrolleri
  document.getElementById('btnToggleNoisePause').addEventListener('click', () => {
    noiseMeter.togglePause();
  });

  document.getElementById('btnToggleNoiseMode').addEventListener('click', () => {
    noiseMeter.toggleMode();
  });

  document.getElementById('btnOpenNoiseSettings').addEventListener('click', () => {
    const cfg = noiseMeter.config;
    document.getElementById('noiseAutoPenaltyToggle').checked = cfg.autoPenalty;
    document.getElementById('noiseThresholdSlider').value = cfg.threshold;
    document.getElementById('noiseThresholdValText').textContent = cfg.threshold;
    document.getElementById('noiseDelaySlider').value = cfg.delaySeconds;
    document.getElementById('noiseDelayValText').textContent = cfg.delaySeconds + ' sn';
    document.getElementById('noiseSensitivitySlider').value = cfg.sensitivity;
    document.getElementById('noiseSensitivityValText').textContent = cfg.sensitivity + 'x';
    openModal('noiseSettingsModal');
  });

  document.getElementById('noiseAutoPenaltyToggle').addEventListener('change', (e) => {
    noiseMeter.config.autoPenalty = e.target.checked;
    saveState();
    noiseMeter.updateControlsUI();
    showToast(e.target.checked ? 'Gürültüde otomatik puan kırma açıldı (-1).' : 'Otomatik puan kırma kapatıldı.', 'info');
  });

  document.getElementById('noiseThresholdSlider').addEventListener('input', (e) => {
    const val = Number(e.target.value);
    document.getElementById('noiseThresholdValText').textContent = val;
    noiseMeter.config.threshold = val;
    saveState();
    noiseMeter.updateUI(noiseMeter.currentLevel);
  });

  document.getElementById('noiseDelaySlider').addEventListener('input', (e) => {
    const val = Number(e.target.value);
    document.getElementById('noiseDelayValText').textContent = val + ' sn';
    noiseMeter.config.delaySeconds = val;
    saveState();
  });

  document.getElementById('noiseSensitivitySlider').addEventListener('input', (e) => {
    const val = Number(e.target.value);
    document.getElementById('noiseSensitivityValText').textContent = val + 'x';
    noiseMeter.config.sensitivity = val;
    saveState();
  });

  // Geçmişi Temizle
  document.getElementById('btnClearHistoryBtn').addEventListener('click', () => {
    if (!confirm('Tüm sınıf etkinlik geçmişini temizlemek istediğinize emin misiniz? Puanlar sıfırlanmaz.')) return;
    appState.history = (appState.history || []).filter(h => String(h.classId) !== String(currentClassId));
    saveState();
    saveActionToServer({
      action: 'clear_history',
      class_id: currentClassId
    });
    renderHistoryView();
    showToast('Geçmiş temizlendi.');
  });

  // Veri Yedekleme / Yükleme Modalı
  document.getElementById('backupModalBtn').addEventListener('click', () => openModal('backupModal'));
  document.getElementById('btnExportData').addEventListener('click', exportBackupData);

  const importInput = document.getElementById('importFileInput');
  document.getElementById('btnTriggerImport').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importBackupData(e.target.files[0]);
    }
  });

  document.getElementById('btnResetToDefaults').addEventListener('click', () => {
    if (confirm('Tüm veriler silinecek ve başlangıç örnek sınıf verilerine dönülecektir. Onaylıyor musunuz?')) {
      appState = generateDefaultData();
      saveState();
      closeModal('backupModal');
      showDashboardView();
      showToast('Varsayılan verilere dönüldü.', 'info');
    }
  });

  // Modal Kapatma Düğmeleri (data-close)
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-close'));
    });
  });

  // Modal Dışına Tıklayınca Kapat
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // ==========================================
  // Rehberlik & İdare Raporlama Olayları
  // ==========================================
  document.getElementById('btnExecutiveReport')?.addEventListener('click', openExecutiveReportsModal);
  document.getElementById('btnExecutiveReportDashboard')?.addEventListener('click', openExecutiveReportsModal);
  document.getElementById('btnExecutiveReportClassroom')?.addEventListener('click', openExecutiveReportsModal);
  document.getElementById('btnExecutiveReportBanner')?.addEventListener('click', openExecutiveReportsModal);

  // Rapor Sekmeleri Geçişi
  document.querySelectorAll('#reportsNavTabs .rep-nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target) switchReportTab(target);
    });
  });

  // Rapor Kademe Filtre Butonları
  document.querySelectorAll('#repGradeTabs .rep-tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#repGradeTabs .rep-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentReportFilters.grade = btn.getAttribute('data-repgrade') || 'all';
      currentReportFilters.classId = 'all';
      const repClassSelect = document.getElementById('repClassSelect');
      if (repClassSelect) repClassSelect.value = 'all';
      await loadExecutiveReports();
    });
  });

  // Rapor Sınıf Seçici
  document.getElementById('repClassSelect')?.addEventListener('change', async (e) => {
    currentReportFilters.classId = e.target.value;
    await loadExecutiveReports();
  });

  // Rapor Dönem Seçici
  document.getElementById('repSeasonSelect')?.addEventListener('change', async (e) => {
    currentReportFilters.seasonId = e.target.value;
    await loadExecutiveReports();
  });

  // Rapor Çıktı ve İndirme Butonları
  document.getElementById('btnRepExportPrint')?.addEventListener('click', () => {
    window.print();
  });
  document.getElementById('btnRepExportCsv')?.addEventListener('click', exportReportToCsv);
  document.getElementById('btnDownloadReportBeforeReset')?.addEventListener('click', exportReportToCsv);

  // Puan Sıfırlama ve Yeni Ay Rekabeti Başlatma
  document.getElementById('btnOpenConfirmResetModal')?.addEventListener('click', () => {
    const now = new Date();
    const monthName = now.toLocaleString('tr-TR', { month: 'long' });
    const titleInput = document.getElementById('inputResetArchiveTitle');
    if (titleInput) {
      titleInput.value = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${now.getFullYear()} Ay Sonu Puan Sıfırlaması`;
    }
    openModal('confirmResetPointsModal');
  });

  document.getElementById('btnExecuteResetPoints')?.addEventListener('click', resetPointsAndRestartMonth);

  // Mobil Alt Menü Butonları
  document.getElementById('mobNavClasses').addEventListener('click', showDashboardView);
  document.getElementById('mobNavStudents').addEventListener('click', () => {
    if (currentClassId) {
      showClassroomView(currentClassId);
    } else if (appState.classes.length > 0) {
      showClassroomView(appState.classes[0].id);
    } else {
      showDashboardView();
    }
  });
  document.getElementById('mobNavRandom').addEventListener('click', () => {
    if (!currentClassId && appState.classes.length > 0) showClassroomView(appState.classes[0].id);
    openRandomPicker();
  });
  document.getElementById('mobNavTimer').addEventListener('click', openTimerModal);
  document.getElementById('mobNavReport').addEventListener('click', () => {
    const user = getCurrentUser();
    if (isExecutiveUser(user)) {
      openExecutiveReportsModal();
    } else {
      if (!currentClassId && appState.classes.length > 0) showClassroomView(appState.classes[0].id);
      openHistoryModal();
    }
  });
});
