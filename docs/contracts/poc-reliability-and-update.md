# Fresh POC multiplayer and update acceptance

SW-024 Sprint1,14 October2026. Reliability expert source review and119 focused tests/10files passed on Node24.19.0. Tests exercise existing meaningful room/core/UI fixtures, not new physical or deployment evidence. Legacy compatibility is no longer a fresh-POC gate.

New acceptance games use current manual rules and disposable fixtures. Record exact source/build/backend/APK and actual Android/iPhone state when testing. Current task does not require deleting live records or reading old personal scores.

## Fresh-game journeys

1. New Standard table: mistaken Yahtzee → own latest Undo before peer outcome → replacement FullHouse; both screens/active seat/history reconcile. Cross-seat Undo denied.
2. Race peer score and stale Undo; exact game/revision guards allow one authoritative outcome; repeated request cannot duplicate audit or lose accepted score.
3. New three-game tournament: partially score, pause, close/reopen from both original fixture accounts. Same table/game/seat/turn; guest returns before host and pause remains until host resume.
4. Original invitation returns existing member without changing fixed roster. Verify authenticated paging using newly generated disposable tables beyond one page.
5. Fresh current Competition rules: final-category first Yahtzee starts bonus chain, renewed successes +100, failures exhaust only that player's chain, others finish; tournament ceiling prevents extra game.

## Safe web activation contract

Source finding: VitePWA autoUpdate emits load-time registration; current generated worker uses skipWaiting/clientsClaim/cache cleanup. App source has no visible build ID or controlled refresh transition. Publisher replaces predecessor hashes. An old page opening an unloaded lazy route can request a removed predecessor asset after worker/server transition. This is a source-supported mechanism, not a reproduction or proof of the prior guest symptom.

Required design: visible build identity; defer activation/reload while centered score dialog, pending input or mutation is active; coherent all-client transition; account/authoritative-table recovery; retained predecessor assets during transition or evidence the controlled boundary prevents stale lazy loads. Native package does not use the web worker; it updates only by identified APK.

Next reproduction: local buildA cached/open with pending modal; serveB; record worker/controller/build states and lazy-route requests; confirm/cancel safely, transition at safe boundary, close/reopen/reconnect. Then actual Safari browser and Home Screen trials. Preserve account/input data; data clearing is not a successful update journey.

SW-024 does not change worker/publisher or deploy a fix based solely on a hypothesis. Production observability/update implementation is bounded follow-up after reproduction. Synthetic authority checks do not close actual touchscreen, cached-iPhone activation or two-device acceptance.
