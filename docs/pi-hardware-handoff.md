# Pi hardware handoff — software acceptance build

This is an engineering test release, not a production appliance. The current PC webcam lab remains unchanged. The standalone Pi stack can be tested on a PC using replay before hardware arrival.

## What runs now

- Standard Yahtzee authority for 1–8 people, distinct browser seats, invitation code/QR, explicit turns, up to three rolls, held-slot validation, score suggestions, last-roll correction, score export and host-authorized lost-seat recovery.
- Same rules core as the application, with manually entered faces distinguished from confirmed camera and replay evidence. Camera predictions never auto-commit a game roll.
- Camera registration scoped to selected seats, revocation, eight-corner calibration, on-demand preview, frozen image review and five position labels. The active assigned player must confirm. Confirmation may take up to 30 minutes while the turn/revision remains unchanged; camera frame freshness applies at freeze, not after human review.
- A Pi CSI capture helper and outbound camera agent using a separate JS/OpenCV inference worker. Request/response capture bounds the queue to one frame. Replay uses the same processing and HTTP path and is visibly labelled REPLAY.
- Local authority or a separately hosted HTTPS authority with multiple outbound camera agents. The latter enables the remote-table architecture without inbound ports on the Pis. This is a standalone service; it is **not** a deployment or modification of the existing Supabase room backend. Do not join a Supabase room from this UI.
- SQLite atomic commits, FULL synchronous mode, two latest checkpoints, full game event history and durable command receipts. Old JSON prototypes can be migrated. A compare-and-swap prevents stale processes overwriting newer state; run one authority process per database for volatile camera-review ownership.
- Optional accepted-image archive (`PI_SAVE_IMAGES=true`), atomically saved with the game commit. Maximum 200 images / approximately 128 MiB globally; oldest images are removed. Without the setting, accepted events retain predictions, labels and provenance, but not images. Unsaved previews exist only in RAM. Export retained examples regularly if collecting training data.
- Release packaging with dependency licences, file checksums, systemd units, explicit installer, SQLite backup tool and an optional HTTPS central-host container/Caddy configuration.
- An explicit temporary Wi-Fi setup server with password-protected hotspot profiles, credential validation, a 15-minute window and return-to-hotspot attempt after failed connection. PC tests use injected command adapters; real NetworkManager operations remain a Pi test.

## Before shipping this prototype to the Pi

Use Node **24.x**. Node 24.19.0 was used on the PC; `node:sqlite` is a version-sensitive built-in, so do not silently substitute an older runtime. Release dependencies are JavaScript-only `pngjs`, `qrcode` and their dependency closure; the packager copies the installed versions and licences. OpenCV's JS/WASM asset and licence are included from the existing local camera assets. No game databases, recordings, credentials or user exports are packaged.

Build a fresh release from the repository root:

```powershell
node scripts/package-pi.mjs dice-pi-hardware-test-1
```

The output is under `artifacts/pi-releases/`. The release manifest verifies contents, not publisher identity; compare its archive SHA-256 with the separately supplied trusted checksum. There is no automatic internet updater in this build.

## PC bring-up / replay

1. Set a random `PI_SETUP_KEY` (at least 24 characters), optionally `PI_SAVE_IMAGES=true`, then run `node device/pi/game-host.mjs`. Default: loopback port 8481, database `artifacts/pi-local/games.sqlite`.
2. Open the UI; create a room, then join other browser profiles/phones before starting. For private-LAN testing set `PI_GAME_BIND=0.0.0.0` and use the host's LAN address. The raw service uses HTTP: do not expose that port publicly.
3. In Host camera setup, give the camera a name and seat list (`1,2` for one shared local tray). Pair/download its private JSON configuration. Configure the authority URL reachable from the agent machine, not localhost on another machine.
4. To replay, add `"replayFile":"/absolute/path/to/camera-labelled-examples.json"` to that configuration. Run `node device/pi/agent.mjs /path/to/config.json`. This does not use a physical camera and always records replay provenance.
5. Show live preview. That requests frames; no images are relayed before a preview request, and requests lapse after 60 seconds without refresh. For a remote authority, requesting preview sends tray images to that host. Pair only devices/seats authorized to share that view.
6. Mark eight inside corners on an empty-tray frame; confirm the boundary. Device profile propagates on the next poll. Start the game, freeze a settled scene, label all five dice in logical slot order and select the held slots in the turn controls. Record the roll. Rejected clusters remain individually labelable.
7. On disconnection, a pending command is retained in browser session storage. Use Retry pending save. Reusing an accepted command ID cannot add a second roll. Accepted games survive restart; unaccepted camera reviews deliberately do not.

The preview recognizer does not automatically determine held-die identity, hand/player identity or guarantee stability. The player explicitly chooses a settled frame and confirms held logical slots. The new Pi path keeps tray bounds fixed; automatic tray movement following and hand inference from the older lab are not enabled here. Recalibrate between reviews if the tray moves. This is deliberate for the first physical acceptance build.

