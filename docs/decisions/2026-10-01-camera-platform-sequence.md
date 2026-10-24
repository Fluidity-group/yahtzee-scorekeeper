# Camera platform sequence: C121 first, ESP32 cube after evidence

Date: 1 October 2026. Decision owner: product owner, explicitly confirmed in the dedicated hardware chat. Engineering coordinator: Codex.

## Accepted direction

Develop first for the off-the-shelf Tapo C121 camera and its local Wi-Fi streaming capabilities. Use separate adjustable white lights to establish usable illumination, glare control and exposure conditions. Compare elevated side views and downward views; overhead placement is not a requirement. After these tests, finish the ESP32 camera(s) in the dice-shaped battery-powered housing, conditional on the selected ESP camera/lens providing adequate image detail and recognition performance.

The user plans to order a C121 with a quoted two-day delivery; purchase, receipt and specimen identity are not verified. No software adapter, physical test or POC acceptance is established by this decision. The earlier Pi-first recommendation is superseded for current development priority. Pi remains an existing separate prototype path.

## Product and integration constraints

- Camera video should travel locally from camera through Wi-Fi/router to the Android application. No vendor-cloud or project-cloud video relay is required for the chosen topology. Initial vendor setup and exact offline restart behavior must be verified on the received hardware/firmware. Hosted multiplayer's existing internet requirement is unchanged.
- Keep recognition, calibration and player review in our software. Camera observations never bypass seat, revision, turn, held-slot, legal-roll or idempotency checks. No automatic accepted game roll is authorized by this decision.
- Treat C121 firmware as vendor-controlled. Use documented RTSP/ONVIF features; do not assume custom firmware, close focus, exposed shutter/gain controls or a programmable lighting API.
- External lighting experiments inform the future housing, but do not qualify its internal lamps, diffusers, thermal performance or battery runtime.
- Qualify the ESP camera independently with fresh images. C121 success is not proof that an ESP camera with a different lens, resolution, compression or processing mode is sufficient.

## Evidence and next work

Software implementation brief: [C121 software handover](../c121-software-handover.md). Task/acceptance tracking: [SW-006 plan](../plans/SW-006-c121-local-camera.md). Existing ESP electrical/mechanical and battery gates remain open in `hardware/dice-vision-esp32/prototype-2026-09-30/validation/`.

Manufacturer references checked in this chat: [C121 datasheet](https://static.tp-link.com/upload/product-overview/2024/202410/20241031/Tapo%20C121%28US%291.6_Datasheet.pdf), [local RTSP setup](https://www.tp-link.com/us/support/faq/2680/), [RTSP/ONVIF constraints](https://www.tp-link.com/us/support/faq/4465/). Recheck received hardware revision and firmware against its matching support page.
