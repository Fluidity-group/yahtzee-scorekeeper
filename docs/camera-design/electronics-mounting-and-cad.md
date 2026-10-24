# Electronics mounting and printable CAD assessment

Research date: 28 September 2026. Supplements `low-angle-camera-design.md`. The [first CAD prototype and assembly guide](../../hardware/dice-vision-v1/README.md) now provide STEP, STL and editable CadQuery source. Physical validation remains outstanding. This document records the dimensional research underlying that prototype.

## Decision

The full enclosure, stand and camera head can be modelled parametrically and exported as printable parts. An MCP integration is not required. Recommended workflow: local CadQuery/OpenCascade for solid modelling, parameterized Python source, STEP assembly, and one STL per printable component. CadQuery documents [installation on Windows](https://cadquery.readthedocs.io/en/latest/installation.html) and [STEP/STL export](https://cadquery.readthedocs.io/en/stable/importexport.html). FreeCAD is an optional visual editing/review tool.

The session has shell and file tools but no connected CAD tool. A plugin catalog search for CAD/FreeCAD/OpenSCAD/3D printing returned no matches. PATH and common application directories did not reveal FreeCAD/OpenSCAD; the bundled Python environment lacks CadQuery and OCP. This is not an exhaustive software inventory. Before building and validating the solids, install a local CAD runtime in an isolated project environment. No installation was performed for this assessment. [MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) describes optional external-tool connections; it does not provide a CAD engine itself.

## Proposed electronics list

1. Raspberry Pi 5, development RAM capacity to be selected independently of enclosure dimensions.
2. Official Raspberry Pi Active Cooler, attached to the Pi.
3. Raspberry Pi Camera Module 3 Wide, visible-light version.
4. Official 500 mm Standard–Mini camera cable.
5. Adafruit 5648 MOSFET driver, proposed for switching/dimming both light segments together.
6. Adafruit 5851 natural-white 5V COB strip, proposed as two 50 mm sections; diffusion and brightness require testing.
7. External official Raspberry Pi 27W USB-C supply, microSD card, GPIO/power wiring and light leads.

Items 5–6 make the earlier conceptual lighting concrete, but remain prototype selections. No battery, charger, display, USB hub or additional AI accelerator is assumed. The power supply stays outside the printed device.

## Verified mechanical interfaces

All measurements below are millimetres. Values labelled 'allowance' are design decisions, not manufacturer specifications. Manufacturer drawings are references, with tolerances and some component details omitted; a physical fit check remains necessary.

### Pi 5

Official drawing: [online](https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-mechanical-drawing.pdf), saved as `references/pi5-mechanical.pdf`.

- PCB outline: 85 × 56; connectors extend beyond it.
- Four board-mounting holes: diameter 2.7, rectangular pitch 58 × 49; use M2.5 hardware.
- With the drawing's lower-left PCB corner as origin: hole centres (3.5, 3.5), (61.5, 3.5), (3.5, 52.5), (61.5, 52.5).
- Two separate cooler holes are diameter 3; they are not case mounting holes.
- The drawing shows 3 mm connector projection at the USB/Ethernet end. Port bodies and plug handling need additional space.

Design allowances: start with 6 mm underside clearance, then check microSD, solder joints and cooler clip ends. Provide external access for USB-C power, power button, USB/Ethernet, and a microSD service opening. Keep HDMI accessible through a removable service panel. Rotate the Pi within the enclosure to put its USB-C connector at the intended rear cable exit. Reserve space above the GPIO header for the lighting lead; avoid enclosing the radio antenna behind a metal ballast plate. Exact connector apertures should follow physical/model validation, not PCB outline alone.

### Camera Module 3 Wide

Official drawing: [online](https://datasheets.raspberrypi.com/camera/camera-module-3-wide-mechanical-drawing.pdf), saved as `references/camera3-wide-mechanical.pdf`.

- PCB outline: 25 × 23.862 (commonly rounded to 25 × 24).
- Full front-to-back assembly envelope shown: 12; PCB thickness 1.12.
- Four holes: diameter 2.2; use M2 hardware. Horizontal pitch 21 and vertical pitch 12.5.
- Origin at the drawing's lower-left PCB corner: centres (2, 2), (23, 2), (2, 14.5), (23, 14.5).
- Optical centre: x = 12.5, y = 14.4. The lens is not centred vertically on the PCB.
- Sensor housing: 10.8 × 10.8; lens barrel diameter 6.95; mounting-pad envelope diameter 4.75.

Design allowances: mount on a removable four-boss carrier, support only clear board areas, and leave connector-latch access and a ribbon service loop. Do not squeeze the autofocus assembly. Begin with a 40 × 40 × 25 camera-carrier allocation, then resolve the tilt hinge and light inserts in the complete head. Recessing a wide-angle lens behind a narrow hole can clip its view: for a simplified barrel-based envelope, add approximately 2*d*tan(51 degrees) to the horizontal opening for recess d, plus tolerance, and verify actual corner rays. A shallow bevel/open front is preferable to a deep lens tunnel.

### Official Active Cooler

Official drawing: [online](https://datasheets.raspberrypi.com/cooling/raspberry-pi-active-cooler-mechanical-drawing.pdf), saved as `references/active-cooler-mechanical.pdf`.

- Overall reference envelope: 63.50 × 42.50 × 13.70.
- Blower plan dimensions: 30 × 30.
- Uses its supplied spring clips in the Pi's dedicated holes and the Pi fan connector; no extra enclosure mounting posts.

The 13.70 dimension includes the cooler assembly/clip envelope; it is not a measured installed height above the PCB. Resolve the assembled stack rather than simply adding this value to board height. Start with 25 mm above the PCB reserved for cooler/header/wires and a further approximately 5 mm unobstructed intake allowance where needed. Vent above the blower and beside the fin exhaust. Keep the mast socket, wiring and ballast outside the airflow path. Verify the printed assembly under sustained camera/inference load. [Official cooler information](https://www.raspberrypi.com/products/active-cooler/).

### Lighting switch board: Adafruit 5648

[Product specifications](https://www.adafruit.com/product/5648), [manufacturer PCB](https://github.com/adafruit/Adafruit-MOSFET-Driver-STEMMA-PCB), [manufacturer 3D models](https://github.com/adafruit/Adafruit_CAD_Parts/tree/main/5648%20MOSFET%20Driver).

- Published assembled dimensions: 25.4 × 17.7 × 7.2.
- Eagle PCB outline gives 25.4 × 17.78, with chamfered corners; retain this more precise PCB value in CAD.
- Eagle mounting elements U$1 and U$8: (22.86, 2.54) and (22.86, 15.24), so 12.70 pitch.
- Mounting-hole package drill: 2.5. M2 screws with suitable insulating spacers/washers provide clearance; confirm component clearance.
- 3-pin JST PH input, 2 mm pitch; screw-terminal output. Reserve approximately 40 × 30 × 20 including wires and screwdriver access, not just the board footprint.

Put this on a removable small carrier beside the Pi. It is a switch, not a constant-current LED regulator; use with the selected voltage-rated strip. The manufacturer lists 3V-compatible control and 1.5A continuous load capability. The short light segments are well below that, subject to actual current testing. PCB source and attribution/license are saved under `references/mosfet-5648*`.

### Light segments: proposed Adafruit 5851

[Product page](https://www.adafruit.com/product/5851), [linked manufacturer datasheet](https://cdn-shop.adafruit.com/product-files/5851/S005320ZC1LZ%20ds.pdf), saved as `references/led-5851-datasheet.pdf`.

- Datasheet FPCB width: 5; illustrated section height approximately 1.8; cut interval 25.
- Proposed quantity: two 50 mm sections, each cut only at marked pads, mounted either side of the camera.
- Datasheet covers coating variants and a 5 m roll; the seller offers a 1 m product and describes a silicone cover. Final supplied outer width/thickness must be measured; 5 × 1.8 is not a guaranteed coated envelope.
- No screw holes. Mount in removable light trays with adhesive backing and end retainers clear of pads/components. Provide insulated solder recesses and cable strain relief.

Use a replaceable diffuser over each segment and an opaque divider next to the lens. Initially reserve 60 × 12 × 8 for each light insert including wiring/diffusion; this is a design allowance. Two 50 mm sections suggest an approximately 150 mm-wide complete head, larger than the camera-only carrier. The aesthetic can retain the original sketch's horizontal light bar. A shorter bar is possible after exposure tests.

The seller's 1.3A/m at 5V implies about 0.13A for 100 mm. The linked generic datasheet's 7–8W/m implies 0.14–0.16A; use a provisional 0.25A lighting budget and measure the supplied strip. Verify temperature and camera banding at any PWM settings. Continuous illumination during exposure is an alternative. Keep light current out of GPIO signal pins; GPIO only commands the switch. Use a properly connected 5V rail, common ground and a removable harness; finalize power protection/wiring with the hardware build.

### Cable, power and storage

- [Official camera cable](https://www.raspberrypi.com/products/camera-cable/?variant=camera-cable-std-mini-500): select 500 mm Standard–Mini for base-to-head routing and tilt slack. Pi end is 22-way; camera end 15-way. [Connector pitches](https://www.adafruit.com/product/5820) are 0.5 mm and 1 mm respectively. Do not mistake the Pi display cable for the camera cable.
- Start with an approximately 20 mm-wide internal ribbon passage and a removable mast back cover. Actual shielding/connector stiffener width and minimum bend radius remain physical checks. Use smooth loops, no sharp folds, and no sliding clamp that pinches the cable. This is a occasionally adjusted stand, not a continuously moving camera gimbal.
- [Official 27W supply](https://datasheets.raspberrypi.com/power-supply/27w-usb-c-power-supply-product-brief.pdf): supports 5.1V/5A for Pi 5, with a 1.2 m attached USB-C lead. Keep the wall supply external and mate directly to the Pi initially. The USB-C plug moulding and cable bend need clearance; use a generous removable rear insert until the actual lead is checked.
- MicroSD uses the Pi's onboard socket; no extra PCB. Allow card removal without removing the mast.

## Packaging changes from the concept sketch

Start CAD with a base envelope around 140 × 100 × 45 and a head around 150 × 45 × 30. These are provisional design allocations rather than verified final sizes. The earlier 120 × 90 × 40 base might be achievable, but fitting connectors, the light driver, ballast and servicing should determine the final size.

Keep the optical target of 300 mm lens height and 200 mm horizontal offset from tray centre. Base dimensions must not silently shift the lens farther back. Make ballast a removable, electrically isolated pocket. Design a broad thin foot under the tray; the actual tray underside and centre of gravity determine its shape and weight requirement.

## What the printable package can contain

- Base lower shell, ventilated lid, Pi mounting tray, driver carrier, cable/service inserts, ballast retainer and removable under-tray foot.
- Two printable mast sections with a rigid joint and locking adjustment, removable cable cover, tilt yoke and bolt/knob hardware.
- Camera carrier, head front/rear shells, light trays, diffuser retainers and lens baffle.
- Editable parametric source, STEP assembly, separate STL parts, exploded assembly views, hardware BOM and print-orientation notes.

Prefer metal fasteners and captive nuts/inserts for structural joints; do not rely on printed fine threads. Print fit coupons for M2/M2.5 holes, insert bosses and sliding joints before the whole assembly. Split the roughly 300 mm mast into pieces suited to a typical approximately 220 mm printer bed. Printer/material-specific clearances remain tunable parameters. Diffusers may be bought/cut or printed separately, with optical testing; fasteners, ballast and electronics are not printed. G-code is generated later for the actual printer/material in a slicer.

## Release checks

1. Reconcile the real tray underside and rim dimensions with the foot and camera position.
2. Freeze the electronics variants and measure connector plugs, LED coating and ribbon routing.
3. Generate solids; check validity, intersections, minimum walls and fastener/tool access. Inspect rendered assembly and sections.
4. Export STL and check watertight meshes and slicer results; retain STEP/source for edits.
5. Print a small camera/PCB fit sample, then a structural prototype. Test focus, whole-tray coverage, lighting, vibration, tip resistance and temperature.

We have sufficient information to begin a parameterized first prototype. We do not yet have enough physical evidence to promise a first-print-perfect or production-ready housing. Another program's MCP would not remove those fit and optical validation steps.
