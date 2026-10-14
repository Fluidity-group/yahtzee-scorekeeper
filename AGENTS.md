# Yahtzee engineering entry point

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
