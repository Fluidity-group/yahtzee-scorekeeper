param(
    [string]$SdkRoot = "$env:LOCALAPPDATA\Android\Sdk",
    [string]$JavaHome = 'C:\Program Files\Android\openjdk\jdk-21.0.8',
    [switch]$SkipWebBuild,
    [switch]$Evaluation
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (!(Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) {
    throw 'JDK 21 not found. Pass -JavaHome with your JDK 21 installation path.'
}
if (!(Test-Path -LiteralPath (Join-Path $SdkRoot 'platform-tools\adb.exe'))) {
    throw 'Android SDK not found. Complete Android Studio setup or pass -SdkRoot.'
}
if (!$SkipWebBuild) {
    if ((& node -p 'process.versions.node.split(".")[0]') -ne '24') { throw 'Node 24 is required.' }
    $buildMode = if ($Evaluation) { 'native-evaluation' } else { 'native' }
    Push-Location $projectRoot
    try {
        & node node_modules/vite/bin/vite.js build --mode $buildMode --outDir dist-native
        if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
        & node node_modules/@capacitor/cli/bin/capacitor sync android
    } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'Web build or Capacitor sync failed.' }
}
# Prevent accidentally packaging stale private evaluation assets as a standard APK.
$evaluationMarker = Join-Path $projectRoot 'android\app\src\main\assets\public\godice-evaluation.json'
if ((Test-Path -LiteralPath $evaluationMarker) -ne [bool]$Evaluation) {
    throw 'Synced asset distribution does not match -Evaluation. Run the selected sync first.'
}
$previousJava = $env:JAVA_HOME
$previousGradle = $env:GRADLE_USER_HOME
try {
    $env:JAVA_HOME = $JavaHome
    $env:GRADLE_USER_HOME = Join-Path $projectRoot '.gradle-local'
    Set-Content -LiteralPath (Join-Path $projectRoot 'android\local.properties') -Value ('sdk.dir=' + $SdkRoot.Replace('\', '/')) -Encoding utf8
    & (Join-Path $projectRoot 'android\gradlew.bat') -p (Join-Path $projectRoot 'android') --no-daemon assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    $artifactDir = Join-Path $projectRoot 'artifacts'
    New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk') -Destination (Join-Path $artifactDir $(if ($Evaluation) { 'dice-clubhouse-evaluation-debug.apk' } else { 'dice-clubhouse-debug.apk' })) -Force
    Write-Output ('APK ready: ' + (Join-Path $artifactDir $(if ($Evaluation) { 'dice-clubhouse-evaluation-debug.apk' } else { 'dice-clubhouse-debug.apk' })))
}
finally {
    $env:JAVA_HOME = $previousJava
    $env:GRADLE_USER_HOME = $previousGradle
}
