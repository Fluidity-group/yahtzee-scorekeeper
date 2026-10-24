# SW-021: Profanity, dark humor and cross-game memory

14 October 2026 follow-up. User preferences captured; detailed design proposed. No runtime feature, replay harness or provider generation implemented/executed. Parent: [architecture and stages](SW-021-live-comedic-commentary.md).

## Confirmed direction and controls

User requests profanity enable/disable, funny/dirty/shocking material, permission for dark humor and fresh commentary across games. This extends the earlier friendly-only proposal. Strong language should sharpen a joke, not substitute for one. Adult innuendo and non-graphic dirty jokes are within the requested direction; the legacy no-sexual-content rule is not a newly confirmed user requirement. No default for every other table has been selected.

Proposed controls: `profanityAllowed: boolean`, `humorIntensity: playful | savage | dark`, `frequency: highlights | balanced | lively`. These are versioned host commentary settings, independent from game rules. Clean + dark and profanity + playful are valid combinations. Profanity on permits strong language without requiring it every line. Profanity off requires a complete clean rewrite, not stars or bleeped punchlines. Dark mode permits gallows humor, bleak exaggeration and fictional absurdity about game misfortune. Vary praise, warmth, sharpness and absurdity so shock retains impact. Do not automatically escalate cruelty during a losing streak.

Every candidate/job/audio variant/fallback records `editorialProfileVersion`. Validate current settings at writing, synthesis and playback. Switching profanity off immediately stops incompatible speech, clears incompatible queued speech/captions and prevents old audio resurfacing after reconnect. Apply validation to AI/custom lines, fallback recordings and interpolated nicknames; retain actual account aliases in game records but use a neutral spoken seat label when a nickname violates clean mode. Normalize obfuscations and use classification for ambiguous language; regex alone is insufficient. Bounded rewrite then compatible fallback/silence. Clean prompts receive sanitized premise tags rather than dirty historical quotes.

Local mute/caption hide is immediate. Remote opted-in listeners hear the table's same version. Per-listener clean audio would require a separate future variant and additional cost/cache handling. Dark fictional scenarios must remain distinguishable from fabricated claims about a player's real private life or trauma. Actual scores/history remain literal.

## Learning mechanism

Application-owned persistent memory + selective retrieval + explicit feedback is the first implementation. Model weights do not change after each game; previous API calls are not automatically available to the next request. The loop is:

Record exposure → summarize bits → retrieve relevant memory → select underused mechanisms → generate/validate → play → collect optional feedback → adjust future selection.

