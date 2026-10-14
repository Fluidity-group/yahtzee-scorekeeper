# SW-023: Six-sprint multiagent software POC proposal

14 October 2026. Product owner: user. Coordinating lead: Codex. Planning reviewers: `poc_software_plan` and `poc_commentary_plan`, read-only expert subagents authorized for this proposal. Agent review is development review, not independent approval.

State: proposed plan and scope, not sprint execution. User selected premium clubhouse and confirmed touchscreen, centered existing-style scoring, secondary drawers and stable anonymous opponent labels. User explicitly added live AI commentary and requested six-sprint multiagent development to POC. Remaining defaults/thresholds and execution decisions are identified below.
Project: SW with Android/browser integration evidence; target G3 bounded software POC. No commercial G4/G5 pass. Current source is the preserved dirty checkout; historical HEAD alone is not the complete baseline.

## Purpose and POC scope

Deliver a dependable recurring manual game night: Android host plus iPhone browser/Home Screen guests,2–8 players, same table across rematches, resumable multi-day tournaments, centered touch score entry, category-specific premium effects, readable anonymous comparisons, history/recap, easier invitations and live original comedic commentary with ElevenLabs Android playback.

| ID | POC requirement | Acceptance method | Actual evidence/state |
|---|---|---|---|
| POC-R1 | Same-account/same-table return, authoritative scores, own Undo, versioned Competition and tournament ceiling | Real devices plus meaningful race/retry/history fixtures | SW-019 historical software evidence; new POC acceptance open |
| POC-R2 | Touch-first centered current-style dialogs; own field dominant; smaller anonymous scores aligned right |2/4/8-player phone trials,320/390px layout, zoom, focus/VoiceOver, readonly peer checks | SW-022 local prototype checks; production open |
| POC-R3 | Bounded premium category effects on new accepted events only | Acceptance/correction/Undo/duplicate/reconnect fixtures; phone motion/performance observation | Prototype only; production open |
| POC-R4 | Account-owned chronology and recap reconcile with corrected history; invitation returns to exact validated table | UUID authorization, paging, Undo/correction/tie fixtures; actual sign-in/recovery/invitation journey | Planned |
| POC-R5 | Accepted event produces grounded caption and optional live commentary without blocking scoring | Synthetic replay, authenticated jobs, provider failure/caps, exact Android streamed playback | SW-021 design only; implementation open |
| POC-R6 | Profanity toggle, independent intensity/frequency, audience-aware freshness, listener mute and memory deletion | Profile/Undo/pause races, exposure records, overlapping/disjoint audience replays, whole-game listening | Planned; retention/defaults unaccepted |
| POC-R7 | Identified reproducible candidate, safe update/recovery and representative completed game nights | Node24 gate, native/backend evidence, browser/native identities, real repeated/next-day games, owner decision | Planned; G3 open |

Required POC insights are category chronology, correction-aware results, points/wins standings and a bounded comparable personal highlight. Optional manual combination logging, expanded trend dashboards and keepsake exports are stretch work, not allowed to displace core acceptance or voice proof. Confirm any stretch selection during sprint planning.

Out of scope: camera/AI dice recognition, BLE/custom electronic dice, Pi/cloud authority merger, fabrication, commercial release, automatic model retraining, microphone/laughter detection, automatic invitation sending, guaranteed infinite joke uniqueness and separate profanity variants for every listener. Remote audio is opt-in, not enabled for every device by default.

## Multiagent execution model

One lead plus at most three active specialists at a time (four available concurrency slots). Roles rotate by sprint/wave; expertise is scoped to current source, primary documentation and concrete fixtures. Research/agent opinions do not replace listening or physical measurements.

Before concurrent implementation, reconcile the intended software baseline. A worktree from historical HEAD would omit substantial current source. Sprint1 read-only reviews may share the checkout; implementation follows isolated `codex/poc-sNN-*` worktrees based on the agreed source snapshot, explicit per-file ownership and sequential integration. Preserve unrelated hardware/source work and secrets.

Lead owns shared `src/prototype.js`, `src/multiplayer/ui.js`, `src/bootstrap.js`, `server/rooms/handler.js`, final build generation, integration and project records unless ownership is explicitly reassigned for a bounded wave. Never let multiple agents edit these files concurrently. Specialist proposals use dedicated new modules/tests and reviewed contracts. Generated `supabase/functions/game-room/index.ts` is built from sources, never patched as authority.

