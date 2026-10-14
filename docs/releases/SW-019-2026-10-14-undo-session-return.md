# SW-019 score undo and saved-session return rollout

14 October 2026. User-authorized continuation of manual multiplayer improvements and matching web/backend/Pixel updates. Source checkout preserved; no source branch push. No new database migration, permission or credential changes; no player-data edits during rollout.

Qualified source: Node24.19.0, branch codex/sw017-hosted-rematch, HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc, dirty source SHA256 514cca1a0525e147c8aa6861cd7c8363278c624927ba5ef479ce995aa3ed74cb. All 624 tests/76 files and web/native/backend builds passed; unchanged source. Evidence artifacts/engineering/2026-10-14T17-45-26-816Z-9ae29f37/report.json. Initial sandbox run failed resolving installed dependencies (EPERM); unsandboxed configured gate passed. Twenty-four isolated PostgreSQL checks passed including atomic Standard final-score Undo reopening a completed tournament and updating archived game/end time/standings.

Backend candidate SHA256 78713e106f2e53aff44c5d818597a03a07d9875de4ba535ae5fa474531ae2672. Prior SW018 source read freshly from dashboard, LF-normalized SHA256 67637dd6d23301d2f5a2736632f457b56d07dd519b82eb23ef89b45f18d24e8a; raw clipboard backup artifacts/sw019-undo-return/function-before.ts SHA256 6c0ae9540841571e51a3fa430f30a3e81f863a6a8e510a05b61bb09279d2d840. Exact candidate editor readback matched before deployment. Publication pending.

Fresh ADB inventory found no devices. Android install remains pending until Pixel reconnects. Previous installed release was SW018, not inferred to be still physically present. No app clearing. Previous gh-pages commit 69b13ed99419cb4142cbafd5044cb3c5784a5505 is rollback web baseline. Compatible SW018 backend/web/APK can be restored preserving deployed history/tournament schema. Never revert to pre-history writers or delete records to roll back.

Physical two-account next-day exit/restart/guest resume, actual signed-in PostgREST sessions paging, and own-score Undo acceptance remain open. Automated mocks and disposable database checks do not establish physical acceptance or independent commercial approval.

## Completed publication and package

Backend deployed; fresh reload LF-normalized source SHA256 78713e106f2e53aff44c5d818597a03a07d9875de4ba535ae5fa474531ae2672 matched qualified source. Screenshot artifacts/sw019-undo-return/backend-deployed.png. Existing gateway/security settings unchanged. No schema migration or live player-data mutation.

Web gh-pages commit92cf4891fb8c9b8970b3e20db711b7c03107f08e; public index SHA2562577b07023ec6be01053b6557c7ff243aed42e9e6c176e40eb6ca19f11b30338. Five web assets HTTP200/exact-byte matched (web-asset-readback.json); unsigned sessions operation401. Existing browser/PWA retained an older entry during refresh; cached-client activation acceptance remains open. Fresh local preview loaded current entry and verified synthetic Standard accidentalYahtzee50 → Undo → FullHouse25, originalturn/categoryrestored and replacement/reloadquietpersisted.

Android offline build successful,124tasks/27executed. Candidate artifacts/sw019-undo-return/android-test-candidate.apk SHA25653ac027ee2f7e5aa8be805dc5ef104af61557810544861978383db93da800b36. Five packaged assets matched qualified dist-native (apk-asset-check.json). Pixel installation still pending; no connected device at fresh inspection. No clear/uninstall/permissions change. Detailed fresh-chat handover docs/handovers/2026-10-14-manual-multiplayer-tournaments.md created with exact current state and next acceptance steps.

Scoped software source archive artifacts/sw019-undo-return/software-source.zip SHA2565a8d0e72d0dc48950c08d71a1344637d04c455e8efb9f8cee1699f6ee3c8d46b; explicit software source/config/test folders only, no env/secrets/ignored player data. Synthetic rendered session-card visual evidence saved-session-cards.png uses actual render module, labeled demo data; not signed-in physical acceptance.


14 October SW-019 Pixel follow-up: user confirmed wireless update readiness. Fresh mDNS discovery connected Pixel11 Pro XL; installed predecessor hash matched SW018. Data-preserving install-r succeeded; installed SW019 APK SHA25653ac027ee2f7e5aa8be805dc5ef104af61557810544861978383db93da800b36 matched qualified candidate; MainActivity launcher Status ok. No app clearing. Backend/web already matched. Actual two-phone Undo/partial-tournament return acceptance remains open.
