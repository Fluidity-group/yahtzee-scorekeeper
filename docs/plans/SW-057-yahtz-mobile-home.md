# SW-057: YAHTZ mobile Home review

23 October2026. Owner: Amber/Dan, requested through17 browser annotations. Engineering Codex. Branch `codex/amber-ui-lab`, baselinebcde91d. State: implemented and automated gate passed; visual/device review pending. No main promotion or live-account mutation.

## Annotation mapping and design

- Comments1/14: one YAHTZ heading and exact requested slogan: `this one cool game that local game-makers don't want you to know about!!!!`.
- Comments2/3/5/13: remove old Home brand, kicker and duplicated intro. Contextual delete is interpreted as deleting those redundant elements, not the whole functional Home. Theme toggle replaces hamburger position; full game controls remain accessible through settings/More.
- Comments4/6: `Dan and Amber Present...` credits in the cover. Flat city illustration, static glitter/star details and selective neon; no flashing, perpetual motion or unlicensed art.
- Comments7–10: top ribbon: actual player name/stats, location/venue, game settings and explicit light/dark control. Profile displays account-owned completed-game count, trophies and past opponents; avatar choice remains within profile and directly on the cover.
- Comments11/12: static slot-machine cabinet contains four deliberate mode buttons, not random game selection or a gambling mechanic. Preserve Solo/shared-phone/Online/Tournament actions. Tournament adds explicit Create/Join/Return choices using existing authenticated routes; no roster, membership or readiness shortcuts.
- Comments15/16: selected avatar stays on the cover as an actionable button; original illustrated faces receive harder noir planes and ink detail rather than generic glossy portraits. Final illustration quality remains subjective review.
- Comment17: larger Resume name/action and readable supporting text. Compact composition prioritizes controls/modes and avoids duplicated large secondary cards; trophies/people stay accessible below mode choices.

## Functionality and data boundaries

SW055 trophies/people preserved. Added completed-game count from the same deduplicated, account-owned finished snapshots; never sum opponent encounter counts, which would overcount multiplayer games. Explicit sample profile remains labelled in the lab. No auth/account-name rewrite, new backend schema, location synchronization or generated-photo claim.

Found stale in-game bonus guidance over Home in supplied screenshots. Home now clears its transient notice/timer on entry while retaining game state, scores and pending game authority. Late history results retain existing view/generation fences. Persistent appearance preference is respected; ribbon theme label updates with the actual theme.

## Acceptance

| Requirement | Check | State |
|---|---|---|
| Exact copy, old duplicate branding removed, single top ribbon | Rendered DOM assertions | Passed |
| Four mode controls, profile/persona and tournament create/join/return | Real UI flow + explicit join landing regression | Passed |
| Readable Resume, no nested controls, mobile-first constrained grids | DOM/stylesheet checks; manual320/393/448/714px and both themes | Manual review pending |
| Account statistics / sample honesty / no stale bonus toast | Identity reducer + flow regressions | Passed |
| Existing game rules and flows | Focused regression plus configured gate as appropriate | Passed:1,168 tests/13 optional camera skips/all builds |

Browser observation was denied earlier in this chat; use DOM/source/HTTP evidence without circumventing it. Actual visual geometry, screen fit and subjective artwork quality remain Amber's review. Do not claim a screenshot or physical phone inspection was executed.

## Completion evidence

51 focused checks passed in `artifacts/sw057/focused-checks.json`. Stable Node24 configured gate passed at `artifacts/engineering/2026-10-24T03-43-17-960Z-97397524/report.json`:1,168 tests passed,13 optional camera skips; web/PWA, native web, iOS-test web, commentary and room builds passed. Source was stable throughout the passing run; record-only documentation updates follow. An initial run was deliberately interrupted after its tests passed so the final run followed completion of the tracked live-reload diagnostic. Existing mixed-import/jsdom canvas/navigation limitations remain reported. No full browser/phone or physical multiplayer acceptance implied.

The stopped lab server was relaunched; root page, transformed modules, blank cloud configuration and protected UUID entry/HMR checks passed through the LAN address.17 annotations are one scoped design change, not17 independent rule changes. Root/room scoring and membership authority remain unchanged; the only multiplayer route addition explicitly selects the existing join form after sign-in. Local device/theme/avatar settings preserved. No photo provider calls or production data writes, device installs, main promotion or public deployment.
