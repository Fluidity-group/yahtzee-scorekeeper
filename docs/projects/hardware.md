# Hardware project control

7 October HW-010 M1: user identified missing STEP files in the A0 ZIP. Created five STEP/STL fit-test parts, nominal assembly references and print/assembly guidance. STEP validity, mesh closure and 52 simplified collision checks pass; print fit, component/tab/lead interference, balance and closure strength remain untested. [M1 mechanical supplement](../../hardware/casino-die/rev-a/mechanical/PRINT-AND-ASSEMBLE.md). A0 electronics unchanged; no physical gates closed.

7 October HW-010: 19.7 mm rechargeable-die A0 review package prepared with 16.8 mm four-layer die PCB and 30 mm two-layer transmitter coupon, replicated for the user's selected five-well marked-face-down case. Both boards pass automated DRC/connectivity; physical fit, exact cell, charging and independent review remain open. Generated Gerbers are review-only. [Task and evidence](../plans/HW-010-casino-die-prototype.md).

7 October HW-009: researched rechargeable BLE/MEMS dice and five-die charging case, full-tray charging and e-peas energy harvesting. Component packages and scenario arithmetic support further design; fit, net harvested power, six-face charging coverage, thermal/impact and balance remain open. All charging experiences assessed without selecting one for the user. [Architecture and evidence](../plans/HW-009-rechargeable-dice-and-case.md).

7 October HW-008: lidar/radar and alternative passive-die sensing researched. Representative ToF/radar resolution and missing face contrast make ordinary modules poor primary pip readers. New precedents support tray-powered accelerometers, gravity-gated RF tags and inductive resonant pose sensing. These supersede HW-007's six-independent-face-tag recommendation priority; 16-20 mm packaging and five-die full-tray evidence remain open. [Assessment](../plans/HW-008-alternative-dice-sensing.md). No prototype or platform acceptance.

7 October HW-007: passive bottom-face floor sensing researched. Published battery-free RFID die prototype supports the principle but uses a tuned small read area; five dice over the actual full tray remain unverified. Recommend one normal-size tagged die/small pad before full-area design, with underside optical reading as an ordinary-dice comparison. Magnets and conductive codes remain secondary candidates. [Research and proposed trial](../plans/HW-007-passive-bottom-face-tray-feasibility.md). No physical gate passed.

7 October HW-006: tray-mounted camera feasibility researched and calculated. Amazon tray listing gives approximately 310 x 290 x 40 mm overall; internal dimensions are unmeasured. A nominal 40 mm rim lens sees a 16 mm centre die top at 9.4 degrees. Recommend comparing rigid tray-attached overhead optics with raised 120-150 mm lens pods, provisions for four views; known-layout side inference requires new software. Geometry script/diagram executed, no physical or independent-review gate passed. [Assessment and trial proposal](../plans/HW-006-tray-mounted-camera-feasibility.md).

Owner: product owner. Engineering coordinator: Codex. Qualified electrical/mechanical review owners: unassigned. Updated 1 October 2026.

## Scope and design authority

Own physical assemblies, power, boards/harnesses, optics, mechanics, thermal behavior, manufacture and test methods. Existing candidates include Pi camera assemblies and ESP32 dice-vision designs. Do not select a production platform or mark a CAD generation as an accepted assembly without a recorded decision.

Use existing candidate documentation and validation records as authority: `../camera-design/`, `../pi-hardware-handoff.md`, and `../../hardware/dice-vision-esp32/prototype-2026-09-30/validation/`. Inspect the relevant electrical/mechanical review and bench plan before physical work. Read the hardware-validation skill when planning/executing acceptance.

## Gate status

Product-owner direction on 1 October 2026: C121 local Wi-Fi camera first, with external-light and elevated-side/downward geometry trials; ESP32 battery dice housing follows conditional on independent camera resolution/recognition evidence. See [platform decision](../decisions/2026-10-01-camera-platform-sequence.md) and [software handover](../c121-software-handover.md). C121 purchase/arrival is planned, not verified. HW-001 continues revision/provenance control; HW-002 now prepares C121 specimen/rig/optical-lighting qualification first and retains ESP battery bench blockers for the follow-on stage. No physical gate is passed by selection.

G0 in progress: design sources and packs require baseline/provenance reconciliation. G1 has review artifacts but no overall sign-off. G2 physical bench readiness unconfirmed. G3 not passed: assembly, electrical and runtime acceptance open. G4/G5 not started.

| ID | Priority / state | Next deliverable and closure |
|---|---|---|
| HW-001 | P0 / open | Inventory authoritative CAD/board/harness/BOM revisions and supplier licences; distinguish candidates, generated packs and superseded designs. Produce a reviewed manifest. |
| HW-002 | P0 / open | Select POC candidate and intended use; document power/wiring/battery assumptions, assembly hazards, design review and qualified reviewer. Close bench-readiness blockers in existing records. |
| HW-003 | P1 / open | First-article inspection and bounded bench qualification on an identified specimen; record dimensional/fit, wiring, power/current, thermal and optical measurements as applicable. |
| HW-004 | P1 / open | Integrated full-game and fault/recovery acceptance with exact SW/configuration; use fresh recognition data and agreed reliability thresholds. |
| HW-005 | Later / open | Post-POC manufacturability, production test/calibration, supplier continuity, cost, market-specific compliance assessment, traceability, warranty and repair plan. |
| HW-006 | P1 / advisory complete; physical open | Tray-mounted optics geometry researched/calculated; compare tray-fixed overhead and raised multi-view pods using identified specimens and fresh labelled data before selecting/fabricating a design. See linked assessment. |
| HW-007 | P1 / advisory complete; physical open | Passive bottom-face sensing precedent researched; demonstrate face selectivity on one die/small pad, then five dice, then full tray before choosing hardware. |
| HW-008 | P1 / advisory complete; physical open | Screen lidar/radar and alternative die/floor sensing; investigate tray-powered gravity sensing and inductive pose sensing before selecting components. |
| HW-009 | P1 / advisory complete; physical open | Compare rechargeable BLE dice with five-well inductive charging and e-peas RF-powered tray; measure power and mini-receiver coverage before PCB/case selection. |

## Definition of completion

Identify specimen, component/BOM, CAD, board, harness, firmware, configuration, instruments and calibration status. Define test bounds, expected measurements, stop conditions and final safe state before execution. Capture actual readings, failures and untested cases in the existing validation tables. Simulations and CAD checks support design review but cannot pass physical gates. Release fabrication/assembly packs with source/dependency hashes and inspection/test instructions. Purchases, supplier communications and live deployment require task-specific authorization.
