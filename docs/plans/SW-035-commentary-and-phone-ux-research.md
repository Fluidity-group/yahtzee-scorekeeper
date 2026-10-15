# SW-035 expert research: live commentary and smartphone UX

14 October 2026. Research only. Owner request: check current failures and research existing web/GitHub code that could improve live commentary, the game and touch UX. This report does not establish a fix, deployment, physical listening acceptance or independent qualification. No provider requests, installs or executable source edits were performed for this research.

## Evidence and scope

Read repository AGENTS instructions, live-commentary skill, current status/memory and the original commentary handover. Inspected the isolated SW034 source in `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`: Media3 is already pinned to 1.11.1; native direct reactions, accepted-event preparation during speech and five-second active-lease heartbeats exist. Discovery polling remains only in the compatibility player path. Therefore replacing an old polling design or adding a generic audio library would miss the installed architecture.

The parent investigation supplies current read-only samples: preparation approximately 3.8–4.4 seconds, writer approximately 2 seconds and ready-reaction response headers approximately 0.7 seconds. Fresh SW034 welcome completed. One prepared score took 2,349 ms native request-to-position and 7,717 ms score-submission-to-position; a cold score took 6,756 ms native and 8,419 ms total. Prepared server first-byte was 1.623 seconds with two snapshot/two batch phases and no writer. These are request/native-position proxies, not physical hearing or a new benchmark performed by this researcher. Status records earlier startup races and much longer queued samples. Keep cold welcome, idle score, score during speech and rejected request cases separate.

The parent correlated a later local-command 503 with PostgreSQL exception `Speech receipt requires current fenced lease at commit`. A possible cause under source investigation is historical completed-exposure invalidation during Undo being treated as a new live receipt after its lease expired. This remains a hypothesis until the parent reproduces and verifies it. It is a separate transactional invariant defect; no transport or animation library repairs it.

The main opportunity is reliable orchestration and smaller coordination overhead. Existing HTTP audio streaming and prepare-ahead are sensible. The research does not show a library that would automatically repair a rejected local command or a missed startup transition.

## Prioritized decisions

| Priority | Recommendation | Why and adoption boundary |
|---|---|---|
| P0 | Keep one event-driven playback owner and make its transitions explicit | Model setup, greeting, preparing, ready, playing, awaiting receipt, unavailable and disposed. Every request settles; every welcome has a scoring escape. This addresses the class of recent races without introducing another transport. |
| P0 | Keep current HTTP MP3 streaming and prepare the next complete validated quip during speech | ElevenLabs recommends HTTP streaming when all input text is available. WebSocket chunk scheduling can itself delay short input. No provider/voice rewrite justified by present measurements. |
| P0 | Separate user wait, speech queue wait and active processing in logs | A new library cannot make two voices speak sequentially in less time than the current line lasts. Measure accepted score to preparation, readiness, previous terminal receipt, stream binding, first byte and native position. |
| P1 | Prototype one-item native preloading only after measuring remaining handoff gap | Media3 has existing preloading facilities and sample code. Current preparation writes text; preloading audio needs a separate bounded preparation permission and fresh playback authorization. It cannot consume the only active voice lease prematurely. |
| P1 | Measure Claude prompt-prefix caching | Stable editorial instructions can be cached independently of current target/facts. Log actual cache reads before claiming improvement. Do not pad prompts or prewarm paid requests merely to satisfy a token threshold. |
| P1 | Add stage-aware, nonblocking commentary UX and tactile scoring feedback | Make accepted scoring feel immediate. Show meaningful commentary progress unobtrusively, with immediate Skip/Mute; never disguise delays with a fake speaking waveform. |
| P2 | Use SSE for optional status/guest captions only if needed | Authenticated push may replace a future status poll. Current native audio already starts directly; an extra SSE readiness step would reintroduce a handshake. |
| P2 | Use a small animation library only when existing CSS/DOM animation becomes hard to coordinate | A framework migration is unnecessary. Preserve score-dialog position, touch targets, reduced motion and legibility. |

## Verified primary sources and reusable code

### 1. ElevenLabs: keep the streaming protocol appropriate to complete quips

