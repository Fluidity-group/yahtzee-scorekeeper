# SW078: Live migration baseline audit result

31 October 2026, America/Chicago. Owner: Dan; operator/reviewer: Codex/fluidity. Original comparison was audit only. The authorised history repair and subsequent read-only checks are recorded below; the subsequently authorised Studio migration is recorded below. No Edge Function/web deployment or device action has run.

**Result: the cumulative application schema and access controls match all 16 baseline migrations in the administrator-released export.** 262 catalog objects match, with 0 missing, 0 drifted and 0 extra application objects. The exact history-repair candidate list is [SW-078-history-repair-candidates.txt](SW-078-history-repair-candidates.txt). Dan subsequently approved the 16 baseline versions; the vetted history-only repair succeeded as recorded below. Studio 202610310001 is new work and is deliberately excluded.

## Evidence and comparison method

The administrator released these secret-scanned, structure-only files under read-only /srv/yahtzee/schema-audit/: schema-20261031T232905Z.sql (SHA-256 062165a626f1d9ae7e857fdf798a9cfcb26198a29305f323ce703b4103fe0f00) and catalog-20261031T232905Z.txt (SHA-256 9430e046c23d5f6e02c4c055982de571c243d74c1052fb40014885ac81da4a3f). Both source hashes were unchanged after the audit. Earlier blocked/withheld exports were never opened.

Source baseline: the 16 migration files through 202610240003 are byte-identical to bbfdec4630bc676d700b241bef2b8870d0a0c414. Each source hash/provenance is recorded in ignored artifacts/sw078/schema-audit/migration-manifest.json. The earlier approved wrapper read confirmed 16 local versions with blank Remote entries; the released catalog additionally shows that supabase_migrations.schema_migrations is absent. Active Edge Function metadata was not used as proof of schema equality.

Live export is PostgreSQL 17.6. We reconstructed source migrations and the released schema-only DDL in two separate disposable local PGlite 18 databases, then queried both with the same canonical catalog audit. No SQL from the export or migrations was executed against the live project. Only pg_dump client guard lines are omitted and CREATE SCHEMA public becomes IF NOT EXISTS for the local platform fixture. Application DDL, routine bodies/attributes, owners, RLS, grants and constraints remain independently compared; no per-object expected ACL overrides are used. PG18-derived NOT NULL constraints are represented by the independently compared column nullability rather than duplicated constraints.

The administrator’s catalog connection reports read_only=off; the export operation itself was approved SELECT/schema-only work. The derived snapshot’s readOnly=true refers to our local read-only catalog transaction, not an assertion about the live connection. Provenance records both facts and the server/canonicalisation versions.

## Matching definitions

| Component | Result |
|---|---|
| Application tables / columns | 15 tables and 112 columns match: types, order, nullability and default fingerprints |
| Constraints / indexes | 67 non-NOT-NULL constraints and 29 indexes match |
| Policies / trigger | 4 application RLS policies and 1 application trigger match |
| Routines | 30 routines match: bodies, declarations, owner, security mode, settings, explicit/effective EXECUTE grants |
| Table security / private schema |RLS/forced flags, explicit/effective table grants and 1 private schema match |
| Realtime | 3 application publication memberships match |
| Required platform extensions |pg_cron in pg_catalog, pg_net in extensions, supabase_vault in vault present |
| Private buckets |Portrait and animation bucket privacy, 5 MiB limits and allowed MIME types match |

## Supabase platform default grants

An initial reconstruction with bare-PostgreSQL defaults found four service_role-only permission differences: the animation table and three social routines. The export includes 24 platform-wide ALTER DEFAULT PRIVILEGES statements for postgres/supabase_admin in public, granting the standard roles table/function/sequence defaults. Applying those independently exported defaults BEFORE the unchanged 16 migrations reproduces all four live ACLs exactly. This models the platform context; it does not copy individual object grants into the expected result or ignore ACL differences.

Specifically, service_role retains ALL on clubhouse_avatar_animations because that migration revokes clients but not service_role before adding CRUD; it retains EXECUTE on clubhouse_queue_social_push, clubhouse_social and clubhouse_social_email because those statements do not revoke service_role’s pre-existing default grant. Anonymous/client revocations and intended authenticated grants still match exactly. Initial vanilla comparison and platform-context verification remain preserved as artifacts for review.

## Operational differences and evidence limits

- Both named cron jobs and schedules match. Retention remains active. Portrait cleanup is active whereas its installation migration intentionally leaves it disabled pending later activation. This is a post-install operational state, not missing DDL; preserve it during bookkeeping repair. This audit does not re-authorise or change activation.
- Cron command text/hashes were intentionally omitted from the released catalog, so command contents were not verified. No job, cleanup worker, HTTP or provider was invoked.
- Business/account rows, backfill completion, private media, Vault values and provider budget/enablement were not exported/read. A matching final schema does not prove historical execution of every data operation. The recommendation is a schema-baseline ledger repair, never replay/reset of those operations.
- The catalog shows no policies on storage/auth/realtime tables outside the dumped schemas; managed platform triggers/settings remain untouched.

## Migration-by-migration final-schema status

Later function/constraint replacements are assessed cumulatively rather than incorrectly compared with obsolete earlier definitions. All 16 versions have matching surviving/final effects.

