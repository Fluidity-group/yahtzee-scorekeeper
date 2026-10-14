# SW-006 emulator RTSP and timing diagnostics

2 October 2026. Coordinator: Codex. Native and vision development agents used refreshed isolated worktrees; independent reviewer unassigned. Software implementation and bounded synthetic bench executed. Actual C121/phone and G3 acceptance remain open.

## Purpose and requirements

Continue the [RTSP bench](SW-006-rtsp-bench.md) with an authenticated deterministic local H.264 stream, then instrument local stages without exposing secrets or changing confirmation authority. Preserve the dirty master checkout on HEAD `e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc`. HEAD alone omits the implementation. The source baseline manifest is `artifacts/sw006-oct02/baseline.json`; isolated worktrees are `artifacts/sw006-oct02/native` and `vision`. Only assigned source/test files were integrated; no commits, staging, phone deployment or cloud changes.

## Acceptance and actual evidence

| Requirement | Method | Actual result | State |
|---|---|---|---|
| Native authenticated TCP decode | Emulator Wi-Fi-bound Media3, host alias 10.0.2.2, port 554 /stream1 | Connecting -> live; advancing sequences; 960x540 decoded pixels | Verified synthetic |
| Bounded lease | Acquire again before release | FRAME_BUSY; release permits subsequent captures | Verified synthetic |
| Pixels/counter | 30 snapshots, independent FFmpeg decode, header counter matching | 30/30 advancing sequences. RGB mean absolute error maxima across samples 1.719/0.863/2.490 on 0..255 scale; orientation/corners/patches visibly preserved. Matching scores/runner-up scores in analysis.json. Differences are measured, not threshold acceptance | Verified development sample |
| Geometry | 960x540, 1920x1080, 2560x1440; maxWidth 1280/1920 | PNG/bitmap and metadata agree: 960x540 for both at 540p, 1280x720/1920x1080 for 1080p and 1440p. Higher-resolution variants upscale synthetic source; they do not prove optical detail | Verified synthetic sizes |
| Hidden preview | Alpha-zero for two seconds | Sequence 106 -> 126, live; fresh snapshot acquired | Verified synthetic |
| Authentication/recovery | Wrong synthetic password then manual reconnect | authentication-failure; reconnect live with a new session | Verified synthetic |
| Lifecycle | Background/resume, Wi-Fi disable, producer/server shutdown | Background and producer shutdown interrupted and rejected acquire with STALE_FRAME. Initial immediate Wi-Fi check was still live; bounded two-second check interrupted and rejected acquire. Wi-Fi restored, manual reconnect verified. Missing server interrupted after six seconds | Verified bounded cases |
| Credential removal | Remove disposable native credential; reconnect | CREDENTIAL_STORAGE, then disconnected. Native sheet/Keystore/backup security acceptance remains separate; test helper used direct native bridge credentials | Partial development check |
| Timing privacy/retention | Whitelisted scalars and domains; regression tests | At most 64 session samples, cleared/closed with panel; no URLs, credentials, pixels or identity in collector. Native values cap at 60000ms with explicit capped flag; JS omits invalid/over-limit measurements | Implemented/tested |
| Review/authority | Existing retry, stale scene, advancing sequence, cold-start and interruption tests | Explicit confirmation and stable command retry/provenance retained; timing metadata excluded from authoritative observation | Automated regression |
| Preview clipping/aspect | Scrolling dialog/client/viewport bounds and emulator visual check | Partial native overlays hide rather than resize. Fixed-height preview distortion reproduced and corrected; final preview 336.67x189.375 for 16:9. Hidden when dialog constrained to 240px; restored when constraint removed | Verified synthetic UI |

Evidence directory: `artifacts/sw006-oct02/`. Raw PNGs, fixture labels, local credential/config files and downloaded tools remain ignored. JSON results contain redacted status/metadata only. The fixture does not label synthetic media as physical acceptance, and no game roll was committed by the native bench helper.

## Fixture identity and reproducibility

