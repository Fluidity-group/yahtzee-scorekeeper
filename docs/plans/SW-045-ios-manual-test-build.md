# SW-045: first native iOS manual-game test build

17 October 2026. Owner: Keith. Lead: Codex. State: implementation/preparation, not compiled or installed on iOS.
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
| Native project and public assets | Official template, SPM dependencies, relative paths and asset identity checked; no secret fields in handoff | In progress |
| Voice deferred, preferences preserved | Seed enabled preferences, create/return/start manual game without voice prompts/provider calls/settings mutation | Regression pending |
| Existing game unaffected | Configured full gate, unchanged core/room protocol and Android configuration | Pending |
| Actual iOS build | xcodebuild/simulator, signing, install and launch on Amber’s iPhone | Needs Mac |
| Android↔iOS manual tournament | Same room/seat/history, scoring, Undo cutoff, pause/return; either platform hosts synthetic fixture before owner tournament test | Needs physical devices |

## Mac handoff

Use docs/handovers/SW-045-mac-ios-test.md and the prepared source/assets archive. Windows-generated project and assets are preparation evidence only. Do not describe an IPA or iPhone installation as complete without Mac compilation/signing and device readback. No reset, uninstall or clearing Safari/app storage as a troubleshooting shortcut.
