# SW-037: clear all test games for a fresh start

15 October 2026. Owner explicitly requests deleting all recorded test games. Data maintenance only; accounts, player details, global commentary defaults and provider usage accounting retained. No application/source/provider change or paid diagnostic generation. Existing game-preservation direction is superseded for these test records by this request.

## Scope and execution

Inspect live public schema/FKs/counts and Pixel app origin/storage names before deletion. Initial inventory17rooms/19archivedgames/54commandreceipts/7localcommentarymirrors/67jobs/44outboxevents;4Auth accounts. Game-linked captions/exposures/feedback/memory and per-table settings/limits are part of the reset. Retain player profiles/version tombstones/sharing and attempts/budgets/dedupe accounting; reset must not refund administered usage.

On Pixel, selectively clear `games` in `yahtzeeClubhouse` and `games`/`entries` in `yahtzeeDB`; preserve player stores, Auth, names, theme and saved commentary/player defaults. Clear recovery journals, mirror mappings, pending local commands, per-game commentary flags, last room pointer and old timing history. Stop native audio, then force-stop old app runtime before cloud cleanup so old in-memory games cannot save back. Never use whole-app clear-data.

Cloud delete occurs in one locked transaction in FK-safe order, with account/profile/accounting hash assertions and zero game/history verification. Advance commentary scope versions to invalidate every warm snapshot. Old invitations cease to resolve. No score exports/backups are created by this requested deletion; existing ignored engineering evidence is separate from app records.

## Evidence and remaining gates

Root ignored `artifacts/sw037-reset` contains schema/count inspection, selective storage operation and preserved-field verification. Pixel hardware67080DLDV005JQ freshly verified. Deleted19local clubhouse games; legacy games/entries were already0. Cleared21game-linked keys; preserved Auth/name/theme/commentary defaults/player drafts and untouched legacy player stores. Initial immediate force-stop left some localStorage session keys on restart; foreground cleanup plus8second storage-flush interval resolved this. Final post-restart verification: games0 in both databases, entries0, game-linked keys0, sign-in/default/profile storage present. No whole-app clear-data or APK change. `pixel-after-restart.json` and `pixel-key-cleanup.json` retain actual verification.

Cloud deletion was NOT executed. Automatic approval review rejected `node artifacts/sw037-reset/reset-cloud.mjs`: it considered irreversible shared rooms/history/commentary cleanup broader than the user's old-game wording and requires explicit approval for that full scope. Do not bypass this rejection. Read-only after-check confirms17rooms/19games/54receipts/4accounts remain. `cloud-unchanged.json` records these counts. The reviewable prepared transaction preserves accounts/profiles/accounting and advances snapshot versions, but requires the owner's explicit full-scope approval before execution. No cloud reset or successful transaction is claimed.

No software engineering test/build required for a data-only operation; actual transactional/storage assertions and post-restart empty state are the acceptance method. Other disconnected browsers/phones may retain private offline games; only the connected Pixel and this project's shared cloud records can be directly verified here. Local reset complete, cloud reset pending owner approval after automatic-review rejection.
