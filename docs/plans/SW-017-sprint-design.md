# SW-017 sprint design: hosted tables, tournaments and player history

Date: 13 October 2026. Product owner: user. Coordinator/implementation owner: Codex. Design reviews: tournament_architecture, tournament_experience and competition_rules expert agents (Codex development reviews, not independent security/product acceptance). State: sprint design complete; implementation, verification, deployment and physical acceptance not started for this feature scope. Project: software; G1 remains in progress until material rule choices are settled. Requirements source: SW-017-hosted-tournaments-and-insights.md and subsequent voice feedback.

## Outcome and delivery approach

Development update13 October: user authorized starting development and expert UI research/implementation for web and Android. Slice1 manual rematch/history/shared results is implemented and locally qualified (500 tests,8 real isolated DB checks, local APK), not deployed or physically accepted. [Actual results](SW-017-slice1-hosted-rematch.md), [UI research](SW-017-ui-excitement.md). Remaining slices/Competition choices remain open; original design-only state at document creation above is historical.

Keep the working manual scorekeeper and improve it through independently reviewable slices. A hosted table persists across games. A tournament schedules several games at that table. Every accepted game remains in account history; scores, scoring order, nickname snapshots and corrections survive rematches and later sessions.

Deliver hosted Play again first, then tournament lifecycle, account history/results and optional combination metrics. Isolate Competition rule changes behind a new rules version. Invitations/onboarding and iPhone guidance follow the stable session contract. This is one feature-sprint design with six ordered implementation slices and stop/review checkpoints; no calendar completion date is claimed. If a slice consumes the delivery window, ship/accept only the qualified slice and carry forward the remaining backlog. Do not compress migration/recovery/physical tests to meet a guessed deadline.

Scope: manual Android host, browser/Safari/Home Screen guests, persistent confirmed accounts. Preserve existing local/legacy paths, saved games and account/seat authority. Exclude camera, AI dice recognition, BLE changes, AI-generated commentary, unsolicited emails/texts, paid messaging providers, spectators, replacement players and commercial release work.

## Confirmed requirements

| ID | Required behavior | Acceptance observation |
|---|---|---|
| R01 | Hosted Play again stays at the existing table | Both players explicitly ready -> exactly one fresh game; no new QR, rejoin or login |
| R02 | Previous game winner starts the next game | Host or guest winner becomes initial active account on rematch/tournament successor; host status does not control first roll |
| R03 | Host chooses tournament mode, game count and player count | Lobby displays exact chosen settings and required roster; values freeze at tournament start |
| R04 | Leave and resume across days | Same account finds tournament/current game/seat/standings after reload, app restart and next-day return |
| R05 | Separate points and games-won champions | Test fixture produces different leaders; UI independently awards each, including shared leaders |
| R06 | Preserve every accepted game, category score and order | Prior games/history remain readable after successors; category placement, turn, time and correction audit available |
| R07 | Statistics follow signed-in account | Nickname/email change cannot split history; different accounts cannot merge because nicknames match |
| R08 | Store game-time silly names | Changing nickname for next game leaves prior scorecard/results/history names unchanged |
| R09 | Metrics-only combination entry | Log large straight/full house/etc even if filled; points, category occupancy, next player and bonus authority remain unchanged |
| R10 | Postgame game/tournament insights and encouragement | Results show standings and fact-based highlights with explicit scope/data provenance |
| R11 | Competition final-chain attempts of three rolls | Initial final-category allowance remains four; each earned extra attempt allows three, renewed by Yahtzee; failed individual roll never ends chain |
| R12 | Text/email/QR invitations with reusable player accounts | Share composer/link leads new account through verification back to correct tournament; account can later host/join elsewhere |
| R13 | iPhone app-style access | Home Screen guidance, correct manifest/icon/safe-area behavior and actual Safari/Home Screen resume check |

The user means the account/email identity, not the handset hardware or typed player name. Supabase Auth's permanent user UUID is the ownership key; verified email is the account's login/contact association, not a mutable database primary key. Emails stay private by default. There is no new hardware-device identity or phone-number requirement.

## Product defaults proposed for review

These are design recommendations, not additional confirmed user instructions:

