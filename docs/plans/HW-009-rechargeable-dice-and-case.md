# HW-009: Rechargeable electronic dice, automatic reconnection and energy harvesting

Date: 7 October 2026. Owner: product owner. Engineering coordinator/author: Codex. Independent electrical/mechanical reviewer: unassigned.
State: researched concept and executed arithmetic; no schematic, routed PCB, fabricated specimen, deployment or physical acceptance.
Project/gate: HW feasibility with SW firmware/connectivity and INT implications. G1 remains open.
Baseline: e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc plus preserved existing working changes. Continues HW-006 through HW-008. Existing C121 implementation is unchanged.

## Purpose and requirements

User reports GoDice BLE/MEMS recognition worked flawlessly, but individual charging and repeated device selection are cumbersome. Investigate five custom d6 with small electronics, wireless charging, case/hub connectivity and printed prototypes. User explicitly requests assessment of ALL charging approaches and e-peas energy harvesting; no charging preference is selected. User experience is reported evidence, not our independently measured hardware acceptance.

| Requirement | Observable criterion / proposed verification | Actual evidence | State |
|---|---|---|---|
| HW009-R1 | Five dice charge in one unattended operation | Commercial precedent and five-well concept below | Design only |
| HW009-R2 | No repeated per-die selection after initial enrollment; recover phone restart, Bluetooth toggle and die sleep | Generic local connection test inspected; persistence/retry work identified | Not implemented |
| HW009-R3 | Small accelerometer/radio/charging components can be assembled in a d6 | Candidate packages verified; 20 mm starting envelope proposed | Fit/routing unverified |
| HW009-R4 | Compare aligned case, arbitrary orientation, floor/walls and harvesting | Comparison and energy scenarios below | Advisory complete |
| HW009-R5 | Report five fresh, correctly associated settled results; reject cocked/ambiguous dice | Future six-face calibration and protocol design | Physical/SW open |
| HW009-R6 | Printed prototypes survive intended rolling without battery damage or unacceptable bias | Two-part shell/caddy proposed; impact and statistical plan needed | Physical open |

No new numeric product-acceptance threshold is approved. Recommendations below are engineering proposals, not platform selection or permission to procure.

## Design and impact

### Recommended comparison baseline

BLE SoC + low-power three-axis accelerometer + rechargeable cell + inductive receiver in each die. Five independently managed charging wells in a USB-C case. First electrical prototype can use direct BLE; a case hub can subsequently present one connection to the app while managing five dice. Compare an RF-powered tray experimentally against this baseline before accepting its greater uncertainty. Retain all charging candidates until power/fit evidence resolves them.

The accelerometer measures gravity after settling; a gyro is unnecessary for the six resting faces. Store sensor-to-face calibration, wake on motion, increase sampling during a roll, then send a small result rather than stream continuously. Reject unstable/diagonal orientations. A sensor shock rating does not qualify the cell, PCB or finished die for impacts.

Pixels is an existing precedent for wireless-charging electronic dice and a multi-die charging case [S2]. Nordic describes GoDice as supercapacitor-powered, with about ten seconds charging for about two hours use [S1]. A rechargeable cell trades an unattended longer charge for potentially longer play between charges. Five simultaneous contact wells would also solve serial charging with less electrical complexity; retain that as a cost/control comparator even though contactless charging is preferred for this study.

The supplied Alibaba URL could not be retrieved/verified. Treat its case appearance as the user's reference only; no claim is made that its actual product has inductive charging, BLE or our desired reliability.

### Candidate electronics, not a released BOM

| Function | Candidate / size | Engineering qualification still needed |
|---|---|---|
| MCU/BLE, optional proprietary 2.4 GHz | Nordic nRF54L15, 6 x 6 mm QFN; 2.4 x 2.2 mm WLCSP alternative [S3] | Start QFN; firmware memory budget may allow L05. WLCSP has 0.30 mm pitch, requiring an explicitly capable assembler. |
| Gravity/motion | ST LIS2DW12, 2 x 2 x 0.7 mm [S4] | Active low-power modes can be below 1 uA; wake configuration, sample rate and assembled accuracy require measurement. |
| Wireless receiver/charger | ADI LTC4124, 2 x 2 x 0.74 mm; selectable 10/25/50/100 mA [S5] | Coil/tuning, charge voltage/current matched to exact cell, NTC and charge termination. |
| Receiver coil | Wurth 760308101208, 10 mm diameter x 1.6 mm [S6] | Ferrite, battery metal, gap and orientation alter coupling. Not automatically Qi-compatible. |
| Rechargeable cell | VARTA CP9440 A4X, 29 mAh, 9.4 mm diameter x 4.0 mm, nominal 3.7 V [S7] | Include tabs, clearances, impact protection and approved charging recipe. Candidate only; availability not quoted. |
| Power/RF/support | Low-quiescent-current regulator, cell protection, antenna/matching, crystal, decoupling, programming pads | A 4.2 V cell must not feed a 3.6 V-max MCU directly. Charger UV disconnect is not complete short/overcurrent protection. |

