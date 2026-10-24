# SW-036: next-audio preparation design and latency boundaries

Date: 15 October 2026. Author: delegated commentary architecture agent. State: designed/proposed only. No executable edits, provider calls, migration, deployment or physical listening test performed in this lane. Current source baseline: SW034 executable `3775a14e80b474e7466caf27c573b667ddb8c245`; SW036 receipt/playback repairs are tracked separately by the lead.

## Decision for the current repair

Retain direct HTTP progressive MP3, Rachel, the configured writer model, accepted-fact validation and prepare-text-during-speech. Repair transactional receipt handling and lost scheduling transitions before adding another audio lifecycle. Actual next-audio preparation requires a new authority/storage contract; claiming the next speaker early is not a safe shortcut.

Inspected implementation: `server/commentary/service.js`, `provider-runtime.js`, `endpoint.js`, `durable-store.js`, provider-dispatch SQL, `src/commentary/client-controller.js`, `latency.js` and native Media3 configuration. The ready-audio critical path includes atomic claim/reservation, durable provider-dispatch authorization, ElevenLabs first bytes and a fresh first-byte fenced database batch. The persistence and allowance checks in endpoint provider composition are already local checks. No redundant database phase was identified that can be removed without changing the authority contract. Native initial playback buffering is already 200 ms; reducing it blindly risks rebuffering.

Current ahead-of-time preparation writes a complete validated line, not audio. TTS dispatch requires a streaming job linked to the current owner/device/epoch lease. A Media3 preload manager cannot bypass this requirement.

## Proposed next-audio protocol

1. Maintain one current speaker and one newest waiting preparation slot. An accepted score can prepare while current native speech is genuinely started; hydration/resume alone cannot trigger generation.
2. Introduce a durable synthesis capability separate from a speaker claim. Bind it to owner, device, game/event, authoritative facts/dependencies, audience, commentary version, player-profile version, voice/model, validated text digest and expiry. Recheck accepted facts, supersession and settings when reserving it. Preserve the existing administered request/character ceilings and durable exactly-once provider attempt.
3. Synthesize only the current valid waiting line into private immutable bytes. Store with a strict size cap and short TTL. A synthetic start/download must not produce an exposure receipt or occupy the active speaker lease.
4. Actual playback atomically revalidates eligibility and obtains the normal current speaker claim. It can then consume the prepared bytes through authenticated access. No public/permanent audio URLs; no additional readiness handshake on the critical path.
5. Cancel or discard prepared material after supersession, Undo/correction, profile/voice change, revoked sharing, device/session change, backgrounding, Forget or expiry. An interrupted transport or a Media3 reopen/seek cannot create another paid synthesis attempt.
6. Only native position and terminal callbacks establish started/completed/interrupted exposure. A downloaded clip is not heard speech. Background/focus/epoch checks continue to stop output, and scoring remains independent of every preparation failure.

This requires reviewed SQL authority transitions, private storage lifecycle, endpoint changes, client coordination and native replay/cancellation tests. It is not implemented by the current reliability patch.

## Measurable phase definitions

Use monotonic timestamps within each client process and numeric opaque correlation IDs. Do not derive precise device elapsed time by subtracting device and server wall clocks.

| Phase | Definition | Evidence boundary |
|---|---|---|
| Total user wait | Local score submission to first native playback-position callback | Includes save/sync, current speech occupancy, preparation and transport; this is a proxy for audible sound, not microphone verification |
| Observed-event wait | First authoritative event observation to first native position | Keep separate when the submitting process is not this device |
| Speech occupancy | Waiting target becomes queued until previous actual terminal callback | Sequential speech has intentional occupancy; do not blame provider inference |
| Preparation | Real preparation request dispatch through complete validated-text readiness | Report queued-before-dispatch time separately; a failed/cancelled preparation is not ready |
| Terminal acknowledgement | Previous terminal callback to its accepted authoritative receipt | Expose failure separately; a swallowed rejection cannot authorize next speech |
| Handoff | Prior terminal acknowledgement and preparation both settled to native stream request | Overlapping prerequisites are not summed as if serial |
| Native startup | Actual native stream request to first native position | Includes server work/network/buffering; excludes prior speech queue |
| Server stages | Authentication, snapshot/batch, dispatch authorization, writer, voice headers/body, first-byte validation | Server-local monotonic durations; provider header timing is not full generation or listening time |
| Native output | Focus, first response/binding, first byte, ready, first position, terminal | Never infer playback from binding or ready alone |

Existing `react()` logs its request stage before awaiting preparation; rename/distinguish that coordinator stage before interpreting it as actual native dispatch. Existing score total and native-position timing remain useful. Scores arriving during a connecting stream need an explicit wake-up on real started, or they can miss the text-preparation window and take the cold path.

## Verification and stop conditions

First use fake clocks and synthetic bytes. Cover score-during-connecting, score-during-speaking, rapid replacement, delayed/failed terminal acknowledgement, Undo during writing/prepared/playing, settings change, foreground changes, stale completion, device contention, stream reopen and expiry. Assert at most one speaker, at most one newest preparation, no duplicate paid dispatch and no synthetic hearing. Existing receipt lease/identity/sequence protections remain mandatory.

For any later paid/device trial retain an applicable administered allowance and exact source/backend/APK identity. Compare cold welcome, idle score, connecting-score and speaking-score separately. Record every failed sample as well as successes; no percentage speed claim from unmatched cases. Physical owner listening acceptance remains separate from request traces.

Stop and keep the previous qualified build if any candidate permits overlapping speakers, duplicate synthesis, stale/profile-incompatible audio, public audio disclosure, fabricated exposure, scoring blocked by commentary, new stuck startup, or authority checks weakened to meet latency targets. No automatic paid retries or prewarming to satisfy cache thresholds.

Prompt caching is deferred for this repair. [Claude documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) lists a 4,096-token minimum for Haiku 4.5; the existing stable editorial prefix is shorter. Do not pad it or silently change the model. If a future configured model qualifies, cache only the unchanged editorial prefix, measure actual cache-read tokens and preserve private target facts outside that prefix. No cache benefit is claimed here.

## Completion

Architecture/source review complete; implementation and physical acceptance of this proposal remain open. Current SW036 reliability work should explicitly describe text preparation as text preparation, with future audio preparation recorded as this separate protocol change.
