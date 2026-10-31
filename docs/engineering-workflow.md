# Engineering workflow and automation

Project ownership and lifecycle decisions are defined in `engineering-governance.md`. Route work to `projects/software.md`, `projects/hardware.md` and, for shared changes, `projects/integration.md`. Use `templates/engineering-task.md` for substantial task records. These records govern development; they do not enable remote merge enforcement or background automations.

## Start and completion

Start a task from `AGENTS.md` and `docs/status.md`; inspect Git state and read the relevant product/architecture contract. For a substantial change, keep a task plan in `docs/plans/` with purpose, scope, acceptance criteria, decisions, progress and evidence. Small corrections do not need a plan.

Finish by recording the behavior changed, checks actually run, failures/skips, remaining gates and next action in status or the task record. Update requirements or a dated file in `docs/decisions/` when an accepted contract changes. Historical chat text is supporting evidence and cannot establish current runtime state.

## Repeatable gate

Run `node scripts/engineering-check.mjs inspect` for an inventory, or `node scripts/engineering-check.mjs verify` for configured checks. `engineering.json` defines the gate and its scope. Each run writes a unique evidence directory with HEAD/branch, a digest of non-ignored source files, dirty-state flag, Git status, command logs and a JSON report. Source changes during a run invalidate its result.

The digest includes untracked source; it does not include ignored dependencies, raw recordings, runtime data or camera assets. Identify those separately when relevant. A passing gate is scoped automated evidence, not a release or physical acceptance.

Yahtzee clean-checkout setup: Node 24, `npm ci`, `npm ci --prefix device/pi`. `node scripts/setup-camera-assets.mjs` downloads optional camera runtimes from its declared upstream URLs and writes their manifest; this is an explicit dependency preparation step. When absent, the existing OpenCV tests may skip: report those skips and obtain a camera-enabled run before recognition acceptance. CI intentionally does not download these assets or proprietary local-evaluation inputs.

The GitHub workflow runs after its files and intended source are committed/pushed. It uploads gate evidence on failure as well as success. Configure the actual check as required on the remote branch after a successful CI run. File creation alone cannot enforce merges.

## Evidence and release records

Record requirement/defect ID, test method, expected result, actual result, revision/source digest, configuration, timestamp and evidence path. Hardware records additionally identify specimen, board/harness/CAD revisions and instruments. Use the existing validation tables instead of duplicating them.

For an authorized release, create a manifest in `docs/releases/` with source/build hashes, dependency/configuration identities, target, qualification evidence, rollback and remaining limitations. Never include credentials. A release must include all intended source in Git; a dirty-state verification run remains development evidence.

## Two-user source, design and build synchronization

Use the GitHub repository as the shared record across users/accounts/machines. Before starting, fetch origin, check the branch/HEAD and working-tree state, then read AGENTS.md, docs/status.md, docs/project-memory.md and the active task/design references. An origin/master label can be stale until fetched. Preserve uncommitted changes; never pull over them blindly. Record the task branch and base commit in the task plan.

Prefer one task branch per user/change, named codex/, claude/ or amber/ as appropriate, with PRs targeting reviewed master. Fetch again before qualification or handover and reconcile upstream changes through a normal merge when needed, then rerun affected checks. For stacked PRs, record the dependency and base branch explicitly; a feature branch is not automatically an approved phone candidate. Never rewrite a shared branch's history or force-push it.

If both users intentionally use the same branch, assign one writer at a time and hand off after committed/pushed work. The incoming user fetches, verifies a clean tree and fast-forwards only; if histories diverge, stop to reconcile commits through a normal merge. Do not have agents edit the same checkout concurrently. Shared remote access does not serialize local files, index or build output.

Put consequential design decisions and acceptance criteria in the active versioned plan/decision document and link it from status/memory. Include review artifacts or screenshots where useful. Distinguish proposed, owner-approved, implemented, verified and installed states. The approved YAHTZ direction and frozen rules are shared contracts; a newer chat, screenshot or unmerged UI branch alone does not supersede them.

For a phone test, select one qualified source commit and public configuration/feature profile, build both packages from matching manual assets, and record source commit, asset/build hashes, bundle IDs, signers, build time and remaining gates in a release manifest. The next tester verifies those identities rather than relying on the current unchanged versionName/build 1 labels. Git/source synchronization does not update a phone; installation needs its own authorization and evidence. Never share signing keys, provider credentials, account sessions or ignored environment files through Git. Use the established validated public-only configuration handoff.

At handover record branch/commit, PR/dependencies, design decisions, check results/skips, whether either phone changed and the next action. Keep status and memory current in the same PR. Agent skills/guidance are versioned repository files; fetch their changes along with source. Before issuing a phone candidate, verify that the chosen commit contains the intended reviewed changes from both users.

## Automation boundaries

Scripts automate inspection and deterministic tests/builds. Skills direct Codex to reconcile task memory and investigate failures. CI rechecks pushed work. No background Codex schedule, auto-commit, auto-merge, deployment or device testing is enabled by this setup. Those need a concrete purpose and suitable authorization. Human decisions, measurements, listening and physical acceptance remain explicit.

## Required public assets and build identity (SW072)

Production Vite builds validate public-assets.required.json before bundling and emit build-identity.json. Review path/hash changes in that contract alongside intended asset changes; builds reject missing, altered or undeclared public runtime assets. Optional camera runtimes are explicitly separate. This inventory covers known current assets, not unrecovered ROG/phone features. Baseline source/feature comparison and owner acceptance remain required.

The application embeds the same commit, source state/digest and build profile and exposes them under clubhouse menu → More tools → About this build. Native app version/build comes separately from Capacitor App; active-game mode/rules labels are separate again. Modified builds are labelled. Ignored public configuration and final signed-package hashes are not part of the source digest; record their permitted release identities independently. Do not infer a complete or qualified product from build metadata alone.
