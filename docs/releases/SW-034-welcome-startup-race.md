# SW-034 welcome startup repair — 14 October2026

State: implemented/qualified/installed for Pixel owner retest. Codex development self-review; physical welcome/audio acceptance remains open. User reported the local launch stuck at Meet your commentator after SW033. Preserve all games/profiles/defaults; no agent-triggered paid diagnostic, provider/configuration change, backend deployment or migration.

## Root cause and repair

Read-only live traces show successful local-start responses at01:45:44/01:46:50UTC with no subsequent reaction request; bounded Pixel logs likewise contained no native/commentary opening. The game was created successfully. The local commentary session launches a detached cached-profile refresh during setup. If allowGreeting armed its welcome while that refresh was finishing, it joined a refresh that had already pumped the controller before the greeting existed. Native discovery polling was correctly absent, leaving no next event to start the queued welcome.

A real session/controller DOM regression reproduced the defect: expected playReaction once, received0. The fix waits for setup refresh to settle, checks original session epoch/current foreground host/unmuted native capability, arms the accepted greeting, then explicitly pumps playback. A disappeared table or canceled setup cannot arm late voice. No polling, provider retry or authority bypass added. SW033 preparation/streaming logic is unchanged.

The existing45second welcome deadline now follows the per-game Continue without commentary path and opens scoring, rather than merely changing its waiting text. Rejected/unavailable setup, native failure/interruption also recover; automatic recovery shows a notice. Saved default preferences remain unchanged, callbacks are idempotent, a manually skipped gate cannot start deferred setup, and late completion cannot reopen it. Actual native completion remains the sole success path; fallback does not fabricate hearing. Best-effort voice cleanup/profile disabling failures cannot block scoring or produce unhandled cleanup promises.

## Qualification and delivery

Clean source `3775a14e80b474e7466caf27c573b667ddb8c245`, branch `codex/sw034-welcome-startup-race`, isolated checkout `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`. Source SHA256 `46cc46afe2ced85b53ac8f944dbfb904f78f31247a57f21383e76bd22d92c904`.

Node24 configured gate:1,044tests passed/13optionalcamera skips, all web/native/commentary/room builds and unchanged-source check passed. Report `artifacts/engineering/2026-10-15T01-54-23-830Z-6cf2552f/report.json`. The earlier b10b6f7 gate also passed; final3775a14 adds cleanup rejection handling and supersedes it.87focused welcome/session/controller/prototype/lifecycle tests passed before final configured qualification. Fresh Android JDK21/offline build succeeded,38native asset byte matches and private credential-pattern scan passed. Server/SQL untouched; SW03332realSQL checks are unchanged baseline evidence, not rerun for this client-only repair.

Fresh Pixel hardware serial `67080DLDV005JQ`, transport `192.168.0.229:44167`, verified before data-preserving install-r. APK SHA256 `091669256fa3514060b291b349c2d880976dd83e302d60398783c50db5125194`,7,564,208bytes; launchStatusok and installedAPK pull/hash match verified. App data preserved. Backend commentaryv9/game-roomv9 remain ACTIVE, unsigned401; no backend deployment/migration/public web publication. Root ignored artifacts/sw034 contains numeric request diagnosis, gate/APK/install/device/launch records. No paid provider request was triggered by the investigation/verification.

## Owner test and rollback

Start a new solo/shared-phone game with commentary Yes; welcome should open an actual native reaction request, introduce Rachel and enter scoring on completion. Resume the already-created saved game if preferred; Resume intentionally stays quiet. Test manual skip, failed/disabled voice and deadline recovery separately. Games/settings should remain intact; automatic fallback is per-game and does not turn off saved defaults. Physical post-install sound/startup and prepare-ahead latency remain owner acceptance.

Rollback if necessary: reinstall artifacts/sw033/pixel-installed.apk using-r and choose No commentary to avoid its known local welcome race. Backend/schema unchanged. Never clear app data or delete games for this repair.
