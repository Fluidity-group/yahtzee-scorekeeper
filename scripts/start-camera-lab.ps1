param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (!(Test-Path -LiteralPath $nodePath)) { throw 'Node.js is required. Install Node.js LTS or run from the Codex environment.' }
Push-Location $projectRoot
try {
    if (!(Test-Path -LiteralPath 'public/camera-assets/manifest.json')) {
        & $nodePath scripts/setup-camera-assets.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Camera asset download failed.' }
    }
    if (!$SkipBuild) {
        & $nodePath node_modules/vite/bin/vite.js build
        if ($LASTEXITCODE -ne 0) { throw 'Build failed. Check that project dependencies are installed for Windows.' }
    }
    Write-Host 'Open the Local URL printed below, followed by ?camera-lab, in Chrome or Edge.'
    Write-Host 'Keep this terminal running. Press Ctrl+C to stop the local server.'
    & $nodePath node_modules/vite/bin/vite.js preview --host 127.0.0.1
} finally { Pop-Location }
