import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const DEV_SW_CLEANUP_FLAG = '__dev_sw_cleanup_done__'

const cleanupServiceWorkersInDev = async () => {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) return

  let hadRegistrations = false
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    hadRegistrations = registrations.length > 0
    await Promise.all(registrations.map((registration) => registration.unregister()))
  } catch {
    // no-op
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
    } catch {
      // no-op
    }
  }

  const cleanupDone = sessionStorage.getItem(DEV_SW_CLEANUP_FLAG) === '1'
  if (hadRegistrations && !cleanupDone) {
    sessionStorage.setItem(DEV_SW_CLEANUP_FLAG, '1')
    window.location.reload()
  }
}

const bootstrap = async () => {
  await cleanupServiceWorkersInDev()

  // Eğer i18n dosyası varsa ve hata veriyorsa, onu burada susturmaya çalışalım:
  // (Bu kısım geçici bir yama)
  try {
    localStorage.setItem('i18nextLng', 'tr') // Dili zorla Türkçe yap
  } catch {
    // no-op
  }

  createRoot(document.getElementById('root')!).render(
    <App />,
  )
}

bootstrap()