Each agent returns requirements covered, source evidence, assumptions, exact diff, meaningful checks, failures/skips and remaining gates. A second specialist reviews high-risk contracts; lead runs focused integration then the configured gate when qualifying a candidate. Work is not accepted merely because an agent reports completion.

Proposed module ownership, finalized against source at each sprint start:

| Specialist | Dedicated implementation files | Boundary |
|---|---|---|
| Touch UX | New `src/ui/touch-scorecard.js`, `score-dialog.js`, drawer components/CSS and associated DOM checks | Render/callback contract only; lead wires shared prototype |
| Motion | `src/ui/pulse.js`, `pulse.css`, pure celebration selection and relevant fixtures in a dedicated wave | Confirmed-event effects; no authority/rules changes |
| History/facts | New `src/game/history-projections.js`, `live-commentary-facts.js` and pure fixtures | Corrected/Undo/versioned account projections; leave legacy name-based stats isolated |
| Commentary/editorial | New `src/commentary/director.js`, `profiles.js`, replay/memory selection modules and fixtures | No direct provider keys or game command writes |
| Commentary backend | New `server/commentary/` job/access/provider modules, scoped migration if justified and transaction/retry fixtures | Lead approves schema/authority and integrates room handler |
| Android/audio | New native commentary playback module in the inspected Android package plus JS bridge and native lifecycle checks | Exact package path selected after inspection; no unrelated camera/BLE edits |

These are proposed paths, not existing files or granted concurrent ownership. A wave may combine roles if appropriate, always retaining three active specialist slots maximum.

## Six proposed sprints

### Sprint1 — Contracts, baseline and rehearsal

**Player outcome:** the selected phone flow is agreed and current saved games have an evidence-led acceptance path.

- UI specialist: finalize centered count/fixed/keypad dialogs, own/right-hand peer fields, labels, drawers and motion defaults using SW-022. Preserve full scoring functionality, not a flattened mockup.
- Multiplayer/reliability specialist: reconcile reproducible software source/config inputs; freshly confirm actual SW-019 device/web identity when testing is authorized. Close or reproduce Undo, partial paused return, existing cached-client activation and actual member paging. Synthetic fixtures before altering real games.
- Commentary specialist: local repeated-game replay harness and versioned fact/settings/job/exposure/memory contracts. Cover representative rosters/modes, ties, final chains, audience changes, Undo and settings switches. At least10 synthetic games is a proposed starting sample, not user-approved acceptance threshold.
- Lead: approve contracts and named POC reviewers/criteria, integrate baseline, resolve priorities and record unknowns. No provider calls required.

**Gate:** G0/G1 design evidence. Identified supported baseline; UI/authority/audio/privacy contracts reviewable; critical defects/dependencies either resolved or block their dependent slice. Real-device gaps do not become passes through synthetic replay. Choose budget, retention and display/audio label policies before affected live/provider work.

### Sprint2 — Production touch experience and voice audition

**Player outcome:** manual scoring is clear and comfortable; the proposed commentator can be judged by listening.

- Touch/UX specialist: implement shared phone score rows, centered existing-style score modal, read-only anonymous peers, synchronized comparison rail and table/settings drawers.2/4/8 players; maintain hidden-total configuration and server permissions.
- Motion specialist: implement agreed frame landings and category choreography behind existing accepted-event hooks. Bounded layers/particles; quiet correction/Undo/load; OS and explicit reduced-motion controls; cancellation rather than stale celebration after Undo.
- Commentary/editorial specialist: compare complete grounded lines and three suitable licensed voices across supported ElevenLabs model choices. Production settings include profanity Off/On, intensity Playful/Savage/Dark and frequency Highlights/Balanced/Lively as independent axes; defaults remain an owner choice. Prepare identical scripts/facts before requesting capped paid audition authorization.
- Lead: sequential shared integration and internal qualification. UI work can progress if paid audition authorization is pending; voice selection remains open, not waived.

**Gate:** touch/modal and event-effect fixtures pass; input never waits for animation/audio; owner agrees the feel and voice from actual authorized samples. Audition records completeness, pronunciation, quality and billed usage. No listening claim from authored text or a successful request alone.

### Sprint3 — Reliable commentary pipeline and early Android proof

**Player outcome:** one accepted hosted score can produce one factual caption and one well-timed spoken line on the host Android.

