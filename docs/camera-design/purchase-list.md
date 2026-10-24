# Dice-vision device purchase list

Prepared 28 September 2026 for the proposed Pi-based angled camera stand. Quantities are for one device. This is a prototype BOM: the Pi capture service, angled recognition, game connection and physical validation still need completing. Printing and assembling the housing alone does not deliver finished dice recognition.

## Electronics and essential cables

| Qty | Purchase | Selection / purpose |
|---|---|---|
| 1 | [Raspberry Pi 5, 4GB RAM](https://www.raspberrypi.com/products/raspberry-pi-5/) | Proposed development baseline. 8GB is optional for additional experimentation, not required by this mechanical design. Final processing performance remains to be measured. |
| 1 | [Raspberry Pi Camera Module 3 Wide](https://www.raspberrypi.com/products/camera-module-3/) | Select **Wide, visible-light**, with its normal infrared filter. Avoid the Standard lens and NoIR variants for this build. |
| 1 | [Official Raspberry Pi Active Cooler](https://www.raspberrypi.com/products/active-cooler/) | Includes its fan lead and mounting solution; attaches directly to Pi 5. Do not buy a separate Pi case fan as a substitute. |
| 1 | [Official Raspberry Pi 27W USB-C power supply](https://www.raspberrypi.com/products/27w-power-supply/) | Select the wall-plug version appropriate to your country. Supports the Pi's 5.1V/5A supply profile. Attached cable means no separate USB-C power cable is required. |
| 1 | [64GB official Raspberry Pi A2 microSD card](https://www.raspberrypi.com/products/sd-cards/) | Holds Raspberry Pi OS, application, models and sample images. Existing suitable 64GB A2 card can be reused. |
| 1 | [Official 500mm Standard–Mini camera cable](https://www.raspberrypi.com/products/camera-cable/?variant=camera-cable-std-mini-500) | Camera-to-Pi connection: 15-pin camera end / 22-pin Pi 5 end. Buy the **camera** cable. The ordinary 15-to-15-pin camera ribbon does not fit Pi 5 directly. 500mm allows the approximately 300mm mast plus routing and tilt slack. |
| 1 | [Adafruit MOSFET Driver, product 5648](https://www.adafruit.com/product/5648) | Proposed switch/dimmer for both LED sections together. Connects to the Pi header via the following lead. |
| 1 | [Adafruit 3894: STEMMA JST PH 2mm, 3-pin to female socket cable, 200mm](https://www.adafruit.com/product/3894) | Three individual female sockets fit selected Pi header pins; JST end fits the driver. This is **3-pin PH 2mm**, not 4-pin STEMMA QT/Qwiic. |
| 1 metre | [Adafruit 5851: 5V natural-white COB LED strip, 4000K](https://www.adafruit.com/product/5851) | Proposed lighting; initially use two 50mm sections, leaving spare strip for adjustment. Buy the **5V** version. Actual light level, coating size and diffusion need validation. |
| 2 metres each | [26AWG stranded silicone wire](https://www.adafruit.com/product/1970), red and black | Buy both colours. Enough allowance for the mast lighting run, branches to two segments, and rework. Final routing lengths are cut during assembly. |
| 1 small pack | Heat-shrink tubing, roughly 2–4mm before shrinking | Insulates soldered LED connections and wire branches. |

The light wiring needs soldering: cutting the strip creates new solder pads. The driver screw terminals allow the completed head wiring to disconnect at the base. Separate inline head plugs are optional, not necessary for this first BOM. Both LED sections connect in parallel, not in series. Final wiring instructions will identify Pi pin numbers and driver polarity; this shopping list is not a pinout diagram.

## Setup accessories — reuse if already available

| Qty | Item | When needed |
|---|---|---|
| 1 | USB microSD reader compatible with your computer | To write the OS image unless the computer already has a suitable card reader. |
| 1 | Ethernet patch cable, approximately 1–2m | Optional for dependable initial setup; the Pi has built-in Wi-Fi. |
| 1 | Micro-HDMI to standard HDMI cable | Optional local troubleshooting with a monitor. Not needed for planned headless/network use. |
| 1 | USB keyboard/mouse | Optional local troubleshooting; reuse existing equipment. |

Normal use is planned through an existing phone/tablet/PC browser on the same local network, with the camera attached to the Pi. That software bridge is still to be implemented. No additional webcam USB cable, wireless dongle, separate camera power supply or HDMI cable is required for that normal arrangement.

## Non-electronic assembly items

The [CAD prototype assembly guide](../../hardware/dice-vision-v1/README.md#mechanical-shopping-list) now lists proposed screw sizes and quantities, nuts, pivot spacers, pads, ballast and diffuser dimensions. Verify these with the fit coupon and actual parts before a full print; the design has not been physically assembled. Soldering iron, solder, wire stripper, small screwdrivers and a multimeter are assembly tools, not installed components.

## Purchase sequence

Buy the Pi, camera, cooler, supply, storage and camera cable first so we can test optics before final printing. The specified driver, cable and strip can also be bought for the lighting prototype, with the understanding that diffuser/strip-holder dimensions may change after measurement. Avoid substitutions of the camera, cooler or driver without checking the enclosure model.

No battery/charger, additional AI accelerator, display or custom PCB is included in this version. Product links identify the intended parts and lead to manufacturer or supplier pages; no live cart, stock guarantee or checkout-price total is implied.
