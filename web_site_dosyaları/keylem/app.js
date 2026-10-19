/**
 * KeyLem - Akıllı Tahta Kilit & ClassLem Şampiyonlar Podyumu Motoru (app.js)
 */

// ── Varsayılan Yapılandırma ──
const CONFIG = {
  defaultClassroom: '1-A',
  defaultClassroomId: '224',
  defaultMasterPin: '849201',
  defaultSecretKey: 'JBSWY3DPEHPK3PXP', // Base32 TOTP Key
  defaultDurationMinutes: 40,
  apiBase: 'api'
};

// ── Durum (State) ──
const state = {
  classroomId: localStorage.getItem('keylem_classroom_id') || CONFIG.defaultClassroomId,
  classroomName: localStorage.getItem('keylem_classroom_name') || CONFIG.defaultClassroom,
  masterPin: localStorage.getItem('keylem_master_pin') || CONFIG.defaultMasterPin,
  secretKey: localStorage.getItem('keylem_secret_key') || CONFIG.defaultSecretKey,
  durationMinutes: parseInt(localStorage.getItem('keylem_duration') || CONFIG.defaultDurationMinutes, 10),
  pinBuffer: '',
  isLocked: true,
  timerInterval: null,
  secondsLeft: 0,
  students: [],
  allClasses: []
};

// ── DOM Elemanları ──
const elements = {
  lockOverlay: document.getElementById('lockOverlay'),
  classroomIndicator: document.getElementById('classroomIndicator'),
  podiumClassLabel: document.getElementById('podiumClassLabel'),
  podiumStage: document.getElementById('podiumStage'),
  leaderboardTrack: document.getElementById('leaderboardTrack'),
  pinDots: document.querySelectorAll('.pin-dot'),
  feedbackText: document.getElementById('feedbackText'),
  floatingBar: document.getElementById('floatingBar'),
  floatingTimer: document.getElementById('floatingTimer'),
  clockTime: document.getElementById('clockTime'),
  clockDate: document.getElementById('clockDate'),
  setupModal: document.getElementById('setupModal'),
  classroomSelect: document.getElementById('classroomSelect'),
  classlemFrame: document.getElementById('classlemFrame'),
  unlockedDesktop: document.getElementById('unlockedDesktop'),
  desktopClassLabel: document.getElementById('desktopClassLabel'),
  classlemContainer: document.getElementById('classlemContainer'),
  btnLaunchClasslem: document.getElementById('btnLaunchClasslem'),
  btnLaunchClasslemDesktop: document.getElementById('btnLaunchClasslemDesktop'),
  btnCloseClasslem: document.getElementById('btnCloseClasslem'),
  classlemHeaderSub: document.getElementById('classlemHeaderSub'),
  btnMinimizeToDesktop: document.getElementById('btnMinimizeToDesktop'),
  btnMinimizeBar: document.getElementById('btnMinimizeBar')
};

// ── 1. ClassLem Canavar Avatar Üreteci (generateMonsterSvg) ──
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

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateMonsterSvg(seedInput, size = 80) {
  const seed = typeof seedInput === 'number' ? seedInput : Math.abs(hashString(String(seedInput || '1')));
  const color = MONSTER_COLORS[seed % MONSTER_COLORS.length];
  const bodyShapeIndex = seed % 4;
  const eyeStyle = (seed >> 1) % 3;
  const hornStyle = (seed >> 2) % 3;

  let horns = '';
  if (hornStyle === 1) {
    horns = `
      <polygon points="28,24 35,8 42,20" fill="${color.accent}" />
      <polygon points="72,24 65,8 58,20" fill="${color.accent}" />
    `;
  } else if (hornStyle === 2) {
    horns = `
      <path d="M50,22 Q50,6 64,8" stroke="${color.accent}" stroke-width="4" stroke-linecap="round" fill="none"/>
      <circle cx="64" cy="8" r="6" fill="#fbbf24" />
    `;
  }

  let body = '';
  if (bodyShapeIndex === 0) {
    body = `
      <ellipse cx="50" cy="55" rx="38" ry="36" fill="${color.bg}" />
      <ellipse cx="50" cy="62" rx="22" ry="18" fill="${color.belly}" />
    `;
  } else if (bodyShapeIndex === 1) {
    body = `
      <rect x="18" y="24" width="64" height="64" rx="30" fill="${color.bg}" />
      <rect x="28" y="44" width="44" height="36" rx="18" fill="${color.belly}" />
    `;
  } else {
    body = `
      <ellipse cx="50" cy="54" rx="36" ry="34" fill="${color.bg}" />
      <polygon points="50,14 42,26 58,26" fill="${color.bg}" />
      <ellipse cx="50" cy="62" rx="20" ry="17" fill="${color.belly}" />
    `;
  }

  const feet = `
    <ellipse cx="36" cy="88" rx="8" ry="5" fill="${color.accent}" />
    <ellipse cx="64" cy="88" rx="8" ry="5" fill="${color.accent}" />
  `;

  let eyes = '';
  if (eyeStyle === 0) {
    eyes = `
      <circle cx="50" cy="44" r="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <circle cx="50" cy="44" r="8" fill="${color.accent}" />
      <circle cx="50" cy="44" r="4" fill="#0f172a" />
      <circle cx="47" cy="41" r="2.5" fill="#ffffff" />
    `;
  } else {
    eyes = `
      <circle cx="36" cy="44" r="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <circle cx="64" cy="44" r="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <circle cx="37" cy="44" r="6" fill="#0f172a" />
      <circle cx="63" cy="44" r="6" fill="#0f172a" />
      <circle cx="35" cy="42" r="2.5" fill="#ffffff" />
      <circle cx="61" cy="42" r="2.5" fill="#ffffff" />
    `;
  }

  const mouth = `
    <path d="M40,68 Q50,78 60,68" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
  `;

  return `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" style="overflow: visible;">
      ${horns}
      ${feet}
      ${body}
      ${eyes}
      ${mouth}
    </svg>
  `;
}

