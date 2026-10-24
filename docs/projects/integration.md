# Shared integration control

14 October SW-023 planning: proposed six-sprint software POC now coordinates Android/browser phone UX, accepted-event visual effects and live-commentary playback. Shared contracts cover stable anonymous display labels versus UUID authority, asynchronous durable jobs, host playback ownership, profile/Undo invalidation, SFX ducking and exact-device evidence. No physical/hardware or commercial gate advanced. [Proposal](../plans/SW-023-six-sprint-poc-proposal.md).

14 October SW-019 Pixel follow-up: user confirmed wireless update readiness. Fresh mDNS discovery connected Pixel11 Pro XL; installed predecessor hash matched SW018. Data-preserving install-r succeeded; installed SW019 APK SHA25653ac027ee2f7e5aa8be805dc5ef104af61557810544861978383db93da800b36 matched qualified candidate; MainActivity launcher Status ok. No app clearing. Backend/web already matched. Actual two-phone Undo/partial-tournament return acceptance remains open.


14 October SW-019: manual Standard latest-own-score Undo and prominent graphical saved-session Resume hub implemented/qualified; backend/web deployed and byte verified.624 tests/76 files, all builds/source consistency and24 disposable PostgreSQL checks passed. Final-score Undo reopens tournament/updates history; audit retained. Both-account Resume preserves seat/aliases/score/turn/pause, stable QR available. Android APK built/asset-matched but NOT installed: fresh ADB inventory empty. Physical two-account and existing PWA update activation open. Detailed fresh-chat handover docs/handovers/2026-10-14-manual-multiplayer-tournaments.md; manifest docs/releases/SW-019-2026-10-14-undo-session-return.md.


13 October SW-018: dedicated account-owned open-tournament list and Exit to your tournaments implemented/deployed to matching backend/web/Pixel under standing update authorization. Paused first, older open tournaments paginated independently of30 recent tables, original host Continue hosting/read-only restore; shared pause stays until explicit host resume.582 tests/71 files/all builds/source consistency passed; APK assets/installed hash/launch and public web/backend bytes verified. No migration, roster/score edits or app clearing. New physical two-account exit/restart/return acceptance open. Details docs/plans/SW-018-open-tournament-return.md and docs/releases/SW-018-2026-10-13-open-tournament-return.md.

13 October SW-017 combined tournament/final-chain/pulse candidate deployed with explicit Pixel authorization and matching service/web rollout.575 tests/70 files/all builds/source consistency,23 isolated DB checks and local built phone/tablet manual chain exercise passed. First final-category Yahtzee50 earns repeated3-roll attempts, +100 success renews, only3 failures ends playerchain; newmanualCompetition version2, oldtables remain1. Livelier accepted score/turn/Yahtzee/full-house effects with reducedmotion and quiet reload/corrections. Pixel install-r preservingdata, exact installedAPKhash/launch; liveweb/backendbytes matched;9rooms/10games unchanged. New two-account tournament/chain/next-day physical acceptance open. Manifest: docs/releases/SW-017-2026-10-13-tournaments-final-chain.md.

13 October SW-017 slice2: hosted manual tournaments implemented and locally qualified. Mode/title/game/player counts, exact roster, fixed rules, host pause/resume, same-table progression/final ceiling and independent account-owned points/wins standings included in shared web/native UI.532 tests/65 files/all builds/source consistency,20 isolated PostgreSQL checks and synthetic phone/tablet layout passed; standard APK built/asset-matched. No live migration/backend/web publication or Pixel update; user continues testing deployed slice1. Actual two-account/next-day acceptance open. Details: docs/plans/SW-017-slice2-hosted-tournaments.md.

13 October SW-017 slice1 compatibility: local server supports capability-gated manual rematch/history via additive PostgreSQL migration and transaction RPC; shared web/Android candidate uses exact game identity and own readiness.500-test gate,8 isolated DB checks and local APK/asset match passed. Migration/function/web/Android must be qualified as a compatible set before live use; old room-only writers cannot safely handle advanced history state. No device installed or signed-in physical two-phone acceptance. [Candidate record](../plans/SW-017-slice1-hosted-rematch.md).

