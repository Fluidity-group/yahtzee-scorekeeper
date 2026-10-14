# SW-026: accepted commentary transactional outbox and server-clock lease contract

14 October 2026. Owner: product owner; coordinating integrator: lead Codex; implementation lane: tooling expert. Reviewer: lead review pending.
State: pure mapper and lease helper implemented; focused checks verified; database/room/native integration proposed, not deployed or physically accepted. SW G2 preparation only.
Baseline: tooling writer-authority commit 9c099e77a4fad8d2344e7d6b30a03a6340d7bd82. Read current governance, product-change/live-commentary skills, handover, room handler/Supabase adapter, actual room/core/rematch/tournament contracts and lead opening-facts/service modules. Historical status/memory in this isolated baseline is not current deployment evidence. Parent owns integration status/project-record updates.

## Purpose and requirements

Prevent commentary gaps/replays when a process crashes between accepting a game command and creating its commentary job. Keep score authority in accepted versioned game rules and UUID seat ownership. Capture facts at acceptance, not reconstruct old totals from later hydration. Keep Undo/correction quiet and revoke dependent queued/current claims. Serve complete jokes under administered budgets; do not cut punchlines to save tokens. Protect host playback when phone wall clock is wrong.

| Requirement | Observable criterion | Verification | Actual state |
|---|---|---|---|
| O1 | Real score transition emits exactly one named, frozen, UUID-owned fact packet | Real createRoom/startRoom/playRoom fixtures | 17 focused tests pass across O1-O5 |
| O2 | Receipt replay/read/hydration/partial-ready/repeated-resume emits no new moment | Actual room and tournament transitions | Pure checks verified |
| O3 | Undo/correction emits accepted target invalidation only | Actual own-score correction and Undo | Pure checks verified |
| O4 | Opening/return/next-game only follows distinct host/all-ready accepted transition | Shared lifecycle builder injection and actual room/rematch rules | Mapper verified; root openingFacts composition still needed |
| O5 | Wrong clock/late response cannot extend a client lease | Pure monotonic timing tests | Helper verified; clients/server projection not wired |
| O6 | Room, receipt, invalidation and outbox are one transaction | DB failure/concurrency integration | Motion/lead integration open |

## APIs and file ownership

`server/commentary/accepted-outbox.js`: `acceptedOutbox({before,after,actorId,commandId,operation,acceptedAt,openingFacts,priorGame})` returns deeply frozen rows. Trusted server composition only, never callable with client-supplied snapshots/facts. UUID actor must be confirmed by authentication and member checks before invocation. `openingFacts` is the root shared pure function, not a new duplicate implementation; priorGame must already have history permissions checked for every current listener. Mapper itself does not grant history access.

Rows: schemaVersion, deterministic idempotencyKey (JSON tuple room/game/command/kind/purpose), roomId, gameId, commandId, actorId, expectedRoomRevision, acceptedRoomRevision, acceptedAt, kind (`moment` or `invalidate`), purpose, audience UUIDs, facts or null, invalidates [{eventId,targetEventId,reason}], dispatch `after-transaction-commit-only`.

Score uses `acceptedFacts` and actual rules/sheets; retains frozen aliases and hidden-total disclosure. Known automatic room next-turn helper is excluded only from the event-prefix view used to capture accepted facts; authoritative snapshot/game is never changed. One scored/bonus/chain moment per command, not one per helper event. UUIDs plus exact revisions/roster/event-prefix guard unsafe preparation. Corrections/Undo target accepted own score; invalidation cancels that event and any facts whose scoreDependencies include it. All invalidations preserve actual prior exposure, while suppressing stale captions/feedback eligibility according to existing policy.

