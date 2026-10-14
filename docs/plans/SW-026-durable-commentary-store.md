# SW-026 durable commentary store and disposable database qualification

14 October 2026. Owner: product owner; coordinator: Codex lead; implementation/review evidence: native/memory expert lane. State: implemented and disposable-DB verified, not integrated/deployed/physically accepted. SW G2 development evidence only; no independent review or POC acceptance inferred.

## Purpose and requirements

Persist fresh-POC commentary jobs, fenced leases, attempts/consumption, personal profile CAS tombstones and 90-day history without provider I/O in scoring or DB transactions. Preserve unknown submitted attempts after restart; usage needs an explicit administered ceiling/expiry, never an unlimited allowance. Keep Auth/account authority and existing game scores separate. No live migration, hosted access, provider generation or device changes in this lane.

## Design and actual evidence

NEW migration 202610140005_commentary_durable_state.sql stores per-collection/key JSON rows under a versioned scope. Row lock plus expected-version CAS applies only changed items, keeping independent processes from losing each other's changes. Accounting/dedupe/lease/profile-tombstone rows cannot disappear through normal state commits. New attempts must be submitted, link a job and atomically reserve matching consumed requests/characters. Counters cannot reset; completed/unknown attempts cannot become submitted again. Explicit expiring DB allowance rows default to no paid allowance. Administration RPC is service-role only and has no user route.

DurableCommentaryStore exposes async initialize/refresh/transaction/expire/forget and a synchronous cached snapshot. Every transaction reads the current DB state; callbacks are synchronous, provider-free and may rerun on CAS contention (max five by default). Result is returned only after its state commits. Database timestamp is exposed to callbacks as second argument and installed before callback evaluation. Backend RPC transport uses injected service credentials, fixed operation paths and sanitized errors; no key loading at import or browser credential.

Actual verification: seven Vitest4.1.11 adapter tests and seventeen disposable PostgreSQL16 checks passed. Test image cached timescale/timescaledb:2.29.2-pg16 SHA256289d55704b1b3ee8263cd3805c6930f9cd54506835a8f19f9b85dad17d5c5a8a; --pull never, --network none, tmpfs DB data, no host ports. Container stopped/removed. Evidence artifacts/commentary-durable/report.json records exact migration hash and check results. Test runner scripts/test-commentary-durable-db.mjs.

DB checks cover rerunnable migration, denied anonymous/authenticated reads/writes/RPC/allowances, service direct-write denial, independent CAS race/restart, no default budget/writer dispatch, persisted attempt-before-synthetic-dispatch, durable lease/claim/profile/host-exposure/caption feedback, DB-time lease horizon/owner/epoch checks, last-budget-slot race, nonrefundable submitted crash accounting, malformed-payload rollback,90-day expiry/derived deletion, Forget with unchanged score50/raw profile/budget, and private accepted-outbox transaction rollback/idempotency collision. The writer/audio fixtures are synthetic; no provider or physical latency proof is claimed.

## Mandatory integration refactors and remaining gates

This is not a blind drop-in adapter. Existing service uses synchronous snapshot() in prepareTrusted/sourcePermissions. Lead must await initialization and refresh before each worker/request path using those reads, or refactor them into fresh transactional reads. New jobs arriving in another process are otherwise absent from that local cache. Pure callback re-execution must not dispatch providers, mutate outside variables or return live network objects. Provider dispatch happens only after the winning persisted reservation; a failure/timeout after submission remains consumed/unknown until explicit reconciliation, never automatic retry.

Use DB-authoritative timestamp/remaining-time projection for leases and first exposure, with monotonic client deadlines anchored before dispatch and transport uncertainty deducted. SQL bounds changed leases to DB now+15s, rejects within-epoch owner changes and epoch regression, and checks actual commit-time expiry for renewed leases, active claimed/streaming/started jobs and started/completed speech receipts; service must retain its stricter expired-lease rejection. Old started exposure reconciliation remains open and must not fabricate completion. Default instance Date.now injection is not proof of multi-host DB clock alignment.

The snapshot scope serializes commentary commits and loads all current collections; operational row projections and specialized lease/stream validation RPCs are the likely performance refinement before scaling. Measure actual accepted-event-to-first-audible under provider/native/network load; no throughput or audible target is established by these correctness tests. Existing per-chunk full-state revalidation needs a measured integration decision.

The migration adds a private owner-only accepted-outbox helper and table. Public/service-role direct append is denied. Future authoritative room/history/receipt CAS must call the helper in its same SQL transaction, using the reviewed accepted-outbox mapper. Test rollback demonstrates the transaction mechanism on a disposable score fixture, not actual room integration. Worker must consume captured immutable acceptance facts, not reconstruct them from a newer current game; outbox delivery/ack/recovery still requires composition. No provider work belongs in that transaction.

Expire/Forget procedures atomically scrub reported history, feedback, summaries/caches and derived job lines, preserving separate raw authored profiles, game scores and accounting/idempotency. Lead must bind authenticated ownership to maintenance calls, schedule/execute expiry and qualify backup/derivative deletion. Passing callable expiry tests does not establish a running retention scheduler or hosted operational deletion. Profile tombstones remain monotonic after deletion.

## File manifest / completion

- supabase/migrations/202610140005_commentary_durable_state.sql
- server/commentary/durable-store.js
- tests/commentary-durable-store.test.js
- scripts/test-commentary-durable-db.mjs
- docs/plans/SW-026-durable-commentary-store.md

Existing service/controller/room handlers were not edited during this wave. Live migrations/deployment/provider/device work remains with the lead under its separate owner authorization.

Primary design references: [PostgreSQL row locking](https://www.postgresql.org/docs/16/explicit-locking.html) supports the atomic version/CAS boundary; [Supabase database functions](https://supabase.com/docs/guides/database/functions) documents definer search-path/grant controls; [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) clarifies service-role paths require explicit application authorization.
