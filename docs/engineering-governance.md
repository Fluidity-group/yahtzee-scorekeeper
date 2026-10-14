# Software and hardware engineering governance

Established 1 October 2026. Process is active for subsequent work; product qualification remains open.

## Two projects, one controlled product interface

Maintain two engineering workstreams in this repository. Separate repositories or Codex sidebar projects are unnecessary until access, licensing or independent release needs justify them. Software and hardware have separate backlogs, acceptance records and release identities. Shared changes require impact assessment in both.

| Workstream | Accountable engineering scope | Control record |
|---|---|---|
| SW | Browser/Android experience, rules, persistence, accounts, multiplayer, BLE, vision algorithms, Pi services and device firmware | `projects/software.md` |
| HW | Camera/dice assemblies, electronics, power, harnesses, mechanics, optics, thermal design, manufacture and physical qualification | `projects/hardware.md` |
| INT | Protocols, calibration, supported device/software combinations, command authority and complete product acceptance | `projects/integration.md` |

Device software belongs to SW; its physical execution and assembly compatibility require HW/INT evidence. Pi and ESP32 designs are distinct candidates, not interchangeable revisions of an accepted product.

## Responsibility and decisions

The product owner owns intended users, scope, budget, commercial direction and POC acceptance. Codex acts as coordinating architect: maintains requirements, designs, implements, investigates, verifies and reports evidence. Record the named reviewer and decision in each consequential review. Codex self-review is development evidence; it is not independent electrical, security, regulatory or commercial approval. Assign qualified reviewers when those gates become applicable; an unassigned reviewer leaves that gate open.

Routine reversible development proceeds under the requested scope. Obtain task-specific authorization for purchases, supplier messages and live deployment. Obtain product-owner decisions when changing commercial scope, accepting material residual risk or declaring POC/release acceptance. Do useful preparation before requesting a decision. Do not ask again for already authorized routine work.

## Task control in Codex

Start each task with `AGENTS.md`, `docs/status.md` and the appropriate project control record. Identify SW, HW or INT scope, current baseline, unresolved dependencies and applicable repository skill. Read only necessary domain documents.

For substantial work, create `docs/plans/<id>-<topic>.md` using `templates/engineering-task.md`. Use stable IDs such as SW-001, HW-001 and INT-001. Record requirements, observable acceptance criteria, impact, design alternatives, verification method and evidence. Small changes can record these directly in the project backlog/status. Design before implementation where interfaces, authority, power or construction change. New numerical acceptance targets are proposals until accepted for the relevant gate.

Use one focused Codex chat per substantial task, with its project/ID in the title. Chat history supports the durable repository record; it does not replace it. Concurrent implementation requires isolated branches/worktrees and explicit file ownership. Do not create recurring automations, additional chats or delegate work unless requested or authorized by applicable instructions.

Close tasks with changed files/revisions, actual checks, skips/failures, evidence paths, residual risks and next action. Update the project record and `docs/status.md`; record consequential interface/requirement decisions in `docs/decisions/`. A task may finish implementation while its physical or deployment acceptance remains open.

## Lifecycle and gate decisions

| Gate | Required evidence and exit decision |
|---|---|
| G0: understood baseline | Reviewed source/design inventory; authoritative revision and artifact ownership; product intent and exclusions; named owners; risk/dependency register. Reproducible software baseline and identified hardware design candidates. |
| G1: design ready | Traceable requirements and measurable acceptance criteria; architecture/interface review; recovery/failure behavior; HW power, wiring, mechanical and thermal reviews; verification plan; unresolved critical design risks closed or explicitly blocking. |
| G2: implementation ready for qualification | Reviewed source/CAD/BOM/firmware revisions; focused regression checks; software engineering gate from reproducible inputs; HW design checks and bounded bench readiness. This does not authorize deployment or energizing an unreviewed assembly. |
| G3: POC accepted | Complete representative user journeys; real-device and exact-specimen tests; reliability measurements against agreed thresholds; adverse/recovery cases; SW/HW compatibility record; known limitations and product-owner acceptance. |
| G4: commercial design ready | Post-POC product scope; target markets; cost/service model; manufacturability/testability; supply lifecycle; independent security/privacy and applicable safety/radio/battery/regulatory assessments; licences/branding review; support and update strategy. |
| G5: release authorized | Reproducible identified builds and fabrication packs; qualification evidence; production/manufacturing controls; traceability; applicable approvals; service monitoring/backups; signed-off limitations; rollback/recall/support plan and explicit release/deployment authorization. |

Use `not started`, `in progress`, `blocked`, `passed` for gates. Every pass records reviewer, date, revision, evidence and decision. Implementation, automated verification, deployment and physical acceptance remain separate states. Gate waivers identify the risk, scope, accountable approver and expiry; they cannot transform missing measurements into passed tests. POC success never implies G4/G5 approval.

## Change, risk and configuration control

Before a consequential change, record impacted requirements, SW/HW/INT contracts, compatibility, hazards, migrations and test scope. Freeze exact revisions for qualification. Any later change reopens affected acceptance evidence; unaffected evidence remains usable with an explicit rationale.

Track risks with ID, cause/consequence, severity/likelihood rationale, mitigation, owner, evidence and closure condition. Unknowns stay open. Escalate critical safety/authority/data-loss issues before dependent execution. Review open risks and next gates at milestone boundaries and whenever new evidence changes a decision.

Keep source, lockfiles, design generators, native CAD and reviewed BOMs versioned. Keep credentials, raw datasets and large/generated packs in appropriate protected artifact storage; release manifests link source revisions, dependencies and hashes. A dirty-tree result is development evidence. Remote CI and branch protection must be verified as enabled before claiming merge enforcement.

## Current operating priority

First reconcile the preserved baseline and native clean-checkout blocker. In parallel planning, identify the hardware candidate and exact specimen for POC, consolidate its existing validation gates, and agree measurable POC thresholds before collecting acceptance data. No purchase, live deployment or commercial release is authorized by this governance setup.