Package dimensions are not PCB dimensions. A 14–16 mm double-sided board inside a 20 mm prototype is a layout target, not demonstrated fit. A 1.2 mm shell leaves 17.6 mm internal width at 20 mm, 15.6 mm at 18 mm and 13.6 mm at 16 mm. Start at 20 mm, investigate 18 mm after routing/assembly; do not promise 16 mm yet. Coil, antenna keepout, battery and mass distribution are likely harder than the accelerometer.

### Charging choices

| Approach | Feasibility judgment | Main unresolved issue |
|---|---|---|
| Five fitted inductive wells; marked face down | Highest-confidence contactless starting point | Per-well coupling/thermal performance; all five must charge concurrently or have a documented multiplexed schedule |
| Five wells; any of six faces down | Plausible second revision | Three field axes in each well, selected sequentially, or multiple receiver coils; extra circuitry, space and losses |
| Toss a pile into a case | Substantially harder | Dice can stack; orientation, coil gap and shadowing become uncontrolled |
| Five charging pockets in tray perimeter | Practical extension of fitted case | Requires parking dice; can share the same receiver architecture |
| Charge anywhere on playing floor | Research candidate | Coil array, field nulls, all orientations, five simultaneous loads, foreign-object heating and RF coexistence |
| Inductive wall coils charging centre | Weak baseline choice | Centre may be ~145 mm away, versus millimetres for a small receiver in a well; not comparable coupling |
| Dedicated RF transmitter in walls/floor | Credible research candidate | Tiny receiver efficiency, arbitrary orientation, shielding by hands/other dice, minimum stored power over the tray |
| Ambient RF / light / rolling motion | Supplement or different low-duty-cycle design | Harvested energy varies strongly; cannot assume sufficient energy from a PMIC's startup specification |

For one coil, ideal induced voltage varies with the magnetic field normal to its plane; at 90 degrees a simple uniform-field model has a null. Three orthogonal fields/receivers help orientation coverage but do not guarantee sufficient power. Multiple receivers need proper rectification/isolation, not arbitrary parallel wiring. Floor charging and RF power both need position/orientation maps with five loaded dice, not just a single best-position demonstration.

A case can place more coils and ferrite outside the dice, preserving die volume. A portable case battery is optional and adds its own charger, protection and hub power budget. A five-channel transmitter, such as a design based on the LTC4124/LTC4125 reference family [S5], needs independent channel control and thermal testing; this is not a completed circuit.

### e-peas and harvested energy

e-peas provides power-management ICs; energy still requires a photovoltaic cell, coil or antenna/rectifier, piezoelectric element, or temperature gradient. The AEM30940 supports RF with external matching/rectification and has a typical 3 uW / 380 mV cold-start specification [S8]. Startup power is not the power needed for an operating connected die.

The AEM13920 is a useful hybrid-study candidate: two harvesting inputs, a separate 5 V charging input, regulated output and power monitoring in 5 x 5 mm [S9]. Its 0.6–2.5 V output requires a compatible system rail; no claim of drop-in compatibility with the above charging circuit. Evaluate it as an alternative architecture, not an extra charger casually connected across the same cell.

Dedicated RF is substantially more credible than ambient Wi-Fi harvesting. e-peas/Energous demonstrated powered-transmitter sensor architectures [S10]; this proves the category, not a 16–20 mm die. A small rechargeable buffer can continue sensing during field nulls. RF power transport and BLE data can be separate radios/frequencies. The receiver antenna, rather than the PMIC, may dictate size. Measure power at the storage element; do not extrapolate reference-kit metre-range claims or full-size antenna efficiency into a die. Transmitter implementation needs market-specific radio/exposure review before product qualification.

Calculated scenario, NOT measured consumption: 29 mAh nominal, 3.7 V; 70% usable capacity; battery-side 200 uA for 4 h/day and 5 uA for 20 h/day. This is 0.9 mAh or 3.33 mWh/day, giving about 22.6 days using the reserve assumption. Continuous-play scenarios at 50/200/500 uA give 406/101.5/40.6 h respectively. All figures depend on actual firmware, leakage, RF retries and temperature. Capacity/current at 10 mA gives 2.9 h ideal bulk charge; taper/limits make actual charging longer. No cell-specific charge time is qualified.

