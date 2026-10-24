# C121 dice identification: next-chat handover

Prepared 3 October 2026, America/Chicago. Product owner: user. Implementation and self-review: Codex. Physical recognition and independent acceptance remain open.

## Start here: the user's current direction

The user explicitly requested: a detailed handover and a dice identification test UI outside the game, establishing recognition first, then returning to game UI integration. This is the active priority. Use the new standalone Android test screen to collect real C121 evidence and diagnose detection/pip-reading problems. The game path is already implemented; its existence is not proof that real-camera recognition works.

Read AGENTS.md, docs/status.md, docs/projects/software.md and docs/projects/integration.md, then this document and docs/plans/SW-013-standalone-dice-identification.md. Apply the product-change skill for features or bug-investigation for observed defects. Camera platform constraints remain in docs/decisions/2026-10-01-camera-platform-sequence.md and docs/c121-software-handover.md. Preserve game authority and pure scoring boundaries in docs/architecture.md.

## Latest installed candidate and evidence

| Item | Identity / result |
|---|---|
| Latest scope | SW-013 standalone dice identification UI; final interruption-safe export adjustment |
| APK | artifacts/sw013-identification/android-test-candidate.apk |
| APK and Pixel base.apk SHA256 | fc489ac6952a17e99ccf7f398b4a852468810ea106daa146688cc9aa4c084ef9 |
| App | Dice Clubhouse Dev; com.fluiditygroup.diceclubhouse.dev |
| Last inspected device | Pixel11 Pro XL, USB serial67080DLDV005JQ; earlier Android17/API37 identification |
| Install | Replacement install succeeded, preserving saved app data; launcher Status:ok, WaitTime345ms |
| Installation evidence | artifacts/sw013-identification/pixel-install-final.json |
| Configured gate | 461 tests in59 files; web/native/room builds passed, source unchanged during run |
| Final gate report | artifacts/engineering/2026-10-03T21-22-28-362Z-34b87060/report.json |
| Gate source SHA256 | 7cf2c93aa44723a016013e04cf48ccf39e2f0103965556f7e36e933765bb4de6 |
| Git baseline | Dirty master; HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc |
| Final Android build | Capacitor sync and offline assembleDebug passed; artifacts/sw013-identification/android-build-final.log |
| Native scope | No native Java changes in SW-010–013;19 native test evidence from earlier qualification, not a fresh19-test execution in SW-013 |
| Camera runtimes | Local ignored manifest reports OpenCV4.13.0/MediaPipe0.10.21; public/camera-assets/manifest.json SHA25642a6d219ea2e5e9302539a52812aaaf2fa27382252d68c4d89453a16cf64f350 |

An earlier SW-013 APK a59d292f818cedcd61bf403f5406b2b9c7450006a6917c34d20c338edf804c6c was installed, then superseded by the final candidate above. SW-012 APK3d336b82425e9643868beb1612605effa2ea1b115c0fee24ad9c6b2aa6674a6c is historical. Inspect devices freshly at every deployment; this document does not assert current USB/camera state. Post-final-gate changes are documentation/evidence records only.

## Standalone UI: implemented behavior

Open **Menu → Dice identification test**, available on Android even without a game. A direct **Dice identification test** button is also on the new-game screen. The title must say **Dice identification test**, not Camera dice. No game needs to be created.

1. Select the saved camera profile and tap Connect. Expect actual live video on the same Wi-Fi.
2. Tap Calibrate tray. Rotate the phone sideways for the large image and side controls. Mark eight inside playable corners clockwise. Undo point/Start outline again/Back to camera are available. Confirm tray outline.
3. Place0–5 ordinary light D6s with dark pips in the calibrated region. Remove hands and let the dice settle. Tap **Test dice identification**.
4. The UI freezes one fresh frame and runs the existing reader once. Readable dice get green bounding boxes with a number/face label; unclear candidates get amber boxes and question marks. Text shows readable faces/count and rejection reasons. This is diagnostic single-frame capture, not the game's settled-roll loop.
5. Choose Actual dice count, then enter the actual faces from the physical dice. Values must be1–6 and all selected dice must be labeled. Ordering does not matter; repeated faces are counted correctly. Prediction values are not prefilled as ground truth.
6. Add optional notes, then Record comparison. One test can only be recorded once. A frame with unclear candidates is not an exact result even if the readable face multiset matches. Empty-tray success requires no readable or rejected candidates.
7. Export test results exposes read-only JSON for selection/copy and requests a local JSON download. Android download behavior has not been physically verified; visible JSON is the fallback. Export is still available after connection interruption so prior comparisons can be recovered.
8. Maximum100 comparisons per screen session. Export before clearing or closing. Results are in memory, not persisted across closing/restart. Clear test results affects only these test comparisons.

