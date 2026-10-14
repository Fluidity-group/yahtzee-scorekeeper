# HW-008: Alternative sensing for a self-contained dice tray

Date: 7 October 2026. Owner: product owner. Engineering coordinator/author: Codex. Independent reviewer: unassigned.
State: researched and calculated advisory; no prototype, procurement, deployment or physical acceptance.
Project/gate: HW concept assessment with future SW/INT impacts. Current implemented C121 path unchanged.
Baseline: follows HW-006/HW-007; existing working changes preserved. User challenges six independently readable face tags and requests lidar/radar and other sensing in the tray floor, walls and/or dice.

## Purpose and requirements

Target experience: five freely rolled dice in a movable, self-contained tray; fast, reliable values without repeated user calibration or charging individual dice. Custom dice, floor and wall components are allowed for investigation. Nominal geometry remains 290 mm tray span and 16 mm dice pending measurements. No new design or numeric acceptance threshold has been approved.

| Requirement | Review method | Actual result / state |
|---|---|---|
| HW008-R1 | Check six-label RFID concern | Valid engineering objection: multiple face tags can respond; not inevitable that all six always respond. Deprioritise this method as primary proposal. |
| HW008-R2 | Evaluate radar and lidar at pip scale | Manufacturer specs and ideal range/spatial sampling calculations reviewed; ordinary low-cost modules are poor primary face readers. |
| HW008-R3 | Find materially different batteryless mechanisms | Powered-by-tray accelerometer, gravity-gated passive tags, and resonant inductive object sensing have primary-source precedents. Miniaturisation/five-die full-tray execution unverified. |
| HW008-R4 | Rank and scope next discrimination test | Recommendation below; no physical test conducted. |

## Radar and lidar

### Radar

TI describes 4 GHz sweep bandwidth giving roughly 3.75 cm range resolution. Ideal conventional FMCW range separation is delta-r=c/(2B). Calculation with c=299792458 m/s: B=4 GHz -> 37.474 mm; delta-r=2 mm -> B=74.948 GHz. A representative 2 mm pip feature is assumed, not measured. These figures concern separation along range, not angular resolution, minimum range, single-target precision or a universal impossibility bound. Phase-based sensing can detect tiny motion without resolving independent nearby scatterers; synthetic apertures, near-field inversion and learned signatures can exceed simple-image interpretations under constraints.

Nevertheless, ordinary plastic dice with arbitrary printed/filled pips offer no guaranteed strong radar contrast between face values. Five close dice, orientation variation, enclosure multipath and near-field behaviour add ambiguity. Higher carrier frequency alone does not fix bandwidth, aperture and contrast. Radar-readable conductive/resonant face codes could create distinct signatures, but this becomes custom tag/antenna design with orientation and multi-object separation problems; it does not provide a simple radar replacement for pip vision. Recommendation: do not select ordinary mmWave radar as primary face reader. It might assist motion/hand sensing after a concrete need, not as an extra component by default.

