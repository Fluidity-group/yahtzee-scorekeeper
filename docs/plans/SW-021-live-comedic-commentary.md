# SW-021: Live comedic Yahtzee commentary research and plan

14 October 2026. Product owner: user. Engineering coordinator: Codex. Research specialist: `comedy_commentary_expert` subagent, explicitly requested by user. Agent review is development research, not independent qualification.

State: research and proposed design complete; implementation, provider benchmarks, deployment and physical listening acceptance open. SW workstream; no release gate passed. Separate from outstanding SW-019 manual-game acceptance.

## Purpose and requirements

Create fast, natural spoken commentary in the current Capacitor Android game using confirmed live scores and ElevenLabs. User reports earlier commentary tests succeeded but need refinement. Preferences reference Jimmy Carr and Shane Gillis; proposed original direction uses concise misdirection, dry delivery, conversational observation and competitive teasing. This is an original character, with a licensed voice selected by listening tests. No comedian imitation or copied material is needed.

Use the prototype's product contracts: host playback by default, remote opt-in, business-held provider keys, generation once per event, captions/mute/fallback and measured usage. Manual scoring cannot reveal rolls, player thought processes, elapsed decision time or dice probabilities. These remain unknown unless separately observed and accepted. Humor intensity and frequency should be controllable; defaults remain affectionate, with explicit opt-in sharper banter rather than automatic cruelty escalation.

## Earlier work and evidence limits

Follow-up user direction: profanity on/off, dirty/shocking and dark humor explicitly requested; bland/repetitive output is unacceptable. [Adaptive humor design](SW-021-adaptive-humor-design.md) specifies language/intensity controls, cross-game exposure memory, feedback and fresh story arcs. It supersedes treating the earlier affectionate default as a ceiling on requested adult humor. Runtime behavior remains proposed.

Inspected source, README, original `BUILD-commentary-refinement.md`, architecture and product specification. Listed accessible recent project chats and archived chats, and inspected earlier engineering chats. The original successful commentary-testing conversation was not located in the available chat listing; no verbatim historical acceptance or measured latency is claimed. User's reported success is retained as user evidence. The build brief is a strong surviving record of prior feedback: sentences cut off, repeating insults, sharper wit, rivalry history and last-turn announcements.

| Existing component | Value and concrete refinement |
|---|---|
| `src/game/commentaryContext.js` | Pure score context, leads, scratches, bonus proximity, trends and rivalry. Assumes two seats and name-based legacy history; replace those assumptions for current account-owned 1–8-player games and versioned rules. |
| `src/ui/aiPep.js` | Short AI lines, recent memory, delivery variation, cancellation. Current prompt requests UNHINGED identities and fabricated statistics. Uses six recent lines, exact-string duplicate checks and accepts a second duplicate. Move to consistent editorial identity and richer premise memory. |
| Same generator | Current `max_tokens: 60`, hard word/character trimming and unchecked completion termination can damage a punchline. Reject incomplete output; budget enough tokens for a short complete sentence and required metadata. Do not cut text mid-joke to meet a cap. |
| `src/ui/commentary.js` | Single speaking slot, latest waiting line, explicit stop, SFX gate and fallback. Current TTS budgets are 3 seconds fast/9 seconds v3, after text generation; these are limits, not measured performance. Add freshness and correction checks at playback. |
| `server/ttsProxy.js` / `src/ui/voice.js` | Existing key separation and voice settings are useful. Proxy uses the standard conversion URL then `arrayBuffer()`; client waits for `blob()`. This fully buffers audio despite streaming comments. Proxy exists only under Vite dev/preview. |
| `src/bootstrap.js` / `src/prototype.js` | Legacy commentary is reached through the legacy route, not integrated into the default current game. Android requires a deployed authenticated backend and streaming-capable playback path. |
| Existing tests | Commentary/context tests exist; not rerun during research. They are reusable regression foundations, not current phone/audio acceptance. |

## Research and editorial approach

