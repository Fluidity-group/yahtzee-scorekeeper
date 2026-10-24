# Camera recognition v2 design and development checkpoint

## Problem and measured baseline

The first physical collection contains ten labelled five-dice webcam rolls (50 dice). Replaying the original reader gives 10 readable/correct dice, 40 rejected objects, and zero complete correct rolls. Dice occupy about 24–33 processing pixels. Rotated faces are readable to a person, but axis-aligned crops include dark felt and the shape fill-ratio test rejects rotated squares.

## Implemented pipeline: opencv-pips-0.2

1. Keep the confirmed tray polygon and brightness-based light-die candidate extraction. This remains a light opaque D6 experiment.
2. Fit a minimum-area rotated rectangle. Check dimensions, aspect and contour occupancy relative to that rectangle rather than an axis-aligned box.
3. Check the actual contour against tray bounds. An enclosing box corner outside the tray no longer disqualifies an otherwise contained die.
4. Rectify each face to a 64 × 64 grayscale patch with a perspective warp from the rotated rectangle. This corrects in-plane rotation; it is not full top-face segmentation or unrestricted perspective recovery.
5. Estimate a per-face Otsu threshold. Count compact dark interior regions at that threshold and a darker threshold bounded by the face's minimum intensity. Ignore the outer crop margin where felt/side-face edges intrude.
6. Require a legal 1–6 pip layout, allowing quarter-turn symmetry and limited positional error, and agreement between both thresholds. Otherwise return an explicit rejection. The quality field is a heuristic, not a calibrated probability.
7. Keep stability, hands, user confirmation and game input separation intact. Saved observations carry recognizer version 0.2 and original labels are not rewritten.

The pip-threshold manual control is now labelled legacy-only. Brightness and size controls still apply. Processing width remains 960 for this checkpoint; enlarging the rectified patch does not restore lost detail.

## Measured checkpoint

Revised replay: 46/50 correctly located/read dice and 6/10 complete exact rolls. Four readings remain rejected, in rolls 1, 4, 6 and 8. No accepted incorrect values were observed in this collection. This collection was used during development, so these figures are development-set results only. The saved original image/label export is never modified.

The comparison runner is `node scripts/evaluate-camera.mjs path-to-labelled-examples.json`. It loads actual OpenCV and the exported PNG frames, executes baseline and revised readers against identical images/settings, and writes `artifacts/camera/recognition-comparison.json`. Exact-roll scoring compares the five-value multiset and requires no rejected objects. Position-based per-die scoring uses a 0.04 normalized centre-distance tolerance against clicked labels; full-roll scoring is independent of that tolerance. Baseline implementation remains in recognizer-v1.js for repeatability. PNG decoding uses the available pngjs package.

## Next stages

- Collect a fresh ten-roll batch without tuning against it. Report full-roll exact rate, correct/incorrect/unknown dice, latency and rejection reasons. Keep physical examples separate from synthetic tests.
- Retain full-resolution source frames and process a tray crop or provide a measured 1440/1920 option. Scale size settings consistently; benchmark PC latency before choosing defaults. Existing saved 960-wide images cannot gain real detail through upscaling.
- Inspect remaining one-pip failures, uneven illumination, touching dice and wall-adjacent faces. Improve top-face segmentation only with labelled evidence; do not simply lower acceptance standards.
- Add automatic brightness candidate segmentation and calibrated uncertainty after a larger varied dataset exists. Current per-face adaptation addresses pip reading, not all background/light conditions.
- Evaluate hand/player approach separately with pickup sequences and user-confirmed seats. Still images cannot establish roll ownership reliably.

## Feedback and engine contract

Click-to-review stores original image/predictions, corrected per-die values and positions, session ID and roll number. Confirmations are labelled examples, not online retraining. Re-test saved examples runs the current recognizer. Game-turn confirmation remains a separate explicit action through the input coordinator, preserving held versus rolled history.

## Recognition 0.3 / Review lab v5 checkpoint

Both saved batches have now been replayed after development. The current change permits at most 3 processing pixels of contour excursion outside the calibrated polygon (scaled with processing width); the die centre must still be inside. Dice outside that allowance remain rejected. A middle pip threshold was added: at least two of three readings must match a legal pip layout, and any conflicting valid value vetoes acceptance. This recovers the saved one-pip failures without accepting a single unsupported threshold result.

| Dataset | Previous exact rolls | Current exact rolls | Current readable dice |
|---|---:|---:|---:|
| Original development batch | 6/10 | 9/10 | 49/50 |
| Second batch (now also used for development) | 6/10 | 9/10 | 49/50 |
| Additional standalone example | 1/1 | 1/1 | 5/5 |

All 98 accepted readings in position-labelled batches match their labels using the evaluator's centre tolerance. Two boundary rejections remain (original roll 1 and second-batch roll 6). Do not loosen the boundary further merely to improve this score; confirm/calibrate the outline when a die sits beside the rim. The combined raw report is artifacts/camera/v3-both-batches.json. The second batch is no longer an untouched validation set after this change.

### Physical tests still required

