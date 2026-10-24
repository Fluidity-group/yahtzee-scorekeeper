# PC webcam dice driver: research and staged development

Design date: 2026-09-28. Status: experimental PC lab implemented; physical webcam validation pending. See [test instructions](camera-dice-testing.md). Game-scoring integration remains deferred until the camera and hold-history experiments pass.

## Outcome and first scope

Build a local Camera Dice Lab in the existing Vite/vanilla-JS app. Use a PC webcam, five ordinary pipped D6s, the user's RERIVER octagonal dark-blue felt tray, and two players seated on opposite sides. First prove recognition and seat attribution independently of scoring; then connect confirmed rolls through a common input boundary.

The first usable version reads a settled roll, shows each face over its die, lets the user correct it, and requires Confirm roll. It also displays an experimental approaching-seat suggestion. Reading hands must not silently select a player, consume a roll, or pass a turn.

No cloud inference is required. Initial target is desktop Chrome/Edge on localhost. Future phone capture and Raspberry Pi processing should reuse the event contract, not necessarily the same runtime.

## Research: demonstrated approaches versus proven reliability

These sources demonstrate feasibility. None supplies a benchmark establishing accuracy for our camera, blue tray, five dice, and two-player interaction. We must measure that ourselves.

| Source | Evidence and usefulness | Adoption decision |
| --- | --- | --- |
| [BenyaminZojaji/Dice-Recognition](https://github.com/BenyaminZojaji/Dice-Recognition) | MIT-labelled D6 example using OpenCV edges, thresholding, morphology and circle detection. | Best simple algorithm reference. Validate on recordings before reusing code; retain attribution for copied code. |
| [N3VERS4YDIE/dice-recognition](https://github.com/N3VERS4YDIE/dice-recognition) | MIT-labelled webcam/video project using YOLOv8; repository includes training workflow and references to weights/data. | Comparison candidate if classical vision fails. Its MIT label does not resolve dependency or dataset/weight terms. [Ultralytics documents AGPL/Enterprise licensing](https://www.ultralytics.com/license). Do not assume the complete stack is permissively licensed. |
| [ordovas/dice-scores-recognition](https://github.com/ordovas/dice-scores-recognition) | Camera segmentation and CNN classification of D6/D10; author reports angle, glare and D10 difficulties. README says trained models and dataset were not uploaded. | Research reference, not a ready pretrained dependency. Reuse licence not established in this review. |
| [dcmouser/dicer](https://github.com/dcmouser/dicer) and [author's paper](https://www.donationcoder.com/Software/Mouser/dicer/DicerC1.pdf) | OpenCV die-face comparison/clustering for fairness testing, including discussion of polyhedral dice. | Useful for a later per-die training workflow. Single-die controlled apparatus is a different task from our multiplayer tray; reuse licence not established here. |
| [RollSight](https://www.rollsight.com/) | Active camera-to-tabletop product accepting webcam/phone/document-camera input. | Useful external comparison. Free use does not establish open-source access; no reusable recognition SDK or code licence verified. |

Keep numbered D6, D4, D8, D10, D12, D20 and percentile dice as later recognizer profiles. They need more than pip counting: face selection, rotated numerals, 6/9 conventions, and die-specific result conventions (especially D4). Do not extend the Yahtzee rules to these types merely to test recognition.

## Library choice

- **OpenCV.js:** baseline tray masking, background comparison, contour extraction, top-face normalization and pip detection. OpenCV 4.5+ uses Apache-2.0; pin the actual release and retain notices. [Usage](https://docs.opencv.org/4.x/d0/d84/tutorial_js_usage.html), [licence](https://opencv.org/license/).
- **MediaPipe Tasks Vision Hand Landmarker:** wrist/palm landmarks and short hand trajectories. Use its browser package in a worker; its synchronous detection can block the UI. Repository code is Apache-2.0; record the exact model asset's provenance and terms separately when selected. [Web documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js), [repository licence](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE).
- **Native browser video/canvas APIs:** camera selection, preview, frame acquisition, optional local clip capture. Camera access requires user permission and localhost/HTTPS.
- **Existing Vitest and Dexie:** state-machine tests and versioned calibration/experiment records. No UI framework change.

Self-host pinned WASM/model assets with a small provenance manifest (version, URL, checksum, licence). Load vision assets only when the lab opens. Keep them out of the default game startup bundle. Benchmark CPU first; accelerated backends are optional optimizations.

## Tray and camera setup

The supplied [Amazon ASIN B0CSCLYX98](https://www.amazon.com/dp/B0CSCLYX98) could not be read directly by the research tool. A [matching-ASIN reseller listing](https://www.ubuy.hk/en/product/J2ORPB9DK-reriver-dice-rolling-tray-blue-felt-lined-pu-leather-octagon-dice-tray-for-dungeon-crawler-games) reports approximately 31 x 29 x 4 cm exterior dimensions. Treat these as provisional; measure the inner flat floor before setting physical scale.

1. Mount the webcam rigidly above the centre. Frame the entire tray plus roughly 10–15 cm of table on the two player sides so wrists are visible before entry. Adjust height for the actual lens; do not specify height from resolution alone.
2. Start at 1920 x 1080 capture and approximately 30 fps, subject to camera capability. A useful initial target is 40–60 or more pixels across a die's top face. Display actual resolution and measured die size during calibration.
3. Use opaque white/ivory dice with black pips initially. Dark-blue felt should provide contrast, but its texture and changing shadows require empirical thresholds.
4. Use diffuse lighting from both sides, avoid direct reflections, and lock focus/exposure when the camera supports it. Focus at die-top height.
5. Calibrate the eight vertices of the flat inner floor, excluding walls/rim, and two approach regions outside the tray. A held-dice strip is an optional fallback experiment; normal play must allow players to leave held dice where they landed. A rectangle crop alone will include the octagon's corners and walls.
6. Save camera ID, resolution, orientation, floor polygon, zones, sample die size and empty-tray reference as a versioned profile. Camera movement, changed resolution or changed orientation invalidates it. Optional fiducial markers outside the floor can later detect drift.

An overhead camera cannot guarantee detection of every cocked die. Side-face pips, wall leaning, stacking and partial occlusion must be test cases; questionable observations should remain unconfirmed. A floor-plane perspective correction does not remove parallax from elevated die tops.

## Driver boundary

Use application input adapters, not an operating-system device driver:

```text
GoDice adapter --------\
Camera adapter ---------+--> capture coordinator --> confirmed roll --> game rules/store
Manual faces adapter --/
                                      ^
Seat-direction estimator --> actor hint (advisory)
```

Manual score entry and manual face entry are distinct. Preserve existing manual scorekeeping, which has no five-face roll requirement. Add manual face entry as another producer of confirmed roll candidates when desired. Keep simulated input as a development/test source.

Existing code observations:

- `src/dice/capture.js` has useful acceptance and stale-connection concepts, but requires five persistent device IDs and per-die movement evidence.
- `src/dice/game-capture.js` and `automatic-capture.js` enforce GoDice context, epochs and hold identity.
- `src/game/core.js` admits only manual/simulated/godice and validates GoDice evidence and IDs.
- `src/multiplayer/room.js` and its UI contain additional GoDice-only source and host checks.

Introduce a common candidate/coordinator above provider-specific capture logic. Retain the BLE collector. Camera input emits whole-scene observations; do not invent five permanent camera device IDs or synthesize BLE movement packets.

Proposed adapter methods: `start(config)`, `stop()`, `subscribe(listener)`, `arm(context)`, `cancel(captureId)`. Capabilities describe supported die types, physical identity support, automatic movement detection and actor hints.

Proposed event envelope:

```js
{
  version: 1,
  source: 'camera', // 'godice' | 'manual-faces' | 'simulated'
  sessionId, sequence, captureId, observedAt,
  context: { gameId, revision, turnId, playerId },
  kind: 'candidate', // status | activity | candidate | invalidated | error
  observation: {
    dice: [{ slot: 0, type: 'd6', value: 4, quality: 0.96,
             region: 'roll', bounds: [0.2, 0.3, 0.08, 0.08] }],
    held: [false, false, false, false, false],
    settledForMs: 650, calibrationId, recognizerVersion,
    actorHint: { seat: 0, quality: 0.9, reason: 'entry-from-seat-zone' },
    warnings: [], evidenceRef
  }
}
```

The object illustrates fields, not a valid complete five-dice candidate. Bounds use normalized unmirrored source-image coordinates. `quality` is an algorithm score, not a calibrated probability. Keep original observations and manual corrections separately.

The coordinator validates the expected count, face ranges, held values, current context, active session, monotonically increasing sequence, freshness and single-use capture ID. Any new motion, turn change, camera loss, calibration change, tab pause or input switch invalidates a pending candidate. Accept only once, against the current game revision. The game remains authoritative for turn order and score eligibility.

Integration must add provider-specific evidence validation and source migration explicitly. Preserve old saved games and BLE deviceIds. Replace relevant source checks with capabilities, without allowing arbitrary sources through validation. Multiplayer remains out of the first lab; eventual camera rolls retain the existing host authority checks.

## Recognition and roll lifecycle

Pipeline: crop floor -> compensate moderate illumination/background variation -> segment dice -> isolate top-face candidates -> count dark pip components and validate pip layout -> stabilize across time -> propose complete roll.

Do not count all dark blobs in a whole frame. Blue felt, shadows and visible side pips would contaminate the total. Use size/shape constraints and top-face boundaries. Reject merged contours when two touching dice cannot be separated confidently; only add a trained detector if recorded evidence justifies it.

State sequence: `unconfigured -> ready -> armed -> activity -> settling -> candidate -> accepted`. Errors/occlusion invalidate or suspend the current attempt. Initial stability target: about 500–800 ms with agreement across multiple processed frames, tuned from recordings. Process only the latest frame, with one inference in flight; drop excess frames rather than queue stale work. Measure actual throughput and latency.

Stage 1 requires an explicit Capture action and confirmation. Later automatic arming requires an observed pickup/roll cycle. Changed values alone cannot identify a new roll, and unchanged values cannot rule one out. Rearranging dice must not consume a roll.

### Natural Yahtzee holds and rerolls

Primary interaction: roll all five dice, leave the keepers on the floor, pick up the others, and reroll them. Repeat within the game's roll limit (normally three, with the existing competition/accumulative final-turn rule permitting four). A player can stop early or pick up a previously held die on a later roll. Holds are decisions for each reroll, not permanent flags for the turn.

After confirmation, save a five-die scene with logical slots, face values, centres, top-face outlines and observation quality. Track the interval between that scene and the next settled scene, including the pickup interval. Record which locations remain occupied, which dice are visibly removed, and which locations become occluded. Do not classify a die as removed merely because the detector briefly loses it beneath a hand.

Once the hand clears, a visible remaining subset is strong hold evidence. Match it to the prior scene using position, shape and face together, allowing modest displacement. Then track incoming/reroll activity and reconstruct the complete five-die result. Preserve confirmed held slots and assign new values to the remaining logical slots. Assignments between identical dice that disappeared together have no physical-identity meaning.

The tracker must distinguish `held`, `rerolled`, and `unknown` evidence. A die returning to the same place/value may still have been rerolled. A die nudged by a hand or struck by another die may have moved without being intentionally rerolled. If the pickup subset was fully occluded, all dice were rearranged, or an apparently held die changed face, mark the hold decision uncertain and ask for correction. Never manufacture exact hold history from the final face values alone.

For the first prototype, show 'Kept 2 / Rerolled 3' with highlights on the prior scene, and let the user correct the kept subset before Confirm roll. This lets us collect ground truth while automatic inference improves. The optional hold strip can provide a simpler comparison mode, but is not required for normal gameplay. Taking dice out of camera view as keepers is initially unsupported for automatic inference; allow explicit held-value confirmation rather than guessing whether removed dice were held or rerolled.

Capture state should include `confirmed scene -> selecting/pickup -> remaining-subset evidence -> reroll activity -> settling -> candidate`. The remaining-subset stage may be unobservable in fast play: retain uncertainty and use confirmation. An explicit capture/confirm fallback allows a valid roll to be recorded even if motion events were missed. Rearranging or picking up dice without throwing them does not by itself commit a roll.

### Durable roll history for statistics

Persist one accepted record per roll, with corrections as separate events:

```js
{
  rollId, previousRollId, turnId, playerId, rollNumber,
  source: 'camera', capturedAt, acceptedAt,
  before: [6, 6, 2, 3, 4],
  after:  [6, 6, 6, 1, 5],
  heldMask: [true, true, false, false, false],
  rerolledSlots: [2, 3, 4],
  heldValues: [6, 6], rolledValues: [6, 1, 5],
  holdEvidence: { method: 'observed-pickup', quality: 0.94,
                  confirmedByUser: true },
  actorEvidence: { suggestedSeat: 0, confirmedPlayerId: playerId },
  identityScope: 'logical-slots', calibrationId, recognizerVersion,
  evidenceRef, correctionIds: []
}
```

First roll has no prior scene and all five slots rerolled. Store observed proposals separately from confirmed masks and values. If a user confirms values but cannot resolve the hold history, persist `holdStatus: 'unknown'` with a null mask in the lab; do not coerce it to five rerolled dice. The initial game integration requires a resolved held mask before committing a reroll. Player hints likewise remain distinct from the authoritative player attribution.

This supports kept-face frequencies, reroll counts, changes in combinations, and outcomes after keeping a pair/triple. Statistics must use only resolved, accepted, non-excluded records, apply correction history, and report missing coverage. Physical per-die bias analysis is not supported for visually identical dice; it would require reliably distinguishable dice or markers. Record the chosen scoring category and turn completion through existing game events so early stopping and final outcomes can be joined to roll history.

## Two-player hand-direction experiment

This estimates a seat from an approach trajectory; it does not recognize a person's identity. Register Player A and Player B on opposite camera sides, with a short reach-in calibration for each. Both left and right hands must work. MediaPipe handedness is not a player label.

Run hand detection on the wider image while dice recognition uses the inner-floor crop. Track wrist/palm positions over several frames, identify the approach region crossed before tray entry, and keep the original entry side even if the hand crosses the tray centre. Allow up to four detected hands for two people and associate tracks conservatively; track IDs are temporary.

Bind a seat hint to an interaction episode, not simply the latest visible hand. A reach to retrieve previous dice is not necessarily the next thrower. Collection, holding selection and release can overlap; the first version therefore labels the approach and asks the user to confirm the roller with the roll.

Return `unknown` for side-entry outside the registered zones, a hand first detected inside the tray, simultaneous competing approaches, track loss or crossed hands. No hand detected does not prove the tray is unobstructed; combine with scene movement/occlusion checks. Keep seat quality separate from dice quality: valid dice can be confirmed with a manually selected player.

Display 'Approach: Player A', 'Approach: Player B', or 'Unclear'. If the hint disagrees with the active player, surface that disagreement; never silently reassign the roll or advance the game. Swapping chairs requires reassigning seats.

## Development stages and exit checks

| Stage | Deliverable | Exit check |
| --- | --- | --- |
| 0: Contract and replay fixtures | Adapter schema, coordinator state machine, synthetic/replayed events, isolated lab entry | Tests reject stale sessions/revisions, duplicate acceptance, source switches and invalid holds; existing BLE tests still pass. |
| 1: Camera and calibration | Device picker, preview, floor polygon, seat zones, optional hold zone, profile save/load, local still/clip export | Real PC camera runs for 30 minutes; stop releases camera; unplug/reconnect and background/resume invalidate readings correctly. |
| 2: D6 recognition | Per-die overlay, pip count, uncertainty reasons, confirmed capture and manual correction | Evaluate 300 independently labelled five-dice settled scenes; initial target >=99% exact whole-roll accuracy among accepted scenes and >=90% acceptance coverage on normal valid scenes. Report errors and abstentions separately. |
| 3: Holds and roll episodes | Natural leave-in-place hold inference, pickup tracking, editable kept-subset overlay, movement/stability gate, durable roll history | Test all hold counts 0–4, same-value rerolls, releasing a prior hold, duplicate faces, fast pickup/release, nudges, collisions, occlusion, pickup without throw and interruptions. Evaluate >=200 labelled reroll episodes; target >=99% exact masks among emitted hold proposals and >=90% proposal coverage on ordinary play. No duplicate committed rolls in replay tests. |
| 4: Two-player attribution | MediaPipe tracking, entry-side hints, uncertainty handling | 100 ordinary interactions per player plus >=50 ambiguous/crossing/dual-hand cases. Target >=95% correct among emitted hints, >=90% hint coverage on ordinary interactions; ambiguous cases must abstain rather than choose arbitrarily. |
| 5: Local game integration | Camera and manual-face adapters feed confirmed rolls, provenance/corrections stored | Complete two-player games, including bonuses, four-roll final turns, restart/recovery and manual fallback. Regression tests cover game rules and existing GoDice flow. |

These are experimental targets, not achieved accuracy claims or production guarantees. Hold out recordings by session/lighting setup, not adjacent frames from the same clip. Measure full-roll accuracy, accepted coverage, silent errors, duplicate events, median/p95 settling latency and CPU load. Initial latency target: p95 under 1.5 seconds after hands leave and dice stop. Include a challenge set with touching, wall-adjacent, cocked, stacked and missing dice; publish challenge results separately.

Save recordings only through an explicit lab capture control, locally by default. Ground-truth records include face values, held values, actual roller, interaction type and whether the scene should be rejected. Do not use the expected turn as the ground-truth player label when evaluating hand attribution.

## First implementation slice

Add the isolated Camera Dice Lab, common event contract, replay tests, webcam preview and octagonal calibration. Then add one-die pip detection before five-dice scenes. Keep actual scoring disconnected until recognition and freshness tests pass. Add hand-direction analysis after there is a useful camera/recording harness, so its performance can be measured independently.

Proposed locations: `src/dice/input/` for contract/coordinator; `src/dice/camera/` for frame acquisition, calibration, worker, recognizer and seat estimator; `src/dice/camera-lab.js` for the lab UI; `tests/camera-*.test.js` for deterministic logic. Large local recordings should stay outside tracked source; small labelled fixtures may be versioned deliberately.

Before physical testing we need the webcam model, actual inside floor dimensions and die size/colour. Development of the lab and replay harness can proceed without those measurements. Raspberry Pi packaging and broader dice types follow successful PC validation.
