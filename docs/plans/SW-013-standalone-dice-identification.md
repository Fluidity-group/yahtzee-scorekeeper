# SW-013 standalone dice identification before game integration

3 October2026. Product owner explicitly prioritizes real dice identification first, then game UI integration, and requests a detailed next-chat handover. Developer/self-review: Codex; independent/physical acceptance open. Scope SW/INT, preserved dirty baseline.

## Requirements and acceptance

- Android menu entry usable without creating a game: Dice identification test.
- Use actual C121/native frames, saved secure profiles and existing full-screen calibration; no synthetic reading presented as physical evidence.
- Single-frame recognition shows readable faces and rejected candidates with colored boxes, supports actual0–5 dice labels, repeated values and notes, reports unordered face accuracy without claiming physical die identity.
- Record/export up to100 comparisons with bounded scalar metadata and recognition evidence. No image files, credentials or private frame URLs exported. Results are in-memory until screen closes; export exposes JSON.
- No game lookup/commit/roll/score from this mode; retains game mode behavior, snapshot release, worker shutdown and session/geometry/background invalidation.
- Detailed handover identifies installed build, source records, actual tests, physical gaps, next bench matrix and developer workflow.

## Design and limits

Shared camera-panel transport/calibration lifecycle with explicit diagnostic mode, and separate camera-test.js diagnostic UI/evidence model. Diagnostic capture takes one frame rather than waiting for five settled dice, making missing/unclear/empty scenes visible. Hand detection is disabled in the current reader bridge, so user must remove hands; motion flag only compares test frames. No recognition algorithm tuning or accuracy claim. App-side download behavior on Android needs physical verification; provide visible JSON for copying if download is unavailable. Game confirmation/authority remains separate. No backend, firmware, lighting hardware or zoom changes.

## Verification and completion

Focused evidence/authority/lifecycle tests and existing camera tests, full configured gate, Android build/install and handover pending. Physical dice recognition remains the next priority; no POC/commercial acceptance inferred from synthetic tests.

## Completion evidence

- Implemented camera-test.js diagnostic evidence/UI, camera-panel.js standalone mode and Android menu/home entries in prototype.js; added five meaningful evidence/authority/interruption tests and menu isolation assertion. Full final gate461 tests/59 files, all configured builds and source consistency passed: artifacts/engineering/2026-10-03T21-22-28-362Z-34b87060/report.json; source7cf2c93aa44723a016013e04cf48ccf39e2f0103965556f7e36e933765bb4de6, dirty master e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc. No source changes during gate; subsequent changes are records only.
- Focused25 tests/3 files passed before final export-interruption adjustment; final full gate covers that adjustment. During entry insertion an invalid template quote was detected and corrected before qualification. First SW-013 gate461 and earlier APK installation were superseded by final interruption-safe export revision.
- Capacitor sync/offline assembleDebug passed, final log artifacts/sw013-identification/android-build-final.log. Final candidate artifacts/sw013-identification/android-test-candidate.apk SHA256fc489ac6952a17e99ccf7f398b4a852468810ea106daa146688cc9aa4c084ef9.
- Freshly inspected connected Pixel11 Pro XL serial67080DLDV005JQ replacement-installed preserving app data; installed base.apk hash matched, launcher Status:ok/WaitTime345ms. Evidence artifacts/sw013-identification/pixel-install-final.json. Earlier a59d292f818cedcd61bf403f5406b2b9c7450006a6917c34d20c338edf804c6c candidate superseded.
- Local optional runtime manifest42a6d219ea2e5e9302539a52812aaaf2fa27382252d68c4d89453a16cf64f350 reports OpenCV4.13.0/MediaPipe0.10.21; final gate had no skips. Runtime assets remain ignored. Native code unchanged; no fresh native unit execution claimed.
- Backend bundle unchanged c196a85a9b4bf8cd5a3104b4c5c4d2e6a224899ef8e5cc5dd0193306a6f924cc; no deployment. No algorithm tuning, firmware takeover or hardware changes.
- Detailed next-chat handover: docs/handovers/2026-10-03-c121-dice-identification.md. Accepted priority: docs/decisions/2026-10-03-dice-identification-first.md. Physical standalone UI/JSON-download usability, actual C121 identification accuracy and integrated game acceptance remain open. No G3/commercial approval inferred.