To offset that illustrative daily use requires 0.139 mW continuously, or 0.833 mW for 4 h/day, NET into the storage/power budget. Empty-to-full nominal energy is 107.3 mWh: 0.1 mW net takes 1,073 h (~45 days); 1 mW takes 107 h; 10 mW takes 10.7 h, ignoring simultaneous load and end-of-charge effects. Thus RF can be useful for maintenance even when it is slow for an empty battery. Demonstrate a measured energy surplus with margin, not merely a successful startup.

Indoor PV: Epishine reports up to 22 uW/cm2 at 500 lux [S11]. An ideal fully active 18 mm face is 3.24 cm2, or 71 uW before losses. At 8 lit hours and an ASSUMED 70% path efficiency that contributes about 0.40 mWh/day, ~12% of the scenario budget. Pips, packaging, angle and shadows reduce usable area; multiple faces cannot all be assumed equally illuminated. Cells on a case or tray have far more area, but power still must transfer into the dice. Light could sustain a much lower-duty-cycle die, but this calculation does not establish it for our playing/reconnection experience.

Motion: a 10 g die falling 0.2 m has 19.6 mJ gravitational energy. Hypothetical 10% collection is 1.96 mJ. This is a drop-energy scenario, not an upper bound on all throwing/rotational energy, nor a measured harvester. It may support a brief sparse sensor transmission with suitable storage; it does not establish continuous BLE readiness. Moving harvesters affect balance and durability. Thermal harvesting is unattractive without a persistent temperature gradient.

### Connectivity and software

Distinguish user discovery/selection, security pairing/bonding, and reconnecting a sleeping peripheral. BLE does not require the user to choose each die every session. In the local generic test, `src/dice/connections.js` calls `requestDevice` for each add, retains an in-memory Map, marks disconnects without retry, and clears it on close. This identifies improvement scope in that test, not the root cause of every GoDice/vendor path. No connectivity changes were made.

Two good options: (1) native app persists a five-die enrollment and reconnects automatically; (2) case owns the five-die set and the app connects once to the case. BLE can serve both legs of option 2. A hub needs at least six simultaneous links and mixed central/peripheral roles with the selected stack. Do not assume every Nordic stack supports this: the nRF54L bare-metal S145 published limit is five links [S13]. Select/configure a suitable nRF Connect SDK controller/host or other hub stack and test the full topology.

Persist authenticated stable identity/keys, not just a rotating BLE address. Use initial set enrollment, ownership transfer/reset, bounded reconnect/backoff, visible 5/5 readiness, battery state and missing-die indication. Test app kill/restart, phone BT off/on, die reset, sleeping dice, second nearby set and hub removal. Case hub must be powered and in range during play.

Proprietary 2.4 GHz can use compatible Nordic hardware, but savings depend on duty cycle and protocol. It adds ACK/retry, interference avoidance, authentication, replay protection, enrollment and update work. Compare energy per successfully delivered fresh roll against BLE before choosing it. Sub-GHz creates an additional antenna-size tradeoff; Wi-Fi is unnecessary for these tiny messages.

Future observations include set/die identity, sequence/session, face, settled/invalid state, battery and calibration/firmware identity. Preserve held-die identity, freshness, completeness and original/corrected provenance. Observations do not grant game-seat/turn authority; existing reviewed/confirmed command boundary remains.

### PCB manufacture and printed shells

Yes, an assembly house can build the PCB after schematic/layout/review. Use a panelized four-layer, double-sided QFN/LGA prototype with assembly rails/fiducials, BOM/CPL/Gerbers, firmware and a programming/test fixture. Tiny board size requires panel planning. JLCPCB publishes 0.35 mm minimum standard BGA pitch [S12]; the Nordic 0.30 mm WLCSP is therefore not assumed supported. Confirm an appropriate process/vendor before shrinking to it. Assemble/reflow boards first, then attach a suitable pre-tabbed cell; never put the battery through reflow.

Preferred mechanics: print two empty shell halves and an internal caddy, finish/cool/cure them, install and test the electronics, then close a flush seam. Hold the sensor rigidly while protecting the cell and solder joints from impact. Provide programming/test access and reopenability during development. Centre mass and consider moments of inertia, shell thickness, pips, edges and seam geometry; nominal geometric balance alone does not establish fair rolling. Conductive/ferromagnetic ballast can degrade charging and antennas.

Pausing an FDM print to insert hardware is supported by slicers [S14], but not recommended around an assembled rechargeable cell: nozzle/bed heat, collisions, permanent enclosure and loss of repairability are avoidable problems. Insert inert parts or suitable unpowered hardware only with a qualified thermal/process plan. Do not embed powered assemblies in uncured resin. Functional FDM/resin prototypes do not establish production durability or fair statistical behavior. Delay permanent potting until battery, thermal, MEMS stress and RF effects are reviewed.

## Risks and execution bounds

