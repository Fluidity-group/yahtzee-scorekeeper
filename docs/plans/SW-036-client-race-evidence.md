# SW-036 client commentary race evidence

15 October 2026. Expert client implementation record; deployed source, full qualification and Pixel acceptance belong to the lead release record. No provider requests or device changes were performed in this expert lane.

## Reproduced failures

Fresh local historical-source reproductions are retained under `C:\Users\Fluid\.codex\worktrees\sw036-playback\Yahtzee Game\artifacts\sw036-client-evidence\`. The ignored `manifest.json` records exact commands, source revisions and exit codes; each case has Vitest JSON plus stdout/stderr. These runs substitute only the historical controller inside the expert worktree and restore the current controller byte-for-byte afterward. The lead release checkout was untouched.

| Report | Historical controller | Actual failing cases |
| --- | --- | --- |
| `original.json` | `3c2320b` | Three: accepted score stranded behind a settling prior heartbeat refresh; bound native rejection strands newest waiting score; score queued during connection misses preparation when speech starts. |
| `followup.json` | `3c797c4` | Two: unbound rejection strands newest target; combined Undo plus valid new score loses the new target. |
| `interlock.json` | `aadb701` | Two: later accepted score reopens speech after failed native stop; synchronous terminal callback outruns the stop promise. |

All three reproduction commands exited 1, as expected. Earlier deferred-stop tests also failed before the barrier repair: replacement output opened before stop completion, including rejection and profile-abandonment cases. These are deterministic synthetic regressions, not proof of the exact user action behind every live unclaimed job.

## Scoped implementation commits

- `3c797c4`: direct accepted-update wake; prepare queued target on actual started callback; precise terminal receipt acknowledgment; generation-fenced receipts; queue/preparation/native-dispatch timing split.
- `5171f63`: unbound failure drains only after native stop; preserve a distinct valid new score in a combined Undo snapshot without bypassing profile, foreground, host or lease boundaries.
- `aadb701`: native output stop barrier before replacement speech.
- `5de5a12`: one callback-safe stop helper across invalidation and failure paths, plus persistent failed-stop interlock.
- `af8b5a4`: clear a previous voice warning only when recovered native speech actually starts; binding alone does not clear it.

The final expert controller suite passed **84 tests under Node 24.19.0**. The preceding seven-suite client/native/session/launcher/wiring run passed 137 tests before the last consolidated-stop and recovery refinements. The lead's final configured gate supersedes these focused checks for release qualification; no earlier pass is asserted as a final whole-release gate.

## Guarded boundaries and remaining limits

No readiness polling, extra playback handshake, paid generation retry or voice/model substitution was added. Current accepted events and explicit welcomes drive the queue. Preparation remains serialized and newest waiting score wins. Exact job, epoch, sequence and terminal status must be acknowledged before automatic next speech. Receipt rejection exposes unavailable state and preserves an untouched waiting target for explicit recovery, without replaying consumed speech.

Native stop is invoked immediately, with its barrier installed before synchronous callbacks are possible. New output waits for actual stop acknowledgment. Failed stop remains interlocked across later scores and refreshes; the supported recovery is **session/controller recreation**, whose native adapter retains its own stop validation. No automatic reset is claimed. Scope, profile, visibility, mute, ownership, epoch and Undo boundaries discard abandoned work. A genuinely fresh new-scope welcome may proceed after old output successfully stops.

These tests establish coordination and failure behavior only. Real Pixel response time, physical audibility, network variability and listening quality require exact-build owner testing. The SQL lease-receipt repair is a separate expert lane and is not established by these client tests.

The client direct `request` stage marks invocation of the native-player adapter after preparation settles. The adapter still performs stop/listener/token checks before its actual native HTTP request. Android's native elapsed values and server-local timings identify those later boundaries; do not equate the coordinator marker with packets reaching the server or subtract unsynchronized device/server wall clocks.