This uses the general external-memory/context approach in [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents); [semantic retrieval](https://www.anthropic.com/engineering/contextual-retrieval) can find similar meanings rather than only identical words. The comedy-specific design here is our proposal, not evidence that these sources establish humor quality.

| Memory | Store | Purpose |
|---|---|---|
| Current broadcast | Verified facts, story arc, heard lines, active bits, callbacks, target balance | Coherence within this game |
| Audience exposure | Normalized text/hash, premise/metaphor/mechanism tags, optional embeddings, actual playback status and relevant audience | Avoid recycling jokes across games |
| Explicit preferences | Ratings, disliked themes, settings, preferred mechanisms | Adapt taste without inventing approval |

Each line records game/event IDs, profile/prompt/model versions, text, premise, metaphor, mechanism, callback reference and factual validity. Exposure separately records line ID, playback epoch, time, audience basis and status: not-started/started/completed/interrupted/failed/unknown. Host playback indicates likely table exposure, not proof that each person listened or laughed; remote playback can acknowledge separately. Deduplicate writes. Unheard generated candidates can be screened for repetition but cannot become a supposedly shared memory. Completed playback supports callbacks; partially heard lines should also avoid immediate repetition.

At game start, prepare a compact summary of authorized rivalry, exposed premises, liked mechanisms and suppressed topics. Each event retrieves only relevant bits plus recent transcript and the current story. Compact older games outside the live path. Begin with hashes and tags; add embeddings if labeled replay examples show paraphrases slipping through. Select thresholds against repeat/callback examples, not an invented universal similarity cutoff.

Use stable account identities and source-history permissions. Shared callbacks require the relevant original audience/context; a new table member does not gain access to private games. An overlapping player's exposure may contribute a sanitized avoid-premise tag without revealing private names/events/transcripts. Never combine unrelated users' personal histories into a global rivalry memory.

## Dynamic games, consistent personality

Choose a few underused thematic lenses per game (collapsing luxury resort, courtroom farce, incompetent space mission) and vary comic mechanisms. These are optional lenses, not scripts or invented events. Keep the same voice/personality. Actual play determines swagger, pressure, reversal and payoff; don't manufacture a comeback.

Conditional original authored samples:

| Verified event | Profanity-enabled sample | Purpose |
|---|---|---|
| Dan takes an early lead | “Dan's built a dynasty. It's been two turns; succession planning seems premature.” | Establish bit |
| Dan later scratches Yahtzee | “The dynasty's fucked. We haven't even finished the commemorative mugs.” | Transform bit |
| Dan later secures upper bonus | “Thirty-five bonus points. Apparently the dynasty qualifies for a bailout.” | Reversal |
| Later game, compatible settings and authorized shared history | “Last game's dynasty collapsed. Tonight Dan's wisely registered as a charity.” | Selective cross-game callback |

Clean second line: “The dynasty's gone bust. We haven't even finished the commemorative mugs.” Separate dark scratch example: “That Yahtzee box died doing what it loved: absolutely nothing.” These are writing samples, not listening-validated output.

A callback earns its place by changing the old premise, not repeating its punchline. Use cooldowns and a limited callback budget, tuned from whole games. New audiences need self-contained jokes. Distribute attention; don't simply attack the weakest player every time. Novelty cannot be guaranteed indefinitely by a random seed or temperature setting.

## Feedback and retention

Optional “Funny”, “Missed” and “Too far” actions belong in recent commentary or a postgame recap; don't interrupt every score. A rating belongs to its listener; host feedback does not stand for everyone. Missing feedback is unknown. No microphone/laughter detection is required.

Favor the technique behind liked jokes while keeping their wording/premise on cooldown. Suppress disliked themes in the relevant table/listener context. Use modest bounded selection changes and retain exploration so one successful mechanism doesn't dominate. Never automatically enable profanity or increase intensity from engagement. Sparse feedback remains uncertain. Cross-table aggregate policies are future work.

Proposed retention starting point: rolling 90-day exposure/premise window and bounded recent text, to confirm before implementation. Audio can expire sooner; explicit preferences remain until reset. “Forget commentary history” removes source memory, embeddings, summaries and retrieval caches without touching scores/history. Rebuild summaries so deleted facts cannot reappear. Provider retention/terms need an implementation check. Feedback and memory text are data, never instructions.

Fine-tuning is a later option only if a diverse, consented, human-rated corpus reveals a repeatable problem that prompting/retrieval cannot solve. It does not replace current facts or exposure memory.

## Next experiment and acceptance

Build a local synthetic replay harness: same events over consecutive games with overlapping and disjoint audiences, profile changes, generated/heard/interrupted lines and sample ratings. Verify contracts/selection/suppression before paid writing/speech benchmarks or a production migration.

- Profanity off covers generated/custom/cached content and nicknames; live setting changes invalidate incompatible output. Clean rewrites remain complete jokes.
- Paraphrased repeats are detected; transformed callbacks require valid exposure/context.
- Unheard lines cannot become callbacks; partial exposure is distinguished from completed speech.
- Undo invalidates event claims without erasing evidence that someone heard the original line.
- Returning audiences retrieve bounded memory; new members cannot access private past details. Reset removes derived memory while preserving scores.
- Ratings affect technique selection without recycling wording, assuming approval, or escalating intensity.
- Blind repeated-game listening evaluates funniness, relevance, novelty, shock appropriateness, fatigue and desire to keep enabled, alongside latency/cost. Report actual samples and errors; zero repeats in a sample is not infinite uniqueness.

This follow-up delivers design and authored examples only. Product controls, memory service, replay harness, model/voice calls and Android UI remain unimplemented. Documentation checks do not qualify runtime behavior.
