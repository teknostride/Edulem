# KeyLem - Akilli Tahta Kayan Masaustu Widget'i (Always-On-Top)
# Bu script KeyLem-Bridge.ps1 tarafindan otomatik baslatilir.
# Bagimsiz bir WPF penceresi olarak calisir - tarayiciya ihtiyac yoktur.
param([int]$Seconds = 2400)

# Eger zaten calisan bir KeyLem widget varsa sonlandir (tekil ornek)
$myPid = $PID
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessId -ne $myPid -and $_.CommandLine -match "powershell.*-File.*KeyLem-Widget\.ps1"
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class KLW32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
"@ -ErrorAction SilentlyContinue

$SW_MAXIMIZE = 3
$SW_RESTORE  = 9

function Restore-Browser([string]$keyToSend = "") {
    $procs = Get-Process -Name chrome, msedge -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
            [KLW32]::ShowWindow($p.MainWindowHandle, $SW_RESTORE) | Out-Null
            [KLW32]::ShowWindow($p.MainWindowHandle, $SW_MAXIMIZE) | Out-Null
            [KLW32]::PostMessage($p.MainWindowHandle, 0x0112, [IntPtr]0xF030, [IntPtr]::Zero) | Out-Null
            [KLW32]::BringWindowToTop($p.MainWindowHandle) | Out-Null
            [KLW32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
        }
    }
    if ($keyToSend -ne "") {
        Start-Sleep -Milliseconds 250
        [System.Windows.Forms.SendKeys]::SendWait($keyToSend)
    }
}

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="KeyLemWidget"
        Height="58" Width="490"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        Topmost="True"
        ShowInTaskbar="False"
        ResizeMode="NoResize"
        WindowStartupLocation="Manual">
  <Border CornerRadius="29" BorderThickness="1.5">
    <Border.Background>
      <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
        <GradientStop Color="#E60F172A" Offset="0"/>
        <GradientStop Color="#E6111827" Offset="1"/>
      </LinearGradientBrush>
    </Border.Background>
    <Border.BorderBrush>
      <SolidColorBrush Color="#6038BDF8"/>
    </Border.BorderBrush>
    <Border.Effect>
      <DropShadowEffect BlurRadius="20" ShadowDepth="6" Opacity="0.7" Color="#000000"/>
    </Border.Effect>
    <Grid Margin="12,0" Height="44" VerticalAlignment="Center">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>

      <Button Name="btnClasslem" Grid.Column="0"
              Padding="14,0" Height="36" Margin="0,0,10,0"
              FontSize="13" FontWeight="Bold" Foreground="White" BorderThickness="0"
              VerticalAlignment="Center" Cursor="Hand">
        <Button.Content>
          <StackPanel Orientation="Horizontal">
            <TextBlock Text="&#x26A1; " FontSize="14" VerticalAlignment="Center"/>
            <TextBlock Text="ClassLem" FontSize="13" FontWeight="Bold" VerticalAlignment="Center"/>
          </StackPanel>
        </Button.Content>
        <Button.Background>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
            <GradientStop Color="#2563EB" Offset="0"/>
            <GradientStop Color="#1D4ED8" Offset="1"/>
          </LinearGradientBrush>
        </Button.Background>
        <Button.Template>
          <ControlTemplate TargetType="Button">
            <Border Background="{TemplateBinding Background}" CornerRadius="18" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
          </ControlTemplate>
        </Button.Template>
      </Button>

      <StackPanel Grid.Column="1" Orientation="Horizontal" HorizontalAlignment="Center" VerticalAlignment="Center" Margin="4,0">
        <TextBlock Text="&#x23F1; " Foreground="#34D399" FontSize="16" VerticalAlignment="Center"/>
        <TextBlock Name="txtTimer" Text="40:00" Foreground="#34D399" FontWeight="ExtraBold" FontSize="18" VerticalAlignment="Center"/>
      </StackPanel>

      <Button Name="btnExtend" Grid.Column="2"
              Padding="10,0" Height="32" Margin="0,0,8,0"
              FontSize="12" FontWeight="SemiBold" Foreground="#E2E8F0" BorderThickness="0"
              VerticalAlignment="Center" Cursor="Hand">
        <Button.Content>
          <TextBlock Text="+10 Dk" FontSize="12" FontWeight="SemiBold"/>
        </Button.Content>
        <Button.Background>
          <SolidColorBrush Color="#334155"/>
        </Button.Background>
        <Button.Template>
          <ControlTemplate TargetType="Button">
            <Border Background="{TemplateBinding Background}" CornerRadius="16" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
          </ControlTemplate>
        </Button.Template>
      </Button>

      <Button Name="btnLock" Grid.Column="3"
              Padding="14,0" Height="36"
              FontSize="13" FontWeight="Bold" Foreground="White" BorderThickness="0"
              VerticalAlignment="Center" Cursor="Hand">
        <Button.Content>
          <StackPanel Orientation="Horizontal">
            <TextBlock Text="&#x1F512; " FontSize="13" VerticalAlignment="Center"/>
            <TextBlock Text="Kilitle" FontSize="13" FontWeight="Bold" VerticalAlignment="Center"/>
          </StackPanel>
        </Button.Content>
        <Button.Background>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
            <GradientStop Color="#DC2626" Offset="0"/>
            <GradientStop Color="#B91C1C" Offset="1"/>
          </LinearGradientBrush>
        </Button.Background>
        <Button.Template>
          <ControlTemplate TargetType="Button">
            <Border Background="{TemplateBinding Background}" CornerRadius="18" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
          </ControlTemplate>
        </Button.Template>
      </Button>
    </Grid>
  </Border>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Ekranin sag ust kosesine yerlestir
$sw = [System.Windows.SystemParameters]::PrimaryScreenWidth
$window.Left = $sw - 490 - 16
$window.Top = 16

# Dokunmatik / fare surukle destegi
$window.Add_MouseLeftButtonDown({ $window.DragMove() })

$btnClasslem = $window.FindName("btnClasslem")
$txtTimer    = $window.FindName("txtTimer")
$btnExtend   = $window.FindName("btnExtend")
$btnLock     = $window.FindName("btnLock")

$script:secondsLeft = $Seconds

function Format-Time([int]$s) {
    "{0:D2}:{1:D2}" -f [int][Math]::Floor($s / 60), ($s % 60)
}

$txtTimer.Text = Format-Time $script:secondsLeft

$btnClasslem.Add_Click({
    $dispatcherTimer.Stop()
    Restore-Browser "{F9}"
    $window.Close()
})

$btnLock.Add_Click({
    $dispatcherTimer.Stop()
    Restore-Browser "{F8}"
    $window.Close()
})

$btnExtend.Add_Click({
    $script:secondsLeft += 600
    $txtTimer.Text = Format-Time $script:secondsLeft
})

$dispatcherTimer = New-Object System.Windows.Threading.DispatcherTimer
$dispatcherTimer.Interval = [TimeSpan]::FromSeconds(1)
$dispatcherTimer.Add_Tick({
    $script:secondsLeft--
    if ($script:secondsLeft -le 0) {
        $dispatcherTimer.Stop()
        Restore-Browser "{F8}"
        $window.Close()
    } else {
        $txtTimer.Text = Format-Time $script:secondsLeft
    }
})
$dispatcherTimer.Start()

$window.ShowDialog() | Out-Null
