# SW-026 draft: authenticated durable live-commentary service

14 October2026; coordinating owner Codex lead; author tooling/backend expert lane. State: proposed architecture, no implementation/migration/deployment/provider qualification. Scope softwareG1; no G1/G2 acceptance claimed. Reviewed lead integration at C:/Users/Fluid/.codex/worktrees/poc-s01-commentary/Yahtzee Game; source patterns server/rooms/{handler,supabase-adapter,edge}.js, src/multiplayer/room.js, src/commentary/{facts,jobs,profiles,memory,player-profile}.js, existing hosted-game transaction SQL. Lead reports combined680-test baseline; not rerun by this design review.

## Purpose and bounded first implementation

Implement accepted hosted manual score→authenticated durable commentary moment→one server-side candidate→authenticated host playback ownership. AI never changes scores or commands. Production generations disabled until exact voice/model credentials and explicit bounded paid allowance are available. Invalid ElevenLabs credential does not block synthetic service/adapter tests. Fresh-POC scope needs no legacy score migration/backfill or historical event replay. Existing service architecture can be reused without retaining legacy two-seat/name-keyed commentary.

User intent: premium touch UI, actual opponent/player names, Dark humor, profanityOn, frequency selectable; optional voluntary gender/blurb. Settings govern table humor independently of account identity. Optional personal data must not acquire durable server persistence until an explicit scope/retention policy is approved. No retention period is selected by this draft.

## Observed gaps

- roomHandler authenticates confirmed non-anonymous UUID through adapter and enforces membership/current revision/current game before playRoom; pure game commands stay in src/game. Hosted commit RPC already locks room and atomically writes room, accepted game snapshot, readiness receipts. Do not bypass it with an unauthenticated caption endpoint.
- CommentaryJobs/ExposureMemory are Map-based rehearsal contracts, not a durable queue, lease or authentication layer. Facts capture exact accepted command snapshot and dependencies, then tolerate unrelated future revisions while rejecting changed source claims.
- acceptedFacts currently labels PlayerA/etc despite new actual-name UX decision. Writer-facing name must come from frozen game.player name/room membership, escaped and quoted as user data; IDs own authority. Account player-profile module validates optional inputs but does not persist them.
- Profiles/frequency currently lack server-authoritative table storage; fixture profanity compatibility is not a production classifier. Never ship containsProfanity:boolean supplied by a browser as a safety guarantee.
- Vite-only legacyTTS whole-buffer proxy is not the hosted service. Runtime/server boundary, service secrets and streaming client integration are new work.

## Proposed authority and interface

Use separate authenticated commentary handler/routes, sharing confirmed-user authentication implementation but no game-command entry point. RPCs service-role only, RLS enabled, no client writes to jobs/budgets/lease/exposure; membership-filtered reads either through handler projection or explicit RLS. Client obtains only caption/job status/provider-neutral audio stream. Never return API keys, raw provider errors, writer prompts/private-memory context or service-role credentials. Validate bounded payload sizes, UUIDs, event text IDs, request IDs, profile/version numbers. Clients cannot choose arbitrary provider text, arbitrary voice IDs or facts.

| Operation | Required authority | Atomic effect / result |
|---|---|---|
| profile-read | current authenticated member | safe versioned table settings; no other-account gender/blurb |
| profile-update | authenticated current host, settings revision CAS | bump table profileVersion; cancel incompatible waiting/current playback; source settings are server-authoritative |
| jobs-read | authenticated current member, room/game | bounded current-game caption/status projection; hydration does not enqueue/replay |
| playback-acquire / heartbeat | authenticated host account plus random installation/session nonce | one table-wide monotonically fenced epoch, DB-time expiry; returns lease, never authority over score |
| playback-claim | current host account/device/epoch and unexpired lease | verify eligible job under current game/profile/pause/fact validity, set start token for this job+epoch |
| audio | matching claim token plus authenticated host/epoch | provider call is internal; no arbitrary text; stream bytes through authenticated server |
| playback-event | same host/device/epoch/job token | idempotent started/completed/interrupted/failed lifecycle receipt, bounded monotonic sequence; DB time recorded |
| feedback | authenticated account with valid exposure basis | one Funny/Missed/TooFar rating per account/job; host cannot vote for everyone |
| forget-history | only requesting account | detach/delete authorized commentary derivatives; never alter scores/history; feature remains gated by approved persistence policy |

Host-only local speaker is proposed firstPOC playback. Guests still see eligible captions. Host account can use multiple devices but only one live fenced lease can play. Background, sign-out, lease loss, pause, settings change or game switch clears queued audio and aborts current playback. Lease stealing increments epoch; stale heartbeats/acks cannot prolong or finish a newer owner. Client clock never extends server expiry. Proposed lease intervals/max age/cooldown are configurable experimental numbers, not accepted physical thresholds. Do not silently hand speaker authority to a guest while host is offline; caption-only fallback until an explicitly defined transfer capability exists.

