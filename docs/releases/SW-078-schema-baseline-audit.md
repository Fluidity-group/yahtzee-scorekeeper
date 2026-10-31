# SW078: Read-only migration baseline audit

31 October2026. Owner: Dan; operator: Codex/fluidity. Source baseline for the16migrations: bbfdec4630bc676d700b241bef2b8870d0a0c414; those16files are byte-unchanged on the current rollout branch. New Studio202610310001 is separate and excluded. No live migration, migration repair, db-push/dry-run, function or web deployment is authorised by this audit. Existing Studio rollout authorisation remains subject to this new prerequisite; native phones remain held.

## Confirmed live observations

The administrator-approved yz-supabase wrapper `migrations-list` confirms16local versions and blank Remote entries for all16. Its `functions-list` reports game-roomv16, live-commentaryv13, portraitsv3 and portrait-cleanupv3 ACTIVE. This confirms running Edge Function metadata only; it does not establish any table/RPC/constraint/policy/ACL/body match.

The wrapper currently exposes help, migration history, function listing/deployment and db push/dry run. It exposes no schema-only dump or catalog-query operation. The requested schema comparison cannot honestly be declared complete until the administrator provides an approved read-only path. No credentials or wrapper files have been read, no unsupported operation is attempted, and no database history is modified.

## Migration-by-migration verification status

| Version | Local purpose | Remote history | Live schema |
|---|---|---|---|
| 202609160001 | rooms | Blank | Pending approved schema read |
| 202610130001 | hosted game history | Blank | Pending approved schema read |
| 202610140001 | hosted tournaments | Blank | Pending approved schema read |
| 202610140002 | competition final chain | Blank | Pending approved schema read |
| 202610140005 | commentary durable state | Blank | Pending approved schema read |
| 202610140006 | commentary room outbox | Blank | Pending approved schema read |
| 202610140007 | commentary retention schedule | Blank | Pending approved schema read |
| 202610140008 | local commentary sessions | Blank | Pending approved schema read |
| 202610140009 | commentary incremental transport | Blank | Pending approved schema read |
| 202610140010 | commentary atomic batches | Blank | Pending approved schema read |
| 202610140011 | commentary provider operations | Blank | Pending approved schema read |
| 202610150001 | commentary historical invalidation | Blank | Pending approved schema read |
| 202610170001 | tournament social | Blank | Pending approved schema read |
| 202610240001 | portraits | Blank | Pending approved schema read |
| 202610240002 | portrait expiry | Blank | Pending approved schema read |
| 202610240003 | avatar animations | Blank | Pending approved schema read |

## Prepared expected schema and audit

Disposable local PostgreSQL (PGlite18) applies the16source migrations in order with inert platform-extension boundaries. Final cumulative expectation:15tables,112columns,67non-NOT-NULL constraints,29indexes,4RLS policies,1application trigger,30routines,1private schema and3Realtime memberships. Required platform extensions: pg_cron in pg_catalog, pg_net in extensions and supabase_vault in vault. Later overrides of earlier routines/constraints are respected. Each source migration hash and final object provenance is recorded. This is an expectation, not live evidence.

Catalog audit: scripts/schema-audit/catalog.sql. It enforces a repeatable-read/read-only transaction and reads only catalog metadata. Bodies, argument defaults, expressions and settings are fingerprinted; no application routine, player table row, provider, HTTP or Vault secret is invoked/read. scripts/schema-audit/operations.sql separately reads only the two fixed job configurations and two bucket policies, after the first query confirms those relations exist. The administrator can expose fixed committed audit files as a vetted schema-audit wrapper operation rather than granting arbitrary SQL. See scripts/schema-audit/README.md.

Artifacts under artifacts/sw078/schema-audit/: expected-catalog.json, expected-operations.json, migration-manifest.json and wrapper-observation.json. No live catalog/comparison file exists yet. Comparator regressions verify that missing objects, RLS/ACL/body differences, unexpected objects/extensions and unprotected/incomplete snapshots cannot be called a match.

## Repair gate and next action

Obtain approved live schema snapshots, compare cumulative definitions and security metadata, then classify drift and post-deployment operational settings. Verify any relevant backfill/seed obligations separately; cron activation or provider-budget settings must never be reset to source defaults to make a comparison pass. PostgreSQL18-local versus live-major formatting differences need review, not automatic acceptance.

Only after a supported baseline is established should the report propose the exact16IDs for Dan’s explicit history-repair approval. The administrator then adds the narrowly approved repair operation to yz-supabase. Recheck migration history afterwards. Do not run a db-push dry run expecting only Studio until history reconciliation is complete. Studio-only dry-run approval and live rollout follow as separate steps; no replay of all16 or destructive data rollback.
