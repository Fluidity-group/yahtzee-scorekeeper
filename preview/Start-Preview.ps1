param([string]$PublicConfig)
$ErrorActionPreference = 'Stop'
$previewRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (!$PublicConfig) { $PublicConfig = Join-Path $previewRoot '../../sw045/source/.env.ios-test.local' }
$env:YAHTZ_PREVIEW_CONFIG = (Resolve-Path -LiteralPath $PublicConfig).Path
$previewLogs = Join-Path $previewRoot 'artifacts/phone-preview'
New-Item -ItemType Directory -Force -Path $previewLogs | Out-Null
$previewNode = (Get-Command node).Source
$previewProcess = Start-Process -FilePath $previewNode -ArgumentList 'node_modules/vite/bin/vite.js','--config','preview/vite.config.js' -WorkingDirectory $previewRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewLogs 'server.log') -RedirectStandardError (Join-Path $previewLogs 'server-error.log') -PassThru
if ($previewProcess.WaitForExit(1000)) { throw "Preview stopped. Check $previewLogs/server-error.log" }
$previewProcess.Id | Set-Content (Join-Path $previewLogs 'server.pid')
Write-Output 'Amber multiplayer test version: http://192.168.1.148:8476/'
