# SW-021 live AI commentary handover to the main chat

Updated 14 October 2026. Scope: research, product preferences, proposed technical/editorial design and reusable guidance. **No current-game commentary implementation, replay harness, paid provider generation, Android installation or deployment has been completed in this workstream.**

## Main-chat summary

The user wants fast, natural, live vocal commentary for Dice Clubhouse's Android Yahtzee game, driven by actual progressing scores and ElevenLabs. They like Jimmy Carr and Shane Gillis; translate this into an original dry, conversational character with sharp misdirection and competitive teasing, rather than copied material or impersonation. They explicitly permit dirty, shocking and dark humor and request a profanity on/off flag. Bland repeated insults are unacceptable.

The next engineering deliverable is a **local synthetic repeated-game replay harness and settings/memory contracts**, followed by a concrete voice audition and Android streaming spike. Keep it separate from open SW-019 manual-game acceptance and SW-022 premium clubhouse UI work. Shared source/SFX integration will eventually need coordination; neither design stream authorizes live deployment.

## Read and routing

1. `AGENTS.md`, `docs/status.md`, `docs/project-memory.md` and software project control.
2. [Architecture/research/stages](../plans/SW-021-live-comedic-commentary.md).
3. [Profanity and adaptive humor design](../plans/SW-021-adaptive-humor-design.md).
4. [Reusable expert task brief](../plans/SW-021-commentary-expert-brief.md).
5. Repository skill `.agents/skills/live-commentary/SKILL.md`; use manual-multiplayer skill too when changing hosted event/history/authority integration.

The original expert was a research subagent, explicitly requested by the user, not a persistent hosted agent or trained custom model. The reusable task brief and repository skill preserve its direction; they do not schedule future work. This handover is a document for the main chat; no cross-chat message has been sent.

## Confirmed preferences versus proposed controls

Confirmed: live score commentary, ElevenLabs/Android integration, fast/natural delivery, freshness across games, profanity toggle, permission for dirty/shocking/dark jokes and interest in learning from past commentary.

Proposed UI: profanity Off/On; intensity Playful/Savage/Dark; frequency Highlights/Balanced/Lively. Language and intensity are independent; clean can still be savage or dark. Permitting profanity does not require it in every sentence. Clean mode rewrites the joke, not merely bleeps words. No universal default for other tables has been selected. Adult innuendo/non-graphic dirty jokes are within the requested direction; don't reimpose legacy friendly-only/no-sexual-content text as a newly confirmed user requirement.

Keep one recognizable voice/personality. Vary mechanisms, subjects, sentence lengths and themes. Select moments instead of roasting every score; use sharpness, warmth, surprise and silence to keep contrast. Avoid automatically escalating cruelty when someone loses. Scores/history stay factual, while fictional absurdity and gallows humor can exaggerate the game's stakes.

## Existing implementation and past evidence

User says earlier tests worked successfully and need refinement. The accessible chat inventory did not expose the original successful test conversation; don't claim to have recovered it. The surviving `BUILD-commentary-refinement.md` records cut-off sentences, repeating insults, sharper wit, rivalry history and last-turn announcements.

| Source | Reuse / limitation observed |
|---|---|
| `src/game/commentaryContext.js` | Rich pure context, leads/scratches/bonus/trends/rivalry; two-seat and name-keyed legacy assumptions need replacement. |
| `src/ui/aiPep.js` | Short writing, cancellation and variety; current prompt rotates personas/permits fake statistics, keeps six recent lines and only checks exact duplicates. Current 60-token output budget and hard trimming threaten complete punchlines. Writer key is browser-held. |
| `src/ui/commentary.js` | Single speaking slot/latest queued line, SFX gate/fallback. Add event validity, freshness, settings version and correction handling. Existing model budgets are not measured latency. |
| `server/ttsProxy.js`, `src/ui/voice.js` | Proxy waits for upstream `arrayBuffer()`, client waits for `blob()`. Whole-clip buffering despite streaming comments; proxy runs only under Vite dev/preview. |
| `src/bootstrap.js`, `src/prototype.js` | Commentary is wired in legacy screen, not default current Android multiplayer. |

Existing commentary/context tests are reusable foundations but were not rerun during this research. No fresh voice quality, measured speed or physical acceptance exists for SW-021.

## Target architecture

Committed game event → deterministic facts → editorial director → short AI line → validation → ElevenLabs streaming → Android playback/captions.

