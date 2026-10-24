# SW-006 handover for 2 October 2026

Prepared 1 October 2026 for the next chat. User direction: start tomorrow with emulator RTSP testing and latency diagnostics, then stand down today. No automation, deployment or new chat requested.

## Starting instruction for the new chat

Continue SW-006 Android/C121 development. Read AGENTS.md, docs/status.md, this handover and docs/plans/SW-006-rtsp-bench.md. Use the product-change skill; apply hardware-validation for bench planning/execution where relevant. Start with a configured Android emulator and deterministic authenticated local RTSP fixture, then add latency diagnostics. Preserve all existing changes. Use multiple agents with explicit ownership and isolated worktrees for concurrent implementation. Do not claim actual C121 acceptance from a fixture.

## Product direction and implemented path

C121 on local Wi-Fi feeds native Android RTSP decoding, bounded rendered snapshots, existing recognition, calibration and explicit review/correction/held-slot confirmation. Confirmed commands enter existing local game rules/persistence, score recommendations and camera provenance/analytics. Manual fallback remains available. No video cloud relay or Pi authority is required. Hosted camera support is not implemented. Optional player recognition means approach-side hints first, off by default; it grants no seat authority. Actual GoDice qualification remains future work; standard native builds exclude private GoDice evaluation code.

Read docs/android-c121-poc-design.md and docs/c121-software-handover.md for design and hardware boundaries; docs/plans/SW-006-first-slice-results.md for initial implementation evidence. Do not reread unrelated commercial advisory documents.

## Current verified development identity

- Preserved dirty checkout on master, HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc. Substantial current code, Android files, tests and docs are untracked. HEAD alone is not a usable current baseline. Do not reset, clean, bulk-stage, commit unrelated files or copy secrets/private datasets.
- Latest consistent Node 24.19.0 gate: 336 tests in 54 files, web/native/room builds passed; artifacts/engineering/2026-10-02T01-05-18-186Z-012d9f4b/report.json. Source SHA256 e40bef2b5f3bceac88cc574ea75d70e747c92d3127efb274eec2fe7d332d52a4 at that run. Later handover/document edits are not part of that hash.
- Final synced offline Gradle assembleDebug/testDebugUnitTest passed; artifacts/sw006-work/continuation-apk.log. JDK 21.0.8 at C:/Program Files/Android/openjdk/jdk-21.0.8; Gradle 8.14.3, Media3 1.11.1, Capacitor 8.5.2. Gradle cache .gradle-local is populated, not a fresh-cache qualification.
- APK artifacts/dice-clubhouse-c121-poc-debug.apk SHA256 ff6248cd4ae2a6203ee652339081c3f816ae26b42bde836d67d7b15e30664e0c. App ID com.fluiditygroup.diceclubhouse.dev. Debug build; never installed/deployed in this work.
- Initial first-slice fresh npm-ci/source gate passed 304 tests with 13 declared optional camera skips. This continuation did not repeat fresh installation. Older APK/source hashes are historical.

## Latest fixes and remaining risks

Native C121CameraPlugin now applies retained preview bounds on creation and owns a Surface via setVideoSurface, avoiding Media3 replacement of the SurfaceTextureListener used for freshness/sequence. Surface teardown is explicit. The camera panel now counts only advancing rendered sequences and waits for recognition readiness before its eight-second settling window. Five focused UI tests cover retry, scene change, interruption, repeated sequence and ten-second cold startup.

Still unverified: real RTSP auth/codec/pixels; effective snapshot detail from TextureView.getBitmap; aspect/coordinate fidelity across preview sizes; alpha-zero rendering while retaining a connection; native overlay clipping within a scrolling dialog; real lifecycle/Wi-Fi recovery and credential storage/removal. No sensor-capture timestamp is available. Native render time and JS performance time are separate domains: freshness uses ageUpperBoundMs plus elapsed since bridgeReceivedAtMonotonicMs. Fresh local rendering does not prove unbuffered scene freshness.

