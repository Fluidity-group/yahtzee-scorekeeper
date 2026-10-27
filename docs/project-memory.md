# Dice Clubhouse / YAHTZ project memory

Updated 27 October 2026 by SW068. This file holds current intent and durable contracts. Use docs/status.md and identified release records for verification/deployment facts; inspect actual devices freshly. Earlier memory revisions are preserved in Git and dated task records.

## Current work and source

- Owner asks Codex to act as project architect and review code/design before the next Android/iPhone test. SW068 is an advisory review and skills/memory maintenance task; application fixes are recommendations, not implemented changes. See [review and next-build checklist](plans/SW-068-architecture-phone-readiness.md).
- Published baseline on 27 October: master d3d8037. Application code is identical to qualified SW066 db094a4 and SW067 installation source 06db45a. The subsequent commits record publication/phone updates and repository rules. Work on a scoped branch; never push to the default branch or merge/approve agent work.
- On fg-dev use the repository at /srv/yahtzee/main. The Windows integration path C:/Codex/Yahtzee Game/artifacts/sw066/source applies only on that workstation. Its older dirty root and previous Amber sample remain preserved; do not copy old app files over current source. Read the core integration handover with its latest dated override.
- Dependable manual scoring, solo/shared-phone games, authenticated online games and tournament continuity on Android/iOS come first. Camera, live voice, push delivery, shared venues/synchronized events and generated/account-synced portraits remain deferred. Historical commentary implementations/tests do not authorize reactivation or paid usage.
- SW068 reproduced three open gaps: cross-account room-session invalidation, stale writes during recovery-only persistence, and manual config accepting push enabled. Existing baseline checks pass despite these gaps. Fix and regress them before the next candidate; retain separate physical acceptance.

## Latest recorded evidence

- SW066: independent UI review/fix recheck and clean Node 24.19.0 gate at db094a4, 1,192 tests passed/13 optional camera skips/all builds. SW067: both same-ID native packages installed/launched on 24 October, with 46 matching public assets. No public-web/backend/database deployment accompanied SW067.
- Full SW067 account/tournament return and two-phone played-game acceptance remain open. SW065 owner's account/tournament visibility observation applies to its earlier build, not automatically SW067.
- Last recorded iPhone development profile expires 28 October 2026 at 14:09 America/Chicago. No current signing/device state is inferred from that date.
- SW068 freshly reran the clean published baseline on fg-dev using existing Node 24.15.0 and locked root/Pi installs: 1,192 passed/13 optional camera skips/all configured builds/source stable. Disposable PostgreSQL history/authority 24 and social/invitations 22 checks passed. Three additional synthetic probes expose the open findings above. See SW068 for evidence and untested boundaries.
- Node 24 is required; do not change the host's global Node selection. Use an explicit existing Node 24 runtime. Dependencies/build success do not establish installed phones or live cloud state.

## Manual phone packaging and data preservation

- Both phones use the shared manual-test web assets currently selected by MODE=ios-test. That name also applies to the qualified Android manual package; ordinary build:native is a different behavior path.
- Use scripts/prepare-ios-test.mjs and validated public-only phone configuration. On Android sync those prepared assets and preserve them with build-android.ps1 -SkipWebBuild. Freshly check the effective push flag is false and commentary endpoint empty; the validator's push gap is open in SW068. No real phone configuration was inspected during this review.
- Retain com.fluiditygroup.diceclubhouse.dev, existing signers, accounts, app storage, table UUIDs/seats/rules/history. Never uninstall or clear data to work around signing or login. iOS requires a fresh Mac/Xcode signing/build check; Linux web compilation is not a signed phone build.
- Native installation, public web, backend/database and owner gameplay are separate targets. A review/build task does not authorize live deployment or scoring commands. Do not reinstall just because a new chat starts.

## Rules and authoritative state

- Auth UUID owns membership and analytics; email/nickname are labels. Historical aliases remain frozen. Member return reads the same room/game/seat and never silently resumes a paused tournament or replaces the roster. Existing members can return after invitation admission expires.
- Hosted commands require authenticated ownership, exact current game and revision, legal actions and idempotent receipts. Commit room, archive and receipt atomically. Edit shared/server source and regenerate edge bundles; generated edge files are not independent source.
- Latest own completed-turn Undo is supported across current modes/sources until another completed scoring/bonus turn supersedes it (SW040), with audit retained and following unscored observations excluded. Completion/readiness/standings are invalidated as appropriate. Historical Standard-only SW019 restrictions are superseded.
- Competition rules are frozen per table. Current new manual Competition v2 uses no Joker; either a first or repeat Yahtzee filling the final category opens three-roll bonus attempts (SW049 supersedes SW048). Each success adds 100 and renews the attempt. Aggregate failed-attempt finish requires the server capability. Preserve existing v1/v2 rule snapshots, including stored joker:true; never retrofit old games.
- Standard retains versioned Joker/bonus rules; Accumulative retains face-weighted Yahtzees and extra turns. Corrections change category points without replaying historical turns or silently revising granted bonuses.
- Tournaments fix mode, roster and game ceiling. Tied winners share wins. Cumulative points and games-won honours are independent; count a completed tournament trophy once for either honour, ties included.
- Finished snapshots and accepted corrections/Undo drive analytics. Personal Best and Razzie compare exact rule contracts and completed online games. Manual category entries do not observe all physical rolls or thinking/turn speed; missing observations are unknown.
- Sensor/camera observations remain reviewed proposals, never player authority. Pi local authority and hosted rooms remain separate. Physical camera/electrical/CAD evidence cannot be inferred from synthetic tests or generated files.

## Approved experience and later commentary intent

- Keep YAHTZ branding, Dan/Amber credits and the exact slogan recorded in SW057. Midnight Casino/noir city/preset-avatar styling supersedes older no-casino proposals. Four mode choices are direct actions, not random selection or gambling. Preserve compact readable own-seat scoring, comparison access, explicit confirmation, Home/Resume, reduced motion and quiet accepted scoring.
- Cities, preset avatars and mute are device preferences; do not present them as shared tournament settings. Photo previews remain local and are not generated portraits. Fictional lab accounts/history must remain labelled and excluded from release startup.
- Deferred commentary intent: optional player-blurb personalization, compact original dark/adult humor, independent profanity/intensity/frequency/voice, actual heard-line memory and feedback without automatic escalation or training. Latest recorded default is Rachel; older Victor/Gretchen auditions are historical.
- Owner commentary retention policy is 90 days with expiry and Forget history for commentary derivatives, without score deletion. Respect UUID/audience/source permission and actual shared exposure. Provider request budgets, audio lifetime, audible latency and commercial clearance require their own evidence; prior audition allowances are not reusable authorization.

## Reading routes

- Current state: docs/status.md; SW068 review; handovers/2026-10-24-core-manual-integration.md; releases/SW-067-core-manual-phone-update.md.
- Hosted development: .agents/skills/manual-multiplayer/SKILL.md, multiplayer-development.md and current versioned SW task. SW019 handover is historical contract/evidence context.
- Architecture and controls: architecture.md, engineering-governance.md, engineering-workflow.md, projects/software.md and projects/integration.md. No independent/commercial gate follows from Codex self-review.
- Deferred commentary: .agents/skills/live-commentary/SKILL.md, SW026–SW036 implementation/retest records and handovers/2026-10-14-live-ai-commentary.md for original intent. Planning language in SW021 is not current implementation status.
- Deferred camera: decisions/2026-10-01-camera-platform-sequence.md and c121-software-handover.md; physical acceptance remains separate.
