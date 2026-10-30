# SW070: Qualified Android build; Pixel installation pending

30 October 2026. Owner: Dan. Coordinator: Codex. Target: existing Pixel 11 Pro XL app only; iPhone and backend excluded. Owner explicitly authorized fg-dev wireless ADB, exact-source compilation, installed-signer comparison, data-preserving update and launch verification.

## Source and qualification

Source: master `9179f735c02438475245d3846e25fb6ed0239cbc`, built in isolated branch `codex/sw070-pixel-update` at `/srv/yahtzee/main/artifacts/sw070/source`. Shared master checkout remains untouched. Node24.15.0 locked root/Pi installs; clean source full gate passed 1,216 tests with 13 optional camera skips, all configured builds and stable source inventory. Evidence: `artifacts/engineering/2026-10-30T22-57-05-582Z-1e46510b/report.json` relative to the isolated checkout. Source digest `fa249e82dac706e46e7060bd7497d2c36aade12d3521388ef1c88941e99273d0`.

Android built with scoped JDK21.0.12.1, SDK36 and Gradle8.14.3; host default Java remains unchanged. `testDebugUnitTest assembleDebug` passed, including 19 native unit tests with zero failures/errors/skips. Linux Gradle executes the existing Windows build helper's native compilation step after explicit manual web preparation and Android sync.

## Package identity

Validated the owner-supplied ignored public-only configuration with `prepare-ios-test.mjs --check`, then prepared MODE=ios-test assets and synced Android. Effective push=false and commentary endpoint empty are enforced by the qualified validator. Public configuration and private signing material are not recorded in Git. Forty-three prepared public assets match synced Android and APK byte-for-byte; app ID `com.fluiditygroup.diceclubhouse.dev` verified and evaluation marker absent.

APK: `/srv/yahtzee/main/artifacts/sw070/source/android/app/build/outputs/apk/debug/app-debug.apk`.
SHA256: `c5d9d0a59f815d1a66ab6e9b9ae5b3167260a67946a638c7decc2280622340ee`.
Verified APK signing certificate SHA256: `e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8`, matching the explicitly authorized existing fg-dev debug signer and historical SW067 certificate. Fresh installed-app signer comparison remains mandatory before installation.

## Deployment and remaining gates

Not installed. The supplied temporary pairing exchange failed; the discovered wireless installation endpoint also failed to connect. Await fresh pairing details. No uninstall, data-clear, live game command, iPhone operation or backend deployment occurred.

Before installation: freshly identify Pixel, preserve its installed APK and package metadata, verify its actual signer against this APK, then perform targeted `install -r`. Read back installed package hash and verify launcher start. Stop on any signer/app mismatch; never uninstall or clear data. Retain previous signed APK for owner-authorized rollback via same-ID/signer replacement.

Installation/launch will not establish account/tournament continuity or complete manual-game acceptance. Owner must check return to existing accounts/table, scoring/Undo, Home/Resume, reconnect and results. No independent or physical acceptance is claimed.

Evidence outside Git: `/srv/yahtzee/main/artifacts/sw070/engineering-gate.log`, `manual-assets.log`, `android-build.log`, `public-assets.json`, and the isolated checkout's engineering/native test reports. No application changes were made by SW070.
