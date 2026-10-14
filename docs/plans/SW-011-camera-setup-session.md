# SW-011 camera setup session retention

3 October 2026. Owner: product owner. Developer/self-review: Codex; independent/physical acceptance open. SW/INT scope: local camera panel lifecycle; dirty development baseline preserved.

## Purpose and acceptance

User confirms SW-010 calibration worked, then starting a new single-player camera game and opening Capture/review produced a blank disconnected screen requiring calibration again. Closing the panel previously retained a connection only after successful roll commit, so setup-before-game could not survive closing.

Requirements: preserve a confirmed calibration and live camera session across setup-panel close and opening first game capture; hide native preview and release frame/reader/listener resources on close; preserve confirmation-only game authority; reject retained calibration after explicit disconnect, background interruption, changed session or changed dimensions. No credential, backend, firmware or automatic tray-recognition changes.

## Design and risks

Keep the native session when closing a calibrated live panel; restore only against fresh native session/geometry. Explicit Disconnect and app-background paths still invalidate. Session remains active between panels until explicit disconnect, background/native lifecycle or switching to a non-camera game, matching the existing post-confirm retention behavior. Physical movement remains undetected and requires manual recalibration.

## Evidence and remaining gates

Pre-fix setup-close regression fails on unexpected native disconnect: artifacts/sw011-camera-session/pre-fix.log. Added setup-before-game reopen/actual reviewed commit and stale-session/disconnected/explicit-disconnect/background cases; focused/configured checks, identified APK installation and physical user journey pending. SW-010 user-reported calibration success is evidence for that prior installed candidate, not this new candidate.

## Completion evidence

- Changed src/dice/camera-panel.js and tests/camera-panel.dom.test.js. Five new scenarios exercise calibration outside a game followed by panel close/new game capture, changed native session, disconnected status, explicit disconnect and background invalidation. Setup-close also exercises reviewed confirmation and storage retry without granting authority before confirmation.
- Focused19 tests/2 files passed. Full configured gate455 tests/58 files and web/native/room builds passed; no source changes during gate. Report artifacts/engineering/2026-10-03T20-46-19-261Z-3497cbe8/report.json; source SHA256265d237bfac02df0c4c9caad6c3324dcbc47712d06d21221b2181d69697b9de2, dirty master HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc. Post-gate modifications are evidence records only. Initial focused failure after implementation referenced the old closed test canvas/panel, corrected test handles before final verification.
- Capacitor sync and offline assembleDebug passed. No native changes; native unit evidence unaffected from SW-010.
- Authorized replacement APK installed on freshly inspected Pixel11 Pro XL serial67080DLDV005JQ, preserving saved app data. APK and installed base.apk SHA25663562817c28cc509bfa09b7badd777f7bce0cf1b86da866dcbfcb4217e99bb58; launcher Status:ok, WaitTime179ms. Evidence artifacts/sw011-camera-session/pixel-install.json. Physical setup-close/new-game journey remains user acceptance, not inferred from software tests/install.
- Backend bundle hash unchanged c196a85a9b4bf8cd5a3104b4c5c4d2e6a224899ef8e5cc5dd0193306a6f924cc; no deployment.

## Camera zoom advisory

User asked whether TP-Link services can be stopped to control zoom. Official C121 specifications list fixed3.17mm lens and12x digital zoom, rather than optical zoom: https://www.tp-link.com/us/home-networking/cloud-camera/tapo-c121/. Official local integration documents RTSP and ONVIF Profile S management, with controls model-dependent: https://www.tp-link.com/us/support/faq/2680/. No device process inventory, firmware replacement/service stoppage or ONVIF capability probe performed. App-side digital crop/zoom is feasible proposal, not implemented or optical-detail improvement; any zoomed marking must preserve original-image coordinates. Supported camera controls require a fresh capability query using local credentials without disclosure. Firmware stopping is not needed for app-side zoom and has no established supported path in these sources.
