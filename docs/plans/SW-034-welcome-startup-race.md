# SW-034: Welcome startup does not strand the game

14 October2026 / Codex lead. State: investigation/repair. User reports Pixel stuck at Meet your commentator after SW033. Scope client welcome/session sequencing, bounded recovery and qualified Pixel replacement; preserve scores/profiles/defaults and prepare-ahead behavior. Baseline f3cbb59/commentaryv9/APKd193af38.

## Observation and cause under test

Fresh Pixel connected, hardware transport192.168.0.229:44167. Bounded app logs contain no commentary/native requests. Live traces at01:45:44/01:46:50UTC show successful local-start, no subsequent reaction request. Local session immediately starts a cached-profile refresh during creation; explicit allowGreeting can join that refresh after it already pumped the controller. Its newly armed desired greeting then has no discovery poll to wake it. Reproduce with real session/controller and immediate native greeting.

## Requirements and verification

Explicit greeting waits for setup refresh, then arms the current verified game/profile and explicitly pumps playback; no polling or historical replay. Cancellation/scope/profile changes cannot start late audio. Welcome succeeds only on actual native completion. Failed/unavailable startup or a bounded deadline must offer/reach scoring; late callbacks cannot revive the closed welcome. Keep actual no-provider/no-hearing distinctions, saved consent defaults and data.

Regression first, focused welcome/session/cancellation tests, clean Node24 full configured gate, Android build/asset/key-pattern checks and fresh hardware/install/readback verification. Backend/SQL/provider settings unchanged unless evidence justifies changes. No agent-triggered paid diagnostics planned. Root dirty work preserved; isolated codex/sw034-welcome-startup-race.

## Evidence and completion

Pending reproduction, fix, qualification and install.

## Reproduction and repair evidence

Regression on SW033 actual session/controller: starts an explicitly requested welcome when cached setup refresh is still settling failed expected playReaction once, received0. Fixed ordering awaits/coalesces the setup refresh, verifies original session epoch and foreground/unmuted host capability, arms the accepted greeting, then explicitly pumps the controller. No discovery poll or provider retry added.87focused session/welcome/controller/prototype/hosted lifecycle tests passed. Watchdog keeps the existing45second bound but now actually opens scoring through the same per-game no-commentary path; failures/rejected setup recover immediately, skip/cancel is idempotent, late callbacks cannot restart voice, saved defaults unchanged. User sees a notice on automatic recovery. Backend/SQL/keys/quality/usage limits unchanged; qualification/install pending.

## Delivered result

Failing startup race reproduced (welcome accepted, native playReaction0calls), fixed and qualified. Clean3775a14e80b474e7466caf27c573b667ddb8c245;1,044tests/13optionalcamera skips/all builds/source consistency, Android compile/38asset matches/private-key-pattern check. Exact PixelAPK091669256fa3514060b291b349c2d880976dd83e302d60398783c50db5125194 installed-r/launch/readback verified after fresh hardware identity. Backend remainscommentaryv9/roomv9; no SQL/provider changes or agent-triggered paid generation. [Release and rollback](../releases/SW-034-welcome-startup-race.md). Physical new-game welcome acceptance remains owner retest; no downloaded/generated line was recorded as heard.
