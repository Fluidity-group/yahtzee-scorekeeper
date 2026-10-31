# SW071: Stabilise the baseline and design an extensible game engine

Date: 30 October 2026. Product owner: Dan. Design author/coordinating architect: Codex. Independent reviewer: unassigned; author checks are not independent review.
State: sprint design proposed; implementation, verification, deployment and physical acceptance open.
Project: software, with later Android/iOS integration acceptance. Current task authorizes design documentation only.
Baseline: published master `9179f735c02438475245d3846e25fb6ed0239cbc`. The baseline to implement is not yet selected: reconcile the prior Pixel build and ROG source first. SW070 installation records are in PR #4, separate from this design.
Architecture decision: [versioned engine and accepted-event boundary](../decisions/2026-10-30-versioned-engine-and-triggers.md).

## Purpose and requirements

Deliver a trustworthy manual game whose approved rules, UI and assets survive releases, while allowing later variants and enjoyable effects without repeated edits across the application. Enable Dan and Amber to work concurrently in isolated working folders with reviewed shared contracts.

Owner-reported regressions: screen sizing, missing animations, avatars not working/transferring. These are acceptance requirements, not evidence of their root causes. The read-only review established differences between the saved previous Pixel APK and the Git-based replacement; it did not recover the previous source or verify a phone layout fix.

### Evidence motivating the sprint

- Saved prior APK contains a richer portrait picker and four portrait-style image assets absent from the current Git release. Its complete source provenance remains unresolved. Do not assume any Git branch is the complete latest product.
- Identical synthetic saved Competition v2 state finishes under historical core `9424614` but starts bonus attempts under current core when a first Yahtzee fills the final category. Snapshot fields/version do not fully pin interpreter behavior.
- Current prototype score-pulse wiring only dispatches for upper bonuses or additional Yahtzee bonuses; component tests alone do not establish first-Yahtzee/straight/Full House effects in the app.
- CustomTriggers is connected through legacy main.js, not the current prototype entry point. Current avatars are device-local presets/temporary photo previews, not account-synchronised portraits.
- Synthetic room/core bonus Undo succeeds but commentary acceptedOutbox rejects its bonus target. This is a latent integration defect when that path is enabled; it is not evidence of a live backend failure.
- Manual Chance=1 is accepted despite being impossible with five dice. Physical-roll verification and mathematical legality are different requirements.
- Read-only review ran 160 existing tests across 10 files successfully. SW070 previously reran the full clean gate: 1,216 tests, 13 optional camera skips and all configured builds; 19 Android native tests passed. None of these results qualifies the proposed redesign.

### Scope

In: baseline recovery/inventory; approved rule catalogue and examples; versioned pure engine; explicit turn stages; command/event contracts; coherent trigger evaluation; targeted UI/asset regression repair; developer isolation; traceable build identity; regression/contract/visual qualification.

Out: new production game modes, team play, paid AI/portrait generation, camera/BLE expansion, push activation, server framework replacement, Unity/Godot rewrite, a general-purpose scripting engine, broad legacy migration, deployment or device installation. Future avatar account sync is a separate gated slice unless explicitly selected and estimated at planning.

The existing manual POC remains the priority. Keep existing accounts, live tables, frozen rules, scores and local app data. A fresh POC need not import legacy saves; existing active tables are still protected from silent reinterpretation.

## Product model and rule decisions

Separate four dimensions: rules profile (Standard/Competition/Accumulative), play arrangement (solo/shared phone/online), competition structure (single game/tournament), and input/evidence source (manual/entered faces/connected dice/camera). Validate supported combinations explicitly. Do not promise Competition final-chain support on hardware inputs until specified and tested.

### Rule catalogue for owner approval

This table describes current code as the starting point, not newly approved behavior. No rule implementation begins until its examples are approved.

