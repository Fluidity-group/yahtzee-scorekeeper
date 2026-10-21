# SW-052: phone multiplayer readiness and upper-total alignment

21 October 2026. Owner: Codex. State: investigation/implementation; test builds and device gates pending.
Baseline: SW050 runtime e17d972 plus SW051 documentation. Scoped branch codex/sw052-phone-multiplayer-readiness; no pre-existing root changes are overwritten wholesale.

## Requirements

- R1: Own upper total is centered in the own-score column, including a secured bonus, without widening opponent fields or repeating totals.
- R2: Android/iPhone/web users can host, join via link/code and start only with the fixed tournament roster present. Existing membership and saved state survive return.
- R3: Addressed invitations require explicit recipient acceptance; play requests require explicit readiness. Links/alerts navigate, never mutate membership, scores or pause state.
- R4: Prepare current Android/iOS test artifacts; separate successful compilation, signing, installation and physical acceptance. Preserve all existing accounts/tournaments/settings.
- R5: Synchronize applicable skills, engineering status, build manifest and next-chat handover to actual evidence.

## Reproduction and diagnosis

Screenshot4249 shows own upper total right aligned. Source upper summary uses a two-column spanning header and explicit justify-content:flex-end, so it cannot align to the score-column center. Replace the spanning layout with semantic label/value cells and center the value within its own column.

Native shared-link investigation: generic native/HTTPS links have no destination kind; prototype routes every non-invitation destination through member-only read. A first-time guest cannot read before joining and is returned to home. Distinguish join links from existing-member play/ready destinations, preserve intent through sign-in, and use existing explicit join form/authoritative seat checks. Email-invite links retain acceptance flow.

## Verification plan and execution bounds

Reproduce layout on actual local app and link routing with regression fixtures before fixes. Cover own/peer totals, earned/hidden bonus, shared-link joins, existing paused member return, invite acceptance, host/join/start and roster-full start gate. Run focused checks, then Node24 configured gate and native compilation. Use fictional fixtures/disposable database checks for mutations; real tables are read-only. No new real invitations, phone alerts, cloud rewrites, clearing app data or public release implied by build preparation.

Android/iOS builds use existing public-only manual test configuration, voice deferred/push off. Mac reachability, signing identity and physical iPhone are freshly inspected. No signing identity, unavailable Mac or absent phone must remain an explicit installation gate. Update this record with actual results before declaring ready.

## Risks and completion

Primary risks: confusing shared join links with member-return notifications; totals drifting when bonus ribbons appear; claiming iOS readiness from web assets alone. Mitigate with intent regression tests, geometry checks on phone widths and separate native artifact/signing/install evidence. Codex self-review is development evidence; owner two-phone acceptance remains required. Full qualification and build identities pending.
