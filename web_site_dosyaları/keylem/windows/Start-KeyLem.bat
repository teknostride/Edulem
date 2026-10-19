@echo off
title KeyLem Kiosk
cd /d "C:\KeyLem"

:: 1. Masaustu Always-On-Top widget koprusu arka planda baslat
if exist "C:\KeyLem\KeyLem-Bridge.ps1" (
    start /min powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\KeyLem\KeyLem-Bridge.ps1"
)

:: 2. VBS ile kiosk tarayicisini sessizce ac
if exist "C:\KeyLem\KeyLem.vbs" (
    start "" wscript.exe "C:\KeyLem\KeyLem.vbs"
    exit
)

:: 3. Yedek: Dogrudan Chrome/Edge
set "PROFILE_DIR=C:\KeyLem\Profile"
start chrome.exe --user-data-dir="%PROFILE_DIR%" --app="https://edulem.com/keylem/index.html" --start-fullscreen --start-maximized --no-first-run --no-default-browser-check --overscroll-history-navigation=0 --disable-pinch --disable-features=TouchpadOverscrollHistoryNavigation,PullToRefresh,EdgeSwipeNavigation --edge-touch-filtering
exit
