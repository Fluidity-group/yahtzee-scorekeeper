# SW-031 commentary round trips and queue repair — 14 October2026

State: implemented/qualified, backend deployed and Pixel installed for owner test. Codex development self-review, not independent or physical acceptance. Owner authorized continuing the latency fix after SW030 retest remained15–25seconds. No new paid diagnostic generation, model/voice/admin allowance change, public guest-web publication, score edit or app clearing.

## What changed

The backend executes pure service operations on one current snapshot and commits through a new service-only atomic batch. All existing authentication, membership/host, settings/profile, accepted-fact/Undo, audience, age, budget and lease checks still execute. SQL locks authoritative hosted room rows in stable order, rejects changed room revisions/commentary versions and delegates state updates to the existing canonical validators. Read-only batches validate freshness without writing. Retry uses a fresh snapshot and cloned request body; uncommitted state never enters the warm cache. Paid provider dispatch and opening the audio stream occur only after successful batch commit.

Provider reservation and result recording each use a single SQL RPC. Reservation retains fixed200writer/200voice/36,000spoken-character ceilings, current room limits/expiry, matching persisted attempt/job/stage/profile and TTS claim/device/epoch/lease. Attempts remain consumed on failures. Metadata completion does not create listening evidence or refund usage. First-byte, periodic and completion validation remain.

New accepted scores silence older pending/generating/ready score reactions, preserving claimed/current speech and lifecycle greetings. Revision checks stop late older events from replacing newer ones. Client selects the newest waiting score, suppresses older ready reactions and refreshes after terminal receipt acknowledgment; concurrent polls cannot race the receipt and prematurely claim another line.

A further ordering defect was corrected: JSONB persisted job keys do not preserve chronological Map insertion. Caption and worker windows now sort by acceptance time/revision before limiting; the client sorts by accepted time too. Regression covers30reverse-ordered jobs and verifies the newest20remain available. This addresses reactions falling outside the window or being considered in random UUID order.

## Qualification

Clean executable source `80393ca59beed3a0a60c8fc9ae6c49c1893425c2`, branch `codex/sw031-commentary-roundtrips`, source SHA256 `2b5eec6f987fc734a771bf7a6ab3310d16b3f82a94dbe2050b8d273a5a2cc763`. Isolated checkout `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`. Node24 configured gate:1,004tests passed/13optionalcamera skips/all builds/unchanged source. Report `artifacts/engineering/2026-10-15T00-57-37-957Z-70df47c1/report.json`. Earlier a357d9a gate also passed1,002tests before final chronology/receipt regressions; the final gate supersedes it.

Actual disposable PostgreSQL30checks passed: new grants, atomic room-revision fences/read-only versions, last global writer slot/single dispatch, TTS expired lease/character ceiling, plus retained canonical CAS/lease/attempt/Forget/outbox/local-owner tests. SQL migration hashes match the rollout. Final chronology/receipt changes did not alter SQL; their new regressions are included in the final clean gate.

Actual endpoint with synthetic DB/providers records polling/acquisition1snapshot+1room read+1batch; audio first-byte2snapshots+2room reads+2batches+1dispatch RPC. Compare prior live polling5loads+2room reads; acquisition4loads+1room read+1patch; first audio7loads+3resource reads+4patches. Audio DB trips14→7, polling7→3. These are operation counts, not measured audible improvement. Root ignored `artifacts/sw031/request-count-benchmark.json` retains numeric telemetry; no captions/blurbs/secrets. Physical score-to-sound delay remains open.

## Live rollout and Pixel

Applied additive migrations in one transaction, then schema-cache reload:

- `202610140010_commentary_atomic_batches.sql`: SHA256 `37d0646d7293b71f1f5a8a5b43d7291b4c61d1c471b5753ca959629a8279990b`.
- `202610140011_commentary_provider_operations.sql`: SHA256 `da4ca2c4bf9dfd84ac2aa5d320cd494522163961340c71afbe3b45de2950c29e`.

Supabase `ezgawsdmvuoqrxlfbgen`: commentaryv7 ACTIVE, downloaded source canonically matches `bac93e1355057490aa1eb986954555c22fa36287865e4255c43d27e7087918b8`; unsigned401. Game-roomv9 unchanged.17rooms/19games/revision sum339 and full row fingerprints unchanged around migration. Three new RPCs deny anon/authenticated, allow service role; private RLS retained. Live read-only room-fenced batch committed successfully with no provider call or state version advance. Provider secrets/quality/allowance ceilings and18October expiry unchanged.

Pixel initially disconnected at previous mDNS transport. Rediscovered192.168.0.229:44167; fresh model and hardware serial67080DLDV005JQ verified. Data-preserving install-r, launcher Status ok, installed APK pulled and hash matched. SHA256 `8dd95919f8cf59126725ccd83bd335dc5773107d6f23e19fc9173f5eea100b72`,7,562,731bytes;38native assets matched and private full-key pattern scan passed. Root ignored `artifacts/sw031/` contains source/DB/build/rollout/readback/install manifests. Temporary disconnect resolved; no current install blocker.

## Owner test and rollback

Enable saved commentary, start/continue a game, and enter several fresh scores. Measure first score with no active speech separately from scores entered during speech. Expect current claimed speech to finish, then the newest eligible reaction rather than a backlog. Inspect Menu→More tools→Commentary response times and server/native telemetry; retain correct score-submission versus accepted-observed basis. Native position is a playout proxy, not proof of physical sound. No claim that latency has met a target until new device samples establish it.

Rollback: restore SW030 commentaryv6 source and previous APK `artifacts/sw030/pixel-installed.apk`. Leave additive migrations10/11 (and8/9) installed; old APIs/canonical commit remain compatible. Preserve scores/local mirrors/history. Disable voice if an incident requires it; no destructive schema rollback or data clearing.