| Risk | Consequence / severity rationale | Mitigation / closure | Owner / state |
|---|---|---|---|
| HW009-K1 | Cell impact, overheating, wrong charge limits: potentially serious | Exact cell datasheet, protected assembly, thermal/impact and charge review | Qualified EE/ME unassigned; open |
| HW009-K2 | Attractive package dimensions fail routed/RF/coil fit | Start 20 mm, mechanical stack and reference-layout review before PCB order | HW; open |
| HW009-K3 | Arbitrary-orientation charging has dead zones | Six faces, yaw/position grids, five loaded dice, hand/metal proximity | HW; open |
| HW009-K4 | Lost, duplicate or stale result corrupts game | Session/sequence/reconnect tests and confirmed authority | SW/INT; open |
| HW009-K5 | Cell/caddy/coil biases rolling | Mass/inertia review, controlled randomized rolling dataset and statistical design | HW; open |
| HW009-K6 | RF energy demo extrapolated beyond actual antenna/field | Measure net stored energy and load with realistic mini receiver | HW; open |

No physical equipment was energized or modified. Before any bench execution: freeze specimen/BOM/firmware, qualified cell charge-current/voltage/temperature bounds, current-limited supply, power analyzer/DMM and temperature probes; define stop on overtemperature, swelling, unexpected current, unstable charging or damaged insulation. End with power disconnected and cells in their specified safe storage state. This document neither supplies numeric safe limits for an unselected cell nor authorizes procurement/deployment.

## Completion and decision

Research and arithmetic completed; see `../hardware-studies/rechargeable-dice/calculations.mjs` and generated `results.json`. No physical current, RF, thermal, balance, charge-time or reconnection tests performed. No schematic, manufacturing quote or order-ready BOM. Software tests/builds skipped because no executable product code changed. Existing work preserved.

Recommended next engineering sequence: (1) bench BLE/accelerometer energy and five-die automatic reconnect; (2) one aligned inductive link and a separate e-peas RF harvesting experiment using a representative mini receiver; (3) 20 mm serviceable die plus five-well case; (4) compare any-face case and full-tray RF/inductive coverage against the measured load; (5) shrink only after fit and physical evidence. This sequence does not select one charging experience on the user's behalf. Independent review, physical acceptance and commercial gates remain open.

## Primary sources checked 7 October 2026

- S1: [Nordic GoDice design](https://www.nordicsemi.com/Nordic-news/2022/08/Particulas-GoDice-employs-Nordics-nRF52805-SoC).
- S2: [Pixels power/case](https://gamewithpixels.com/pages/power).
- S3: [nRF54L family launch/packages](https://www.nordicsemi.com/Nordic-news/2024/11/Nordic-Semiconductor-launches-nRF54L15-nRF54L10-and-nRF54L05-next-generation-wireless-SoCs), [hardware layout guidance](https://academy.nordicsemi.com/courses/nrf54l-series-express-course/lessons/lesson-1-architecture-overview/topic/hardware-layout-and-design/).
- S4: [ST LIS2DW12](https://www.st.com/en/mems-and-sensors/lis2dw12.html).
- S5: [ADI LTC4124](https://www.analog.com/en/products/ltc4124.html), [LTC4124/LTC4125 charging design](https://www.analog.com/en/resources/technical-articles/complete-efficient-100-ma-wireless-charging-solution-with-optimum-power-transfer-and-safety-features.html).
- S6: [Wurth receiver coil datasheet](https://www.we-online.com/components/products/datasheet/760308101208.pdf).
- S7: [VARTA 2025 component overview](https://www.varta-ag.com/fileadmin/varta/industry/downloads/products/Product_Overview_2025_Web.pdf).
- S8: [e-peas AEM30940](https://e-peas.com/product/aem30940/), [RF engineering note](https://e-peas.com/wp-content/uploads/2024/09/appnote-aem30940-rf.pdf).
- S9: [e-peas AEM13920](https://e-peas.com/product/aem13920/).
- S10: [e-peas/Energous active RF developer architecture](https://e-peas.com/press-releases/energy-harvesting-developer-kit-for-rf-wireless-charging-on-the-basis-of-e-peas-aem30940/).
- S11: [Epishine indoor cell output](https://www.epishine.com/faq/power-output-indoor-solar-cells).
- S12: [JLCPCB assembly capabilities](https://jlcpcb.com/capabilities/pcb-assembly-capabilities).
- S13: [Nordic bare-metal nRF54L stack](https://www.nordicsemi.com/Products/Development-software/nRF-Connect-SDK/Bare-Metal-option-for-nRF54L-Series?lang=en).
- S14: [Prusa pause/insert support](https://help.prusa3d.com/article/insert-pause-or-custom-g-code-at-layer_120490?product=mk3).