| Contract | Standard | Competition, current new manual v2 | Accumulative |
|---|---|---|---|
| Ordinary rolls | 3 | 3 | 3 |
| Last open base category | 3 | 4 | 3 |
| Initial Yahtzee | 50 | 50 | Faces 1–6: 100/90/80/70/60/50 |
| Qualifying repeat | +100 plus category placement on same turn | +100 and fresh turn, except final-category placement/chain transition | Face-based bonus and fresh turn |
| Joker placement | Enabled | Disabled for new games; existing snapshots may enable it | Enabled in current code; explicit owner decision required |
| Final bonus chain | None | First or repeat final-category Yahtzee opens renewable 3-roll attempts | None |
| Upper bonus in current code | 63 earns 35 | 63 earns 35 | 63 earns 35 |

| Decision ID | Required decision and worked example | Recommended starting position | Owner/state |
|---|---|---|---|
| D01 | Standard reference edition; repeat/Joker after initial 50 or scratch | Use the linked Hasbro reference; encode exact placement and no bonus after scratch | Dan/open |
| D02 | Competition chain begins on first final-category Yahtzee, repeat only, or another policy | Retain latest documented first-or-repeat policy for a newly named version; never silently rewrite old v2 | Dan/open |
| D03 | Competition repeat with one category left; category placement and +100; failed-attempt reporting | Score category/bonus atomically, then separate 3-roll chain; distinguish whole-attempt failure from observed rolls | Dan/open |
| D04 | Accumulative Joker, face-weighted bonus, final turn and extra turns | Keep current face weighting/extra turns; explicitly select Joker and ending policy | Dan/open |
| D05 | Scratch then correction; whether bonus eligibility/turn history changes | Corrections adjust points without replaying old turn consequences; document future eligibility separately | Dan/open |
| D06 | Undo scope and correction-trigger policy across all modes | Latest own completed turn only; retain audit; invalidate dependent effects; corrections are quiet by default | Dan/open |
| D07 | Hidden totals, ties, next starter, tournament awards | Preserve hidden-total disclosure and independent shared points/wins awards; confirm starter examples | Dan/open |
| D08 | Avatar expectation and accepted visual reference | Restore approved available source/assets first; distinguish local persistence from account sync | Dan/open |
| D09 | Existing v2 games whose original interpreter cannot be identified | Do not infer from timestamps alone; compatibility mapping or explicit owner-selected new game required | Dan/open |

Each approved profile needs examples for ordinary scoring, scratch, first/repeat Yahtzee, last category, bonus renewal/failure, correction, Undo, completion, tie and tournament continuation. UI help must derive from the same profile/capability data, with human-readable explanations reviewed alongside examples.

## Design and impact

### Proposed module boundaries

Start with folders in the current repository; separate published packages are unnecessary for two developers.

| Proposed boundary | Responsibilities | Must not own |
|---|---|---|
| src/engine/contracts | Runtime-validated commands/events/state schemas; typed interfaces | DOM, transport, credentials |
| src/engine/rulepacks | Immutable rule definitions, named policy registry and reference examples | Storage/network/effects |
| src/engine/scoring | Category legality, totals, Yahtzee/upper bonuses | Turn authority or UI |
| src/engine/transitions | Legal stages, turn advancement, bonus attempts, correction/Undo, completion | Async calls or device access |
| src/engine/selectors | Legal actions, score options, progress, results and disclosure-safe views | Duplicate rule definitions |
| src/application | Session orchestration and accepted-state persistence adapters | Alternate scoring implementations |
| src/experience | Pure fact derivation, versioned triggers and effect plans | Direct score/turn mutation |
| src/ui and native adapters | Rendering, accessible effects, audio queues, device events | Authoritative game rules |
| server/rooms | Auth UUID/seat authority, revision CAS, receipts, atomic state/history/outbox commits | Client trust or independent rules copy |

