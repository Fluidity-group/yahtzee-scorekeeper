# Commentary personalization and feedback retrieval contract

14 October 2026. Owner steering: roast each player from their own optional blurb; explicit Like/Dislike after speech; retain reported heard commentary and feedback for 90 days; Forget history. This lane implements pure account/privacy/expiry contracts and synthetic tests. No durable database, provider integration or trained model is established.

NEW server/commentary/retrieval-adaptation.js and tests/commentary-retrieval-adaptation.test.js. Fifteen tests pass on Node24/Vitest4.1.11, including a four-player table with host-only audio, caption ratings without invented exposure, strict callback privacy, per-account taste/consent, invalidated facts, exact 90-day expiry and deletion cascades.

## Trusted service boundary

RetrievalAdaptation({now,maxRecords}) is a bounded transient model. UUID syntax is not authentication. Actor IDs must come from authenticated server sessions; audience/target IDs from accepted roster/scoring seat. Resolve source permissions server-side, never trust request-body claimed authorization. No public handler is added here.

- setPlayerProfile(actorId, profile, {sharedGameIds}): owner only, advance personal profile version. Gender/blurb may be skipped, edited or cleared. A host cannot author another player's context. Sharing is explicit per game.
- setPreferenceSharing(actorId, sharedGameIds): owner-authored consent to use controlled taste aggregates in the specified current game. Separate from needing a blurb or gender. Own-account context can always inspect its own aggregates; another actor needs this consent or personal profile sharing permission.
- remember(line, frozenAudience): trusted writer/job hook. Required line fields: id, gameId, eventId, targetAccountId, text, mechanism, premise, subjects, profileVersion, humorIntensity, containsProfanity. Controlled metadata only; no arbitrary private tags.
- exposure(recordId, {status,epoch,heardBy}): trusted reported playback receipt. generated→started→completed/interrupted/failed, one epoch. Only named listeners gain reported exposure. Never infer all roster members heard the host's phone. Native position advancing is a playback proxy, not physical/audience hearing proof.
- rate(actorId, {recordId,rating,basis}): rating like/dislike; basis playback or caption. Playback basis requires that account's reported exposure after terminal speech. Caption basis requires original audience membership and completed/interrupted host speech; it does not add heardBy or qualify callbacks. One replaceable account/job rating; identical retry is idempotent. Missing feedback is unknown.
- context({actorId,targetAccountId,audience,gameId,authorizedSourceIds,profile}): actor/target must belong to current audience. Source IDs are resolved authorized game permissions, not client data. Safe target taste uses only that account's explicit ratings under authorized sources and current sharing permission; it does not require every listener to have heard host audio. Full callbacks still require every current member in original audience, every member reported exposure, compatible current language/intensity and valid facts. Overlap alone carries only controlled avoid-premise tags.
- invalidateEvent(gameId,eventId): removes false-claim callback eligibility without erasing reported exposure or explicit humor feedback.
- purgeExpired(): first started exposure+90 days; feedback does not extend expiry. Deletes expired records/feedback and derived summaries/caches. Unheard generation remains transient operational job data; no durable operational-job retention is claimed here.
- forgetHistory(actorId): conservative deletion of all mixed-audience history involving the actor, associated ratings, all summaries/caches. No score-store access. Explicit authored profile/sharing choices remain separate from learned commentary history and can be edited/cleared separately.

## Writer context and adaptation

Context returns targetAccountId, nameAuthority (game-time-alias-from-facts), permitted personalContext with quotedBlurb and instructionAuthority:none, preferenceWeights, evidence, avoidPremises, cooledMechanisms/cooledSubjects, eligible callbacks and writerPreferences. It never substitutes a mutable profile nickname for accepted game-time aliases, combines other players' blurbs, or infers gender.

writerPreferences is a bounded tag-only projection: likedMechanisms, dislikedMechanisms, likedSubjects, dislikedSubjects, avoidSubjects, ratingsCount. Mechanisms: misdirection/understatement/absurd-stakes/reversal/callback/observational. Subject tags come from controlled metadata; work/hobby/game-night-style project to player-blurb, game-score to score. Lead writer integration must filter further to its own supported controlled vocabulary.

Like contributes +2 and Dislike -3, clamped to ±6 per mechanism/subject. A listener rating a joke aimed at someone else may inform that listener's taste. Negative weights cool techniques/subjects; liked wording/premises still must vary. No automatic intensity, profanity, cadence, gender or other settings change occurs. This is retrieval and explicit preference adaptation, not automatic model retraining. Raw player prose stays quoted data, never command authority.

## Persistence and operational gates

