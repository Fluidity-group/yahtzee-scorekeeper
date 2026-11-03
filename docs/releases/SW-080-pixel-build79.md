# SW080: Pixel build79 installed in place

1 November 2026. Owner: Dan. Implementer/self-review: Codex/fluidity. State: qualified, installed and launched; owner data/gameplay acceptance pending. Isolated `codex/sw080-pixel-build79`, base `5345722` on SW079/PR #12. Shared checkout/master, Amber's iPhone, backend/web and empty OTA feed were not changed by this task.

## Source and package

- Web source: clean `3ff068b490a587a636b888522b6da1fe5b95b3f5`, source digest `ebf71f8d4037c61d2d615650ae57faa1e7b2315ec7342f57a48bec9c11878125`. Rebuilt in detached build-only `artifacts/sw080/qualified-web`; all57 prepared/Android-synced/APK files match the recorded installed-iPhone hashes exactly. Ignored public-only manual configuration validated; push=false/commentary empty. This avoids stale local dist output; Mac access was not needed when its connection timed out.
- Android source: clean `b6519f9377c76b1433f51c8be4ea11c7c6495bff`, digest `75aa5429933cc5964f5bfa0150fe505ba14a54f73a32a0c2376e29b75712619f`. Base5345722 differs from web-qualified3ff068b only in documentation; b6519f9 adds the generated Android updater adapter integration and task plan. JavaScript build identity intentionally identifies the exact qualified web source rather than the native packaging commit.
- Android sync includes six pinned adapters, including updater8.54.0; its cloud auto-update/telemetry remain disabled and product update UI stays iOS-only. No hand-written application logic or dependency-version change.
- App ID `com.fluiditygroup.diceclubhouse.dev`, version1.0/build79. APK SHA256 `0b1475c04e84ceb13bf330147a4d7ba25bb59d6ede4adf74fb82acb1865e8b5a`.
- Signing certificate SHA256 `e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8`, equal to the freshly pulled installed build71. Private signing material was not read/copied.

## Verification

Clean Node24.15.0 full gate: **1,456 tests passed,13 optional camera skips, all configured web/native-web/Edge builds passed, source unchanged**. Evidence relative to the native checkout: `artifacts/engineering/2026-11-01T21-11-49-282Z-14b28d56/report.json`. Scoped JDK21/SDK36/Gradle8.14.3 `testDebugUnitTest assembleDebug` passed;19 app native tests, zero failures/errors/skips. System Java/default configuration unchanged. Later changes record evidence only.

The full gate generates other dist outputs; those were never resynced into Android. The APK/public assets were checked against the57 qualified iPhone hashes independently and frozen before installation. No tests, identity checks or source guards were weakened.

## Deployment and rollback

Dan explicitly authorised the Pixel update. Fresh discovery connected the already-paired physical Pixel11ProXL. Preserved the previous public APK and package metadata; rechecked the installed APK had not changed during qualification. `adb install -r` returned Success at `2026-11-01T21:13:10Z`; installed APK readback matches the candidate SHA256. Version79, same app identity/UID and original first-install timestamp verified. MainActivity cold launch Status ok,546ms; process running. No uninstall, data clear, private app-data read, real gameplay command or downgrade flag.

Ignored evidence root `/srv/yahtzee/main/artifacts/sw080/`: `pixel-before.apk`, `pixel-preinstall.apk`, `build79.apk`, `pixel-after.apk`, `candidate-verification.json`, `web-asset-verification.json`, `installation.json`, before/after package metadata, `adb-install.txt`, `pixel-launch.txt`, `android-build.log`, `engineering-gate.log` and the57-file expected iPhone manifest. Before/after APKs are retained; older build71 cannot simply be downgraded over79. Any rollback requires separate owner-authorised same-ID/signer packaging with a reviewed version strategy; never uninstall/clear data.

## Remaining acceptance

Owner must confirm existing account, avatar, saved games/table seats/scores and play paired manual-game flows (score/Undo, Home/Resume, reconnect/results) against Amber's build79. UID/installation retention and launch do not prove all app data or gameplay acceptance. Actual OTA delivery/rollback is separate and awaits the administrator-approved publication procedure; no release was published or server changed. No independent review/master promotion is implied.
