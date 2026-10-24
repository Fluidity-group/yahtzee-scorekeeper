# Camera Dice Lab: first PC test

Implementation checkpoint: local experimental lab, not connected to production scoring. Five light opaque D6s with black pips only. Natural leave-in-place holds and two opposite player seats are the test targets. No recognition accuracy claim has been established with physical dice yet.

## Start on this PC

Run `powershell -File scripts/start-camera-lab.ps1` from the project directory. It downloads pinned local vision assets if absent, builds the app, and starts a localhost preview. Open the printed Local URL plus `?camera-lab` in Chrome or Edge. With the current configuration this is:

http://127.0.0.1:8474/yahtzee-scorekeeper/?camera-lab

If a preview is already running, use that URL rather than starting another on the same port. After a rebuild, the existing PWA service worker can require another reload to display the new build.

Assets: OpenCV 4.13.0, MediaPipe Tasks Vision 0.10.21, Hand Landmarker float16 model version 1. `public/camera-assets/manifest.json` records exact download URLs, hashes and notices. Downloaded libraries/model files are ignored by Git and loaded only by the lab. The game service worker does not automatically cache them. The model card is linked in the manifest; production redistribution review remains separate from this local test.

## Before the webcam test

Use **Synthetic check** to run generated video through the actual OpenCV worker:

1. Arm next roll; wait for the settled candidate showing 1, 2, 3, 4, 5.
2. Check the confirmation box and confirm the test roll.
3. Arm again, then press **Demo: keep 2, reroll 3**. Two dice remain visible during the simulated pickup.
4. Expect kept slots 1 and 2, rerolled slots 3–5, and final values 1, 2, 6, 1, 5. The final five was rerolled even though its value did not change.
5. Confirm and inspect history. Synthetic records are marked `source: simulated`, not camera evidence.

This checks plumbing and pip recognition on ideal images. It does not validate real lighting, rotation, camera optics or player attribution.

## Logitech webcam setup

1. Plug in the USB webcam. Close other applications using it.
2. Open the lab in desktop Chrome/Edge and choose **Start webcam**. Accept the browser's camera permission. After permission the camera list should show device names; select the Logitech if the default is wrong and start again.
3. Mount directly overhead. Include the whole octagonal tray and table on the two player sides. Use white/ivory dice and diffuse illumination. The camera requests 1080p/30 fps, but the actual negotiated resolution is shown. Frames are processed at width 960.
4. In **1. Set the camera view**, adjust fixed digital zoom and the view centre. Hardware zoom, focus and exposure controls appear only when the webcam/browser exposes them. Let autofocus settle with dice in the tray, then choose **Confirm view & hold focus**. The status says which settings could actually be held; unsupported settings are not claimed as locked. If camera software continues auto-framing, disable that feature there. Digital zoom does not add image detail.
5. In **2. Confirm the rolling area**, empty the tray and choose **Auto-detect blue tray**. The detector looks for a blue convex octagon and draws an amber proposal. A large **Yes — use this shape** button appears on the preview as soon as a valid outline exists; four consistent frames also pause the search automatically. Check every edge follows the flat felt, then accept it. This freezes the boundary and shades the entire inside green as the dice-detection area. If the outline is wrong or none is found, choose **Mark 8 tray corners**, click the flat inside floor corners clockwise, then confirm. Colour and shape are only heuristics; similarly coloured walls or objects can fool the detector. Exclude the raised walls. Save calibration. Changing framing clears the outline and starts a fresh test turn. Saved profiles require matching crop/zoom and a visual recheck.
6. In **3. Check dice recognition**, place five separated dice and choose **Start recognition check**. Recognition does not run while framing/calibrating. Inspect green boxes and values. Orange boxes mean an object could not be read confidently. The baseline may reject rotated, touching or wall-adjacent dice; save those examples for tuning.

The settings panel adjusts brightness/pip thresholds and die size in processing pixels. These are prototype controls, not an expectation that players tune vision every game. First establish whether a single stable setup works under normal play.

## Roll and hold test

Select Player A and the appropriate 3/4-roll limit. **Arm before picking up or rolling** so the pickup interval is observable. Wait for hands to leave and the dice to settle. Confirm the first five-dice roll.

For the next roll, arm, leave keepers in place, pick up the others and reroll. Check the previous-roll thumbnail and the kept/rolled selectors. A `?` requires an explicit answer. Resolve every slot and check current values before confirming. Rerolled values are assigned to logical slots; the software does not identify identical physical dice permanently.

Press New turn when finished, or change the player to start that player's next test turn. The lab enforces the chosen roll limit but does not choose a scoring category or automatically advance players. Source changes start a fresh test turn. Previously accepted records remain in the session history.

The baseline can miss a fast pickup, confuse shadows, or lose dice under a hand. Those cases should produce uncertainty or a correction, not fabricated hold statistics. Confirming the held selection means the user verified it; retain the original proposal for evaluation.

## Two-player approach test

Choose top/bottom or left/right seating and enable hand/seat detection. Player A is the top/left seat; B is bottom/right. Keep wrists visible near those image edges before reaching inward. Try both hands, retrieving dice, selecting keepers, crossed reaches and simultaneous reaches.

The label is only a seat-direction hint. It never changes the selected player. `Unclear` is expected for competing approaches or hands first appearing near the centre. Dice capture waits while detected hand landmarks overlap the tray; other unclear objects and motion also block capture. Actual hand/seat accuracy requires these physical trials.