- Existing Android Emulator 37.1.11.0/build 15917651; WHPX usable. Workspace-local AVD `SW006_API36`, x86_64 Google APIs Android 36 revision 7, 1080x1920/density 420, 2048MB RAM, four cores, SwiftShader, no window/audio/snapshot. `connectivity.txt` records emulator `TRANSPORT_WIFI`, wlan0/10.0.2.16 and AndroidWifi. Production Wi-Fi socket selection and forced TCP are unchanged.
- Official image archive `x86_64-36_r07.zip`: upstream SHA1 `c6bf44bdcd885bb902b4ba752d111a073ad7a817` checked; SHA256 `b1bb0769d0bed7698e61f203d7dc9bf6e7c37cd01a39d0d8788a11186bc78160`. Google Android SDK licence, existing installed SDK licence records; image package metadata retained. AVD config/launch logs retained; not a fresh workstation provisioning qualification.
- MediaMTX 1.21.1 Windows amd64, MIT licence included in archive. Upstream archive SHA256 `faa97974861eb75a68b5aa326c78e7e7a6f670b5ef191bace78e715130381f23` verified; executable SHA256 `7de0b5c1060f716cc813c6fab302c938f1fe7faccbd92eba6567f3bf18c9054e`.
- FFmpeg 9.0.2 Gyan essentials Windows build (GPLv3 distribution licence included). Archive SHA256 `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba`; executable SHA256 `3256173f3f8bffd7df12227c68adf68025edb1832273a9530688a7bb1ed8edec`. Download is linked from FFmpeg's official page; locally recorded hash is identity, not an upstream signature.
- `scripts/generate-rtsp-fixture.py` uses bundled Python/Pillow and Consolas to generate 300 RGB PNGs at 960x540, 10fps: stationary A, motion, B, occlusion, empty, counter/clip elapsed time, numbered grid, corners, RGB/gray and labelled pipped dice. PNG hashes/labels in ignored labels.json. Frame IDs repeat each 30-second playback cycle; clip elapsed time is not a live wall-clock timestamp.
- Lossless source FFV1/bgr0: SHA256 `a6fe5d69a96696ef16441867fed7ea6ce3c10be385707e369f05ae0afc18c5c6`. Encoded H.264/yuv420p/libx264 ultrafast/zerolatency, GOP10, bf0, 10fps MP4: SHA256 `957d860aa53640a5d6c1cd49db120b83c39f1faed377d49e91337e1237f1b4f5`. labels.json SHA256 `29c410e532ee6ea6a29ebcc4c7beb74cea762e526fb914043149e24aaee8dd4d`.
- Publisher command: FFmpeg `-re -stream_loop -1 -i encoded.mp4 -c copy -f rtsp -rtsp_transport tcp rtsp://127.0.0.1:554/stream1`. Synthetic reader password is generated into ignored fixture-credentials.json; never paste it into records/logs. Server permits publish only from loopback, authenticated reads only on stream1; final config disables RTMP/HLS/WebRTC/SRT/MoQ/API/metrics/pprof and binds RTSP to 127.0.0.1:554. Initial default MoQ enabled before correction; disabled and generated certificates moved into ignored artifacts before measured runs. Final listener inventory showed only loopback TCP554, no UDP listener. No firewall/router port forwarding.
- The actual saved config, tool archives, generator, scripts (`bench.cjs`, `extended-bench.cjs`, `eval.cjs`, `analyze.py`) and AVD files identify reproducible local inputs. Debug bridge forwarded only to workstation loopback9223. Bench credentials used for synthetic test only; no real camera secrets entered.

