# Android prototype

The Capacitor shell packages the existing vanilla-JavaScript game. It uses development ID
`com.fluiditygroup.diceclubhouse.dev` and label **Dice Clubhouse Dev**. These are provisional,
not a Play Store registration. No release signing key or store upload is configured.

## Local setup

- Android Studio: `C:\Program Files\Android\Android Studio`
- Android SDK: `%LOCALAPPDATA%\Android\Sdk`
- JDK 21: `C:\Program Files\Android\openjdk\jdk-21.0.8`
- JavaScript: Node 24 on PATH, selected per command.

The generated Gradle 8.14.3 build needs a compatible JDK; the newly installed Studio's
bundled Java 25 is not used. In Android Studio, set **this project's Gradle JDK** to the
JDK 21 path above. Do not change global Java/Node settings for other projects.

Open the `android` folder in Android Studio, not the repository root. The project uses
compile/target SDK 36 and minimum SDK 24, matching the Capacitor 8 template. The first
Gradle build can download required SDK packages if the installed licences already cover them.

## Build distributions

Standard `npm run build:native` and `npm run android:sync` use the versioned generic BLE connection panel. It tests connections only; it does not decode dice or enable GoDice game capture. The private panel is deliberately excluded from the supported source snapshot.

Authorized local evaluation requires separately provisioned ignored `local-evaluation/godice/panel.js`: use `npm run build:native:evaluation` or `npm run android:sync:evaluation`. Both native modes use root asset paths and disable PWA updates. Evaluation emits `godice-evaluation.json` with `local-android-evaluation` distribution; the web publishing guard continues to reject this marker. Both sync commands overwrite `dist-native` and the same Capacitor assets: always run the selected sync before packaging. Missing private input is a build failure, never an automatic fallback. Existing native-mode .env configuration must also be supplied as .env.native-evaluation for private builds; do not version credentials.

PowerShell packaging uses `-Evaluation` for private builds and names their APK `dice-clubhouse-evaluation-debug.apk`. The marker must match the requested distribution, including with `-SkipWebBuild`. No APK or physical acceptance is implied by a web bundle build.

## Repeatable build

From PowerShell in the repository:

```powershell
.\scripts\build-android.ps1
```

This builds into `dist-native`, copies it with Capacitor, runs the Windows Gradle wrapper
with JDK 21 and a repository-local Gradle cache, then copies the APK to
`artifacts\dice-clubhouse-debug.apk`. Environment changes are restored at the end. The
script never stops shared Gradle/ADB/Node processes. Paths can be overridden with
`-SdkRoot` and `-JavaHome`. `-SkipWebBuild` reuses the last synced assets for native-only work.

The browser build remains `npm run build` with its PWA service worker. The native build
disables that worker so app assets update together with the APK. There is no development
server URL baked into the app: the manual game works from bundled assets. Android and
browser saves use separate storage; installing the APK does not import browser games.

## Pixel test

Enable Developer options and USB debugging, connect with a USB data cable, and authorize
this PC on the phone. Use Android Studio's Run button with the Pixel selected, or install
the debug APK using SDK `platform-tools\adb.exe`. Do not uninstall between normal test
builds if you want to preserve local games. Do not revoke debugging authorizations used
by unrelated development sessions.

Check new game, scorecard count/fixed/keypad scoring, zero, corrections, bonus turns,
screen rotation, status/gesture bar clearance, background/resume, and force-close/reopen
save recovery. Also check the back button, JSON export and the dice lab; browser smoke
tests cannot establish that these work identically inside Android's WebView.

No GoDice Bluetooth API is included: its commercial licence remains a separate gate.
Accounts, online joining, payments and production commentary are not implemented.

## Verified on 2026-09-16

The repeatable script produced a 4.33 MB signed debug APK. APK inspection confirmed bundled
web assets and no service worker. All 164 JavaScript tests and the browser production build
passed. ADB installed the app successfully on the connected Pixel 11 Pro XL and reported a
successful cold launch. Visual layout, touch interaction and persistence still need the
user's device check; a successful activity launch does not establish those behaviours.

Sources: [Capacitor setup](https://capacitorjs.com/docs/getting-started/environment-setup),
[Android workflow](https://capacitorjs.com/docs/android). Versions are pinned in the lockfile.

System-bar fix: MainActivity now pads the native content container using system-bar, display-cutout and keyboard insets. SystemBars CSS inset handling is disabled to avoid double padding. Zeroed handled insets are forwarded to WebView for rotation/keyboard updates. Pixel diagnostics confirmed top/bottom padding of 161/88 physical pixels on the test device. Check portrait, landscape and the sign-in keyboard during device acceptance.



## C121 first development slice

Android local game setup now offers C121 camera input. Start a camera turn, then Capture / review dice. Camera connection opens a native credential sheet; credentials do not enter JS/localStorage. Connect on the same Wi-Fi, calibrate eight inside tray corners, capture a settled scene, review/correct five logical slots and kept dice, then Confirm roll. The game computes legal category recommendations from accepted dice; category scoring is a separate confirmation. Correct/exclude confirmed rolls or finish manually when needed. Hosted camera rooms and optional approach-side hints are not enabled yet.

The first camera APK and exact development evidence are in `plans/SW-006-first-slice-results.md`. No fixture or actual C121 was connected. Verify actual pixels, native overlay/layout and latency on an identified phone before using this as POC evidence. Snapshot timestamps mean local render, not camera exposure. Hidden-preview updates and stream-to-scene lag need measurement. Capture is deliberately player-triggered; a newer frame does not by itself verify a physical reroll.
