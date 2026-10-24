# Yahtzee architecture map

SW046 additive boundary: account-addressed invitations/readiness use the authenticated clubhouse_social RPC and separate social tables/RLS. A locked explicit lobby accept adds a UUID seat; existing membership and score authority remain in clubhouse_rooms. Transient play requests never resume/advance games. Server-only APNs/FCM worker owns notification delivery; notification data is an untrusted navigation hint, never a game command. SW047 is the Playform shared UI layer; it derives bonus geometry from accepted scores.

This is a routing map to existing contracts, not a replacement specification.

| Boundary | Code / contract | Ownership |
|---|---|---|
| Original shared-device experience | `src/main.js`, original build spec | Legacy saves and rules remain isolated |
| New local game and UI | `src/game/`, `src/core-store.js`, `src/prototype.js` | Pure game state and durable local recovery |
| Hosted multiplayer | `src/multiplayer/`, `server/rooms/`, `supabase/` | Server validates seat, revision and commands |
| Dice transports and camera reader | `src/dice/` | Observations/proposals; no independent game authority |
| Android integration | `android/`, Capacitor config | Native BLE bridge and packaged shared UI |
| Pi local/device host | `device/pi/`, `pi-hardware-handoff.md` | Separate local authority and device gateway |
| Physical camera prototypes | `hardware/`, `camera-design/` | Revisioned mechanical/electrical/validation artifacts |

Read `multiplayer-development.md` for room authority; `raspberry-pi-game-design.md` and `pi-hardware-handoff.md` for implemented versus planned Pi behavior; `camera-dice-development.md` and `camera-fresh-validation.md` for recognition evidence. Cloud/Pi authority integration remains explicitly scoped by those contracts. Do not silently merge independently advanced games.