`server/commentary/lease-clock.js`: `projectLeaseClock(lease,serverNowMs)` and `conservativeLeaseDeadline(projection,{sentAt,receivedAt,safetyMs=250,maxLeaseMs=15000})`. Server returns epoch/expiresAt/serverNowMs/remainingMs from one authoritative transaction-clock sample. Client records monotonic sentAt BEFORE request and receivedAt after response, then deadline = sentAt + remainingMs - safetyMs. This deducts the entire round trip, rather than extending a lease by response latency. No client Date.now comparison. Expired/overlong/inconsistent projections reject. The 250ms margin is an engineering default proposal, not a measured hardware acceptance threshold; lead may select a reviewed margin. Playback server still fences every claim/chunk/receipt by UUID/device/epoch/database expiry. Client deadlines only stop early; they never grant ownership.

## Durable wiring contract

Current room handler computes next under authenticated game-rule/seat/revision checks then calls store.commit. Supabase adapter calls clubhouse_commit_game with room-state CAS/actor/optional receipt. Existing commit RPC owns room-row locking, membership/identity invariants, history and receipts; it has NO commentary outbox parameter/table/worker. Existing service enqueue is a later independent in-memory transaction, and therefore is not durable acceptance integration.

Lead/motion wiring must extend the SAME committed room transaction: lock original room; verify authenticated actor, exact revision and command fingerprint; persist next room/history/receipt plus deduplicated outbox rows and correction cancellations. Unique moment key prevents duplicate jobs; a duplicate receipt returns prior acceptance without new outbox. A conflict/failure rolls back everything, including rows. A worker cannot see uncommitted rows. Wakeups are hints only; poll/recover committed pending rows after restart. Never dispatch paid providers during the room transaction.

RPC must recompute/check row room/game/revision/actor/command against locked state. Client cannot submit arbitrary facts/profile/provider/aliases/history. Trusted mapper preparation is not a security substitute for SQL authority. Worker uses current settings/profile version and personal consent, reserves durable administered budgets BEFORE provider dispatch, records every attempt including failure/timeout, and validates game/Undo/pause/current profile before exposing captions/audio. Claim/lease and budget reservation race tests belong to durable-store lane. Do not use in-memory rehearsal service as a paid-provider enablement switch.

Start currently has no durable public command receipt/commandId in handler. Lead must supply a bounded server-generated accepted start identity or expand the authenticated start command/receipt contract before opening is crash-safe; client hydration may not manufacture greetings. Resume uses durable command receipt and real paused-to-playing test. Read/list/rejoin is quiet. Last-ready may be a non-host member, accepted by actual rematch rules; only its replacement-game transition emits next-game. Enabling commentary on an already active table needs a distinct accepted settings/lifecycle identity in the same durable settings transaction, not a fabricated room revision (not implemented here).

Lifecycle service gaps observed: current service enqueueAccepted and factsValid are score-only; openingFacts lifecycle packets need explicit lifecycle validity/cancellation rules. Target account for group greeting must be explicit or absent, not invented from a score seat. Worker freshness is purpose-aware; returning after a long pause needs a newly accepted return timestamp, not old start time. Authoritative previous-game winner is separate from tournament standings; no summary without authorized shared history.

Complete-line experience: writer output/stream caps are administered request bounds, not clipping instructions. A too-long/truncated/schema-invalid utterance is rejected intact; any rewrite is a new counted request only within separately approved policy. Empty remaining budget produces deliberate silence/caption policy, not half a joke. Persisted live request/token/character ceilings and approvals are outside this pure module; no provider calls or new paid allowance used.

## Risks, verification and remaining gates

R-O1 process crash can lose/repeat post-commit job: close with atomic DB outbox and restart tests. R-O2 device wall-clock skew can delay stopping: close with wired server projection/monotonic native timing, epoch fencing and measured physical stop test. R-O3 untrusted facts/history can leak or invent scores: close with SQL invariant checks, shared openingFacts composition and all-listener permission tests. R-O4 writer authority/personalization/profanity surface guards are not semantic proof: human review/current-game qualification remains open.

