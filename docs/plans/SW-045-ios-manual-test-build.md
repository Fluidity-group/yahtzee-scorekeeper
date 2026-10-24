# SW-045: first native iOS manual-game test build

17 October 2026. Owner: Keith. Lead: Codex. State: compiled, installed and launched in the iOS simulator; physical iPhone acceptance pending.
Baseline: SW042 working game plus SW043/44 design records, commit7f978fb. Isolated checkout artifacts/sw045/source, branch codex/sw045-ios-manual-test. Existing Pixel/web builds remain unchanged.

## Approved direction and scope

Owner approves Rally layout + Night Match race lanes + Playform bonus animations. Start with the native iOS test build; preserve tournament/settings. The first iOS target packages the working manual game, before integrating the approved visual mix. No voice implementation, hardware parity or commercial-release work. Mac availability is confirmed; actual access, Xcode/signing and device compatibility must be inspected there.

## Implementation and contracts

- Pin @capacitor/ios8.5.2 to match existing core/android/CLI. Generate official Swift Package Manager Xcode target; no personal signing team/certificate committed.
- iOS includePlugins empty: no unqualified BLE/camera/audio bridge. Android plugins unchanged.
- ios-test Vite mode is a native asset build with no PWA worker. Commentary transport/setup and welcome prompts are bypassed locally; do not configure/disable the shared table’s commentary or overwrite saved profile settings. UI hides deferred voice/hardware controls only in this build.
- Keep bundle identity stable for later updates. Sign-in uses the existing emailed-code/password flow; return by Saved tables or join code. Universal Links/Safari-to-native invite handoff is not promised by this first target.
- Use the same public Supabase endpoints and anon key. No backend function/schema change, account replacement, table creation, resume command or score write during preparation. iPhone app login/storage is separate from Safari; signing in with Amber’s existing account restores cloud membership and tournament. Safari-local preferences/games are not automatically imported; Safari data is retained.
- Mac script checks Node24, pinned packages, public-only HTTPS configuration and Xcode26+, then builds ios-test assets and syncs the iOS target. No sudo, licence acceptance, signing-account entry or cloud mutation is automated.

## Acceptance

| Requirement | Verification | State |
|---|---|---|
| Native project and public assets | Official template, SPM dependencies, relative paths and asset identity checked; no secret fields in handoff | Passed for simulator |
| Voice deferred, preferences preserved | Seed enabled preferences, create/return/start manual game without voice prompts/provider calls/settings mutation | Local launch/preferences regression passed; hosted device acceptance pending |
| Existing game unaffected | Configured full gate, unchanged core/room protocol and Android configuration | Passed on clean code0a76c6f |
| Actual iOS build | xcodebuild/simulator, signing, install and launch on Amber’s iPhone | Simulator build/install/launch passed; physical signing/install pending |
| Android↔iOS manual tournament | Same room/seat/history, scoring, Undo cutoff, pause/return; either platform hosts synthetic fixture before owner tournament test | Needs physical devices |

## Mac handoff

Use docs/handovers/SW-045-mac-ios-test.md and the prepared source/assets archive. Windows-generated project and assets are preparation evidence only. Do not describe an IPA or iPhone installation as complete without Mac compilation/signing and device readback. No reset, uninstall or clearing Safari/app storage as a troubleshooting shortcut.

## Executed evidence — 17 October 2026

- Qualified source `0a76c6f3cabf218806a3f06bde6c18fd0056ae5e`; Node24.19.0 gate `artifacts/sw045/source/artifacts/engineering/2026-10-17T21-02-07-368Z-b7a26899/report.json`:1,114passed/13optional camera skips/all configured builds, clean/stable source SHA256 `f50a1ca4dcdaf696a1459163da95e90aa86a5a34ab91515c6d22b4652630db57`. Initial gate detected CRLF/LF generation changes; unchanged generated content normalized and the final clean gate passed.
- Mac Apple Silicon/macOS26.6.2/Xcode27.1, dedicated checksum-verified Node24.19.0. Xcode27 uses DeviceHub, not the historical Simulator.app path. iPhone17 simulator UUID `F8167FCA-C7EB-4E45-B2C8-9FFF13DBFA3E`, iOS27.0. First launch after first-boot migration returned no process; one retry after boot succeeded; final repaired build launched PID8301. Do not infer physical acceptance from this.
- Xcode Debug iphonesimulator build `CODE_SIGNING_ALLOWED=NO` succeeded; installed bundle `com.fluiditygroup.diceclubhouse.dev`;38source/synced/built/installed web assets identical; no service worker. Screenshot exposed status-area overlap; CSS owns safe-area padding with native contentInset never to avoid duplicate adjustment. Final screenshot visually inspected. Evidence in `artifacts/sw045/{xcodebuild-final.log,asset-verification.json,launch-final.png}`.
- Final source archive `artifacts/sw045/sw045-source-0a76c6f.tar`, SHA256 `acc374ce43d3ce9e895163f7fcb2078165902f80862da2770cb990bbcbd83727`; archive does not include ignored public config, private credentials, sessions or game database. Earlier archive+separate validated public config transferred and checksum-verified; final one-file native-config repair overlaid. Mac folder `/Users/ambercavanaugh/Developer/yahtzee-sw045-0102fd2`, local snapshot `9c35bccb1e9bbf9d8d9e83b38a96748d4dd76dba`; folder name identifies starting baseline, not final source.
- No provider calls, cloud reads/writes, device-data reset or production deployment during this task. Existing accounts/tournament/settings untouched by construction; no fresh cloud-state fingerprint is claimed. Native iOS storage is separate from Safari.
- Remaining: owner connects iPhone, chooses signing team in Xcode and handles Trust/Developer Mode; qualify real-device login, safe-area/keyboard/score dialog, same-seat paused return, scoring/Undo/reconnect and both host roles on a dedicated test table. Then integrate approved shared visual direction.