- Prototype tournament bounds: 2–8 players, 2–20 games; suggested defaults 2 players/3 games. Separate ordinary/solo hosting remains available. Validate limits on server as well as form.
- Fixed tournament roster, every member plays every scheduled game. Leaving screen does not remove membership. Absent player means wait/resume, never an automatic zero or skipped turn.
- All players explicitly ready for the next game; host cannot consent for someone else. Ready status persists across app exit. Withdraw before successor commits; once committed, use the shared pause/resume path.
- First game starts with host as existing behavior. After an outright win, winner starts next. A tied game's tied winners share one win each; next starter rotates to the next tied account in fixed seat order after the prior starter. Tied final points/wins produce co-champions. Tie policy needs product confirmation; do not invent a random result silently.
- Keep fixed seat/account ordering; set initial active seat to the winning account rather than renaming players or resetting their ownership. A later correction changes standings, not the already-started game's starter. Correction before next-game commitment invalidates readiness and recalculates eligible starter.
- Host may explicitly pause/resume a tournament midgame; all devices see the shared state and scoring is blocked while paused. Between games, no next game starts until all consent; no host/device presence timeout removes people. Any player can simply exit safely. App backgrounding alone is not a global pause.
- Preserve current own-score correction capability, including finished games, with an audit. Recompute affected standings/highlights; no duplicate wins or reopened historical turn order. Show a revised-results notice if correction changes an awarded tournament.
- Nicknames may be changed for the next game before marking ready. Freeze each nickname in the new game's player snapshot; preserve current distinct-name/24-character validation initially. No retroactive nickname rewrite.
- Optional metrics log exactly selected reported combinations. No silent inclusive extra achievements. One report groups selected combinations from one physical roll; separately confirm another occurrence to count a new roll. Undo/correction remains audited.
- Use "zero-scoring categories" or "scratches" until user clarifies "missed turns". No skipped-turn feature is implied.

## Player journeys

### Ordinary hosted rematch

Finish -> winner/tie + final scorecard + up to three highlights -> optional next-game nickname -> Play again -> show Ready/Waiting for each player. The final readiness command commits one successor at the same table. New game has empty categories, unique identity, same mode/rules/source/host/accounts and previous winner as starting account. History keeps the old game. A network failure/retry resumes the accepted result rather than creating another game.

### Tournament

Host tournament -> name/mode/game count/player count/hidden totals -> stable tournament invitation -> exact roster lobby -> host starts game1. Always show "Competition · Game 2 of 5 · 2 players". End each game with game winner, both tournament leaderboards and highlights. Ready for next game uses the same successor mechanism as ordinary rematch. Take a break preserves the table/results/current game. Your tournaments restores membership and current state without rescanning. After game N, show final points and wins champions; there is no accidental game N+1. Explicit "New tournament with this group" can be a later continuation action, not an implicit reset of old results.

### Invitation/account onboarding

Share tournament -> device share chooser/text/email composer; sender chooses recipient and sends. QR/copy remain alternatives. Invite belongs to stable table/tournament, not a previously completed game. Preview exposes only approved host nickname, tournament name/mode/counts/status; no scores, email addresses or account IDs to outsiders.

Existing account -> sign in -> join/resume exact invitation. New player -> explicitly Create account -> user enters credentials and accepts applicable terms -> email verification -> return to pending invitation -> choose nickname -> confirm join. Store only a validated invitation destination in scoped durable browser state, never tokens/passwords or an arbitrary redirect. Account recovery retains that destination. Expired/full/started/nonmember invitation produces an actionable state; it must not silently create a local game. New accounts can subsequently host their own tournaments. Custom SMTP/provider deliverability is an actual onboarding dependency, not solved by a form alone.

### Game-time reporting

Log combination remains available after its score category is filled. It is attached to reporting account, game and current turn/attempt and clearly labelled optional/player-reported. Show count and immediate Undo. Regular category scoring remains the primary flow; logging never claims a Yahtzee bonus, consumes a roll or changes turn authority. New roll/occurrence is a deliberate action. Manual final-chain controls use separate authoritative commands, so metrics never grant rule benefits.

## Data/authority design

| Boundary | Proposed responsibility |
|---|---|
| Existing clubhouse_rooms | Persistent hosted table/join identity plus current-game pointer/snapshot; compatible legacy reads |
| New clubhouse_games | Separately addressable game snapshots/history, room/tournament ID, sequence, rules, roster account IDs + nickname snapshots, accepted events and revision |
| New clubhouse_tournaments | Stable invite, host/membership, fixed mode/rules/game/player targets, lifecycle/revision, current game pointer |
| New durable receipts | Actor/operation/game-or-tournament command identity, payload fingerprint, committed result; prevents long-history retry duplicates |
| Pure session/tournament modules | Ready/withdraw/pause/advance/end invariants and independent standings; no transport/auth credentials |
| Pure core | Versioned game rules/scoring/attempt states; no tournament scheduling or membership management |
| Server + transactional DB commit | Authenticated membership/seat/host/revision/rules checks, unique game allocation, archive-and-advance atomic commit |

