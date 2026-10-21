# SW-051: Two-tournament rivalry analytics

Date: 21 October 2026. Owner/reviewer: Codex (development self-review).
State: read-only analysis and interactive review verified; app enhancement proposed, not implemented or deployed.
Baseline: SW050 e17d972; scoped branch codex/sw051-rivalry-analytics. No hardware, scoring, authority, migration or deployment changes.

## Purpose and requirements

Investigate the owner's two completed 12-game tournaments, identify useful game/tournament/player insights, and distinguish accepted scoring chronology from physical dice observations. Preserve accounts, settings, membership and all game data. Use authenticated account identity across frozen aliases, not name-keyed grouping.

## Evidence and definitions

Read-only Supabase SELECT snapshot collected 2026-10-21T16:45:42.875Z. Both tables completed 12/12, revision359; 24 archived games. Account identity maps Keith/Rollin and Amber/Mamdami/Malvin across the two tournaments. Raw records and reproducible investigation scripts remain ignored under root artifacts/sw051; no credentials or raw datasets are committed. The local review embeds normalized aggregate data and individual final scores; it is not published publicly.

All 24 score timelines reconcile to final sheets. Audit contains625 category score events,11 corrections and1Undo;624 surviving entries equal24×2×13. Final corrected category values drive category comparisons. Count nonzero Full House/Yahtzee boxes, not natural rolls or success per attempt: zero individual roll observations exist. Repeat bonuses are reported separately.

Pace is the interval from the preceding accepted category entry to the current one within a game, attributed to the current entry's player. First entries, inter-game gaps, undone entries, corrections and standalone bonus reports are excluded. At the default five-minute cutoff,598 of600 intervals remain. Median is24.4s Keith (301 intervals),23.7s Amber (297). Excluded gaps:19h20m48s and5m29.5s. These include thinking, rolling, conversation and input. They cannot establish rolling speed or precise app sessions.626 of627 completed turn records have identical start/end timestamps because manual turns start at score submission; do not build duration rankings from those records.

Opening checkpoint compares each player's first three surviving category entries at equal box counts, using final corrected values and excluding repeat bonus points. It is retrospective, not a contemporaneous real-time lead. Full game wins include all bonuses. No tied games occur in this sample; retain shared-win handling in eventual app implementation.

## Measured findings

| Metric, 24 games | Keith / Rollin | Amber / Malvin |
|---|---:|---:|
| Game wins |10|14|
| Total points |5,590|5,561|
| Mean score |232.9|231.7|
| Best score |411|294|
| Upper bonuses |8|15|
| Nonzero Yahtzee boxes |11|4|
| Extra Yahtzee bonus points |200|0|
| Nonzero Full House boxes |22|21|
| Opening-three lead |14|10|
| Opening leads converted |8/14|8/10|
| Wins after trailing at checkpoint |2|6|
| Wins with final margin ≤20 |2|4|

Amber wins both tournaments7–5. First cumulative points:Keith2,887/Amber2,853. Second:Keith2,703/Amber2,708, just five points apart. Population score spread54.5/41.7 describes variability, not superiority. The one-game Full House difference is too small to justify a skill claim. All trends describe this two-player sample; no causal or predictive claims.

## Proposed app delivery

1. Game wrap-up: equal-box opening/comeback card, final margin and bonus contribution; entry-gap distribution with retained sample count and explicit pause filter. Keep next-game action first.
2. Tournament wrap-up: separate games-won and cumulative-points champions, animated game-by-game score lines, bonus battle and close finishes. Reduced-motion alternatives and exact-value access remain available.
3. Player history: authorized cross-table account history across aliases, category conversion and recent form. Current insights load one table; add a paginated membership-checked history route rather than joining by names or shipping service-role access to clients.
4. If exact session timing is wanted, separately add lightweight foreground/background/reconnect instrumentation with documented retention. Do not reinterpret missing manual observations as failed rolls.

These are the recommended next implementation stages, not an app release completed by this analysis. Existing live scoring/tournaments/settings remain untouched. Preserve no-Joker/frozen-rule differences and final-chain/Undo contracts during any later integration.

## Acceptance and verification

| Requirement | Method | Actual evidence | State |
|---|---|---|---|
| All24 games accounted for | Read-only archive query, timeline reconciliation and full13-box counts | analysis-private.json and per-table analyses in ignored artifacts/sw051 | Verified |
| Stable identities across aliases | Account UUID comparison | Two matching account IDs across both rooms | Verified |
| Honest timing/category provenance | Audit event types and turn timestamps |0rolls;626/627zero duration;600entry intervals | Verified |
| Interactive mobile report | Headless installed Chrome, Node24.19.0/Playwright |320/393/1060px, no horizontal overflow/page errors; three scopes/cutoffs, game picker, replay, reduced motion | Verified |
| No live mutation | SELECT-only management access; local docs-only diff | No runtime/cloud/device changes | Complete |
| Integrated in-app analytics | Future feature regression tests and configured release gate | Not part of current analysis | Proposed |

Interactive artifact: ../reviews/2026-10-21-two-tournament-analytics.html. Browser evidence: root artifacts/sw051/report-verification.json and report-393.png. Default bundled headless browser was unavailable; validation used installed Chrome instead. No full engineering gate was run because this is a documentation/report change, not a release candidate. Owner review remains open.

## Risks and decision

Main risk is misleading timing or combination skill claims; closed for this report through explicit denominator/provenance, gap-filter controls and session limitations. Small sample conclusions remain descriptive. Report contains owner game outcomes: keep local unless publication is explicitly requested. Next decision is which measured cards to integrate into game/tournament wrap-up before building an overall account profile.