Keep an adapter at src/game/core.js while callers migrate. Both local and server paths import the same engine. Keep the separate Pi authority separate; compatibility tests precede changing its imported contract. Archive/isolate legacy main.js rather than routing new features through it. Add types incrementally at the engine boundary using an agreed TypeScript or checked-JSDoc approach; runtime validation remains necessary. Do not combine a framework rewrite with this extraction.

### Engine contract

`transition(state, command, context) -> { nextState, events }` is synchronous and deterministic. Supply commandId, actor/seat context, accepted time and any random seed/results explicitly; no Date.now, random generation, DOM, storage, network or provider calls inside transitions.

Local orchestration persists before publishing accepted events. Hosted orchestration authenticates and validates current game/revision/seat, applies the same transition, commits state/history/command receipt and any durable effect intent atomically, then publishes acceptance. Rejected or retried commands cannot duplicate points or effects. Bind receipts to actor and canonical request fingerprint even when commentary is disabled.

Define structured rule errors with stable codes, separate from transport/storage errors. UI uses legalActions selectors instead of duplicating rule conditions, but server validation remains mandatory. An input adapter produces a reviewed proposal; it never grants player authority.

A rule pack includes immutable ID/version/content hash plus named policy versions for placement, bonuses, turn flow, completion and correction. State separately records schemaVersion and engine/interpreter version. Trigger-set and product/build versions are separate. Changing any gameplay semantics requires a new rule-pack identity and a supported interpreter path: hashing configuration does not preserve behavior by itself. Existing active games continue with a supported exact contract or receive an explicit compatibility block; never fall back to today's defaults.

Represent stages explicitly: awaiting-turn, awaiting-input, awaiting-score and final-bonus-attempt, with finished status and session-level pause separate. Manual play does not fabricate roll/settling stages. Category fill count, player turn sequence and roll number are distinct; an extra turn must not be mistaken for a fourteenth scorecard category.

Retain accepted snapshots and append-only audit initially. Canonical accepted events should carry resolved scoring/transition facts so a future reducer can rebuild state under the pinned schema/interpreter. Do not claim the existing audit is already fully replayable. Introduce replay only with replay-equals-snapshot conformance fixtures; migrate incrementally, not by replacing storage wholesale.

### Accepted-event and trigger contract

Canonical events include ScoreRecorded, BonusAwarded, UpperBonusAwarded, TurnEnded/Started, FinalAttemptStarted/Resolved, GameCompleted, ScoreCorrected and TurnUndone. Final names/schema require interface review before implementation. A command may emit several ordered events with stable IDs; retain command grouping/causation.

Envelope: eventId, commandId, gameId, revision, schemaVersion, rulePackId/hash, actor/seat, turnId, acceptedAt, provenance and payload. Payload includes category/value and resolved score/bonus deltas where relevant. Derive or publish disclosure-safe audience views; do not leak hidden totals through trigger text, effects or clients. Capture facts at acceptance, not retrospectively from newer snapshots.

Example presentation trigger:

```json
{
  "id": "full-house-confirmed",
  "version": 1,
  "on": "ScoreRecorded",
  "when": { "category": "fullHouse", "value": 25 },
  "actions": [{ "type": "animation", "asset": "full-house" }],
  "priority": 40,
  "delivery": "live-only",
  "onInvalidation": "cancel"
}
```

Use a small schema-validated declarative matcher with allowlisted predicates/actions, no eval/user JavaScript. Support category (scorecard box), accepted turn number, mode/profile, value, threshold crossing and stable player identity. Player labels are not identity. A manual score is not proof of five observed dice; effects describe accepted scoring facts unless evidence establishes a roll.

Multiple facts can match: preserve all facts, arbitrate presentation with explicit priority/exclusivity/queue/cooldown limits. Trigger-set versions are pinned for shared table behavior; device accessibility/mute/rendering remain local overrides. Gameplay consequences such as points and extra turns are engine policies, never presentation-trigger actions. Future challenges that change gameplay require a new reviewed rule pack.

