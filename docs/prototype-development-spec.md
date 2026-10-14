# Yahtzee Scorekeeper — commercial prototype specification

Status: draft for review, 16 September 2026. Based on the product decisions in this Codex conversation and inspection of the existing repository.

## 1. Goal and scope

Build and test an Android-first scoring companion for physical dice. Each participant uses their own device. iPhone participants initially join through a browser; an Android host can connect a shared set of five GoDice. Native iOS comes later.

Validate usability on both phones and tablets, multiplayer consistency, and real GoDice behaviour before committing to a launch date or commercial pricing. A prototype is not a store-ready release.

This document describes the new product direction. The root `yahtzee-build-spec.md` and `CLAUDE.md` describe the older two-player, shared-device product. Preserve them as historical context; where product requirements differ, this document records the current direction. Unresolved rules below are proposals, not approved decisions.

## 2. Confirmed decisions

- 14 October2026 SW029: Home first on cold launch; Solo, Local multiplayer (one shared phone/scorecard), Online and Tournament entry. Saved global commentary defaults and optional local player drafts; per-new-game Yes/No when enabled, then connected named welcome before scoring. Explicit Resume does not replay welcome. Local scoring works offline without an account; live voice requires authenticated networked Android host. This supersedes the older no-pass-and-play and universal multiplayer Internet/account requirements below for shared-phone scoring. Themed menu drawer and privacy-safe playback timing diagnostics; actual sound latency remains acceptance work. See SW029 task/release for qualified/deployed/physical distinctions.

- 14 October2026 SW028: hosted lobby offers commentary voice/style/profanity/frequency and own player details before Start; explicit enabled accepted-start welcome includes selected commentator self-introduction. Dark editorial is adult, meaner and filthy when language is allowed, with specific consented player-blurb roasts. Player details are not a commentator persona. Undo is a compact bottom scorecard action with explanatory confirmation. See SW028 task/release for implemented/deployed/physical acceptance distinctions; this supersedes older friendly-only direction below.

- 3 October2026 testing priority: establish C121 dice identification with a standalone Android test UI and fresh labeled evidence before further game UI integration. Diagnostic tests have no roll/score authority. See `decisions/2026-10-03-dice-identification-first.md` and `handovers/2026-10-03-c121-dice-identification.md`.

- Camera development sequence accepted 1 October 2026: Tapo C121 local Wi-Fi streaming to Android first, with separate illumination trials; finish the ESP32 battery-powered dice housing after independently establishing adequate camera detail and recognition. Elevated side placement is allowed. See `decisions/2026-10-01-camera-platform-sequence.md`; this selects development direction, not physical acceptance.

- One to eight players; optimise the common experience for two or three. Solo supports personal improvement, not an AI opponent.
- Internet is required for multiplayer, including around one table.
- Accounts are required. Email access is important; Google plus emailed sign-in codes is the proposed implementation, pending provider selection.
- Each player uses their own phone or tablet; no pass-and-play requirement.
- Manual upper scores use a count of matching dice (0–5); fixed categories offer their score or zero; three/four of a kind and chance use a total.
- Everyone can inspect everyone's scores. On the active player's device, scoring takes focus; confirmation returns to the shared overview.
- The player taps Start my turn. Confirming a category ends the turn. Test this before considering automatic handoffs.
- GoDice updates available category scores after each accepted roll. The player chooses and confirms a category; no automatic category selection.
- Capture every accepted roll and reroll, separately from the selected score.
- Players may correct their own scores and dice readings. Preserve an audit trail.
- Allow manual completion after a dice disconnect; identify incomplete/corrected data in analytics.
- Host selects a preset mode before play; the mode and rules version remain fixed for that game.
- Launch modes: Standard, Competition, Accumulative Yahtzee.
- Free manual scoring and multiplayer. One-time host GoDice upgrade is the intended commercial model.
- Jovial, friendly commentary is the only AI feature planned for the first release. No coaching or AI post-game analysis yet.
- Commentary plays on the host by default; remote participants may opt in on their own devices.
- The host's commentary entitlement covers the game. The business supplies AI/voice services; players do not supply API keys.
- Commentary pricing, allowances, providers, and costs must be measured before launch.
- Current visual identity is a starting point; redesign is welcome where it improves usability.

