# SW-033 prepare-ahead commentary — 14 October2026

State: implemented and qualified, backend deployed and matching Pixel installed for owner retest. Codex development self-review; physical response/sound/quality and independent acceptance remain open. User explicitly authorized overlap, remaining bottleneck work and Pixel update. No agent-triggered paid diagnostic generation, quality downgrade, allowance change, score edit, migration or app-data clearing.

## Changes and protections

After a newly accepted score arrives during actual native started speech, the controller sends one authenticated reaction-prepare request. A serial preparation chain keeps one request in flight and skips replaced waiting targets. The complete next quip can be written while Rachel speaks. Preparation does not claim a speaker, reserve/generate next voice, add playback exposure or interrupt current audio. Native opens the next stream only after both preparation and the current actual terminal receipt complete. If a newer score arrives while a prepared target still waits, that older unspoken target is replaced. Hydration/resume is quiet; background/mute/profile/Undo/Forget cancel pending playback.

The server accepts only bounded IDs/current profile version and the actual owner device, never client jokes/facts or free-form provider arguments. Host/member, current game, accepted event/Undo, profile, age/pause and device ownership checks run before writer work. Same-device preparation may coexist with its active speaker; another device cannot take over. Writer attempts and ceilings remain durable/idempotent. A preparation failure does not retry paid generation. Foreground native audio still has all claim/lease/first-byte/periodic/final guards.

Prepared jobs now select, validate, claim and reserve audio in one version/room-fenced batch. They skip outbox discovery and a second writer. Cold hosted requests combine immutable accepted-outbox ingestion, selection and writer claim in one batch, with bookkeeping acknowledgements scheduled after durable commit. Historical permission rooms load in bounded batches, carrying every source-room revision/missing-row fence into SQL; audience/source authorization is preserved. External providers stay outside retryable callbacks.

Successful real playback receipts update Like/Dislike eligibility directly, avoiding a competing jobs-read during next handoff. Missing or rejected receipt evidence cannot manufacture hearing; caption projection remains a fallback. Scores remain detached from all voice work. Logs distinguish prepare start/completion, request queue time, provider stages, first bytes and native playback proxy.

## Qualification

Clean executable source `f3cbb59711a609fc015885c190a31d096fd48022`, branch `codex/sw033-commentary-prepare-ahead`, isolated checkout `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`. Source SHA256 `2efd554841a3c02ea4a0cebc211ca428eec08588915ffe86f980ae3ebcae9343`.

Node24 gate:1,037tests passed/13optionalcamera skips; web/native/commentary/room builds and unchanged-source check passed. Report `artifacts/engineering/2026-10-15T01-40-42-956Z-ed3b2524/report.json`. JDK21/offline Android compile passed;38native assets byte matched and private credential-pattern scan passed.

32actual disposable PostgreSQL checks passed, including writer preparation under active speech without a next claim/voice reservation, terminal-receipt release and reuse of prepared text without another writer. Retained ownership/epoch/freshness/CAS/grants/ceilings/history/Forget tests passed. Focused endpoint/controller tests cover serialization, target replacement, cancellation, quiet resume, guest/foreign-device/forged/stale/Undo rejection, actual-receipt feedback and all bulk source-room revision fences.

Synthetic actual composed endpoint first-byte counts: prepared hosted handoff2conditional snapshots+2batches+2room reads+1voice reservation, no writer/outbox query. Cold hosted request4snapshots+4batches+5resource reads across writing and audio. Recent SW032 live hosted traces had7–10snapshots/6–9batches/10–13resource reads plus writer; different configurations prevent translating these counts into a measured latency improvement. Root `artifacts/sw033/prepared-handoff-benchmark.json` and `cold-reaction-benchmark.json`. No synthetic duration is claimed as live speed.

## Live deployment and Pixel identity

Supabase `ezgawsdmvuoqrxlfbgen`: live-commentaryv9 ACTIVE, downloaded source canonical SHA256 `352ee5f279f52f2736ab258441c837e5183f62d687340adfeee1d9e127e7d391` matches qualified bundle; unsignedPOST401. Game-roomv9 unchanged; no migrations, scores or account/profile edits. Existing Rachel voice/model quality and200writer/200voice/36,000spoken-character ceilings/18October expiry unchanged. Read-only pre-rollout allowance counts:43writer/31voice requests,4,433spoken characters; zero agent-triggered paid diagnostic calls.

Fresh hardware serial `67080DLDV005JQ`, Pixel11ProXL, connected `192.168.0.229:44167` verified before installation. APK SHA256 `d193af38b6ebc0148c2380b85bb8f1409f8eb517d2e05d2e792be909579d499e`,7,564,119bytes. Data-preserving install-r succeeded, launchStatusok, installed APK pulled and hash matched. Root ignored artifacts/sw033 retains gate/SQL/benchmarks/live-source/APK/device/install/launch evidence. No public guest-web publication.

## Owner retest and rollback

Test a fresh idle score, then add another score while Rachel is already speaking. The second quip should write during that speech and hand off after the current line completes; voices must not overlap. Compare the gap after current speech separately from total score-to-playback, which still includes unavoidable remaining speech time. Use Menu→More tools→Commentary response times and numeric native/server logs. Check latest-target replacement, correct blurb/name, Undo, feedback and background/mute cancellation. Exact-build physical latency remains owner acceptance; the previous9.063s/~26s observations belong to SW032.

Rollback: redeploy SW032 commentaryv8 source and reinstall `artifacts/sw032/pixel-installed.apk` using-r. Keep all existing schema/migrations/data. Old native streaming routes remain supported; no app clearing or destructive database rollback.
