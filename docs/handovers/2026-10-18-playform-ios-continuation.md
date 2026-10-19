# Playform continuation handover

**18 October owner update: iOS installation is on hold. Do not continue Mac/phone installation until the owner resumes it. Phone notifications remain deferred. SW048 tournament celebrations/rule correction is the current software task.**

Prepared for the next chat on 18 October 2026. Deployment and device observations below were collected on 17 October; inspect targets freshly before further action. This document does not establish current live device state.

## Immediate objective and authorization

The owner wants the **Playform iOS app installed on Amber's physical iPhone**, alongside the updated Pixel and web versions, to test their existing two-player tournament. Installation is authorized. Preserve the tournament, both memberships, accounts, profiles, scores and settings. Do not create a replacement tournament or reset app/browser storage.

Last reply asked the owner to connect the unlocked iPhone to the Mac by USB, tap Trust, sign into Xcode → Settings → Accounts, and enable Developer Mode if requested. No confirmation of completing those steps has arrived. The next chat should check the Mac, then continue the build/install if ready; do not repeat setup questions already answered by inspection.

Phone notifications are explicitly deferred until the Apple account is sorted. Keep VITE_PUSH_ENABLED=false; do not start the delivery worker or send test notifications. AI voice is deferred in the native manual-test build. No commercial-release work or Apple enrollment purchase is authorized.

## Source of truth and working checkout

- Windows project root: `C:/Codex/Yahtzee Game`. Its dirty/untracked development tree predates this work. Preserve it; do not reset, clean or stage it wholesale.
- Actual implementation checkout: `C:/Codex/Yahtzee Game/artifacts/sw045/source`.
- Branch: `codex/sw046-tournament-invites`; latest recorded documentation commit `efd445d`.
- Runtime commit: `b9ed275dc0efe4b657a97c9d1c8c974c0a02f29d`.
- Qualified clean source: `01e7a5537795ba2dce5c89f84de6e0a1a2b53fd8`. Only the generated Kotlin-cache ignore differs from runtime commit; later changes were documentation only.
- Node 24.19.0 engineering gate passed: **1,122 tests**, 13 optional camera skips, all configured web/native/iOS-web/room/commentary builds. **22 disposable PostgreSQL checks** passed. Do not repeat the full gate unless executable source/configuration changes justify it.
- Read AGENTS.md, docs/status.md and the release record first. Use release-qualification and manual-multiplayer skills. No new subagents are needed for ordinary installation.

## What is deployed

**Pixel 11 Pro XL:** serial `67080DLDV005JQ`; package `com.fluiditygroup.diceclubhouse.dev`. Playform APK installed with `adb install -r`, installed APK read back and hash matched, launch returned Status: ok. App-private storage was byte-identical immediately before/after installation, before launch. No data clear. Screenshot was black/display unavailable, so owner visual/touch acceptance is still open.

APK: `artifacts/sw046/playform-invites-debug.apk`, SHA256 `c24fe8b1f5754394f59c5f1f24520a8a9f4137718939d283576739c1aa7454ac`; 49 packaged web assets matched. This is the voice-deferred manual-test configuration, not a claim that Rachel is operational in this build. Stored commentary preferences remain intact.

**Web:** https://fluiditygroup-git.github.io/yahtzee-scorekeeper/ ; published Pages commit `4c0162cffef8b420919c7cc21735d2987bd2dd47`. All **51 public files byte-matched** after propagation. A previously cached client activated Playform on reload and retained its synthetic Review A/B local game through close/reopen. Browser data was not cleared. Web retains existing voice controls; phone push is off. Amber may need to close/reopen or refresh her saved web app.

**Backend:** Supabase project `ezgawsdmvuoqrxlfbgen`. Existing game-room and live-commentary edge functions remain ACTIVE v10. Only additive `supabase/migrations/202610170001_tournament_social.sql` was applied transactionally. Social RPC exists; authenticated execute allowed, anon denied; all four social tables have RLS. No invitation/device records or notification delivery was created by rollout. No score/rules endpoint change.

## Protected tournament and preservation evidence

At the 17 October rollout: 3 rooms, 11 archived games, 4 accounts. Full room/game/profile-settings fingerprints and account counts matched before/after deployment.

- Tournament room: `6778d2b7-eac5-4efa-bf2b-082af5083ae9`, code `L63GERUB`.
- Last observed: game 9 of 12 finished, tournament paused, room revision 265; Competition rules version 2.
- Keith UUID `ddb43fb1-47fc-4a22-a3ed-2c7227beeb92`.
- Amber UUID `bcb1c71a-2ba3-4b9c-8df2-4068347832f9`; frozen table alias **Mamdami**.
- Both UUID memberships remain intact. Returning must open the existing seat/table without reacceptance or automatically resuming the paused tournament.

These are historical observations, not a guarantee of today's progress. Inspect read-only; do not overwrite newer owner play. Email is a sign-in label; UUID owns membership. Native iOS storage is separate from Safari: sign into Amber's exact existing account and return to this table. Do not claim Safari's local theme/preferences migrate automatically.

## Mac connection and iOS state

SSH host `ambercavanaugh@192.168.0.166`; verified host fingerprint `SHA256:SeQIwdCz4YVZWv6o6TjUICRrrkuhNC7TqK8vx4a18Yg`.

Project-scoped access files, ignored and private:

- `C:/Codex/Yahtzee Game/artifacts/sw045/ssh/mac-build`
- `C:/Codex/Yahtzee Game/artifacts/sw045/ssh/known_hosts`