7 October HW-010: user's selected five-well charger and 19.7 mm die have a concrete [A0 review design](../../hardware/casino-die/rev-a/README.md). Proposed interface includes die ID, session/sequence, settled face, battery and charging/fault status. Persistent enrollment must be tested on the native host; accepted observations retain player confirmation and authoritative revision/seat checks. No custom hardware/firmware/app compatibility or physical acceptance has been demonstrated.

7 October HW-009 advisory: proposed rechargeable dice require persistent set identity, automatic reconnect, settled/fresh per-die results and existing confirmed command authority. A BLE case hub needs five dice links plus one phone link with a compatible mixed-role stack; proprietary RF is optional pending measured benefit. No compatibility demonstrated. [Design](../plans/HW-009-rechargeable-dice-and-case.md).

7 October HW-008 advisory: tray-powered die orientation would shift face inference into the die; power-up/read freshness, per-die IDs, complete five-die results and ambiguity rejection remain required. New sensing concepts have no established app/hardware compatibility and retain player confirmation/command authority. [Research](../plans/HW-008-alternative-dice-sensing.md).

7 October HW-007 advisory: verified standard d6 bottom-face observations can map to top=7-bottom; custom dice require an explicit opposite lookup. Proposed passive tray sensing must preserve per-die association, completeness, settling/freshness, ambiguity rejection, held/correction provenance and confirmed authoritative commands. No floor reader/phone compatibility established. [Assessment](../plans/HW-007-passive-bottom-face-tray-feasibility.md).

7 October HW-006 advisory: rigid tray-mounted optics can preserve relative camera/floor geometry through whole-assembly movement; intrinsic/extrinsic calibration, rigidity and stream/session checks remain necessary. Multi-view die association, known-layout side inference, held identity and disagreement/freshness handling are proposed new SW/INT scope; observations still require player confirmation and authoritative command checks. No compatibility or physical gate closed. [Feasibility](../plans/HW-006-tray-mounted-camera-feasibility.md).

3 October SW-014: user confirmed the standalone test works but requested clearer pictured review. Enlarged diagnostic screen now shows same-frame unmarked crops, numbered objects, original predictions and explicit confirm/correct/Not a die choices, plus missed-die entry. Schema v2 retains scalar per-object reviews with no images; game authority unchanged. Final 464 tests/59 files, all configured builds/source consistency and local APK passed. Candidate 870600a9f04f64d3b48ecf5a43c5b2ceb8d45ee981139211f5590249410a4b0e is built only. User says no Pixel updates unless explicitly asked; no devices inspected or installed. Physical ergonomics/optics/accuracy remain open. [Pictured review](../plans/SW-014-pictured-identification-review.md).


3 October SW-013: user prioritizes standalone real-C121 identification before further game integration. Android Dice identification test screen implemented with one-frame capture, readable/rejected overlays, actual0–5 face labels, bounded100-sample in-memory comparisons and sanitized JSON export/copy. No game commands.461 tests/59 files, all builds/source consistency and Android package passed. Final APKfc489ac6952a17e99ccf7f398b4a852468810ea106daa146688cc9aa4c084ef9 installed preserving data; fresh Pixel inventory, installed hash and launcher verified. Physical UI/recognition accuracy remain open. [Detailed handover](../handovers/2026-10-03-c121-dice-identification.md); [task](../plans/SW-013-standalone-dice-identification.md).


3 October SW-012: photo3953 confirms live camera and retained calibration after SW-011. Remaining extra-tap issue reproduced: game Capture/review only opened setup. Ready calibrated game capture now starts settled capture/review automatically; settings remains setup-only, missing/stale sessions still require setup, confirmation stays explicit.456 configured tests/all builds/source consistency and APK build passed. User clarified the previous extra capture step was missed. Direct-capture usability candidate now installed on freshly inspected Pixel preserving data, installed hash/launcher verified; physical review acceptance remains open. [Direct capture](../plans/SW-012-direct-camera-capture.md).


