# SW-006 Android build ready for user testing

Date: 2 October 2026. Coordinator: Codex; product owner owns acceptance; independent reviewer unassigned.
State: ready for an identified user Android test session; development and synthetic verification completed. SW/INT scope; phone/C121 execution and G3 remain separate.

## Purpose and requirements

Prepare the local Android camera build and a concrete test pack for the user's next phone/C121 session. Continue from the preserved dirty baseline and [first emulator evidence](SW-006-emulator-rtsp-results.md). Do not add hosted-camera authority, continuous automatic roll commits or optional player hints as prerequisites. Do not install onto a physical phone until that session is authorized.

| Requirement | Observable readiness check | Actual evidence | State |
|---|---|---|---|
| AR-1 | Native profile sheet, retained credentials, connect/disconnect/removal usable | Native sheet/save/live/restart, then removal and rejected reconnect | Verified synthetic |
| AR-2 | Calibration -> settled capture -> correction/held review -> explicit persisted roll -> score/manual fallback | Complete13-category UI game; retry/fallback/restart audit | Verified synthetic |
| AR-3 | Same-session stream changes invalidate calibration/review; reconnect cannot reuse old Surface/frame | Native geometry/generation and panel regressions; earlier fixture faults | Verified development |
| AR-4 | Timings are local/scalar/bounded, missing/capped measurements honest; status matches actual connection | Bounded/capped regression plus14 measured UI captures | Verified synthetic |
| AR-5 | Repeated capture/release remains bounded over 30 wall-clock minutes | 1800.55seconds;1635 captures;zero failures;30 zero-file checks; bounded sampled PSS | Verified synthetic |
| AR-6 | Identified APK passes configured source gate, Gradle and offline assets/distribution checks | 368 configured +14 native tests, all builds, APK asset integrity | Verified |
| AR-7 | Arrival test instructions identify exact APK, setup, expected checks, fallback and evidence | SW-006-android-arrival-test-pack.md | Prepared |

## Design and impact

Keep the existing explicit confirmation and game command/persistence boundaries. Native agent owns Android Java and native tests; vision agent owns camera panel/timing and related tests in existing isolated worktrees. Coordinator owns integrated source, bench harness, synthetic UI execution, build packaging and durable records. No parallel edits to the same file. Changes affecting stream size reopen geometry/review evidence; unaffected prior codec/pixel checks remain linked to their earlier APK.

## Risks and execution bounds

Synthetic dice do not qualify C121 optics, real die identity or recognition coverage. An emulator cannot qualify phone thermals, actual Wi-Fi reliability or Keystore hardware guarantees. A dirty source digest is a development build identity, not a release. No purchase, live deployment or physical acceptance is authorized by this task. Fixture remains authenticated and loopback-only; test secrets/raw media stay ignored. Stop on unbounded resource growth or leaked sensitive payloads; leave streams/processes stopped and disposable credentials removed afterward.

## Completion and decision

Record implementation, synthetic measurements, failures/skips, gate/APK identities and final bench state after execution. Readiness means the build and instructions can enter an identified user test session, not that the hardware or POC is accepted.

## Implemented and verified checkpoint

Final candidate SHA256 `cd553368181173557219e2c3c388ffb9a88aa35e8f71b31923e697f5c1bee372`; app ID `com.fluiditygroup.diceclubhouse.dev`, versionName1.0/versionCode1, minimum API24/target36. Candidate path `artifacts/sw006-oct02/android-test-candidate.apk`. This identifies the preserved dirty development build, not HEAD alone.

Node24.19.0 final configured gate passed368 tests in55 files, web/native/room builds and unchanged source identity: `artifacts/engineering/2026-10-02T17-10-42-175Z-ec6d0178/report.json`; source SHA256 `928f87c6dbaaeee05fdf173148135461bb01bb7b5bd6891a3e8f09f1c33a1d67`. Offline Gradle/JDK21.0.8 assembleDebug/testDebugUnitTest passed14 native tests: four freshness, four timing, five geometry, one template. Existing dependencies/cache were reused; fresh npm installation was not repeated. No optional camera assets were skipped in this gate. Subsequent evidence/document edits are outside that gate digest; application source is frozen.

Changes: native geometry validates dimensions/rotation/pixel aspect, invalidates rendered freshness and in-flight frame encoding after a genuine dimension change, and guards old Surface destruction by generation. Panel live initialization and retained geometry now agree with native status; resolution changes invalidate calibration/review; a late saved-state callback cannot overwrite a user-started calibration. Bounded diagnostics explicitly label capped values. All13 whitelisted native errors use fixed local actionable messages; unknown errors stay generic and discard upstream credential-bearing details. No automatic retry or game-authority change.

AR-1 executed native secure profile sheet save, authenticated live connect and saved-profile reconnect after force-stop/replacement install. Earlier bench covers wrong credentials and credential removal; cleanup will remove the current disposable profile after the soak. The first scripted save/entry attempt failed and was corrected through direct sheet interaction. Calibration attempted immediately after initial live status could precede a fresh snapshot; a later retry worked. Production freshness remains strict and the final build gives wait/retry prompts rather than weakening it.

