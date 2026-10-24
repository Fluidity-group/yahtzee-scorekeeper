# SW-006: C121 local Android camera input

2 October checkpoint: [emulator RTSP and diagnostics](SW-006-emulator-rtsp-results.md) now provide actual native decoding of an authenticated synthetic H.264 stream, bounded recovery/geometry evidence, session-only stage diagnostics and preview fixes. This closes initial synthetic decoder feasibility, not actual C121/phone, secure-sheet or physical acceptance. Earlier no-stream statements below describe the first slice.

Date: 1 October 2026. Owner: software engineering coordinator; independent reviewer unassigned. Product-owner platform direction and approach-side hints accepted; first local Android implementation slice complete and automatically verified; real RTSP qualification open, deployment not performed, physical acceptance open. Project: SW/INT with HW optical evidence; G1/G2/G3 remain open.

## Purpose and requirements

Implement the [C121 handover](../c121-software-handover.md) under [the accepted platform sequence](../decisions/2026-10-01-camera-platform-sequence.md). Baseline: current preserved checkout; SW-001 implementation evidence exists, substantial newer files remain untracked. Freeze a scoped reproducible baseline before concurrent implementation.

## Acceptance and verification

| Requirement | Observable criterion | Method / actual evidence | State |
|---|---|---|---|
| C121-01 | Local authenticated stream decodes into recognizer-accessible frames without video cloud relay | Native decoder/pull bridge implemented and APK compiled; no fixture/C121 execution | Open |
| C121-02 | Latest-frame buffering, bounded inference, stale/session/calibration invalidation | Frame/session/UI and native validity tests passed; real lifecycle/pixel fidelity open | Open |
| C121-03 | Player review/correction and authoritative seat/revision/idempotency checks preserved | Local all-mode/core/UI regressions passed; hosted camera and physical game open | Open |
| C121-04 | Credentials excluded from logs/exports and stored securely; removal works | Native secure sheet/storage/backup rules compiled and bridge redaction tested; instrumented storage acceptance open | Open |
| C121-05 | Android build and real decode path verified independently of web bundle | Final debug APK + 4 new native tests passed; actual decoding/phone evidence open | Open |
| C121-06 | Offline LAN restart and fresh optics/lighting/recognition measured | Identified camera, frame labels, lux map and measured latency/coverage; thresholds pending | Open |

## Software design and sprint plan

[Android C121 POC design](../android-c121-poc-design.md) records the reviewed code/evidence inventory, native/frame/security contracts, capture-to-game authority/persistence work and multi-agent sprint boundaries. Three read-only agents reviewed native integration, vision evidence and game/data contracts on 1 October. User chose approach-side player hints first; no biometric recognition is scoped.

Core local POC: baseline/contracts, native decoded-frame vertical slice, local game review/recommendations, durable history/analytics, then identified-camera qualification. Hosted camera support is the expanded POC milestone; optional hints/speed refinement and future real GoDice qualification remain separate. Parallel implementation requires scoped baseline/worktrees and file ownership; current HEAD alone omits newer source. Proposed latency/coverage/sample targets in the design are unaccepted pending measurements/product-owner agreement.

Design-only turn evidence remains historical. The subsequent authorized first implementation slice is recorded in [first-slice results](SW-006-first-slice-results.md): current workstation gate and APK compile passed; protocol/physical acceptance rows remain open.

## Design and impact

Native Android RTSP adapter feeding existing camera recognition/review. One local camera first, separate external lights, no Pi authority integration, no automatic game commands. Decoder/frame bridge and exact dependency versions require software design. Future ESP adapter must preserve transport-independent observations while undergoing separate camera and battery qualification.

## Risks and execution bounds

| Risk | Consequence / mitigation | Owner / state |
|---|---|---|
| C121-R1 | Close focus unknown: test near/far pips before housing commitment | HW / open |
| C121-R2 | Decode buffering creates stale observations: bound buffers and invalidate sessions | SW / open |
| C121-R3 | Firmware stream behavior varies: record exact revision and verify offline restart/reconnect | INT / open |
| C121-R4 | Credential leakage: secure native storage and redaction | SW / open |
| C121-R5 | C121 success incorrectly used to qualify ESP optics/battery: collect independent evidence | HW/INT / open |

Software implementation and local builds are authorized by the user instruction to start; live deployment/physical acceptance are separate. Purchase/receipt is user-planned, not verified. No physical testing, live deployment, supplier contact or cross-chat message was performed. Define instruments, session bounds and safe final state before physical execution.

## Completion and decision

First local implementation integrated from three scoped worktrees, with reviewed game commands, bounded frame/review interfaces, native RTSP/secure profile module, local Android UI and camera provenance/analytics. Workstation Node24 gate: 334 tests and web/native/room builds passed; final Gradle/APK and native unit tests passed. See [first-slice evidence](SW-006-first-slice-results.md) for exact hashes, fresh-install result and limitations. No stream, phone or C121 connected/deployed; actual RTSP pixels, optics, latency and physical acceptance remain open. Hosted camera/hints and automatic physical-roll detection are subsequent work. No aggregate G3/commercial gate passed.
