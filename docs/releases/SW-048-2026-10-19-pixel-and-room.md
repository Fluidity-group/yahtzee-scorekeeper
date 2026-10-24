# SW-048 Pixel and shared-game update — 19 October 2026

Owner authorized updating the Pixel, then explicitly authorized the matching shared-game server correction. Installation and backend deployment verified; actual owner phone acceptance remains open. iOS stays on hold; no web publication or phone alerts.

## Exact candidate and qualification

Runtime commit 942461467ed8f99ec1d43eb6a7e09a71ba182335, branch codex/sw048-tournament-moments. Clean/stable Node24.19.0 gate: artifacts/engineering/2026-10-19T19-51-16-362Z-45451820/report.json; source SHA256 0264ae64bbd0f115c805d15b87f8cce1ad0e3fab0dfd014419bdd28142b544a6. 1,129 tests passed,13 optional camera skips; web/native/iOS-web/room/commentary builds passed. iOS-web is a bundle check, not an iPhone build/install. Android JDK21.0.8/Gradle8.14.3 assembleDebug succeeded;49 synced/packaged assets byte-matched. APK artifacts/sw048/playform-sw048-debug.apk, SHA256 0e470dd0abeb4b40b3c3586f1b294be7af7eb4ecf96986f541f217017d45d631. Frozen manifest: artifacts/sw048/rollout-manifest.json.

Includes repeat-only final-turn Yahtzee (first50 scores normally), game score/margin celebration, final/penultimate-game notices and persistent independent points/games-won tournament awards with tie/margin explanations. Scratched scores are one large cross across the frame with zero-point accessible labels. No historical score/event rewrite. Existing active final attempts remain finishable.

Native manual-test configuration matches the previous Pixel installation: push false, voice deferred without changing stored preferences; validated public-only backend config, no provider/server keys packaged. Public flag is explicitly VITE_PUSH_ENABLED=false.

## Deployment and preservation evidence

Pixel11ProXL serial67080DLDV005JQ freshly inspected. Installed using adb install -r without uninstall/data clearing. Installed APK read back and hash matched; launch Status:ok. App-private storage byte-identical immediately before/after install and before launch. Private backups remain ignored; never stage/upload them. pixel-install.json / pixel-launch.txt / pixel-installed.apk are under artifacts/sw048. Screenshot was black/display unavailable, so no visual/touch acceptance claim.

Supabase ezgawsdmvuoqrxlfbgen: game-room now ACTIVE v11, downloaded canonical source matched qualified source, unsigned POST401. live-commentary remains ACTIVE v10. No schema migration, notification worker, provider request or browser publication. Full room/game/profile-settings fingerprints and account counts matched before/after:4rooms,15archived games,4accounts. Existing completed tournament6778d2b7-eac5-4efa-bf2b-082af5083ae9 remains12/12,revision359,both original UUID memberships intact. Evidence server-before.json/server-after.json/server-verification.json.

## Rollback and remaining acceptance

Pixel rollback: artifacts/sw048/pixel-before.apk with install -r, retain app storage. Server rollback source: artifacts/sw048/server-before/supabase/functions/game-room/index.ts; deploy to the same project as game-room with verify_jwt=false (the function validates Auth UUID itself); record readback/401 and preservation again. No schema reversal or game/settings reset.

Owner should check scratch marks, final-game notice, results/celebration and two-phone scoring. Physical feel and screen-reader acceptance remain open. Web/Safari still has its previous UI bundle; shared hosted authority uses v11. iOS install and push remain deferred. Evidence/status updates after qualification are documentation-only.
