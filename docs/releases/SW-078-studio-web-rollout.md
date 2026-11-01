# SW078: Studio backend and web rollout

31 October 2026, America/Chicago (live verification 1 November 00:10 UTC). Owner: Dan. Operator: Codex/fluidity on fg-dev. **Backend/web deployed and verified; existing-account user acceptance pending. Native phone deployment remains held.**

Studio: https://fluidity-group.github.io/yahtzee-scorekeeper/?studio=1

Use the existing game account, select a hosted table (or open its saved table code), create a reaction and save a private draft. Preview locally, then explicitly review and publish when ready. Saving or previewing does not publish. Publishing changes future reaction settings; it does not record a score. Actual effects on older installed phones are not qualified by this web rollout.

## Source and target identities

| Target | Deployed identity |
|---|---|
| Source | `d3f92cc4183ea9a99769d669904eac162265880b`, clean production build |
| Source digest | `8c02e8d45280e287ccaa95ba6018d39668cc7c5527d0dead7105aae1d67a1a15` |
| Supabase project | `ezgawsdmvuoqrxlfbgen` |
| Schema history | All 17 versions applied, through `202610310001_reaction_studio_drafts.sql` |
| Room function | `game-room` v17, ACTIVE, application-internal verified Auth UUID; platform `verify_jwt=false` preserved |
| Room source SHA-256 | `121948457b46dd0180b3c595563508bdea73f0d7e2c06af5938eb3ddf66750b6` |
| Room ezbr SHA-256 | `35f2944bce72bac9244bcec2043d1da07a5f58a411c7c92b949accff2b88faf5` |
| Pages assets commit | `17182646517759c29f68c29455450d58fb4667a3`, hosting build successful |
| Hosting | Existing `gh-pages` root, HTTPS, `/yahtzee-scorekeeper/` base |
| Public configuration | Validated public-only existing connection, push disabled, live commentary deferred; configuration digest `df0f3f29fe1885a7a81d8e26d339641765bdd4845d95ce992a7e23d51eac5e8b` |

Later source commits record evidence only; they do not change the deployed identities. Source master and the shared coordination checkout were not promoted or switched.

## Authorisation and schema

Dan approved history repair for the 16 audited baseline versions, then the new Studio migration via approval `ab1c8bb7aa680829` at exact ref `a3c5225e40e70ace0e6357b2733b143150bed9ef`. Both one-use approvals are spent; do not retry them. The 16 baseline migrations were recorded as applied without executing their SQL. Only Studio `202610310001` was subsequently executed. See [baseline audit and apply evidence](SW-078-schema-baseline-audit.md).

Dan then explicitly authorised backend/web rollout, retaining the phone hold. After an administrator note repeated an older deployment hold, Dan clarified: proceed with backend and web; keep phones on hold. No further rollout approval was inferred from access setup.

Fresh secret-scanned released export `20261101T000237Z` matches all 17 source migrations in separate disposable local PostgreSQL reconstructions using exported platform default grants: 287 schema/security objects, 16 tables, 33 routines, zero missing/drift/extra. Studio's private draft table and three routines match expected RLS/ACLs. The already-enabled portrait cleanup job was preserved. Cron command contents, historic business-data backfills and provider budgets remain unverified and unchanged by this rollout.

## Verification performed