| Version | Purpose | Final schema / security |
|---|---|---|
| 202609160001 | rooms | Match |
| 202610130001 | hosted game history | Match |
| 202610140001 | hosted tournaments | Match |
| 202610140002 | competition final chain | Match |
| 202610140005 | commentary durable state | Match |
| 202610140006 | commentary room outbox | Match |
| 202610140007 | commentary retention schedule | Match |
| 202610140008 | local commentary sessions | Match |
| 202610140009 | commentary incremental transport | Match |
| 202610140010 | commentary atomic batches | Match |
| 202610140011 | commentary provider operations | Match |
| 202610150001 | commentary historical invalidation | Match |
| 202610170001 | tournament social | Match |
| 202610240001 | portraits | Match |
| 202610240002 | portrait expiry | Match |
| 202610240003 | avatar animations | Match |

## Dan approval and next action

The 16 IDs in the candidate file can be submitted for Dan’s explicit approval to mark as applied, with the operational/evidence limits above disclosed. Only the administrator should then add/run the vetted migration-repair operation. Marking history must not execute these migrations, reset jobs/budgets, change data or touch phones.

After approved repair, re-read history and confirm these 16 are recorded. Only then inspect a Studio-ref dry run and obtain the wrapper’s separate one-use approval for the new Studio migration. The authorised Studio backend/web rollout remains pending that sequence. Do not include Studio 202610310001 in this baseline repair.

## Verification artifacts

artifacts/sw078/schema-audit/: expected-catalog.json, live-canonicalized.json, expected/live-operations.json, comparison.json, comparison-vanilla.json and platform-context-verification.json. No raw administrator export is copied into Git. The schema-only importer rejects top-level data writes, application-function execution, unknown client meta-commands and unparsed SQL. Tests cover those guards, platform-default scoping, ACL/RLS/body drift, omitted cron hashes and activation differences. Focused 19 tests passed; final committed-source gate is recorded separately below.

## Committed-source qualification

Clean `922cbd1406f31d7c06bb3002a55118bd7adccab8` passed the Node 24.15.0 engineering gate: 1,404 tests passed, 13 optional camera tests skipped, and every configured web/native-web/Edge build passed. Source remained unchanged throughout the run. Evidence: `artifacts/engineering/2026-10-31T23-45-25-649Z-35505a69/report.json`; source digest `0e6c46d8f6eb04373083e1453c1fdc6774d218a37648213de283e68f87e9d421`. The later qualification-record update is documentation only. No physical phone, live application-account flow, backfill or cron-command acceptance is established by this gate.

## Approved history repair and Studio dry run

On 31 October 2026 Dan explicitly approved marking these exact 16 versions applied. The administrator enabled a project-pinned, exact-version, single-use `migration-repair-applied` wrapper operation. Its `--check` validated every version against commit `bbfdec4630bc676d700b241bef2b8870d0a0c414` without changing anything. The repair then exited 0, reported all 16 versions applied, and consumed the approval list. No migration SQL was executed.

Two subsequent migration listings, including one pinned to Studio commit `a3c5225e40e70ace0e6357b2733b143150bed9ef`, showed matching Local/Remote entries for all 16 approved versions. Studio `202610310001` had a Local entry and a blank Remote entry. No other remote version was listed.

The vetted `db-push-dry-run --ref a3c5225e40e70ace0e6357b2733b143150bed9ef` exited 0 and listed only `202610310001_reaction_studio_drafts.sql`. It issued approval ID **`ab1c8bb7aa680829`** for that exact commit. Dan must OK this ID with Home Network before the administrator enables the one-use `db-push`; no apply has run. Do not substitute a later documentation commit/ref. The latest instruction explicitly holds deployments and phone updates.

Evidence: `artifacts/sw078/schema-audit/history-repair-result.json` records command outcomes, versions, scope and the approval ID without credentials or application rows. Existing application data, jobs, permissions and buckets were not modified by this history-only operation. Backfills and cron commands remain unverified as above. Earlier approval/next-action instructions in this audit are the pre-repair sequence and are superseded by this result. This record update changes documentation only; the clean-code 1,404-test gate above remains the qualification evidence.

## Approved Studio migration applied

31 October 2026, America/Chicago (verification observed 1 November 00:00 UTC): the administrator confirmed Dan's one-use approval `ab1c8bb7aa680829` was enabled for commit `a3c5225e40e70ace0e6357b2733b143150bed9ef` and independently checked its single pending migration. The vetted `db-push --ref a3c5225e40e70ace0e6357b2733b143150bed9ef` ran once and exited 0, reporting application of only `202610310001_reaction_studio_drafts.sql`. This approval is spent. No retry or other migration was attempted.

The requested default `migrations-list` showed all 17 versions recorded remotely. It lists Studio only on the Remote side because the shared coordination checkout remains the preserved 16-migration `bbfdec4` baseline. A further read-only listing pinned to the applied Studio ref confirmed all 17 matching Local/Remote entries, including `202610310001`. The shared branch was not switched or modified.

Evidence: `artifacts/sw078/schema-audit/studio-migration-result.json`. These checks establish successful migration application and ledger recording, not complete Studio account-flow or post-deployment acceptance. No Edge Function was deployed, no web bundle was published and neither phone was touched. The latest explicit hold on those deployments remains in force; Studio is not yet live for existing-account testing. The preceding approval-pending notes are the historical pre-apply state.

Documentation-only record checks: engineering inspection and whitespace validation; the prior clean 1,404-test/all-build gate remains the code qualification evidence and was not repeated for this record update.