- Compute totals, ties, bonuses, real lead changes, remaining boxes and final-chain state in pure game-aware code. Manual category input does not reveal physical rolls or decision time. AI never changes scores or owns commands.
- Durable idempotent jobs after committed events; atomic outbox or deduplicating durable scan. Provider calls outside scoring transactions; gameplay never waits for commentary. Server credentials, authenticated member access, rate/usage limits and recorded costs.
- Generate once per event/version; host plays by default under a playback lease/epoch; remote audio is opt-in and captions shared. Separate clean listener variants are not promised by the basic profanity toggle.
- Prefer complete validated sentences into HTTP TTS streaming first, preserving punchline context. Benchmark Flash/v3 with the same suitable voice/scripts; don't assume their tags/WebSocket contracts match. Keep Capacitor and prove native streamed playback/audio focus/lifecycle on an identified Android.
- Check game/event validity, age, pause, profile version and playback owner before speech. Unrelated revision changes alone need not invalidate a valid event. Coalesce routine updates; don't cut an accurate sentence for each new score. Undo/corrections cancel invalid unheard speech and may stop/correct invalid speech already playing.
- Swearing off immediately stops/clears incompatible audio/captions/queues/caches. Validate custom lines, aliases and recorded fallbacks as well as AI text. Bounded rewrite then compatible fallback/silence. Avoid robot-voice fallback by default if it breaks intended performance quality.

## How cross-game learning works

Use persistent application memory and retrieval, not automatic per-game model retraining. Three layers: current broadcast/story, audience exposure/premise history, explicit preferences/ratings.

Store text/hash plus premise, metaphor, mechanism, callback reference, event grounding and profile/prompt/model versions. Separately record generated/started/completed/interrupted/failed exposure with playback epoch and audience basis. Playback does not prove laughter. Unheard lines cannot become shared callbacks; partial exposure still matters for repetition. Undo changes facts without erasing the record that players heard the original line.

Retrieve bounded relevant rivalry, exposed jokes and preference summaries. Begin with hashes/tags; add semantic similarity if labeled replays show paraphrases escaping. Select underused mechanisms and thematic lenses; use actual scores to develop a story. A fresh random seed alone cannot guarantee novelty.

Optional Funny/Missed/Too far feedback in a recent-comments list or postgame recap: reward the technique behind a liked line while cooling down its wording/premise. Missing ratings are unknown; one host vote is not everyone voting. Do not automatically enable profanity/escalate darkness from engagement. No microphone or laughter detection is required.

Account UUIDs and source permissions govern cross-game memory. New people cannot receive private-game callbacks merely by joining a table. Overlap may contribute sanitized avoid-premise tags. A proposed rolling 90-day exposure window is unaccepted; confirm retention before implementation. Forget-commentary-history must remove derived summaries/embeddings/caches without changing scores. Fine-tuning is later, only if evidence warrants it.

## Concrete next stages and checks

1. Synthetic replay/settings/memory slice: repeated scenarios across consecutive games, overlapping/disjoint audiences, Undo, profile switches, incomplete playback and sample ratings. No live rooms need alteration.
2. Voice audition: three licensed voice candidates, supported Flash/v3 comparisons and old/new writing over identical facts. Provider usage/cost authorization and limits are a separate execution prerequisite, not granted by this handover request.
3. One accepted hosted score → one authenticated job → caption/streamed Android audio. Record cold/warm commit-to-writer/first-byte/first-audible timing, failures and billed usage.
4. Whole-game director/memory integration and blind repeated-game listening. Rate funniness, novelty, naturalness, relevance, shock appropriateness, fatigue and desire to leave enabled; check pronunciation, incomplete lines, repeats, overlap, stale speech, privacy/reset and setting changes.
5. Meaningful regression coverage, Node24 engineering verify and native/backend checks before release preparation; exact APK/source/model/voice/prompt identities and actual phone/guest games. Live deployment remains separately authorized.

Proposed p50 ≤1.5 s/p95 ≤3 s event-to-audible for fresh priority lines on typical network, 6–16-word usual lines, about 22-word maximum, 10–20-second initial cooldown and sample/quality thresholds are experimental starting points, not measured results or accepted gates. Streaming naturalness and comedy need real listening. No promise of flawless/infinite unique output is established.

## Workspace and completion boundaries

Large pre-existing dirty checkout preserved; do not reset/clean/bulk-stage or treat historical HEAD alone as the full source baseline. Main-chat SW-022 work appeared during this session and was preserved. SW-019 return/Undo and guest cache activation acceptance remain separately open; inspect current records before acting. No deployed or installed build state is inferred from this document.

SW-021 delivered research/design, authored sample jokes, expert brief, adaptive design, this handover and repository skill/routing updates. Documentation link/skill/inventory checks will be recorded in the parent plan after execution. No gameplay code change, paid generation, app install, production mutation, message to another chat or new physical acceptance is claimed.

Completion verification: both new/updated skills passed the skill-creator validator; eight local documentation links and three routing checks passed. Engineering inventory inspect passed at `artifacts/engineering/2026-10-14T18-56-13-412Z-3db19126`. These checks qualify documentation/guidance only; no gameplay tests/builds were rerun. Environment details are in the parent plan.

Suggested main-chat continuation: “Read the SW-021 live AI commentary handover and live-commentary skill. Keep SW-019/SW-022 work intact. Prepare the synthetic repeated-game replay/settings/memory slice, with profanity/profile invalidation and authorized exposure-aware callbacks, before paid voice audition or deployment.”