Deduplicate effect intents by eventId + triggerId + definition version + audience/scope, not render calls. Clients track delivery; choose explicit expiry/foreground behavior. Hydration, stale updates and reconnect do not replay live-only celebrations. Delivery retries can be at-least-once; do not claim exactly-once sound. Corrections/Undo invalidate dependent active/queued effects and provisional achievements. Define whether an achievement is reversible before making it durable. Persistence of an effect must not block scoring due to provider/audio availability; repair the current bonus-Undo outbox mismatch without weakening authority.

### Presentation and avatar acceptance

Create a baseline comparison ledger: reported symptom, old APK observation, recovered source/asset commit, intended behavior and test evidence. Do not copy compiled bundles into source or copy an entire dirty ROG checkout over fg-dev. Public artwork must be tracked or declared in a checksummed, licensed asset manifest; optional-camera exclusions cannot hide required UI assets.

Sizing acceptance uses approved screenshots and functional layout checks at 320, 393 and 448 CSS-pixel widths, representative Android/iPhone viewport/safe-area settings, compact/comfortable/large preferences, increased text scaling and both themes. Score entry, totals, menus and confirm controls must remain usable without accidental clipping or unintended horizontal overflow. Proposed viewport coverage is a test matrix, not a claim of physical acceptance.

Exercise first Yahtzee, repeat bonus, Full House, straight, upper-bonus crossing and game completion through the actual application, not only effect helpers. Ensure reduced motion, mute and background/reconnect behavior. A score input must remain usable while an effect runs.

Restore local avatar selection/reopen/restart behavior from approved recovered source, including safe fallback when a stored avatar ID is unsupported. Do not overwrite an unknown stored value before recovery/export decision. Account-synchronised avatars need a separately approved ownership/storage/privacy/retention contract and server work; a device-local picker cannot meet cross-phone transfer expectations. No real portraits or personal data in fixtures, commits or review artifacts.

## Two-developer delivery workflow

Use separate clones or task worktrees, one working folder per developer/task and independent node_modules/native build output. The shared /srv/yahtzee/main checkout is a coordination baseline, not a simultaneous editing surface. No server/account/permission provisioning in this sprint design.

Allocate Developer A (engine/contracts, person unassigned) and Developer B (UI/experience, person unassigned). Dan is product decision owner; Codex coordinates interface review/integration. Do not assume Amber or Dan has accepted a coding assignment. Contract/rule-catalogue PR merges first. A owns engine implementation; B works against shared contract fixtures/adapters. src/prototype.js has one editor at a time until extraction removes its conflict hotspot. Cross-boundary changes require both tracks to review compatibility, not concurrent edits to the same file.

Each task gets one branch/PR, based on current reviewed master. Record base commit, chosen rule-pack versions, dependencies, files owned and checks. Normal merge/fast-forward handovers only; never reset/stash another person's work or force-push shared history. Agents do not approve/merge their own work. Do not change CI workflows/protection without explicit task scope.

A release manifest identifies commit, engine/rule/trigger/schema versions, feature profile, required asset manifest, native build numbers, artifact hashes and qualified targets. About screen exposes non-secret build/profile identity. Build numbers increase normally. Separate testing from deployment, and require a feature-diff review against the previously installed build before promotion. Public web, backend and each native platform are distinct targets.

## Sprint backlog and sequence

Sizing is relative S/M/L, not a delivery-date promise. Commit to calendar/people after baseline recovery and rule approval. If the complete scope exceeds capacity, finish the stabilisation slice before starting extraction; do not label every later feature as part of one sprint.