Export contains face predictions, actual labels, bounds/positions, reader evidence, rejection reasons, scalar frame metadata and notes. It excludes image pixels, native private snapshot URLs/files, camera credentials and game commands. It is diagnostic evidence, not a saved game or an automatic tuning dataset. Actual image exports/gallery persistence are not implemented.

## Important limits and meanings

- Hand detection is disabled in CameraRecognition's current bridge: hands=[] and handEnabled=false. Do not claim a working hand interlock from the worker's handInTray field. The UI explicitly instructs removing hands.
- Motion flag compares consecutive diagnostic frames; it is not proof of a settled physical scene. The standalone screen intentionally avoids the five-dice/settled gate so missing dice and rejected scenes remain inspectable.
- Exact comparison is an unordered face multiset, not per-physical-die identification or verified position localization. Bounding boxes require visual assessment. Reader quality numbers are heuristics, not calibrated probabilities.
- Current recognition is a conservative OpenCV baseline for light dice/dark pips, not accepted real-C121 accuracy. No C121 exact-roll accuracy statistics have yet been recorded in this chat.
- Calibration is tied to native session and frame geometry. Reconnect or changed frame dimensions invalidates it; camera/tray movement is not automatically detected. Recalibrate after moving either. It is held in RAM and must be repeated after an app update/restart.
- Closing a calibrated camera panel hides native preview/releases snapshot/worker/listener resources but retains the live session for reuse. Use explicit Disconnect when finished. Background/native lifecycle can interrupt it; reconnect and recalibrate when needed.
- Stream delay is user-reported, not measured. Local timing diagnostics measure processing stages, not sensor-to-screen latency. Measure lag separately with a physical event/timer, and report whether it grows.
- Screenshot3953 confirms received video and retained calibration on SW-011. It does not show any recognition result. User later clarified that the second Capture settled roll step was simply missed, so this was not continuing session-loss evidence.

## Immediate real-camera test matrix

Start with a small labeled baseline before tuning. The counts below are a proposed practical collection sequence, not a product acceptance threshold.

| Step | Physical scene | What to inspect / record |
|---|---|---|
| 1 | Empty tray, several captures | No false readable dice or persistent rim/corner candidates |
| 2 | One die, each face1–6 near center | Candidate found, top face read; count1 and actual face labeled |
| 3 | Same faces at near/far/left/right positions | Pip size, blur, perspective, edge rejection; note position |
| 4 | Five separated dice, mixed/repeated faces, around20 fresh layouts | Exact count/face multiset; missing/extra readable objects; rejected candidates |
| 5 | Dice near inside boundary, touching pairs, glare/occlusion | Conservative rejection versus confident wrong face; photograph defects separately if useful |
| 6 | Disconnect/background/resume and rotate phone | Prior evidence exportable, stale frame cannot be recorded, fresh session requires calibration |

Keep camera/tray/light configuration fixed during a baseline. Record hardware/firmware revision, selected stream, actual frame dimensions from test export, camera distance/angle and lighting. The most recent screenshot's profile was192.168.0.150, but inspect actual network state rather than treating that as current.

Use clear user screenshots of frozen overlays plus the matching JSON sample number/sequence when diagnosing. Images remain separately user-supplied/private; do not copy them into Git. Do not tune on a collection and then report performance on that same collection as fresh validation. Separate calibration/tuning samples from a held-out fresh validation set.