Source: [TI 60 GHz sensing white paper](https://www.ti.com/lit/wp/spry328/spry328.pdf). This is a representative device-class calculation, not a claim that every radar has a 4 GHz limit.

### Lidar / time of flight / structured light

[ST VL53L8CX datasheet](https://www.st.com/resource/en/datasheet/vl53l8cx.pdf) describes an 8x8 zone depth sensor with 65-degree diagonal field of view. If eight zones span 290 mm, average sampling footprint is approximately 36.25 mm across, larger than a 16 mm die. At close distances zones cover less area, but then more sensors or scanning are needed for the whole tray. The exact spatial response is not a uniform square pixel grid; numbers are a scale comparison.

For an illustrative 2 mm pip, a proposed ~1 mm sampling pitch would require around 290 samples across the tray before margins; at 150 mm range that pitch subtends ~0.382 degrees. Depth precision must separately resolve actual pip recess depth, and spatial resolution includes optics/spot size, not just sample count. Flush-filled or printed pips can have essentially no useful depth difference. Reflectance/intensity might recover markings, but this is optical contrast imaging and must be qualified at the sensing wavelength. Black visible ink is not guaranteed black in IR.

Industrial laser profiling can resolve small surface features; [Keyence LJ-X8000](https://www.keyence.com/products/measure/laser-2d/lj-x8000/) provides up to 3200 points per line profile. Such a line is not a complete stationary 2D tray image. Scanning/multiple lines or a 3D snapshot arrangement, suitable working distance and visible actual recesses would be needed. Lidar/structured light still needs an unobstructed optical path. Low wall placement retains HW-006's grazing-view problem; under-floor optics retain floor transmission/glare constraints. Recommendation: industrial 3D sensing is possible for appropriate dice surfaces but disproportionate to this product; small ToF arrays may help detect settling/stacking/hand intrusion, not read ordinary pips reliably by themselves.

## New candidate architectures

### A. Tray-powered orientation sensor inside each die — preferred custom-die investigation

Architecture: powered tray excites a field -> die harvests a small amount of energy -> three-axis accelerometer measures gravity after settling -> die transmits ID, face and validity/freshness information -> app review. A small capacitor may buffer harvested energy; this is battery-free but contains powered electronics. It needs no user charging if the tray reliably supplies enough power. Antenna arrangement must provide power in every resting orientation.

The reader no longer infers orientation from which of six independently exposed labels responds. The die computes orientation directly; yaw does not change which die axis aligns with gravity. Stable near-unit gravity, settling and axis dominance must be checked; moving/cocked states rejected or explicitly handled. Full continuous motion tracking is unnecessary to read a settled result, potentially reducing power demand.

Evidence: [University of Washington WISP](https://sensor.cs.washington.edu/research/wisp_1) documents sensors powered/read by UHF RFID without batteries, including accelerometer input. [Kliskatek EVAL-SID-ACC](https://www.kliskatek.com/technologies/uhf-rfid-sensors/eval-sid-acc/) advertises a battery-free three-axis accelerometer evaluation tag. These establish the mechanism; neither establishes a balanced 16 mm five-die tray implementation, sample freshness, product readiness or independently verified performance in our setting. RF transport is one option; a purpose-designed near-field inductive implementation is another and needs its own power/data design.

Open gates: all-orientation antenna/coil coupling; energy budget and cold-start/re-read latency; packaging and balance at 16-20 mm; impact tolerance; five devices sharing power and data; nearby metal, hands and environmental changes; unique ID and explicit missing-die reporting. A reliable larger module alone is insufficient. Keep the floor mechanically rigid and design the full field environment rather than assuming it is unaffected when moved.

### B. Gravity-gated passive RF response — direct precedent addressing the objection

[Büthe et al., RFID-Die, UbiComp 2014 paper](https://www.researchgate.net/publication/270286241_RFID-Die_Battery-free_Orientation_Sensing_Using_an_Array_of_Passive_Tilt_Switches) describes a 30 mm die with eight tilt switches selecting only one of six tag/antenna circuits. Authors report 1000 tosses with correct readings in their evaluation. This moves face selection into the die, avoiding dependence on strongest/closest label selection. The prototype used mercury switches; that construction is not a proposed product build. A non-mercury replacement would need new switching, bounce, durability and balance evidence. It also does not establish five-die full-tray reading or miniaturisation to 16 mm. Mechanical parts complicate durability and inertia. Rank below a solid-state orientation sensor unless a suitable small switch system demonstrates a clear advantage.

### C. Resonant inductive sensing floor — preferred distinct floor-based research candidate

The floor excites and measures passive resonant coils in each die. Coil signatures, orientations and spatial coupling can encode pose/face. [Wacom](https://support.wacom.com/hc/en-us/articles/1500006341622-What-sensor-technologies-are-available-in-signature-pads-in-general) documents battery-free electromagnetic resonance pens powered by a sensor layer. [ToolStone, Rekimoto and Sciammarella, 2000 paper](https://www.researchgate.net/publication/2436722_ToolStone_Effective_Use_of_the_Physical_Manipulation_Vocabularies_of_Input_Devices) describes a battery-free object that detects contacting face/pose using three tablet coils, in a 25 x 40 x 50 mm prototype. [Fraunhofer IndLoc](https://www.iis.fraunhofer.de/en/ff/lv/lok/nahfeldortung/3d-ortung.html) demonstrates passive-coil positioning technology.

This is a precedent for a floor that measures tagged objects, not evidence that a retail tablet can read five dice simultaneously. Miniaturisation, sign/face disambiguation, distinct identities, arbitrary yaw, several neighbouring resonators, metal detuning and full-floor scan latency are open. Opposite faces can share coil-axis signatures; multiple/asymmetric coils or additional encoding must resolve that, rather than assuming a three-axis magnitude uniquely labels six faces. There are no permanent magnets required, avoiding magnet-to-magnet attraction as a primary mechanism. RF coupling/interference still requires design; this is not universally immune to the issues of other radio-based sensing.

### D. Optical codes rather than pips

Flush, durable per-face fiducials or IR-contrast patterns could identify both die and downward face through an optical floor. This is an extension of HW-007, not a new sensing principle. It supplies stronger designed visual features and identity than generic pips. Tiny identical codes may be unreadable; code size, focus, contrast at the selected wavelength, yaw, touch clusters and wear require tests. A camera array, folded optics or contact imaging could be enclosed underneath; package depth remains an open constraint. Side codes still need line of sight and cannot guarantee visibility of a surrounded die. Rank as the practical optical fallback if custom dice are acceptable.

## Other candidates screened

| Method | Assessment and unresolved barrier |
|---|---|
| Capacitive pattern floor | Custom floating-object sensing might read passive conductive patterns, but a consumer touchscreen cannot be assumed to detect unattended dice. [CapStones](https://hcie.csail.mit.edu/research/capstones/capstones.html) explicitly reports blocks invisible without user touch in its basic operation. Hands-off operation, five objects and electrode resolution are required tests. |
| Inductive metal patterns | [Indutivo author project](https://www.jungong.me/blog/indutivo) establishes object detection/classification by induction. Per-face code sensing over a full tray remains an extension needing spatial localisation and close-cluster tests. |
| Solar-powered orientation dice | [TI Solar Dice reference discussion](https://www.ti.com/document-viewer/lit/html/SSZTBI9/GUID-4981FAF8-CBA3-4C9C-B56E-D1D7077AFABB) describes battery-free solar panels powering a radio/accelerometer. Evidence of the principle; indoor lighting, shading and small normal-die surface area make power less controllable than a powered tray. |
| Roll-energy harvesting | Could power a sensor, but a gentle roll or re-reading an unmoved held die may supply no new energy. Requires storage and measured worst-case energy budget; not selected. |
| Ultrasound/acoustic signatures | Airborne sensing offers no universal value contrast on ordinary flush-faced dice. Cavity/reflector codes would make custom dice with their own resolution, multi-object echo and pose problems. Contact ultrasound needs a qualified acoustic coupling stack. No applicable normal-size full-tray evidence found in this research. |
| Pressure/tactile imaging | Custom face features might leave distinct pressure patterns, but light dice, rotation, felt spreading load, low static force and roll fairness are difficult. A generic pressure mat does not necessarily reveal ordinary pips. |
| Chipless radar tags | Designed resonances can add identity/face contrast; several faces and dice can respond, requiring code separation and reliable orientation inference. Not a simple escape from passive tag ambiguity. |

## Proposed discriminating tests and risk control

Highest-value next engineering work is a power/packaging feasibility study for architecture A and a one-object coil/pose study for C, retaining D as an optical comparison. Do not buy a lidar/radar module merely because it reports fine distance precision.

Before physical execution: identify exact components, die CAD/mass layout, floor stack, antenna design, instruments, firmware/data protocol and supplied-power limits; define fixture/temperature checks and stop/final-state conditions. No device state inspected and no experiment executed in this advisory.

For A: start with a sensor board and field source, then place it in six fixture orientations across centre/edge/corners, multiple yaw angles and worst-case intended gaps. Measure harvested voltage/energy, cold-start, sample age and response completeness. Repeat for five responding objects before a final die enclosure. Test read-after-idle and missed die rather than accepting stale values. Failure to fit/energise an impact-resistant balanced 16-20 mm package is a real stop/re-scope criterion.

For C: demonstrate unique correct face/pose for one object over the floor, including opposite-face ambiguity; then two touching objects, then five with repeated face values. Characterise mutual coupling and query time. Do not infer multi-object operation from a single-pen tablet demo.

Shared tests: random labelled rolls after tuning; all six values and yaw; touching clusters, corners, hands, held/replaced dice, cocked/stacked states; complete-tray movement over intended furniture materials; fresh complete result latency and correction burden. Success criteria require owner agreement and adequate independent test data. Balance and durability need specimen-level tests, not claims from drawings or centre-of-mass symmetry alone. No existing acceptance gate closed.

## Completion and integration decision

Manufacturer/author primary sources reviewed. Ideal arithmetic executed using Node: 37.474 mm range separation at 4 GHz, 74.948 GHz for 2 mm conventional range separation, 36.25 mm mean footprint across eight zones spanning 290 mm, and 0.382-degree sampling pitch for 1 mm at 150 mm range. These are calculations, not device performance. No runtime code changed; no application build/tests required for this advisory.

The advisory recommendation supersedes HW-007's preference for six independent face tags: investigate tray-powered internal gravity sensing first for custom battery-free dice, resonant inductive pose sensing second, and enclosed optical code reading as fallback. User has requested research, not selected a replacement implementation platform. Existing C121 development direction remains historically accepted until explicitly changed.

Any selected sensor must return identified, fresh, complete observations with uncertainty; retain review/confirmation, held-die provenance and authoritative seat/turn/revision/idempotency checks. Sensing a die or hand grants no player authority.
