# Dice Clubhouse project memory

Maintained 14 October 2026. Durable context and routing, not live device state. `status.md`, project controls and exact task/release records own evidence. Update this file when intent or contracts change; keep proposed ideas separate from accepted requirements.

## Working relationship and active intent

The user owns the product. Codex leads software architecture, implementation, records and verification. On 14 October the user requested researched expert subagent input, project skill/memory maintenance, a candid product/UI assessment and an HTML next-stage report. This authorizes the current advisory/maintenance work; it does not establish standing permission for future delegation, deployments or messages to players.

Current manual sprint: Android host plus iPhone browser guest; same-account/same-table rematch and multi-day tournaments. No camera/AI work in this sprint. Next operational acceptance is SW-019 own-score Undo and a partially scored paused tournament returning from both original accounts. Existing games are not disposable fixtures.

## Recorded baseline

- Workspace `C:\Codex\Yahtzee Game`; Node24.19.0; observed HEAD `e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc`, branch `codex/sw017-hosted-rematch` on 14 October. Large dirty checkout preserved; not a reproducible commercial source release.
- SW-019 records 624 tests/76 files, configured builds and unchanged software-source capture; 24 disposable PostgreSQL checks. These are historical qualification results, not rerun by this advisory task.
- Backend/web publication is byte-verified in SW-019 records. Pixel SW-019 install-r, installed hash and MainActivity launch are recorded as successful. The earlier “APK not installed” entry describes an earlier checkpoint; the subsequent Pixel follow-up supersedes it.
- Existing iPhone/PWA cache activation, actual signed-in paging and two-phone Undo/partial tournament return remain open. No fresh live-state inspection is implied by this file.

## Non-obvious product contracts

Account authority follows Auth UUID, never email/nickname. Historical aliases remain frozen. Return preserves original room, roster, host, seat, game and pause. Standard manual Undo retains audit events and rejects cross-seat/stale commands. Analytics excludes undone score targets and incomplete games from awards, with correction-aware totals. Competition v1 remains frozen; new manual Competition v2 includes final-category first-Yahtzee bonus attempts. Tied game winners share wins; points and wins have separate standings.

Manual category scoring does not observe physical rolls or elapsed decision time. Future combo logging is self-reported and separate from scoring. Future nickname edits apply to future snapshots. Share-sheet/email/text drafts are proposed; sending needs explicit user authorization.

## Routing and proposals

14 October latest steering: user confirmed smartphone touch, centered current-style score dialogs, optional drawers/submenus and small same-row opponent score fields to the right of own larger field. Opponents use stable anonymous labels (B/C/D…); these are display labels, never account keys. SW-022 prototype updated accordingly. User explicitly requested live AI commentary included in scope and a proposed six-sprint multiagent path to POC. [SW-023 coordinated proposal](plans/SW-023-six-sprint-poc-proposal.md) combines the manual/UX and SW-021 commentary tracks, preserving separate qualification and authorization gates. This is a proposal, not sprint execution or paid/deployment approval.

- SW-021 main-chat handover: [live AI commentary](handovers/2026-10-14-live-ai-commentary.md). Repository `.agents/skills/live-commentary/SKILL.md` preserves adult/dark humor intent, independent profanity/intensity controls, factual authority, streaming and exposure-aware cross-game memory. Product-change and AGENTS route to it. Skill setup is not a persistent agent or model training; runtime integration remains unimplemented. Next proposed slice is synthetic repeated-game replay/settings/memory, then voice audition and Android streaming proof.

- SW-021 humor follow-up: user explicitly permits dirty/shocking/dark humor and requests profanity enable/disable plus freshness across games. Do not mistake the original friendly-only proposal for a ceiling. [Adaptive design](plans/SW-021-adaptive-humor-design.md) proposes independent language/intensity controls and persistent audience exposure/premise/preferences memory; this is application adaptation, not automatic model training. Not implemented or listening-tested.

14 October UI follow-up: user selected premium clubhouse (glowing colors, satisfying pulses, special big-score moments). [SW-022 motion review](plans/SW-022-premium-clubhouse-motion-review.md) and [interactive Pulse Studio](reviews/2026-10-14-clubhouse-pulse.html) audition category signatures, intensity, accents, optional sound and reduced motion. These are local design proposals; detailed owner agreement precedes the requested production sprint. Preserve SW-021 commentary planning and existing SW-019 acceptance. No deployment authorization follows from an audition preference.

- SW-021 separate research workstream: user requested expert research for live comedic score commentary and ElevenLabs Android integration. Original dry/conversational character, misdirection and game-grounded teasing proposed from user comedy preferences. [Plan](plans/SW-021-live-comedic-commentary.md) and [reusable expert prompt](plans/SW-021-commentary-expert-brief.md). Legacy prototype and prior refinement brief inspected; original successful test chat not located. No implementation or measured audio acceptance. This request scopes AI commentary research separately from manual sprint; it does not change outstanding SW-019 acceptance or authorize deployment/paid voice generation.

- Current handover: [manual multiplayer](handovers/2026-10-14-manual-multiplayer-tournaments.md).
- Wider pending scope: [SW-017 sprint](plans/SW-017-sprint-design.md).
- Current rollout: [SW-019 manifest](releases/SW-019-2026-10-14-undo-session-return.md).
- Hosted workflow: `.agents/skills/manual-multiplayer/SKILL.md`.
- Advisory outcome: [SW-020 record](plans/SW-020-product-direction-and-project-memory.md), [HTML review](reviews/2026-10-14-product-direction.html).

Recommended direction is a dependable recurring social table: accept return/Undo, address safe web update activation, improve invitation/return clarity, then deliver correction-aware chronology before optional metrics and richer highlights. Mockups, navigation changes, targets and sequence in the review are proposals, not implemented or accepted product contracts. Hardware/AI stays a separate workstream.