Use SSH with `-i`, `IdentitiesOnly=yes`, `BatchMode=yes`, `StrictHostKeyChecking=yes` and that known-hosts file. Network SSH requires the approved elevated tool context on Windows. Never disable host checking or print/copy private keys. Native desktop UI control is unavailable; use SSH/Xcode CLI for build work, and owner interaction for Apple sign-in/2FA/trust/agreements.

Mac source: **`/Users/ambercavanaugh/Developer/yahtzee-sw046-b9ed275`**. Open `ios/App/App.xcodeproj` inside it. Do not use the older SW045 folder for Playform. Mac source snapshot `9831da3e8e927ae31103249b268204452b3302f0`; public-only `.env.ios-test.local` is already present. No server/provider keys or Windows sessions were transferred.

Last inspected Mac: Apple Silicon, macOS 26.6.2, Xcode 27.1 build 27A9275. Portable Node:
`/Users/ambercavanaugh/Developer/yahtzee-tools/node-v24.19.0-darwin-arm64/bin` (prepend to PATH per build shell).

Playform unsigned iOS simulator build succeeded and was installed/launched, with **47 source/synced/compiled/installed assets matched**. Simulator UUID `F8167FCA-C7EB-4E45-B2C8-9FFF13DBFA3E`, iPhone 17 / iOS 27.0. Xcode 27 uses Device Hub. Physical phone installation has NOT happened.

Last physical-device check: `xcrun devicectl list devices` listed simulated devices only; `security find-identity -v -p codesigning` returned **0 valid identities**. This does not prove whether the Apple account has a paid team. Owner answered “Not sure.” A basic app install and future APNs setup are separate gates; do not make phone notifications a prerequisite for testing manual scoring.

## Next execution steps

1. Recheck SSH connectivity, `xcrun devicectl list devices`, code-signing identities and the project signing settings. Distinguish physical device from simulator explicitly.
2. If missing, ask only for the concrete remaining owner action: connect/unlock/Trust, Xcode account, Developer Mode or signing-key access prompt. Owner enters credentials and handles 2FA/agreements. Do not request passwords in chat.
3. Select the valid team with automatic development signing, keep bundle ID `com.fluiditygroup.diceclubhouse.dev`. Do not silently change it if registration conflicts. Push entitlement is intentionally absent while notifications are deferred.
4. Build App for the exact physical destination. The prior unsigned simulator build is not an installable physical build. Keep logs and exact source/team/device/OS/build identity; do not leak credentials. Use `xcrun devicectl` help for installed Xcode syntax before install/launch.
5. Install/update without uninstalling or clearing any existing app. Confirm installed identity and successful launch. If signing fails, retain the concrete diagnostic and source; do not reset the phone or cloud.
6. Owner signs into Amber's existing account, returns to the current tournament and checks the same seat/progress/pause state before scoring. Leave Safari intact as fallback. Test portrait/notch/keyboard, centered score entry, zero versus open, latest-own-turn Undo, reconnect and two-player sync. Undo expires when the next player records a completed scoring turn.
7. Update status/release records with implemented, built, installed and owner-accepted states separately. No new production deployment is required merely to install the matching iOS client.

## Product decisions and implemented scope

Playform is now the primary shared design, superseding the earlier Rally/Night Match mix. Professional, lively, geometric UI; no casino style or AI avatars. Implemented: warm paper/ink with violet/orange, animated home shapes, tactile scoring, centered dialogs, bounded score/bonus animation, compact opponent rail, saved light/dark appearance. Bigger future tournament narrative/race choreography remains future work, not a completed claim.

Tournament social implementation supports explicit verified-email invitations, acceptance before a fixed roster starts, persistent UUID membership, member play requests and explicit readiness in both directions. Opening a tournament alone sends nothing. Invitations are in-app, not automatic outbound email. Push adapters/server queue exist, but real APNs/FCM, supervised delivery worker and physical push acceptance are not configured. Continue those only when requested/account ready; see SW-046-phone-notifications.md.

## Evidence, rollback and routing

- `docs/releases/SW-046-047-playform-and-tournament-invites.md` — qualification and authorized rollout.
- `docs/plans/SW-046-account-invitations-and-play-requests.md` and `SW-047-playform-shared-interface.md` — implementation scope.
- `docs/handovers/SW-046-phone-notifications.md` — deferred provider/team setup.
- `artifacts/sw046/candidate-manifest.json` and `artifacts/sw046/rollout/manifest.json` — exact identities.
- `artifacts/sw046/rollout/before.json`, `after.json`, `migration.json`, `web-verification.json`, `pixel-install.json` — preservation/deployment evidence.
- `artifacts/sw046/rollout/web-playform.png`, `artifacts/sw046/playform-launch.png` — actual web and iOS simulator visuals.
- `artifacts/sw046/rollout/pixel-before.apk`, `web-before.zip` — rollback; retain app/browser storage. Prior web revision `ad1cc17584124c615ce87a54ba58d6c2d333d1a1`. Leave additive schema in place during client rollback.
- Private app-data rollback tar and SSH keys are ignored sensitive artifacts. Never Git-stage, upload or print them.

Paste into next chat: **Read docs/handovers/2026-10-18-playform-ios-continuation.md and continue installing the Playform iOS build on Amber's physical iPhone. Preserve our tournament, memberships and settings; notifications stay deferred. Inspect the Mac/device/signing freshly and act within the existing installation authorization.**
