@echo off
title KeyLem - Ogrenci Guvenlik Onlemleri Aktiflestirici
color 0a

:: Yonetici haklari kontrolu
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ================================================================
    echo  UYARI: Bu guvenlik ayarlarinin eksiksiz uygulanabilmesi icin
    echo  lutfen bu dosyaya SAG TIKLAYIP "YONETICI OLARAK CALISTIR" deyiniz.
    echo ================================================================
    echo.
    pause
    exit /b
)

echo ================================================================
echo      KEYLEM PRO - OGRENCI GUVENLIK ONLEMLERI AKTIFLESTIRICI
echo ================================================================
echo.
echo 1. Gorev Yoneticisi (Ctrl+Alt+Del) kilitleniyor...
echo 2. Dokunmatik ekran kenar hareketleri (Sol/Sag/Alt) kilitleniyor...
echo 3. Gorev Gorunumu (Task View) ve Zaman Tuneli (Timeline) kapatiliyor...
echo 4. Yapiskan Tuslar (5 kez Shift basma - sethc.exe) kapatiliyor...
echo 5. Calistir Menusu (Win + R) kisitlaniyor...
echo 6. Windows acilis gecikmesi sifirlaniyor (Aninda baslatma)...
echo 7. Windows Gorev Zamanlayicisi ile en yuksek oncelik ataniyor...
echo.

:: 1. Gorev Yoneticisini Devre Disi Birak (TaskMgr Kilidi)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f >nul 2>&1

:: 2. Windows Kenar Kaydirma Hareketlerini Kapat (Sol kenardan Task View, sag kenardan Bildirim, alttan Baslat)
reg add "HKCU\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\PolicyManager\default\LockDown\AllowEdgeSwipe" /v "value" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\PolicyManager\current\device\LockDown" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f >nul 2>&1

:: 3. Windows Gorev Gorunumu (Task View) ve Zaman Tuneli (Timeline) Kapatma
:: Sol kenardan cekildiginde PowerPoint ve diger pencerelerin timeline seklinde acilmasini engeller
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "EnableActivityFeed" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "PublishUserActivities" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v "UploadUserActivities" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "ShowTaskViewButton" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v "DisabledHotkeys" /t REG_SZ /d "Tab" /f >nul 2>&1

:: 4. Yapiskan Tuslar Kisayolunu Kapat (5 kez Shift'e basildiginda pencere acilmasini engeller)
reg add "HKCU\Control Panel\Accessibility\StickyKeys" /v "Flags" /t REG_SZ /d "506" /f >nul 2>&1
reg add "HKCU\Control Panel\Accessibility\ToggleKeys" /v "Flags" /t REG_SZ /d "58" /f >nul 2>&1
reg add "HKCU\Control Panel\Accessibility\Keyboard Response" /v "Flags" /t REG_SZ /d "122" /f >nul 2>&1

:: 5. Calistir (Win + R) Kisitlamasi
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /t REG_DWORD /d 1 /f >nul 2>&1

:: 6. Windows Acilis Gecikmesini (Startup Delay) Sifirla
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize" /v "StartupDelayInMSec" /t REG_DWORD /d 0 /f >nul 2>&1

:: 7. Windows Gorev Zamanlayicisina En Yuksek Yetkiyle Ekle (Gecikmesiz Sistem Baslangici)
set "BAT_PATH=%~dp0Start-KeyLem.bat"
schtasks /create /tn "KeyLem-Kiosk" /tr "\"%BAT_PATH%\"" /sc onlogon /rl highest /f >nul 2>&1

:: 8. Windows Oynukleme Menusu Gecikmesini Kapat
bcdedit /set {bootmgr} displaybootmenu no >nul 2>&1

echo [BASARILI] Gorev Yoneticisi (Task Manager) kilitlendi.
echo [BASARILI] Dokunmatik kenar kaydirma hareketleri kapatildi (AllowEdgeSwipe=0).
echo [BASARILI] Gorev Gorunumu (Task View / Timeline) devre disi birakildi.
echo [BASARILI] Yapiskan tuslar ve Win+R acilis kisayollari engellendi.
echo [BASARILI] Sistem acilis gecikmesi sifirlandi (Gorev Zamanlayici kuruldu).
echo.
echo ================================================================
echo TEBRIKLER! Akilli tahta ogrenci mudahalelerine karsi tam guvenli hale getirildi.
echo.
echo ----------------------------------------------------------------
echo [!] KRITIK BILGI (LUTFEN OKUYUNUZ):
echo Dokunmatik sol kenar kaydirma (Task View / Gorev Gorunumu)
echo engelinin Windows tarafindan belleğe alinip devreye girmesi icin
echo AKILLI TAHTANIN (BILGISAYARIN) YENIDEN BASLATILMASI (RESTART) SARTTIR!
echo ----------------------------------------------------------------
echo.
set /p REBOOT="Akilli tahtayi SIMDI yeniden baslatmak istiyor musunuz? (E: Evet / H: Hayir): "
if /i "%REBOOT%"=="E" (
    echo.
    echo Akilli tahta 5 saniye icinde yeniden baslatiliyor...
    shutdown /r /t 5
    exit /b
)
echo.
echo Lutfen en kisa surede akilli tahtayi el ile yeniden baslatiniz.
echo.
pause
