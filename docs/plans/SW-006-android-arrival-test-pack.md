# Android C121 arrival test pack — 2 October 2026

3 October update: use the installed SW-007 standard candidate, `artifacts/sw007-mp-review/android-test-candidate.apk`, SHA256 `a131117c5e728911d079491358fe6fb13bf394960b80a9bfda8a8cb4204589fe`. Pixel installation succeeded preserving saved app data; [SW-007](SW-007-multiplayer-camera-test-readiness.md) records new449-test/19-native-test evidence. The older identity and pre-install wording below are historical; physical test steps remain applicable.

Use the standard development APK `artifacts/sw006-oct02/android-test-candidate.apk`, application ID `com.fluiditygroup.diceclubhouse.dev`. SHA256 `cd553368181173557219e2c3c388ffb9a88aa35e8f71b31923e697f5c1bee372`; exact source gate is recorded in [build readiness](SW-006-android-test-readiness.md). This is a debug build prepared for an identified user test session. Synthetic emulator evidence does not qualify the phone or C121. Android minimum API 24; tested emulator API 36. Private GoDice evaluation code is excluded.

## Before installation

Record phone model, Android version, camera specimen/model/hardware revision/firmware, APK SHA256, date, tester and Wi-Fi topology. Export any existing games from Menu → Export before replacing an installed development build. Keep that export private. Installation belongs to the user's authorized phone test session; no physical phone has been installed in this development task. Uninstalling clears local games and stored camera settings, so preserve exports first.

Complete the vendor camera setup and enable its local camera account/RTSP service using its actual supported configuration. Keep camera and Android phone on the same trusted Wi-Fi with client isolation disabled. Use the local camera account, camera LAN IP and stream1 or stream2 on port 554. The app's native sheet stores credentials; do not put a credential URL, password or raw video in bug reports. Hosted camera play and WAN video forwarding are outside this build.

## First connection and playable roll

1. Open Menu → Camera connection, or choose C121 camera when creating a local game. Save the LAN IP, local username/password and stream in Set camera connection. Hide the keyboard before tapping Save if it covers the button. Select the saved camera and tap Connect. Expect a live preview and a calibration prompt. If the first frame is not ready, wait briefly and retry Calibrate tray; errors must offer a safe retry path.
2. Place five ordinary light pipped D6s on the tray. Choose an elevated side or downward view that keeps every die/pip visible. Tap Calibrate tray and mark eight points clockwise around the inside playable boundary. Confirm tray outline. Recalibrate after moving camera/tray, changing stream or reconnecting. Keep near/far dice inside the marked area.
3. Create a local camera game and Start camera turn. Roll all five dice, remove hands and wait for them to settle. Tap Capture / review dice. Check all five proposed faces, correct unclear/wrong values, then tap Confirm roll. The roll allowance and recommendations must change only after confirmation. Confirming a roll and scoring a category are separate actions.
4. Reroll the dice you want to change. At review, mark kept logical slots and make their values match the previous confirmed roll. Slot positions do not establish physical die identity. Confirm the roll, choose a legal score category and confirm its points. Complete all 13 categories, including a zero score. Check History and exported events for one accepted event per confirmation, correction provenance and kept-slot values.
5. Move/reroll dice while a review is open, then try Confirm roll. Expect rejection and a fresh capture, with no extra accepted roll. Try incomplete, touching/occluded and hand-in-tray scenes; ambiguity must remain visible and correctable. Capture is player-triggered; this build does not detect a physical reroll merely from advancing frames.

## Recovery, persistence and offline checks

- Background/resume the app, interrupt phone Wi-Fi, reboot the camera and try wrong credentials. Expect a safe interrupted/authentication state, no stale accepted frame, and manual reconnect plus fresh calibration/capture. Check that disconnect hides the native preview and releases the stream.
- Close/reopen the app. Confirm the game remains saved and the profile can reconnect without retyping credentials. Remove connection, reopen and verify the removed profile/credentials are unavailable. Do not infer a phone hardware-backed Keystore from emulator evidence.
- During a camera turn choose Finish manually, score a category with the keypad and continue the next turn. Prior accepted rolls and score history must remain intact; fallback must not invent a camera reading.
- Disconnect internet while retaining the LAN. Local preview, packaged recognition, review and scoring must work. Hosted multiplayer remains an internet-dependent separate path.
- Check portrait/landscape, small-screen scrolling, keyboard and large text. Native preview must remain inside the camera panel; frozen calibration/review pixels must align with the live view. Reconnect or stream-size change must invalidate old review/calibration.

## Measurements and report

Record ambient-only and one/two diffused-light configurations, camera height/distance/angle, near/far pip detail, glare, exposure and die-plane lux with instrument identity. Keep fresh labelled images privately under ignored artifacts, separate from tuning data. Compare optical views rather than transferring synthetic recognition results.

Measure physical dice settled → review visible with an external recording/timer; report median/p95/max, sample count and method. Local timing diagnostics show extraction/PNG, file fetch/decode, worker startup/inference and review preparation. They retain at most 64 scalar samples in RAM and clear on panel close. These stages use distinct clocks and provide no sensor latency measurement; do not sum them into an end-to-end claim. Capped values are lower bounds.

Run a 30-minute physical play/capture session and record thermal behavior, app responsiveness, failures and recovery. Emulator resource evidence does not measure phone temperature or real Wi-Fi robustness. Report exact-roll accuracy, correct individual dice, rejected scenes and accepted wrong readings separately; explicit confirmation remains mandatory. Numerical coverage/latency thresholds and G3 acceptance require the product owner's decision after representative fresh evidence.

For a defect include exact APK hash, phone/camera/stream identity, steps, expected/actual behavior, status message, local timings and whether a roll/score was persisted. Redact credentials and use private storage for imagery. Stop camera connection at the end of the session and record final state. To roll back, use a previously identified compatible build only after exporting games; never assume a downgrade or reinstall preserves local data.