| ID | Deliverable | Track/size | Dependencies and exit |
|---|---|---|---|
| S1 | Recovered baseline and feature/asset comparison ledger | A+B / M | Access to preserved ROG source; source provenance and owner-approved visual reference; stop release if unresolved |
| S2 | Approved rule catalogue, decisions D01–D09 and worked examples | Dan+A / M | Can draft while S1 runs; decision-dependent behavior remains blocked |
| S3 | Engine/event contracts, compatibility approach and characterization fixtures | A / M | S1/S2; B reviews consumer interface |
| S4 | Targeted sizing/avatar/effect wiring repairs | B / M | S1 and approved visuals; may progress while S2 resolves rules; local avatar scope only unless D08 expands it |
| S5 | Versioned engine extraction with compatibility adapter | A / L | S3; no unapproved rule changes; local/server parity |
| S6 | Trigger evaluator, effect plans and app integration | B / L | S3 interfaces, S5 integration; no gameplay mutation from effects |
| S7 | Two-developer handoff/runbook and build/asset identity checks | A+B / M | Starts after S1; any proposed CI edits need explicit implementation authorization |
| S8 | Integrated candidate qualification and owner test pack | A+B / M | S4–S7; no automatic deployment or POC acceptance |

Suggested capacity boundary: Sprint 1 commits S1–S4 plus workflow/identity essentials from S7; S5–S8 form the follow-on extraction/integration slice if capacity is insufficient. Scope is cut by whole deliverables, not by dropping tests or compatibility gates. Design covers the complete initiative; owners select the committed slice before coding.

## Acceptance and verification

| Requirement | Observable criterion | Method/configuration | Actual evidence/state |
|---|---|---|---|
| R01 Baseline | Every owner-reported regression mapped to intended versioned source/assets or an explicit unresolved blocker | APK/source ledger and owner visual review | Open; historical APK differences only |
| R02 Rules | Approved matrix/examples for all supported mode/source combinations; no same-identity semantic changes | Decision ledger and golden conformance fixtures | Open |
| R03 Determinism | Same state/command/context yields identical state/events; rejected command leaves state unchanged | Engine tests with supplied IDs/time; canonical comparison | Open |
| R04 Rules isolation | Old supported profiles retain exact behavior when new profile is introduced | Historical compatibility fixtures including first/repeat final Yahtzee | Open; drift probe reproduced |
| R05 Authority | Own-seat/current game/revision/fingerprint enforced; retries cannot duplicate accepted effects/points | Synthetic HTTP/CAS/receipt tests and disposable SQL checks when persistence changes | Open |
| R06 Legal scoring | Mathematical score ranges/combinations consistent; manual provenance remains self-report | Exhaust all 7,776 ordered dice outcomes for dice scoring; manual/correction legality tests | Open; Chance1 probe reproduced |
| R07 Turn integrity | Complete 1/2/8-player supported-mode games, bonus chains, corrections/Undo, pause/return, ties and tournament advance | Scenario/model-based tests with independent oracle/invariants | Open |
| R08 Trigger delivery | Repeated delivery/hydration/reconnect cannot replay live effects; failed persistence emits none; invalidations cancel | Actual app integration plus effect-plan tests and fake clocks | Open |
| R09 Visual restoration | Approved sizing/avatars/effects pass viewport and accessibility matrix; selection survives local restart | DOM/visual checks, then separately authorized phone observations | Open |
| R10 Modularity | Add one synthetic new rule version and one new celebration via declared extension points; central transition orchestrator unchanged | Test-only variant and effect fixtures, not a shipped new mode | Open |
| R11 Collaboration | A and B complete isolated changes, integrate normally and reproduce candidate identity without overwriting work | Recorded dry handoff; clean branches/output separation | Open |
| R12 Release completeness | Required UI asset omissions fail preparation; visible build identity matches signed artifact and intended feature profile | Clean Node24 full gate, asset checks, native qualification when authorized | Open |

Tests must assert product outcomes, not reproduce implementation. Retain current regression coverage; add property/model-based tests (fast-check is a candidate, not installed/approved here). Invariants include legal active seat, bounded rolls, no duplicate category fills, sheet/event consistency under pinned semantics, preserved frozen rules, and Undo restoring the defined playable state while appending audit rather than making bytes identical. Hidden facts cannot escape through event/trigger views.

