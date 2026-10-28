# Yahtzee architecture map

27 October SW068 review: current integrated application is the SW066/SW067 baseline, reviewed at published d3d8037. See plans/SW-068-architecture-phone-readiness.md for verified boundaries, reproduced gaps and next-phone gates. On fg-dev the source is this repository; Windows paths in historical handovers are host-specific. Keep the present stack for the manual POC; application fixes proposed in SW068 are not implemented by that review.

SW046 additive boundary: account-addressed invitations/readiness use the authenticated clubhouse_social RPC and separate social tables/RLS. A locked explicit lobby accept adds a UUID seat; existing membership and score authority remain in clubhouse_rooms. Transient play requests never resume/advance games. Server-only APNs/FCM worker owns notification delivery; notification data is an untrusted navigation hint, never a game command. SW047 is the Playform shared UI layer; it derives bonus geometry from accepted scores.

This is a routing map to existing contracts, not a replacement specification.

| Boundary | Code / contract | Ownership |
|---|---|---|
| Original shared-device experience | `src/main.js`, original build spec | Legacy saves and rules remain isolated |
| New local game and UI | `src/game/`, `src/core-store.js`, `src/prototype.js` | Pure game state and durable local recovery |
| Hosted multiplayer | `src/multiplayer/`, `server/rooms/`, `supabase/` | Server validates seat, revision and commands |
| Dice transports and camera reader | `src/dice/` | Observations/proposals; no independent game authority |
| Android integration | `android/`, Capacitor config | Native BLE bridge and packaged shared UI |
| iOS manual integration | `ios/`, `scripts/prepare-ios-test.mjs` | Signed Capacitor shell, native link routing, safe areas and the same manual web assets |
| Live commentary (deferred) | `src/commentary/`, `server/commentary/`, Android native player | Server-held providers, accepted-event jobs, bounded playback; separate listening/latency acceptance |
| Development previews | `lab/`, `preview/` | Labelled fictional offline lab versus real-backend manual preview; neither establishes deployment |
| Pi local/device host | `device/pi/`, `pi-hardware-handoff.md` | Separate local authority and device gateway |
| Physical camera prototypes (historical records) | Hardware project/handover documents; `hardware/` and `camera-design/` are absent from this fg-dev checkout | Obtain exact versioned CAD/BOM/specimen artifacts before physical qualification |

Current phone packaging uses MODE=ios-test for both platforms. This disables the welcome/voice path independently of the native OS. Ordinary MODE=native is a different feature path; do not substitute it for the manual candidate. The manual config must have push disabled and no commentary endpoint. Exact signer, asset manifest and same-ID installation evidence belong in each release record.

Read `multiplayer-development.md` for room authority; `raspberry-pi-game-design.md` and `pi-hardware-handoff.md` for implemented versus planned Pi behavior; `camera-dice-development.md` and `camera-fresh-validation.md` for recognition evidence. Cloud/Pi authority integration remains explicitly scoped by those contracts. Do not silently merge independently advanced games.
