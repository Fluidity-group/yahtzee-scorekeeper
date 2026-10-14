# Engineering setup results — 30 September 2026

## Installed and checked

- Shared engineering entry point in AGENTS.md and current-state routing in docs/status.md; architecture map and workflow conventions added.
- Four repository-owned skills in .agents/skills/: product-change, bug-investigation, release-qualification and hardware-validation. All eight copies across both products passed the skill-creator validator using existing WSL Python/YAML.
- Evidence runner and engineering.json gate; GitHub Actions workflow staged in .github/workflows/engineering.yml. Workflow YAML and JSON parsed successfully. Remote CI has not run.
- Existing CLAUDE.md instructions preserved with a current-contract notice; README points to current status rather than obsolete milestone assumptions.
- Pi dependency lockfile generated for the existing pinned package dependencies. Lockfile preparation used existing WSL Node 22 and emitted the expected Node-24 engine warning; executable Yahtzee qualification used bundled Node 24.19.0. No device dependencies were executed during lockfile preparation.

## Actual verification

Final stable gate: 45 test files / 292 tests passed; web, native-web and room-function builds passed; source consistency check passed. Evidence: artifacts/engineering/2026-10-01T02-34-38-865Z-e8155c86/report.json and adjacent logs. Times in filenames are UTC; this setup occurred on 30 September in America/Chicago.

Existing jsdom canvas warnings remain in logs; no visual browser acceptance is claimed. This workstation includes ignored optional camera and local GoDice evaluation inputs; clean CI lacks those inputs and may report fewer tests or skips. Capture dependency identities separately for recognition/release qualification.

Earlier attempts are retained: sandbox subprocess refusal, and an otherwise successful test/build run invalidated by source edits during setup. The runner now writes a failure report even when Git cannot launch. Do not use the earlier runs as the final qualification.

## What remains

1. Review the existing uncommitted/untracked source, tests and hardware artifacts before making a reproducible Git baseline. Current evidence identifies a dirty working tree, not a release.
2. Commit/push reviewed source and setup files, then observe the remote workflow and configure its actual check as required on the protected branch. No commit, push, branch-protection change or remote CI run was performed by setup.
3. Complete actual phone/multiplayer/camera/Pi/electrical/thermal acceptance using existing domain gates. No deployment, device operation or physical test was performed.

New chats should use AGENTS.md and docs/status.md; skills may require a fresh session for automatic discovery. Direct SKILL.md links remain usable meanwhile. Memory maintenance is an explicit task-completion responsibility; scripts cannot infer or certify user acceptance.

No recurring schedule, automatic commit/merge or unattended development service is enabled. Routine local verification is automated by the gate; continuous remote checks require activation above.