## Durable accepted moment / outbox

Extend the existing trusted hosted commit boundary only through lead-owned integration. On successful score transition, compare prior/next accepted events, capture exact next immutable snapshot facts before newer commands can race, and atomically append one outbox moment with room/game/command identifiers. Writer/provider work never executes inside scoring transaction. Returning an idempotent command receipt does not append again; history reads, list/read/hydration and paused return do not create moments.

Proposed durable tables (names/design subject to local disposable-DB proof, not created here):
- clubhouse_commentary_settings: room PK, version, intensity/profanity/frequency, provider routing configuration identifiers. No personal blurb/gender initially.
- clubhouse_commentary_outbox: room/game/acceptedCommand PK, acceptedAt from server-authoritative command time, ordered acceptedEventIds, acceptanceRevision, facts JSON+schema/hash, frozen audience UUIDs, selected primaryEventId, enqueue state. One selected moment per accepted command prevents score+bonus+completion from creating overlapping speeches. Pure director picks consequential priority; facts retain all grouped dependencies.
- clubhouse_commentary_jobs: moment uniqueFK, profile/prompt/director/model/voice versions, status, freshness deadline, candidate text+controlled tags/hash, cancellationReason, generation lease/token, attempts, audio attempt references. Profile change cancels incompatible original job; never creates an automatic second paid job for the same moment.
- clubhouse_commentary_attempts: attempt UUID PK, job/stage, reserved/submitted character and writer token ceilings, state submitted/succeeded/failed/unknown, provider request ID if safely available, model/voice, first-byte/completion/bytes. No key, complete upstream response or unrelated personal data.
- clubhouse_commentary_budget: approved bounded scope/account/table counters with explicit expiry and maximum attempts/characters/estimated credits; atomic reserve/check RPC.
- clubhouse_commentary_playback: room PK, host account/device nonce, epoch, DB-time expiration, activeJobId.
- clubhouse_commentary_exposure: job/playback epoch/receiptSeq unique, state/time, reportingAccount; audience source/ack evidence, partial exposure, factual invalidation independent of prior listening. Operational/session-only first implementation; long-lived retrieval gated.

SQL commit addition must validate moment references accepted command/event/snapshot and existing room membership; trusted facts created server-side, never accepted from browser. Failure semantics must be explicit: mandatory small outbox persistence shares the commit transaction so an actual database failure rolls back acceptance; it does not wait for AI/voice. Commentary schema deployment must precede capability enablement. Before capability enabled, ordinary scoring uses unchanged commit behavior. A malformed commentary configuration should result in silent/quarantined moment through validated defaults rather than poisoning otherwise valid scoring; test transaction rollback and silent branch. No per-score provider or background task failure propagates to score UI.

## Durable processing and streamed voice

Choose DB-backed explicit outbox/job state initially, with claim RPC using row locks/SKIPLOCKED and fenced worker token; SupabaseQueues/pgmq can supply transport later but delivery visibility does not guarantee exactly-once external billing. Optional waitUntil can wake work quickly after score response, but DB polling/scheduled worker is recovery authority after process loss. Do not rely solely on request-scoped background promises.

Lifecycle: pending→claimed→candidate-ready→playback-claimed→started→completed; alternate silent/cancelled/failed. Writer andTTS submitted attempts persisted separately before network dispatch. At worker claim revalidate source facts/current profile/pause/age; commit candidate by matching worker token. After lease timeout, a crash before provider completion is unknown, potentially billable. Retry only under remaining explicit attempt/usage reservation; no exactly-once provider charge guarantee. Reuse persisted candidate onTTS retry instead of rewriting another joke. No empty/incomplete captions; size/profanity/grounding validator can choose silence rather than clipping a punchline.

For first streamingPOC, generateTTS only when an authenticated current host playback claim exists; caption/candidate can be ready sooner. Provider call initiated server-side after durable budget reservation, and audio bytes flow through response without arrayBuffer()/blob() whole-clip buffering. Stream-open is not exposure-started: Android reports actual playback onset/completion/interrupt; server claim status alone means only a transfer was allowed. Completed playback is not evidence of laughter or hearing by every guest. A response disconnect/lease invalidation aborts upstream if possible but never refunds an unconfirmed submitted provider attempt. Prevent parallel retry endpoints from making a second provider call for one claim token.

Measurements: acceptedAt→writer submit/complete; TTS submit→HTTP first nonempty byte; host received first byte→actual Android audible onset; complete/interrupted. Writer/provider IDs exact; cold/warm/network/config/build identities retained. This architecture does not claim proposedp50/p95 listening targets achieved. No premature cache retention or public signed MP3 URL; asset storage/reuse needs the same explicit retention policy and authenticated access/expiry.

