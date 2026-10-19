import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import { getAvatarUrl, handleAvatarError } from '../../utils/media';
import Cropper from 'react-easy-crop';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role_name: string;
  avatar?: string;
  phone?: string;
  birth_date?: string;
  bio?: string;
  campus_name?: string;
  created_at: string;
  last_login_at?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);

  const isStudent = (() => {
    const role = (localStorage.getItem('USER_ROLE') || '').toLowerCase();
    const loginType = (localStorage.getItem('LOGIN_TYPE') || '').toLowerCase();
    let userDataRole = '';
    try {
      const ud = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      userDataRole = (ud.role || ud.role_name || ud.role_label || '').toLowerCase();
    } catch (_) {}
    const profileRole = (profile?.role_name || '').toLowerCase();

    return (
      loginType === 'student' ||
      role === 'student' ||
      role === 'öğrenci' ||
      role === 'ogrenci' ||
      userDataRole === 'student' ||
      userDataRole === 'öğrenci' ||
      userDataRole === 'ogrenci' ||
      profileRole === 'öğrenci' ||
      profileRole === 'student' ||
      profileRole === 'ogrenci'
    );
  })();

  const isEditing = !isStudent && editMode;
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isMonochrome, setIsMonochrome] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarProcessing, setAvatarProcessing] = useState(false);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedAvatarSrc, setSelectedAvatarSrc] = useState<string | null>(null);
  const [selectedAvatarObjectUrl, setSelectedAvatarObjectUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const fileToObjectUrl = (file: File) => URL.createObjectURL(file);

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Görsel yüklenemedi'));
      image.src = url;
    });

  const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Görsel dönüştürülemedi'));
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });

  const getCroppedAvatarBlob = async (imageSrc: string, areaPixels: { x: number; y: number; width: number; height: number }) => {
    const img = await createImage(imageSrc);
    const target = 512;
    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas desteklenmiyor');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img,
      areaPixels.x,
      areaPixels.y,
      areaPixels.width,
      areaPixels.height,
      0,
      0,
      target,
      target
    );

    let quality = 0.9;
    let blob = await canvasToJpegBlob(canvas, quality);
    while (blob.size > 2 * 1024 * 1024 && quality > 0.4) {
      quality = Math.max(0.4, quality - 0.1);
      blob = await canvasToJpegBlob(canvas, quality);
    }
    return blob;
  };

  const resetCropState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    setSelectedAvatarSrc(null);
    if (selectedAvatarObjectUrl) {
      URL.revokeObjectURL(selectedAvatarObjectUrl);
    }
    setSelectedAvatarObjectUrl(null);
    resetCropState();
  };

  const applyCroppedAvatar = async () => {
    if (!selectedAvatarSrc || !croppedAreaPixels) {
      showToast('error', 'Kırpma alanı seçilemedi.');
      return;
    }

    setAvatarProcessing(true);
    try {
      const blob = await getCroppedAvatarBlob(selectedAvatarSrc, croppedAreaPixels);
      if (blob.size > 2 * 1024 * 1024) {
        showToast('error', 'Görsel 2MB altına indirilemedi. Daha küçük bir görsel seçin.');
        return;
      }

      const outFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      setAvatarFile(outFile);
      setFormData((prev) => (prev ? { ...prev, avatar: previewUrl } : { ...getFallbackProfile(), avatar: previewUrl }));
      closeCropModal();
    } catch {
      showToast('error', 'Görsel işlenemedi.');
    } finally {
      setAvatarProcessing(false);
    }
  };

  // Helper: localStorage'dan fallback profil oluştur
  const getFallbackProfile = (): UserProfile => {
    const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
    return {
      id: userData.id || 1,
      name: userData.name || 'Kullanıcı',
      email: userData.email || '',
      role_name: userData.role_name || userData.role_label || '-',
      avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Kullanıcı')}&background=random`,
      phone: userData.phone || '',
      birth_date: userData.birth_date || '',
      bio: userData.bio || '',
      campus_name: userData.campus_name || '-',
      created_at: userData.created_at || new Date().toISOString(),
      last_login_at: userData.last_login_at
    };
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedMonochrome = localStorage.getItem('monochrome');
    setCurrentTheme(savedTheme);
    setIsMonochrome(savedMonochrome === 'true');

    const role = localStorage.getItem('USER_ROLE') || JSON.parse(localStorage.getItem('USER_DATA') || '{}').role;
    const isPortalStudent = role === 'student' || role === 'Öğrenci';
    const profileGetUrl = isPortalStudent ? '/portal/student/profile' : '/user/profile';

    axiosClient.get(profileGetUrl)
      .then((res) => {
        const d = res.data?.data ?? res.data;
        const fb = getFallbackProfile();
        const p: UserProfile = {
          id: d.id,
          name: d.name || '',
          email: d.email || '',
          role_name: d.role_label || d.role_name || '-',
          avatar: d.avatar || fb.avatar,
          phone: d.phone || '',
          birth_date: d.birth_date ? (d.birth_date.split('T')[0] || d.birth_date.split(' ')[0]) : fb.birth_date,
          bio: d.bio || '',
          campus_name: d.campus_name || '-',
          created_at: d.created_at || fb.created_at,
          last_login_at: d.last_login_at
        };
        setProfile(p);
        setFormData(p);

        // Header vs. için localStorage güncel kalsın
        const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
        userData.name = p.name;
        userData.email = p.email;
        userData.phone = p.phone;
        if (p.birth_date) userData.birth_date = p.birth_date;
        if (p.avatar) userData.avatar = p.avatar;
        if (d.role_label || d.role_name) userData.role_name = d.role_label || d.role_name;
        if (d.role) userData.role = d.role;
        localStorage.setItem('USER_DATA', JSON.stringify(userData));
        window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userData }));
      })
      .catch(() => {
        const fb = getFallbackProfile();
        setProfile(fb);
        setFormData(fb);
      })
      .finally(() => setLoading(false));

    // Global fonksiyonları tanımla
    (window as any).savePassword = async () => {
      const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement)?.value?.trim();
      const newPassword = (document.getElementById('newPassword') as HTMLInputElement)?.value?.trim();
      const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement)?.value?.trim();

      if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('error', 'Lütfen tüm alanları doldurun.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('error', 'Yeni şifreler eşleşmiyor.');
        return;
      }
      if (newPassword.length < 6) {
        showToast('error', 'Şifre en az 6 karakter olmalıdır.');
        return;
      }

      try {
        const roleNow = localStorage.getItem('USER_ROLE');
        const isPortalStudentNow = roleNow === 'student' || roleNow === 'Öğrenci';

        if (isPortalStudentNow) {
          await axiosClient.post('/portal/student/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
            new_password_confirmation: confirmPassword
          });
        } else {
          await axiosClient.put('/user/profile', {
            current_password: currentPassword,
            password: newPassword,
            password_confirmation: confirmPassword
          });
        }
        showToast('success', 'Şifre veritabanına kaydedildi. Çıkış yaptığınızda yeni şifreyle giriş yapabilirsiniz.');
        (document.getElementById('currentPassword') as HTMLInputElement).value = '';
        (document.getElementById('newPassword') as HTMLInputElement).value = '';
        (document.getElementById('confirmPassword') as HTMLInputElement).value = '';
        const modalElement = document.getElementById('changePasswordModal');
        if (modalElement && (window as any).bootstrap?.Modal) {
          const bsModal = (window as any).bootstrap.Modal.getInstance(modalElement);
          bsModal?.hide();
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Şifre güncellenemedi.';
        showToast('error', msg);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent || !formData) return;
    if (cropModalOpen) {
      showToast('error', 'Lütfen kırpma ekranını tamamlayın.');
      return;
    }
    if (avatarProcessing) {
      showToast('error', 'Görsel işleniyor. Lütfen tamamlanmasını bekleyin.');
      return;
    }
    setSaving(true);

    try {
      const roleNow = localStorage.getItem('USER_ROLE');
      const isPortalStudentNow = roleNow === 'student' || roleNow === 'Öğrenci';

      const url = isPortalStudentNow ? '/portal/student/profile' : '/user/profile';

      let res: any;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('_method', 'PUT');
        fd.append('name', formData.name.trim());
        fd.append('email', formData.email.trim());
        fd.append('phone', (formData.phone || '').trim());
        if (formData.birth_date) fd.append('birth_date', formData.birth_date);
        if (formData.bio) fd.append('bio', formData.bio.trim());
        fd.append('avatar', avatarFile);
        res = await axiosClient.post(url, fd, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        const payload: Record<string, any> = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: (formData.phone || '').trim(),
          birth_date: formData.birth_date || null
        };
        if (formData.bio !== undefined) payload.bio = (formData.bio || '').trim();
        res = await axiosClient.put(url, payload);
      }
      const updated = res.data?.data?.user ?? res.data?.user;

      const nextAvatar = updated?.avatar ?? formData.avatar;

      setProfile({ ...formData, avatar: nextAvatar });
      setEditMode(false);
      setAvatarFile(null);

      const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      userData.name = formData.name;
      userData.email = formData.email;
      userData.phone = formData.phone;
      if (formData.birth_date) userData.birth_date = formData.birth_date;
      if (nextAvatar) userData.avatar = nextAvatar;
      if (updated?.role_label) userData.role_name = updated.role_label;
      if (updated?.role) userData.role = updated.role;
      localStorage.setItem('USER_DATA', JSON.stringify(userData));

      window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userData }));
      showToast('success', 'Profil veritabanına kaydedildi. Çıkış yaptığınızda yeni bilgilerle giriş yapabilirsiniz.');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Profil güncellenemedi.';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setEditMode(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ACCESS_TOKEN');
    localStorage.removeItem('USER_DATA');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const ok = await confirmDialog({
      text: 'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    // API çağrısı yapılacak
    console.log('Account deletion requested');
    handleLogout();
  };

  const handleChangePassword = () => {
    // Şifre değiştirme modal'ı
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Şifre Değiştir</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="changePasswordForm">
                <div class="mb-3">
                  <label for="currentPassword" class="form-label">Mevcut Şifre</label>
                  <input type="password" class="form-control" id="currentPassword" required>
                </div>
                <div class="mb-3">
                  <label for="newPassword" class="form-label">Yeni Şifre</label>
                  <input type="password" class="form-control" id="newPassword" required>
                </div>
                <div class="mb-3">
                  <label for="confirmPassword" class="form-label">Yeni Şifre (Tekrar)</label>
                  <input type="password" class="form-control" id="confirmPassword" required>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
              <button type="button" class="btn btn-primary" onclick="savePassword()">Kaydet</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Modal'ı göster
    const modalElement = modal.querySelector('#changePasswordModal');
    if (modalElement) {
      // @ts-ignore
      const bsModal = new window.bootstrap.Modal(modalElement);
      bsModal.show();

      // Modal kapanınca temizle
      modalElement.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
      });
    }
  };

  const handleSecuritySettings = () => {
    // Güvenlik ayarları modal'ı
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal fade" id="securitySettingsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Güvenlik Ayarları</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-info">
                <i class="ti ti-info-circle me-2"></i>
                Güvenlik ayarları yakında eklenecek!
              </div>
              <div class="list-group">
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1">İki Faktörlü Kimlik Doğrulama</h6>
                      <small class="text-muted">Hesabınızı ekstra güvenlik katmanıyla koruyun</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="twoFactorAuth">
                    </div>
                  </div>
                </div>
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1">Oturum Güvenliği</h6>
                      <small class="text-muted">Oturum sürelerini yönetin</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="sessionSecurity" checked>
                    </div>
                  </div>
                </div>
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1">E-posta Bildirimleri</h6>
                      <small class="text-muted">Güvenlik olaylarında e-posta bildirimi</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="emailNotifications" checked>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
              <button type="button" class="btn btn-primary">Kaydet</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Modal'ı göster
    const modalElement = modal.querySelector('#securitySettingsModal');
    if (modalElement) {
      // @ts-ignore
      const bsModal = new window.bootstrap.Modal(modalElement);
      bsModal.show();

      // Modal kapanınca temizle
      modalElement.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
      });
    }
  };

  const handleNotificationSettings = () => {
    // Bildirim ayarları modal'ı
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal fade" id="notificationSettingsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Bildirim Ayarları</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-info">
                <i class="ti ti-info-circle me-2"></i>
                Bildirim ayarları yakında eklenecek!
              </div>
              <div class="list-group">
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1">E-posta Bildirimleri</h6>
                      <small class="text-muted">Önemli güncellemeler için e-posta bildirimi</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="emailNotifs" checked>
                    </div>
                  </div>
                </div>
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1">Tarayıcı Bildirimleri</h6>
                      <small class="text-muted">Tarayıcıda bildirim göster</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="browserNotifs" checked>
                    </div>
                  </div>
                </div>
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1">Öğrenci İşlemleri</h6>
                      <small class="text-muted">Öğrenci ekleme/güncelleme bildirimleri</small>
                    </div>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="studentNotifs" checked>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
              <button type="button" class="btn btn-primary">Kaydet</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Modal'ı göster
    const modalElement = modal.querySelector('#notificationSettingsModal');
    if (modalElement) {
      // @ts-ignore
      const bsModal = new window.bootstrap.Modal(modalElement);
      bsModal.show();

      // Modal kapanınca temizle
      modalElement.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
      });
    }
  };

  const handleAvatarChange = () => {
    if (isStudent) return;
    // Avatar yükleme
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowed.includes(file.type)) {
          showToast('error', 'Sadece jpg, png ve webp dosyaları desteklenir.');
          return;
        }
        if (file.size > 20 * 1024 * 1024) {
          showToast('error', 'Dosya çok büyük. Lütfen 20MB altı bir görsel seçin.');
          return;
        }

        setAvatarFile(null);
        setAvatarProcessing(true);
        try {
          const objectUrl = fileToObjectUrl(file);
          setSelectedAvatarObjectUrl(objectUrl);
          setSelectedAvatarSrc(objectUrl);
          setCropModalOpen(true);
        } catch {
          showToast('error', 'Dosya okunamadı.');
        } finally {
          setAvatarProcessing(false);
        }
      }
    };
    input.click();
  };

  // Tema değiştirme fonksiyonları
  const handleThemeChange = async (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);

    // Temayı uygula
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-bs-theme', theme);
    }

    // Veritabanına kaydet
    await saveThemeToDatabase(theme, isMonochrome);
  };

  const toggleMonochrome = async () => {
    const newMonochrome = !isMonochrome;
    setIsMonochrome(newMonochrome);
    localStorage.setItem('monochrome', newMonochrome.toString());

    // Monochrome'i uygula
    const html = document.documentElement;
    if (newMonochrome) {
      html.setAttribute('data-monochrome', 'true');
      html.style.filter = "grayscale(100%)";
    } else {
      html.removeAttribute('data-monochrome');
      html.style.filter = "";
    }

    // Veritabanına kaydet
    await saveThemeToDatabase(currentTheme, newMonochrome);
  };

  // Veritabanına tema ayarlarını kaydet
  const saveThemeToDatabase = async (theme: string, monochrome: boolean) => {
    try {
      const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      const token = localStorage.getItem('ACCESS_TOKEN');

      if (!token || !userData.id) {
        console.warn('Kullanıcı bilgileri bulunamadı, localStorage kullanılıyor');
        return;
      }

      // API çağrısı - gerçek backend entegrasyonu yapılacak
      const response = await fetch(`/api/v1/users/${userData.id}/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          theme_preference: theme,
          monochrome_mode: monochrome,
        }),
      });

      if (response.ok) {
        console.log('Tema ayarları veritabanına kaydedildi');
      } else {
        console.warn('Tema ayarları veritabanına kaydedilemedi, localStorage kullanılıyor');
      }
    } catch (error) {
      console.error('Tema kaydetme hatası:', error);
      // Hata durumunda localStorage'da kalır
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {cropModalOpen && selectedAvatarSrc && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1055 }}
        >
          <div className="card" style={{ width: 'min(720px, 95vw)' }}>
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Görseli Kırp</h5>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeCropModal}>
                Kapat
              </button>
            </div>
            <div className="card-body">
              <div className="position-relative" style={{ width: '100%', height: '420px', background: '#111' }}>
                <Cropper
                  image={selectedAvatarSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                />
              </div>

              <div className="mt-3">
                <label className="form-label">Yakınlaştır</label>
                <input
                  type="range"
                  className="form-range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="card-footer d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={closeCropModal}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" onClick={applyCroppedAvatar} disabled={avatarProcessing}>
                {avatarProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Hazırlanıyor...
                  </>
                ) : (
                  'Uygula'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-title-head d-flex align-items-center mb-4">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Profil</h4>
          <small className="text-muted">
            {isStudent ? 'Hesap bilgilerinizi görüntüleyin' : 'Hesap bilgilerinizi yönetin'}
          </small>
        </div>
        {!isStudent && (
          <div>
            <button
              className={`btn ${editMode ? 'btn-outline-secondary' : 'btn-primary'} btn-sm me-2`}
              onClick={() => setEditMode(!editMode)}
            >
              <i className={`ti ti-${editMode ? 'x' : 'pencil'} me-1`}></i>
              {editMode ? 'İptal' : 'Düzenle'}
            </button>
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-lg-4">
          {/* Profil Kartı */}
          <div className="card">
            <div className="card-body text-center">
              <div className="position-relative d-inline-block">
                <img
                  src={getAvatarUrl(isEditing ? (formData?.avatar || profile?.avatar) : profile?.avatar, profile?.name || 'Kullanıcı')}
                  onError={(e) => handleAvatarError(e, profile?.name || 'Kullanıcı')}
                  alt="Profile"
                  className="rounded-circle avatar-xl mb-3 shadow-sm"
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
                {isEditing && avatarProcessing && (
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ background: 'rgba(0,0,0,0.35)' }}
                  >
                    <span className="spinner-border spinner-border-sm text-light"></span>
                  </div>
                )}
                {isEditing && (
                  <button
                    className="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle"
                    style={{ width: '36px', height: '36px' }}
                    onClick={handleAvatarChange}
                  >
                    <i className="ti ti-camera"></i>
                  </button>
                )}
              </div>

              <h5 className="mb-1">{profile?.name ?? '-'}</h5>
              <p className="text-muted mb-2">{profile?.role_name ?? '-'}</p>
              <p className="text-muted small mb-3">{profile?.campus_name ?? '-'}</p>

              <div className="d-flex justify-content-center gap-2 mb-3">
                <span className="badge bg-soft-primary text-primary">{profile?.role_name ?? '-'}</span>
                <span className="badge bg-soft-success text-success">Aktif</span>
              </div>

              {/* Tema Ayarları */}
              <div className="mb-3">
                <h6 className="mb-3">Tema Ayarları</h6>
                <div className="d-flex flex-column gap-2">
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleThemeChange('light')}
                    >
                      <i className="ti ti-sun me-1"></i> Light
                    </button>
                    <button
                      type="button"
                      className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleThemeChange('dark')}
                    >
                      <i className="ti ti-moon me-1"></i> Dark
                    </button>
                    <button
                      type="button"
                      className={`btn ${currentTheme === 'system' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleThemeChange('system')}
                    >
                      <i className="ti ti-sun-moon me-1"></i> System
                    </button>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small">Siyah-Beyaz Mod</span>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="monochromeSwitch"
                        checked={isMonochrome}
                        onChange={toggleMonochrome}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-muted small">
                <div className="mb-1">
                  <i className="ti ti-calendar me-1"></i>
                  Katılım: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '-'}
                </div>
                {profile?.last_login_at && (
                  <div className="mb-1">
                    <i className="ti ti-clock me-1"></i>
                    Son giriş: {new Date(profile.last_login_at).toLocaleString('tr-TR')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hızlı İşlemler */}
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-3">Hızlı İşlemler</h6>
              <div className="d-grid gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={handleChangePassword}>
                  <i className="ti ti-key me-1"></i> Şifre Değiştir
                </button>
                <button className="btn btn-outline-info btn-sm" onClick={handleSecuritySettings}>
                  <i className="ti ti-shield me-1"></i> Güvenlik Ayarları
                </button>
                <button className="btn btn-outline-warning btn-sm" onClick={handleNotificationSettings}>
                  <i className="ti ti-bell me-1"></i> Bildirimler
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
                  <i className="ti ti-logout me-1"></i> Çıkış Yap
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={handleDeleteAccount}>
                  <i className="ti ti-trash me-1"></i> Hesabı Sil
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {/* Profil Formu */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Profil Bilgileri</h5>
            </div>
            <div className="card-body">
              {isEditing ? (
                <form onSubmit={handleSave}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="name" className="form-label">Ad Soyad</label>
                        <input
                          type="text"
                          className="form-control"
                          id="name"
                          name="name"
                          value={formData?.name ?? ''}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="email" className="form-label">E-posta</label>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={formData?.email ?? ''}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="phone" className="form-label">Telefon</label>
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          name="phone"
                          value={formData?.phone ?? ''}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="birth_date" className="form-label">Doğum Tarihi</label>
                        <input
                          type="date"
                          className="form-control"
                          id="birth_date"
                          name="birth_date"
                          value={formData?.birth_date ?? ''}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="campus_name" className="form-label">Kampüs</label>
                        <input
                          type="text"
                          className="form-control"
                          id="campus_name"
                          name="campus_name"
                          value={formData?.campus_name ?? ''}
                          onChange={handleInputChange}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="bio" className="form-label">Hakkımda</label>
                    <textarea
                      className="form-control"
                      id="bio"
                      name="bio"
                      rows={4}
                      value={formData?.bio ?? ''}
                      onChange={handleInputChange}
                      placeholder="Kendinizi tanıtın..."
                    />
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={handleCancel}>
                      İptal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving || avatarProcessing || cropModalOpen}>
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Kaydediliyor...
                        </>
                      ) : avatarProcessing ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Görsel hazırlanıyor...
                        </>
                      ) : (
                        <>
                          <i className="ti ti-device-floppy me-1"></i>
                          Kaydet
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted">Ad Soyad</label>
                      <p className="form-control-plaintext">{profile?.name ?? '-'}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted">E-posta</label>
                      <p className="form-control-plaintext">{profile?.email ?? '-'}</p>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted">Telefon</label>
                      <p className="form-control-plaintext">{profile?.phone ?? '-'}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted">Doğum Tarihi</label>
                      <p className="form-control-plaintext">
                        {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('tr-TR') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted">Kampüs</label>
                      <p className="form-control-plaintext">{profile?.campus_name ?? '-'}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Hakkımda</label>
                    <p className="form-control-plaintext">{profile?.bio ?? '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Aktivite Geçmişi */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Aktivite Geçmişi</h5>
            </div>
            <div className="card-body">
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-point bg-primary"></div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Profil güncellendi</h6>
                    <p className="text-muted small mb-0">Profil bilgileri başarıyla güncellendi.</p>
                    <small className="text-muted">{new Date().toLocaleString('tr-TR')}</small>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-point bg-success"></div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Sisteme giriş yapıldı</h6>
                    <p className="text-muted small mb-0">Hoş geldiniz! Sisteme başarıyla giriş yaptınız.</p>
                    <small className="text-muted">{new Date(profile?.created_at ?? Date.now()).toLocaleString('tr-TR')}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