## 3. Existing baseline and reuse

Current stack: Vite, vanilla JavaScript, Dexie/IndexedDB, Vitest, and a PWA service worker. Existing scoring and rules are separate from presentation. Existing statistics, effects, and commentary provide reusable foundations.

Initial verification: 122 tests across 13 files passed and production/PWA build passed. Canvas warnings in jsdom mean visual effects still require browser testing. These tests validate the old behaviour, not the new specification.

Important gaps:

- Rules, storage, UI, and commentary assume two players in several places.
- Saved games are local to the device; there is no account-based shared game backend.
- Existing bonus-Yahtzee extra-turn rules are house rules, not the new Standard mode contract.
- Current AI key entry is device-based; ElevenLabs proxy runs only under development/preview. Neither is the planned commercial service.
- Current styling includes a large landscape layout and a narrow/portrait fallback; this needs deliberate phone and tablet experiences.

Retain vanilla JavaScript initially. Evaluate an Android native shell with a BLE bridge in the hardware stage, rather than rewriting the UI framework upfront.

## 4. Phone and tablet UX

Build one responsive product with two deliberate compositions, sharing game state, controls, and design tokens. Select composition by available space rather than device name.

### Phone

- Portrait-first, vertically scrollable, with no page-wide horizontal overflow.
- Compact header: mode, current player, turn state, and connection status.
- Shared overview: totals/rankings for all participants, followed by an inspectable scorecard. Keep category labels visible when comparing players.
- For up to eight players, use a deliberately scrollable score comparison region or player selection; do not shrink eight columns into unreadable text. Everyone's full scores remain accessible.
- Active turn: prominent roll number, five dice/read status when available, and own scorecard with available scores highlighted.
- Upper score entry uses large count buttons; fixed scores use clear score/zero actions; sum categories use a numeric entry sheet.
- Confirmation names the category and points. Keep the shared-score view reachable during the turn.
- Waiting players retain the overview and a clear indication of who is playing.

### Tablet

- Wider overview with more score columns visible at once.
- Where space permits, show shared scorecard alongside the active player's dice and scoring panel.
- Tablet portrait may stack panels; landscape can use side-by-side panels.
- Use extra space for comparison and status, rather than enlarged phone controls or oversized decoration.

### Shared acceptance criteria

- Verify representative widths of 360, 390, 430, 768, 1024, and 1280 CSS pixels, plus real Pixel/iPhone and an available tablet or tablet emulation.
- Orientation changes and resizing preserve the current turn and unsaved entry.
- Controls target at least 44 × 44 CSS pixels. Support text enlargement, keyboard focus, labelled controls, and reduced motion.
- Colour is not the only indication of active player, legal score, or connection state.
- Dice, keyboard, entry sheets, and celebrations must not obscure the primary action or trap navigation.
- Test both two-player and eight-player layouts. During a turn, all participant scores remain inspectable.

## 5. Modes and rules contract

| Preset | Rolls per turn | Yahtzee scoring |
|---|---|---|
| Standard | Three | Standard rules, including qualifying additional bonuses and Joker placement |
| Competition | Three; four on each player's final unfilled base category | Standard point values; additional qualifying Yahtzees grant a fresh extra turn |
| Accumulative Yahtzee | Three | Five 1s = 100, 2s = 90, 3s = 80, 4s = 70, 5s = 60, 6s = 50; subsequent Yahtzees add the same face-based amounts |

Record `modeId`, `rulesVersion`, and an immutable rules snapshot with each game. Never apply revised rules retrospectively to old results.

Confirmed for Accumulative mode: the first Yahtzee fills the Yahtzee category and uses a normal turn. A second or later Yahtzee adds its face-based bonus and grants a fresh turn to the same player. On that extra turn, the player can fill another base category or score another bonus Yahtzee, which grants another fresh turn. Do not require a base-category score on the same roll as the additional Yahtzee. Use an explicit extra-turn transition rather than silently advancing to the next player.

