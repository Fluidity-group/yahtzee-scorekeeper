# Pi game host and remote trays — first development slice

**Current implementation:** see [Pi hardware handoff](pi-hardware-handoff.md). The original product direction below includes future work. The hardware acceptance build provides a standalone local/central authority, scoped camera relay, reviewed rolls, SQLite persistence and deployment tools. It does not integrate the existing Supabase service or provide shared-tablet seat switching.

28 September 2026. Hardware context: chat **Design angled dice tray camera**, existing `hardware/dice-vision-v1` CAD and `docs/camera-design/purchase-list.md`. Proposed Pi 5 4GB, Camera Module 3 Wide visible-light, active cooler and adjustable illuminated stand. The measured 88.9 mm rim can occlude dice. Physical camera coverage, colour, lens distortion, focus and thermal performance remain acceptance gates.

## Product operation

**Local table:** one Pi owns the game, camera and durable game log. Any phone/tablet on the LAN opens its responsive web UI through a QR link; each joins a player seat. A shared tablet may switch seats with explicit controls. No internet account is required for the planned offline mode. The Pi checks every command, turn and revision; phones never independently decide the shared score.

**Remote table:** the existing cloud room service owns the game. Each household has a Pi/tray and one or more player seats. Each Pi makes an outbound authenticated connection; no router port forwarding. Phones use the cloud HTTPS UI. A room invitation joins a person; pairing a device assigns that tray to permitted seats. Those are separate permissions. One tray may serve several local players, but only the currently active player's confirmed roll can advance the game.

Do not make every Pi an authority for the same remote game. If internet fails during remote play, pause authoritative progression, keep the local review and retry the same command after reconnect. Never merge independently advanced games. Offline local games can be exported later; joining an active cloud game is an explicit new session, not implicit authority migration.

## Setup and joining

For engineering bring-up, provision Wi-Fi/SSH through Raspberry Pi Imager or use Ethernet. Product onboarding: scan the device QR, connect to its temporary password-protected setup Wi-Fi, select home Wi-Fi, enter credentials, reconnect the phone to home Wi-Fi, then pair the device. Provide a recovery/setup button and printed local address fallback. Switching one radio from setup AP to client mode breaks that setup connection; the UI must explain reconnection. Do not assume concurrent AP/client operation.

BLE provisioning is a later convenience using authenticated, time-limited physical pairing. It transfers Wi-Fi credentials to the Pi; it does not carry the game or camera video. Do not depend on Web Bluetooth for universal phone onboarding: browser support is limited and requires a secure context. A native Android/iOS bridge could support BLE while the hotspot stays the cross-platform fallback. Never log Wi-Fi credentials or place them in room invitations.

Separate local and cloud browser origins. Cloud HTTPS pages should not depend on fetching an insecure LAN endpoint. Remote device previews travel through an authenticated relay when needed. Local browser UI will be served by the Pi gateway; installable PWA features and browser camera/Bluetooth APIs require a secure-context plan. Pi-attached CSI capture does not require phone getUserMedia.

## Dice and game interaction

1. Authority grants the active seat a turn/capture context (room, revision, turn, roll index, permitted device).
2. Player selects which logical slots to keep; leave kept dice in view and pick up the rerolled dice. Arm before pickup. The first roll rerolls all five; later rolls must reroll at least one.
3. Pi processes camera frames locally. Stable dice become a proposal, never an automatically accepted game command. Freeze one image with its exact calibration, recognizer version and predicted boxes.
4. Active player confirms or corrects each face and the held slots. Matching face values alone cannot establish that a die was held. Physical dice have no durable identity: retain explicit logical-slot mapping within the turn and record uncertain pickup tracking.
5. Authority validates player/device binding, turn, maximum rolls from rules, kept values, command ID and expected revision. It commits once, persists, acknowledges and broadcasts to all screens. A double-tap/retry cannot add a roll twice. Only acknowledged commits advance the UI.
6. Player selects a score category through the shared rules engine. The next seat gets the turn. Hand direction remains advisory and must never authorize a remote player or select an account.

Frozen review may take minutes: freshness is checked when capturing, then the proposal is pinned to a valid turn/revision. Do not reuse the lab coordinator's two-second acceptance deadline for a network human-review workflow. Invalidate the proposal on turn, camera profile or calibration changes. Review corrections retain both original and corrected values.

## Lessons carried forward