- Backend/event specialist: durable idempotent jobs using atomic outbox or durable deduplicating scan; member-authorized job/audio access, server-held keys, rate/cost caps, bounded retry and recoverable crash-after-commit. Provider calls remain outside scoring transactions.
- Android/audio specialist: complete validated sentence → authenticated streaming endpoint → true native streamed playback in Capacitor; prove first audible sample, audio focus, lifecycle, mute and bounded buffering. Existing whole-clip legacy proxy is not a drop-in production stream.
- Editorial/contracts specialist: writer schema/grounding/completeness validation, caption projection, age/profile/game/event/pause checks; host playback lease/epoch and generated/started/interrupted/completed exposure acknowledgments. Production credentials never enter APK/browser.
- Lead: unify score-event/effect/job contracts, SFX/voice priority and native/backend integration. Score success remains independent of commentary failure or budget exhaustion.

**Gate:** exact Android build/device demonstrates one event→one job→caption→audible speech, retries/crash recovery, expired/cross-member access, Undo/profile invalidation and no duplicate host playback. Record cold/warm commit→writer→first byte→first audible distributions and costs. Proposed p50≤1.5s/p95≤3s are experimental goals until accepted; no end-to-end promise from provider inference figures.

### Sprint4 — Game stories, invitations and audience-aware memory

**Player outcome:** players understand their saved game, join/return easily, and hear a developing story across repeat games.

- History/invitation specialist: account-owned paginated chronology, frozen aliases, corrected totals/Undo audit, separate points/wins and shared ties; invitation preview/native share/copy fallback and exact destination return through registration/verification/recovery. No messages sent automatically.
- Commentary/memory specialist: whole-game significance/silence/final announcements, bounded authorized exposure/premise retrieval, transformed callbacks and repeat suppression. Unheard text cannot become a shared callback; actual exposure survives Undo even when event facts are invalidated. New audiences cannot receive private-history details.
- UX/settings specialist: drawer-based commentary controls, captions/recent remarks and optional Funny/Missed/Too far feedback; no interruption at every turn. Forget-commentary-history removes derived caches/summaries without changing score history.
- Lead: shared projection and identity integration; approved retention/policy required before durable personal-memory collection.

**Gate:** UI/history exports reconcile; signed-in older tables discoverable; invitations return to original membership; profile combinations behave; partial exposure, overlapping/disjoint audiences, deletion propagation and cross-account access have meaningful fixtures. Ratings do not imply laughter or automatically escalate profanity/darkness.

### Sprint5 — A complete night, including adverse conditions

**Player outcome:** effects and commentary coexist naturally through full games and tournaments, even with interruptions.

- Multiplayer/reliability specialist: rapid/racing scores, stale confirmations, ties, completion Undo, rematch readiness, pause/next-day return, weak network/retry, cache activation and final chains. Confirm authoritative history invariants across clients.
- Audio/editorial specialist: repeated whole-game listening, relevance/novelty/fatigue, accurate sentences finishing during ordinary updates, interruption only when invalid, immediate mute/profanity-off, host lease changes, no background backlog; speaker/Bluetooth and focus/call transitions.
- UX/performance/accessibility specialist:2/4/8 players on real phone layouts, finger accuracy, text scaling/VoiceOver/focus, drawer/dialog recovery, reduced motion and bounded frame/particle performance. SFX ducks under speech or finishes quickly without holding up commentary.
- Lead: select and qualify candidate; scoped regression coverage and Node24 configured gate/native/backend checks. Stretch metrics/export only if critical scope already meets gates.

**Gate:** complete integrated candidate with identified source/APK/web/backend/model/voice/prompt/profile; material score-loss, authority, privacy or incompatible-audio defects closed. Latency/quality/cost sample results and residual limitations are visible; no “all tests passed” substitution for phone/listening acceptance.

### Sprint6 — Freeze, trial and accept the bounded POC

**Player outcome:** the owner has a dependable, enjoyable manual game-night product to use and evaluate.