## Pi installation

1. Write 64-bit Raspberry Pi OS with Imager. Configure the country's Wi-Fi regulatory setting, networking and SSH in Imager, or use Ethernet. This is the recommended first bring-up route.
2. Install Node 24 at `/usr/bin/node`, plus OS packages `python3-picamera2`, `python3-numpy`. Verify `rpicam-hello --list-cameras` sees the Camera Module 3 Wide. Use the correct 15-to-22-pin cable; connect it with power removed.
3. Copy/extract the release. From its root run `node device/pi/deploy/verify.mjs`, then `sudo sh device/pi/deploy/install.sh`. This creates the restricted `dice` account, installs versioned software and starts the game service. Installer operations have not been run on this PC.
4. Obtain the private setup key with `sudo cat /etc/dice-table/game.env`. Open `http://<pi-LAN-IP>:8481`; create/join the game. Pair the camera, copy the resulting file and install with `sudo install -o root -g dice -m 640 camera.json /etc/dice-table/camera.json`.
5. Start `sudo systemctl enable --now dice-camera.service`. Inspect `journalctl -u dice-camera -u dice-game` if needed. Credentials are not printed by the camera agent. Never put a cloud service-role key in the camera config.
6. Perform the calibration/confirmation workflow above on actual Pi images. Do not reuse the Brio polygon. The capture baseline is fixed 960×540 RGB processing; resolution, lens distortion and focus/exposure tuning are physical-test work.

If startup fails because the local Node executable differs, edit the unit's explicit executable path. Do not replace system Node blindly. Stop services before changing the release symlink. To roll back software, repoint `/opt/dice-table/current` to the preceding verified release and restart; keep the current database and back it up first. No destructive database downgrade is automated.

## Optional Wi-Fi setup prototype

Use this only during a deliberate physical setup/recovery session. On the Pi, supply random `DICE_SETUP_TOKEN` and `DICE_AP_PASSWORD` environment values to `setup-host.mjs` using a root-owned environment file; the latter must be an 8–63 character WPA2 passphrase. Run explicitly as root. It creates `Dice-Setup` on `wlan0` and serves `http://10.42.0.1:8483`. Join that password-protected network, enter the device setup code and home Wi-Fi details, then reconnect the phone to home Wi-Fi. Passwords are written only to root-readable NetworkManager keyfiles, not shell arguments or cloud storage. Successful setup closes the service. Failed activation attempts restore the setup hotspot. The hotspot requires physical validation on the actual OS/radio; enterprise Wi-Fi, WPA3-only networks and captive portals are not supported in this first setup path. Optional native BLE provisioning is not part of this acceptance build.

PC UI dry run: set `DICE_SETUP_TOKEN`, then `node device/pi/setup-host.mjs --dry-run`; it binds loopback 8483 and does not write profiles or invoke NetworkManager. The game service never runs this privileged setup helper automatically.

## Optional remote authority deployment

Use the extracted release as the Docker build context. Copy `device/pi/deploy/compose.yaml` to its root, set `DICE_DOMAIN` and a random `PI_SETUP_KEY` through the deployment environment, then build/start Compose on the chosen server. Caddy terminates HTTPS; the game service has no public direct port. Domain/DNS, HTTPS reachability and backups must be checked on that host. No container/cloud deployment has been performed here. Both remote Pis use the same HTTPS authority URL and their own scoped camera configs. Do not run separate independent authorities for the same game. Real WAN outages and physical two-site play are acceptance tests, not inferred from local tests.

## Backup and recovery

`node device/pi/deploy/backup.mjs source.sqlite new-backup.sqlite` takes a consistent SQLite backup, including any retained images. Restrict backup access. `migrate-json.mjs old.json new.sqlite` preserves the old JSON while converting the previous prototype. Lost player session: the owner can use Recover a player seat with the table code, seat number and host setup key; this revokes the old browser token. Lost camera config: revoke and pair a new device. Restart discards frozen reviews and requires a new frame.

## Hardware acceptance gates

- CSI connection/colour orientation; focus across near/far dice; exposure under installed LEDs; full tray visibility behind the 88.9 mm rim; wide-lens distortion and touching/occluded dice.
- Correct five-die values and manually confirmed held-slot history through a full game on two physical phones; no duplicated commits after Wi-Fi interruptions, browser reload or Pi restart.
- Camera disconnect/reconnect, slow/failed inference, stale frame rejection, sustained temperature/CPU/RAM, preview bandwidth and SD-card write behaviour.
- Real NetworkManager AP/client transition, wrong-password recovery, setup timeout, power loss, OS service permissions and secure credential file ownership.
- Optional remote: two physical Pis on different networks, calibrated independently, alternating seats through a full game, delayed/retried commands and server restart.

Passing PC replay/unit/browser checks does not establish these hardware results. Production account management, native BLE onboarding, signed OTA updates and existing-Supabase camera integration remain separate product work, not prerequisites to this Pi hardware test.
