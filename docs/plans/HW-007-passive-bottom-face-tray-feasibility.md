# HW-007: Passive bottom-face sensing through the tray floor

Follow-up 7 October: user challenged six-face tag selectivity and requested broader research. [HW-008](HW-008-alternative-dice-sensing.md) supersedes this advisory's recommendation priority with tray-powered internal orientation sensing and resonant inductive pose sensing. This record preserves the original research; no physical implementation has been selected.

Date: 7 October 2026. Product owner: user. Engineering coordinator/author: Codex. Independent reviewer: unassigned.
State: researched concept advisory; no hardware/software implementation, physical measurements, deployment or acceptance.
Project/gate: HW sensing concept; SW/INT contracts affected if selected. G1 proposal; physical and commercial gates open.
Baseline: follows [HW-006 tray optics advisory](HW-006-tray-mounted-camera-feasibility.md), preserving the extensive existing modified/untracked baseline. No platform decision superseded.

## Purpose and requirements

Investigate user proposal: passive, battery-free dice whose downward face is read through the tray floor; infer the upward value without elevated cameras. Distinguish existence/prototype evidence from five-die, full-tray feasibility. No procurement, supplier outreach, fabrication or device changes requested.

For a verified standard opposite-sum-seven d6, top = 7 - bottom. This removes the side-view handedness ambiguity. Nonstandard/custom dice need an explicit opposite-face lookup. A stacked die has no face on the floor; a cocked die may have no uniquely supported downward face. Neither should be silently assigned a roll.

| Requirement | Criterion/method | Result/state |
|---|---|---|
| HW007-R1 | Find primary precedent for batteryless downward-face reading | RFID research paper and patent disclosures reviewed; principle exists. No ready-to-buy five-die tray established. |
| HW007-R2 | Explain identification versus orientation | One ordinary passive ID tag identifies the die, not six-way orientation. Face-selective encoding/coupling or another orientation method required. |
| HW007-R3 | Compare floor-compatible sensing methods | RFID, optical underside, magnetic, conductive/capacitive concepts assessed below. |
| HW007-R4 | Identify full-size/five-die gates | Field uniformity, tag selectivity, identity/completeness, arbitrary position/yaw, close clusters, fairness/durability and latency remain open. |
| HW007-R5 | Define minimal decision experiment | One tagged die/small pad, then five dice, then full tray; no experiment executed or acceptance criteria agreed. |

## Primary sources

Accessed 7 October 2026:

