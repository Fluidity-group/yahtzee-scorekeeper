# SW-012 direct camera capture from game

3 October 2026. Owner: product owner. Developer/self-review: Codex; physical acceptance open. SW/INT: camera game UI intent and panel initialization. Preserve dirty development baseline.

## Purpose and acceptance

User photo3953 shows actual live video and retained calibration after SW-011, confirming session restoration. Remaining issue: game Capture/review opens setup and waits for a second Capture settled roll tap. Game capture should automatically start the existing settled-frame/review flow when fresh native session and calibration match; Camera settings must remain setup-only. Missing/stale calibration must require setup. Confirmation and authoritative game commit remain explicit, with no roll saved simply by opening/capturing.

## Design and risk

Pass an explicit autoCapture intent from the game's capture action; after panel initialization/restoration, invoke the existing error-handled capture path only when enabled, calibrated/live and no newer operation owns initialization. Retain normal manual retry and scene freshness checks. No camera firmware, zoom, backend or physical recognition changes. Do not bypass reconnect/calibration or player confirmation.

## Evidence and remaining gates

Pre-fix two regressions fail for missing capture intent and ready calibrated panel not starting capture: artifacts/sw012-direct-camera-capture/pre-fix.log. Added setup-auto capture-through-review/commit coverage; setup settings remain manual, stale/disconnected/explicit-disconnect/background paths exercise autoCapture without enabling a capture. Focused/full gate, APK installation and physical acceptance pending.

## Verified candidate

- Changed src/prototype.js, src/dice/camera-panel.js and camera UI/panel tests. Existing setup-close scenario proves settings remain manual; new setup-auto captures through review/save retry with no second capture tap. Stale/disconnected/explicit-disconnect/background reopen cases request automatic capture but keep capture disabled and commit untouched.
- Focused20 tests/2 files passed. Full configured gate456 tests/58 files, web/native/room builds and source consistency passed, no source changed during gate. Report artifacts/engineering/2026-10-03T20-54-33-459Z-6761c03e/report.json; source SHA25647096f64452d5a7d3e73d809aa26edba582f798b676b0be9760e2bf2aa576fb2, dirty master HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc. Post-gate changes are evidence records only.
- Capacitor sync and offline Android assembleDebug passed. Native code unchanged; prior native qualification scope unaffected. Candidate artifacts/sw012-direct-camera-capture/android-test-candidate.apk SHA2563d336b82425e9643868beb1612605effa2ea1b115c0fee24ad9c6b2aa6674a6c.
- Backend bundle hash unchanged c196a85a9b4bf8cd5a3104b4c5c4d2e6a224899ef8e5cc5dd0193306a6f924cc; no deployment.
- Fresh ADB inventory after packaging returned no devices. Pixel update awaits reconnection; installation/physical acceptance not claimed. Repeat connect/calibrate/close after update, start/resume camera turn, settle five dice, tap game Capture/review once and expect waiting then five-face review. Confirm roll remains necessary.

## Pixel installation completed

3 October2026: user reconnected Pixel and authorized continuing the prepared update. Fresh inventory identified Pixel11 Pro XL serial67080DLDV005JQ. Replacement install succeeded preserving app data; installed base.apk SHA256 matched candidate3d336b82425e9643868beb1612605effa2ea1b115c0fee24ad9c6b2aa6674a6c. Launcher Status:ok, WaitTime364ms (existing task brought forward). Evidence artifacts/sw012-direct-camera-capture/pixel-install.json. Supersedes disconnected-install gate above. Physical direct capture/recognition/review remains user acceptance. User clarified the prior screenshot reflected a missed second capture step; SW-012 is a usability improvement, not continuing evidence of SW-011 session loss. Instructed to connect/calibrate once after restart, close setup, settle five dice and tap Capture/review once, then explicitly confirm reviewed values.