Diagnose in this order: frame detail/focus/compression → tray region → candidate count/bounds → top-face pip extraction/pattern agreement → conservative rejection → repeated fresh validation. Only after representative identification evidence and user acceptance, return to complete game capture/review/reroll/held-slot/scoring/history/recovery testing. Any numerical acceptance target must be agreed, not invented as already passed.

## Source map and next developer actions

| Component | File / responsibility |
|---|---|
| Android entry points | src/prototype.js: camera-test action/menu/home button; existing game capture intent |
| Shared camera lifecycle | src/dice/camera-panel.js: openDiceIdentificationTest, explicit diagnostic mode, profile/preview/calibration/snapshot, stale-session/geometry protection |
| Standalone result UI/evidence | src/dice/camera-test.js: createDiceIdentificationUI, DiceIdentificationSession; no scoring/game command imports |
| Landscape calibration CSS | src/dice/camera-panel.css |
| Native bridge | src/dice/input/native-camera.js; Android C121Camera implementation under android/app/src/main/java |
| Worker lifecycle | src/dice/input/camera-recognition.js: init/inference timeout, shutdown, packaged OpenCV |
| Vision | src/dice/camera/worker.js, recognizer.js, pattern/tracking helpers |
| Existing browser webcam lab | src/dice/camera-lab.js and camera/feedback.js; separate older browser dataset workflow |
| Standalone regressions | tests/camera-identification-test.dom.test.js: multiset/empty-tray/false-positive/retention/sanitized export/no-game/interruption |
| Existing camera regressions | tests/camera-panel.dom.test.js and tests/camera-game-ui.dom.test.js |

First next-chat action: read this handover and latest status, then ask for the first real standalone result or inspect user-provided result JSON/screenshot. Do not assume recognition is successful because builds pass. If the standalone UI itself fails on phone, reproduce and fix that defect before tuning the reader.

Source verification commands (PowerShell):

```powershell
node node_modules/vitest/vitest.mjs run tests/camera-identification-test.dom.test.js tests/camera-panel.dom.test.js tests/camera-game-ui.dom.test.js
node scripts/engineering-check.mjs verify
node node_modules/@capacitor/cli/bin/capacitor sync android
$env:JAVA_HOME='C:/Program Files/Android/openjdk/jdk-21.0.8'
$env:GRADLE_USER_HOME=(Resolve-Path .gradle-local).Path
./android/gradlew.bat -p android --offline --no-daemon assembleDebug
$adbPath=Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
& $adbPath devices -l
```

Node24 is required; Node24.19.0 used here. Existing dependencies/cache were reused. For a clean supported checkout use npm ci and npm ci --prefix device/pi per AGENTS.md. npm may require its runtime entry point on this workstation. Optional camera assets are ignored and must be prepared/reported separately. Do not edit source during a qualification gate. Identify the APK hash, inspect the actual authorized target, install with -r preserving data, verify remote base.apk hash and launcher, and update durable records. Never assume a dirty-tree build is a releasable baseline.

## Earlier work retained, with boundaries

- SW-007: multiplayer mode/prototype-key validation, reserved internal IDs, create concurrency recovery, confirmed-user auth checks, CAS handling and bounded client request/auth retries; native camera-profile save/cancel race fixed. See docs/plans/SW-007-multiplayer-camera-test-readiness.md.
- SW-008: duplicate live native preview plus frozen canvas fixed; native preview hidden during calibration/review.
- SW-009/010: eight-point calibration undo/restart/cancel and full-viewport landscape sidebar. Actual user confirmed calibration worked. Automatic tray registration was discussed but not implemented.
- SW-011: setup-close retained only after a confirmed roll was reproduced/fixed; a calibrated session now survives setup-before-game. Explicit disconnect/background/session/geometry invalidation remains.
- SW-012: game Capture/review now requests capture directly when ready; setup-only menu remains manual; player confirmation still required. Physical direct game capture is not accepted merely by installed code.
- SW-006: synthetic Android H.264 RTSP/emulator, complete synthetic game and30-minute resource evidence are historical scoped evidence; they do not qualify received-camera optics or real Wi-Fi/phone latency.