Confirmed for Competition mode: use the same extra-turn behaviour for additional qualifying Yahtzees, with standard point values rather than Accumulative face-based values. Standard mode retains standard rules and does not grant these house-rule extra turns.

Stage 1 rules decisions:

1. Prototype default: additional bonuses require a non-zero initial Yahtzee category in every mode.
2. Confirmed: one eventual normal category ends the bonus chain. Bonuses do not accumulate category obligations.
3. Prototype default: Accumulative has three rolls throughout. Competition has four while the final category remains open, including fresh bonus turns.
4. Standard bonus and Joker placement follow [Hasbro's additional Yahtzee rules](https://hasbro-new.custhelp.com/app/answers/detail/a_id/211/). A scratched Yahtzee still invokes Joker placement but earns no bonus.

Manual Accumulative scoring asks for the Yahtzee face, including for each bonus. Manual mode cannot verify a physical roll; GoDice mode validates combinations from the accepted dice snapshot, subject to visible user corrections.

## 6. Turn, roll, and correction model

Proposed turn states: awaiting start → ready/rolling/settling → score selection → score pending → completed. A failed score request does not end the turn. Only server acceptance advances multiplayer control. A qualifying additional Yahtzee in Competition or Accumulative mode creates a fresh turn for the same player instead of advancing to the next player; keep separate turn IDs and roll counts for analytics.

- Start assigns a unique turn ID and active account. Only one active turn exists per game.
- The host phone owns the shared BLE connection; the active player owns score selection on their own device.
- Capture all five die identities and values in each accepted roll, retaining held values when only a subset moves.
- Group related die events into one roll; do not count each Bluetooth notification as a roll.
- Do not count movement between turns as gameplay. Preserve uncertain events as diagnostics rather than silently labelling them as completed rolls.
- The first roll needs a valid five-dice state. Later rolls include held dice. Reconnect or stale readings cannot silently become valid new rolls.
- Debounce/settling thresholds are experimental settings established from hardware traces, not assumed firmware guarantees.
- Display 1/3, 2/3, 3/3 or the appropriate four-roll allowance. Moving dice after the limit must not silently create an extra valid roll.
- Users can correct face values, accidental roll counts, and their own scores with a visible record. An old-score correction must not replay turn advancement.
- An uncertain/dropped connection pauses automatic capture and offers reconnect or manual completion without discarding the game.
- Roll correction affects derived statistics; original evidence remains available. Late BLE events cannot change a completed turn.

Keep raw device notifications separate from accepted game events. Check what GoDice actually exposes; do not assume access to raw IMU streams. Test whether dice moved while waiting settle into a valid new turn only after a deliberate roll.

## 7. Multiplayer and data architecture

Use a server-authoritative game record with authenticated membership and realtime updates. Choose a backend after comparing authentication, database, realtime, server functions, operating cost, and deployment requirements. Supabase is a candidate, not a commitment.

Proposed records:

- Accounts/profiles and stable player IDs.
- Games, memberships/seats, immutable rules, host identity, and status.
- Turns with active player, allowed rolls, start/end times, and revision.
- Accepted roll snapshots: five die values/IDs, rerolled subset where known, source, completeness, and correction status.
- Score events and linked corrections; event IDs, server ordering, timestamps, and idempotency keys.
- Device diagnostic sessions with bounded retention, separate from permanent roll history.
- Later: entitlements, commentary jobs, usage ledger, and billing references.

Requirements:

- Join through a code/link after authentication; host starts with the confirmed roster.
- Server validates membership, active turn, category availability, and mode rules. Manual scores receive range validation without claiming to verify physical dice.
- Duplicate submissions, reconnects, and retries never double-score or double-advance.
- Reconnected clients receive an authoritative snapshot and revision. Show disconnected/pending state explicitly; do not pretend a local score was shared.
- Only a player may change their own score; other players can see corrections.
- If the Android BLE host disconnects, pause dice capture. Initial prototype may require the same host to return; automatic host migration is deferred.
- Cloud multiplayer records are canonical. Local storage supports recovery/cache; old local games remain preserved and labelled as legacy house-rule games.

## 8. Analytics

Persist the evidence from the start, even before advanced charts exist.

- Score trends, personal best, win rate, head-to-head results, upper-bonus success, and sacrificed categories.
- Full houses, straights, three/four of a kind, and Yahtzees rolled whether or not scored in that category.
- Report both matching rolls and distinct turns containing a combination. Separate natural combinations from rule-based Joker scoring eligibility.
- Proposed natural full house means exactly 3+2, not five equal dice; define inclusive/exclusive kind counts in the analytics dictionary before shipping.
- Duplicate notifications do not count. Unchanged held combinations may match another accepted reroll, but count once in the distinct-turn metric.
- Separate modes/rules versions and solo/multiplayer. Solo has personal bests, not an opponent win rate.
- Distinguish device-observed, manually corrected, and missing roll data. Manual-only games must not be treated as zero combinations rolled.

## 9. Development stages and review gates

### Stage 0 — baseline and agreed specification

Deliver: this specification, baseline test/build results, current architecture/gaps, and a short list of unresolved custom rules. Keep current game operational. Confirm mode semantics before changing scoring.

Gate: agree the first implementation slice and resolve only the questions blocking that slice.

### Stage 1 — phone/tablet UX and reusable local game core

Deliver: phone and tablet compositions; remove hard-coded player assumptions; pure mode-aware scoring, turn state, and dice-to-category evaluator; simulated roll input for development; append-only roll/correction structure; safe legacy-data handling.

Use named local test identities until Stage 3 introduces real accounts. These are a prototype fixture, not the final account experience.

Acceptance: complete solo/two/eight-player simulated games; test all three modes and bonus/Joker cases; verify edits never advance turns; recover a saved game; inspect phone/tablet layouts. Device testing must confirm the new scoring flow is comfortable.

### Stage 2 — Android GoDice feasibility slice

Deliver: Android development build/native BLE bridge if needed, five-dice setup/status, turn-gated capture, score suggestions after each roll, diagnostics, and manual fallback. Remember the set and attempt reconnection only where the platform supports it.

Acceptance on the Pixel and real GoDice: initial pairing; five-dice roll; held-dice rerolls; dice picked up/passed between turns; uneven settling; accidental movement; disconnect/reconnect; app background/foreground; correction; three/four-roll limits. Test multiple complete games. Record missed, false, and duplicate rolls plus suggestion latency before choosing reliability targets.

Gate: inspect real traces and adjust UX/detection before expanding integration. Do not promise automatic handoffs or seamless reconnects before evidence supports them.

### Stage 3 — accounts and cross-device hosted games

Deliver: selected backend, authentication, lobby/join flow, realtime shared scorecards, persistent history, and Android-host dice events delivered to browser participants. Start-turn and score confirmation occur on the active player's device.

Acceptance: complete manual and shared-dice games with the Pixel host and iPhone browser; verify remote-network use, mixed manual/dice turns, two/three/eight participants, solo persistence, reconnect, duplicate requests, simultaneous invalid actions, and participant access controls. Emulation supplements physical devices for larger groups.

Gate: a complete shared game survives player reconnects with consistent scores, roll history, and turn order.

### Stage 4 — analytics and bounded commentary experiment

Deliver: initial mode-separated statistics; jovial event-based commentary; host default playback and remote opt-in; server-held provider credentials; generation once per game event with shared audio; captions/mute/fallback; test-only usage allowance and cost ledger.

Record text/model usage, generated audio duration or billed characters, retries, delivery/storage, latency, and cost per game. Enforce per-game/per-account budgets and a global stop control. Do not charge users yet.

Acceptance: comments match verified events, avoid inventing rolls, do not overlap or speak stale results, and fail without blocking play. Measure representative games and define a sustainable commercial allowance before production billing.

### Later — release preparation

Payments and purchase restoration, entitlement enforcement, store submission, product name/branding review, provider/asset licence review, privacy/account deletion, production security and dependency review, operational monitoring, backups, and support. Price only after measuring costs. Native iOS, player-owned dice sets across multiple phones, automatic turn detection, coaching, and computer opponents are deferred.

## 10. Working practices and environment

- Preserve all unrelated Claude Code sessions, repositories, processes, and configuration. Never stop processes by generic names or change global Node defaults for this project.
- Use the existing WSL Node 22 installation explicitly for this checkout. Current dev port is 8473; preview port is 8474. Check ownership before replacing a listener; stop only processes created for this task.
- No framework replacement or backend account creation is implied by this specification.
- Keep credentials out of the repository and client bundles. Use isolated test data and infrastructure when introduced.
- Work in small reviewable stages. Run relevant tests and production build, show the result, then pause for device feedback before the next stage.
- Preserve old tests as evidence of legacy behaviour; update expectations deliberately when implementing versioned rules, rather than forcing the new modes to follow old house rules.
- No source implementation changes are included in this specification deliverable.

SW-017 tournament candidate13 October2026: hosted manual mode supports fixed2–20 games/2–8 accounts, frozen selected v1 rules, stable table invite, host pause/resume and separate completed-game total-points/shared-wins standings. Current backend/native/web deployed slice1 does not yet include this candidate. See docs/plans/SW-017-slice2-hosted-tournaments.md for actual verification and open rollout/physical gates.


13 October SW-017 combined tournament/final-chain/pulse candidate deployed with explicit Pixel authorization and matching service/web rollout.575 tests/70 files/all builds/source consistency,23 isolated DB checks and local built phone/tablet manual chain exercise passed. First final-category Yahtzee50 earns repeated3-roll attempts, +100 success renews, only3 failures ends playerchain; newmanualCompetition version2, oldtables remain1. Livelier accepted score/turn/Yahtzee/full-house effects with reducedmotion and quiet reload/corrections. Pixel install-r preservingdata, exact installedAPKhash/launch; liveweb/backendbytes matched;9rooms/10games unchanged. New two-account tournament/chain/next-day physical acceptance open. Manifest: docs/releases/SW-017-2026-10-13-tournaments-final-chain.md.

13 October SW-018: dedicated account-owned open-tournament list and Exit to your tournaments implemented/deployed to matching backend/web/Pixel under standing update authorization. Paused first, older open tournaments paginated independently of30 recent tables, original host Continue hosting/read-only restore; shared pause stays until explicit host resume.582 tests/71 files/all builds/source consistency passed; APK assets/installed hash/launch and public web/backend bytes verified. No migration, roster/score edits or app clearing. New physical two-account exit/restart/return acceptance open. Details docs/plans/SW-018-open-tournament-return.md and docs/releases/SW-018-2026-10-13-open-tournament-return.md.

## SW-019 manual correction and saved-session return

Manual Standard supports latest own score Undo before another meaningful accepted gameplay action, restoring the score owner turn and open category while retaining score-undo audit/excluded turns. Hosted current-game/revision/seat checks and durable transaction apply. Completed current-game Undo invalidates readiness and removes incomplete game from tournament standings. Other modes/hardware/older archived-game rollback are excluded.

Shared opening/online UI surfaces account-owned Resume saved games & tournaments with Open/Completed labeled, color-coded cards, roster/category counts/turn/game progress. Returning reads same table; host role/guest seat/alias/progress persist, shared pause requires explicit host resume. Stable original invitation remains available. Future chronological achievements exclude undone score targets and excluded turns but retain audit. Physical two-account and cached-PWA activation acceptance remain separate from code/deployment verification; see SW019 handover.
# Current scope amendment — 14 October 2026

The fresh POC supersedes legacy-save/system compatibility requirements in this document: see [owner decision](decisions/2026-10-14-fresh-poc-baseline.md) and [six-sprint scope](plans/SW-023-six-sprint-poc-proposal.md). Reuse current rules/authority where sound, qualify new games/fixtures, and require no import of historical scores. The remaining document records the existing design baseline.

