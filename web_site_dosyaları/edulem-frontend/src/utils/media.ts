/**
 * Edulem Media & Asset URL Resolver
 * 
 * Sunucu ve istemci ortamlarına bağlı olarak avatar, logo ve yüklenen
 * görsellerin tam ve güvenli (HTTPS) URL'lerini oluşturur.
 * Kırık veya eksik görseller için zarif fallback (UI-Avatars) sağlar.
 */

export const getApiOrigin = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    // Yerel geliştirme ortamı
    if (host === 'localhost' || host === '127.0.0.1') {
      return import.meta.env.VITE_API_ORIGIN || 'http://127.0.0.1:8000';
    }
  }
  // Canlı ortam (api.edulem.com)
  return import.meta.env.VITE_API_ORIGIN || 'https://api.edulem.com';
};

/**
 * Avatar yolunu tam HTTPS URL'sine dönüştürür.
 * Boş veya geçersizse UI-Avatars URL'si döner.
 */
export const getAvatarUrl = (pathOrUrl?: string | null, fallbackName = 'Kullanıcı'): string => {
  const defaultFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'Kullanıcı')}&background=0D8ABC&color=fff&size=256`;

  if (!pathOrUrl || typeof pathOrUrl !== 'string' || pathOrUrl.trim() === '') {
    return defaultFallback;
  }

  const raw = pathOrUrl.trim();

  // Local object URL veya data URI (kırpma / yükleme önizlemesi)
  if (raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw;
  }

  const origin = getApiOrigin();

  // Eğer localhost:8000 kalmışsa canlıda düzelt
  if (raw.includes('127.0.0.1:8000') || raw.includes('localhost:8000')) {
    const cleaned = raw.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8000\/?/, '');
    return `${origin}/${cleaned.replace(/^\/+/, '')}`;
  }

  // http://api.edulem.com ise https'e yükselt
  if (raw.startsWith('http://api.edulem.com')) {
    return 'https://' + raw.substring(7);
  }

  // Zaten tam https URL ise
  if (raw.startsWith('https://')) {
    return raw;
  }

  // http:// ise https'e yükselt
  if (raw.startsWith('http://')) {
    return 'https://' + raw.substring(7);
  }

  // Göreceli yol (ör. "avatars/xxx.jpg" veya "/avatars/xxx.jpg")
  const cleanPath = raw.replace(/^\/+/, '');
  return `${origin}/${cleanPath}`;
};

/**
 * Kurum logosu URL'sini çözer.
 * Boş ise boş string döner.
 */
export const getLogoUrl = (pathOrUrl?: string | null): string => {
  if (!pathOrUrl || typeof pathOrUrl !== 'string' || pathOrUrl.trim() === '') {
    return '';
  }

  const raw = pathOrUrl.trim();

  if (raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw;
  }

  const origin = getApiOrigin();

  if (raw.includes('127.0.0.1:8000') || raw.includes('localhost:8000')) {
    const cleaned = raw.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8000\/?/, '');
    return `${origin}/${cleaned.replace(/^\/+/, '')}`;
  }

  if (raw.startsWith('http://api.edulem.com')) {
    return 'https://' + raw.substring(7);
  }

  if (raw.startsWith('https://')) {
    return raw;
  }

  if (raw.startsWith('http://')) {
    return 'https://' + raw.substring(7);
  }

  const cleanPath = raw.replace(/^\/+/, '');
  // Eğer doğrudan tenant-logos/... geldiyse /storage/ ön eki ekle
  if (cleanPath.startsWith('tenant-logos/')) {
    return `${origin}/storage/${cleanPath}`;
  }

  return `${origin}/${cleanPath}`;
};

/**
 * Görsel yüklenemediğinde (404, ağ hatası, bozuk dosya) avatar fallback'i uygular.
 * Sonsuz döngüyü önlemek için `onerror = null` yapar.
 */
export const handleAvatarError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackName = 'Kullanıcı'
) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'Kullanıcı')}&background=0D8ABC&color=fff&size=256`;
};

/**
 * Kurum logosu yüklenemediğinde sessizce gizler veya kapsayıcısına bilgi basar.
 */
export const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.style.display = 'none';
  const parent = target.parentElement;
  if (parent && !parent.querySelector('.logo-fallback-badge')) {
    const span = document.createElement('span');
    span.className = 'text-muted small logo-fallback-badge';
    span.textContent = 'Logo Yüklenemedi';
    parent.appendChild(span);
  }
};