## Evidence and storage

- **Record clip** captures camera video without audio until stopped; the browser downloads a WebM file. Keep clips short. Stop or hiding the tab ends recording.
- **Save annotated still** downloads the visible boxes/values for a failure example.
- **Export roll history** downloads the current run, including observed faces, confirmed values, hold proposals, confirmed holds, actor hints, confirmed player, source and calibration reference.
- **Export all saved runs** recovers accepted test records across reloads from the separate `YahtzeeCameraLab` IndexedDB database. It does not contain normal game data. The active test turn itself is not resumed across refresh.
- **Replay video** accepts a local clip. Load/calibrate its tray outline, arm before pickup and inspect the same pipeline. Pausing, seeking or restarting invalidates the candidate. Replay records are labelled with `mediaOrigin: replay`.

Video is not uploaded or saved automatically by the application. Browser IndexedDB/download behaviour still applies. A storage failure is displayed; export the current run before leaving if persistence fails.

## First physical test batch

Record 20 ordinary first rolls and 20 rerolls using 1–4 keepers, then 10 deliberate awkward cases (touching, wall leaning, hand occlusion, shadows, same-value reroll). For each, note true values, true held subset, whether automatic values/holds were correct, any retry and the real player. Add 20 reaches per player with hand tracking enabled. These are tuning data; use separate later sessions for accuracy measurement.

After those recordings, tune segmentation/top-face isolation and pickup tracking. Do not connect automatic capture to live scoring until whole-roll correctness, hold history and false-trigger rates have been measured.

If the vision worker stops responding for eight seconds, the lab restarts it with recognition paused. **Restart lab** reloads the page if needed; the current unsaved setup will reset.
## Review lab v2: labelling and repeatable tests

The confirmed tray panel disappears after acceptance. Predictions appear above the webcam image. Camera/tray setup collapses after confirmation; reopen it to adjust framing.

Use **Freeze & review prediction** to capture the exact image submitted to recognition, with the matching predictions and settings. This works for incomplete readings too. Check the frozen image: choose **All five predictions are correct**, or enter all five actual face values and **Save confirmed values**. Labels describe an unordered five-dice roll; they do not assign individual die identities or held status. Images, original predictions, labels, source (webcam/replay/synthetic), and settings are saved in the local samples table. Export labelled examples to back them up or share them for analysis.

**Accuracy tests & saved examples → Re-test saved examples** reruns the current detector and current recognition settings against those same saved images and tray polygons. It reports exact five-dice multiset matches, requiring no unclear extra objects, alongside original matches. Synthetic/replay examples also count if saved; the export retains their source. This is a selected test collection, not a general accuracy estimate. Confirmation does not automatically train a model or adjust thresholds.

First collect 20–30 varied webcam examples, including successes and failures: all faces 1–6, rotated dice, the tray centre and edges, and normal lighting changes. Keep a separate fresh batch for checking improvements after tuning, rather than treating performance on the tuning images as independent validation. Hold/seat accuracy requires separate pickup videos.

**Game turn test — held dice & engine input** retains the existing game-adapter experiment. Arm before pickup, correct a stable five-dice candidate, check kept dice, tick the review checkbox, then Confirm test roll. These records go to the local lab input coordinator/history; they do not update the production score. Failed readings can be labelled through the independent prediction-review flow without fabricating a game roll.

## Review lab v3: click each die for 10 rolls

Choose Start a 10-roll session after setting up the webcam/tray and recognition. Roll and let the dice settle, then click the first die on the live image (or use Freeze this roll & review). The image freezes. Click each of the five dice, then choose its actual face 1–6 to confirm/correct. This also labels dice the detector missed. Green numbered markers show confirmed positions; click one to change/remove it. Save roll & continue returns to live video and advances the session toward 10 saved rolls. Discard does not advance. After ten, export or re-test the saved examples. Saved samples retain the session ID, roll number, per-die positions/values and original prediction; the in-progress session counter does not resume after a page reload.

Enable hand / seat detection above the video and choose top/bottom or left/right seating. Player 1 is top/left and Player 2 is bottom/right. Visible landmarks and wrist labels show tracked hands and estimated seat; the status shows hand count and approach/uncertainty. These are advisory spatial estimates, not identity recognition. Keep wrists visible entering from the seating side. Hand/approach evidence is retained with each saved prediction. Physical trials must validate it separately from dice recognition.

## Review lab v7: independent tray monitoring (replaces v6 behaviour)

Dice recognition uses the fixed green confirmed boundary. Tray monitoring runs in a separate worker at most once per second, between captures/reviews. Missing, uncertain, or failed monitor readings show a warning without clearing dice readings. This means a reading does not prove the tray is still aligned: check the green outline before confirming dice.

Three consistent movement observations propose an amber outline. Check it, then click **Apply updated tray bounds** between rolls. The update clears pending recognition and starts a new lab game turn because held-die coordinates changed; accepted history and saved labels remain. Capture/review blocks applying the proposal. If the amber proposal is wrong, reopen setup and mark or detect the tray again. Monitoring can be switched off independently.

Refresh until the title shows **Review lab v7**. Confirm the tray, start recognition, then test: stationary dice remain readable; a hand temporarily obscuring the tray does not blank readings through the tray monitor; a small nudge proposes amber bounds; applying them updates green bounds and resumes recognition. If the tray leaves the frame, reposition and reconfirm it before accepting rolls. Physical webcam validation is still required.