Backend must persist profile/taste consent, reported exposures and ratings transactionally with authenticated ownership/server dates, bind endpoints and expiry, remove stored transcripts/feedback/derived embeddings/audio-context caches on Forget, and invalidate retrieval when permissions or consent change. Actual score transactions remain separate. Context source permissions for full historical quotes must be the current audience's source-game permission intersection. Taste and profile sharing remain owner-controlled.

UI should offer Like/Dislike after terminal speech/caption, send the correct basis without claiming unheard audio exposure, show failures accurately and route Forget to real authenticated deletion. Pure tests do not establish durable retention or deletion, privacy acceptance, complete-game listening quality, or new provider synthesis.

## Transactional rehearsal service integration

The pure contracts are now wired into server/commentary/service.js, in-memory-store.js and handler.js in this isolated lane. State includes transaction-cloned maps for memory records, feedback, profiles/version tombstones, preference sharing, summaries and caches. Each adapter instance binds only the current transaction clone; no mutable memory instance escapes transaction boundaries.

Authenticated POST operations:

- feedback: roomId, jobId, value (like/dislike), basis (playback/caption). Identity comes from authenticated session. accountId/heardBy fields are rejected. Current room membership and original job audience plus terminal reported speech required. Guests cannot claim playback basis. Job projections expose only the requesting account's feedbackBasis/feedbackValue.
- player-profile-read: roomId. Returns only own profile/room consent and CAS version; no other account profile endpoint.
- player-profile-update: roomId, expectedVersion, changes limited to displayName/gender/blurb/shareWithRoom. Owner UUID is derived, independent profile version advances, current-room sharing is explicit; default false. Queue/generation invalidated on relevant personal version change. Deletion retains a monotonic version tombstone to prevent stale create/update ABA races. Frozen game aliases remain unchanged.
- player-profile-delete: roomId, expectedVersion. Removes own raw profile/sharing and invalidates own target queues.
- forget-history: roomId. Requesting account only; cascades mixed commentary history, canonical ratings/exposure, learned records/summaries/caches and derived caption lines across its affected jobs. Score history and budget/accepted-event dedupe accounting remain separate; Forget does not allow paid-event regeneration.

Writer input now receives only the scoring account's explicitly room-shared quoted personal context and controlled taste tags. Feedback authorizes sanitized taste adaptation for this current game; it never shares raw personal profile prose implicitly. Rich learned line metadata is accepted only when recognized; absent/unknown tags yield no fabricated mechanism/subject preferences. Source room memberships are re-read before context selection. Callbacks retain reported-exposure/full-audience rules.

A started receipt now requires server-observed first streamed audio bytes; claimed-but-unstreamed jobs cannot establish speech or enable caption feedback. This is a stronger transport boundary, still not physical audibility proof. Only authenticated host gets reported hearing; caption ratings never add guest heardBy. Invalid score facts can cancel callbacks while preserving prior reported exposure.

Expiry runs inside service transactions: first-start+90 days removes canonical reported exposure and feedback, learned records/derivatives and expired derived captions. Late rating does not extend retention. These are process-memory rehearsal semantics; restart loses all state. No database persistence, deployed authenticated routes or operational deletion acceptance is implied.

Verification: 58 tests pass across existing commentary-service/commentary-handler suites, the 15 pure retrieval tests and 12 new commentary-feedback-service regressions. New service coverage includes spoofed identities, preterminal/stranger feedback, host-only four-player taste, unknown metadata, quoted target-only sharing, monotonic profile deletion/CAS, in-flight writer invalidation, first-byte prerequisite, exact expiry, Forget with unchanged source scores/dedupe, and rollback isolation. No real provider or database call occurred.

## Active speaker lease follow-up

Same-device unexpired acquisition now preserves activeJobId within the current epoch, preventing overlapping second-job claims. Heartbeat checks active job status and current eligibility before extending expiry; canceled/missing/failed active playback is rejected with409, as are profile changes, another listener's Forget, pause, Undo or game change. Eligibility cancellation commits before returning409, so client heartbeat failure can stop native buffered speech. Unrelated accepted scoring keeps an accurate started sentence eligible.

Only an accepted terminal playback receipt clears the active-job fence and allows idle renewal. Lease expiry still rejects subsequent terminal receipts: no completion is fabricated. Reconciliation of an expired started exposure remains explicitly open for a future lifecycle policy.

Updated qualification: 66 tests across the four backend/retrieval suites pass; eight additional regressions cover reacquisition overlap, five invalidation reasons, valid unrelated scoring/accepted terminal clearing and expired-lease non-fabrication.
