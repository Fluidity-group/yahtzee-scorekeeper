# SW083: Reporting browser qualification, master landing and web rollout

3 November 2026, America/Chicago. Owner: Dan. Operator: Codex/fluidity.
State: source merged, web published and verified; owner account/results acceptance pending. Phone deployment held.

## Authority and scope

Dan explicitly requests finishing browser checks, making reporting live for the
existing accounts/games, and merging the current source into the main/default
branch so Amber can test. This authorises this task's normal PR landing into
`master`; it supersedes the earlier source-promotion wait for phone acceptance.
It does not declare phone acceptance or authorise phone installation. Phone
deployment stays held. Preserve Amber's active worktree/branch and existing data.

The consolidated candidate is reporting PR #17, above SW081/PR #15 and the older
stack. Master is the integration target; preserve ancestry with a normal PR merge,
green CI and no self-approval, history rewrite, direct source push or settings
change. Superseded stack PRs can close only after landing succeeds; their branches
and pinned release commits remain as records. The shared root is coordination-only.

## Browser verification path

fg-dev's downloaded Chromium cannot start its native sandbox. No sandbox/sysctl or
AppArmor workaround is used. The existing GitHub-hosted runner provides installed
Chrome; `tests/reports-browser.test.js` exercises the actual source with a labelled
synthetic read-only account/history fixture at320/390/1024px, checking layout
bounds, player selection, focus and tournament drilldown. It runs inside the
existing Vitest/engineering gate and retains screenshots/JSON in the existing CI
artifact. The native Chrome sandbox is kept enabled. CI fails if the installed
browser cannot launch; fg-dev explicitly skips this CI-hosted test. No workflow
or required-check configuration changes are made.

An explicit `REPORTS_LIVE_CHECK=1` release run can use the machine-readable record
to check the live Reports password form and pinned build identity in that browser
test. Routine CI remains synthetic and does not depend on a moving production
website. This rollout also ran direct anonymous production/live checks using the
administrator-approved root-owned browser. Neither path signs in or reads player
rows. Actual owner sign-in, table visibility and result reconciliation remain
user acceptance.

## Build, rollout and rollback gates

- Confirm CI browser evidence and inspect screenshots before source promotion.
- Preserve current `gh-pages` commit/tree and verify its live identity/hash before
  replacing assets. Prepare a clean public-only production bundle with the existing
  validated configuration; push and live commentary remain disabled. No secret or
  personal data belongs in artifacts committed to Git.
- Land the approved consolidated candidate normally into master. Prepare release
  assets from that exact clean master revision. Publishing built assets to the
  existing `gh-pages` target is separately authorised by this task.
- Read back every published file/build identity and Pages success; confirm Reports
  and Studio routing and authentication boundary. Do not infer logged-in reporting
  acceptance from a200/index or anonymous form.
- No database migration, room/provider-function deployment, Auth redirect change,
  updater release or native installation is needed. Existing backend pins remain.
- If rollout verification fails, republish the preserved Pages tree as a new normal
  commit. Never reset source history, uninstall phones or clear app/user data.

## Executed evidence