// ── 2. Sınıf Şampiyonlar Podyumunu Yükle ve Render Et ──
async function loadClassroomPodium() {
  if (elements.classroomIndicator) {
    elements.classroomIndicator.textContent = `🏫 ${state.classroomName} Sınıfı`;
  }
  if (elements.podiumClassLabel) {
    elements.podiumClassLabel.textContent = state.classroomName;
  }

  let classData = null;

  // 1. Önce ../classlem/api/get_data.php?demo=1 veya yerel API'den çek
  try {
    const res = await fetch('../classlem/api/get_data.php?demo=1');
    if (res.ok) {
      classData = await res.json();
    }
  } catch (_) {}

  if (!classData) {
    try {
      const res2 = await fetch(`api/class_podium.php?classroom_name=${encodeURIComponent(state.classroomName)}`);
      if (res2.ok) {
        const d = await res2.json();
        if (d.success && d.all_students) {
          renderPodiumFromStudents(d.all_students);
          return;
        }
      }
    } catch (_) {}
  }

  if (classData && classData.classes && classData.students) {
    state.allClasses = classData.classes;

    // Seçilen sınıfı bul
    let targetClass = classData.classes.find(
      c => String(c.id) === String(state.classroomId) || c.name.trim().toLowerCase() === state.classroomName.trim().toLowerCase()
    );

    if (!targetClass && classData.classes.length > 0) {
      targetClass = classData.classes[0];
      state.classroomId = String(targetClass.id);
      state.classroomName = targetClass.name;
    }

    if (targetClass) {
      const classStudents = classData.students.filter(s => String(s.classId) === String(targetClass.id));
      classStudents.sort((a, b) => (b.points || 0) - (a.points || 0));
      state.students = classStudents;

      // Çevrimdışı için önbelleğe al
      localStorage.setItem(`keylem_cache_${state.classroomName}`, JSON.stringify(classStudents));

      renderPodiumFromStudents(classStudents);
      return;
    }
  }

  // Çevrimdışı önbellekten dene
  const cached = localStorage.getItem(`keylem_cache_${state.classroomName}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      renderPodiumFromStudents(parsed);
      return;
    } catch (_) {}
  }

  // Hiç veri gelmediyse örnek sınıf şampiyonları göster
  renderPodiumFromStudents([
    { id: '1', name: 'Ali Kaya', points: 18, avatarSeed: 101 },
    { id: '2', name: 'Zeynep Demir', points: 15, avatarSeed: 202 },
    { id: '3', name: 'Caner Şahin', points: 12, avatarSeed: 303 },
    { id: '4', name: 'Elif Yıldız', points: 10, avatarSeed: 404 },
    { id: '5', name: 'Burak Çelik', points: 8, avatarSeed: 505 },
    { id: '6', name: 'Selin Öztürk', points: 7, avatarSeed: 606 },
  ]);
}

function renderPodiumFromStudents(students) {
  if (!elements.podiumStage) return;

  if (!students || students.length === 0) {
    elements.podiumStage.innerHTML = `
      <div style="text-align: center; color: #94a3b8; padding: 20px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🎒</div>
        <h3>Bu sınıfta henüz öğrenci bulunmuyor.</h3>
      </div>
    `;
    return;
  }

  const first = students[0] || null;
  const second = students[1] || null;
  const third = students[2] || null;
  const rest = students.slice(3, 11);

  let html = `<div class="podium-stage">`;

  // 🥈 2. SIRA (GÜMÜŞ - SOL)
  if (second) {
    html += `
      <div class="podium-slot place-2">
        <div class="podium-crown">🥈</div>
        <div class="podium-avatar-box">
          ${generateMonsterSvg(second.avatarSeed || second.name, 72)}
        </div>
        <div class="podium-name-plate plate-silver">
          <span class="podium-student-name">${escapeHtml(second.name)}</span>
        </div>
        <div class="podium-block block-2">
          <div class="podium-rank-num">2</div>
          <div class="podium-score-pill">⭐ ${second.points || 0} Puan</div>
        </div>
      </div>
    `;
  }

  // 👑 1. SIRA (ALTIN KRALİYET - ORTA)
  if (first) {
    html += `
      <div class="podium-slot place-1">
        <div class="podium-crown">👑</div>
        <div class="podium-avatar-box">
          ${generateMonsterSvg(first.avatarSeed || first.name, 88)}
        </div>
        <div class="podium-name-plate plate-gold">
          <span class="podium-student-name">${escapeHtml(first.name)}</span>
        </div>
        <div class="podium-block block-1">
          <div class="podium-rank-num">1</div>
          <div class="podium-score-pill">⭐ ${first.points || 0} Puan</div>
        </div>
      </div>
    `;
  }

  // 🥉 3. SIRA (BRONZ - SAĞ)
  if (third) {
    html += `
      <div class="podium-slot place-3">
        <div class="podium-crown">🥉</div>
        <div class="podium-avatar-box">
          ${generateMonsterSvg(third.avatarSeed || third.name, 66)}
        </div>
        <div class="podium-name-plate plate-bronze">
          <span class="podium-student-name">${escapeHtml(third.name)}</span>
        </div>
        <div class="podium-block block-3">
          <div class="podium-rank-num">3</div>
          <div class="podium-score-pill">⭐ ${third.points || 0} Puan</div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  elements.podiumStage.innerHTML = html;

  // Lider Tablosu (4, 5, 6, ...)
  if (elements.leaderboardTrack) {
    if (rest.length > 0) {
      elements.leaderboardTrack.innerHTML = rest.map((s, idx) => `
        <div class="lb-item">
          <div class="lb-rank">${idx + 4}</div>
          <div class="lb-avatar">${generateMonsterSvg(s.avatarSeed || s.name, 24)}</div>
          <div class="lb-name">${escapeHtml(s.name)}</div>
          <div class="lb-score">⭐ ${s.points || 0}</div>
        </div>
      `).join('');
    } else {
      elements.leaderboardTrack.innerHTML = `<span style="font-size: 12px; color: #64748b;">Sınıfta başka puanlı öğrenci yok.</span>`;
    }
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// ── 3. Pure JS Çevrimdışı TOTP Algoritması (RFC 6238) ──
function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  let output = [];

  for (let i = 0; i < clean.length; i++) {
    let val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function generateOfflineTOTP(secretBase32, timeOffsetSteps = 0) {
  try {
    const epochSeconds = Math.floor(Date.now() / 1000);
    const step = 30;
    const timeStep = Math.floor(epochSeconds / step) + timeOffsetSteps;

    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, 0, false);
    view.setUint32(4, timeStep, false);

    const keyBytes = base32ToBytes(secretBase32);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
    const sigBytes = new Uint8Array(signature);

    const offset = sigBytes[sigBytes.length - 1] & 0x0f;
    const binary =
      ((sigBytes[offset] & 0x7f) << 24) |
      ((sigBytes[offset + 1] & 0xff) << 16) |
      ((sigBytes[offset + 2] & 0xff) << 8) |
      (sigBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (err) {
    return null;
  }
}

// ── 4. Saat & Tarih ──
function startClock() {
  function update() {
    const now = new Date();
    if (elements.clockTime) {
      elements.clockTime.textContent = now.toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    if (elements.clockDate) {
      elements.clockDate.textContent = now.toLocaleDateString('tr-TR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  }
  update();
  setInterval(update, 1000);
}

// ── 5. Numpad İşlemleri ──
function updatePinDots() {
  elements.pinDots.forEach((dot, idx) => {
    if (idx < state.pinBuffer.length) {
      dot.classList.add('filled');
      dot.textContent = '●';
    } else {
      dot.classList.remove('filled', 'error');
      dot.textContent = '';
    }
  });
}

function handleNumpadPress(digit) {
  if (!state.isLocked || state.pinBuffer.length >= 6) return;

  state.pinBuffer += digit;
  updatePinDots();
  setFeedback('');

  if (state.pinBuffer.length === 6) {
    verifyPin(state.pinBuffer);
  }
}

function handleBackspace() {
  if (state.pinBuffer.length > 0) {
    state.pinBuffer = state.pinBuffer.slice(0, -1);
    updatePinDots();
    setFeedback('');
  }
}

function handleClear() {
  state.pinBuffer = '';
  updatePinDots();
  setFeedback('');
}

function setFeedback(msg, type = '') {
  if (!elements.feedbackText) return;
  elements.feedbackText.textContent = msg;
  elements.feedbackText.className = 'numpad-feedback ' + type;
}

// ── 6. Doğrulama Motoru (Master PIN & TOTP) ──
async function verifyPin(code) {
  setFeedback('Doğrulanıyor...', '');

  // 1. Master PIN (Her koşulda açar)
  if (code === state.masterPin) {
    unlockBoard('Master Acil Durum Kodu ile Açıldı', true);
    return;
  }

  // 2. Çevrimdışı TOTP (±1 adım tölerans)
  for (let offset of [-1, 0, 1]) {
    const validOtp = await generateOfflineTOTP(state.secretKey, offset);
    if (validOtp && code === validOtp) {
      unlockBoard('Öğretmen Anahtarı Doğrulandı', false);
      return;
    }
  }

  // 3. Online Teyit
  try {
    const res = await fetch(`${CONFIG.apiBase}/verify.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        classroom_id: state.classroomId,
        classroom_name: state.classroomName
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        unlockBoard(data.message, data.is_master);
        return;
      }
    }
  } catch (_) {}

  triggerErrorFeedback('Geçersiz veya süresi dolmuş kod!');
}

function triggerErrorFeedback(msg) {
  setFeedback(msg, 'error');
  elements.pinDots.forEach(d => d.classList.add('error'));
  setTimeout(() => {
    state.pinBuffer = '';
    updatePinDots();
  }, 900);
}

// ── 7. ClassLem & Masaüstü Kayan Widget Yönetimi ──
function openClasslem() {
  if (!elements.classlemContainer) return;
  state.viewMode = 'classlem';
  document.body.classList.remove('widget-mode');
  document.body.classList.add('classlem-mode');

  // Arka plan Windows köprüsüne pencereyi tam ekran yapma sinyali
  document.title = "KEYLEM_ACTION_EXPAND";

  const targetUrl = `../classlem/index.html?classroom=${encodeURIComponent(state.classroomName)}`;
  if (elements.classlemFrame) {
    if (!elements.classlemFrame.src || elements.classlemFrame.src === 'about:blank' || !elements.classlemFrame.src.includes('classlem/index.html')) {
      elements.classlemFrame.src = targetUrl;
    }
  }
  elements.classlemContainer.classList.remove('hidden');
  if (elements.btnLaunchClasslem) {
    elements.btnLaunchClasslem.classList.add('active');
  }
  if (elements.classlemHeaderSub) {
    elements.classlemHeaderSub.textContent = `${state.classroomName} Sınıfı Canlı Oturum`;
  }

  setTimeout(() => {
    document.title = `KeyLem - ClassLem (${state.classroomName})`;
  }, 1200);
}

function closeClasslem() {
  if (!elements.classlemContainer) return;
  elements.classlemContainer.classList.add('hidden');
  if (elements.btnLaunchClasslem) {
    elements.btnLaunchClasslem.classList.remove('active');
  }
}

function toggleClasslem() {
  if (!elements.classlemContainer) return;
  if (elements.classlemContainer.classList.contains('hidden')) {
    openClasslem();
  } else {
    closeClasslem();
    switchToWidgetMode();
  }
}

// ── 8. Masaüstü Kayan Widget (Always-On-Top) Moduna Geçiş ──
function switchToWidgetMode() {
  state.viewMode = 'widget';
  document.body.classList.remove('classlem-mode');
  document.body.classList.add('widget-mode'); // Widget modunu CSS'e bildir (tüm içeriği gizle)

  closeClasslem();

  // Kalan süreyi başlığa kodla: Bridge bu değeri okuyarak tarayıcıyı küçültür ve native widget'ı başlatır
  const secondsLeft = state.secondsLeft || 2400;
  document.title = `KEYLEM_ACTION_WIDGET_${secondsLeft}`;

  // 1.5 saniye içinde başlığı temizle (Bridge zaten okumuştur)
  setTimeout(() => {
    document.title = `KeyLem - ${state.classroomName}`;
  }, 1500);
}

function minimizeToDesktop() {
  if (state.viewMode === 'classlem') {
    closeClasslem();
    switchToWidgetMode();
  } else {
    switchToWidgetMode();
  }
}

// ── 9. Kilit Açma ve Ders Modu ──
function unlockBoard(message, isMaster) {
  setFeedback(message, 'success');
  state.isLocked = false;

  setTimeout(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    elements.lockOverlay.classList.add('unlocked');
    elements.floatingBar.classList.remove('hidden');

    if (elements.desktopClassLabel) {
      elements.desktopClassLabel.textContent = state.classroomName;
    }

    closeClasslem();
    startLessonTimer(state.durationMinutes * 60);
    state.pinBuffer = '';
    updatePinDots();
    setFeedback('');

    // Sağ üstte masaüstü widget'ına geç
    setTimeout(() => {
      switchToWidgetMode();
    }, 300);
  }, 400);
}

function startLessonTimer(seconds) {
  clearInterval(state.timerInterval);
  state.secondsLeft = seconds;

  function updateDisplay() {
    const mins = Math.floor(state.secondsLeft / 60);
    const secs = state.secondsLeft % 60;
    elements.floatingTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateDisplay();

  state.timerInterval = setInterval(() => {
    state.secondsLeft--;
    updateDisplay();
    if (state.secondsLeft <= 0) {
      if (state.viewMode !== 'widget') {
        clearInterval(state.timerInterval);
        lockBoard('Ders süresi tamamlandı. Tahta kilitlendi.');
      }
    }
  }, 1000);
}

function extendTime(extraMinutes) {
  state.secondsLeft += extraMinutes * 60;
  // Güncel süreyi hemen ekranda göster
  if (elements.floatingTimer) {
    const mins = Math.floor(state.secondsLeft / 60);
    const secs = state.secondsLeft % 60;
    elements.floatingTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

function lockBoard(reason = 'Tahta Kilitlendi') {
  clearInterval(state.timerInterval);
  state.isLocked = true;
  state.viewMode = 'locked';

  document.body.classList.remove('widget-mode');
  document.body.classList.remove('classlem-mode');

  // Windows Arka Plan Bekçisine Pencereyi Tam Ekran Yap ve Öne Getir Sinyali Gönder
  document.title = "KEYLEM_ACTION_LOCK";

  // ClassLem penceresini kapat
  closeClasslem();

  elements.lockOverlay.classList.remove('unlocked');
  elements.floatingBar.classList.add('hidden');

  state.pinBuffer = '';
  updatePinDots();
  loadClassroomPodium();
  setFeedback(reason, 'error');

  setTimeout(() => {
    document.title = "KeyLem - Akıllı Tahta Kilit Sistemi";
    setFeedback('');
  }, 2000);
}

// ── 8. Kurulum Sihirbazı & PIN Doğrulama ──
const pinAuthModal = document.getElementById('pinAuthModal');
const setupWizardModal = document.getElementById('setupWizardModal');
const authPinInput = document.getElementById('authPinInput');
const pinAuthError = document.getElementById('pinAuthError');
const classroomSelect = document.getElementById('classroomSelect');
const classroomSaveNotice = document.getElementById('classroomSaveNotice');

function openPinAuthModal() {
  const modal = document.getElementById('pinAuthModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    const input = document.getElementById('authPinInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 80);
    }
    const err = document.getElementById('pinAuthError');
    if (err) err.textContent = '';
  }
}

function closePinAuthModal() {
  const modal = document.getElementById('pinAuthModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function openSetupWizardModal() {
  closePinAuthModal();
  const sModal = document.getElementById('setupWizardModal');
  if (sModal) {
    sModal.classList.remove('hidden');
    sModal.style.display = 'flex';
    populateClassroomsDropdown();
    prepareBatDownloadLink();
  }
}

function closeSetupWizardModal() {
  const sModal = document.getElementById('setupWizardModal');
  if (sModal) {
    sModal.classList.add('hidden');
    sModal.style.display = 'none';
  }
}

window.openPinAuthModal = openPinAuthModal;
window.closePinAuthModal = closePinAuthModal;
window.openSetupWizardModal = openSetupWizardModal;
window.closeSetupWizardModal = closeSetupWizardModal;

// Windows Tek Tıkla Kurulum Paketi (.bat) Dinamik Olarak Hazırla
function prepareBatDownloadLink() {
  const currentUrl = window.location.href.split('#')[0].split('?')[0];

  function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  const bridgeCode = `# KeyLem - Akilli Tahta Windows Pencere Yoneticisi & Arka Plan Koprusu
# JavaScript tarafindan gonderilen komutlari Win32 API seviyesinde isler:
# KEYLEM_ACTION_WIDGET_<saniye> -> Tarayiciyi simge durumuna indir, native WPF widget'ini baslat
# KEYLEM_ACTION_LOCK / KEYLEM_ACTION_EXPAND -> Tarayiciyi tam ekran yap
# KEYLEM_ACTION_MINIMIZE -> Tarayiciyi gorev cubuguna indir

$myPid = $PID
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $myPid -and $_.CommandLine -match "powershell.*-File.*KeyLem-Bridge\.ps1"
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class KeyLemWin32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
"@ -ErrorAction SilentlyContinue

$SW_MAXIMIZE = 3
$SW_MINIMIZE = 6
$SW_RESTORE  = 9

$lastAction = ""
$widgetProc = $null

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = "C:\\KeyLem" }
$widgetScript = Join-Path $scriptDir "KeyLem-Widget.ps1"
if (-not (Test-Path $widgetScript)) { $widgetScript = "C:\\KeyLem\\KeyLem-Widget.ps1" }

while ($true) {
    Start-Sleep -Milliseconds 250
    try {
        $processes = Get-Process -Name chrome, msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' }
        foreach ($proc in $processes) {
            $title = $proc.MainWindowTitle
            $hwnd  = $proc.MainWindowHandle
            if ($hwnd -eq [IntPtr]::Zero) { continue }

            # ── WIDGET: Tarayiciyi simge durumuna indir, WPF widget baslat ──
            if ($title -match "KEYLEM_ACTION_WIDGET_(\\d+)" -and $lastAction -ne "WIDGET") {
                $lastAction = "WIDGET"
                $secs = [int]$matches[1]

                [KeyLemWin32]::ShowWindow($hwnd, $SW_MINIMIZE) | Out-Null
                [KeyLemWin32]::PostMessage($hwnd, 0x0112, [IntPtr]0xF020, [IntPtr]::Zero) | Out-Null

                if ($widgetProc -ne $null -and !$widgetProc.HasExited) {
                    try { $widgetProc.Kill() } catch {}
                }

                if (Test-Path $widgetScript) {
                    $widgetProc = Start-Process powershell.exe -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$widgetScript\`" -Seconds $secs" -PassThru
                }
            }
            # ── LOCK / EXPAND: Tam ekran yap ve one getir ──
            elseif (($title -like "*KEYLEM_ACTION_LOCK*" -or $title -like "*KEYLEM_ACTION_EXPAND*") -and $lastAction -ne "FULLSCREEN") {
                $lastAction = "FULLSCREEN"
                if ($widgetProc -ne $null -and !$widgetProc.HasExited) {
                    try { $widgetProc.Kill() } catch {}
                }
                [KeyLemWin32]::ShowWindow($hwnd, $SW_RESTORE) | Out-Null
                [KeyLemWin32]::ShowWindow($hwnd, $SW_MAXIMIZE) | Out-Null
                [KeyLemWin32]::PostMessage($hwnd, 0x0112, [IntPtr]0xF030, [IntPtr]::Zero) | Out-Null
                [KeyLemWin32]::BringWindowToTop($hwnd) | Out-Null
                [KeyLemWin32]::SetForegroundWindow($hwnd) | Out-Null
            }
            # ── MINIMIZE: Sadece simge durumuna indir ──
            elseif ($title -like "*KEYLEM_ACTION_MINIMIZE*" -and $lastAction -ne "MINIMIZE") {
                $lastAction = "MINIMIZE"
                [KeyLemWin32]::ShowWindow($hwnd, $SW_MINIMIZE) | Out-Null
            }
            elseif ($title -notlike "*KEYLEM_ACTION_*") {
                $lastAction = ""
            }
        }
    }
    catch {}
}
`;

  const widgetCode = `# KeyLem - Akilli Tahta Kayan Masaustu Widget'i (Always-On-Top)
param([int]$Seconds = 2400)

$myPid = $PID
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $myPid -and $_.CommandLine -match "powershell.*-File.*KeyLem-Widget\.ps1"
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class KLW32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
"@ -ErrorAction SilentlyContinue

$SW_MAXIMIZE = 3
$SW_RESTORE  = 9

function Restore-Browser([string]$keyToSend = "") {
    $procs = Get-Process -Name chrome, msedge -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
            [KLW32]::ShowWindow($p.MainWindowHandle, $SW_RESTORE) | Out-Null
            [KLW32]::ShowWindow($p.MainWindowHandle, $SW_MAXIMIZE) | Out-Null
            [KLW32]::PostMessage($p.MainWindowHandle, 0x0112, [IntPtr]0xF030, [IntPtr]::Zero) | Out-Null
            [KLW32]::BringWindowToTop($p.MainWindowHandle) | Out-Null
            [KLW32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
        }
    }
    if ($keyToSend -ne "") {
        Start-Sleep -Milliseconds 250
        [System.Windows.Forms.SendKeys]::SendWait($keyToSend)
    }
}

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="KeyLemWidget"
        Height="58" Width="490"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        Topmost="True"
        ShowInTaskbar="False"
        ResizeMode="NoResize"
        WindowStartupLocation="Manual">
  <Border CornerRadius="29" BorderThickness="1.5">
    <Border.Background>
      <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
        <GradientStop Color="#E60F172A" Offset="0"/>
        <GradientStop Color="#E6111827" Offset="1"/>
      </LinearGradientBrush>
    </Border.Background>
    <Border.BorderBrush>
      <SolidColorBrush Color="#6038BDF8"/>
    </Border.BorderBrush>
    <Border.Effect>
      <DropShadowEffect BlurRadius="20" ShadowDepth="6" Opacity="0.7" Color="#000000"/>
    </Border.Effect>
    <Grid Margin="12,0" Height="44" VerticalAlignment="Center">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>

      <Button Name="btnClasslem" Grid.Column="0"
              Padding="14,0" Height="36" Margin="0,0,10,0"
              FontSize="13" FontWeight="Bold" Foreground="White" BorderThickness="0"
              VerticalAlignment="Center" Cursor="Hand">
        <Button.Content>
          <StackPanel Orientation="Horizontal">
            <TextBlock Text="&#x26A1; " FontSize="14" VerticalAlignment="Center"/>
            <TextBlock Text="ClassLem" FontSize="13" FontWeight="Bold" VerticalAlignment="Center"/>
          </StackPanel>
        </Button.Content>
        <Button.Background>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
            <GradientStop Color="#2563EB" Offset="0"/>
            <GradientStop Color="#1D4ED8" Offset="1"/>
          </LinearGradientBrush>
        </Button.Background>
        <Button.Template>
          <ControlTemplate TargetType="Button">
            <Border Background="{TemplateBinding Background}" CornerRadius="18" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
          </ControlTemplate>
        </Button.Template>
      </Button>

      <StackPanel Grid.Column="1" Orientation="Horizontal" HorizontalAlignment="Center" VerticalAlignment="Center" Margin="4,0">
        <TextBlock Text="&#x23F1; " Foreground="#34D399" FontSize="16" VerticalAlignment="Center"/>
        <TextBlock Name="txtTimer" Text="40:00" Foreground="#34D399" FontWeight="ExtraBold" FontSize="18" VerticalAlignment="Center"/>
      </StackPanel>

      <Button Name="btnExtend" Grid.Column="2"
              Padding="10,0" Height="32" Margin="0,0,8,0"
              FontSize="12" FontWeight="SemiBold" Foreground="#E2E8F0" BorderThickness="0"
              VerticalAlignment="Center" Cursor="Hand">
        <Button.Content>
          <TextBlock Text="+10 Dk" FontSize="12" FontWeight="SemiBold"/>
        </Button.Content>
        <Button.Background>
          <SolidColorBrush Color="#334155"/>
        </Button.Background>
        <Button.Template>
          <ControlTemplate TargetType="Button">
            <Border Background="{TemplateBinding Background}" CornerRadius="16" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
          </ControlTemplate>
        </Button.Template>
      </Button>

      <Button Name="btnLock" Grid.Column="3"
              Padding="14,0" Height="36"
              FontSize="13" FontWeight="Bold" Foreground="White" BorderThickness="0"
              VerticalAlignment="Center" Cursor="Hand">
        <Button.Content>
          <StackPanel Orientation="Horizontal">
            <TextBlock Text="&#x1F512; " FontSize="13" VerticalAlignment="Center"/>
            <TextBlock Text="Kilitle" FontSize="13" FontWeight="Bold" VerticalAlignment="Center"/>
          </StackPanel>
        </Button.Content>
        <Button.Background>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
            <GradientStop Color="#DC2626" Offset="0"/>
            <GradientStop Color="#B91C1C" Offset="1"/>
          </LinearGradientBrush>
        </Button.Background>
        <Button.Template>
          <ControlTemplate TargetType="Button">
            <Border Background="{TemplateBinding Background}" CornerRadius="18" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
          </ControlTemplate>
        </Button.Template>
      </Button>
    </Grid>
  </Border>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [System.Windows.Markup.XamlReader]::Load($reader)

$sw = [System.Windows.SystemParameters]::PrimaryScreenWidth
$window.Left = $sw - 490 - 16
$window.Top = 16

$window.Add_MouseLeftButtonDown({ $window.DragMove() })

$btnClasslem = $window.FindName("btnClasslem")
$txtTimer    = $window.FindName("txtTimer")
$btnExtend   = $window.FindName("btnExtend")
$btnLock     = $window.FindName("btnLock")

$script:secondsLeft = $Seconds

function Format-Time([int]$s) {
    "{0:D2}:{1:D2}" -f [int][Math]::Floor($s / 60), ($s % 60)
}

$txtTimer.Text = Format-Time $script:secondsLeft

$btnClasslem.Add_Click({
    $dispatcherTimer.Stop()
    Restore-Browser "{F9}"
    $window.Close()
})

$btnLock.Add_Click({
    $dispatcherTimer.Stop()
    Restore-Browser "{F8}"
    $window.Close()
})

$btnExtend.Add_Click({
    $script:secondsLeft += 600
    $txtTimer.Text = Format-Time $script:secondsLeft
})

$dispatcherTimer = New-Object System.Windows.Threading.DispatcherTimer
$dispatcherTimer.Interval = [TimeSpan]::FromSeconds(1)
$dispatcherTimer.Add_Tick({
    $script:secondsLeft--
    if ($script:secondsLeft -le 0) {
        $dispatcherTimer.Stop()
        Restore-Browser "{F8}"
        $window.Close()
    } else {
        $txtTimer.Text = Format-Time $script:secondsLeft
    }
})
$dispatcherTimer.Start()

$window.ShowDialog() | Out-Null
`;

  const vbsCode = `Option Explicit
Dim WshShell, fso, targetUrl, browser, candidates, c, scriptDir, bridgeScript, profileDir, flags
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
targetUrl = "${currentUrl}"
scriptDir = "C:\\KeyLem"
bridgeScript = fso.BuildPath(scriptDir, "KeyLem-Bridge.ps1")
If fso.FileExists(bridgeScript) Then
    WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & bridgeScript & """", 0, False
End If
candidates = Array(_
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", _
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", _
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", _
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", _
    WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\\Google\\Chrome\\Application\\chrome.exe", _
    WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\\Microsoft\\Edge\\Application\\msedge.exe" _
)
browser = ""
For Each c In candidates
    If fso.FileExists(c) Then: browser = c: Exit For: End If
Next
profileDir = "C:\\KeyLem\\Profile"
flags = "--user-data-dir=""" & profileDir & """ --app=""" & targetUrl & """ --start-fullscreen --start-maximized --no-first-run --no-default-browser-check --overscroll-history-navigation=0 --disable-pinch --disable-features=TouchpadOverscrollHistoryNavigation,PullToRefresh,EdgeSwipeNavigation --edge-touch-filtering --disable-session-crashed-bubble"
If browser <> "" Then
    WshShell.Run """" & browser & """ " & flags, 3, False
Else
    WshShell.Run """" & targetUrl & """", 3, False
End If
Set WshShell = Nothing
Set fso = Nothing
`;

  const startBatCode = `@echo off
title KeyLem Kiosk
cd /d "C:\\KeyLem"
start /min powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\\KeyLem\\KeyLem-Bridge.ps1"
if exist "C:\\KeyLem\\KeyLem.vbs" (
    start "" wscript.exe "C:\\KeyLem\\KeyLem.vbs"
    exit
)
`;

  const bridgeB64 = utf8_to_b64(bridgeCode);
  const widgetB64 = utf8_to_b64(widgetCode);
  const vbsB64 = utf8_to_b64(vbsCode);
  const startB64 = utf8_to_b64(startBatCode);

  const setupBatContent = `@echo off
setlocal EnableExtensions
title KeyLem - Akilli Tahta Otomatik Kurulum Paketi
color 0b

:: 1. Yonetici Haklari Kontrolu ve Otomatik UAC Yukseltme
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ================================================================
    echo  KEYLEM PRO - AKILLI TAHTA KURULUM PAKETI
    echo.
    echo  Yonetici izinleri aliniyor...
    echo  Lutfen acilan Windows guvenlik penceresinde EVET seciniz.
    echo ================================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ================================================================
echo         KEYLEM PRO - AKILLI TAHTA OTOMATIK KURULUM PAKETI
echo ================================================================
echo.
echo [*] Onceki calisan eski KeyLem surecleri temizleniyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name = 'powershell.exe'\" | Where-Object { \$_.CommandLine -like '*KeyLem*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo [1/5] Kurulum dizini olusturuluyor (C:\\KeyLem)...
if not exist "C:\\KeyLem" mkdir "C:\\KeyLem"
if not exist "C:\\KeyLem\\Profile" mkdir "C:\\KeyLem\\Profile"

echo [2/5] Kiosk, widget ve kopru dosyalari yukleniyor...
set "BRIDGE_B64=${bridgeB64}"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('C:\\KeyLem\\KeyLem-Bridge.ps1', [System.Convert]::FromBase64String($env:BRIDGE_B64))"

set "WIDGET_B64=${widgetB64}"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('C:\\KeyLem\\KeyLem-Widget.ps1', [System.Convert]::FromBase64String($env:WIDGET_B64))"

set "VBS_B64=${vbsB64}"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('C:\\KeyLem\\KeyLem.vbs', [System.Convert]::FromBase64String($env:VBS_B64))"

set "START_B64=${startB64}"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('C:\\KeyLem\\Start-KeyLem.bat', [System.Convert]::FromBase64String($env:START_B64))"

echo [3/5] Windows baslangic ve acilis kayitlari yapiliyor...
:: Registry Run Keys
reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "KeyLem" /t REG_SZ /d "C:\\KeyLem\\Start-KeyLem.bat" /f >nul 2>&1
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "KeyLem" /t REG_SZ /d "C:\\KeyLem\\Start-KeyLem.bat" /f >nul 2>&1

:: Startup Klasorleri (Tum Kullanicilar ve Aktif Kullanici)
if exist "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup" (
    copy /y "C:\\KeyLem\\Start-KeyLem.bat" "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\KeyLem.bat" >nul 2>&1
)
if exist "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup" (
    copy /y "C:\\KeyLem\\Start-KeyLem.bat" "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\KeyLem.bat" >nul 2>&1
)

:: Gorev Zamanlayicisi (Oturum Acilinca Calistir)
schtasks /delete /tn "KeyLem-Kiosk" /f >nul 2>&1
schtasks /create /tn "KeyLem-Kiosk" /tr "C:\\KeyLem\\Start-KeyLem.bat" /sc onlogon /rl highest /f >nul 2>&1

echo [4/5] Ogrenci guvenlik ve kenar kaydirma kilitleri uygulaniyor...
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\EdgeUI" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\EdgeUI" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\default\\LockDown\\AllowEdgeSwipe" /v "value" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\LockDown" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "EnableActivityFeed" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "PublishUserActivities" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" /v "UploadUserActivities" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v "DisabledHotkeys" /t REG_SZ /d "Tab" /f >nul 2>&1
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoRun" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f >nul 2>&1

echo [5/5] Kurulum basariyla tamamlandi!
echo.
echo ================================================================
echo           TEBRIKLER! KEYLEM KURULUMU BASARIYLA TAMAMLANDI.
echo ================================================================
echo.
echo  * KeyLem test icin SIMDI ekranda baslatiliyor...
start "" "C:\\KeyLem\\Start-KeyLem.bat"
echo.
echo  [!] ONEMLI:
echo  Dokunmatik kenar kaydirma engelinin Windows tarafindan tam
echo  olarak kilitlenmesi icin akilli tahtayi yeniden baslatiniz.
echo ================================================================
echo.
set /p REBOOT="Akilli tahtayi SIMDI yeniden baslatmak istiyor musunuz? (E: Evet / H: Hayir): "
if /i "%REBOOT%"=="E" (
    echo.
    echo Akilli tahta 5 saniye icinde yeniden baslatiliyor...
    shutdown /r /t 5
    exit /b
)
echo.
echo Kurulum tamamlandi. Iyi dersler!
echo.
pause
`;

  const batBlob = new Blob([setupBatContent], { type: 'application/bat' });
  const batUrl = URL.createObjectURL(batBlob);
  const batBtn = document.getElementById('btnDownloadBat');
  if (batBtn) {
    batBtn.href = batUrl;
    batBtn.download = 'KeyLem-Kurulum.bat';
    batBtn.onclick = () => {
      const textSpan = document.getElementById('btnDownloadBatText');
      const noticeDiv = document.getElementById('downloadNotice');
      if (textSpan) textSpan.textContent = '✅ KeyLem-Kurulum.bat İndirildi! 3. Adıma Geçin';
      if (noticeDiv) {
        noticeDiv.style.display = 'block';
        noticeDiv.textContent = '✅ Dosya İndirilenler klasörüne kaydedildi. Şimdi üzerine ÇİFT TIKLAYIP açılan onayda EVET deyiniz.';
      }
    };
  }
}

async function populateClassroomsDropdown() {
  if (!classroomSelect) return;

  let classes = state.allClasses;
  if (!classes || classes.length === 0) {
    try {
      const res = await fetch('../classlem/api/get_data.php?demo=1');
      const data = await res.json();
      if (data.classes) classes = data.classes;
    } catch (_) {}
  }

  if (classes && classes.length > 0) {
    classroomSelect.innerHTML = classes.map(c => `
      <option value="${c.id}" ${String(c.id) === String(state.classroomId) || c.name.trim() === state.classroomName.trim() ? 'selected' : ''}>
        ${c.name} Sınıfı
      </option>
    `).join('');
  }
}

function saveClassroomSelection() {
  if (classroomSelect && classroomSelect.selectedIndex >= 0) {
    const opt = classroomSelect.options[classroomSelect.selectedIndex];
    state.classroomId = opt.value;
    state.classroomName = opt.text.replace(' Sınıfı', '').trim();

    localStorage.setItem('keylem_classroom_id', state.classroomId);
    localStorage.setItem('keylem_classroom_name', state.classroomName);

    loadClassroomPodium();

    if (classroomSaveNotice) {
      classroomSaveNotice.textContent = `✅ ${state.classroomName} sınıfı başarıyla kaydedildi!`;
      setTimeout(() => {
        if (classroomSaveNotice) classroomSaveNotice.textContent = '';
      }, 3000);
    }
  }
}

// ── Güvenlik & Kısayol Engellemeleri (Öğrenci Kilit Koruması) ──
window.addEventListener('keydown', (e) => {
  // Kilitliyken tüm sistem çıkış, sekme kapatma ve inceleme kısayollarını engelle
  if (state.isLocked) {
    // 1. Alt + F4 (Pencereyi Kapatma)
    if (e.altKey && (e.key === 'F4' || e.keyCode === 115)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 2. Alt + Tab / Alt + Shift + Tab (Uygulama Değiştirme) - Kilit açık iken engelle
    if (e.altKey && (e.key === 'Tab' || e.keyCode === 9)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 3. Windows tuşu kombinasyonları (Win+D, Win+M, Win+Tab, Win+R, vs.)
    if (e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 4. Ctrl + Escape (Başlat Menüsü)
    if (e.ctrlKey && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 5. Ctrl + W / Ctrl + F4 / Ctrl + Shift + W (Sekme Kapatma)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W' || e.keyCode === 87 || e.key === 'F4')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 6. F11 (Tam Ekrandan Çıkma Engeli)
    if (e.key === 'F11' || e.keyCode === 122) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 7. F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Geliştirici Konsolu)
    if (
      e.key === 'F12' ||
      e.keyCode === 123 ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 8. Ctrl + N, Ctrl + T, Ctrl + Shift + N (Yeni Sekme/Pencere Açma)
    if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 9. Alt tuşuyla yapılan tüm kombinasyonları engelle (menü çubuğu, vb.)
    if (e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Modal açıkken klavye modal inputuna gitmeli
    if (pinAuthModal && !pinAuthModal.classList.contains('hidden')) return;
    if (setupWizardModal && !setupWizardModal.classList.contains('hidden')) return;

    // PIN Girişi ve Temizleme
    if (e.key >= '0' && e.key <= '9') {
      handleNumpadPress(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  } else {
    // Kilit açıkken (Ders / Masaüstü modu)
    if (e.key === 'F8') {
      e.preventDefault();
      lockBoard('Öğretmen tarafından kilitlendi.');
    } else if (e.key === 'F9') {
      e.preventDefault();
      openClasslem();
    } else if (e.key === 'F10') {
      e.preventDefault();
      extendTime(10);
    } else if (e.key === 'Escape' && elements.classlemContainer && !elements.classlemContainer.classList.contains('hidden')) {
      closeClasslem();
      switchToWidgetMode();
    }
  }
}, true); // Capture phase: En yüksek öncelikle yakalar

// Sağ Tık (Context Menu) Engeli: İncele veya menü açılmasını önler
window.addEventListener('contextmenu', (e) => {
  if (state.isLocked) {
    e.preventDefault();
    return false;
  }
}, true);

// Metin Sürükleme / Drag Engeli
window.addEventListener('dragstart', (e) => {
  if (state.isLocked) {
    e.preventDefault();
    return false;
  }
});

// Sayfa Kapatma / Yenileme Koruması (beforeunload)
window.addEventListener('beforeunload', (e) => {
  if (state.isLocked) {
    e.preventDefault();
    e.returnValue = 'Akıllı tahta kilitli durumdadır.';
    return 'Akıllı tahta kilitli durumdadır.';
  }
});

// ── Dokunmatik Kenar ve Kaydırma Koruması (Öğrenci Menü Açma Engeli) ──
function isInteractiveElement(target) {
  if (!target) return false;
  return !!(target.closest && target.closest('button, input, select, textarea, a, .numpad-btn, #btnOpenSettings, .btn-ghost, .modal-card, .modal-backdrop, .wizard-step-box'));
}

function isModalActive() {
  const pModal = document.getElementById('pinAuthModal');
  const sModal = document.getElementById('setupWizardModal');
  return (pModal && !pModal.classList.contains('hidden')) || (sModal && !sModal.classList.contains('hidden'));
}

// 1. Pointer Events
window.addEventListener('pointerdown', (e) => {
  if (isModalActive() || isInteractiveElement(e.target)) {
    return; // Buton, input veya modal tıklamalarını asla engelleme!
  }
  if (state.isLocked) {
    // Sadece sol boş çerçeveden yapılan sürüklemeleri yakala
    if (e.clientX < 80) {
      e.preventDefault();
    }
  }
}, { passive: false });

window.addEventListener('pointermove', (e) => {
  if (isModalActive() || isInteractiveElement(e.target)) return;
  if (state.isLocked && e.clientX < 80) {
    e.preventDefault();
  }
}, { passive: false });

// 2. Touch Events
window.addEventListener('touchstart', (e) => {
  if (isModalActive() || isInteractiveElement(e.target)) {
    return; // Buton, input veya modal dokunmalarını serbest bırak
  }
  if (state.isLocked && e.touches && e.touches.length > 0) {
    const x = e.touches[0].clientX;
    if (x < 80) {
      e.preventDefault();
    }
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (isModalActive() || isInteractiveElement(e.target)) return;
  if (state.isLocked) {
    e.preventDefault();
  }
}, { passive: false });

// 3. Mouse Tekerleği / İki Parmak Kaydırma Engeli
window.addEventListener('wheel', (e) => {
  if (state.isLocked) {
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener('gesturestart', (e) => {
  if (state.isLocked) {
    e.preventDefault();
  }
});

// 4. Pencere Odak Yönetimi — Kilit açıkken odak geri gelince widget başlığını tekrar tetikle
window.addEventListener('blur', () => {
  // Kilit açıkken sayfa arka plana geçerse, odak geri geldiğinde widget'ı yeniden etkinleştir
});

window.addEventListener('focus', () => {
  // Kilit açıkken sayfa odağı yeniden kazandığında; widget modundaysak başlığı yenile
  if (!state.isLocked && state.viewMode === 'widget') {
    const secondsLeft = state.secondsLeft || 2400;
    document.title = `KEYLEM_ACTION_WIDGET_${secondsLeft}`;
    setTimeout(() => {
      document.title = `KeyLem - ${state.classroomName}`;
    }, 1500);
  }
});

// ── Başlatma ──
window.addEventListener('DOMContentLoaded', () => {
  startClock();
  loadClassroomPodium();

  // Numpad Butonları
  document.querySelectorAll('.numpad-btn[data-digit]').forEach(btn => {
    btn.addEventListener('click', () => handleNumpadPress(btn.dataset.digit));
  });

  const clearBtn = document.getElementById('btnClear');
  if (clearBtn) clearBtn.addEventListener('click', handleClear);

  const backspaceBtn = document.getElementById('btnBackspace');
  if (backspaceBtn) backspaceBtn.addEventListener('click', handleBackspace);

  const lockNowBtn = document.getElementById('btnLockNow');
  if (lockNowBtn) lockNowBtn.addEventListener('click', () => lockBoard('Öğretmen tarafından kilitlendi.'));

  const extend10Btn = document.getElementById('btnExtend10');
  if (extend10Btn) extend10Btn.addEventListener('click', () => extendTime(10));

  // ClassLem Açma / Kapatma Butonları
  const launchClasslemBtn = document.getElementById('btnLaunchClasslem');
  if (launchClasslemBtn) launchClasslemBtn.addEventListener('click', toggleClasslem);

  const launchDesktopBtn = document.getElementById('btnLaunchClasslemDesktop');
  if (launchDesktopBtn) launchDesktopBtn.addEventListener('click', openClasslem);

  const closeClasslemBtn = document.getElementById('btnCloseClasslem');
  if (closeClasslemBtn) closeClasslemBtn.addEventListener('click', () => {
    closeClasslem();
    switchToWidgetMode(); // ClassLem kapatılınca üst widget'ı yeniden etkinleştir
  });

  // Masaüstüne Geçiş (Simge Durumuna Küçültme) Butonları
  const minimizeDesktopBtn = document.getElementById('btnMinimizeToDesktop');
  if (minimizeDesktopBtn) minimizeDesktopBtn.addEventListener('click', minimizeToDesktop);

  const minimizeBarBtn = document.getElementById('btnMinimizeBar');
  if (minimizeBarBtn) minimizeBarBtn.addEventListener('click', minimizeToDesktop);

  // Tahta Kurulum Butonu -> PIN Giriş Modalı
  const settingsBtn = document.getElementById('btnOpenSettings');
  if (settingsBtn) settingsBtn.addEventListener('click', openPinAuthModal);

  // PIN Doğrulama Formu
  const pinAuthForm = document.getElementById('pinAuthForm');
  if (pinAuthForm) {
    pinAuthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = (authPinInput ? authPinInput.value.trim() : '');
      if (entered === state.masterPin) {
        openSetupWizardModal();
      } else {
        if (pinAuthError) pinAuthError.textContent = 'Hatalı Master PIN! Lütfen tekrar deneyin.';
      }
    });
  }

  const cancelPinAuthBtn = document.getElementById('btnCancelPinAuth');
  if (cancelPinAuthBtn) cancelPinAuthBtn.addEventListener('click', closePinAuthModal);

  // Sihirbaz İçi Butonlar
  const saveClassroomBtn = document.getElementById('btnSaveClassroom');
  if (saveClassroomBtn) saveClassroomBtn.addEventListener('click', saveClassroomSelection);

  const closeWizardBtn = document.getElementById('btnCloseWizard');
  if (closeWizardBtn) closeWizardBtn.addEventListener('click', closeSetupWizardModal);

  const finishWizardBtn = document.getElementById('btnFinishWizard');
  if (finishWizardBtn) finishWizardBtn.addEventListener('click', closeSetupWizardModal);
});

