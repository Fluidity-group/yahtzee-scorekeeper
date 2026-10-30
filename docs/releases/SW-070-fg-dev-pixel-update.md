# SW070: Qualified Android build installed on Pixel

30 October 2026. Owner: Dan. Coordinator: Codex. Target: existing Pixel 11 Pro XL app only; iPhone and backend excluded. Owner explicitly authorized fg-dev wireless ADB, exact-source compilation, installed-signer comparison, data-preserving update and launch verification.

## Source and qualification

Source: master `9179f735c02438475245d3846e25fb6ed0239cbc`, built in isolated branch `codex/sw070-pixel-update` at `/srv/yahtzee/main/artifacts/sw070/source`. Shared master checkout remains untouched. Node24.15.0 locked root/Pi installs; clean source full gate passed 1,216 tests with 13 optional camera skips, all configured builds and stable source inventory. Evidence: `artifacts/engineering/2026-10-30T22-57-05-582Z-1e46510b/report.json` relative to the isolated checkout. Source digest `fa249e82dac706e46e7060bd7497d2c36aade12d3521388ef1c88941e99273d0`.

Android built with scoped JDK21.0.12.1, SDK36 and Gradle8.14.3; host default Java remains unchanged. `testDebugUnitTest assembleDebug` passed, including 19 native unit tests with zero failures/errors/skips. Linux Gradle executes the existing Windows build helper's native compilation step after explicit manual web preparation and Android sync.

## Package identity

Validated the owner-supplied ignored public-only configuration with `prepare-ios-test.mjs --check`, then prepared MODE=ios-test assets and synced Android. Effective push=false and commentary endpoint empty are enforced by the qualified validator. Public configuration and private signing material are not recorded in Git. Forty-three prepared public assets match synced Android and APK byte-for-byte; app ID `com.fluiditygroup.diceclubhouse.dev` verified and evaluation marker absent.

APK: `/srv/yahtzee/main/artifacts/sw070/source/android/app/build/outputs/apk/debug/app-debug.apk`.
SHA256: `bfb58235fbbd75e356256e2b77487b5819d85479c78ba95a61502855be8b4e01`.
Verified APK signing certificate SHA256: `e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8`, matching the explicitly authorized existing fg-dev debug signer and historical SW067 certificate. Fresh installed-app certificate matched before installation. Prior installed APK SHA256 `eab2d159784122cb86f32e70a7d9ce91f7ea3cc1eb01e5b98068e78e13be4103` retained at ignored `artifacts/sw070/pixel-before.apk` outside the build checkout.

## Deployment and remaining gates

Fresh wireless pairing succeeded and the owner's Pixel11ProXL was verified. Installed application was versionCode70 while qualified source defaults to1. A build-only Gradle init script (`/srv/yahtzee/main/artifacts/sw070/android-version.init.gradle`) sets versionCode71 through androidComponents.finalizeDsl; no application source changes or downgrade flags. Repeated native test/assembly passed. The 43 prepared asset hashes and candidate signer were reverified after rebuilding; aapt confirmed exact app ID/versionCode71/versionName1.0.

Targeted `adb install -r` returned Success. Installed APK read back byte-for-byte matched the final candidate hash. Package identity and original installation metadata remained unchanged; device-specific values are retained only in ignored local evidence. MainActivity launch returned Status ok, cold start384ms. No uninstall, data clear, private-data read, live game command, iPhone operation or backend deployment occurred. Installation timestamp UTC: `2026-10-30T23:02:44.128765+00:00`.

Rollback APK is preserved separately; only use an owner-authorized same-ID/signer replacement. Its older versionCode may require an explicitly reviewed rollback packaging strategy; no downgrade was attempted.

Installation/launch will not establish account/tournament continuity or complete manual-game acceptance. Owner must check return to existing accounts/table, scoring/Undo, Home/Resume, reconnect and results. No independent or physical acceptance is claimed.

Evidence outside Git: `/srv/yahtzee/main/artifacts/sw070/engineering-gate.log`, `manual-assets.log`, `android-build.log`, `public-assets.json`, `android-build-71.log`, `preinstall-verification.json`, `installation.json`, `pixel-before-package.txt`, `pixel-after-package.txt`, `pixel-launch.txt`, before/after APKs and the isolated checkout's engineering/native test reports. No application changes were made by SW070.
