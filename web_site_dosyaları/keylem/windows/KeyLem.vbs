' ====================================================================
' KeyLem Akilli Tahta Kilit Sistemi - SIFIR TERMINAL BASLATICI (VBS)
' Tarayiciyi izole profil, tam ekran ve kenar kaydirma engelli olarak baslatir.
' ====================================================================
Option Explicit

Dim WshShell, fso, targetUrl, browser, candidates, c, scriptDir, bridgeScript, profileDir, flags

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Hedef URL (Online EduLem KeyLem Adresi)
targetUrl = "https://edulem.com/keylem/index.html"
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 2. Arka Plan Masaustu Kucultme Koprusunu (PowerShell Bridge) Sessizce Baslat
bridgeScript = fso.BuildPath(scriptDir, "KeyLem-Bridge.ps1")
If fso.FileExists(bridgeScript) Then
    WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & bridgeScript & """", 0, False
End If

' 3. Edge veya Chrome Tarayicilarini Tum Olasi Dizinlerde Ara
candidates = Array(_
    "C:\Program Files\Google\Chrome\Application\chrome.exe", _
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", _
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", _
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe", _
    WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe", _
    WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Microsoft\Edge\Application\msedge.exe" _
)

browser = ""
For Each c In candidates
    If fso.FileExists(c) Then
        browser = c
        Exit For
    End If
Next

' 4. Izole Profil Dizini (Kisisel sekmelerden bagimsiz saf kiosk calismasi)
profileDir = "C:\KeyLem\Profile"

' 5. Kiosk / Tam Ekran / Dokunmatik Guvenlik Bayraklari
flags = "--user-data-dir=""" & profileDir & """ --app=""" & targetUrl & """ --start-fullscreen --start-maximized --no-first-run --no-default-browser-check --overscroll-history-navigation=0 --disable-pinch --disable-features=TouchpadOverscrollHistoryNavigation,PullToRefresh,EdgeSwipeNavigation --edge-touch-filtering --disable-session-crashed-bubble"

If browser <> "" Then
    WshShell.Run """" & browser & """ " & flags, 3, False
Else
    WshShell.Run """" & targetUrl & """", 3, False
End If

Set WshShell = Nothing
Set fso = Nothing