[Official latency guide](https://elevenlabs.io/docs/api-reference/reducing-latency) recommends Flash, progressive streaming and measuring geography/voice tradeoffs. Its 75 ms figure is inference, not phone latency. HTTP streaming is recommended for complete input; WebSockets suit incremental text and can wait for a configured text threshold.

Fit: retain Rachel/Flash 2.5 and existing incremental HTTP MP3. Do not switch voices or speak unchecked Claude tokens to chase a benchmark. Provider service/voice rights remain governed by the existing account agreement, independently of SDK licensing. Improvement here is an inference until matched phone samples show it.

### 2. Media3: preload with the player already in use

[Android preload guide](https://developer.android.com/media/media3/exoplayer/preloading-media/preloadmanager) describes `DefaultPreloadManager` and a customizable base. [Official AndroidX repository and short-form demo](https://github.com/androidx/media/tree/release/demos/shortform) provide code; repository license is Apache-2.0. This is already the application's player family, not a new playback stack.

Prototype one newest waiting item, with bounded memory and cancellation. Verify pinned-version API compatibility before copying current examples. Do not let a preload imply started/heard, claim the active playback lease or bypass Undo/settings/foreground validation. A data source may reopen or seek; provider synthesis must remain once-per-attempt. Prepared bytes need private storage, expiry, deletion and audience/profile binding. Retain first-byte checks and revalidate before making prepared audio audible. This requires protocol work; dropping a manager into the present claim-bound stream is unsafe.

### 3. XState: narrow orchestration model, not a whole-app rewrite

[XState GitHub](https://github.com/statelyai/xstate) is MIT, works without a UI framework and supports actors/statecharts. Use it as a reference or a narrowly scoped controller dependency. A small explicit reducer remains a reasonable lower-dependency alternative.

Proposed parallel regions: preparation is idle/writing/ready/unavailable; output is idle/connecting/playing/awaiting receipt/stopped. Shared generation, target and profile identities guard transitions. There is one coordinator, one current output, one newest waiting target. Test transitions and cancellations with the existing fake clock/player rather than adding a second scheduler. The library cannot replace server authority or receipt persistence.

### 4. Supabase: streaming example as transport reference

[Official streams example](https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/streams) supplies concrete Edge Function stream code. Its demo instructions disable JWT verification: do not copy that security configuration. Treat the example as a framing/cancellation reference, not the game's production authentication pattern. Exact example-file license/notice requirements must be checked at a pinned revision before copying code; no vendoring occurred.

Use bounded authenticated status streams only for meaningful progress or guest captions. Reconnect must load current authoritative state, deduplicate IDs and expire old notifications. A pushed event is a hint, never authority to score, enqueue paid work or play stale speech. Do not make native audio wait for a push channel.

### 5. Fetch Event Source: authenticated SSE if a status channel earns its cost

[Azure/fetch-event-source](https://github.com/Azure/fetch-event-source) is MIT and supports fetch headers/body, AbortController, response inspection and controlled reconnects. Unlike native browser EventSource, it can carry the existing bearer header without putting credentials in URLs. Its visibility integration is relevant to foreground-only commentary.

Fit is optional progress/captions, not MP3 playback. Review maintenance, pin a revision/version and override retries explicitly: reconnecting status may be safe; automatically retrying a paid generation operation is not. Do not add it just to replace an already eliminated native poll.

### 6. Claude: cache stable instructions, keep variable player facts separate

[Official prompt-caching guide](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) documents prefix caching, model-specific minimum lengths, lifetimes and `cache_creation_input_tokens`/`cache_read_input_tokens` usage. These are provider features, not an OSS dependency.

Experiment with unchanged system/editorial instructions before the breakpoint; put selected-player blurb, accepted facts and limited audience-authorized history afterward. Never broaden player context to improve cache hits. Compare warm/cold writer time and actual cache reads using equivalent scripts. Keep complete-line validation and punchlines; output limits must not clip text. No cache warming or provider experiment was executed here.

### 7. Capacitor Haptics: immediate touch confirmation

[Official Haptics API](https://capacitorjs.com/docs/apis/haptics) exposes impact, notification and selection feedback in the current platform family. Verify the exact package's license and native compatibility when selecting a version; this research did not install it or establish that it is already present.

Suggested product mapping: light selection on deliberate score choice, one acceptance tick on successful commit, stronger but brief celebration for major accepted milestones. Rejected/stale scores must not celebrate. Respect a saved haptics switch, system behavior and unsupported-device no-ops. Avoid repeated vibrations while Rachel speaks and avoid long generic vibration for every tap.

### 8. Motion: optional small vanilla-JavaScript choreography

[Motion GitHub](https://github.com/motiondivision/motion) offers vanilla JavaScript animation and is MIT. Premium Motion+ material has separate terms; the OSS license is not permission to copy paid examples.

Prototype only if existing CSS/DOM primitives do not handle cancelable score pulses, total changes and a drawer transition cleanly. Keep transforms/opacity inexpensive and measure WebView frame stability; no library marketing frame-rate claim establishes this phone's performance. Reduced motion should retain a static color/state change, and accepted values must appear immediately. No React migration, permanent confetti or endless background shimmer is required.

### 9. W3C dialog pattern: centered scoring can remain accessible

[WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) specifies contained focus, inert background, a visible close action, a dialog name and focus restoration. It is a behavior reference rather than a software dependency; copying examples requires their applicable notices.

Preserve the owner's centered touch scoring dialog. Adapt its height to keyboard/safe-area/landscape and allow internal scrolling. Keep compact named opponents aligned right without shrinking the player's controls. Proposed practical targets are at least 48 CSS px for main touch actions and visible focus; these dimensions are design proposals here, not a claim about W3C's cited page. TalkBack must announce saved score once, without reading every animated total or repeatedly interrupting Rachel.

## UX and editorial prototypes

These are original proposals, not claims of tested user preference:

- Replace vague connection text with actual stages: “Connecting Rachel”, “Writing your welcome”, “Rachel is ready”. If progress is unavailable, show an honest single state. Keep Continue without commentary active throughout; failure leads to scoring and a compact recovery action.
- On the scorecard, use a small Rachel status chip and an expandable last-line card. Mark “Next quip ready” only after real preparation. Like/Dislike belongs to that exact played line; absent feedback is unknown. A voice queue must not dominate the scorecard.
- Immediate accepted-score glow and tactile tick supply responsiveness independently of speech. Reserve emerald/gold celebrations for real accepted milestones; a scratch can get a short dry visual beat rather than a failure-looking error.
- Use the blurb for a precise comedic angle, not a repeated insult template. A deterministic editorial director selects target and mechanism; Claude writes one complete quip. Vary callbacks, absurd comparisons and rivalry story. Do not infer physical dice rolls or deliberation time from manual scores. Preserve adult darkness and independent profanity choice; no automatic escalation from Likes.
- Keep selectable cadence, but use newest-unspoken coalescing when entries arrive faster than speech. A short “Catch up with latest” action can discard obsolete waiting speech without interrupting the current accurate joke. Never accumulate an audible backlog to satisfy one-comment-per-score expectations.

## Proposed experiments and acceptance evidence

1. Fix the fresh local-command 503 from correlated request/error evidence first; library research is not root-cause proof. Correlate each accepted command, prepare, native request, binding and real receipt using opaque IDs, numeric stages and no raw blurbs/keys.
2. Model-test welcome failure, setup completion racing accepted welcome, rapid two-score replacement, stale prepare completion, background/foreground, Undo during preparation/playback, profile switch and delayed/rejected terminal receipts. Assert no overlap, duplicate dispatch or stuck startup.
3. Baseline exact installed source across cold welcome, idle score and score during speech. Use monotonic client clocks for user elapsed durations. Report separate request timing on the server; do not subtract unsynchronized device/server wall clocks as if precise.
4. Run a bounded native-preload spike with synthetic audio first. Compare handoff gap and cancellation correctness against current prepare-text-only. Advance to paid/provider tests only under an applicable approved allowance, preserving the recorded limits.
5. Compare prompt-cache hit/miss writer timings and blind comic quality before provider/model change. Any benefit is measured only after the actual trial; do not promise a numerical speedup from documentation.
6. Test 360–430 CSS px portrait, landscape/keyboard, TalkBack, reduced motion and physical haptics. Confirm centered scoring and scrollable compact peers remain easy to use. Record exact APK and physical listening separately from generated assets or successful network downloads.

Research handoff: adopt explicit lifecycle transitions and stage-level measurement now; retain direct HTTP streaming and prepare-ahead. Prototype audio preloading and prompt caching next, in isolation. Defer SSE and optional animation dependency until a concrete UX need and measured benefit justify them. No implementation/deployment/acceptance is claimed by this report.

## Lead review and next action

Parent read-only PostgreSQL logs now correlate the failed command at01:57:21.891UTC with the exact fenced-lease speech-receipt exception. Source inspection confirms the canonical commit applies that check to changed completed exposures, while Undo/correction cancellation may change an old receipt validity flag. This narrows the defect to a likely historical-invalidation/live-receipt distinction; an actual disposable database reproduction and narrowly scoped repair still remain. Repair this before introducing optional libraries. Keep full lease guards on new/advanced listening evidence and forbid changing historical audience/heardBy/identity/sequence/times under a validity-only path.

Lead agrees with the research sequence: transactional correctness, explicit lifecycle orchestration, measured one-item audio preloading/prompt cache experiments, then stage-aware touch/haptic/motion improvements. No library adoption or deployment was performed in SW035. Root status routes fresh runtime evidence separately from research.
