# SW-031: Reduce commentary round trips and stale speech queue

14October2026 America/Chicago. Product owner user; lead/reviewer Codex (self-review only). State: implemented, focused verification underway; deployment/physical acceptance not yet established. Software G2 qualification, no hardware change. Isolated branch codex/sw031-commentary-roundtrips from a979350/SW030 executable20fd90a. Main root's unrelated changes preserved.

## Problem and acceptance

SW030 byte reductions did not resolve owner latency:15.279second score startup and25.240second subsequent acceptance→receipt. New actual request logs identify repeated RPCs plus13.1second speech queue. Owner explicitly requests continuing the fix. Retain model/voice/humor, score independence, optional blurbs, original account/seat authority, Undo/profile/pause/age checks, immutable jobs, fenced playback and existing200writer/200voice/36,000spoken-character allowance and expiry. No new paid diagnostic request planned.

| Requirement | Observable verification | State |
|---|---|---|
| Fewer sequential operations | Actual endpoint with synthetic transports uses one snapshot+one atomic batch for ready polling/acquisition; audio first byte uses no more than3snapshot loads/3batches and one provider reservation | Focused passed |
| Fresh authority | SQL rejects changed hosted-room revision or commentary version; retry re-runs all guards on fresh state and retains replayable request body | Focused/real SQL passed |
| Paid dispatch follows durable validation | One atomic dispatch RPC preserves room/global ceilings, job/attempt/stage/profile/lease checks; failed batch cannot provision allowance or call provider | Focused/real SQL passed |
| Relevant reactions | Newest accepted score supersedes older unspoken pending/generating/ready jobs; older revisions cannot silence newer jobs; claimed/current speech remains intact; next refresh immediately on terminal callback | Focused passed |
| Safe audio sequencing | Construct/open the audio stream only after request batch commits; first-byte and periodic validations remain | Focused passed |
| Qualified delivery | Clean Node24 configured gate, actual SQL migrations, source/APK/readback, data-preserving Pixel update | Pending |
| Audible improvement | Fresh owner Pixel score→playout samples, separate score-submission and accepted-observed baselines; no byte/RPC benchmark represented as sound latency | Open |

## Design and impact

Durable store batches pure service operations on one database snapshot. Every existing authentication/service guard still executes. A service-only SQL batch locks all authoritative hosted room rows in stable order, checks their exact revisions and the commentary version, and delegates changed records to the existing canonical patch/commit validators. Read-only batches check freshness without advancing the version. Uncommitted state never populates the warm snapshot cache. Collisions re-run the callback before providers can dispatch. Local mirrors remain protected by global CAS/immutable owner, separate from Auth seats.

Provider dispatch and result recording move into narrow SQL operations rather than JS read→load→patch sequences. Dispatch locks scope, validates existing server allowance/room limit, stage, attempt, profile and TTS lease, applies fixed global ceilings and commits through canonical patch. No client enqueue/provider API or new public grant. Metadata completion cannot refund counts or fabricate listening. Schema additions are compatible with SW030 rollback.

Accepted-score queue coalescing keeps newer revisions and avoids collecting a sequence of stale jokes. Explicit lifecycle greetings remain separate; in-flight paid attempts may finish but superseded lines are not spoken or counted as heard. Client selects newest waiting score, suppresses older ready reactions and polls immediately after current terminal callback. No change to voice speed, speech buffer or accepted scoring commands.

Research carried forward from SW030: [PostgreSQL row locking](https://www.postgresql.org/docs/17/explicit-locking.html), [Supabase regional execution](https://supabase.com/docs/guides/functions/regional-invocation) and [structured logs](https://supabase.com/docs/guides/functions/logging). Actual edge regionus-east-1, databaseus-east-2. No guessed regional pin or protection removal.

Risks: incorrect batch fences/retry could expose stale state or duplicate paid work (high; actual CAS/grant/lease/cap tests, canonical commit delegation); queued reactions could interrupt speech or drop welcome (medium; claimed/lifecycle exclusions and client regression); migration mismatch could break live voice (medium; additive rollout before backend, exact readback and compatible rollback). Physical sound/owner humor quality remain acceptance gates.

## Evidence so far

87 focused service/endpoint/client tests passed. Actual PostgreSQL30checks passed, including new room revision fencing, last global writer slot/single dispatch and TTS lease/character ceiling. Synthetic actual endpoint audio-first-byte counts:2conditional loads+2atomic batches+2room/resource reads+1provider dispatch versus prior live7loads+4patches+3resources. Ready polling/acquisition:1load+1room read+1batch instead of5loads+2room reads (poll) or4loads+1room+1patch (acquisition). Synthetic elapsed times are not a live latency claim. Isolated artifacts/sw031/request-count-benchmark.json and artifacts/commentary-durable/report.json. Full qualification pending.

## Completed delivery

Clean80393ca59beed3a0a60c8fc9ae6c49c1893425c2 qualified1,004tests/13optionalcamera skips/all builds/unchanged source; actual SQL30checks. Further UUID/map-order chronology defect fixed and tested; terminal receipt barrier prevents periodic polling from claiming next line before lease release. Migration10/11 applied with unchanged17rooms/19games/fingerprints and existing private permissions; commentaryv7 readback matched/unsigned401. Pixel exact APK8dd95919f8cf59126725ccd83bd335dc5773107d6f23e19fc9173f5eea100b72 installed-r/readback/launch verified after reconnect;38assets matched. No paid diagnostic generation or public web publication. [Full release/rollback](../releases/SW-031-commentary-roundtrips.md). Physical post-fix latency remains owner acceptance; earlier15–25second measurements describe SW030, not this release.
