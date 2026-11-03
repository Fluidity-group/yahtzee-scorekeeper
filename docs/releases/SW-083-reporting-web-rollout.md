# SW083: Reporting browser qualification, master landing and web rollout

3 November 2026, America/Chicago. Owner: Dan. Operator: Codex/fluidity.
State: authorised preparation; no merge/publication claimed yet.

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

After publication, the machine-readable release record enables an additional
anonymous check of the live Reports password form and pinned build identity in
that same CI browser test. It never signs in or reads player rows. Actual owner
sign-in, table visibility and result reconciliation remain user acceptance.

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

Exact source, publication, hashes, CI/browser evidence and remaining gates will be
recorded after execution. `SW-083-reporting-web-rollout.json` remains unpublished
until actual readback succeeds.
