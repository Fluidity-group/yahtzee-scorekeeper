---
name: hardware-validation
description: Plan or execute a device, electrical, mechanical, camera or audio acceptance test with exact revisions and measured evidence.
---

# hardware validation

For camera platform work, read `docs/decisions/2026-10-01-camera-platform-sequence.md`: C121 local Wi-Fi camera and external-light trials come first; the ESP32 battery dice housing follows only after independent camera-detail/recognition evidence. Use `docs/c121-software-handover.md` for SW/HW test boundaries. Compare elevated side views as well as downward views, measure die-plane lux and glare, and never transfer C121 acceptance to ESP optics or battery gates.

Read the existing domain runbook and readiness gates. Identify exact specimen, firmware/source, CAD/board/harness and configuration revisions. Preserve current authorization and device safe-state constraints; inspect actual runtime state before changes. Define expected results, bounded method, instruments and evidence paths. Record measurements, failed/untested cases and final device state in existing validation records. Separate synthetic fixtures, design review, deployment and physical acceptance. Camera tuning requires fresh evaluation data; audio qualification requires listening/timing/load evidence as applicable. Close a gate only with its stated evidence, and update docs/status.md.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.

Current task routing: resolve SW066/core manual integration from docs/status.md and docs/handovers/2026-10-24-core-manual-integration.md. Manual scoring and tournament dependability on Android/iOS is the owner priority; camera and voice work stays deferred until the owner resumes it after manual-core acceptance. Preserve prior source/device evidence; a running app is not complete-game acceptance. Keep these repository skills and current memory/handover routing synchronized when promoting a build.
