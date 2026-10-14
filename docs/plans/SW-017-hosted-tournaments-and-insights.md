# SW-017: hosted tournaments, manual combination metrics and player invitations

13 October 2026. Owner: product owner; coordinating engineer: Codex. State: requirements/design in progress from voice testing feedback. No implementation, deployment or acceptance yet. Follow product-change workflow. Scope hosted/manual Android plus browser; no camera/AI recognition. Independent review unassigned.

## Confirmed user requirements

- REMATCH-1: ordinary hosted Play again and tournament successors keep the group/table, require each player to press ready/Play again and start a fresh game without going out/rejoining.
- STARTER-1: the previous game's winner rolls first in the next game, both ordinary rematches and tournaments. Tie handling remains a proposed product default.
- HISTORY-1: keep every game's category scores plus accepted scoring order/turn/time/corrections, grouped by authenticated account linked to email rather than typed nickname or phone hardware.
- NAME-1: preserve the silly nickname used in each game's record while account-wide history remains joined to permanent Auth UUID; changing later nicknames does not rewrite old records.

- TOUR-1: host creates a tournament with a selected game mode (Standard, Competition, Accumulative), number of games and number of players.
- TOUR-2: tournament contains multiple hosted games and persists between sessions/days. Players can leave/return and resume progress. Distinguish pause/resume from starting a new tournament or deleting records.
- TOUR-3: two separate standings/winners: sum of completed-game scores, and number of games won. Different people may lead/win each.
- TOUR-4: game-end results include game highlights and cumulative tournament standings/insights. Encouragement for strong performance is based on recorded facts.
- MET-1: manually log combinations such as large straight/full house for metrics even after their scoring category is filled. Metric entry does not fill/change a score, advance a turn or award bonus points. Existing manual scoring does not retain complete five-dice roll data; mark these as player-reported metrics rather than captured dice.
- RULE-1: Competition keeps the existing extra roll on the initial final-category turn. A qualifying final-turn Yahtzee grants a fresh attempt of up to THREE rolls (not the current final-category four-roll allowance). Each subsequent Yahtzee grants another three-roll attempt; after an entire attempt without Yahtzee, chain ends. User explicitly clarified that an individual non-Yahtzee roll does not end the chain. Existing Standard rules remain separate. Exact closing-category/bonus eligibility and other players' final turns need final contract below.
- JOIN-1: easier invitations by text/email from the game. New users should be able to establish a persistent player account, join the invited tournament and subsequently host their own tournaments/join other hosts.
- IOS-1: app-style iPhone access through Home Screen web app. Existing manifest display standalone reviewed; offer contextual installation instructions as proposed UX improvement. Physical Home Screen/sign-in acceptance remains open.

## Proposed design (not yet approved implementation)

13 October development started with explicit authorization. Manual rematch/durable table history/shared results slice1 implemented and locally verified; [actual evidence](SW-017-slice1-hosted-rematch.md). Full tournaments, nickname-changing controls, account-wide projections, metric logging, onboarding and Competition v2 remain later work. Proposed designs below are not all implemented.

Full phased sprint, contracts, acceptance matrix and compatibility/rollout design: [SW-017 sprint design](SW-017-sprint-design.md). Three user-authorized expert agents reviewed architecture, UX/analytics and rules. Plan design complete; dependent rule choices and implementation remain open. The full sprint includes the later confirmed rematch, winner-starts-next, persistent category-order history and game-time nickname requirements.

Host form: name, mode, game count, player count. Show invitation lobby and explicit progress (game 2 of 5). Fixed rules snapshot for the tournament avoids mixing incomparable game modes. Separate tournament membership/host authority from individual game turn authority. Store standings derived from authoritative accepted finished games and correction events, not client-submitted totals. Validate revision/idempotency and membership on every new tournament command.

Use a permanent account identity across tournaments; display name is not identity. Invitations reference a tournament, not a stale individual game. Start with QR, copy link and Share invitation opening the user's device share chooser/text/email composer. User chooses recipients and sends; do not silently send messages or require device contact-book access. This avoids a separate delivery service for first prototype. Backend-sent email/SMS is later scope requiring explicit recipient/action authorization and provider/setup/cost decisions.

New-player flow: invitation -> tournament preview -> existing sign-in OR explicit Create account -> email verification -> return to the same pending invitation -> choose display name -> join. Recover pending invitation across signup/verification/sign-in/recovery safely; never lose the destination as happened when people use an earlier game link. Avoid anonymous seats because current hosted contract requires confirmed accounts. Account creation/terms and new credentials remain user actions. Do not imply that clicking a link alone has created an authenticated permanent account. Existing-account invitation opens correct tournament and rejoining preserves original seat/history.