Current implementation uses manual reconnect and player-triggered capture. New frames do not prove a physical reroll. Continuous pickup/roll deduplication, hosted camera authority and optional hints remain separate subsequent slices.

## Tomorrow's first work

1. Inspect actual tools/devices afresh. Previous adb devices -l returned none; emulator executable exists at %LOCALAPPDATA%/Android/Sdk/emulator/emulator.exe but -list-avds returned no AVDs. Docker is installed but sandbox access to its API was denied. ffmpeg/ffprobe were not on PATH. No server or emulator is running from this work; adb daemon was started for inventory.
2. Establish a reproducible emulator and local authenticated H.264 RTSP fixture. Select maintained tools using primary documentation; pin versions/hashes/settings and record licences. Native profile currently requires port 554 and /stream1 or /stream2, not a default 8554 fixture port. Preserve local-only networking and credential redaction. Resolve emulator-to-host Wi-Fi/network compatibility explicitly: the native transport selects TRANSPORT_WIFI; do not weaken real-phone LAN guarantees merely to make a test pass.
3. Execute the bench matrix in SW-006-rtsp-bench.md. Start with connecting-to-live, advancing sequences, one frame lease and visible counter/pixel fidelity. Add fault/lifecycle/hidden-preview cases only after actual frames work. Label all fixture media synthetic; do not use it as C121 accuracy evidence.
4. Add safe local timing diagnostics for snapshot extraction, PNG encode/file transfer, worker initialization/inference and review preparation. Define timing domains and retention; exclude credentials, pixel payloads and credential URLs. Report missing measurements honestly. Preserve explicit game confirmation and original/corrected provenance.
5. Fix overlay clipping and any reproduced defects with meaningful regressions. Then run focused checks and the configured gate; rebuild the APK if source changes. Update SW/INT/status and exact bench evidence, including failures/skips.

Subsequent useful work: analytics presentation, camera/GoDice/manual switching fixtures, and an arrival test pack. Native RTSP qualification has priority over hosted integration or optional hints.

## Coordination and commands

Previous agents reviewed native, vision and game contracts. Their old isolated worktrees under artifacts/sw006-work/native, vision and game are stale relative to root integration. Refresh a scoped baseline and manifest before reuse; never overwrite newer root fixes. Prior prep/refresh scripts and manifests are under artifacts/sw006-work; inspect them before use. Agents are development review, not independent approval.

Use node scripts/engineering-check.mjs inspect for inventory and verify for the configured gate. Node 24 is required. scripts/build-room-function.mjs regenerates supabase/functions/game-room/index.ts; run generation before the final gate if shared rules change. Do not edit source/records during verification: source mutation correctly invalidates the aggregate result. Camera runtime assets are optional in clean source; report skips. Windows node is available on PATH. WSL fresh testing previously used /home/fluidity/.nvm/versions/node/v24.15.0/bin.

For native builds use JDK 21 and the local Gradle cache; sync the standard native bundle before packaging. No private evaluation marker should enter this APK. Preserve evidence under ignored artifacts; keep durable summaries in docs/plans.

## Authority and acceptance

Routine reversible software development/test preparation is authorized. Purchases, supplier messages and live deployment require task-specific authorization under AGENTS.md/governance. Physical camera execution requires an identified session and applicable hardware/integration bounds. User has not authorized a phone/C121 deployment in this work. Proposed sampling/performance targets remain unaccepted; no G3/commercial gate is passed.

Historical untouched webcam collection: 6/10 exact rolls, 46/50 individual dice, no accepted wrong readings in that sample. Later reused/tuned replay results are development evidence, not independent accuracy qualification. C121 optics, near/far focus, lighting/lux and settled-to-review latency must be measured fresh after arrival. Do not transfer C121 evidence to ESP optics/battery acceptance.

Work stopped after saving this handover. No reminder or recurring task created.