Humor research supports an expectation followed by an acceptable violation; this suggests exaggerating harmless game stakes and reversing an apparent compliment. It does not guarantee a particular joke works. See [HuRL benign violation theory](https://humorresearchlab.com/benign-violation-theory/) and [APA interview with Peter McGraw](https://www.apa.org/news/podcasts/speaking-of-psychology/humor-theory).

Sports commentary combines preparation, accurate action calls, context, imagery and changes in vocal pace/emphasis. See [BBC commentary training guide](https://downloads.bbc.co.uk/learning/livelessons/YCOTY-live-lesson-teacherguide.pdf) and [Vin Scully interview, Library of Congress](https://lcweb2.loc.gov/static/programs/national-recording-preservation-board/documents/VinScullyInterview.pdf).

Proposed format: establish the game story; call consequential changes; explain their significance without coaching; add an occasional joke or earned callback; let quiet moments breathe; close with the verified result. One personality can perform factual calls and color commentary without introducing two simultaneous voices. Suggested line length 6–16 words, maximum about 22; shorten by rewriting complete thoughts. These are editorial starting points, not accepted targets.

Example original writing samples, conditional on verified events:

- One-point lead: “Amber leads by one. Dominance, measured with a teaspoon.”
- Yahtzee scratch: “Dan’s scratched Yahtzee. Sensible to eliminate the pressure of having potential.”
- Upper bonus awarded: “Thirty-five bonus points. Dan’s discovered the game has benefits.”
- Third successive low score: “Three quiet turns. The scoreboard’s started checking its connection.”
- Later recovery, only after the previous line was actually heard: “A proper score. Good, the connection’s back.”

## Technical design and impact

Accepted game event → deterministic facts → editorial scheduler → short AI line → validation → ElevenLabs streamed audio → Android playback and captions.

1. **Event projection.** Read committed room/game events with server-authorized membership. Derive totals, current leader/ties, exact lead change, upper bonus, remaining boxes and mode-specific final-chain state in pure code. Never let the language model calculate authoritative scores or send game commands. Score comparisons must acknowledge unequal remaining opportunities; current lead is not a predicted winner.
2. **Reliable job creation.** Create an idempotent durable commentary job after a committed event, keyed by room/game/event and commentary version. Use an atomic outbox or durable deduplicating scan so a commit followed by a worker failure cannot lose or duplicate jobs. Provider calls stay outside the scoring transaction; scoring never waits for commentary. Authenticate/rate-limit all APIs; do not allow arbitrary provider proxy requests. Record usage and per-game limits.
3. **Editorial director.** Select significance, factual call/joke/silence, one story and one comic mechanism. Prioritize Yahtzee/bonuses, true lead changes, consequential scratches, final stages and result. Coalesce routine events. Proposed cooldown: start at 10–20 seconds and tune from full-game listening; important events can override it. Fixed character; variable mechanisms rather than rotating identities.
4. **Grounded writer.** Send a compact fact packet with relevant accepted history, recent heard lines and callback ledger. Start by benchmarking the existing text provider against one fast alternative only if useful; no provider migration is assumed. Output schema: event IDs, facts referenced, plain text, mechanism, delivery and callback ID. Nicknames/history are untrusted data, never instructions. Validate claims and completeness before synthesis; unsupported claims use a safe factual line or silence. Structured metadata alone cannot prove free text truthful: measure factual errors and constrain numeric claims.
5. **Variety.** Store per-game story, recent premises/metaphors, mechanism usage, active callbacks and actually-heard acknowledgments. Use bounded authorized cross-game history with stable account identity and frozen aliases; never merge people by nickname. Track exact and semantic repeats. A fresh seed alone is insufficient and cannot guarantee every line is unique. Retain selective context, not an ever-growing full transcript. Scope retention and deletion before implementation.
6. **Speech.** First prove complete-sentence text sent to an ElevenLabs HTTP streaming endpoint; enough context preserves punchline prosody and permits validation before any audio is heard. Benchmark Flash against expressive v3 using the same voice/scripts. Do not assume v3 shares the Flash WebSocket contract or accepts the same controls. Incremental text WebSockets are a later optimization only if measured delay warrants losing some whole-line validation/prosody context. Keep provider credentials server-side.
7. **Android.** Keep Capacitor. Prove streamed playback through a small native module using Android media APIs (Media3 is a candidate), with authenticated access or short-lived scoped audio URLs, bounded buffering and cleanup. Test actual first-sample playback rather than successful fetch. Handle audio focus, calls, speaker/Bluetooth routes, mute, background/foreground and lifecycle; default to no background backlog. Register a host playback lease/epoch so two host clients do not double-play. All viewers receive captions; remote audio is opt-in from the same generated job.
8. **Freshness/corrections.** At generation and immediately before playback verify same game/active session, event validity, pause, correction/Undo, age and playback ownership. Do not invalidate a valid job solely because unrelated room revision advanced. An Undo removes any unheard dependent line and recomputes facts/memory. If it invalidates speech already playing, stop/fade that speech and optionally issue a brief factual correction. Ordinary new scores let an accurate line finish; retain at most one eligible pending moment with explicit priority and expiry. Reconnect/resume must not replay an old game transcript.
9. **Graceful quality.** Captions remain available; a small varied set of reviewed same-voice recordings can cover generic failures without personalized false facts. Prefer captions/silence when no suitable recording exists. Device TTS can be an optional accessibility fallback; switching to a robotic voice by default undermines the intended consistent performance. SFX should duck beneath speech or finish quickly, not add seconds to every remark.

ElevenLabs distinguishes model inference from end-to-end audible latency; its approximately 75 ms Flash figure excludes networking, writing and playback. [Latency concepts](https://elevenlabs.io/docs/eleven-api/concepts/latency). Streaming allows playback before the complete clip arrives, with a context/naturalness tradeoff for incremental text. [Streaming concepts](https://elevenlabs.io/docs/eleven-api/concepts/audio-streaming). Tune numbers/names with model-compatible normalization or dictionaries: [pronunciation guide](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries). Handle focus/lifecycle using [Android audio focus guidance](https://developer.android.com/media/optimize/audio-focus).

## Stages and acceptance plan

All numbers below are proposals for the POC, not promises or already accepted gates.

| Stage | Deliverable and exit evidence |
|---|---|
| A: replay and editorial baseline | At least 10 synthetic complete games across representative rosters/modes, with lead changes, ties, scratches, pauses, Undo and final chains. Capture old and new text for identical facts. Mark synthetic data. |
| B: voice audition and latency spike | Three suitable licensed voice candidates; same short scripts through Flash/v3 where supported. Measure event commit→writer done→first audio byte→first audible sample; p50/p95/max, cold/warm and failures. Proposed typical-network p50 ≤1.5 s/p95 ≤3 s for fresh priority lines, including SFX gating, measured on identified Android. |
| C: isolated working vertical slice | One accepted hosted score produces one job, caption and audible line in an Android test build. No keys in APK/client, no scoring dependency, duplicate events/reconnects do not regenerate billing or replay audio. Test fresh/expired URLs and authorization. |
| D: full-game director and memory | Salience, callback ledger, cross-game variety, host ownership, corrections and failure handling. Blind comparison against old full-game experience. Suggested ≥4/5 relevance/naturalness, no incomplete sentences, no factual errors/overlap/stale remarks in collected acceptance set; report sample counts. |
| E: qualification and release preparation | Meaningful regression tests, configured Node24 engineering verify, backend/native checks and identified APK; real host Android + browser guest games, normal/weak network, interruptions, repeated games. Freeze source/voice/model/prompt versions and measured cost. Live deployment requires separate task-specific authorization. |

Cost measurement: record writer input/output tokens, TTS billed characters/credits, retries, abandoned jobs, audio egress/storage and generation count per 2/3/8-player game. Compute cost from actual provider bills/plan terms at benchmark time; do not assume a current price or subscription. Generate once and reuse for all opted-in listeners. Hard limits must stop commentary gracefully without affecting scores.

## Risks and remaining decisions

| Risk | Mitigation / closure |
|---|---|
| Funny isolated lines become exhausting | Blind full-game comparison, frequency/intensity controls, measure desire to keep enabled. Product owner selects acceptable tone. |
| Natural speech conflicts with speed | Same-script voice/model audition and actual phone latency distributions; select after listening. |
| Stale, duplicated or incorrect remarks | Durable job IDs, validity/age checks, heard acknowledgments, correction-aware facts and regression cases. |
| Names or numeric facts sound wrong | Small pronunciation audition set and model-specific normalization; retain displayed alias. |
| Cost or provider outage | Per-game ledger/caps, bounded retries, no speculative billable synthesis until measured, captions fallback. |

Remaining product choices can follow concrete audio audition: voice/accent, default banter intensity, frequency and provider cost allowance. No need to settle these before preparing the replay harness. No microphone, speech recognition or conversational agent is necessary for score-driven commentary.

## Completion evidence

Main-chat continuation is consolidated in [handover](../handovers/2026-10-14-live-ai-commentary.md). Added project-local `.agents/skills/live-commentary/SKILL.md`; updated product-change, AGENTS, memory, status and software routing. Skill creation uses the system skill-creator workflow. These are reusable instructions, not a persistent agent or installed runtime feature.

Handover completion checks: live-commentary and product-change both passed bundled `quick_validate.py`, using bundled Python and the existing isolated PyYAML dependency under `artifacts/sw020-product-review/validation-deps`. Initial default Python invocation was inaccessible and bundled Python lacked yaml until that existing dependency was supplied through process-local PYTHONPATH; no packages installed or global environment changed. Eight local documentation links and three skill/routing checks passed. Node24 inventory inspect passed at `artifacts/engineering/2026-10-14T18-56-13-412Z-3db19126`; tests/builds not run for guidance-only changes. Protected `.agents` edits used task-authorized escalation. Concurrent SW-022 records were preserved.

Delivered this research plan and [reusable specialist brief](SW-021-commentary-expert-brief.md); updated software/status/memory routing. Read-only research specialist completed web/source analysis. Source inspected under Node24.19.0; no gameplay code edited, provider synthesis purchased/called, app installed or service deployed. Documentation link checks and engineering inventory inspection are recorded after execution. No fresh audio performance, humor acceptance or gameplay qualification is claimed.

Executed checks: Node24 engineering `inspect` passed, inventory only, at `artifacts/engineering/2026-10-14T18-36-13-745Z-b29e67df`; local plan link resolution passed. Tests/builds were not run for documentation-only research. Runtime/audio qualification remains open.