3 October SW-011: user confirmed SW-010 tray calibration, then reported setup-close/new-game loses camera. Pre-fix regression reproduced cleanup disconnecting before a first roll. Confirmed live calibration now retained across panel close, with fresh session/geometry guards and explicit disconnect/background invalidation.455 configured tests/all builds/source consistency and APK build passed; identified APK63562817c28cc509bfa09b7badd777f7bce0cf1b86da866dcbfcb4217e99bb58 installed on reconnected Pixel preserving data, installed hash/launcher verified. Physical first-game capture and roll recognition remain open. Zoom/control advisory is proposed only. [Session fix](../plans/SW-011-camera-setup-session.md).


3 October SW-010: user photos rejected SW-009 landscape sizing. Full-viewport calibration with landscape side controls implemented;450 tests/all builds, source consistency, responsive browser geometry and Android build passed. Pixel reconnected; candidate installed preserving data, installed hash matched and launcher succeeded. Physical landscape usability and camera roll acceptance remain open. [Layout correction](../plans/SW-010-landscape-calibration-layout.md).


SW-009,3 October: user confirmed actual manual tray calibration; expanded UI candidate installed on Pixel with hash/launcher verified, physical larger-view testing open. Proposed rigid tray-mounted coded perimeter markers/known geometry could permit stable reacquisition after movement; current manual polygon requires fixed camera-to-tray geometry and explicit recalibration after movement. Marker placement must account for raised rim versus rolling-plane offset. No automatic physical-motion interlock or registration implementation claimed. [Proposal](../plans/SW-009-camera-calibration-usability.md).

SW-008, 3 October: user's actual camera screenshot shows live and frozen image stacking during calibration. Display exclusivity corrected and verified automatically; corrected APK installed on reconnected Pixel with hash/launcher verified. Real-camera display/marking and stream-delay measurement remain open. The screenshot provides received-video evidence, without optical/inference/calibration acceptance. [Calibration correction](../plans/SW-008-camera-calibration-display.md).

3 October SW-007: new standard app installed on Pixel11 Pro XL/API37; hash/launcher verified, preserving saved data.449 software and19 native tests passed. Actual C121 connection/calibration/review and physical native-sheet interaction remain open; user setting up Tapo. Hosted room fixes deployed with authorization, rollback source/hash readback and public guard checks; actual signed-in phone journey remains open. Camera source still local-only. [Evidence and identities](../plans/SW-007-multiplayer-camera-test-readiness.md).

Updated 2 October 2026. Coordinator: Codex; product acceptance owner: product owner.

## Interface invariants

SW-006 synthetic protocol checkpoint: authenticated H.264 decoded through the emulator's Wi-Fi-bound native transport; advancing PNGs, matching encoded counters, geometry, hidden rendering, auth/reconnect and bounded adverse checks executed. [Emulator results](../plans/SW-006-emulator-rtsp-results.md) separate native/JS timing domains and retention from sensor latency. Actual C121/phone compatibility, content buffering delay and physical acceptance remain open; confirmation/authority and original/corrected provenance are unchanged.

Final current software development checks passed 343 tests and configured builds; final standard APK was visually checked only in the synthetic emulator. Bench stopped and app test credentials removed. This does not populate a physical INT-001 specimen manifest or close INT-002/INT-003.

- Sensors emit observations with source/device identity, freshness, calibration/configuration identity and completeness; inference does not grant a seat or turn authority.
- Accepted game commands use the current authority's seat, turn/revision and idempotency checks. Preserve original observation and visible correction provenance.
- Specify held-die identity, settling, roll limits, timeout/reconnect, stale/duplicate events and fallback for each transport. Uncertain readings cannot silently become completed rolls.
- Keep hosted rooms and Pi authority separate until an explicit versioned integration design and migration/recovery contract is reviewed.
- Document frame retention/sharing, credentials, network exposure and pairing/revocation per deployment topology.

## Controlled changes and compatibility