- Consolidated [PR #17](https://github.com/Fluidity-group/yahtzee-scorekeeper/pull/17)
  normally merged on 3 November at22:26UTC; source
  `e083be4e23668c3aed24abb22a8fb1c147c8f476`. No self-approval, direct master
  push, force push, settings change or protection bypass.
- Candidate [CI41730206993](https://github.com/Fluidity-group/yahtzee-scorekeeper/actions/runs/41730206993)
  and [master CI41730756072](https://github.com/Fluidity-group/yahtzee-scorekeeper/actions/runs/41730756072)
  passed:1,521 tests,13 optional camera skips, all configured builds, unchanged
  source during qualification. Source digest
  `cc951b4941cac2d0cf37ea2a6616b47cd8970084427959630bebf99397233138`.
- CI `engineering-evidence/browser-reports/browser-check.json` and six screenshots
  confirm320/390/1024px overall/pattern layouts, selection, keyboard focus,
  tournament detail, read-only fixture calls and no page errors. Synthetic names
  and games only. Local engineering gate passed1,520 tests/14 explicit skips
  (the additional skip is the hosted-CI browser); no local launch was falsely
  claimed for the original blocked browser.
- Home Network subsequently released its Dan-approved root-owned browser under
  `/opt/fluidity/playwright`, with its AppArmor sandbox profile. Using
  `PLAYWRIGHT_BROWSERS_PATH=/opt/fluidity/playwright` and `chromium_sandbox=True`,
  exact production and live Reports/Studio sign-in screens passed at390/1024px,
  matching the pinned identity, without overflow or page errors. No sandbox or
  TLS setting was weakened. The first preview attempt used the wrong base path;
  corrected the preview command to `--base /yahtzee-scorekeeper/` and reran all
  production checks successfully. Application source was not changed for this.
- The production bundle was built from clean merged master using
  `prepare-studio-web.mjs` and the validated existing public-only local config.
  Only allowlisted public configuration is accepted; push/live commentary remain
  disabled.65 assets passed the private-key/secret-key pattern scan, contained
  the Reports entry and no test HTML/environment file.
- A follow-up shell selected the server default Node22. The exact clean
  application source was independently rebuilt with pinned Node24.22.2; all65
  published asset hashes are identical. The clean release-record gate at
  `0f95b42` was rerun with Node24.22.2 and passed all configured checks
  (1,520 tests/14 explicit skips). The original Node22 run is retained as
  non-gating evidence, not represented as the Node24 gate.
- Published via existing asset publisher to `gh-pages` commit
  `f455a9826d353b5937de30895d9773adad3ca508`. Pages reports `built`, completed
  22:30:02UTC. All65 HTTPS file bytes/hash values and build identity matched at
  22:30:29UTC. [Reports](https://fluidity-group.github.io/yahtzee-scorekeeper/?reports=1)
  and [Studio](https://fluidity-group.github.io/yahtzee-scorekeeper/?studio=1)
  show their existing-account password forms. No account password or player rows
  were accessed by the browser checks.
- `game-room/index.ts` remains
  `121948457b46dd0180b3c595563508bdea73f0d7e2c06af5938eb3ddf66750b6`, matching
  the previously deployed v17 source. No function, migration, Auth/provider,
  updater feed or native deployment occurred.
- PRs9–13/15 closed only after verifying their exact heads are ancestors of merged
  master; their branches/pins remain. PR8 was included by ancestry. Amber's PR18
  stays open and targets master; its head `23df125` and her worktree were not
  changed. Any future merge into her branch is hers to do after committing her
  own work. New tasks/PRs use isolated branches from master.

Local evidence lives under ignored `/srv/yahtzee/main/artifacts/sw083/`:
`ci-browser/`, `web-dist-manifest.json`, `live-readback.json`,
`production-local-browser.json`, `live-browser.json`, screenshots and build/
publish logs. Public evidence hashes and exact pins are recorded in the sibling
JSON release record. That file intentionally identifies the deployed application
commit; later evidence-only master commits do not imply a new web deployment.

## Rollback and remaining owner tests

Preserved public rollback tree:
`artifacts/sw083/rollback/pages-repo`, Pages commit
`17182646517759c29f68c29455450d58fb4667a3`, source
`d3f92cc4183ea9a99769d669904eac162265880b`. Its index and identity matched live
before rollout; the full file inventory is in `rollback/manifest.json`. If web
rollback is needed, rebuild/copy that preserved tree to a new isolated publishing
checkout and push a new normal gh-pages asset commit. Do not reset source history
or edit phone data. Rollback has not been invoked or physically exercised.

Dan/Amber should sign in with their existing accounts, confirm their accessible
saved online tables, compare one finished tournament's wins/combined points with
its accepted scorecards, then check each player's patterns under the same rules
contract. Verify coverage warnings on incomplete histories and Refresh reports
after a saved game changes. Local-only native histories are not silently merged
into online reporting; additional import/sync would be separate work. The release-record follow-up ran6 focused routing/lifecycle tests successfully,
plus engineering inspection and diff validation; CI reruns the full gate with
sandboxed synthetic browser coverage. No real account acceptance or complete
historical-data coverage is claimed yet. Phone
installation remains held at the last-recorded build79 on both platforms.
