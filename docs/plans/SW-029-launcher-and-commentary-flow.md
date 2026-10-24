# SW-029: Clubhouse launch flow and measured commentary latency

14October2026. Owner user, lead Codex. Product-change/live-commentary/manual-multiplayer workflows; baseline clean f83a80c SW028. Owner requests home menu on every launch, solo/shared-phone local/online/tournament choices, saved cross-launch commentary preferences, per-game Yes/No, connected spoken welcome before opening scorecard, redesigned game menu and logged score-to-playback delay. Local multiplayer explicitly confirmed as one shared phone. Preserve accepted scores and separate local seat identities from authenticated accounts.

## Acceptance and architecture

- Always open premium touch home; Resume restores saved game deliberately. Rich cards for solo, shared phone, online and tournament. Replace dropdown with accessible themed action drawer/dialog; reduced-motion support.
- Persist validated device commentary defaults (voice/style/language/frequency/enable/mute) and explicit player drafts. No keys/tokens in preference/diagnostic storage. Each new game asks Yes/No if globally enabled; No skips all provider work. Preferences persist until user changes them.
- Initial welcome is a launch gate with connecting/writing/speaking state, cancellation and explicit continue-without-voice recovery. Accepted score submissions remain independent from commentary. Reconnect/resume never silently replays welcome.
- Solo/shared-phone live commentary needs an authenticated server-owned local-session command mirror, replayed through pure rules. Local participant IDs remain game-local IDs, never invented Auth accounts. Offline local scoring stays available; live voice requires network/sign-in and administered server allowance.
- Save host/account permission boundaries and immutable accepted event evidence. Shared-phone owner may control its local seats; this grants no hosted opponent-seat authority. Optional local blurbs are sent only after per-game consent; retain source labeling.
- Measure monotonic score submission/accepted observation → native audio-position callback; record provider writing/voice stages and authoritative acceptance → playback receipt separately. Native position is a playout proxy, not physical sound verification. Bounded privacy-safe diagnostics clear with Forget/history expiry.
- Reduce avoidable startup delay with one atomic acquire+claim operation and fewer sequential network calls. Keep profile/Undo/lease validity and budget reservations. No unapproved provider retries or usage increases.

## Verification and rollout

Meaningful persisted-preference/relaunch, startup routing, per-game No, welcome-complete/failure/skip, authenticated local replay/seat/privacy/idempotency, atomic playback, latency baselines and adverse path regressions; actual disposable SQL checks for any additive schema changes; full clean Node24 gate, source/APK/readback manifests. Initial UI changes and local bridge are implementation scope, not declared complete before evidence. Pixel deployment/physical performance needs exact qualified build and current device inspection. Current owner scope includes continued app iteration for Pixel testing; report public guest-web state separately.

## Completed slice and remaining gates

Implemented and qualified clean `5a6805f8f0922078c2b7a04057712a96f9c1fc77`:988 tests passed/13optional camera skips/all configured builds/unchanged source;25 real PostgreSQL checks. Premium Home, explicit Resume, saved settings/local player drafts, all four mode routes, Yes/No welcome gate, private authenticated shared-phone mirror, themed action drawer and bounded timing logs complete. Built browser checks at320/390px passed. Saved mute survives reopening; per-game Yes can explicitly unmute without changing defaults. Endpoint authorization checks retained after automatic review rejected their proposed deduplication; safer local-read/cache/atomic-playback improvements used instead.

Migration8 applied with unchanged existing game/room fingerprints and RLS/privileged permissions checked. Commentary v5 canonical readback matched; unsigned401; room v9 unchanged. Pixel exact APK8144531129d439fa46add2d3ca24157b3e2cc5cf39c9827da4b489fde5c09038 installed-r/readback/launch verified,38assets match. No paid diagnostic call, score deletion or public web publication. Full manifest and rollback: [SW029 release](../releases/SW-029-clubhouse-launcher.md). Physical welcome, real score-to-sound delay, humor quality and two-account/new-tournament acceptance remain owner gates. Complete six-sprint POC is not asserted.
