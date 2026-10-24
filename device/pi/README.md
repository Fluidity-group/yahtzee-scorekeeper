# Pi dice game — hardware acceptance build

See the [hardware handoff](../../docs/pi-hardware-handoff.md) for installation, replay, networking, backups and physical acceptance checks. This standalone service shares the application's rules core; it does not use existing Supabase rooms.

Use Node 24.x. Set PI_SETUP_KEY to a random secret of at least 24 characters, then run `node device/pi/game-host.mjs` from the repository root. Open http://127.0.0.1:8481, create a table and invite browser seats before starting. SQLite saves accepted games to artifacts/pi-local/games.sqlite by default. Keep the database and setup key private.

Pair a camera in the host controls, download its private configuration and run `node device/pi/agent.mjs /path/to/config.json`. For PC testing, add replayFile pointing to an exported labelled-example JSON file. Replay uses the actual inference worker and relay and is explicitly marked as replay. On the Pi, the agent uses capture.py and Picamera2.

Request a preview, confirm eight tray corners, then freeze and label each die before accepting a roll. Held slots are explicit. Predictions never automatically advance the game. Pending saves retain their command ID for safe retry. Seat recovery requires the host setup key.

Build with `node scripts/package-pi.mjs <new-release-name>`. The package includes JavaScript dependencies, OpenCV, licences and a checksum manifest. Follow the handoff for systemd installation or a central HTTPS host. Multiple scoped camera agents connect outbound to the central host.

The optional Wi-Fi helper supports `node device/pi/setup-host.mjs --dry-run` on a PC. Real hotspot provisioning, CSI capture, focus, coverage, heat and power-loss recovery still require Pi hardware. Native Bluetooth provisioning, automatic hand attribution and automatic tray following are not enabled in this build.