- Clean code `922cbd1` passed Node 24.15.0 full engineering gate: 1,404 tests, 13 optional camera skips, all configured builds, unchanged source. Deployed application/server/migration/publisher source is unchanged from that gate; source `d3f92cc` also has green remote CI. No full test rerun was needed for later evidence-only documentation.
- The public web bundle was rebuilt at clean `d3f92cc` with `prepare-studio-web.mjs` and the existing validated public-only configuration. The sandbox initially blocked Git source-identity subprocesses; the approved outside-sandbox build retained and passed that check. All 57 public file hashes and the configuration scan passed; no environment files or server secrets were published.
- Before deployment, the administrator's released v16 function backup passed every source hash and its exact source matched committed rollback revision `df130aa`. Only `game-room` was deployed from pinned `d3f92cc` through the vetted wrapper.
- After deployment, a new secret-scanned read-only export reported ACTIVE v17, preserved `verify_jwt=false`, and source SHA-256 exactly matching qualified generated `index.ts`. This preserves the function's own Auth UUID verification; it does not weaken authentication.
- Pages build at `1718264` succeeded. Every one of the 57 hosted file hashes matches the prepared bundle; `?studio=1` serves the expected index with HTTP 200. Hosted `build-identity.json` matches the clean source/profile/digest.
- Fresh public probes: Auth health 200; unsigned room POST 401; synthetic invalid-token room POST 401; browser OPTIONS 204; anonymous draft-table GET with `limit=0` denied 401. No account rows were returned or requested for acceptance.
- Function inventory confirms commentary v13, portraits v3 and portrait-cleanup v3 remain unchanged. No paid generation, provider key/budget change, real account login, score/settings write, native connection or phone installation occurred.

## Evidence locations

Ignored task evidence under `artifacts/sw078/`:

- `web-build.json`: clean production source/configuration identities, public scan and all 57 file hashes.
- `rollout/schema-after.json`: independent fresh 17-migration final-schema/security comparison.
- `rollout/function-before.json`, `rollout/function-after.json`: exact backup/target/readback source identities and configuration.
- `rollout/published-verification.json`: all 57 hosted hashes, Studio route/build identity and public Auth boundary results.
- `rollout/before-endpoints.json`: pre-publication checks and preserved old-index match.
- `schema-audit/history-repair-result.json`, `schema-audit/studio-migration-result.json`: separate approved ledger repair and Studio apply.
- Build/publish logs: `artifacts/sw078-rollout-web-build.log`, `artifacts/sw078-pages-publish.log`.

Administrator-released read-only exports are not copied into Git or modified:

- Prior room: `/srv/yahtzee/function-exports/game-room-20261101T000604Z`, v16; source SHA-256 `5385065b401c0ecb8556d31281886187c4fc45f1ee84a4a1f6197a1bbe842cf2`; tree SHA-256 `4b0c3d2ce2502e33889715d65b7c78b5f639c1510dcc19e54ddb5a4fed9f4428`.
- Deployed room: `/srv/yahtzee/function-exports/game-room-20261101T000850Z`, v17; tree SHA-256 `ae95105330367c388643b32dd3bab7698423806593d9e1bbbd61188d66bfbd12`.

The source manifests use paths relative to `source/`; tree hashes identify the released `SHA256SUMS`. Metadata is recorded separately. Both exported sources were checked byte-for-byte, not inferred from function version numbers.

## Rollback

Prior room source is exactly present at `df130aab0f9b0afd467e9f4c94ed6415418e9b81`. Through the approved wrapper, rollback command is:

```sh
sudo -n /usr/local/sbin/yz-supabase functions-deploy --ref df130aab0f9b0afd467e9f4c94ed6415418e9b81 game-room
```

Read back the restored function and compare with the preserved v16 source/configuration. A rollback creates a new deployment version; do not expect its version counter to return to 16.

Prior Pages assets commit `a6981c713e364bbfc4d49cfd2581aa34b45e0e7a` has an exact preserved tree at `artifacts/sw078/rollback/pages`. Before deployment, the live prior index matched that tree. Republish that tree as a new normal commit to `gh-pages` from the isolated publisher checkout, preserving later history. Never force-push or reset source master. The additive Studio draft schema/data remains in place; no destructive database rollback, job reset, account deletion, uninstall or app-data clearing is part of rollback.

## Remaining acceptance

The owner signs in with existing credentials on the actual Studio page. Agent does not collect passwords or create substitute accounts. Test account/table visibility, private draft save/reload across two computers, conflict handling, recipient/score preview and explicit publication. Observe that other accounts cannot see private drafts and that publishing leaves the score unchanged. Real existing-account and two-computer acceptance are not established by public HTTP checks or synthetic browser tests.

Phone installation, complete paired Android/iOS gameplay/audio/avatar acceptance and master promotion remain separate owner gates. Older native builds may not contain the reaction-delivery implementation; this backend/web rollout makes no claim that new Studio reactions run on those installed packages.