Primary setup references: [Android emulator command line](https://developer.android.com/studio/run/emulator-commandline), [emulator networking](https://developer.android.com/studio/run/emulator-networking), [MediaMTX configuration](https://mediamtx.org/docs/references/configuration-file), [pinned release](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1), [FFmpeg downloads](https://ffmpeg.org/download.html). Primary package metadata and downloaded licence files retained with tools.

## Timing domains and measured stages

Thirty 960x540 samples on diagnostics APK SHA256 `2818909926be57e24fd6c1f93b1705b2b81f2675d4d88aa904887cc988a6d340`; see extended-result.json and analysis.json. Android elapsed-time durations and JS performance-time durations are measured independently; no cross-clock subtraction or sensor timestamp. JS bridge round-trip is inclusive and overlaps native stages; do not sum it with native extraction/write.

| Stage (ms) | Median | p95 (linear percentile) | Max |
|---|---:|---:|---:|
| Native bitmap extraction | 3.90 | 10.09 | 12.66 |
| Native PNG encode/write | 16.73 | 18.94 | 19.75 |
| Local native render age at delivery | 33.5 | 101.0 | 102.0 |
| JS acquisition bridge round-trip | 25.25 | 50.17 | 53.0 |
| JS file fetch/body | 3.90 | 7.71 | 15.90 |
| JS bitmap decode | 3.90 | 6.92 | 10.70 |

One cold packaged-worker sample: initialization 1480.2ms, worker round-trip inference 101.5ms, internal processing 93.4ms. Synthetic B returned faces 6/5/4/3/2. This single worker measurement is not recognition accuracy or a latency distribution. Review-preparation diagnostics are implemented/tested, but actual UI settle-to-review and review-preparation time were not measured. Missing/failed stages are absent, never reported as zero. Transport/source buffering delay is unmeasured; a fresh local render does not establish fresh scene content.

## Design, risks and remaining gates

Snapshots stay pull-only with one lease; diagnostics are metadata/local RAM and never persist into game history. Renderer/UI and recognition diagnostics do not alter scoring, seat/revision checks, calibration identity, held slots, corrected provenance or explicit commit. The POC numerical targets remain proposals.

Open: actual C121 codec/auth/offline LAN and phone hardware; secure native sheet/storage/backup acceptance; independent high-resolution pixel-detail/calibration mapping; injected buffering delay; unsupported-codec case; 20 settling/stale-review scene sequences; 30-minute bounds/memory/thermal sampling; complete emulator/physical game with real storage faults; real Wi-Fi/OS lifecycle repetitions. Existing automated authority/save regressions do not close these device matrix rows. No accepted physical lighting, optics, near/far detail, ESP compatibility or G3/commercial result.

## Completion and decision

Implemented native per-frame durations, session-only JS collector/worker and image-transfer timings, review-preparation diagnostics, dialog clipping and responsive stream aspect ratio. New tests cover privacy/bounds/retention, file fetch/decode, native timing bounds, dialog clipping/restoration and aspect/reconnect. Final focused run passed 19 tests in four files; offline Gradle assembleDebug/testDebugUnitTest passed, nine native unit tests with no failures/skips (root .gradle-local reused, not fresh-cache evidence). Final standard debug APK SHA256 `e92b36cd1463937d5a3663195fd93bc5b64ca004455fe0fc260babfe779aab5a`, `artifacts/sw006-oct02/final-debug.apk`, app ID com.fluiditygroup.diceclubhouse.dev. No private GoDice evaluation marker packaged.

This final APK was installed only in the synthetic emulator and smoke-decoded a 960x540 stream. `panel-aspect.png`, `panel-clipped.png`, `panel-restored.png` and corresponding JSON record the actual native overlay visual checks; restored aspect is 16:9 and clipped overlay disappears. Production calibration image loader displayed a 960x540 canvas and local diagnostics: native extraction 23.0ms, PNG encode/write 13.3ms, render age 39.0ms, JS fetch 3.0ms, JS decode 2.5ms (one sample, not a distribution). Closing the panel removed it and disconnected; disposable credential removal rejected later connect with CREDENTIAL_STORAGE. Synthetic helper bypasses native profile sheet and does not qualify secure-sheet entry or game review UI.

Final bench state: panel closed, native stream disconnected, frame released, disposable app credentials removed; MediaMTX/publisher and emulator stopped, debugger forwarding removed. The adb daemon remains available for workstation tooling. No physical specimen or live deployment performed. No dependent source edits occur during the final engineering gate; record-only completion edits afterward are outside its source digest. Agent checks are development review only; G3/commercial gates remain open.

Final configured Node 24.19.0 gate passed **343 tests in 55 files**, web/native/room builds, required records and source consistency, with no reported skips. Report: `artifacts/engineering/2026-10-02T15-27-38-919Z-e646250f/report.json`; dirty source SHA256 `058c05b5a046407c5fc648ee6cb6bce094201b683ef077e37fb3c7e08e5b5446`. Source did not change during the run. This completion paragraph and project/status evidence edits occurred afterward and are not included in that digest. Dependencies/camera assets and Gradle cache were reused; no fresh npm installation repeated. Final Gradle unit task reused the same already-passing native results because native source had not changed since its nine-test execution. No aggregate physical/release gate passed.

Changed implementation: `C121CameraPlugin.java`, new `CameraFrameTimingTest.java`, `camera-recognition.js`, new `camera-timing.js`, `camera-panel.js`, their three JS test files, and `scripts/generate-rtsp-fixture.py`. Durable SW/INT/status and bench records updated. Existing unrelated dirty changes preserved. Next executable scope is an arrival test pack and identified phone/C121 session, plus remaining synthetic sustained/settling/buffer-delay and full game matrix rows; deployment/physical execution still requires task-specific authorization.
