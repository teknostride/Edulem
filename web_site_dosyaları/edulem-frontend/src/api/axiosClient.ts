import axios from 'axios';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    // Localhost veya test ortamı
    if (host === 'localhost' || host === '127.0.0.1') {
      return import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
    }
    // Tüm canlı domainler (*.edulem.com - yonetim, demo, akirfan vb.)
    if (host.includes('edulem.com')) {
      return 'https://api.edulem.com/api/v1';
    }
  }
  return import.meta.env.VITE_API_URL || 'https://api.edulem.com/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// 1. REQUEST INTERCEPTOR (İstek Yola Çıkmadan Hemen Önce)
axiosClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('ACCESS_TOKEN');
  const token = raw ? String(raw).trim() : '';
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // --- SEASON OVERRIDE (YAPILANDIRMA MODU) ---
  const configSeasonId = localStorage.getItem('active_config_season');
  if (configSeasonId) {
    config.headers['X-Season-Id'] = configSeasonId;
  }

  // If we're sending FormData, let the browser/axios set the correct multipart boundary.
  // Otherwise the default 'application/json' header breaks file uploads.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    try {
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    } catch {
      // ignore
    }
  }
  return config;
});

// 2. RESPONSE INTERCEPTOR (Cevap Döndüğünde)
let isRedirectingToLogin = false;

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    // Teknik SQL ve veritabanı hatalarını kullanıcı dostu Türkçe metinlere dönüştür
    if (response?.data?.message && typeof response.data.message === 'string') {
      const msg = response.data.message;
      if (
        msg.includes('SQLSTATE') ||
        msg.includes('QueryException') ||
        msg.includes('violation:') ||
        msg.includes('Column') ||
        msg.includes('Integrity constraint')
      ) {
        if (msg.includes("'name'") || msg.includes('guardians')) {
          response.data.message = 'Veli adı soyadı alanı boş bırakılamaz. Lütfen veli bilgilerini kontrol ediniz.';
        } else if (msg.includes('Duplicate entry')) {
          response.data.message = 'Girdiğiniz bilgilerden biri (T.C. Kimlik No veya Okul No) sistemde zaten mevcuttur.';
        } else {
          response.data.message = 'İşlem gerçekleştirilirken bir hata oluştu. Lütfen girdiğiniz bilgileri kontrol edip tekrar deneyiniz.';
        }
      }
    }

    if (response && response.status === 401) {
      localStorage.removeItem('ACCESS_TOKEN');
      localStorage.removeItem('USER_DATA');
      localStorage.removeItem('USER_ROLE');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        if (!isRedirectingToLogin) {
          isRedirectingToLogin = true;
          sessionStorage.setItem('login_message', 'Lütfen tekrar giriş yapın.');
          window.location.href = '/login';
        }
      }
    }
    throw error;
  }
);

export default axiosClient;