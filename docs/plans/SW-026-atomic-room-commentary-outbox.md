# SW-026 atomic accepted room commentary outbox

14 October 2026. Implemented development candidate; disposable PostgreSQL verification only. No live migration, provider dispatch, deployment or Pixel acceptance was performed by this lane.

## Requirement and design

A score must remain independent of narrator latency. Authoritative room CAS, archived game snapshots, durable accepted command receipt and immutable commentary outbox evidence commit in one SQL transaction. Worker preparation/provider dispatch happens after commit. A malformed outbox rolls back all four records. Existing pure scoring and UUID seat ownership are unchanged.

Migration 202610140006_commentary_room_outbox.sql requires rooms/history migration and 202610140005_commentary_durable_state.sql. Backend-only SECURITY DEFINER wrapper with empty search path locks actual prior room, verifies authenticated server-supplied member actor, command fingerprint and expected revision, binds rows to actual room/game/revisions/audience, then calls existing room/history commit and private outbox append. Scope is fixed to d1ce0000-0000-4000-8000-000000000026. Anonymous/authenticated database roles cannot invoke it. The service-role server still must perform Auth and pure transition validation; this SQL wrapper is not a public game-rules engine.

Handler configuration commentary:{openingFacts} activates required atomic capability. Adapter configuration commentaryScopeId uses the fixed internal scope. Missing capability explicitly rejects affected mutations with503; a failed atomic RPC never falls back to ordinary writes. Ordinary unconfigured handler behavior remains covered by existing tests. All configured game commands get durable identity/fingerprint receipts; hardware commands with no score observation carry empty outbox rows. Start gets a stable command ID supplied by the new UI retry transport.

## Exact worker contract

Read clubhouse_commentary_outbox using service role, scope_id and room_id, processed_at IS NULL, created_at ascending. Columns: scope_id UUID, idempotency_key text, room_id UUID, game_id UUID, command_id text, payload JSON, created_at timestamptz; additive processed_at nullable timestamptz, processing_status nullable text and job_id nullable text.

Payload retains top-level pure accepted-outbox fields and adds moment (the immutable pure row), beforeRoom (SQL-locked prior snapshot), acceptedRoom (actually persisted next snapshot), receipt:{room_id,command_id,actor_id,fingerprint}. For next-game only it adds priorGame:{authorized:true,game:lockedBefore.game,accountIds:lockedBefore.member_ids}. The server-locked finished predecessor of the same unchanged roster supplies previous winner context; no unrelated cross-room history is inferred. Worker must revalidate trusted evidence before enqueue and preserve accepted snapshots, never reconstruct a source score from a newer current game.

After durable enqueue, call clubhouse_commentary_ack_outbox RPC with p_scope, p_idempotency_key, p_status enqueued|invalidated|retry and p_job_id (nullable). Enqueued acknowledgement requires a persisted matching job roomId, facts.gameId and facts.commandId; it occurs before provider dispatch. Invalidated applies only to invalidation rows after durable cancellation. Retry remains pollable. Repeated matching terminal acknowledgement is idempotent; conflicting acknowledgement returns false. Execution is backend-only, direct client writes remain denied. Worker handles crashes between enqueue and acknowledgement through accepted moment dedupe, never duplicate provider dispatch.

Fresh accepted lifecycle responses expose acceptedCommandId and acceptedRoomRevision. Persisted room.commentaryLifecycle is computed server-side inside SQL from the accepted lifecycle outbox row: {commandId,purpose,acceptedRoomRevision,gameId}. Hydration/replay has no fresh acceptance response marker. UI may allow the real matching job only following a direct accepted start/resume/last-ready response or continuous known transition, never initial read/reconnect. No fabricated greetingJobId or provider wait is added to scoring.

## Evidence and remaining integration

Focused Vitest suite:77 tests passed across room authority, Supabase adapter, durable adapter and new atomic handler tests. Twenty-three actual disposable PostgreSQL16 checks passed on the final recorded migration revisions. The cached runner exercises real room/history/receipt/outbox rollback, start dedupe/collision, immutable snapshots, durable-job acknowledgement and previous winner evidence. Exact hashes/check results are in ignored artifacts/commentary-durable/report.json; runner scripts/test-commentary-durable-db.mjs. Fixtures are synthetic, no provider or physical proof.

Root must wire edge openingFacts/scope, durable service/worker, outbox polling/acknowledgement, expiry scheduling and fail-closed provider limits, then run configured source/build gate and independently qualify authorized live/Pixel state. No deployed state or POC acceptance is inferred here.

Manifest: server/rooms/handler.js; server/rooms/supabase-adapter.js; supabase/migrations/202610140006_commentary_room_outbox.sql; tests/commentary-room-outbox.test.js; scripts/test-commentary-durable-db.mjs; this plan. Pure accepted-outbox.js is the tooling expert's authoritative copy; opening-facts.js is the lead's authoritative shared builder, not lane-owned edits.
