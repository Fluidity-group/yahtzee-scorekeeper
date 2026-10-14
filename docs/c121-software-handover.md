# C121 local camera: software handover

1 October 2026. From dedicated hardware review to software development. Product-owner direction is recorded in [the platform decision](decisions/2026-10-01-camera-platform-sequence.md). This document prepares implementation; it is not a deployment or physical acceptance record.

## Outcome to build before arrival

Allow an Android host to connect to a Tapo C121 on the same LAN, preview decoded frames, calibrate the tray, freeze a fresh settled image, obtain five-dice recognition proposals and review/correct/confirm through the existing game command path. Keep manual entry available if streaming or recognition fails. Support one camera first; multiple cameras are later scoped work, not a purchase assumption.

Topology: C121 -> local Wi-Fi router -> native Android stream decoder -> bounded frame bridge -> existing recognition/review -> authorized game command. No video cloud relay or Pi authority is required. Multiplayer continues using its existing backend for authorized game state. Browser guests need no camera feed; browser-only RTSP capture is not a first-stage deliverable.

## Entry points and ownership

Read AGENTS.md, docs/status.md, projects/software.md, projects/integration.md, architecture.md and the product-change skill. Inspect `src/dice/camera-lab.js`, `src/dice/camera/`, `src/dice/capture.js`, `src/dice/game-capture.js`, `src/dice/input/coordinator.js`, `src/dice/connections.js`, `android/` and existing camera/authority tests. Preserve scoring/rules and the separate Pi path. Native integration is Capacitor 8.5.2 in the current package file; verify the actual source baseline before dependency choices.

Use a scoped branch/worktree for concurrent implementation. Much of the current source is untracked: a worktree from HEAD alone will omit newer functionality. Resolve a scoped source baseline with the coordinating chat before implementation; do not bulk-stage, reset, copy credentials or private datasets. SW-001's fresh dependency-install and remote CI gates remain open independently.

## Camera and protocol contract

Published C121 baseline: 2560x1440, 103-degree horizontal/55-degree vertical view, USB-C powered, RTSP and ONVIF. Exact specimen hardware/firmware and stream codec/dimensions/rate are unverified. Minimum close-focus distance is not established. Initial setup uses Tapo app and camera-specific credentials, distinct from the TP-Link account.

Use configurable host/IP and local camera credentials. Manufacturer high-quality stream path is `rtsp://<camera-ip>:554/stream1`; `stream2` is the lower-quality alternative. Supply credentials through the native connection layer, avoiding credential-bearing URLs in UI, logs, crash reports, exports and Git. Use Android-backed secure credential storage; ordinary preferences/JS localStorage are unsuitable for secrets. Provide disconnect/remove and credential replacement. Prefer a DHCP reservation; discovery via ONVIF can follow manual configuration.

Start with a maintained native RTSP implementation; Android Media3 is a candidate, not a frozen dependency. Confirm codec/authentication/RTSP-over-TCP support and decoded pixel access. A video player surface alone does not feed recognition. Choose and document decoder-to-recognizer transfer, orientation, pixel format and resize policy. Avoid repeated full-frame base64 traffic across Capacitor at preview rate. Keep a latest-frame buffer and at most one inference job; drop superseded frames rather than accumulating latency.

Each observation needs camera identity, stream-session/generation ID, monotonic receive/decode time, frame sequence, dimensions, calibration/configuration ID and source provenance. Camera capture timestamps may be absent or incomparable: do not label local receive time as sensor capture time. Bound buffering and invalidate pending reviews on transport loss, session change, backgrounding or calibration change. Freshness threshold is a proposed configurable value until measured/accepted; local arrival time alone cannot prove an unbuffered scene is fresh.

Connection states should distinguish connecting, live, interrupted, authentication failure, unsupported stream and disconnected. Stop/release decoder resources on explicit disconnect; handle app lifecycle and Wi-Fi changes with bounded retries and visible recovery. Do not silently accept a frozen old image after reconnect. RTSP requires a native layer; do not expose a camera port publicly or add a cloud relay to make a WebView work.

## Recognition and user flow

Reuse existing recognizer and calibration contracts where appropriate, without assuming webcam calibration transfers. Show live preview and allow tray-corner calibration at the actual stream dimensions. Keep the full frame available for calibration and retain enough pixels for near/far pips; megapixels at the sensor are not the processing resolution.

First-stage capture is player-triggered freeze/review. Show ambiguous or incomplete readings, permit correction, and preserve observation/correction provenance. Explicitly confirm held logical slots when physical identity is uncertain. Camera placement or inferred hand direction grants no seat authority. Use current authoritative turn/revision and idempotent command handling; preview/inference must never directly commit dice or scores. Tuning and fresh acceptance data remain separate.

## Work possible now and arrival checks

Before arrival: implement transport/frame interfaces and fake-frame/replay adapters with explicit simulated labels; connection/settings UI; bounded decode/inference lifecycle; credential redaction; freshness/session invalidation and review/confirmation integration. Use a controlled local RTSP fixture if available to verify actual decoding separately from fake frames. Record any unavailable fixture rather than claiming protocol success from mocks.

Arrival sequence: record camera hardware/firmware, phone/OS/APK/source identities and network; use vendor setup to create local credentials; verify stream in a known RTSP client, then our app. Check full-resolution imagery at several elevated side heights/distances/angles and near/far tray points. Test disconnected internet and camera reboot on the retained LAN, then Wi-Fi loss/reconnect, phone background/resume and stale-buffer handling. Verify failure fallback and a complete game without duplicate/stale accepted commands. Live deployment/physical execution need task-specific authorization and an identified test session.

External-light trials: compare ambient-only and one/two diffused lamps at fixed geometry. Record light model, placement, brightness setting, electrical power where measured, exposure mode, glare/banding and recognition coverage. Measure lux at the die-top plane across the playable polygon with instrument identity/calibration noted. Lumens describe source output; they cannot alone specify useful tray illumination. Preserve images and labels privately under ignored evidence storage, not Git. Future enclosed lighting needs separate optical/thermal qualification.

## Verification and completion

Track implementation in [SW-006](plans/SW-006-c121-local-camera.md). Focus tests on auth/error states, reconnect generations, stale-frame rejection, calibration invalidation, queue bounds, lifecycle cleanup, credential redaction and authority/idempotency. Run the configured engineering gate with Node 24 for release preparation, and separately validate Gradle/APK/native decoder on an identified Android phone; web/native Vite success is not native RTSP acceptance. Report skips and fixture versus real-camera evidence separately.

No numeric recognition/latency/lighting target is accepted yet. Report exact-roll accuracy, correct individual dice, rejected scenes, accepted wrong readings, median/p95/max settled-to-review latency and sustained operation. Proposed first physical criterion: no incorrect reading is silently accepted and uncertain scenes remain reviewable; agree usable coverage and sample sizes before claiming G3. Preserve existing ESP battery/source-isolation/fuse/temperature gates; do not transfer C121 evidence to them.

Sources: [C121 datasheet](https://static.tp-link.com/upload/product-overview/2024/202410/20241031/Tapo%20C121%28US%291.6_Datasheet.pdf), [Tapo RTSP setup](https://www.tp-link.com/us/support/faq/2680/), [protocol FAQ](https://www.tp-link.com/us/support/faq/4465/), [Android RTSP support](https://developer.android.com/media/media3/exoplayer/rtsp). Pin selected software dependencies during implementation rather than relying on current documentation as a version manifest.
