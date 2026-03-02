# Alle PIDs finden, die "ollama" enthalten
$processes = tasklist | Select-String "ollama"

foreach ($proc in $processes) {
    # PID aus der Zeile extrahieren
    if ($proc.Line -match "\s+(\d+)\s+") {
        $mypid = $matches[1]
        Write-Host "Beende Prozess mit PID: $pid"
        taskkill /PID $mypid /F
    }
}