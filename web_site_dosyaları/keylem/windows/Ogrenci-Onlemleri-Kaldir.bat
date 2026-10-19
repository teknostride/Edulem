@echo off
title KeyLem - Ogrenci Guvenlik Onlemleri Kaldirici
color 0e

:: Yonetici haklari kontrolu
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ================================================================
    echo  UYARI: Ayarlari eksiksiz kaldirabilmek icin lutfen bu dosyaya
    echo  SAG TIKLAYIP "YONETICI OLARAK CALISTIR" deyiniz.
    echo ================================================================
    echo.
    pause
    exit /b
)

echo ================================================================
echo       KEYLEM PRO - OGRENCI GUVENLIK ONLEMLERI KALDIRICI
echo ================================================================
echo.
echo 1. Gorev Yoneticisi (Task Manager) tekrar aktiflestiriliyor...
echo 2. Dokunmatik kenar kaydirma hareketleri varsayilana donduruluyor...
echo 3. Gorev Gorunumu ve Timeline ayarlari varsayilana donduruluyor...
echo 4. Yapiskan tuslar ve klavye kisayollari varsayilana aliniyor...
echo 5. Calistir (Win + R) engeli kaldiriliyor...
echo 6. Windows baslangic gecikmesi varsayilana aliniyor...
echo 7. Gorev Zamanlayicisindaki KeyLem-Kiosk gorevi kaldiriliyor...
echo.

:: 1. Gorev Yoneticisi Kilidini Kaldir
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /f >nul 2>&1

:: 2. Windows Kenar Kaydirma Kilidini Kaldir
reg delete "HKCU\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v "AllowEdgeSwipe" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v "AllowEdgeSwipe" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\PolicyManager\default\LockDown\AllowEdgeSwipe" /v "value" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\PolicyManager\current\device\LockDown" /v "AllowEdgeSwipe" /f >nul 2>&1

:: 3. Gorev Gorunumu ve Timeline Kilitlerini Kaldir
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "EnableActivityFeed" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "PublishUserActivities" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "UploadUserActivities" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 1 /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "DisabledHotkeys" /f >nul 2>&1

:: 4. Yapiskan Tuslari Varsayilana Dondur
reg add "HKCU\Control Panel\Accessibility\StickyKeys" /v "Flags" /t REG_SZ /d "510" /f >nul 2>&1
reg add "HKCU\Control Panel\Accessibility\ToggleKeys" /v "Flags" /t REG_SZ /d "62" /f >nul 2>&1
reg add "HKCU\Control Panel\Accessibility\Keyboard Response" /v "Flags" /t REG_SZ /d "126" /f >nul 2>&1

:: 5. Calistir (Win + R) Kisitlamasini Kaldir
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /f >nul 2>&1

:: 6. Windows Acilis Gecikmesi Kaydini Temizle
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /f >nul 2>&1

:: 7. Gorev Zamanlayicisindan KeyLem-Kiosk Gorevini Kaldir
schtasks /delete /tn "KeyLem-Kiosk" /f >nul 2>&1

echo [BASARILI] Gorev Yoneticisi aktiflestirildi.
echo [BASARILI] Kenar kaydirma jestleri varsayilana donduruldu.
echo [BASARILI] Gorev Gorunumu ve Timeline normale donduruldu.
echo [BASARILI] Yapiskan tuslar ve Calistir (Win+R) kisitlamalari kaldirildi.
echo [BASARILI] Gorev Zamanlayicisi temizlendi.
echo.
echo ================================================================
echo Sistem basariyla standart Windows fabrika ayarlarina donduruldu.
echo Lutfen degisikliklerin tam uygulanmasi icin bilgisayari yeniden baslatiniz.
echo ================================================================
echo.
pause
