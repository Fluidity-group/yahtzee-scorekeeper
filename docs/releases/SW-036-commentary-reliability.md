# SW-036 commentary continuity and expired-receipt repair

15 October 2026. State: preparation in progress; not yet qualified/deployed/installed. User authorizes this repair and Pixel update. Codex expert/self-review is development evidence, not physical listening acceptance.

## Intended behavior and source

Undo/correction invalidates historical commentary without demanding a new speaker lease or changing what was actually heard. New scores cannot be lost behind an already-pumped refresh or a failed current playback. A score arriving while Rachel connects starts next-line writing when actual speech begins. Separate coordinator/preparation/native timing identifies the remaining wait.

Integration branch `codex/sw036-commentary-reliability`, isolated checkout `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`. Baseline executable3775a14; exact release commit/source hash pending. No model/voice changes, new dependencies or agent-triggered paid diagnostics. Existing administered allowance remains unchanged. Actual next-audio caching is not part of this repair; [protocol design](../plans/SW-036-audio-preparation-design.md).

## Qualification and deployment

Pending focused regression/real PostgreSQL/full Node24 gate and exact Android build/asset validation. Planned additive migration `202610150001_commentary_historical_invalidation.sql` preserves score/game/account data and client RPC permissions; deployed canonical function readback/privileges and game fingerprints must match. Commentary/game-room bundles are unchanged unless final implementation explicitly records otherwise.

Before installation freshly verify Pixel hardware serial67080DLDV005JQ and wireless transport, retain predecessor APK, install-r, launch and pull/hash-match exact installed package. Do not clear app data. Record final actual identities/evidence and remaining acceptance here after checks.

## Owner retest and rollback

After confirmed installation: new game with commentary Yes, listen to welcome, add a score, then another while Rachel is connecting/speaking; verify the latest eligible quip follows without a stuck screen/backlog. Undo the latest eligible score after speech finishes; scoring/sync should continue. Muting/backgrounding must stop voice without blocking scores. Return from Home/Resume stays quiet. Owner assesses real sound, timing and comedy separately from network or synthetic evidence.

If required reinstall the immediately preceding APK using-r and retain all games/settings. The narrow historical validity-invalidation SQL exception is compatible with the prior client and should normally remain. Restoring the backed-up canonical function would reintroduce the known Undo defect; never delete games or clear app data to roll back.
