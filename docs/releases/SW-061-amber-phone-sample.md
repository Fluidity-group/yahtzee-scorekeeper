# SW-061: Amber UI sample and handoff

24 October 2026. Owner: Amber/Dan. Engineer: Codex self-review.
Latest user scope supersedes main/native deployment: keep Amber's version separate for a sample game, then promote or hand to Dan after acceptance. Do not overwrite the dirty root checkout or change main/master. Existing installed native apps remain unchanged.

## Candidate and included changes

Branch codex/amber-ui-lab from recorded phone baseline1283973/runtime0bc8ca0. Includes SW054–060: YAHTZ branding, persona/venue/settings ribbon, mobile setup and scoring readability, trophy statistics, Razzie and personal records. Final chooser now uses bright physical reel drums, a pink/gold cabinet and a slow6s marquee chase, static under reduced motion. Four choices remain explicit direct actions. Sound remains opt-in; no flashing strobe, random mode selection or new gamble mechanic.

Pending redesign phases remain excluded: server-authoritative synchronized special events/shared tournament venue and generated/account-synced photo portraits. Their unresolved contracts are in SW056; this sample does not pretend they are complete.

## Test target and data boundary

Separate LAN source preview http://192.168.1.148:8476/ for Safari/Chrome on the same Wi-Fi. Uses the validated public-only SW052 phone backend configuration via an ignored local file. Existing backend/account membership and rules unchanged. No provider secrets, paid voice proxy, service worker, push worker or fictional Home fixture injected. Secure UUID fallback precedes dependencies for HTTP LAN contexts. Private artifacts and env files denied by server.

This is a new browser origin with separate local storage from native apps. Sign into the same existing account; existing tournament membership stays on the backend. Users may deliberately create a separate sample table or return to the existing tournament. Actual accepted game commands save real progress; Codex has not joined/scored/advanced/reset any live table automatically. This is a sample UI, not an isolated fake backend.

## Verification and current limits

44 focused checks passed, covering Home/profile/setup, multiplayer, hosted tournament/rematch and saved-session flows. Separate preview bundle built. Full clean-source Node24 gate passed at ba70d2f:1,186 tests passed/13 optional camera skips, all configured builds and source stability. Evidence artifacts/engineering/2026-10-24T15-50-08-766Z-903bf6a8/report.json. HTTP check passed (including private-file denial); two preview regressions passed. Source/DOM tests are automated development evidence, not full visual acceptance.

Fresh native inventory: Android adb sees no device. Prior Mac192.168.1.184 SSH timed out; known mDNS name did not resolve. Desktop visual inspection approval timed out; no raw browser automation workaround used. No new app was installed, and no two-phone physical game/geometry acceptance claimed. User chose browser sample instead of waiting for native rollout.

## Promotion, handoff and rollback

Push source only to codex/amber-ui-lab after checks, leaving default master untouched. Dan can review the branch and SW054–060 plans; preview/README.md records startup and configuration requirements. Never copy ignored credentials, raw artifacts or node_modules. The unchanged native apps are the fallback. Stop the PID in artifacts/phone-preview/server.pid to stop the source preview; a later source rollback uses an identified Git revision and does not clear local storage or rewrite cloud history. Phone visual/touch test, sample game and owner approval remain required before main promotion/native release.

Preview-path repair: initial HTTP check correctly caught403 caused by a deny/watch glob matching the checkout's artifacts ancestor. Scoped patterns to this checkout's own artifacts output, restarted only the identified preview process, and verified index/entry/client/CSS200, real public backend configuration, no fictional fixture injection and private output403. Two preview tests include resolved Vite file-policy checks; preview build passed. Final clean-source gate passed as recorded above. Application/preview source unchanged afterward; completion records only.

## Trophy charm/readability follow-up — 24 October

Reviewed the supplied earlier screenshot and current source/served modules. Added an original neon medallion treatment around the existing trophy SVG, compact side-by-side badge/count layout and larger honour labels. Counting explanation is expandable to reduce initial clutter. Trophy-panel Close stays sticky during long stats scrolling; Escape and final Back remain existing actions. Preserved accurate values, sample labels, theme tokens, no new audio/flashing effects and reduced-motion behavior.7 focused Home/account/navigation checks, both lab/phone-preview builds and HTTP scripts/styles/private-file checks passed. This is a scoped visual follow-up after the ba70d2f full gate; no new full-gate claim. Actual browser screenshot/touch/geometry remains unverified because desktop inspection approval previously timed out. Existing tournament data/authority unchanged; review branch only.

Setup navigation follow-up: replaced setup header's house symbol with visible ← Home and accessible Back to Home label, reusing existing data-action/home route and44px touch target.3 focused setup/Home integration checks passed, including back-before-start with no save and scored-game Home/Resume preservation; phone-preview build and HTTP passed. No game-reset/history command added. Scoped follow-up; actual phone touch acceptance pending.

Scorecard-label readability follow-up: category names now add3px to the selected size preset, use750weight and full theme text color; light mode is deep navy rather than muted grey. Upper indicators enlarged70x22 to76x24, heavier/darker delta text; light-mode positive markers use deep teal and stars dark gold instead of pale blue/yellow. Summary metadata and score values unchanged; labels wrap within existing columns.27 focused scorecard/bonus/display checks passed, phone-preview build and HTTP passed. Scoped UI follow-up; real phone geometry and owner readability acceptance still open.

Upper-category surplus glow: steady subtle halo on label/indicator only when the existing upper-pace-delta is strictly positive (four/five matching dice above three-of-each benchmark). On-pace, below, open and scratched remain unlit. Dark theme uses soft gold; light theme subtle teal with dark text preserved. No animation; forced-colors disables decorative shadow.18 existing bonus/scorecard/display checks, phone-preview build and HTTP passed. Rules/recorded scores unchanged; visual phone acceptance pending.

SW063 independent review follow-up: two P2 findings fixed and independently rechecked (26focused tests); no extra source/endpoint defect established in that bounded audit. Endpoint inventory and limits in docs/plans/SW-063-independent-review-report.md. Public-only probes confirm reachability/auth rejection, not authenticated room/realtime or deployed-byte acceptance. No Supabase code/schema/RLS/migration deployed. Six project skills, current handover and root/active memory routing synchronized; final post-fix qualification recorded in SW063 plan. Future native rollout remains owner-led: Dan Pixel from ROG, then Amber Mac/Xcode instructions.

Final SW063 qualified application source a73676b: clean Node24 gate1,191passed/13optional camera skips/all configured builds/source stable, artifacts/engineering/2026-10-24T16-11-57-202Z-b531a766/report.json. Both final sample builds and HTTP/HMR passed. Independent agent confirmed both P2 fixes; endpoint inventory and live-test limits recorded. Application source unchanged after that gate. Owner-led rollout guide docs/handovers/2026-10-24-native-owner-rollout.md; no install or DB/backend deployment claimed.

Subsequent owner authorization superseded the earlier sample-only rollout boundary: SW064 records the Pixel updated/launch verified on24October2026, source a73676b. iPhone remains pending; main/backend/database untouched. Earlier no-install statements above describe the original sample stage.