## Cancellation, fact validity and privacy

- Undo/correction invalidates any waiting/current utterance whose factual dependencies changed, including leaderboard/final-win claims. Unrelated normal revision increments permit a still-correct sentence to finish. Profile incompatibility, pause, current-game change and epoch loss cancel. Cancellation invalidates callbacks without erasing prior started/interrupted exposure.
- Hidden totals forbid leader/tie/winner totals in writer context/captions/audio. Category scores visible only under product disclosure contract. Names are actual frozen aliases; never guess gender from a name. Player blurb is quoted untrusted data without instruction authority and may not enter shared writer context without scoped permission.
- Cross-game memory initially disabled beyond in-session/synthetic interfaces. When policy chosen, authorize each sourcegame/account and original audience; overlap allows controlled avoid-premise tags, not private transcripts or personal facts. Feedback never infers laughter or auto-enables profanity/increases darkness.
- Remote speaker cannot assert all room members heard a line. FirstPOC can record reporting host exposure and expected room audience separately. Audience confirmations need explicit on-device acknowledgments or declared listening context; full private callback reuse cannot rely on inferred heardBy.

## Local acceptance / regression plan

| Requirement | Observable synthetic/local criterion | Evidence / state |
|---|---|---|
| Auth / source ownership | nonmember/guest/wronggame/wrongrevision cannot enqueue, mutate profile, claim/play/ack; scoring core unchanged | proposed tests |
| Commit durability | accepted snapshot+outbox atomic; concurrent duplicate command exactlyone moment; crash aftercommit recovered; failedscore no moment | disposable local DB proof required |
| Budget bounds | two workers/racing audio claims cannot overspend; failed/timeout/unknown attempts consume ceiling; no paidcall without configuration andallowance | fake provider / parallel adapter tests |
| Playback lease | same host two devices race exactlyoneepoch owner; expiry/reacquire fence stale heartbeats/completedacks; background abort | fake clock/session tests, later phone |
| Validity | Undo dependent utterance cancels, unrelatedscore permitsfinish; pause/profile/gamechange cancels; hydration silent | pure+handler tests |
| Exposure | started≠completed, interrupted remembers partial exposure; unknownaudience never becomesheard; report idempotency | pure+handler tests |
| Provider boundary | no arbitrary browsertext/providerURL/key; sanitized errors; firstchunk exposed beforefullclip; explicitbyte/time caps | injected stream tests |
| Retention | no personal serverpersistence orcrossgame retrieval until policy; reset does not changegame | source/adapter inspection |
| Gate | Node24 configured suite and web/native/room builds source unchanged | implementation phase, not run here |

## Suggested agent/file ownership and rollout

Lead integration lane: server/rooms/handler.js, adapter commit boundary, capability presentation, any generated game-room bundle and shared architecture/docs. Sequential integration only.
Backend expert lane: NEW server/commentary/{handler,service,store-contract,in-memory-store,supabase-adapter,worker,edge}.js and tests/commentary-{service,handler,adapter}.test.js; later dedicated SQL migration drafted only with explicit assignment, disposable schema qualification before deployment. No score-core changes.
Voice/native expert lane: NEW authenticated streamed client/Android player, lifecycle/first-audible evidence; no shared room-store writes or server keys. Existing caption/UI preference integration coordinated with UI owner.
UI expert lane: settings/recentcaption/feedback drawer and actual-name rendering; centered touch dialogs remain; no inferred scores or exposure.

First reversible next step can implement provider-neutral synthetic service+in-memory transactional test adapter with allauth/leases/budgets/cancellation contracts. Then local Postgres schema/store and authenticated Edge wrappers. Then authorized provider audition/actual Android streaming. Live migrations/deploy/install remain separately authorized and identified. No personaldata persistence or historicalbackfill during synthetic phase.

## Decisions before each dependent stage

Lead can choose reversible engineering details: DB outbox rather than onlywaitUntil; fenced worker and host leases; no automaticgeneration on hydration; false-positive-safe silence; fake provider offline tests; profileupdate CAS/hostauthority as firstPOC proposal. Confirm host-only speaker behavior as product review if hostfailover needed; do not block synthetic service while that is open.

Owner decisions required before live/provider/personal-memory execution: exact voice/model and capped paid allowance; credential readiness; personalgender/blurb sharing/persistence consent and retention/deletion policy; operationaljob/audio/exposure retention (no fixed duration inferred); POC listening/latency criteria; deployment/deviceauthorization. Current credentialinvalid and unknown provider billing block actual provider qualification only. Caption-only/live synthetic tests can progress.

