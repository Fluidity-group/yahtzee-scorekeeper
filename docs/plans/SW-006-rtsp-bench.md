# SW-006 RTSP bench preparation

2 October execution update: [emulator RTSP results](SW-006-emulator-rtsp-results.md) supersede the no-AVD/no-stream readiness inventory below. Authenticated synthetic native decoding and bounded pixel/geometry/lifecycle checks have now executed; actual C121/phone and remaining matrix rows stay open. Historical preparation and its source/APK identities are retained below.

1 October 2026. Coordinator: Codex. Development review by three agents; independent reviewer unassigned. Preparation implemented; stream execution and physical acceptance open.

## Scope and readiness

Qualify actual Android decoding separately from saved-image recognition and C121 optics. Current workstation inspection found no attached Android device and no configured AVD. Docker API access was denied in the sandbox; no RTSP server or encoder was started or selected. No deployment occurred. Use the current integrated APK and record its hash before any authorized session.

Native review found two defects: the remembered preview rectangle was not applied when the TextureView was created, and Media3's setVideoTextureView replaces the listener used to track rendered frames. The plugin now applies the rectangle and owns a Surface through setVideoSurface, retaining its freshness listener and releasing the Surface on teardown. Compilation/unit evidence is recorded below; actual rendered callbacks and fidelity require this bench.

## Fixture specification

The current native profile supports port 554 and paths /stream1 and /stream2. Configure the fixture accordingly; a default fixture port such as 8554 is unreachable through this profile contract.

Select and pin a local authenticated RTSP server and H.264 encoder, recording versions, binary/container hashes, licences and exact settings. Use TCP. Do not expose ports to the internet. A deterministic lossless source clip should contain a frame counter, elapsed source time, numbered grid, corner/orientation markers, RGB/grayscale patches and five labelled pipped dice. Include motion, pickup, touching/occluded dice, empty/unreadable scenes and two distinct stationary scenes. Hash the source, encoded stream and labels. Compare app snapshots against an independent decode of the encoded frame identified by its visible counter; lossy encoding prevents raw-source equality.

## Execution matrix

| Check | Bounded method | Evidence / expected behavior |
|---|---|---|
| Auth and protocol | Correct/wrong credentials, missing server, unsupported codec | Actual decoding and distinct visible errors; no credentials in UI/logs/exports |
| Pixel fidelity | 30 snapshots across grid, dice and motion | Matching frame counter; no mirror, rotation, channel swap, crop or unintended stretch; measured pixel/marker differences |
| Geometry | 960x540, 1920x1080, 2560x1440; request widths 1280 and 1920 | PNG dimensions match metadata, aspect preserved, calibration mapping checked; stream-size changes invalidate review |
| Timing | Record render age, bridge round trip/receipt and inference completion | Freshness is ageUpperBoundMs plus elapsed since JS receipt; no cross-clock subtraction or sensor-time claim |
| Buffer delay | Add producer/transport delay while delivering frames | Burned-in source counter measures content delay; fresh rendering alone cannot prove fresh scene |
| Settling | 20 pickup/motion/stationary sequences | Report misses, rejections and settle-to-review median/p95/max; no automatic commits |
| Stale review | Review A then switch to B, including unreadable areas; freeze producer | Changed scene blocks acceptance; render stall interrupts; old review remains identifiable |
| Lifecycle | Disconnect, manual reconnect, background, Wi-Fi loss during acquire/review | Old generations rejected, calibration rechecked, leases/resources released, manual fallback usable |
| Bounds | Slow inference; 30-minute repeated capture/release | One inference/lease, bounded pending work; record files, memory, thermal observations and drops |
| Game/save | Complete local game, held slots and injected save failure | Explicit confirmation, stable retry ID, exactly one saved roll with original/corrected provenance |

Counts are proposed development sampling, not accepted G3 thresholds. Record phone/model/OS, APK/source identities, codec/rate/resolution, network, fixture/calibration versions, results and skips. Keep raw images privately in ignored artifacts. A fixture pass cannot establish C121 firmware, close focus, lighting, physical recognition or ESP compatibility.

## Completion evidence

Final Node 24.19.0 engineering gate passed: 336 tests, 54 files, web/native/room builds and source consistency; evidence artifacts/engineering/2026-10-02T01-05-18-186Z-012d9f4b/report.json. Dirty development source SHA256 e40bef2b5f3bceac88cc574ea75d70e747c92d3127efb274eec2fe7d332d52a4 on e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc. Earlier continuation gate passed its checks but failed source consistency and is not an aggregate pass. Final synced offline APK/native unit build passed in 24 seconds (artifacts/sw006-work/continuation-apk.log). Updated artifacts/dice-clubhouse-c121-poc-debug.apk SHA256 ff6248cd4ae2a6203ee652339081c3f816ae26b42bde836d67d7b15e30664e0c; supersedes the first-slice APK hash for these fixes. No fresh-install repeat or device execution in this continuation.

Offline Gradle assembleDebug and testDebugUnitTest passed (25 seconds; log artifacts/sw006-work/preview-fix-gradle.log). Native changes are in C121CameraPlugin.java. Camera panel now requires advancing rendered sequence before counting settled samples and awaits recognition readiness before starting the eight-second capture window. Focused UI tests passed: five tests including repeated frames and ten-second cold initialization. Native overlay clipping and effective snapshot detail remain open device checks. No new RTSP/C121 measurements. Historical webcam/tuned replay results remain separate.