- Device/journey specialist: authorized exact-build Android host plus actual iPhone Safari and Home Screen guest, representative2/4/8-player journeys, same-account next-day partial tournament return and actual cached-update activation. Identify additional real participants/devices needed; simulate no unavailable attendance as physical evidence.
- Audio/quality specialist: blind comparable samples and repeated real-game listening; actual event-to-audible latency, naturalness, comedy freshness, shock appropriateness, fatigue and desire to leave enabled. Audio outages leave captions/scoring functional.
- Reliability/evidence specialist: recovery/adverse scenarios, source/dependency manifests, backups/rollback compatibility, recorded limitations, cost limits, retention/deletion and support instructions.
- Lead and product owner: review requirement→evidence matrix and explicit G3 decision. Sprint6 can end with a blocking defect; do not force a POC pass to meet a sprint count.

**Gate:** product owner accepts identified bounded software POC against criteria agreed in Sprint1. G3 does not grant commercial approval, hardware acceptance or blanket deployment authorization. Release/install/publish actions have task-specific authorization and preserve existing games/data.

## Shared contracts and decisions before affected execution

- **Committed event:** room/game/event identity, frozen rules, facts and projection version; immutable score authority; exact correction/Undo validity. Animations consume accepted changes immediately. Commentary uses asynchronous durable work and cannot lock the score dialog.
- **Anonymous view:** stable table-seat display labels B/C…H across category rows, return/rematch; viewer's own field may say You. UUID remains authority/memory key. Proposed shared speech/caption labels use Player A/B/C rather than listener-dependent You, so anonymous comparisons are not undermined by narration. Confirm the exact voice/alias policy before audition/integration; do not rewrite historical aliases.
- **Audio:** table commentary profile controls one generated line; host plays under lease/epoch, other listeners explicitly opt in; captions remain accessible. Per-listener clean variants are later scope. Profanity off invalidates incompatible current/queued/cached captions/audio, including custom text/aliases/fallbacks.
- **Memory:** user-approved raw text/audio/exposure/preference retention and deletion propagation;90-day exposure window is only a prior proposal. Privacy-aware retrieval and sanitized avoid-premise tags, not new-player access to past private games. Application memory, not automatic retraining.
- **Budget/quality:** capped paid audition allowance, per-game caps and retry policy; voice/model and quality rubric by listening; proposed latency goals and representative sample counts confirmed before acceptance collection. Ordinary visual effects, audio frequency and comedy intensity remain separate settings.
- **Update:** existing cached web-client activation verified with pending input/account data preserved; Android packaged assets update via identified APK. No account/app-data clearing as a workaround.

## Risks and completion boundaries

| Risk | Consequence | Mitigation / decision gate | Owner |
|---|---|---|---|
| POC-K1 Dirty baseline or historical worktree | Missing intended code/reproducibility | Reconcile in Sprint1 before concurrent implementation | Lead |
| POC-K2 Cached guest/return gaps | User sees wrong build or loses table continuity | Reproduce/close early; exact-client acceptance in Sprint6 | Reliability |
| POC-K3 Native streaming or voice quality misses | Fast fetch but slow/unnatural audio | Audition2; audible proof3; no dependent whole-game acceptance without it | Audio |
| POC-K4 Provider cost/budget unavailable | Uncontrolled costs or untested voice | Explicit capped authorization; unaffected synthetic/UI work continues | Owner/lead |
| POC-K5 Memory/profile/identity disclosure | Private callbacks or incompatible speech | Retention/labels contract; audience/profile/race tests; server credentials | Commentary/backend |
| POC-K6 Scope expands beyond six sprint capacity | Core acceptance deferred | Required POC scope above; stretch backlog separate; estimate after baseline | Lead/owner |

Cadence and dates are not committed. Set sprint size after Sprint1 source/risk inventory and early audio feasibility. Six sprints define dependency stages, not a guarantee that blockers disappear by the sixth review.

Completion of this task: synthesized two read-only expert planning reviews, read requested live commentary handover/skill and architecture/adaptive settings, reconciled latest touch/anonymous decisions, produced this proposal and companion HTML. No sprint code implementation, paid generation, migration, deployment, new chat or physical acceptance occurred. [Readable six-sprint brief](../reviews/2026-10-14-six-sprint-poc.html), [interactive touch prototype](../reviews/2026-10-14-clubhouse-pulse.html).

Document checks: both HTML local links and inline script syntax passed in `artifacts/sw022-motion-review/proposal-check.json`. Six-sprint brief rendered on desktop and390×844 viewport; six stage cards present,375px document within390px viewport. Print control/CSS provided without claiming exported PDF qualification. No application engineering gate rerun for planning/documents only.