Use new game IDs for all successors; do not reuse room UUID as every game's identity. Unique (roomId, gameSequence) and (tournamentId, gameSequence) constraints prevent duplicate allocation. Do not put unbounded historical games into one ever-growing room JSON. Index membership and bounded history pagination; retain each accepted game's actual data rather than only aggregate totals.

For multi-record archive/advance, a transaction/RPC commits finished history, successor, readiness clearing and room/tournament pointer updates together. Existing single-row compare-and-swap is insufficient for independently writing several tables. Crashes must leave either complete old state or complete new state. RLS allows members to read their own tables/games/tournaments; clients cannot write snapshots/standings directly. Database commit functions restricted to trusted runtime must also validate expected revisions/identities and be unavailable as unrestricted authenticated writes.

Command envelope adds protocol version, gameId/tournamentId, expected revision and command ID. Ready commands bind to finished game/revision and the authenticated actor. Scoring/report commands require exact game/turn/attempt/account. Reusing command ID with another payload is rejected. Realtime updates are hints; reconnect/foreground and bounded polling fetch authoritative state. New room/game/rules capabilities must be checked before controls enable. Older clients cannot submit stale-game commands into a successor merely because a counter matches.

Proposed lifecycles: table lobby -> active game -> results/ready -> next active game; tournament lobby -> playing/paused -> between-games -> completed. Leaving a UI is not a lifecycle transition. Errors preserve accepted progress. Final game count is server-enforced and mode/rules cannot be edited midway.

## Complete account history and chronology contract

Retain game identity, mode/full rules version, source, participating account IDs, exact game-time nicknames, start/finish status/time, per-category values, bonuses and accepted event stream. Every accepted event has stable ID, command receipt/actor, monotonic authoritative sequence, server timestamp, game/turn/attempt IDs and type/data. Scores retain category, value, source and per-player scoring-position information; bonus events are separate. Corrections/exclusions reference original records and append facts rather than replace history. Preserve originals and the corrected projection.

Account history uses UUID ownership across every hosted game, not only tournament games. A game remains independently addressable after room progression. Email changes and nicknames do not split identity; logging in from another phone does not create another player. Existing hosted UUIDs/events can be retained/backfilled from actual records; old local/legacy name-only games remain local/unattributed unless a separately authorized import exists. Never infer ownership from matching names or invent unavailable timestamps/rolls.

Use event sequence to disambiguate order; device clock and network arrival are not scoring order. Per-player placement is category1–13; globally first compares accepted event order. Keep bonus attempts out of base-category placement counts. Changing a value does not reorder the category's original placement. For chronology awards, replay original events and apply corrections at their actual sequence: do not backdate a later correction into "first achieved". For current final-score/category-average statistics, use corrected scorecards. Label the chosen projection in detail/export and test correction examples.

Reliable insights: completed-game totals, upper bonuses, Yahtzee bonus points, zero categories, positive category scoring order, first positive large straight, usual Yahtzee placement, average/best score, points/wins leads, streaks, closest/widest margin and score trend. "Quickest to 100 points" means fewest scoring turns and must have a defined event replay, not elapsed days. "Scored a combination" and "reported rolling a combination" are distinct datasets. Optional logs cannot establish total rolls, failed combinations, success percentage or recognition accuracy. Scope lifetime personal bests to comparable mode/rules; never mix Accumulative scores with Standard rankings without a labelled separate view.

Derived summaries are recomputable/cacheable with analytics version; source events are authoritative. Keep data/export schemas documented and tests proving durable history beyond the current room's100-receipt window. No automatic game/event TTL or overwrite introduced in this sprint. Account deletion/export/retention obligations remain an explicitly designed future lifecycle, not an accidental cascade.

## Competition v2: isolated rule slice

Current Competition v1 allows FOUR rolls every time the final base category remains open. Tests intentionally preserve that. User's new rule cannot be achieved by simply changing finalRolls or detecting filled categories. Store explicit final/bonus-attempt phases and frozen allowance.

Confirmed: initial final-category turn retains four rolls; earned successive attempts allow up to three; Yahtzee in an attempt renews it; only an entire attempt without Yahtzee ends that chain. No camera inputs required. Proposed preserved defaults: +100 for qualifying repeat, scored nonzero initial Yahtzee required, immediate renewed attempt when Yahtzee is confirmed. A player's chain ending never truncates another player's unfinished game.

