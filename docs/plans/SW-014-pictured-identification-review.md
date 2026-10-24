# SW-014: pictured dice review in the standalone identification test

3 October 2026. Owner: product owner. Developer/self-review: Codex. SW/INT; physical acceptance open. Preserved dirty master baseline.

## Purpose and requirements

User reports SW-013 test worked physically, but the small result UI makes the captured object and predicted face hard to compare. Show a crop of every readable/unclear candidate below the frozen feed, prediction and explicit actual-value selection. Accommodate false objects, missed dice and empty trays. Keep original prediction and confirmed labels separate; no game authority. Larger responsive screen and touch controls. Camera focus advice must distinguish documented controls from actual optical evidence.

## Acceptance and verification

| Requirement | Criterion | Verification | State |
|---|---|---|---|
| SW014-1 | Unmarked, aspect-preserving same-frame crops with numbered matching overlay and prediction | DOM crop source/coordinates/order checks and visual preview | Open |
| SW014-2 | Explicit per-card 1–6 confirmation/correction, Not a die, missed die add/remove; no predicted ground truth defaults | DOM interaction/regression checks | Open |
| SW014-3 | Original predictions retained; scalar per-card reviews exported, no image pixels/URLs; <=5 actual dice, 100 comparisons | Evidence tests | Open |
| SW014-4 | Stale frame invalidation and export recovery; game/calibration behavior preserved | Existing camera checks, configured gate | Open |
| SW014-5 | Phone/tablet layout usable | Responsive preview; physical user test pending | Open |

## Design and impact

Enlarge standalone dialog; responsive cards crop the existing canvas before any annotation. Capture remains frozen during review so pictures and feed refer to the same frame. All candidate choices start blank; selecting predicted value explicitly confirms it. Not a die excludes a candidate from actual face multiset while preserving false predictions. Missed dice have no fabricated picture. Schema v2 adds scalar reviews referencing objects only in this frame. Exact remains the original conservative unordered comparison, with unclear candidates preventing exact success. Images exist only in current UI memory and are never persisted/exported. Recognition algorithm, native bridge, game authority and backend unchanged.

## Risks and execution bounds

User explicitly says do not update Pixel unless asked; another tablet app is being developed on this machine. No adb/device inspection/install or emulator interaction for this task. Local checks/build only. Optical close-focus distance is unverified; crops enlarge pixels without improving detail. Human labels are still subject to mistakes. Physical ergonomics and C121 reader accuracy require fresh evidence.

TP-Link C121 specs document 3.17mm lens and digital zoom; TP-Link support states Tapo fixed focus/no depth-of-field adjustment in a C110/TC60 response. No documented C121 software focus control found. Do not infer its minimum focusing distance. Sources: https://www.tp-link.com/us/home-networking/cloud-camera/tapo-c121/ and https://community.tp-link.com/en/home/forum/topic/785030 .

## Completion and decision

Implementation/checks pending. No device update authorized for this task. User's SW-013 “worked” is flow feedback, not a measured recognition accuracy acceptance.

## Actual completion evidence

- Implemented in src/dice/camera-test.js, src/dice/camera-panel.js and src/dice/camera-panel.css; tests/camera-identification-test.dom.test.js covers unmarked crop ordering/coordinates/aspect ratio, explicit labels, unclear/false objects, missed dice add/remove, maximum actual count, fresh-frame reset and stale picture removal/export retention. Existing game and calibration tests preserved.
- Focused 28 tests/3 files passed. Initial sandbox compiler spawn EPERM resolved by approved local test execution outside sandbox; no test failures.
- Final configured gate: 464 tests/59 files, no skips; web/native/room builds and unchanged-source check passed with Node24.19.0. Evidence artifacts/engineering/2026-10-03T21-45-35-881Z-2fbd692b/report.json. Source digest 523a5937cf04879ec6c19357e2c59851995cae9529ecc246696e3c576ab0d01b, dirty master HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc. Record-only updates follow the gate.
- Synthetic browser preview at 1280x720 and 390x844 visually showed numbered feed objects, unmarked crops, predictions, blank selectors, two-column phone cards and large record control. Shortened dropdown text after observing truncation; final source requalified. Subsequent browser interaction checks timed out, so no claim of completed browser confirmation/export journey. DOM regressions cover those data interactions. Temporary preview tab closed, viewport reset, local server stopped. Preview fixture artifacts/sw014-identification/preview.html is synthetic, not optical evidence.
- Capacitor sync and offline assembleDebug passed. Local APK artifacts/sw014-identification/android-test-candidate.apk SHA256 870600a9f04f64d3b48ecf5a43c5b2ceb8d45ee981139211f5590249410a4b0e; build log artifacts/sw014-identification/android-build.log. No native Java changes or new native unit execution claimed. Existing ignored camera assets reused; no dependency installation.
- User explicitly revoked automatic Pixel updates unless asked. No adb, device inspection, emulator interaction, installation or launch occurred. Candidate is built, not deployed. Backend unchanged.
- SW014-1–4 implemented and automatically verified; SW014-5 has synthetic responsive evidence only. Physical phone/tablet usability, C121 focus/detail and representative recognition accuracy remain open. User confirmed prior standalone flow worked without supplying accuracy measurements. No physical/independent/G3/commercial acceptance inferred.