- Camera capture, dice inference, tray monitoring and hand estimation are separate tasks with bounded queues; keep the newest preview rather than accumulating delayed frames.
- Confirmed bounds stay fixed. The slower tray monitor proposes changes; never apply during capture/review. Applying a new boundary invalidates capture/held tracking, not the persisted game score.
- Readable dice and unclassified regions are different UI objects. Frozen counts, boxes and values all come from the same frame.
- Narrow contacts can sometimes split; fully touching/occluded dice remain uncertain. Manual position labels remain possible inside rejected clusters.
- Keep manual entry as an equal input provider. Recognition corrections create labelled data, not automatic learning.
- The latest ten saved rolls passed 50/50, but a broader 51-frame replay passed only 46 complete rolls. This is not a universal accuracy guarantee. Angled Pi camera imagery is a new validation set.

## Software boundaries and existing code

Reuse `src/game/core.js` as the rules engine and `src/multiplayer/room.js` as the authority-policy starting point. The current room layer only permits manual/GoDice and delegates hardware rolls to a single host. Do not disguise camera rolls as GoDice. Introduce provider-neutral roll commands and member/device bindings with migration and authorization tests before cloud deployment. Existing Supabase auth, revision compare-and-swap and receipts are valuable foundations, but multi-tray camera integration is not implemented yet.

Pi processes: Python Picamera2 capture → bounded frame transport → JS/OpenCV recognition → device gateway → local authority or outbound cloud adapter. Start by reusing the tested JS recognizer headlessly; benchmark before deciding whether to port to native OpenCV. A second camera/model is an option only after occlusion measurements. Phone clients render state and confirm proposals; they do not each run recognition on the same Pi stream.

Persist accepted events, corrections, device/seat assignments and pending command receipts in a Pi SQLite journal (planned). On restart, recover the game but discard unconfirmed observations. Cloud stores authoritative remote state. Device credentials are revocable and scoped; no Supabase service-role keys on phones or Pis. Keep raw frames local by default; explicit exports/diagnostic consent control uploads. Retain evidence references and bounded sample storage, not endless full-frame archives.

## Implemented now and remaining gates

Initial code: `device/pi/capture.py` captures CSI frames; `vision.js` runs the existing recognizer with calibrated resolution checks; `host.mjs` offers loopback-only health and observations and rejects stale previews. It also accepts stdin RGBA fixtures for PC testing. These endpoints are developer previews, not accepted game rolls. No Wi-Fi credentials, pairing, cloud writes or current camera-lab changes are performed by this service.

Next slices, in order:
1. Physical CSI bring-up, colour/focus/exposure checks, saved-frame parity, frame-age/backpressure and CPU/thermal benchmarks. Add profile setup, preview transport and camera disconnect recovery. Never copy the Brio polygon to the new optics.
2. Pi durable local authority + responsive shared room UI, player join/pairing and confirmation commands. Test two phones, retries, held dice, three-roll turns, restart and complete game recovery.
3. Cloud camera-provider support and scoped multi-device seat assignments; test two Pis on different networks, delayed commands, reconnect and out-of-turn rejection.
4. Hotspot provisioning/recovery, optional native BLE setup, signed updates and retention controls.

No Pi has been connected/deployed in this task. No remote multi-tray functionality is claimed complete.

## Sources checked

- [Raspberry Pi camera software / Picamera2](https://www.raspberrypi.com/documentation/computers/camera_software.html)
- [Picamera2 manual](https://datasheets.raspberrypi.com/camera/picamera2-manual.pdf)
- [Raspberry Pi network/configuration documentation](https://www.raspberrypi.com/documentation/computers/configuration.html)
- [Web Bluetooth limitations and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)

## Local-game implementation checkpoint

The next slice is implemented in `device/pi/local-game.js`, `game-host.mjs` and `web/`: shared Standard-rule rooms, up to eight player sessions, explicit manual face/held confirmation, server-side score validation, polling state sync, last-roll correction, game export, idempotent command receipts and revision checks. The existing core now supports the distinct `manual-faces` provider. Existing cloud room permissions remain unchanged.

Persistence currently uses a flushed JSON snapshot plus atomic rename, with a single host process per state file. SQLite, directory-fsync power-loss testing and multi-process locking are not yet implemented. Browser seat tokens support ordinary reconnects but do not provide lost-token recovery. The local HTTP interface is restricted to loopback by default; LAN exposure is an explicit private-network testing choice, not a production deployment.

Verification: full two-player 26-turn game and restart recovery; rejection of out-of-turn, stale, conflicting retry and invalid held-die commands; existing core/cloud room regression tests; HTTP host/create/join/authentication smoke test. Physical two-phone UX and Pi deployment remain unverified. Camera proposals do not yet feed this service.
