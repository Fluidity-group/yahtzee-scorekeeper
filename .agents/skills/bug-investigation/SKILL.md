---
name: bug-investigation
description: Investigate and fix a reproducible defect, retain root-cause evidence and meaningful regression coverage.
---

# bug investigation

Inspect current source/runtime identity and reproduce the reported symptom before selecting a fix. Separate observation from hypotheses; retain the smallest useful reproduction and actual failure output. Trace the owning component, including stale state, retries and persistence when relevant. Add regression coverage that fails for the defect and checks user-visible behavior. Verify the fix and adjacent failure paths. Record root cause, source identity, commands/results and unresolved reproduction limits in the task record; update docs/status.md. Never convert a historical test result into current qualification.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.

Current task routing: resolve SW066/core manual integration from docs/status.md and docs/handovers/2026-10-24-core-manual-integration.md. Manual scoring and tournament dependability on Android/iOS is the owner priority; camera and voice work stays deferred until the owner resumes it after manual-core acceptance. Preserve prior source/device evidence; a running app is not complete-game acceptance. Keep these repository skills and current memory/handover routing synchronized when promoting a build.
