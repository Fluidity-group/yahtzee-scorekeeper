$ErrorActionPreference = 'Stop'
$labRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$labNode = (Get-Command node).Source
$labLogs = Join-Path $labRoot 'artifacts/amber-lab'
New-Item -ItemType Directory -Force -Path $labLogs | Out-Null
try {
    $labExisting = Invoke-RestMethod -Uri 'http://192.168.1.148:8475/__lab/status' -TimeoutSec 3
    if ($labExisting.branch -eq 'codex/amber-ui-lab') {
        Write-Output 'Lab already running: http://192.168.1.148:8475/lab/'
        return
    }
} catch { }
$labProcess = Start-Process -FilePath $labNode -ArgumentList 'node_modules/vite/bin/vite.js','--config','lab/vite.config.js' -WorkingDirectory $labRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $labLogs 'server.log') -RedirectStandardError (Join-Path $labLogs 'server-error.log') -PassThru
if ($labProcess.WaitForExit(700)) { throw "Lab stopped during startup. Check $labLogs/server-error.log" }
$labProcess.Id | Set-Content (Join-Path $labLogs 'server.pid')
Write-Output 'Playable lab started: http://192.168.1.148:8475/lab/'
