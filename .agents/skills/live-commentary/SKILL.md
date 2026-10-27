---
name: live-commentary
description: Design, implement or refine Dice Clubhouse live comedic score commentary, ElevenLabs Android playback, profanity controls and cross-game humor memory. Use for game commentary rather than generic comedy writing or dice recognition.
---

# Live comedic commentary

Read `docs/status.md`, `docs/project-memory.md` and `docs/handovers/2026-10-14-live-ai-commentary.md`. SW021 records original intent/design; SW026–SW036 record later integrated server/native implementation, installations and unresolved physical latency/listening gates. Do not call the whole feature unimplemented based on the older handover, or treat historical installation as current acceptance. Commentary is deferred in the manual phone baseline. Inspect source before claiming runtime behavior.

## Product intent

- Original dry, conversational commentary with misdirection, competitive teasing and permission for dirty, shocking and dark humor. Comedy references express taste; do not copy jokes or impersonate distinctive voices. Preserve bite rather than defaulting to bland praise.
- Profanity on/off is requested. Language and intensity are independent: clean can still be savage/dark. Swearing is optional when enabled; when disabled rewrite complete jokes and cover captions/custom lines/fallbacks/nicknames. Profile-version checks prevent incompatible queued/cached speech after settings change.
- Keep a recognizable commentator; vary mechanisms, subjects and game stories. Use consequential moments, transformed callbacks and deliberate silence. Random personas or high temperature cannot guarantee freshness.
- Memory is application-owned context/feedback, not automatic retraining. Distinguish generated/started/interrupted/completed playback. Reward liked mechanisms while cooling down wording/premises; missing feedback is unknown. Do not infer laughter from playback or automatically increase intensity/profanity.

## Integration contracts

- Derive facts from accepted events and versioned rules; AI writes interpretation, never authoritative scores/commands. Manual entry does not observe physical rolls, intent or decision time. Preserve stable account ownership, frozen aliases, ties, Undo and final chains.
- Legacy `src/ui/aiPep.js`, `commentary.js`, `voice.js` and `src/game/commentaryContext.js` supply patterns, not drop-in current-game integration: two-seat/name assumptions, browser-held writer key, Vite-only TTS proxy and whole-clip buffering require deliberate replacement.
- Scoring never waits for commentary. Durable idempotent jobs, server-held keys, usage limits and host playback ownership prevent duplicate work. Revalidate event/game/pause/age/profile before playback; unrelated revision changes alone do not invalidate lines. Undo invalidates claims without erasing actual exposure.
- Cross-game retrieval follows stable account IDs, original audience and source permissions. Audience overlap may supply sanitized avoid-premise tags, not private-game disclosure. Forget-history removes derived summaries/embeddings/caches without changing scores.
- Measure actual event-to-audible latency and whole-game listening quality; provider inference figures are not Android latency. Evaluate streaming/prosody, names, focus/lifecycle, interruptions, corrections, duplicates and cost. Proposed thresholds/retention remain proposals until accepted.

## Execution and evidence

When the owner resumes this workstream, start from the existing implementation and unresolved measured failures; reuse synthetic replay/settings/memory tests before deciding whether a new audition or Android slice is needed. `docs/plans/SW-021-commentary-expert-brief.md` supports an expert task when authorized; this skill grants no standing delegation, paid-provider, messaging or deployment authorization. Preserve concurrent work and existing games. Maintain the current SW task/status evidence and distinguish authored samples, synthetic tests, provider measurements and physical listening acceptance.

Current routing: read docs/status.md and docs/project-memory.md for the active revision, host checkout and task; SW066/SW067 establish the integrated manual baseline, and docs/plans/SW-068-architecture-phone-readiness.md records the latest review and open findings. Windows paths in older handovers are workstation-specific. Manual Android/iOS reliability is the owner priority; camera, voice and push remain deferred. Preserve accounts/tables and distinguish automated verification, installation and complete-game acceptance.
