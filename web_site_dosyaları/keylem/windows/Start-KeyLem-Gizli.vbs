' KeyLem - Akıllı Tahta Sessiz / Gizli Başlatıcı (Sıfır Terminal)
Option Explicit
Dim WshShell
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & Replace(WScript.ScriptFullName, "Start-KeyLem-Gizli.vbs", "KeyLem.vbs") & """", 0, False
Set WshShell = Nothing
