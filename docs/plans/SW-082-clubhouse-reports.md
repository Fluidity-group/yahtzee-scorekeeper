# SW082: Overall tournament results and player patterns

3 November SW083 follow-through: browser qualification passed, PR #17 is merged into master and reporting is live on the existing Pages website. The former browser blocker below is historical. See [SW083 release](../releases/SW-083-reporting-web-rollout.md) for exact source/assets, CI, rollback and owner-acceptance boundaries. Phone deployment remains held.

3 November 2026. Owner: Dan. Implementer/self-review: Codex/fluidity. Isolated `codex/sw082-clubhouse-reports`, base `11852da` (SW081/PR #15). State: implemented and automatically qualified; browser/live-account acceptance pending. Owner approves the reporting concept, existing accounts/saved games, tests and PR; phone deployment stays held. Amber's worktree/branch are untouched.

## Scope and contracts

A browser Reports route (`?reports=1`) offers overall tournament results, independent points/most-game-wins honours, combined recorded scores and player scoring patterns. It reads the existing authenticated sessions/history/read API, with full pagination and per-table revision checks. No database migration, privileged credentials, backend deployment or counter updates. No write operation is issued by reports. Sign-in uses existing accounts; local-only device records are not silently merged by player name.

Identity is account ID, labels are recorded aliases. Deduplicate games by ID/latest revision; overlay the current game so an Undo-reopened result is excluded. Count unique completed tournaments won once for either honour (ties included); preserve independent title counts. Unverified/incomplete completed tournament histories do not become zero losses or confirmed awards. Complete games in ongoing tables may contribute game statistics, with the scope stated.

Descriptive combined points may span modes. Averages, trends, categories, first-five choices and consistency require one exact frozen rules contract, source and solo/group class. Peer comparison uses opponents in the selected player's same games. Manual accepted-entry chronology does not establish physical rolls, thinking time, luck or personality. Order metrics require full per-category/bonus reconciliation, not merely equal grand totals; absent dates/history stay unknown and denominators remain visible.

## Acceptance

- R1: existing-account password/approved OTP sign-in; auth change/sign-out/disposal/late reads cannot restore prior private reports; same-user token refresh preserves the current report. No auth-backed work inside the auth callback.
- R2: all authorised session/history pages load with bounded concurrency, advancing cursors and explicit failure; changed room revisions, stale sessions and unavailable older history are surfaced without claiming complete partial totals.
- R3: overall results combine valid completed snapshots/tournaments, preserve ties/separate honours and participation denominators; ongoing/reopened/duplicate/invalid records have correct exclusions and coverage.
- R4: player patterns show score trend, recent/prior sample sizes, upper-bonus conversion, zeros, category averages and accepted scoring position with exact rules and matching peer cohort. Missing chronology/dates never become fabricated facts.
- R5: responsive accessible desktop/phone-browser reports, keyboard filters, readable charts with exact tables, manual refresh and empty/loading/error states. Browser Home/menu navigation makes reports discoverable. Score replay authoring and predictive/personality metrics are outside this slice.
- R6: meaningful model, pagination/auth-race, UI and routing regressions, then clean Node24 full gate. No phone build/install, public web/backend/update-feed deployment or master promotion.

## Evidence and remaining gates

Design source: approved Clubhouse desk / Phone companion mockups with labelled synthetic games. Existing source analytics and schemas were reviewed; a read-only aggregate coverage request was sent to Home Network. No live player rows or private app containers were read. Implementation/tests and exact qualification evidence will be recorded here. Real existing-account browser acceptance and any later rollout remain separate owner decisions.

## Implementation and focused evidence

Implemented pure report aggregation and full-category chronology verification in
`src/reports/model.js`/`history.js`, an account-fenced paginated loader, responsive
view/controller/entry and browser Home/menu/Studio links. Existing room endpoints
and records are unchanged. Same-user token refresh and height-only resize preserve
chart nodes; actual account changes and pagehide retire private state. Rule keys
use full canonical contracts rather than names or hashes. Missing sequence gaps,
unavailable archives and incomplete completed tournaments remain explicit.

Focused final run:117tests/13files passed (including56new reporting cases and
adjacent transport/account/Studio/tournament/idle-screen checks). Final full Node24 gate passed; see exact evidence below. Evidence under ignored `/srv/yahtzee/main/artifacts/sw082/` includes
`focused-final.log` and the synthetic browser harness/driver. No real account
history was fetched during development.

Actual Chromium visual checks could not start: fg-dev denies the browser's native
sandbox/user namespace. The project-local browser was launched with its sandbox
intact, and no --no-sandbox/system configuration workaround was used. A vetted
runner was requested through fluidity-msg; `browser-check-blocked.json` records the
limit. Viewport320/390/1024 checks/screenshots remain pending, not passed. DOM and
routing tests cover both browser entry and exclusion of native reports activation.

Remaining: review PR, approved web rollout and real existing-account
browser acceptance. Phone deployment and physical acceptance remain held. No
independent review, default-branch promotion or production readiness is inferred.

## Final qualification and completion

Clean `8653b59206a6e1608f9450be8c29e0272f55156f` Node24.15.0 full gate: **1,520 tests passed,13 optional camera skips, all configured web/native-web/Edge builds passed, source unchanged**. Source digest `17b36ffa14afc91978613b497d3c388edc17592d3ff02452fc1d9575439df6e7`. Evidence: `artifacts/engineering/2026-11-03T22-07-34-771Z-a9496b21/report.json`. Later changes record documentation only.

The requested overall-results and player-patterns source implementation is complete.
Manual browser visual/live-account acceptance remains open because the native
Chromium sandbox cannot launch on this host. No screenshots or physical acceptance
are claimed. Full-suite/code checks, read-only/auth-race regressions and documented
coverage pass; this does not authorise deploying the prepared source or phones.
