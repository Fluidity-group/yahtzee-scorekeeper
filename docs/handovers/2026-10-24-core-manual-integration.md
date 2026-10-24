# Core manual-game integration — 24 October 2026

## Authoritative source and scope

SW066 supersedes the separate-sample-only routing in older handovers. Owner explicitly requested Amber's updates merged into the core and Codex to act as lead architect. Current integration checkout: `C:/Codex/Yahtzee Game/artifacts/sw066/source`, branch `codex/sw066-amber-core-integration`. The dirty root remains preserved; never replace its app files or reset it. Amber's `artifacts/sw054/source` remains the previous phone/sample source, not the destination for new core changes. Local master promoted to the verified integration. Remote master remains e599b71: automatic approval review rejected publication, pending explicit owner authorization. See SW066 and current status for exact evidence.

Priority: dependable manual scoring, local/shared-phone games, authenticated multiplayer and tournament continuity on Android and iOS. Owner explicitly defers camera and voice until manual core works. Existing historical regression suites may run without reactivating those features. Shared venues/synchronized special events/generated or account-synced portraits and push delivery remain deferred.

## Review and correction

Amber frozen revision `7cd7b6c`, native application baseline `a73676b`; main baseline `e599b71`. Full history merged in isolated integration commit `a34ebce` with an initially identical Amber tree. Independent expert UI agent found a P2 queued-dialog-close race that disabled replacement avatar/venue/sound panel listeners. Guard cleanup while a replacement dialog is open; openDialog already disposes the outgoing panel. New regression failed before fix and passed after; expert recheck: 30 tests / 8 files; initial review: 66 tests / 15 files. Core scoring/server contracts unchanged.

## Device evidence and next acceptance

Owner confirms Android and iOS versions are running. SW064/SW065 identify prior matching signed installs and account/tournament return. This does not confirm a full game, Undo/reconnect/background or the new SW066 fix installed. Do not reinstall solely because a new chat starts. New native compilation, signing, installation and physical acceptance each need current evidence; iOS prior Personal Team profile expires 28 October 2026.

Test manual scoring with the same existing accounts/table: own-seat edits only; accepted scores visible on both; Undo/corrections; Home/Resume without loss; background/reconnect; complete-game result/Ready/next-game behavior and corrected Personal Best/Razzie/trophy summaries. No live table command is authorized merely by reviewing code. Existing tables, frozen rules, seats and accounts must remain intact.

## Continuity

Read AGENTS, status, this handover and SW066 first. Project memory is durable intent, not installed-build evidence. Repository skill content is synchronized across root, Amber and integrated checkouts; global personal/plugin skills are separate. Future consequential changes update the authoritative checkout, then reconcile routing copies without overwriting old application code. No new database/backend/public deployment or device install is included in SW066.

## Final qualification

24 October SW066 completed locally: Amber history merged into core; independent expert found/fix-rechecked queued dialog-close navigation (30 tests/8 files). Clean Node24.19.0 gate at db094a4: 1,192 tests passed/13 optional camera skips/all configured builds/source stable. Evidence artifacts/engineering/2026-10-24T17-18-53-062Z-00d440ed/report.json. Android APK built and signature verified;46public assets match Android APK/synced iOS. iOS project/assets prepared, new Xcode signing/install pending. Owner confirms Android/iOS versions running; full manual played-game acceptance remains open. Camera/voice deferred until manual core works. Local master promoted; remote master remains e599b71. Automatic approval review rejected remote publishing (default-branch impact and unverified egress authorization); explicit owner publishing approval is required. No new device install/public/backend/database deployment or table command. Current source artifacts/sw066/source; skills/routing synchronized.

Qualified source SHA256 `73eeeaa54ffda37cf931ea5e2bbd27855410c84a09632a93570c7e934e673340`, clean/stable at db094a4. Subsequent completion records change documentation only; application source and packaged assets remain unchanged.