## Backend and accounts

Supabase DiceClubhouseDev project ezgawsdmvuoqrxlfbgen, function game-room. User explicitly authorized deployment on3 October; tested deployed bundle hash c196a85a9b4bf8cd5a3104b4c5c4d2e6a224899ef8e5cc5dd0193306a6f924cc. Five public health/auth guards passed; signed-in phone room journey remains open. Manifest docs/releases/SW-007-2026-10-03-game-room.md, rollback artifacts/sw007-mp-review/server-rollback/index.ts. No backend changes/deployments in SW-008–013.

An existing confirmed game account was found with user-authorized account-list access. Hosted game login is distinct from the camera's local Camera Account credentials. Do not reset passwords, send messages/emails or enter new credentials automatically. No credentials are in this handover. The native test UI uses saved secure camera profiles and does not require Supabase/game sign-in.

## Tray recognition, zoom and future work

Current manual inside eight-corner polygon is user-confirmed, with camera/tray relative position fixed. Automatic color/octagon proposals and rigid tray-mounted coded perimeter markers are proposals, requiring review before use. Known marker layout/physical size and raised rim versus rolling-plane geometry matter. Identical white dots could help manual marking but may resemble pips; decorative coded markers outside the playable ROI are stronger for orientation/reacquisition. Nothing has been purchased, printed, painted or qualified here.

C121 is vendor-controlled firmware. Official specifications list fixed3.17mm lens and12x digital zoom, not optical zoom. App-side crop/zoom could enlarge marking/result inspection without replacing firmware, but is not implemented and creates no new optical detail. Documented RTSP/ONVIF features can be used; actual C121 control capabilities have not been probed. No firmware service was stopped or taken over. Any zoomed marking must map back to original frame coordinates.

References previously checked: https://www.tp-link.com/us/home-networking/cloud-camera/tapo-c121/ and https://www.tp-link.com/us/support/faq/2680/. Review current manufacturer documentation if implementation depends on exact controls. ESP32 camera housing follows independent camera-detail/recognition evidence; C121 success would not qualify another sensor/lens.

## Working discipline and open gates

Preserve substantial pre-existing dirty/untracked work. No bulk stage, reset/clean, credential/dataset copying into Git, force-push or invented release approval. No new chat, subagent or recurring automation without direct authorization/applicable instruction. Existing native/vision agents are historical; no new delegation was used for SW-013.

The user authorizes routine development and Pixel test updates; inspect fresh connection before each install. Backend deployment had separate task-specific authorization. Purchases, supplier messages, new live deployment and commercial/physical gate acceptance need their own scope/authorization. Avoid asking again for already authorized reversible work. Record implemented, verified, installed and physically accepted states separately.

Open: physical standalone UI/export ergonomics; actual C121 detection/pip accuracy; hardware/firmware/stream specimen identity; buffering/latency measurement; movement interlocks/auto-calibration; signed-in multiplayer; representative full-game camera integration; committed reproducible baseline/remote CI; G3 and commercial gates. None is closed by Codex self-review alone.

## 3 October follow-up: SW-014 supersedes the standalone labeling UI

User confirmed SW-013 test worked, then requested pictured per-object review because the small UI obscured what the reader saw versus its prediction. SW-014 implements unmarked crops below the frozen frame, prediction and explicit confirm/correct selector for every readable or unclear object; Not a die and missed-die add/remove preserve false/missing cases. Actual count is derived from these labels. Export schema v2 adds scalar per-card reviews, preserves original predictions and excludes images. Physical updated UI and reader accuracy remain open. See ../plans/SW-014-pictured-identification-review.md for final 464-test gate and built-only APK identity.

User explicitly says do not update Pixel unless asked; another Android tablet application is being worked on on this workstation. This supersedes the earlier automatic Pixel test-update authorization. No device inspection/install occurred for SW-014. Latest installed SW-013 identity above remains historical; SW-014 is a local candidate only.
