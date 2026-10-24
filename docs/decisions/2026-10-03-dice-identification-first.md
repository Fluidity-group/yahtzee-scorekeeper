# Dice identification before game integration

3 October2026. Decision owner: product owner, explicitly requested in the camera testing chat. Engineering coordinator: Codex.

Prioritize a standalone Android/C121 identification test UI, real labeled dice/candidate/pip evidence and recognition fixes before further game UI integration work. SW-013 provides diagnostic capture/overlay/actual-face comparisons and bounded local export, with no game authority. Existing game integration remains available; its tests/install do not establish real camera recognition accuracy.

Use a fresh baseline and held-out validation after tuning. Current manual calibration, native secure profiles, camera-to-tray geometry constraints and reviewed game commands remain unchanged. Acceptance thresholds and physical POC acceptance remain open for the product owner. Automatic tray registration, zoom, firmware controls and ESP32 camera qualification remain separate proposed work.

See [standalone test task](../plans/SW-013-standalone-dice-identification.md) and [next-chat handover](../handovers/2026-10-03-c121-dice-identification.md).
