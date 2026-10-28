---
name: bug-investigation
description: Investigate and fix a reproducible defect, retain root-cause evidence and meaningful regression coverage.
---

# bug investigation

Inspect current source/runtime identity and reproduce the reported symptom before selecting a fix. Separate observation from hypotheses; retain the smallest useful reproduction and actual failure output. Trace the owning component, including stale state, retries and persistence when relevant. Add regression coverage that fails for the defect and checks user-visible behavior. Verify the fix and adjacent failure paths. Record root cause, source identity, commands/results and unresolved reproduction limits in the task record; update docs/status.md. Never convert a historical test result into current qualification.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.

Current routing: read docs/status.md and docs/project-memory.md for the active revision, host checkout and task; SW066/SW067 establish the integrated manual baseline, and docs/plans/SW-068-architecture-phone-readiness.md records the latest review and open findings. Windows paths in older handovers are workstation-specific. Manual Android/iOS reliability is the owner priority; camera, voice and push remain deferred. Preserve accounts/tables and distinguish automated verification, installation and complete-game acceptance.
