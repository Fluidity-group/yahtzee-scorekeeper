---
name: hardware-validation
description: Plan or execute a device, electrical, mechanical, camera or audio acceptance test with exact revisions and measured evidence.
---

# hardware validation

For camera platform work, read `docs/decisions/2026-10-01-camera-platform-sequence.md`: C121 local Wi-Fi camera and external-light trials come first; the ESP32 battery dice housing follows only after independent camera-detail/recognition evidence. Use `docs/c121-software-handover.md` for SW/HW test boundaries. Compare elevated side views as well as downward views, measure die-plane lux and glare, and never transfer C121 acceptance to ESP optics or battery gates.

Read the existing domain runbook and readiness gates. Identify exact specimen, firmware/source, CAD/board/harness and configuration revisions. Preserve current authorization and device safe-state constraints; inspect actual runtime state before changes. Define expected results, bounded method, instruments and evidence paths. Record measurements, failed/untested cases and final device state in existing validation records. Separate synthetic fixtures, design review, deployment and physical acceptance. Camera tuning requires fresh evaluation data; audio qualification requires listening/timing/load evidence as applicable. Close a gate only with its stated evidence, and update docs/status.md.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.

Current routing: read docs/status.md and docs/project-memory.md for the active revision, host checkout and task; SW066/SW067 establish the integrated manual baseline, and docs/plans/SW-068-architecture-phone-readiness.md records the latest review and open findings. Windows paths in older handovers are workstation-specific. Manual Android/iOS reliability is the owner priority; camera, voice and push remain deferred. Preserve accounts/tables and distinguish automated verification, installation and complete-game acceptance.
