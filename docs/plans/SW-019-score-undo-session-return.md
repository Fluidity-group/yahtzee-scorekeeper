# SW-019 score undo and visual saved-session return

14 October2026. Product owner: user; engineer/development reviewer: Codex. Bug-investigation/product-change workflows. State: implemented/qualified; matching backend, web and Pixel update deployed and installation verified. Physical gameplay acceptance remains open. Baseline SW-018 deployed582-test candidate, existing dirty checkout preserved. User requests latest mistaken Standard score undo, easy midgame guest return, clearer graphical saved-game/tournament status, and detailed fresh-chat handover once coded/qualified.

## Contracts and acceptance

- Manual Standard Undo last score before another meaningful game action: reopen category, restore original player's turn, reverse only attached score bonus, retain originals plus undo audit. Empty manual automatic turn-start can be discarded from projection; no rewind of another player's played turn. Own corrections remain possible; correction to undone score rejected. Older completed games/rematch IDs remain isolated.
- Hosted authority: member owns original score, exact current game/room revision; persistent archive update/receipt transaction; completed-game undo invalidates rematch approvals and restores tournament playing state when appropriate. Paused tournaments require resume before undo.
- Both players choose Resume from same signed-in account, reopen same code/UUID roster/currentturn after3–4 categories. No newroom/hostpromotion/autoresume. Stable QR/link remains accessible duringactive/paused play as alternative rejoin.
- Graphical saved-session hub: labelled Open/Completed views, game/tournament badges, paused/in-progress/between/waiting/completed text+colour, roster, progress, host/guest and currentturn cues. No active hidden score leakage. Member-only paginated query; older open sessions remain discoverable.
- After implementation/qualification write docs/handovers/2026-10-14-manual-multiplayer-tournaments.md covering exact code/contracts/deployed identities, user acceptance, pending scope, safe next steps and no secret values.

Expert core, UI and session-card work in separate isolated worktrees; root owns server/DB/client/integration/records. Latest-score boundary is stated to user, matches accidental-entry scenario; arbitrary historical turn rollback remains excluded. Camera/AI/BLE and Competition2 chain changes excluded from Undo scope.

Evidence/rollout/physical gates pending. Prior standing Pixel/matching-backend/web update authorization remains available when qualified and freshly inspected; no live mutation claimed by this record.

## SW-019 completion evidence

Implemented and qualified: 624 tests/76 files, all configured builds and unchanged software source passed (artifacts/engineering/2026-10-14T17-45-26-816Z-9ae29f37/report.json), 24 isolated PostgreSQL checks passed. UI/transport tests verify Undo eligibility/own seat/racing action, partial guest return/auth destination/pagination/expired member invitation/stable QR. Built local UI exercised accidental Yahtzee50 → Undo → FullHouse25 and reload persistence/quiet celebrations. Manual Standard only; original audit and excluded turns preserved, future chronology must exclude undone entries in projections.

Backend deployed with fresh readback SHA matching; web publication commit92cf4891fb8c9b8970b3e20db711b7c03107f08e and five public assets byte-matched. Android built and five native assets matched; Pixel fresh inventory had no devices, installation pending. No live player score/roster/credential changes or data clearing. No schema migration. Existing browser retained older entry during refresh; existing PWA update activation and actual signed-in sessions PostgREST/phone journey acceptance remain open. Fresh local preview loaded correct candidate.

Detailed fresh-chat handover created docs/handovers/2026-10-14-manual-multiplayer-tournaments.md. Release/rollback identities in docs/releases/SW-019-2026-10-14-undo-session-return.md. Not independently reviewed/commercially approved; no new physical acceptance.



14 October SW-019 Pixel follow-up: user confirmed wireless update readiness. Fresh mDNS discovery connected Pixel11 Pro XL; installed predecessor hash matched SW018. Data-preserving install-r succeeded; installed SW019 APK SHA25653ac027ee2f7e5aa8be805dc5ef104af61557810544861978383db93da800b36 matched qualified candidate; MainActivity launcher Status ok. No app clearing. Backend/web already matched. Actual two-phone Undo/partial-tournament return acceptance remains open.



14 October: detailed fresh-chat manual multiplayer/tournament handover finalized after verified SW019 Pixel installation. Includes code map, account/rules/Undo/rejoin contracts, exact deployed identities, tests/rollback, browser-cache acceptance item, two-device checklist and remaining analytics/invitation scope. Entry: docs/handovers/2026-10-14-manual-multiplayer-tournaments.md.