AR-2 synthetic stationary960x540 fixture: actual UI calibration,14 captures/reviews, two corrected rolls, one kept-slot roll, explicit confirmation and all13 scored categories completed;14 unique roll events. The completed record exactly matched IndexedDB after process restart. Final candidate rechecked capture/correction and failed-journal retry: zero rolls after injected synchronous failure, exactly one after retry. Finish manually then keypad15 saved Chance15. Evidence: `artifacts/sw006-oct02/ui-journey-summary.json`, full-game/result and restart records, final-fault/result, manual-fallback/result. Some initial driver runs failed on a deliberately changing scene, a non-bubbling player-count event or the wrong Aces selector; corrected final execution is the evidence. An earlier failure-count lookup selected an older active synthetic game and was superseded by the final current-game check.

AR-3/4 native14 tests, panel12 tests, timing5 tests and native transport24 tests passed within the configured gate. Existing fixture auth/lifecycle/hidden preview results remain linked to the earlier APK. Same-session dimension and stale Surface behavior have meaningful regressions; a midstream resolution transition has not been executed with a real camera. No complete optical/phone compatibility claim follows.

Actual synthetic Capture button → review-visible timings across14 UI captures: median3272.9ms, p95/max5049.3ms, including packaged worker startup. Review preparation is measured separately in each panel. These are stationary-fixture UI timings, not physical dice-settled or sensor-capture latency. Final candidate capture-to-review2839.6ms in the retry check. Stage clocks remain distinct, no duration sum is an end-to-end measurement.

AR-6 packaged APK ZIP passed integrity inspection, includes10 camera runtime asset entries plus packaged worker, excludes `godice-evaluation.json`; OpenCV worker initialization and frame inference executed through the app's packaged origin without a runtime CDN fetch. See `artifacts/sw006-oct02/apk-distribution-check.json`. Synthetic loopback fixture uses authenticated read, TCP and Wi-Fi-bound production transport. Standard distribution remains separate from private evaluation.

AR-7 [arrival test pack](SW-006-android-arrival-test-pack.md) provides exact identity lookup, native setup, calibration/review/held flow, recovery/offline/fallback, physical measurement methods, privacy and rollback. Actual phone install/C121 specimen/firmware/optics/lighting/thermals and G3 remain open.

AR-5: the emulator-only harness `scripts/android-rtsp-bench.mjs` is running30 wall-clock minutes. It samples bounded pull→file fetch→bitmap decode/close→one worker inference→native release, approximately once per second, and samples app PSS/cache files each minute. A5-second probe had4 advancing inference results, zero failures and zero remaining leased files. Final measurements and safe-state will be recorded below after completion. Neither phone thermals nor renderer-process memory is inferred from main-app PSS.


Build trace: the complete14-roll/13-category UI game ran on APK SHA2560e7c7aa6c68a877b22130ded3ac852947698f1624a2238b5cd2385b31a4cd59c. The final candidate then changed only fixed native transport error prompts; final-candidate capture/correction, zero-on-failure/one-on-retry, manual fallback, saved-profile restart and the30-minute soak were rechecked. The final source gate covers all affected regressions. Earlier whole-game behavior is reused only for the unchanged command/persistence/recognition code.


## Final sustained run and safe state

AR-5 completed on the final APK:1800.5458724 wall-clock seconds,1635 advancing snapshot/fetch/decode/inference/release cycles,zero failures; every synthetic frame returned five recognized dice. All30 minute-spaced post-release file checks found zero leased snapshots. Main-app PSS ranged139.0–160.5MiB. The single controlled-emulator WebView renderer was sampled from480.84seconds onward and ranged172.6–232.1MiB, rising and falling rather than growing monotonically. Main WebView JS heap ranged2.16–4.67MiB; it is not a whole-worker heap measurement. No forced collection or process restart was used to hide growth during the run.

Local cycle median66.5ms/p95 116.4ms/max532ms; deliberately paced approximately once per second. Native extraction median4.0ms/p95 7.55ms, PNG encode/write median16.12ms/p95 28.21ms, local render age median51ms/p95 103ms. JS file fetch median7.0ms, bitmap decode4.5ms, inference6.4ms. Distinct clocks and overlapping stages remain separate; these do not establish physical sensor/settled-to-review latency. Evidence: artifacts/sw006-oct02/soak-30min/result.json,summary.json,renderer-resources.json; harness scripts/android-rtsp-bench.mjs. Phone thermals and real network/optics remain unmeasured.

Final native status disconnected; saved-profile count zero. Removed-profile connect was rejected INVALID_CONFIGURATION, and final cache check found zero frame files. Disposable soak credential was removed by harness cleanup. The emulator, loopback RTSP server/publisher and CDP forward were stopped. No physical phone/C121 install or deployment occurred. No Git staging/reset/clean/push or commercial/independent approval occurred. The final APK hash remains cd553368181173557219e2c3c388ffb9a88aa35e8f71b31923e697f5c1bee372.

Decision: AR-1 through AR-7 are complete within stated development/synthetic bounds. The build and arrival pack are ready for user Android testing. C121 specimen/firmware, actual phone codec/aspect/effective detail, midstream stream-size transition, physical calibration/lighting/latency/reliability/thermal/offline behavior, agreed acceptance thresholds and product-owner G3 decision remain open. This readiness is not release or physical acceptance.