INT-004 (P1, advisory delivered; designs proposed): streaming/community opportunity assessment recommends a versioned public accepted-result feed and OBS overlay first, then Discord summaries and Twitch interaction. See [assessment](../streaming-community-opportunities.md) and [task record](../plans/INT-004-streaming-community-discovery.md). No implementation, platform partnership, physical validation or commercial scope approval claimed. Public projection, correction/recovery, publishing consent and spectator versus player authority require design review.

Current POC camera direction: C121 -> local Wi-Fi/router -> Android native decoded frames -> recognition/review -> existing authorized game command. No video cloud relay or Pi authority is required. Initial vendor setup, offline restart, received hardware/firmware, decoded-frame freshness and exact app compatibility remain verification items. See [decision](../decisions/2026-10-01-camera-platform-sequence.md), [handover](../c121-software-handover.md) and [SW-006](../plans/SW-006-c121-local-camera.md). First local native/frame/review slice is compiled and automatically tested; [implementation evidence](../plans/SW-006-first-slice-results.md) does not establish real decoding/physical compatibility. Proposed hosted camera authority contracts, staged local/hosted milestones and unaccepted performance targets are in [Android POC design](../android-c121-poc-design.md). User selected optional approach-side hints; they grant no player authority. Hosted multiplayer internet requirements remain unchanged. ESP32 cube qualification requires separate fresh optics and battery evidence.

INT-001 (P0, open): identify supported POC topology and candidate; freeze a compatibility manifest listing app/backend/agent/firmware source or build identities, protocol version, OS/runtime, device specimen, CAD/BOM/harness, calibration, network/power configuration and known limitations. Existing historical deployment reports do not populate current identity.

INT-002 (P1, open): approve test matrix and thresholds before acceptance: complete game, disconnect/reconnect, retry/duplicate/stale command, power/restart recovery, manual correction/fallback and optical/environment variation. Specify test counts and tolerated missed/false/duplicate roll rates, latency and sustained operation limits with rationale. Current 6/10 webcam exact rolls is historical evidence, not a POC threshold or hardware acceptance result.

INT-003 (P1, open): execute the matrix on identified specimens and compatible builds; record separate SW/HW results and overall G3 decision. Reopen affected rows after interface, calibration, optics, power or firmware changes. Reused tuning images cannot supply fresh recognition acceptance.

Use existing software contracts and hardware bench/runbook tables for detailed methods. Link results here instead of duplicating conflicting acceptance records.

SW-006 test preparation,2 October: [Android readiness](../plans/SW-006-android-test-readiness.md) records the final candidate and source gate, a complete13-category synthetic camera game with14 unique confirmed rolls, correction/kept provenance, zero accepted rolls on failed journal write, exactly one on retry, saved manual fallback and exact completed-record restart persistence. [Arrival test pack](../plans/SW-006-android-arrival-test-pack.md) prepares identified phone/C121 execution. The final APK completed1800.55seconds of synthetic capture/decode/inference/release:1635 advancing cycles,zero failures,zero retained frame files and bounded sampled app/WebView PSS. Bench stopped and disposable app profiles/credentials removed. These observations do not close INT-001 specimen/firmware compatibility, INT-002 thresholds or INT-003 physical acceptance.



SW-006,3 October compatibility observation: standard debug APK installed and MAIN/LAUNCHER activity started on Pixel11 Pro XL, Android17/API37. [Installation record](../plans/SW-006-pixel-test-install.md) identifies APK; this is installation/launch evidence only, not C121 or G3 acceptance.










13 October SW-017 deployment follow-up: user authorized updating everything. Additive Supabase history migration and exact game-room bundle deployed; 8 rooms preserved, 7 exact existing game snapshots archived, direct client RPC denied. Web published fcc4a63507f5021312e73ece7bcb132ff535e62d and public assets byte-matched. Pixel install -r succeeded, installed candidate SHA25633c40480751f6e9159f05198d44610c527d23ab5eaac6423aaa606a5a623b5f1 and launcher verified. No app clearing or existing score changes. Physical two-account rematch/history acceptance remains open; later tournament/analytics/rules slices remain pending. See docs/releases/SW-017-2026-10-13-hosted-rematch.md.



