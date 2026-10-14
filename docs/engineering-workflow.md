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

## Automation boundaries

Scripts automate inspection and deterministic tests/builds. Skills direct Codex to reconcile task memory and investigate failures. CI rechecks pushed work. No background Codex schedule, auto-commit, auto-merge, deployment or device testing is enabled by this setup. Those need a concrete purpose and suitable authorization. Human decisions, measurements, listening and physical acceptance remain explicit.
