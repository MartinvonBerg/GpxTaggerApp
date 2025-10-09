# PowerShell Skript zum Beenden aller Prozesse mit einem bestimmten Namen  
  
param (  
    [string]$processName = "GpxTaggerApp"  # Ersetze "deineAppName" mit dem Namen des Prozesses, den du beenden möchtest  
)  
  
# Get all processes with the specified name  
$processes = Get-Process -Name $processName -ErrorAction SilentlyContinue  
  
if ($processes) {  
    foreach ($process in $processes) {  
        try {  
            # Kill the process  
            Stop-Process -Id $process.Id -Force  
            Write-Host "Prozess $($processName) mit ID $($process.Id) wurde beendet."  
        } catch {  
            Write-Host "Fehler beim Beenden des Prozesses $($processName) mit ID $($process.Id): $_"  
        }  
    }  
} else {  
    Write-Host "Keine Prozesse mit dem Namen $($processName) gefunden."  
}  