Two material choices must be answered before this slice's dependent implementation:

1. Does the player score the last category BEFORE extra attempts (bonus-only phase afterwards), or AFTER the chain ends? Recommended continuity default: keep last category open until failed attempt, then enter its normal score; this preserves current one-final-category obligation.
2. If the player's FIRST Yahtzee occurs when Yahtzee is their final unfilled category, does that first Yahtzee also earn extra attempts? Current repeat eligibility says no; user wording could mean yes. A yes requires scoring normal50 then a bonus-only phase, and a clarified relationship to choice1. Do not implement one interpretation silently.

Manual v2 controls report roll/attempt progress, confirm qualifying Yahtzee bonuses separately and resolve the final category/chain on failure. Invalid/stale/other-seat commands rejected. Existing saved Competition v1 behavior stays unchanged. Tournament's full rules snapshot—not merely mode name—must be supplied through a validated creation path for every later game, so deployment cannot change rules halfway through a tournament.

## Ordered sprint backlog and gates

| Slice / owner | Concrete deliverable | Dependencies | Exit criteria / evidence |
|---|---|---|---|
| 0 · Codex/product owner | Final rule/tie/roster/correction defaults, source baseline, capability/event/DB contract, migrations + rollback plan | Expert design reviews | Explicit decisions/examples recorded; existing source/saves preserved; no fabricated baseline qualification |
| 1 · multiplayer/data | Durable game archive + hosted-specific Play again, own readiness/withdrawal, previous winner starts | Data transaction and game identity | Two users complete two games at same table; concurrent/retry final readiness creates one successor; no old-game command accepted; prior snapshot/nickname/order survives |
| 2 · multiplayer/UI | Tournament create/join/dashboard/pause/resume, immutable targets/rules, next-game readiness | Slice1 successor contract | Selected roster/counts enforced; no N+1; next-day exact resume; outsider/stale commands denied; pause race tested |
| 3 · analytics/UI | Account history/event-order projections, nickname snapshots, points/wins standings, postgame highlights + export | Slices1–2 identity/history | Distinct champions fixture; nicknames/email changes preserve identity; ties/corrections reconcile; historical order auditable; hidden totals do not leak through encouragement |
| 4 · metrics/core | Optional manual reported combinations and isolated Competition v2 attempts | Stable event/game contract; two rule decisions for v2 only | Already-filled combo logs leave scores/turn unchanged; duplicate retry/undo ownership; initial4/extra3 limits; v1/Standard/Accumulative compatibility |
| 5 · accounts/experience | Device share invitations, explicit signup/verification/pending-invite return, iPhone installation guide | Tournament invite/capability contract; proven email delivery | New account verification reaches exact tournament; expired/full invites actionable; recovery preserves destination; sender controls texts/email; actual Safari/Home Screen flow |
| 6 · verification/release | Candidate engineering gate, documented artifact/migration/backend/web/APK identities, authorized deployments and real-device matrix | Earlier slice checks pass | Node24 configured gate, no unexplained skips; identified app installs only when authorized; Android + Safari acceptance recorded; rollback verified for compatible source/schema |

Slice3 can follow slice1 for ordinary-game stats while slice2 is being designed; unrelated implementation may be delegated only with isolated worktrees and clear file ownership. No parallel agents edit shared files directly. Rules, data/server and UI owners coordinate through versioned contracts; root integrates and verifies. Camera modules are not assigned to this sprint.

### Meaningful verification scenarios

- Rematch: host and guest each win then become next starter; all-ready/withdraw/disconnect/retry/racing correction; exactly one successor with new ID; same stable table invite/accounts; two/eight-player and no forced start without consent.
- Tournament: selected mode/counts, fixed seats, rejected new join after start, active/between-game pause, next-day restart, lost realtime with polling fallback, final game ceiling, independently tied/different standings leaders, complete history after several successor allocations.
- Data: transaction failure after each conceptual step leaves atomic state; payload-fingerprint receipt misuse rejected; history paging/long receipt lifetime; revision conflicts; old clients against new capabilities and new clients against old server; participant-only RLS and no direct writes.
- Identity/nicknames: same nickname different UUIDs never merge; new nickname/email/same user another phone preserves history; next-game nickname cannot rewrite old result; exact actor/seat checks; legacy local games never attributed by guessing.
- Analytics: score values/order/bonus/correction replay, later zero->positive not backdated, usual Yahtzee scoring position, corrected aggregates without another win, no absent-roll denominator, hidden-total encouragement leak checks, results/export after reconnect.
- Rules: Competition v1 saves unaffected; v2 Yahtzee on extra roll1/2/3 renews; failure1/2 continues, failure3 resolves player only; extra roll4 rejected; initial roll4 Yahtzee, long chains, first/scratched/repeat eligibility, multiple players with final obligations; metric-only Yahtzee never grants points/attempt.
- Onboarding: exact pending tournament through signup/verification/recovery, multiple stale links, email delivery fail/rate limit, full/expired tournament, shared invite composer cancellation, browser/Home Screen login storage separation and same-account resume.

