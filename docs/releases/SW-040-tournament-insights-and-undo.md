# SW-039 / SW-040 combined review candidate

16 October 2026. Isolated branch `codex/sw039-tournament-usability`, checkout `C:/Codex/Yahtzee Game/artifacts/sw039/source`. SW-039 layout checkpoint56fc5e3 is retained; SW-040 extends it with owner-authorized real-data analytics, explicit scratches and universal latest-turn Undo. New premium clubhouse prototype direction remains on hold. Existing root changes and live records preserved.

## Behavior and contracts

SW-039 puts next-game readiness ahead of statistics, replaces the tall tournament action panel with compact context and a drawer, adds saved device text presets and upper/lower scorecard sections with factual per-player bonus progress. See its release record for layout measurements and browser cases.

SW-040 adds Game insights in the main menu, Tournament insights in the tournament drawer and insights access on results. Completed-game animated bars and cumulative traces lead to selected-game score replay, exact tables, upper/lower and category comparisons. Reduced-motion CSS disables motion. Accepted entries include corrections and Undo; incomplete chronology suppresses replay instead of inventing events. Latest revision deduplication excludes reopened unfinished games, and stable account IDs determine identity. Current unfinished totals remain excluded. Existing dice-level roll analytics are still available separately. History responses now attach archive sequence numbers; no database migration is needed.

Scratches show a filled warm surface, large0 and explicit SCRATCH label, distinct from the dashed open+ or opponent open dash. Accessible descriptions state scratched, zero points.

Undo applies to Standard, Competition and Accumulative in local/hosted play and supported manual/simulated/connected input paths. Only the latest own completed turn is eligible, until another completed scoring/bonus turn supersedes it. No cascading history rewind. Following unscored observations are retained, cancelled and excluded from roll analytics; confirmation explains this and fresh source capture is required. Bonuses reverse without deleting the original scored Yahtzee, final-chain attempts restore correctly, and completion/readiness is reopened safely. Seat, game identity, exact revision, atomic persistence and idempotent receipts remain enforced. Existing generic score-undo audit is retained for commentary invalidation. Backend capability guards prevent new clients assuming old deployed servers support this expansion.

## Evidence

Read-only seven-game snapshot, totals and all replay endpoints reconciled; [analysis](../reviews/2026-10-16-seven-game-tournament-analysis.md). Private raw IDs/events are not committed. Synthetic regression coverage exercises corrections, tied wins, stable identity, missing chronology, reopened snapshots, scratches, bonus/final-chain reversals, all modes/input paths and HTTP ownership/race/idempotency. Full Node24 configured gate and candidate artifact identities are recorded in root ignored `artifacts/sw039/sw040-manifest.json`; its result governs qualification, rather than this record anticipating a pass.

Source-backed browser review uses localhost8493: actual app, synthetic tournament fixture and read-only real-data insights fixture under ignored artifacts/review. Phone320/390px analytics have no page-wide overflow or card clipping; game selection and exact history were checked. SW039 also covered360/430px, all three text presets, centered entry, eight-player rail and landscape. Browser emulation does not establish actual Safari, native Back or physical audio acceptance.

## Release gates

This is a prepared candidate, not an installed or published update. SW040 changes shared rule projections in both generated room and commentary bundles; deploy both from qualified source together with web/Android after task-specific owner authorization. No schema migration, paid provider generation or changes to live games/accounts/settings are included. The old SW039-only APK is superseded for this expanded review.

Before authorized deployment: freshly inspect Pixel and hosted identities, capture rollback bundles, verify generated function source and authentication, web bytes and cached Safari activation, installed APK hash and asset equality. Preserve data through install-r; never clear app/browser storage. Verify two-phone last-turn Undo races, reopened final game/readiness, final-chain continuation, drawers/native Back/text scaling and audible commentary invalidation. Actual owner playtest, physical device compatibility and independent release approval remain open.

Rollback restores prior app/web/function bundles together while retaining append-only audit and current records. An older build cannot Undo newly supported modes; no destructive data rollback is proposed.
