# INT-004: Streaming and community integration advisory assessment

Date: 1 October 2026. Owner: product owner. Prepared by: Codex. Independent reviewer: unassigned.
State: advisory research delivered; integration designs proposed; implementation, verification, deployment and physical acceptance not started.
Project and gate: INT with SW/HW dependencies; input to G1/G4, no gate passed.
Baseline: preserved current working tree, documented camera-first direction and prototype authority/roll contracts. No source changes.

## Purpose and requirements

Assess commercial uses of live physical dice results and identify integration design work. Scope includes OBS, Twitch, Discord, community/event uses and later VTT expansion. Excludes implementation, outreach, deployment and changing accepted commercial scope.

| Requirement | Observable criterion | Method / actual evidence | State |
|---|---|---|---|
| INT-004-R1 | Identify users, spectator value, commercial models and unproven demand | Ranked opportunities and proposed validation in ../streaming-community-opportunities.md | Advisory delivered |
| INT-004-R2 | Locate existing coverage/gaps and propose integration design homes | Reviewed architecture, status, SW/INT control, prototype and camera design; documented five proposed design files | Advisory delivered |
| INT-004-R3 | Preserve authority, corrections, privacy and recovery | Proposed public projection, deduplication/snapshot, explicit publishing and inbound request separation | Proposed contract; review open |
| INT-004-R4 | Distinguish current five-d6 capability from broader markets | Camera and native acceptance limits, polyhedral/VTT dependencies and competitive evidence recorded | Advisory delivered |
| INT-004-R5 | Support platform/competitor claims with primary sources | Seven linked sources checked 1 October 2026 | Documentary research only |

## Design and impact

Recommend common accepted-event publication contract and OBS browser overlay first, Discord summaries second, Twitch interaction after demand evidence. Proposed document is the advisory source, not an approved implementation contract. Preserve existing game rules, camera review and hosted/Pi authority boundaries. Broader dice types require separate recognition/physical qualification. No accepted product requirement or pricing changed.

## Risks and execution bounds

| Risk | Consequence and rationale | Mitigation / closure | Owner / state |
|---|---|---|---|
| INT-004-A | Recognition/setup friction defeats creator value; physical acceptance open | Qualified camera pilot and measure review effort | SW/HW / open |
| INT-004-B | Unconfirmed/stale/duplicate output misleads viewers | Reviewed event contract and recovery/correction tests | SW/INT / open |
| INT-004-C | Viewer requests bypass player authority | Separate authenticated request queue; host confirmation | SW/INT / open |
| INT-004-D | Demand/pricing assumed from technical feasibility | Interviews, repeat-use and willingness-to-pay evidence | Product owner / open |
| INT-004-E | Public feed exposes identities/secrets/private rolls | Allowlisted public projection, revocation and independent privacy/security review | Product owner/SW / open |
| INT-004-F | Vendor licence or platform dependency blocks distribution | Current rights/policy review before public distribution | Product owner / open |

## Completion and decision

TikTok follow-up research delivered in ../tiktok-dice-live-opportunities.md: platform revenue mechanisms, viewer format hypotheses, vertical overlay route and six-session exploratory pilot. Official sources linked; account eligibility and actual broadcast route unverified. No implementation or pricing decision. File existence/content checked; no software tests for this documentation-only follow-up.

Delivered ../streaming-community-opportunities.md; linked SW/INT backlog and status. Documentation checks only; no software or physical tests warranted for this advisory-only change. Pre-existing changes preserved, nothing staged or committed. No live integrations or outreach. Next action: product owner reviews the OBS-first recommendation; a separate task can design the public event contract and simulated overlay. Proposed pilot thresholds, pricing direction and new commercial scope remain unaccepted; G1/G4/G5 not passed by this work.