Full gate: clean Node24 locked root/Pi installs, configured engineering verify, relevant server/SQL contract checks and native tests/builds for release preparation. Report optional camera skips. Visual and owner-played game evidence are separate from automated success. No new phone installation is implied by this plan.

## Risks and execution bounds

| Risk | Consequence | Mitigation/owner/state |
|---|---|---|
| K01 Unrecovered source | Repeat apparent rollback despite green tests | S1 blocks baseline promotion; A+B/Dan, open |
| K02 Incomplete historical version identity | Existing games change meaning | Pinned policies/interpreter, explicit compatibility decisions; A/Dan, open |
| K03 Scope expands into framework/platform rewrite | Stabilisation delayed and regressions multiply | Retain stack, adapter-led extraction, whole-deliverable scope cuts; Codex/Dan, open |
| K04 Shared checkout editing | Lost/interleaved changes and mixed native output | Separate workspaces, interface PR first, single editor for hotspot; A+B, open |
| K05 Events leak hidden totals or replay effects | Privacy/gameplay and usability failure | Disclosure-safe projections, dedupe/expiry/invalidation, reduced motion; A+B, open |
| K06 Avatar transfer assumed to exist | False acceptance or unintended personal-data handling | D08 split local restoration from explicitly designed account sync; Dan/B, open |
| K07 UI/engine tests pass separately | Missing app wiring goes unnoticed | Actual score-to-effect journeys and visual reference gates; B, open |

No destructive database migrations, rules rewrites, app-data resets, credential copying, provider purchases or live deployment. Keep raw device metadata/portraits/configuration outside Git. Record only synthetic fixtures and non-secret release identities.

## Completion and decision

This task delivers design only. Implementation not started; owner rule/visual decisions remain open. Proposed G1/design-ready gate is not passed until S1/S2 establish a complete baseline and approved contracts. No independent review, deployed redesign or physical acceptance is claimed.

Next action: Dan selects the committed sprint slice and resolves the rule/visual decision ledger. Baseline inventory and characterization can proceed under a subsequent implementation task while independent rule decisions are gathered; rule-dependent changes wait for those answers.

### Research supporting the design

- [Hasbro repeat Yahtzee/Joker rules](https://hasbro-new.custhelp.com/app/answers/detail_uk/a_id/211/kw/scrabble%20rules): reference for proposed Standard contract, not authority over house modes.
- [boardgame.io phases](https://raw.githubusercontent.com/boardgameio/boardgame.io/main/docs/documentation/phases.md), [stages](https://raw.githubusercontent.com/boardgameio/boardgame.io/main/docs/documentation/stages.md) and [reducer](https://github.com/boardgameio/boardgame.io/blob/main/src/core/reducer.ts): explicit allowed moves/stages and central move processing; no framework adoption proposed.
- [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/): generated command sequences against an independent model/invariants.
- [Git worktree](https://git-scm.com/docs/git-worktree): isolated working directories per task with shared repository metadata; separate clones are also acceptable.

### Design-document validation

Clean design commit `96421c8` passed the Node24.15.0 configured engineering gate: 1,216 tests passed, 13 optional camera tests skipped; all configured web/native-web/manual-web/commentary-edge/room-edge builds passed with stable source. Evidence: `artifacts/engineering/2026-10-31T04-28-50-349Z-9e30169e/report.json` in the isolated design checkout. The UTC evidence timestamp falls on 31 October; local design date remains 30 October America/Chicago. `git diff --check` and new/changed local Markdown links passed. Seventeen pre-existing unresolved link references in historical status/project records remain unchanged; they do not establish current source or deployment state.

This validates the documentation branch against existing checks, not the proposed engine. No new implementation tests, native compilation, device inspection/installation, live backend mutation, rule approval or independent review was performed for this design task.
