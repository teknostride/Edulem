import Swal from 'sweetalert2';

// SweetAlert2 Mixin Ayarları (Senin İstediğin Standartlar)
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end', // Sağ üst köşe
  showConfirmButton: false, // Ok butonu olmasın
  timer: 2500, // 2.5 saniye bekle
  timerProgressBar: true, // Altındaki o süre çubuğu (Timeline)
  didOpen: (toast) => {
    // Mouse üzerine gelirse süreyi durdur, çekince devam et
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// Kullanımı kolaylaştıran fonksiyon
export const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    Toast.fire({
        icon: type,
        title: message
    });
};

export const confirmDialog = async (opts: {
  title?: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  icon?: 'warning' | 'question' | 'info' | 'error' | 'success';
}) => {
  const res = await Swal.fire({
    title: opts.title ?? 'Emin misiniz?',
    text: opts.text,
    icon: opts.icon ?? 'warning',
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Devam Et',
    cancelButtonText: opts.cancelText ?? 'İptal',
    reverseButtons: true,
    focusCancel: true,
  });

  return res.isConfirmed;
};

export const alertDialog = async (opts: {
  title?: string;
  text: string;
  icon?: 'info' | 'error' | 'success' | 'warning' | 'question';
  confirmText?: string;
}) => {
  await Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: opts.icon ?? 'info',
    confirmButtonText: opts.confirmText ?? 'Tamam',
  });
};