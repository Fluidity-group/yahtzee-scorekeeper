# Yahtzee engineering entry point

31 October recovery routing: canonical integration is this fg-dev repository and GitHub master. Both accounts work in isolated task folders/branches and integrate through reviewed PRs. Read docs/plans/SW-074-rog-interface-recovery.md plus current status before interpreting old Windows-only or SW066 baseline notes. The recovery candidate restores later ROG feature source while preserving fg-dev fixes; source integration, runtime deployment and physical acceptance remain separate. Historical host-local SW identifiers overlap; use topic and commit.

Current SW066 core integration: on Dan's Windows workstation only, the working source is at `C:/Codex/Yahtzee Game/artifacts/sw066/source`; agents on other machines or in the cloud work from this repository. Read `docs/handovers/2026-10-24-core-manual-integration.md` plus `docs/status.md`. Owner requests core promotion and lead-architect review. Manual scoring/local/online tournaments on Android and iOS take priority; camera and voice are deferred until the manual core works. Both platform versions run per owner; complete cross-phone gameplay remains unverified. Preserve the dirty root checkout and existing accounts/tables. Older separate-sample/main-unchanged notes below are historical; SW066 records actual qualification/promotion.

Current YAHTZ UI/sample continuity: read docs/handovers/2026-10-24-amber-ui-review.md and docs/status.md before assuming a native, root-checkout or main deployment state.

Codex coordinates architecture, implementation and verification. Use `docs/status.md` for current work and unresolved gates. Read only the domain documents needed for the task.

Use `docs/project-memory.md` for durable intent, contract reminders and handover routing; it does not establish current deployment/device state. Hosted manual multiplayer tasks also use `.agents/skills/manual-multiplayer/SKILL.md`.

Live comedic commentary, ElevenLabs Android audio and adaptive humor tasks use `.agents/skills/live-commentary/SKILL.md` and `docs/handovers/2026-10-14-live-ai-commentary.md`. SW-021 is a separate workstream; research does not establish a deployed commentary integration.

## Software and hardware project control

- Follow `docs/engineering-governance.md` for ownership, change/risk control and POC/commercial gates.
- Route software work through `docs/projects/software.md`, physical design/qualification through `docs/projects/hardware.md`, and shared interfaces through `docs/projects/integration.md`.
- For substantial tasks use `docs/templates/engineering-task.md` in `docs/plans/`; keep requirements, actual evidence, decisions and remaining gates durable. Update the relevant project record and status at completion.
- Device firmware/services belong to software; physical execution and compatibility require hardware/integration evidence. Do not infer independent review or commercial approval from Codex self-review.

## Product and contracts

- Current product: `docs/prototype-development-spec.md`; original two-player requirements apply to the legacy path only.
- Component boundaries: `docs/architecture.md`. Preserve pure scoring/rules and authoritative multiplayer revision/seat checks.
- Camera proposals require reviewed/confirmed game commands. Recognition and hand direction do not grant player authority.
- `docs/status.md` records evidence, not live device state. Inspect devices freshly before deployment or physical testing.

## Working discipline

- Preserve pre-existing changes. Do not reset/clean, bulk-stage unrelated work, force-push or assume a dirty working tree is a release.
- Use a scoped branch/worktree for concurrent implementation; do not copy secrets or ignored datasets into Git.
- Reproduce defects and add meaningful regression coverage for behavior changes. Run focused checks during work and the configured gate before release preparation.
- Update status and relevant requirements/decisions with consequential changes. Separate proposed, implemented, verified, deployed and physically accepted states.
- Routine reversible development proceeds within the user's request. Purchases, supplier messages and live deployment need task-specific authorization; setup alone does not authorize them.

## Commands

- Node 24 is the engineering gate runtime (Pi device package requires Node 24); older Node 22 guidance is historical for workstation tooling.
- `node scripts/engineering-check.mjs inspect`: source inventory and required records, no tests.
- `node scripts/engineering-check.mjs verify`: all configured Vitest tests and web/native/room builds, logs under ignored `artifacts/engineering/`.
- Clean checkout: `npm ci`, then `npm ci --prefix device/pi`. Camera runtime assets are optional and must be reported when skipped; see `docs/engineering-workflow.md`.

## Reusable workflows

Repository skills live in `.agents/skills/`: `product-change`, `bug-investigation`, `release-qualification`, `hardware-validation`, `manual-multiplayer`, `live-commentary`. If this session does not list them, read the relevant `SKILL.md` directly. Use `docs/engineering-workflow.md` for records and evidence conventions.

## Fluidity rules (all agents and collaborators)

- Work on a branch, never directly on the default branch. Amber's branches start `amber/`; agent branches start `codex/` or `claude/`. Open a pull request, run the available checks and report what was and wasn't tested. Amber may merge her own pull requests in this repo; agents don't approve or merge their own work.
- No secrets, keys, passwords, tokens or public IP addresses in the repository, prompts or logs. If you find one, stop and report it without copying it.
- Never weaken TLS, certificate pinning or authentication to make something work.
- Don't restart, reflash or reconfigure household devices or services unless a person asks for that specific operation.
- No client data (for example school or pupil data) in this repository or its tests; use synthetic data.
- Propose risky or irreversible actions and wait for a person's OK.
- When stopping mid-task, leave a short handover: branch, what changed, checks run, what's left.
