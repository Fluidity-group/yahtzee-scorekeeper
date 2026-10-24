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

## Immediate owner retest after SW034

Read-only server metadata confirms a new local welcome accepted01:55:54.518UTC, first forwarded audio01:56:00.273, actual host receipt statuscompleted01:56:15.051. Thus the prior no-request startup stall is no longer present in this sample. Initial score client-reported native-position proxy8,419ms submission→playback/native startup6,756ms. Next prepared score7,717ms total/native startup2,349ms; prepare request3,804.55ms, prepared audio responseheaders700.91ms, first forwarded bytes1,622.69ms with2snapshots/2batches and no writer on its audio request. These are distinct spans, not a controlled percentage improvement or physical sound acceptance.

Another preparation completed4,425.42ms at01:56:55, but that job remainsready with no claim; a later local-command request returned503 in599.41ms at01:57:21. This is an unresolved mirror/speech continuity issue, not proof scoring data was lost (offline score remains authoritative locally). No new fix/deployment or paid diagnostic was triggered. Current Pixel process had no retained matching native logs even without the tail bound, so timing evidence comes from stored client-reported receipts and server traces, not a fresh physical hearing assertion. Root ignored artifacts/sw034/current-metadata.json and first-retest-requests.json retain safe numeric evidence. User additionally requested expert web/GitHub research; SW035 report is a separate researched proposal, not a shipped fix.

### New503 narrowed to historical receipt validation

A second bounded read of PostgreSQL logs at01:57:19–24UTC returned the exact exception at01:57:21.891: Speech receipt requires current fenced lease at commit. Source inspection: canonical commit in migration005 checks every changed started/completed exposure against the current unexpired playback lease (except expiry-only edits). cancel(invalid-event) sets an existing receipt valid=false; commitLocal invokes this for Undo/correction targets and dependent jobs. Therefore historical invalidation after the lease expired is a strong source-backed explanation for the local-command503, pending a disposable PostgreSQL reproduction. Read-only diagnosis is not a verified fix. Any repair must distinguish validity-only invalidation from new/advanced listening evidence; do not revive expired leases, broaden heardBy, change identity/sequence/timestamps or remove fences for actual playback receipts. Safe artifact: artifacts/sw034/score-sync-db-window.json. No provider or mutation request used.