Primary research: [Supabase backgroundtasks](https://supabase.com/docs/guides/functions/background-tasks) are runtime-limited, so durable recovery must be DB-backed; [SupabaseQueues](https://supabase.com/docs/guides/queues) supports Postgres visibility windows but external sideeffects still need idempotent accounting; [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) defines client isolation while service-role paths require explicit server checks; [functionlimits](https://supabase.com/docs/guides/functions/limits) must bound each worker/stream invocation. These are design inputs, not deployed feasibility evidence.

Completion: read-only source/researchreview and this proposed contract/fileownership only. No migrations, game mutations, synthesis, credentialread or deployments in this lane. Named lead/owner review and implementation assignment remain open.

## Synthetic implementation addendum — 14 October 2026

Implemented new rehearsal-only server/commentary/service.js, in-memory-store.js and handler.js plus service/handler regression suites. This is not a durable Supabase service, live worker, or room-commit integration. Real atomic acceptance/outbox, account/global budget scope and SQL/RLS remain future implementation. Only per-room in-process counters implemented; process restart loses jobs/attempts/leases/counters. Do not enable paid providers with this store.

Service APIs: getProfile/setProfile(host settingsCAS); enqueueAccepted(room,eventId) and prepareTrusted(jobId) INTERNAL trusted-server-only; acquire/heartbeat; list; claimPlayback; playbackEvent; audio. Injection: authoritative getRoom, confirmed-user authenticate, clock, randomID, bounded budget and optional syntheticProviders. No live/provider key support. Providers disabled by default; profile-read returns capabilities.providerMode disabled/synthetic and liveProviders:false. Optional player gender/blurb never enter writer input; personalContext:null. Names now actual frozen game aliases, metadata instructionAuthority:none/nameSource:frozen-game-alias; seatLabel remains separately stable. JSON data boundary tested with prompt-like alias and name collisions; UUIDs remain ownership.

POST route operations: profile-read/jobs-read {roomId}; profile-update {roomId,expectedVersion,changes}; playback-acquire {roomId,device}; playback-heartbeat {roomId,device,epoch}; playback-claim {roomId,jobId,device,epoch}; playback-event {roomId,jobId,device,epoch,claimToken,status,sequence}. All include operation, responses {result}. Unknown/client facts/text/provider fields rejected. GET /commentary/<roomId>/audio/<jobId> requires JWT plus X-Commentary-Claim, X-Commentary-Epoch and X-Commentary-Device; no query parameters. One consumed audio claim cannot pay again via retry. Native/client lanes agreed this transport.

Safe jobs projection: id,gameId,eventId,acceptedAt,dependencyEventIds,status,caption,reason,profileVersion. Lease: owner,device,epoch,expiresAt. Claim: claimed:true,token or claimed:false,reason. Player account IDs and private writer facts absent from jobs projection.

Synthetic tests cover authentication/host authority, CAS races, trusted command idempotence, rollback, duplicate worker/audio dispatch, writer failure/timeouts, pre-dispatch request/character reservations, stale lease/receipt epochs, incremental first chunk, total/first-byte deadlines, Undo/profile/pause/game cancellation, unrelated revision continuation, host-only exposure and completed-history factual invalidation. Actual byte cap bounds transferred audio bytes; decoded duration not measured. HTTP first byte/complete does not prove audible onset. Started/completed receipts are client reports, never proof every guest heard a line or enjoyed it.

Writer injected synthetic only. ElevenLabs credential alone does not supply the AI writer; future server-only Anthropic adapter/configuration and writer credential/capped usage are separate gates. Browser-held legacy writer secret, random personas and fake-statistics prompt intentionally excluded. No migration/deployment/network/secret access for this implementation.

## Owner voice / explicit cadence integration — 14 October 2026

Owner selected Dark/Victor as default; Ditzy remains selectable. src/commentary/profiles.js now accepts only voiceOption victor/ditzy with defaultvictor, independent intensity/profanity/frequency. Version increments fence pending previous-voice jobs. Server-only voice-routing.js resolves those options to the two owner-provided IDs; no arbitrary ID/URL/text can be routed. Browser profile holds only symbolic option. Source-boundary regression checks routing/IDs absent from app src.

createCommentaryService now requires an explicitly injected valid profile/cadence; no constructor choosesbalanced for a table. Tests inject balanced as a named synthetic fixture. Profile-read/update includesvoiceOption; profile-update whitelist includesvoiceOption. Synthetic stream provider receives server-resolved voice; capabilities.liveProviders remainsfalse. This does not enable actual ElevenLabs or AI writer.

Six additional tests cover option validation, intensity/cadence independence, explicit cadence requirement, voiceCAS races/cancellation, server resolution and client source boundary. Lead owns shared UI settings update; this lane made no shared UI edits. Existing4clip paid audition allowance is exhausted; zero new provider calls or credential access.