- [Hinske, Langheinrich, Alter: Building RFID-Based Augmented Dice with Perfect Recognition Rates, 2008](https://www.inf.usi.ch/faculty/langheinrich/articles/papers/hinske2008fng.pdf). Authors describe six passive face tags and a 13.56 MHz reader. Their 16 mm prototype reported 100% recognition in its test setup, using a tuned 90 x 90 mm rolling region and field shaping; environmental sensitivity, scaling and long-term durability remained limitations. This is experimental precedent, not a five-die 290 mm product validation.
- [NXP NTAG213/215/216](https://www.nxp.com/products/NTAG213_215_216): contactless energy/data, antenna requirement, unique IDs and anti-collision. These support passive tag identification; they do not establish face selectivity or tray coverage. This page is an illustrative capability reference, not a selected die tag or protocol. The research paper uses another tag family; reader compatibility must be explicit.
- [US10417466B2](https://patents.google.com/patent/US10417466B2/en): per-face/per-die RFID responses with inference from multiple responses. Disclosure evidence, not performance/product evidence.
- [TI TMAG5273](https://www.ti.com/product/TMAG5273) and [Hall sensing explanation](https://www.ti.com/document-viewer/lit/html/SSZT164/GUID-414BA7C4-5066-4F56-A363-8229BC4EC97A): powered floor sensors can measure passive permanent-magnet fields.
- [CA2182056C](https://patents.google.com/patent/CA2182056C/en): magnetic codes and Hall sensors with controlled positioning. Does not validate arbitrary placement of five dice.
- [US11565171B2](https://patents.google.com/patent/US11565171B2/en): underside pip reading with optical detector arrays/scanning surface.
- [US20150231486A1](https://patents.google.com/patent/US20150231486A1/en): coded conductive die faces and sensing tray concept. Patent disclosures establish contemplated mechanisms, not bench results or manufacturing readiness. No legal-status or freedom-to-operate assessment performed.

## Design and engineering assessment

### A. Passive RFID: leading non-optical experiment

Concept: six miniature face tags per die, mapped to (die ID, bottom face), under a balanced protective shell. The powered tray energises/interrogates tags through a nonconductive floor. Multiple antenna zones and/or controlled field shaping may be needed. A passive tag needs no battery; the tray and reader still need power.

The important distinction is that reading tag IDs does not automatically say which face touches the floor. Both bottom and top face antennas can couple to a floor field; side antennas may couple particularly near antenna edges. Six tags also interact with each other. Strongest response is not a generally reliable distance ranking because orientation, tuning, field location and environment affect coupling. Anti-collision lets compatible tags respond individually; it does not resolve geometric ambiguity.

For five six-tag dice, as many as 30 face tags could potentially respond. Software must group them by physical die, select a supported downward face with evidence or reject ambiguity, deduplicate reads across zones, and report missing dice rather than assume five values. Unique die IDs would be useful for held-die tracking. A reader must support the chosen tag protocol and multi-tag inventory; a phone NFC app is not assumed sufficient.

The 290 mm tray cannot be qualified by scaling up a small pad. A regular octagon 290 mm across flats has approximately 69,700 square mm floor area, about 8.6 times a 90 x 90 mm region; actual internal geometry is unmeasured. Larger coils create different fields, not simply more identical coverage. Tiled coils introduce seams, mutual coupling, switching/matching and scanning latency. No defensible coil count follows from dimensions alone. Reader/coil spacing and shielding must be measured with the actual floor, table and dice; the word felt alone does not establish the stack's RF compatibility.

A rigid, shielded, qualified tray could avoid manual optical registration when moved, but metal furniture/nearby objects can still change RF behaviour. Materials and isolation belong to the assembly design, not user calibration assumptions.

### B. Optical underside reading: leading ordinary-dice comparison

Concept: opaque dice on a transparent optical floor; camera(s) or a contact-imaging detector array below read existing pips and apply the opposite lookup. Dice need no electronics or modification. Side occlusion is largely eliminated for separate dice each resting on the floor. Touching dice can still merge image regions and require segmentation; cocked/stacked dice remain unsupported unless specifically solved.

The floor must preserve pip contrast and spatial detail. Ordinary felt, scratched/cloudy surfaces or generic translucent silicone are not assumed suitable. Transparent wear/quieting layers require image and bounce tests. Opaque dice avoid some through-die ghost images; translucent dice need explicit qualification. An IR-transparent-looking floor is possible as a materials research path, but IR cannot be assumed to see through ordinary felt or preserve contrast of arbitrary pip inks.

Under-floor cameras require working distance, lighting and glare control. With the previously published C121 55-degree vertical aperture, nominal 290 mm coverage of the floor requires ~279 mm optical distance in an ideal model. Thus simply turning the existing camera upside down does not give a thin tray. Wider optics, multiple views, folded paths or distributed contact imaging might reduce package depth but require independent focus/resolution qualification. Consumer flatbed scanners have moving mechanisms and are not assumed to deliver low-latency roll readings. A fixed contact array is a different hardware project.

### C. Magnetic codes / sensor array: credible but harder full-tray engineering

Passive magnets in known coded configurations can be detected by powered Hall/magnetic sensors beneath plastic or other non-ferromagnetic floor layers. A simple centred magnet along one die axis cannot uniquely distinguish all six faces; four orientations share an insufficient signature. Asymmetric magnetic orientation or coded patterns and spatial measurements could supply the missing information, subject to validation.

Arbitrary x/y position and yaw require enough spatial/vector information, not one switch for the whole tray. Five nearby dice create superposed fields; identification and orientation fitting become harder. Magnetic attraction between dice or towards metal can alter rolling or sticking. Symmetric mass distribution alone does not remove magnetic forces. Weak fields, supported floor/table materials and fair-roll/interaction tests would be needed. Equal-mass construction, orientation-code distinctness and impact durability are open. Do not claim a sensor count or reliable normal-die-size code without measured/simulated margins.

### D. Conductive/contact/capacitive codes: secondary candidate

Passive printed or embedded conductive patterns on each face could be sensed through direct contacts or a capacitive/inductive floor. Coding must survive arbitrary translation/rotation and multiple touching dice. Direct contact conflicts with felt and introduces wear, dirt and bounce/contact-resistance issues. Capacitive/inductive approaches avoid exposed contacts but require custom electrodes, excitation, spatial discrimination and environmental calibration. These are feasible sensing classes, not established inexpensive retrofit solutions for this tray.

## Proposed experiment sequence and risks

Preferred non-optical first question: can one normal-size six-tag die give an unambiguous bottom-face result everywhere on a small pad? Use an adjustable, documented antenna/floor spacing and reader configuration; record all tag responses, not just the selected answer.

1. Prepare one 16-20 mm prototype die and approximately 100 x 100 mm sensing coupon. Exact tag/reader/antenna/BOM and shell process remain unselected; no purchasing authorised. Identify specimen and die opposite mapping before the trial.
2. Exhaustively place all six downward faces at a grid including borders/seams, with multiple yaw angles and slight height changes. Compare observed face against visual ground truth. Record missing, multiple and wrong face responses and query-to-result time. Do not tune and accept on the same data.
3. Repeat with five uniquely identified dice: same values, close pairs, central cluster, nearby held dice and removal/replacement. Check grouping, missing-die detection and rolling/settling transitions. A successful single die does not pass this step.
4. Only then evaluate the actual internal tray polygon and full floor stack, including different table materials, whole-tray movement and RF zoning. Measure latency including sequential zone scans and complete-roll readiness.
5. Compare against underside optical reading on a small transparent coupon to test actual pip visibility, recesses, glare and floor-layer effects before a full enclosure.

Risks/closure: false bottom selection -> labelled face/position tests; incomplete coverage -> all zone edges and floor placements; magnetic or mass bias -> engineering balance and appropriately powered fairness studies; impact damage -> repeated rolling with readback; slow capture -> median/p95/max full five-die settle-to-proposal timing; unknown stack -> measured geometry/material identities. No numerical release threshold is accepted by this advisory. Keep fresh data separate from tuning, and report uncertainty/rejection rather than automatic completion. Physical test plans must add exact instruments, power/thermal limits, fixture checks, stop conditions and final device state before execution.

## Integration and completion

A selected floor sensor would emit die ID (when available), proposed value, timestamp/freshness, reader/configuration identity and completeness/ambiguity evidence. Map through the existing observation/review path; preserve player confirmation, held identity, original/corrected provenance and authoritative command checks. Battery-free does not mean zero-power: tray electronics need power and a qualified phone connection.

Research completed; no calculations or measurements used to claim performance. Strong evidence supports passive RFID principle, while full-size five-die performance remains open. Recommendation: prioritise a small-pad passive RFID feasibility experiment if custom dice are acceptable; use underside optical reading as the ordinary-dice comparison. No commercial availability, new platform acceptance, prototype success, fabrication or deployment claimed. Existing C121-first decision remains the accepted implementation baseline pending a new owner decision.
