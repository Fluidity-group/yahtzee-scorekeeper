# SW-029 clubhouse launcher — 14 October 2026

State: qualified, backend deployed and Pixel installed for owner review. Scope: premium smartphone home, solo/shared-phone/online/tournament entry, persistent commentary defaults, per-game consent and welcome before scoring, themed menu drawer, score-to-playback diagnostics. Local multiplayer means one shared phone. Existing scoring records preserved; public guest website was not published in this slice.

## Qualified source and evidence

Clean isolated branch `codex/sw029-launcher-commentary`, commit `5a6805f8f0922078c2b7a04057712a96f9c1fc77`, source SHA256 `424eaf2aa61ac9bedbb0929c75bc6200b326f323044e7e2b5381fde65186a08c`. Checkout: `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`. Node24 gate: 988 tests passed, 13 optional camera skips, all configured builds and unchanged source. Evidence: isolated `artifacts/engineering/2026-10-14T23-54-32-091Z-b34b1f7e/report.json`. First run passed tests/builds but detected a changed generated room bundle; the qualified rerun includes that generated output. Actual disposable PostgreSQL: 25 checks passed, isolated `artifacts/commentary-durable/report.json`.

Built browser review at 390×844 and 320×740: home, deliberate Resume, saved defaults across reload, solo setup, per-game No leading to scoring, and themed menu. No horizontal overflow. Screenshots in root ignored `artifacts/sw029/home-390.png`, `menu-390.png` and `game-commentary-choice.png`. Browser review is not Android audio acceptance.

## Behavior and boundaries

Cold launch opens Home; saved games are resumed deliberately. Device defaults retain enabled state, selected voice, humor, profanity, cadence and mute. Local names, optional gender and explicitly shared blurbs are saved as editable drafts. New games ask Yes/No only if globally enabled. No skips voice work and does not change the saved default. If saved mute is on, Yes explicitly offers unmuting for this game. Welcome completion opens scoring; connection/failure/timeout offers explicit recovery without silently claiming speech played. Returning to an existing game does not replay its welcome.

Local scoring remains offline and independent from voice. Live local voice requires an authenticated Android host and network; one real owner controls game-local seats, which are never invented Auth accounts. Accepted commands are replayed through pure rules on the private server mirror, with stable retry IDs, bounded queue and quiet offline catch-up. Shared-phone blurbs are copied only after per-game Yes, targeted to the scored seat, treated as untrusted text, and local mirrors expire after 90 inactive days. Hosted seat/revision checks remain authoritative.

Menu → More tools → Commentary response times shows bounded diagnostic history. Monotonic score submission → native audio-position callback measures a playback-start proxy; fallback measurements explicitly begin at observed accepted event. Backend keeps receipt timing and provider stages. No physical sound latency or performance target has been established. Optimizations combine acquire+claim in one authenticated operation, cache settings, read only the requested local mirror and reuse historical room lookups within a writing pass. Endpoint initialization, explicit authorization, audience filtering, leases and administered provider accounting remain intact.

## Deployment and Pixel

Applied additive migration `202610140008_local_commentary_sessions.sql`, SHA256 `fe48d51ba40758b4ac473fcde7810410e392c6819e5a1cbccc0280c49c9acd06`. Existing 16 rooms/17 games, revision sum332 and complete row fingerprints matched before/after. Private RLS retained; anonymous/authenticated privileged commit denied, service role allowed. Migration adds owner-immutable local mirrors and rejects hosted-room key collisions. Root `artifacts/sw029/migration-rollout.json` records checks.

Supabase `ezgawsdmvuoqrxlfbgen`: live-commentary v5 ACTIVE. Downloaded source canonically matches qualified bundle (`411555bc3fd7b627f1359b59f54c8997bcbb1ea90bfe825e84f86e7714505fd0`), unsigned POST401. game-room v9 remains deployed; the rebuilt room bundle differs only by shared facts helper support for explicitly tagged local identities, unused by the deployed hosted path. No room endpoint deployment needed. Provider secrets/model/voice/admin limits unchanged; zero paid diagnostic calls. Existing 200 writer/200 voice/36,000-character ceiling and 18 October expiry remain; this release does not renew allowances.

Pixel11ProXL fresh inventory, data-preserving install-r and launcher Status ok. APK SHA256 `8144531129d439fa46add2d3ca24157b3e2cc5cf39c9827da4b489fde5c09038`, 7,549,138 bytes; all38 native assets matched and private full-key pattern scan passed. Installed APK pulled and matched exactly. Root ignored `artifacts/sw029/` owns install, source, migration and APK manifests. No app clearing or score deletion.

## Owner acceptance and rollback

Open app → Your commentator → enable/configure, edit shared local player details and Save → choose a mode → create/start → Yes. Expect connection and selected-name welcome before scorecard. Add a score, inspect animation, hear target-player roast, rate it, and check response-time log. Also test No, interrupted voice, background/return and actual two-account online/tournament behavior. Physical sound, latency, humor quality and complete POC acceptance remain open.

Rollback: disable commentary, restore previous SW028 APK from `artifacts/sw028-pregame/pixel-installed.apk`; retain scoring data. Keep additive database migration and local mirror data; do not downgrade the backend commit implementation to one that lacks the localSessions collection once local mirrors exist. Backend incident recovery should use a compatible forward fix or disable provider dispatch. No destructive schema rollback is needed.
