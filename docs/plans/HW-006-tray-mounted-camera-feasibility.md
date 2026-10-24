# HW-006: Tray-mounted camera feasibility

Date: 7 October 2026. Owner: product owner. Engineering coordinator/author: Codex. Independent reviewer: unassigned.
State: researched and calculated design advisory; geometry script executed. No hardware implementation, deployment, physical measurements or acceptance.
Project/gate: HW optical/mechanical concept with SW/INT impacts; G1 design proposal, G2/G3 open.
Baseline: HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc plus extensive pre-existing modified/untracked work. This task preserves that work and adds advisory records/calculation assets only.

## Purpose and requirements

User requests investigation of cameras embedded in the walls of their RERIVER octagonal tray (Amazon ASIN B0CSCLYX98), to simplify capture and eliminate movement-related calibration loss. Evaluate wall dimensions, full-tray field of view, central dice visibility, side-face inference, camera count, height/shape changes, and alternatives. No purchases, fabrication or device changes requested.

| Requirement | Criterion/method | Actual evidence and state |
|---|---|---|
| HW006-R1 | Identify published tray dimensions; distinguish actual internal geometry | Amazon listing recovered via descriptive product URL: 12.2 x 11.42 x 1.57 inches; bullet says approximately 1.57 deep and 11.42 across. Internal wall height, thickness, slope and inner polygon unmeasured. Published evidence obtained; specimen open. |
| HW006-R2 | Calculate elevation and required height over nominal span | Reproducible script and results linked below; 16 mm level dice and 290 mm nominal span explicitly assumed. Calculated, not measured. |
| HW006-R3 | Distinguish FOV, useful pip detail and occlusion | Ideal aperture/grid analysis executed; no optical or recognition acceptance. |
| HW006-R4 | Explain side-face ambiguity and required die model | 24 proper cube orientations enumerated; a known ordered adjacent pair uniquely identifies top in the supported layout. Opposite-sum rule without handedness leaves a top/bottom ambiguity. |
| HW006-R5 | Recommend bounded comparative trial | Adjustable two/four elevated views and tray-attached overhead option proposed below; no trial executed or threshold accepted. |

## Published sources and specimen limits

Accessed 7 October 2026:

