# SW-036 historical commentary receipt repair evidence

15 October 2026. Software reliability subtask of the user-authorized commentary repair/Pixel test. Isolated branch `codex/sw036-receipt`, based on `3c2320b`; synthetic providers and disposable offline PostgreSQL only. No hosted migration, provider request or Pixel operation in this subtask.

## Reproduction and root cause

The existing canonical SQL validator treats any changed `started`/`completed` exposure as fresh speech evidence, except identical/expiry-only changes. The service correctly marks a completed exposure `valid=false` when an accepted Undo/correction invalidates its source score. Once its speaker lease expires, the validator rejects this historical factual invalidation and rolls back the local mirror command.

`COMMENTARY_RECEIPT_BASELINE=1 node scripts/test-commentary-durable-db.mjs` reproduced the real service `commitLocal` Undo command after completed synthetic streaming/playback and explicit disposable-database lease expiry. PostgreSQL returned:

```text
ERROR: Speech receipt requires current fenced lease at commit
CONTEXT: clubhouse_commentary_commit -> clubhouse_commentary_patch -> clubhouse_commentary_batch
```

The baseline had passed the preceding27 checks. Ignored retained result: `artifacts/commentary-durable/receipt-baseline.json`. This proves the source path; it does not assert which exact action the owner performed in the production503 sample.

## Narrow change and contracts

Additive migration `202610150001_commentary_historical_invalidation.sql` replaces the current local-session-aware canonical commit function from migration8. Its only validator change permits an existing Boolean `valid:true` to become Boolean `valid:false` when every other exposure JSON field is identical. The listening status, job/account identity, claim key, epoch, sequence, audience/heardBy, timestamps, timing and expiry cannot change through this exception. False-to-true resurrection, new receipts and advanced listening evidence retain current lease requirements. Existing room/local owner, lease horizon/epoch, attempt/budget, anti-delete, retention and privileged-grant checks remain in place. Incremental patch and atomic batch still delegate to the canonical validator.

No old migration is edited. Reapplying the new migration is idempotent. No expired lease is renewed and historical actual hearing is preserved.

## Verification

The disposable PostgreSQL harness now exercises both real local Undo and correction after completed playback/expired lease, saved score behavior, preserved completed hearing with revoked factual validity, and negative receipt-forgery mutations. Invalidation combined with changes to sequence, status, account, audience, heardBy, epoch, timestamp, first exposure, expiry, timing or extra fields is rejected. It also rejects resurrection, changed historical hearing metadata and entirely new forged receipts after expiry.

Final `node scripts/test-commentary-durable-db.mjs` passed all33 checks under Node24.19.0 and cached `timescale/timescaledb:2.29.2-pg16`, with Docker `--network none` and synthetic providers. The new Undo/correction check includes44 rejected receipt-forgery mutations. Ignored report: `artifacts/commentary-durable/report.json`; migration SHA256 `7eb104dfec7432209480846dcf6dc283206c058a2c2c297ceac216c0e6f8e22a`. Started `2026-10-15T13:53:46.244Z`, finished `2026-10-15T13:55:18.433Z`. The harness retains all pre-existing authority, accounting, freshness, room/outbox and SQL-race checks. Hosted deployment and exact Pixel qualification remain the coordinator's gates.
