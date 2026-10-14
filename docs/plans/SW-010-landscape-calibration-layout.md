# SW-010 landscape calibration layout correction

3 October 2026. Owner: product owner; implementation/verification: Codex. Scope: camera calibration CSS only, preserving normalized corner coordinates and reviewed game commands.

User photos 3951/3950 reject SW-009 usability: Android already rotates, but landscape retains a 190px vertical reserve and 42px top margin. The centered dialog leaves the camera image small. Earlier SW-009 simulated browser fixture did not load successfully; its layout was not visually qualified before installation.

Acceptance: calibration fills the app viewport; optional phone rotation places controls beside the image; portrait remains supported; image keeps its aspect ratio and controls do not overlap it; existing undo/reset/confirm behavior passes. No forced orientation, automatic tray recognition or backend changes.

Implementation: full-viewport grid and landscape control sidebar, with image bounded by available height/width. Static fixture uses the actual app/calibration CSS, clearly labeled simulated rather than camera evidence. Browser geometry, configured gate, APK identity and fresh Pixel installation evidence pending. Actual phone touch usability remains a user acceptance gate.

## Verification and candidate

- Node24.19 configured gate:450 tests/58 files, web/native/room builds passed; source unchanged during verification. Report artifacts/engineering/2026-10-03T19-49-34-305Z-932e49b3/report.json; source SHA256322e7e61c0ef34446d3e6063a98e3c6c0400abe63357155fd6b314fcf03373d6, dirty master HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc. Subsequent changes are evidence records only.
- Browser static fixture with actual styles.css/clubhouse.css/prototype.css/camera-panel.css:960x430 image718.2x404;740x360 image532.7x299.6;412x820 image386.7x217.5. Image preserves16:9, buttons minimum44px, image/control/close bounds do not overlap and remain within viewport. Geometry saved artifacts/sw010-landscape/verified-layouts.json and landscape.jpg. Fixture excludes actual native camera transport/phone touch testing.
- Capacitor Android sync and offline assembleDebug/testDebugUnitTest succeeded (native tests reused/up-to-date; no native changes). Candidate artifacts/sw010-landscape/android-test-candidate.apk SHA256 fbb576afad6cf7bae4ff08766b80de4ec46c4d1a33d56a861df962e3eccb091f.
- Backend bundle SHA256 c196a85a9b4bf8cd5a3104b4c5c4d2e6a224899ef8e5cc5dd0193306a6f924cc unchanged; no backend deployment.
- Fresh ADB inventory after build returned no devices. Installation pending Pixel reconnection; no installation or physical acceptance claimed. Actual optional rotation, point placement/confirm and game roll review remain to test.

## Pixel update completed

3 October 2026: fresh ADB inventory identified authorized Pixel11 Pro XL serial67080DLDV005JQ. Replacement installation succeeded preserving app data; device base.apk SHA256 matched fbb576afad6cf7bae4ff08766b80de4ec46c4d1a33d56a861df962e3eccb091f. Launcher Status:ok, cold start529ms. Evidence artifacts/sw010-landscape/pixel-install.json. This supersedes the disconnected-device installation gate above. Physical landscape usability and actual roll recognition/review remain open; user given test instructions. Calibration must be repeated after restart.
