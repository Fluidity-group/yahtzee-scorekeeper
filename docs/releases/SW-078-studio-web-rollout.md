# SW078: Studio migration, backend and web rollout

Latest audit access result: administrator added read-only schema-dump, but its gitleaks guard blocked release of secret-shaped content. No dump/secrets were read. A reviewed safe export or committed hash-only catalog audit is required before declaring schema matches or proposing history repair. See [audit](SW-078-schema-baseline-audit.md). Rollout remains held; no repair or dry run has run.

Current prerequisite update: the administrator-approved yz-supabase wrapper is available for migration history/function inventory. Its read-only migration listing confirms all16baseline Remote entries blank. Before any dry run, migration, repair or deployment, compare the live schema and report matches/drift. [Baseline audit](SW-078-schema-baseline-audit.md) records the expected catalog and missing approved schema-read path. Any history repair needs Dan’s separate explicit approval and administrator enablement; prior Studio rollout authorisation does not cover it.

31 October2026. Owner: Dan. Operator: Codex/fluidity on fg-dev. User explicitly authorises Studio migration/backend/web activation for existing-account testing; Android/iPhone native installation remains held. This authorisation supersedes SW077’s source-only deployment hold for these three live targets. It does not authorise PR self-merge or master promotion.

State: preparation in progress; nothing live changed yet.
Source baseline: Studio PR #10 head7ddd5ac6258e0e5d5fac8dd89df59e1b065c7db4, qualified code6c9191c8cc0e65fe0b0409a4fb4a54220f847b7f. CI green. New isolated codex/sw078-studio-rollout at artifacts/sw078/source preserves source/development worktrees. Studio target: https://fluidity-group.github.io/yahtzee-scorekeeper/?studio=1.

## Targets and rollback

- GitHub Pages metadata freshly read: HTTPS enforced, gh-pages root, built; current asset commit a6981c713e364bbfc4d49cfd2581aa34b45e0e7a. Preserve exact prior asset tree for normal non-force rollback publication. The old publisher still named FluidityGroup-Git; this task corrects it to Fluidity-group before use.
- Supabase expected project: ezgawsdmvuoqrxlfbgen, as recorded in the existing app configuration/release records. Confirm authenticated live inventory before mutation. Back up current room function source/metadata; inspect prerequisite schema and migration status, anonymous ACLs and aggregate fingerprints for existing rooms/games/accounts. Never log private rows or credentials.
- Apply only additive202610310001_reaction_studio_drafts.sql after prerequisites are confirmed. Re-read function/table ACLs and migration result. Existing account/table/game state must remain unchanged.
- Deploy matching game-room only, preserving its internal Auth UUID verification. No commentary/portrait/provider function deployment, key/model/allowance change or paid generation. Download/readback must match the qualified generated source.
- Build web with the existing validated public-only configuration and current Pages URL/base, push off/commentary deferred. Never publish the earlier unconfigured qualification bundle. Publish to unprotected gh-pages using explicit normal push; never push source to master or merge agent PRs.
- Rollback: republish the prior Pages tree in a new commit and redeploy the backed-up room function. Retain the additive private draft schema/data; old code does not use it. No destructive schema/data rollback, phone uninstall or data clear.

## Verification and gates

Automated qualified baseline:1,385tests/13optional camera skips/all configured builds; independent158tests; disposable SQL12; Android offline19native tests/53asset match. This task reruns the source gate after publisher/public-build changes. Fresh live checks are separate: endpoint unsigned401, deployed-source match, production Studio module/asset match, public configuration validation, existing account/table data fingerprints, draft table/RPC privilege checks and browser cache/sign-in surface.

User enters existing account credentials on the actual sign-in page. Agent does not collect passwords, create substitute accounts, advance real scores, change real reaction settings, renew provider budgets or infer completed two-computer/phone acceptance from deployment. Native phones remain untouched.

## Current access gate

GitHub publishing authentication is available under FluidityGroup-Git. No deployment credentials are present in this session. The project-local Supabase CLI fails at startup while attempting to initialise ~/.supabase; it cannot yet verify authenticated project access. Administrator setup/approved deployment command requested without asking for secrets. Web artifacts/rollback preparation continue; do not publish a half-activated frontend before backend/schema are ready.

Fresh public boundary checks: GitHub PagesHTTP200 and live index hash matches preserveda6981c7 rollback;52rollback files preserved (including hosting metadata). Validated public-only config resolves to the expected backend project; Auth healthHTTP200 and unsigned roomPOST401. Evidence artifacts/sw078/before-public.json contains hashes/status only. No management/schema access or live data change is established by these probes.

## Prepared release evidence / access still required

Clean8eec15fa2fd6a7a16e03b98114191ad6b5dda37e Node24 gate passed1,385tests/13optional camera skips/all configured builds/source stable. Report artifacts/engineering/2026-10-31T21-27-10-277Z-0f6a6f5e/report.json. Publisher/preparation scripts pass syntax and whitespace checks.

Production web bundle rebuilt from that clean commit with validated public-only configuration, expected backend project, canonical current-org URL/base, push disabled and live commentary deferred.57web files have recorded hashes; embedded JWT roles are public anon only and secret-key/env-file scan passed. Report artifacts/sw078/web-build.json; build log artifacts/sw078-web-build.log. Earlier offline qualification assets are not used as the rollout package.

The only remaining execution gate is authenticated Supabase administration access. Migration, schema/data fingerprint inventory, old room-function backup, room deployment/readback and Pages publication have NOT run. Public site/backend/phones remain unchanged. Resume after the administrator supplies a working authenticated CLI or approved project-local deployment command; never put credentials in chat or source. Keep the prepared bundle/rollback evidence and recheck live targets before mutation. Later source commits record preparation status only.