Proposed results: score/points behind each leader, wins, personal best, score trend, win streak, highest-scoring game, biggest margin/closest game, upper-bonus attainment and zero categories. Score milestones use number of scoring turns (fair despite pauses); wall-clock fastest scoring would require active-time tracking and explicit pause semantics. Reported combinations show logged counts/incomplete-data labels, not success percentages based on unobserved rolls. Deterministic encouraging messages can use those facts without AI dependencies.

Manual metrics should attach to reporting account/game/turn and allow undo/correction. Need a deliberate roll/attempt identifier or equivalent confirmation to avoid accidental repeated taps counting the same occurrence twice. Decide whether inclusive combinations (e.g. Yahtzee also kind) are one report with derived matches or independent reported achievements. Do not invent physical roll histories or automatically infer roll count from category scores.

## Open contract decisions before dependent implementation

1. Exact game-count/player-count limits, fixed participant roster versus drop-in attendance, and replacement player handling. Current core supports1–8; user has not yet selected tournament bounds or absence scoring.
2. Tournament pause between games versus pause midgame and who can pause/resume. Automatic persistence supports departure; pause must not silently stop another active player without specified authority.
3. Tied games/wins and tied final standings: shared win credit, fractional wins or tiebreaker. Cancelled/incomplete games and own-score corrections after finalization need explicit aggregation policy.
4. Competition: chain ends that player's final turn, not necessarily the whole multi-player game. Confirm whether their last category is filled before the bonus-only chain or remains open until a failed attempt; whether scratched initial Yahtzee remains ineligible; whether Yahtzee obtained early in an attempt grants immediate fresh attempt; and points awarded per bonus. Existing saves retain previous immutable rule version.
5. "Missed turns" means zero-scoring/scratched categories or actual skipped turns; user has not answered yet. Current game records no legitimate skipped-turn action. Do not label zero as skipped without clarification.
6. Manual extra-attempt controls must count/confirm player-reported roll outcomes without dice recognition, while metrics remain independent from bonus authority.

## Verification and evidence plan

Meaningful coverage for tournament create/join/start/rejoin, distinct account ownership, authoritative game allocation/completion, duplicate finish/retry, concurrent commands, corrections/recomputed standings, independent points/wins leaders, tied games/standings, pause/resume next day, invalid/expired invites, pending invite through signup and account recovery, and restricted metric corrections. Rules regressions must cover initial final-turn allowance, repeated three-roll attempts, no premature chain end, Standard unchanged, and legacy saves retaining their original rules.

Physical acceptance: Android host plus Safari/Home Screen guest, invite sharing with explicit sender action, new-account onboarding, at least two completed games, exit/rejoin next session, separate leaderboards and readable postgame highlights. Run configured engineering gate before preparing an authorized deployment. Record actual evidence; no tests/passes for this new scope claimed yet.

Current relevant code: src/multiplayer/ui.js/client.js/room.js; server/rooms; src/game/core.js/scoring.js; src/prototype.js; Supabase rooms schema. Existing hosted score analytics are not yet aggregated across games. Existing auth/recovery support does not include signup UI.

13 October SW-017 combined tournament/final-chain/pulse candidate deployed with explicit Pixel authorization and matching service/web rollout.575 tests/70 files/all builds/source consistency,23 isolated DB checks and local built phone/tablet manual chain exercise passed. First final-category Yahtzee50 earns repeated3-roll attempts, +100 success renews, only3 failures ends playerchain; newmanualCompetition version2, oldtables remain1. Livelier accepted score/turn/Yahtzee/full-house effects with reducedmotion and quiet reload/corrections. Pixel install-r preservingdata, exact installedAPKhash/launch; liveweb/backendbytes matched;9rooms/10games unchanged. New two-account tournament/chain/next-day physical acceptance open. Manifest: docs/releases/SW-017-2026-10-13-tournaments-final-chain.md.

RULE-1 final-choice resolution13 October: actual first final-categoryYahtzee50 symptom and explicit user reiteration establish category filled BEFORE bonus-only chain and FIRST final50 qualifies. Existing scratched-repeat eligibility and+100 retained. Both prior first/final-category ambiguities resolved for Competition manualv2; see final-chain task for exact implemented versioned contract.

