# SW-015: manual two-player Android/browser test readiness

13 October 2026. Owner: product owner; coordinator/reviewer: Codex (development review only). Scope: software readiness assessment and manual test preparation. No product code change, deployment, app install, account mutation or physical acceptance. Hosted testing blocked by current backend DNS; local manual scoring remains available.

## Purpose and baseline

Review Android host with a second player joining through a QR web invitation, using only manual category scoring. Exclude camera, recognition, Bluetooth dice and AI commentary testing. Preserve existing dirty master checkout, HEAD `e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc`.

Current entry is `src/bootstrap.js` -> `src/prototype.js`. Android packages this shared UI through Capacitor (`com.fluiditygroup.diceclubhouse.dev`, Dice Clubhouse Dev). `src/multiplayer/ui.js` owns sign-in, hosting, QR and joining; `client.js` and `connection.js` own authenticated transport, subscriptions/deadlines; `room.js`, `server/rooms/` and the generated Supabase function enforce membership, active seat, revision and idempotency. Pure rules are in `src/game/core.js` and `src/game/scoring.js`.

Local games use `src/core-store.js`; hosted games use room snapshots and Your online games. Local History is not an account-wide hosted history screen. Manual input records category values, not the five physical dice of every roll. Manual turn start is implicit when saving a category, followed by automatic turn advancement on server acceptance.

## Actual checks

| Requirement | Method | Actual result / state |
|---|---|---|
| Manual core scoring, totals, bonuses, corrections and storage | Node 24.19.0, focused Vitest suite below | 164 tests / 13 files passed, no skips; automated development evidence |
| Hosted authority, retry, auth adapter, QR UI and scorecard ownership | Same suite, mocked transport/storage and DOM | Passed within the 164 tests; not signed-in live acceptance |
| Public guest page | Read-only HTTPS GET and served entry/prototype chunk inspection | HTTP 200 at https://fluiditygroup-git.github.io/yahtzee-scorekeeper/; prototype contains Manual scoring, Roll insights and Host / join online. No exact source equivalence claimed |
| Multiplayer service availability | Read-only GET to configured `https://ezgawsdmvuoqrxlfbgen.supabase.co/functions/v1/game-room` | Hostname lookup failed ENOTFOUND, including outside sandbox |
| Independent DNS confirmation | Google DNS JSON and Cloudflare DNS JSON, A query | Both HTTP 200 with DNS Status 3 (NXDOMAIN). Cause/project state unknown; inspect Supabase dashboard next |
| Android installed identity and physical QR/game journey | Not executed | Open. Historical last recorded install is SW-013 on 3 October; SW-014 is built only. Current installed state unknown |
| Score analytics in hosted manual games | Source tracing | Live category scores/totals, winner/ties and per-game JSON export implemented. Cross-game charts/win rates/category averages remain wired to legacy `src/main.js` -> `src/ui/stats.js` -> legacy database, not current hosted rooms. Roll insights correctly has no dice-level data for category-only manual input |

Executed command: `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1 tests/core.test.js tests/core-store.test.js tests/rules.test.js tests/scoring.test.js tests/stats.test.js tests/rooms.test.js tests/room-supabase-adapter.test.js tests/multiplayer-client.test.js tests/multiplayer-connection.test.js tests/multiplayer-ui.dom.test.js tests/online-scorecard.dom.test.js tests/prototype-bonus.dom.test.js tests/native-build.test.js`.

Initial `npx` unavailable; direct Node test execution inside sandbox failed dependency realpath EPERM before collecting tests. Approved execution outside sandbox passed. No full engineering gate, fresh APK build or native Gradle tests run; native-build tests check configuration/source contract. Existing dependencies reused; camera tests/assets excluded from this assessment.

## Manual physical test checklist (pending)

Prerequisites: restored/reachable configured backend, two distinct confirmed game accounts with passwords, Android app and second phone browser with internet. QR joins do not provide anonymous seats. Verify the actual installed/build configuration before any authorized update. Do not infer current service/device state from 3 October deployment records.

1. Android: Menu -> Host / join online -> sign in -> Host a game. Choose Standard, Manual scoring, visible totals and host name. Create room; use exactly two players.
2. Second phone: scan QR with its normal camera, open web link, sign in as the other account, enter a distinct player name and join. Confirm names and mode on both devices before host starts. If scanning fails, try Copy invitation link or room code separately.
3. Host starts. Verify both scorecards match and only the active player can add a score. In this implementation tap + in a category; no separate manual Start my turn step is required.
4. Alternate entries: upper category count (e.g. four twos = 8), X/zero, fixed category (full house = 25), and keypad category (chance = 22). Check each value, totals and next player on both devices. Cancel an entry and verify no save/turn change. Check duplicate tapping does not record twice.
5. Tap a recorded own score to correct it (four twos -> three twos = 6). Check both totals update without moving the turn. Verify the other player's recorded scores remain read-only.
6. Exercise upper bonus threshold (63 gives +35), initial Yahtzee, additional Standard Yahtzee/Joker placement and zeroed initial Yahtzee. Use a separate room for scripted rule cases if needed. Competition/Accumulative modes are follow-on tests, with distinct extra-turn/weighted rules.
7. Background/return on Android; reload guest browser; briefly disconnect/reconnect one device. Verify no lost or duplicate scores and correct active seat. Resume using Host / join online -> Your online games or existing invitation as an existing member. Repeat with mobile data on one phone.
8. Complete all 13 categories for both players. Verify totals/winner (and a separate scripted tie), then run another game with hidden totals and confirm final reveal. Export while the hosted game is open and inspect scores/correction events; Android download/export behavior remains a physical check.
9. Open Roll insights: expect zero recorded dice rolls for manual category-only input. Do not count missing roll data as failed combinations. Hosted cross-game score analytics cannot be accepted from this UI because it is not integrated.

Record actual app identity, devices/browser versions, room mode, expected/actual values and failures. Keep credentials and private room exports out of Git. Tests above are prepared, not physically passed.

## Completion and remaining gates

13 October physical-lobby follow-up: user supplied host screenshot showing one player after guest reports joining. Fresh read-only Supabase Table Editor inspection shows the screenshot's room has only the host account in member_ids, while the guest account is present in other rooms. The screenshot is consistent with saved membership, not evidence that the Android client missed this guest in this room. Recommend guest join the exact current screenshot code/invitation and verify both rosters before start. No APK update, database/room mutation or software fix performed; no automatic refresh defect reproduced. Private room/account identifiers not retained here.

13 October follow-up, requested by user: hostname now resolves through both Google and Cloudflare (DNS Status0, A records 172.64.149.246 and104.18.38.10). Endpoint GET responds405 with Use POST; unsigned POST `{operation:"list"}` responds401 with Sign in to join a game. Earlier DNS blocker is superseded by this fresh evidence. GET `?health=1` also returned405, so no dedicated health success claimed. Cause of transient DNS failure unknown. Public reachability/auth rejection confirmed; authenticated host/join/scoring and physical testing remain open. No live room mutation, deployment or app update.

Code familiarity, focused development verification and manual-only test plan complete. Backend availability, two-account sign-in/QR/full-game/recovery, installed Android identity and hosted score analytics integration remain open. Next action is read-only inspection of the Supabase project to identify why the configured hostname no longer resolves, then decide any required restoration/configuration/deployment with task-specific authorization. No database reset, account creation or deployment performed. This review grants no physical/G3/commercial acceptance.
