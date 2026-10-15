# SW-033: Prepare commentary during speech and shorten server handoff

14 October2026 / Codex lead. State: in progress; release and physical acceptance open. Baseline clean34084bc/SW032 commentaryv8/PixelAPK3c061329. Owner authorizes continuing performance fixes and another Pixel update.

## Requirements and acceptance

Write the next accepted-score quip during actual current speech, with one in-flight preparation and newest waiting target. Preparation never claims playback, generates voice or overlaps speakers; never arm historical hydration/resume. Await its actual result rather than poll. Keep scoring detached, independent language/style, voice/model quality, explicit welcomes, feedback/Forget, all host/member/Undo/profile/freshness/device/epoch/budget checks and fixed provider ceilings. Complete current speech and real terminal receipt before next claim.

Reduce backend round trips: atomically select/bind already prepared jobs without outbox rediscovery; combine accepted outbox ingestion/selection with writer claim and defer acknowledgements until durable commit; batch cross-game source-room reads while retaining exact room-revision fences. No new schema or weakening authorization. Providers remain outside retryable batches.

Regression criteria: writer starts during current started speech, no second voice/claim until terminal receipt, coalescing/cancellation/quiet resume, one preparation at a time, forged/stale/guest/foreign-device rejection and one paid dispatch per accepted job. Meaningful endpoint request counts, Node24 configured gate/all builds, real PostgreSQL atomic/permission checks, native build/asset scan, deployed source readback and installed Pixel APK hash. Distinguish synthetic counts from actual installed response and physical hearing.

## Risks and bounds

Stale prefetch could leak profile data or consume extra requests; only accepted facts and same current playback owner/device, immutable versioned profiles, latest-target cancellation and durable writer idempotency. Failed prep cannot trigger retries or replay stale facts. Earlier owner9.063s direct/~26s queued samples are baseline, not success. No agent-triggered paid diagnostics planned; original allowance unchanged. Root dirty work preserved; isolated codex/sw033-commentary-prepare-ahead.

## Evidence

Implementation and qualification pending.

## Development evidence

119 focused endpoint/client/transport/native-adapter tests passed. Synthetic actual endpoint cold hosted first byte uses4conditional snapshots/4atomic batches; prepared handoff uses2/2, with no writer or outbox query during handoff. Historical permission rooms load in one bounded query with all source room revisions carried into the writer-claim SQL fence. No hearing inferred from preparation/download.32actual PostgreSQL checks passed, including write-ahead under an active speaker, no next voice reservation before terminal receipt and ready reuse without a second writer. Receipt-based feedback avoids a competing caption query on successful handoff. Full clean qualification, deployment and new Pixel identity pending.

## Delivered qualification and rollout

Cleanf3cbb59711a609fc015885c190a31d096fd48022:1,037tests passed/13optionalcamera skips/all configured builds/source consistency;32actual PostgreSQL checks; Android compile/38asset matches/private-key-pattern scan. Commentaryv9 deployed/canonical source readback matched/unsigned401; game-roomv9 unchanged, no migration. Pixel hardware verified; APKd193af38b6ebc0148c2380b85bb8f1409f8eb517d2e05d2e792be909579d499e installed-r/readback/launch verified, data preserved. No agent-triggered paid diagnostics. Exact source/hash/evidence and rollback in [release](../releases/SW-033-commentary-prepare-ahead.md). Post-change physical latency/humor acceptance remains owner test; operation-count reductions are not a live timing claim.
