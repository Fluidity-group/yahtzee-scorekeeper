# SW-039 tournament usability: review candidate

16 October 2026. Owner approved sprint implementation with "Yes continue" following the SW039 proposal. Implemented in isolated branch `codex/sw039-tournament-usability`, baseline43f16a7, under `C:/Codex/Yahtzee Game/artifacts/sw039/source`. Original root edits preserved. New clubhouse visual direction remains on hold.

## Delivered behavior

- Finished tournament readiness is immediately below the result heading, ahead of final scores, highlights and standings. Final/paused/offline/guest restrictions retained.
- Tournament context is compact; role-aware actions open a themed native HTML dialog drawer. Remote redraw closes stale action menus. Original command handlers/authority unchanged.
- Device-only Compact/Comfortable/Large text setting, available via Aa on scorecard or main menu. Named opponents use their full comparison column; player names wrap; row/rail navigation remains aligned. Player headings stay visible during normal scorecard scrolling.
- Upper/lower boundaries, upper subtotal with bonus, lower subtotal and grand total. Both players have progress toward63, points needed, benchmark pace and factual secured/possible/unreachable states. Aggregates remain hidden in hidden-total games. No probabilities, scoring-rule changes or commentary generation changes.

## Qualification and candidate identities

Node24.19.0; existing lock-matched dependency installations reused through junctions. Initial precommit development gate:1,084tests passed,13optionalcamera skips, all configured web/native/commentary/room builds. Stable source identity before/after `ad5c25c7d9110ebb75fbdabc0c4ee701c7c9d68b27675a25ff7458d28c810950`; detailed report `artifacts/engineering/2026-10-16T20-48-55-906Z-16d07383/report.json` inside the isolated checkout. Committed-source audit/evidence is recorded separately in root `artifacts/sw039/manifest.json` when complete; do not infer release promotion from a dirty checkpoint.

JDK21/Gradle8.14.3 offline debug APK built successfully;7,526,992bytes, SHA256 `c9621a2ac40463e309dee6cc46416cb9f8191bd5595006e1575191b87cb4f75e`. Candidate root `artifacts/sw039/dice-clubhouse-sw039-debug.apk`. Web ZIP `artifacts/sw039/sw039-web.zip`, SHA256 `fa80bc50c845717d8074de761f1276dc0252d2c41400689d09f7cd5c05027599`. All38dist-native files matched APK assets/public entries byte-for-byte. Private credential-pattern scan zero matches. Public build fields loaded into process from existing ignored configuration; provider/service-role secrets were not copied. Capacitor-generated junction-specific paths restored to portable baseline after sync; native code and dependency versions unchanged.

Shared generated backend files differ only because upperBonus now uses exported constants63/35; pure behavior unchanged and no backend deployment is needed for these UI changes. No migration or provider request. Build warnings remain existing mixed static/dynamic import, canvas-in-jsdom and Android dependency/tooling warnings; builds passed.

## Browser evidence

Source-backed synthetic tournament harness at `http://127.0.0.1:8493/artifacts/review/`; actual app at port8493 tested separately with local fixture games. No cloud games/accounts created. Harness is ignored development evidence, not part of publication.

-320/360/390/430px, all3sizes: no page-wide overflow or progress-content horizontal clipping. Category fonts14.4/16/18CSSpx. At320px own column100.6px, opponent72.6px; at390px125.8/90.8px, using available comparison width.
-390px source-baseline tournament region183px versus73.3px new region: about110px recovered. New upper/lower structure adds meaningful content; do not equate recovered header pixels with a guaranteed count of additional rows at all font sizes.
- Ready control top323.6px/bottom371.6px at390×844, before statistics. Actual roster may wrap with longer names.
- Real UI scoring: Keith Aces3 accepted, Amber becomes active and Keith's peer score3 remains read-only. Centered count dialog at390×844:352×292.2px, top275.9px. Large setting persisted after reload/resume. Escape closed settings and restored Aa focus.
- Eight-player peer navigation offsets headings, scores and bonus facts together. Hidden fixture renders no progress elements; final tournament has no readiness action. Landscape844×390 has no page overflow; action drawer380×390 with access to all actions. Final inspected fixture warning/error buffer empty after successful UI cases; a temporary harness-only syntax error during fixture editing was corrected and final views reloaded.

Root `artifacts/sw039` contains baseline, scorecard, results, bonus-progress and menu screenshots, manifest and qualification logs. Screenshot labels explicitly identify synthetic review data. Browser emulation is not actual iPhone Safari, Pixel touch/audio or native Back acceptance.

## Remaining release and owner gates

Not installed on Pixel; not published to the live web. Owner reviews candidate, then gives task-specific deployment authorization as scoped in the approved plan. Before deployment freshly identify device/installed APK and hosted web baseline, preserve accounts/games/settings and capture rollback artifacts. Verify installed APK hash, cached Safari update activation without clearing data, menu Back/focus/touch, larger system text and full two-phone tournament flow. Device compatibility and actual owner usability remain open.

Rollback: retain current installed APK and web revision before any authorized update. Reinstall previous APK with data-preserving install-r and restore prior web artifact; no schema rollback or data clearing. Older app ignores the new nonsecret text-size preference. Self-review and automated tests do not establish independent review or commercial acceptance.
