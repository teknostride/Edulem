# KeyLem - Akilli Tahta Windows Pencere Yoneticisi & Arka Plan Koprusu
# JavaScript tarafindan gonderilen komutlari Win32 API seviyesinde isler:
# KEYLEM_ACTION_WIDGET_<saniye> -> Tarayiciyi gizle (gorev cubugundan kaldir), native WPF widget'ini baslat
# KEYLEM_ACTION_LOCK / KEYLEM_ACTION_EXPAND -> Tarayiciyi tam ekran yap
# KEYLEM_ACTION_MINIMIZE -> Tarayiciyi gorev cubuguna indir

# Tek bir Bridge ornegi calismasini sagla
$myPid = $PID
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $myPid -and $_.CommandLine -match "powershell.*-File.*KeyLem-Bridge\.ps1"
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class KeyLemWin32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

$SW_MAXIMIZE = 3
$SW_RESTORE  = 9
$SW_HIDE     = 0

$lastAction  = ""
$widgetProc  = $null
$hiddenHwnd  = [IntPtr]::Zero   # Gizlenen tarayici pencere handle'i

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = "C:\KeyLem" }
$widgetScript = Join-Path $scriptDir "KeyLem-Widget.ps1"
if (-not (Test-Path $widgetScript)) { $widgetScript = "C:\KeyLem\KeyLem-Widget.ps1" }

while ($true) {
    Start-Sleep -Milliseconds 250
    try {
        # Gorunen pencerelerden sinyal oku
        $processes = Get-Process -Name chrome, msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' }
        foreach ($proc in $processes) {
            $title = $proc.MainWindowTitle
            $hwnd  = $proc.MainWindowHandle
            if ($hwnd -eq [IntPtr]::Zero) { continue }

            # ── WIDGET: Tarayiciyi tamamen gizle (gorev cubugundan kaldir) ──
            if ($title -match "KEYLEM_ACTION_WIDGET_(\d+)" -and $lastAction -ne "WIDGET") {
                $lastAction = "WIDGET"
                $secs = [int]$matches[1]

                # Handle'i sakla, sonra TAMAMEN gizle (SW_HIDE)
                $hiddenHwnd = $hwnd
                [KeyLemWin32]::ShowWindow($hwnd, $SW_HIDE) | Out-Null

                # Eski widget calisiyorsa kapat
                if ($widgetProc -ne $null -and !$widgetProc.HasExited) {
                    try { $widgetProc.Kill() } catch {}
                }

                # Native WPF widget'i baslat (kalan sureyi parametre olarak gec)
                if (Test-Path $widgetScript) {
                    $widgetProc = Start-Process powershell.exe -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$widgetScript`" -Seconds $secs" -PassThru
                }
            }
            # ── LOCK / EXPAND: Tam ekran yap ve one getir ──
            elseif (($title -like "*KEYLEM_ACTION_LOCK*" -or $title -like "*KEYLEM_ACTION_EXPAND*") -and $lastAction -ne "FULLSCREEN") {
                $lastAction = "FULLSCREEN"
                $hiddenHwnd = [IntPtr]::Zero
                # Widget aciksa kapat
                if ($widgetProc -ne $null -and !$widgetProc.HasExited) {
                    try { $widgetProc.Kill() } catch {}
                }
                [KeyLemWin32]::ShowWindow($hwnd, $SW_RESTORE) | Out-Null
                [KeyLemWin32]::ShowWindow($hwnd, $SW_MAXIMIZE) | Out-Null
                [KeyLemWin32]::PostMessage($hwnd, 0x0112, [IntPtr]0xF030, [IntPtr]::Zero) | Out-Null
                [KeyLemWin32]::BringWindowToTop($hwnd) | Out-Null
                [KeyLemWin32]::SetForegroundWindow($hwnd) | Out-Null
            }
            elseif ($title -notlike "*KEYLEM_ACTION_*") {
                $lastAction = ""
            }
        }

        # Gizli pencereyi kontrol et: LOCK/EXPAND sinyali baslik degistirince burada yakala
        if ($hiddenHwnd -ne [IntPtr]::Zero -and [KeyLemWin32]::IsWindow($hiddenHwnd)) {
            $sb = New-Object System.Text.StringBuilder 512
            [KeyLemWin32]::GetWindowText($hiddenHwnd, $sb, 512) | Out-Null
            $hiddenTitle = $sb.ToString()

            if ($hiddenTitle -like "*KEYLEM_ACTION_LOCK*" -or $hiddenTitle -like "*KEYLEM_ACTION_EXPAND*") {
                $lastAction = "FULLSCREEN"
                # Widget kapat
                if ($widgetProc -ne $null -and !$widgetProc.HasExited) {
                    try { $widgetProc.Kill() } catch {}
                }
                # Tarayiciyi geri getir ve tam ekran yap
                [KeyLemWin32]::ShowWindow($hiddenHwnd, $SW_RESTORE) | Out-Null
                [KeyLemWin32]::ShowWindow($hiddenHwnd, $SW_MAXIMIZE) | Out-Null
                [KeyLemWin32]::PostMessage($hiddenHwnd, 0x0112, [IntPtr]0xF030, [IntPtr]::Zero) | Out-Null
                [KeyLemWin32]::BringWindowToTop($hiddenHwnd) | Out-Null
                [KeyLemWin32]::SetForegroundWindow($hiddenHwnd) | Out-Null
                $hiddenHwnd = [IntPtr]::Zero
            }
        }
    }
    catch {
        # Hata durumunda sessizce devam et
    }
}