## Rollout, compatibility and risk controls

Freshly inventory current native APK/web/backend before qualifying a candidate; docs/history are not live device state. New UI and rule capabilities require a newly packaged Android build: updating web alone does not update installed Android assets. Prepare backend additive schema/protocol first, then web and identified Android candidate; enable new-session capabilities only when both participants support them. No automatic Pixel update is authorized by this design request. Each live deployment/app installation needs task-specific authorization when prepared.

Continue legacy room operations for existing v1 games; do not migrate active game semantics. Backfill history only from actual existing authoritative data after backup/review, in a bounded idempotent migration. Do not remove columns or rewrite old rule snapshots. Rollback cannot assume an old server understands v2-created state; preserve v2 data and compatibility paths, and disable new creation rather than dropping schema/tournaments. Test rollback against already-created new records before promotion.

| Risk | Mitigation / gate |
|---|---|
| Lost old games when room advances | Separately persisted history + transactional pointer/successor commit; history acceptance before rematch release |
| Duplicate next games/wins | Unique sequence identities, durable receipts, authoritative derived standings and race tests |
| Wrong person owns stats/readiness | Auth UUID ownership; ignore client-provided actor/seat/name as authority |
| Changed Competition rules alter old games | Explicit v1/v2 command behavior and full frozen tournament rules snapshot |
| Stale Android accepts unsupported state | Capability negotiation, expected game identity and explicit update-required UI; actual APK qualification |
| Optional metrics look like measured rolls | Player-reported labels; separate statistics and bonus/turn commands; no invented denominator |
| Pause/time/nickname/correction distorts awards | Recorded projection rules, server sequence, scope/mode/rules labels and corrected-result notices |
| Verification emails lose invitation | Validated durable destination + real provider/delivery/phone evidence before onboarding completion |

## Actual design evidence and remaining work

Source review found hosted Play again currently shares the new-game path; server has no successor/rematch operation and room carries a single game. Existing account UUIDs and core score/bonus/correction events are useful foundations; local legacy charts remain separate. Manual physical rolls are not captured by category-only scoring. Current Competition v1 final bonus turns use four, not proposed three. Current creation copies latest MODES rather than a supplied frozen tournament rule snapshot. Account UI lacks signup and pending invitations are memory-only.

Three expert agents reviewed architecture, experience/analytics and rules/verification without editing code. This document synthesizes their findings with confirmed user feedback, including latest nickname retention and winner-starts-next requirements. No new tests, migrations, app update or deployed tournament functionality are claimed. SW-016's476-test gate predates this feature implementation and does not validate these designs. Next engineering step is slice0 contract resolution followed by durable-history/rematch slice1; review its concrete result before later expansion.

13 October SW-017 slice2: hosted manual tournaments implemented and locally qualified. Mode/title/game/player counts, exact roster, fixed rules, host pause/resume, same-table progression/final ceiling and independent account-owned points/wins standings included in shared web/native UI.532 tests/65 files/all builds/source consistency,20 isolated PostgreSQL checks and synthetic phone/tablet layout passed; standard APK built/asset-matched. No live migration/backend/web publication or Pixel update; user continues testing deployed slice1. Actual two-account/next-day acceptance open. Details: docs/plans/SW-017-slice2-hosted-tournaments.md.

13 October SW-017 combined tournament/final-chain/pulse candidate deployed with explicit Pixel authorization and matching service/web rollout.575 tests/70 files/all builds/source consistency,23 isolated DB checks and local built phone/tablet manual chain exercise passed. First final-category Yahtzee50 earns repeated3-roll attempts, +100 success renews, only3 failures ends playerchain; newmanualCompetition version2, oldtables remain1. Livelier accepted score/turn/Yahtzee/full-house effects with reducedmotion and quiet reload/corrections. Pixel install-r preservingdata, exact installedAPKhash/launch; liveweb/backendbytes matched;9rooms/10games unchanged. New two-account tournament/chain/next-day physical acceptance open. Manifest: docs/releases/SW-017-2026-10-13-tournaments-final-chain.md.