- [Amazon product listing](https://www.amazon.com/RERIVER-Rolling-Leather-Octagon-Dungeon/dp/B0CSCLYX98): RERIVER, blue, PU leather/felt, octagonal. Overall dimensions approximately 309.9 x 290.1 x 39.9 mm. Listing also describes approximately 39.9 mm depth and 290.1 mm across. These do not establish inside dimensions or a regular octagon; use measured internal rolling-floor dimensions before CAD. Initial bare-ASIN URL retrieval failed; descriptive URL succeeded.
- [TP-Link C121 specifications](https://www.tp-link.com/us/home-networking/cloud-camera/tapo-c121/): 2560 x 1440, advertised 103 degrees horizontal / 55 vertical / 120 diagonal; enclosure 67.4 x 57.4 x 44.1 mm. No established minimum focus distance in these specifications. Received revision, actual lens/stream crop and close focus still need measurement. This body is not a miniature embedded wall module.
- [Edmund Optics FOV explanation](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/understanding-focal-length-and-field-of-view/): distinguishes angular field, working distance and image detail; informs ideal geometry, not an empirical result for our tray.
- [OpenCV marker pose documentation](https://docs.opencv.org/4.13.0/d5/dae/tutorial_aruco_detection.html): known marker geometry plus calibrated intrinsics supports pose estimation; does not establish our automatic registration implementation or field reliability.

## Calculation model and results

Assets: [script](../camera-design/tray-wall-feasibility/analyze.py), [results](../camera-design/tray-wall-feasibility/results.json), [scaled cross sections](../camera-design/tray-wall-feasibility/geometry.png).

Coordinate assumptions: lens height h above rolling floor, level cubic die side d=16 mm, horizontal lens-to-die distance r. Nominal camera on rim of 290 mm span: centre r=145, far evaluation r=290 (conservative cross-section point; actual die centres cannot sit on the wall). Lens elevation above die top is theta=atan((h-d)/r). Approximate top depth along the view after foreshortening is d*sin(theta); this is an object-space geometric equivalent, not sensor pixels. Actual dice size, bevels, pip recesses and internal span are unmeasured.

| Lens height above floor | Centre top angle | Far-side top angle | Centre top depth after foreshortening |
|---|---:|---:|---:|
| 40 mm | 9.4 deg | 4.7 deg | 2.6 mm |
| 75 mm | 22.1 deg | 11.5 deg | 6.0 mm |
| 100 mm | 30.1 deg | 16.2 deg | 8.0 mm |
| 120 mm | 35.6 deg | 19.7 deg | 9.3 mm |
| 150 mm | 42.7 deg | 24.8 deg | 10.9 mm |
| 180 mm | 48.5 deg | 29.5 deg | 12.0 mm |

40 mm is an optimistic upper-rim optical-centre placement, not the average position of a module inside that wall. A 25 mm lens gives only 3.6 degrees to the centre top; h<=16 cannot directly view the ideal horizontal top. With 20 mm dice and h=40, centre angle is 7.9 degrees. A 30 degree centre trial target requires h~100 mm; 45 requires h=161 mm. A single rim view needs h~183 mm for 30 degrees even at r=290. The 30 degree value is a proposed useful geometry target, not a recognition confidence guarantee.

### FOV is separate from top-face angle

A camera's downward aim does not change the elevation from lens to die; it changes which scene rays fit on its sensor. Wider lenses increase coverage but do not restore foreshortened/recessed pip information. Digital zoom or perspective rectification cannot reconstruct absent samples.

For a camera directly on the rim, the floor's near-to-far centreline spans 90-atan(h/290) degrees vertically. At 40 mm this is 82.1 degrees; at 150 mm it is 62.7 degrees. A landscape C121's advertised 55 degree vertical aperture therefore cannot include that complete floor centreline from either rim location in one image, irrespective of aim. A setback can reduce the range; other cameras can cover the near blind area. This necessary centreline condition is not a sufficient full-polygon coverage test. Horizontal corners, walls, apertures, die height and margin also matter. A diagonal FOV number alone is insufficient. Rotating a sensor changes the horizontal/vertical tradeoff rather than removing it.

The executed exploratory model projects 14,836 inset die-centre points of a nominal regular octagon, 290 mm across flats, through ideal 103/55 degree apertures aimed at the centre top plane. Camera lenses are at evenly spaced facet midpoints on the apothem circle. Points are inset 12 mm from edges to allow a 16 mm die at any yaw. It checks point rays only, not whole faces/pips, occlusions, focus, distortion or measured intrinsics. Published C121 angular apertures are not a calibrated rectilinear sensor model. Do not treat these percentages as readable-dice rates:

| Lens height / cameras | Points in at least one FOV | Points with a visible view >=30 degrees |
|---|---:|---:|
| 40 mm / 4 | 100% sampled | 2.6% |
| 40 mm / 8 | 100% sampled | 4.8% |
| 120 mm / 2 opposite | 100% sampled | 76.3% |
| 120 mm / 4 | 100% sampled | 95.6% |
| 150 mm / 2 opposite | 100% sampled | 81.0% |
| 150 mm / 4 | 100% sampled | 100% sampled |

The dominant benefit of four raised views is useful angle and complementary near-edge coverage, not simply seeing more floor. More low cameras cannot improve the common centre elevation.

### Side-face inference

Opposite faces adding to seven is insufficient by itself. Seeing adjacent side values 1 and 2 leaves the remaining opposite pair 3/4 as top/bottom. Even an unordered set of all four lateral values leaves that ambiguity. With known face layout/handedness, correctly identified ordered adjacent side normals and a known upright pose, two adjacent side values suffice to determine the top. The script enumerates all 24 proper rotations for one explicit supported mapping; the ordered pair maps uniquely to top=3, whereas the mirrored mapping gives 4. This example is a mathematical model, not a claim about the user's physical dice.

One visible side is generally ambiguous; pip symmetries prevent universally solving it by reading pip orientation alone. A known subset may offer extra orientation cues, but requires separate validation. Do not assume arbitrary dice use one mapping. A supported set could be profiled once by observing known top/side relationships; mixed sets require reliable identity/layout association. Tilted/cocked or stacked dice require rejection or an explicitly supported 3D pose/rules policy.

Side faces can be completely hidden by other dice. A five-die cross can put four neighbours around the centre die and block its lateral faces. Multiple viewpoints help but do not guarantee unobstructed sides. For ideal equal-height level dice, rays to a top plane from above pass over other equal-height tops; do not falsely claim all top faces disappear merely because dice touch. At low elevation those tops still have little useful pip depth, and recessed pips/bevels are less visible; taller, stacked or tilted dice and hands can additionally obscure tops.

## Design recommendations and impact

1. Best simplicity/control comparison: rigid tray-attached rear arm or bridge with one camera looking down. Movement of the complete assembly preserves camera-to-tray geometry. For nominal 290 mm square bounds and 55 degrees vertical FOV, minimum height above floor is ~279 mm to fit the floor, ~295 mm to fit the 16 mm die-top plane. Using the listing's larger 310 mm bound gives ~314 mm for tops before margin. Trial around 350 mm above floor, check all actual vertices/rim/apertures and close focus. It remains an overhead design but eliminates the independent stand/calibration relationship and minimises processing/streams.
2. Strong rim concept: containment rim around 40-50 mm; two adjustable opposite pods at lens height 120-150 mm for initial evidence, provisions for four around the tray. Four at ~150 mm is the preferred geometric candidate if avoiding an overhead arm is important. Keep raised mounts separate from wall height: an entire 150 mm wall worsens access/ergonomics and is unnecessary. Small camera modules would need independent optics/stream qualification; C121 can supply bench viewpoints but its body cannot be treated as a miniature embedded sensor.
3. Existing 40 mm embedded ring: technically viable as a research path using known-layout side inference; not the leading route to simpler/faster confident five-dice reading. Four provides useful azimuth diversity; eight is not justified before four-view evidence and cannot fix central grazing angles. No finite count of low views guarantees readable ordinary dice in all allowed clusters.

Shape/size: increasing diameter at fixed height makes the centre top view worse (h=40: 240 mm span gives 11.3 degrees, 290 gives 9.4, 400 gives 6.8). Larger area may reduce crowding statistically, which must be measured. A compact circular or octagonal tray is suitable for symmetric views. A long rectangle has larger long-axis distances and uneven detail. Octagonal flat facets simplify mounts; a circular tray removes internal corners but adds mount design. Keep a matte, contrasting, replaceable floor and diffuse light clear of camera apertures. Avoid introducing optical cliffs/ramps or rolling partitions without gameplay evidence. Lens recesses require ray clearance and impact protection; windows need glare/scratch tests. Geometry alone does not establish an optimal wall profile.

Calibration: rigid floor/base and locked camera brackets preserve the relative transform when the tray is translated/rotated on the table. The flexible leather tray may change shape; a rigid base/carrier is important. Factory/initial intrinsic/extrinsic calibration, frame/crop identity and movement/flex checks remain necessary. Printed coded fiducials rigidly referenced to the floor provide a promising self-check/reacquisition method. Raised marker coordinates must include the rim-to-floor offset. Moving the complete tray should preserve optical geometry, but current app/session guards might still invalidate observations; changing that behavior requires SW work and verification.

Software: inspected current `src/dice/camera/recognizer.js` (opencv-pips-0.5). It reads one face candidate, uses shape/threshold checks and excludes side contamination; it has no known-layout cube-pose or multi-camera association/fusion. Multi-camera support is new SW/INT scope, not a camera placement setting. Calibrate all views into tray coordinates, match physical dice once across views, use a common settled scene with bounded frame freshness, reject disagreement/missing dice, and preserve held-slot identity/correction provenance. Repeated values alone cannot associate dice. Review/confirmation and authoritative seat/turn/revision/idempotency checks remain required. Do not derive player authority from which camera sees a hand. More streams may increase latency, decoder load and power; speed benefit is unproven. High-resolution crops may help preserve pip samples; never infer pixel detail from megapixels or synthetic 64x64 warps.

Alternatives: tray-fixed overhead camera/arm; automatic marker reacquisition for an external camera; two elevated side views; existing supported smart-dice path when ordinary dice are not essential. Smart dice remove optical line-of-sight dependence but have their own set/pairing/power validation and user costs. Mirrors can fold optical paths but add glare, focus and impact constraints; not a simpler first trial. Transparent/below-tray viewing would change surface/dice behaviour and is not the recommended initial path.

## Risks and proposed trial

| Risk | Consequence / proposed closure |
|---|---|
| Unknown internal geometry/dice dimensions | Measure floor polygon, wall top, thickness/slopes and die size before CAD. |
| Close focus, glare and recessed pips | Check actual decoded images at near/centre/far positions; diffuse lights, measured lux, exposure and effective pip pixels. No transfer of C121 evidence to another lens. |
| Side association/layout ambiguity | Supported die layout profile; known labelled top truth, near-touching/overlapping views, repeated values and mixed sets. |
| Flex/relative movement | Rigid carrier; visible marker integrity checks; move assembly and compare measured reprojection/recognition. |
| More cameras slow capture | Measure settle-to-review including receive/decode buffering, association, inference and confirmation. |

Proposed comparative trial, not yet authorised physical acceptance or agreed numeric gates:

- Identify actual tray, dice and camera specimen/hardware/firmware, app/source/stream/configuration, fixture dimensions, lighting and instruments. No device was inspected for this advisory.
- Use the existing standalone identification workflow for one-view baseline; multi-view frames need an offline/new standalone evaluator before any integrated game change.
- First sweep one camera at 40, 75, 100, 120, 150, 180 mm, then two/four viewpoints at promising heights. Compare a tray-fixed overhead camera at ~350 mm. Lock recorded focus/aim/light configuration where possible.
- Cover each pip value at near/centre/far/rim/corner positions and yaw; isolated, touching pairs, row, four-around-centre, rim cluster, kept dice, hand removal, stacked/cocked dice, bright/dim/glare cases. Reject unsupported scenes rather than fill missing values.
- Move/rotate the whole rigid assembly at least 20 times and separately perturb a camera bracket to test geometry integrity/rejection. This is a proposed count, not an accepted gate.
- Collect a fresh labelled 100-roll comparison set per finalist after tuning. Report first-proposal exact-roll accuracy, missed dice, incorrect values, rejected scenes, correction burden, and median/p95/max settled-to-review time. Proposed ergonomic goals: >=99/100 exact complete initial proposals, zero wrong values silently accepted, and p95 settled-to-proposal <=1 second. These are proposals and 100 rolls cannot demonstrate a rare-error commercial claim. Report proposal readiness separately from human confirmation time.
- Keep final device state and actual evidence private under ignored artifacts; do not retain secrets/images in source. Stop on loose fixtures, lens impact or overheating; electrical/fabrication details need their own specimen-specific review.

## Completion and decision

Research, ideal geometry calculations, 24-orientation enumeration and scaled diagram completed. Bundled Python executed successfully using Pillow; matplotlib unavailable, so a scaled engineering diagram was drawn with Pillow. All four 150 mm camera FOV/elevation point samples meet the proposed 30 degree geometric condition; this is neither a full-face visibility nor confidence guarantee. Script assertions check reference-angle limits and cube rotations; application tests/builds were not run because no runtime source changed. No physical, independent-review, fabrication, procurement, deployment or commercial gate passed.

Recommendation: explore tray-attached optics, prioritising a single rigid overhead comparison and a four-pod ~150 mm lens-height concept. Start adjustable viewpoint evidence before committing to embedded low-wall cameras or a production shape. This advisory does not supersede the existing C121-first/independent-module optics decision or mark a new platform accepted.