Focused tests use actual pure room/core/rematch/tournament commands; lifecycle builder is a deliberately injected contract stub, not a claim root lifecycle builder was integrated. Existing root openingFacts tests remain a separate lead check. No SQL, shared room/service/native edits, secret access, provider calls, device/live changes or POC acceptance.

Verification history: first run c8ccf3c6 passed705/13optional skips/builds but source consistency failed because validation was edited during the run. Frozen rerun7c82d33b passed705/13optional skips/allbuilds/source consistency. A subsequent final-chain-end priority refinement added one actual Competitionv2 regression (17focusedpass), so final gate will be repeated for the final manifest. No failures hidden or gates weakened.


Final frozen-source gate: artifacts/engineering/2026-10-14T21-24-52-303Z-22125ca5/report.json passed. Node24.19.0:706tests pass/13declared optionalcamera skips;78testfiles pass/1optionalfile skip; web/native/room builds pass; sourceChangedDuringRun false. Final semantic manifest: accepted-outbox.js, lease-clock.js, commentary-accepted-outbox.test.js and this plan. Generated room bundle has no semantic diff and is excluded from commit. Integration/currentroot suite, actualdatabase rollback/recovery and physical lease/stream listening remain lead gates.


## Monotonic lease timing integration lane

Baseline dependencies copied from lead f93763edd6310ca92c9b01e3014ce1d82f014281 into isolated tooling tree after proving local scoped diff empty; dependency commits9dfa9e9/059cc4e are not integration changes and must NOT be cherry-picked. Automatic review initially rejected broad baseline restore and then store refresh due ownership/overwrite risk; exact absence/clean-diff evidence and lead explicit authorization resolved it. Only new durable modules belong motion; unchanged rehearsal store is a dependency. Root owns Rachel voice/profile/UI changes, so unchanged service voice assertions and those files are excluded from returned timing manifest.

Implemented timing path: shared src/commentary/lease-clock.js (server helper re-exports); service acquire/heartbeat sample injected authoritative server clock once for lease checking/expiry/projection, with serverNowMs/remainingMs excluded from stored lease. Controller records monotonic sentAt before acquire/renew transport, validates projections strictly even in synthetic mode, deducts entire RTT plus margin, passes monotonicDeadline to native claim, and refuses claim/play after elapsed claim-response wait. A terminal event during an outstanding heartbeat fences that stale renewal. Native computes remaining duration from monotonicDeadline only, after stop/listener/token awaits, and rejects wall-clock-only claims. Native renewal uses same monotonic contract. Authentication/claims/captions/feedback/Forget authority unchanged; no source/player/provider secrets enter URLs.

Focused verification:117pass across7files, including unchanged25service/6handler/20feedback cases, original29controller and11native cases plus5controller/3native timing cases,17outbox/helper and1new one-sample service test. Lead controller/test diff versus f93763e was empty; supplied '39controller' count does not match that exact baseline, so no additional cases were silently excluded. Existing service-test voice assertions are not modified in returned patch; root current Rachel assertions remain untouched. Full isolated gate follows.

Remaining timing gates: current service remains process-memory rehearsal with injected now defaultDate.now on server. Durable composition must bind that clock to the transaction databaseNowMs, including validation and streaming checks, not mix DB and application-server wall clocks. Client/native use monotonic time, but JS-to-native bridge/scheduler delay and Android timeout must be measured on exact device; proposed250ms margin is not physical proof. Current controller lifecycle caption acceptance remains score-event-only; root outbox/lifecycle wiring stays separate. No deployment/provider/physical acceptance.

Timing final gate artifacts/engineering/2026-10-14T21-32-07-242Z-19cf9ae0/report.json:794tests pass/13declared optionalcamera skips;84testfiles pass/1optionalfile skip; allweb/native/roombuilds pass and sourceChangedDuringRun false. Isolated baseline imports are intentionally excluded from returned timing commit; integration lead must run current combinedroot suite. No provider calls/secret access/live state changes.