1. Fresh recognition batch: confirm the tray outline and collect ten new rolls, including varied rotations and edge positions. Save failures too. Export labelled examples. Score exact rolls, correct/incorrect/unknown dice and latency before further tuning.
2. Yahtzee sequence: open Game turn test. Arm before picking up dice. First roll all five and confirm. For roll two, leave two dice and reroll three. For roll three, leave four and reroll one. Check kept/rolled masks and values after each capture. Repeat with duplicate faces and a reroll returning the same value. Export roll history. Unknown pickup evidence requires a user decision; it must not be silently scored as a keep.
3. Player approach: enable hands, select seating axis, alternate Player 1 and Player 2 for ten approaches. Keep wrists visible before reaching inward. During each frozen review set Who rolled? to the actual player; no value is preselected. Record crossed/simultaneous hands separately as ambiguous. Saved confirmedActor can be compared with prediction.actorHint (0=Player 1, 1=Player 2, null=unclear). Still-image replay tests face recognition; it cannot recreate hand trajectories or prove hold tracking.

These physical trials require the webcam, dice and people; automated tests cannot substitute for them. Confirmations still do not automatically train the recognizer or write production game scores.

## Recognition 0.4 / Review lab v5.1 checkpoint

The third batch originally scored 8/10 exact rolls and 48/50 readable dice. Its failures were a one-pip face (roll 1) and a three-pip face (roll 10), both returning a legal pattern only at the darkest of three thresholds. The bounded per-face sweep now includes 77.5% of Otsu as a fourth threshold, alongside 100%, 92.5%, and 85%, each bounded by the minimum face intensity. Acceptance still requires two matching legal patterns and vetoes any conflicting valid face value. Single-threshold successes remain rejected.

Replay after this change: third batch 10/10 complete, 50/50 position-matched dice. Original and second batches remain at 9/10 and 49/50 each. Including the standalone example, the complete export is 29/31 exact rolls, with 153/155 readable dice. All 148 accepted readings in the three position-labelled batches match user labels; the extra five values are confirmed by the standalone full-roll label. Two earlier boundary rejections remain. This is now development-set performance across all three batches, not an independent accuracy estimate. Report: artifacts/camera/v4-three-batches.json.

Automated checks now include 1-, 2-, and 5-pixel visible gaps between synthetic dice, which remain separate. Edge-touching synthetic dice are rejected rather than counted as a single face. These tests do not establish robustness to real touching dice, glare or live flicker. A short recorded physical clip is still needed to reproduce any close-dice failure absent from the saved frames. No watershed/learned instance segmentation has been introduced.

## Review lab v6: confirmed tray tracking

Follow small tray movements is enabled by default during recognition. The worker checks for the blue convex octagon in each processing frame. The tracker matches cyclic vertex order and winding to the confirmed reference, fits a similarity transform, and rejects large shape/scale/rotation/displacement changes or competing candidates. Three consistent observations are required before applying a movement to the confirmed bounds. Small jitter is ignored. The user-confirmed outline is transformed, rather than replaced unconditionally by a newly detected outline.

Uncertain, missing, clipped or significantly displaced trays pause result acceptance. Keep the whole tray visible and clear of hands; if it cannot match again, reopen Camera & tray setup and confirm the area again. It does not try to identify a tray after arbitrary relocation. Turning Follow small tray movements off explicitly restores fixed bounds.

A resync invalidates active capture and starts a fresh test turn because held-die coordinates are no longer reliable. Accepted history is retained. Frozen labelled reviews keep their original image and polygon and can still be saved. Each accepted observation now includes its actual polygon and calibration ID.

Tests cover translations, cyclic order/winding, jitter, jumps, wrong scale and missing/competing candidates. The latest ten saved images yielded an unambiguous blue octagon in eight, and six passed the conservative initial-reference match; four required seeking/reconfirmation. Repeating a still tests matching only, not real movement tracking. Physical validation: confirm an empty tray, add dice, nudge it slightly, wait for bounds to re-sync, then partially remove it from the view and verify readings pause. The detector may also pause during hand occlusion. These limitations are visible rather than silently retaining stale bounds.

Latest fourth recognition batch: 7/10 complete rolls, 47/50 readable dice; two pip-pattern rejections and one boundary rejection. This release adds tracking; it does not claim those recorded face-reading failures are fixed.

## v7: decouple boundary monitoring from face recognition

Supersedes v6 automatic resync and acceptance gating. Normal dice-worker frames no longer run tray detection. A second worker receives one frame per second when recognition is active and no capture/review is underway. Its request ID, source epoch, calibration ID, age, and worker identity guard delayed responses. Failure/timeout disables only monitoring; calibration edits and source stop terminate it.

The confirmed polygon remains immutable until explicit acceptance of a stable movement proposal. An amber candidate and separate monitor status explain the distinction. Applying it invalidates in-flight dice frames, resets motion/held tracking, and starts a new lab turn while retaining saved history. Frozen review labels retain their original image/bounds. Tray uncertainty is advisory; the user must verify alignment before acceptance. This trades automatic resync for predictable lab testing and prevents corner jitter from starving face recognition.

Regression coverage exercises missing proposals without loss of readings, stable movement without implicit boundary changes, explicit apply, worker failure isolation, and ignored callbacks from terminated workers. Real webcam movement and occlusion remain manual acceptance tests.

## v7.3: conservative contact splitting

Rejected size/shape regions get a fallback using two mask erosion passes (2 and 3 pixels at the processing resolution). A replacement requires 2–5 fully contained readable regions, agreement on face values and centres across passes, no contained rejected objects, and at least 55% bounding-box coverage. Readable original dice remain unchanged. Broad edge contact without a separable neck remains rejected. This is not general instance segmentation, and has not yet been validated against the user's latest unsaved clustered scene.

Frozen review diagnostics now use the frozen prediction, including the small count line. Verification: 49 camera tests pass; replay of 51 saved frames yields 46 exact rolls. The most recent ten-frame batch still passes completely. Next physical test: retry the same touching-ones arrangement, label all five centres and export the failed examples too.
