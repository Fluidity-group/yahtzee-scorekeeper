---
name: product-change
description: Implement a substantial product feature or behavior change with acceptance criteria, relevant contracts and durable completion evidence.
---

# product change

For live game commentary, ElevenLabs playback, profanity controls or adaptive humor memory, also use `.agents/skills/live-commentary/SKILL.md` and `docs/handovers/2026-10-14-live-ai-commentary.md`. Commentary remains a separate workstream from outstanding manual-game acceptance.

Resolve the active workstream from `docs/status.md` and `docs/project-memory.md`; a historical milestone is not the current priority. For hosted manual multiplayer, tournament, return, history or invitation changes, read `.agents/skills/manual-multiplayer/SKILL.md`. For network-camera or dice-vision changes, read `docs/decisions/2026-10-01-camera-platform-sequence.md` and `docs/c121-software-handover.md`. Preserve camera observations as proposals and distinguish native decoding, simulated frames and physical evidence.

Read AGENTS.md and docs/status.md, then the relevant product contract. For substantial work, maintain a scoped plan under docs/plans/ with acceptance criteria and decisions. Keep implementation within component ownership; simulated state must stay distinguishable from authoritative state. Verify observable acceptance criteria using focused checks, then the configured engineering gate when preparing a release. Update current status, relevant contracts and evidence references. Report remaining physical/deployment gates without inventing success.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.


For a user-requested independent review, record the frozen reviewed revision, reviewer identity, findings, regression evidence and fix recheck separately from the implementation agent's self-review. Distinguish endpoint source/test coverage from live authenticated or physical-device evidence. Keep project skills and current checkout/handover routing consistent without rewriting historical release facts.

Current task routing: resolve SW066/core manual integration from docs/status.md and docs/handovers/2026-10-24-core-manual-integration.md. Manual scoring and tournament dependability on Android/iOS is the owner priority; camera and voice work stays deferred until the owner resumes it after manual-core acceptance. Preserve prior source/device evidence; a running app is not complete-game acceptance. Keep these repository skills and current memory/handover routing synchronized when promoting a build.
