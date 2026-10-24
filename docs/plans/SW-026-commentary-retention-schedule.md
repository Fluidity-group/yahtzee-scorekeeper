# SW-026: automatic commentary retention schedule

14 October 2026. Owner/reviewer: lead Codex; implementation: tooling expert. Implemented and locally SQL-verified; Supabase installation/job execution remains deployment evidence. Scope: heard commentary/feedback up to90days and explicit Forget; optional profiles stay until removed, scores and consumed usage/dedupe survive.

## Source and execution

`supabase/migrations/202610140007_commentary_retention_schedule.sql` enables pg_cron with the official [Supabase installation pattern](https://supabase.com/docs/guides/cron/install), then installs owner-only `clubhouse_commentary_private.cleanup_retention()` with fixed SW026 scope d1ce0000-0000-4000-8000-000000000026 and empty search_path. No parameters, credentials, HTTP or provider calls. Public/anon/authenticated/service-role execution is explicitly revoked; the scheduled creating owner executes it.

Named job `dice-clubhouse-commentary-retention`, `*/15 * * * *`, runs `select clubhouse_commentary_private.cleanup_retention();`. Named scheduling updates the same owner job on migration rerun, following [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart). Root must deploy with the intended migration owner and verify actual cron.job username/database/active/schedule/command and subsequent job_run_details success. An available pg_cron extension alone is not an installed active schedule.

The private job calls existing database-time expiry RPC for heard records, ratings and caption/derived memory, then deletes unprocessed outbox snapshots older than1day and processed snapshots whose processed_at is older than90days. Pending events that old cannot satisfy live15second freshness; keeping room command receipts/moments prevents hydration/retry from producing fresh speech. Profiles, scoring/history, attempts, budgets, dedupe keys and personal-profile tombstones are untouched. Cleanup retains scope locking established by expire through its transaction. Application read-path purge still hides expired lines immediately; physical scheduled deletion happens on the next successful quarter-hour run after expiry, not an invented exact-time or uptime guarantee.

## Actual verification

`node scripts/test-commentary-retention-db.mjs`:6checks passed against cached timescale/timescaledb:2.29.2-pg16, exact imageId sha256:289d55704b1b3ee8263cd3805c6930f9cd54506835a8f19f9b85dad17d5c5a8a. Container uses --pull never/--network none/tmpfs/no host ports and was removed. Existing0005/0006 migration bodies loaded unchanged with minimal room table fixtures;0007 cleanup function/schedule body executed unchanged.

Local image has no pg_cron extension. Runner skips ONLY the extension-install line and uses a clearly labeled cron.schedule metadata test namespace; it executes the registered owner SQL command directly. Therefore this proves functional cleanup and registration shape/idempotence, not actual autonomous timer execution. Evidence flags liveScheduleVerified:false, elapsed90Days:false, pgCronAvailable:false, scheduleMode:mock-registration-functional-owner-job-execution.

Checks: one fixed private quarter-hour job after rerun; database-now expiry boundary minus1ms removes expired heard metadata/derivative caption while future expiry stays; old/fresh pending and processed outbox thresholds; score/profile/attempt/budget/dedupe/foreign-scope preservation; denied app/service-role private cleanup; idempotent cleanup; existing explicit Forget still removes current history while preserving profiles/accounting/scores. Seeded timestamp metadata is a boundary simulation, not90days elapsed or real hearing.

Evidence: artifacts/commentary-retention/report.json, completed2026-10-14T22:04:27.634Z.0007 SHA256 dd6be891d3a7e8c12bf35987c2d55d118512b17bc9ad33ce1911901c420c18b8; dependent0005 fdae26c3ae9239c0af8f476937d5a4814c823c5a6918587da090de3256e42198 and0006 5a3bb1bd07baf29f2a0722ad2626bc61b4e754964500a6d16a58ad35ecc8342f. Dependency-copy commit3b493fc is excluded from integration; root already owns its SQL sources.

No live query, network/provider call, secret read or deployment performed. Root must verify real installed extension + active owner job + first successful actual scheduled run and monitoring/rollback. Rollback can unschedule this named job as its owner without deleting records or undoing score/schema history; expiry read guards remain. Do not disable pg_cron wholesale because other project jobs may use it.
