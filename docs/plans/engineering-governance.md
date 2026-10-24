# Engineering governance setup — 1 October 2026

Scope: establish separate software/hardware controls and shared integration governance for POC and possible commercial development. No product behavior, device, purchase or deployment changes.

Acceptance: project ownership/boundaries documented; task and evidence discipline routed through AGENTS.md; POC/commercial gates separated; actual baseline blockers retained; controls included in required-record inspection.

Implemented: `docs/engineering-governance.md`, three project records and task template. Existing contracts/runbooks remain authoritative. One repository with separate workstream controls is the initial decision; repository/sidebar splitting is deferred until justified by release/access needs.

Verification: Node 24.19.0 required-record/source inspection passed; evidence `artifacts/engineering/2026-10-01T14-56-11-959Z-534b3e7d/report.json`. The first sandboxed attempt failed to launch Git (EPERM); rerun with approved access passed. Tests were not run for this documentation/configuration change. This completion entry postdates the inspection source digest. Product qualification, remote branch enforcement and physical acceptance remain open.
