# SW-026: Sprint 3 authenticated commentary and native streaming integration

14 October 2026. Owner: user; lead/reviewer: Codex. State: implementation and local verification in progress. Project: SW, G2 preparation; actual Android audio and G3 acceptance open. Baseline: isolated Sprint2 candidate d65e7b1687cf7bf5f9cab46bfccec4145d1676fd. User authorizes remaining five expert-agent development sprints. New AGENTS instructions apply.

## Purpose and requirements

Integrate the provider-neutral authenticated service, native incremental audio adapter and caption controller. Voice defaults to owner-selected Dark/Victor; Ditzy remains selectable. Humor, profanity and explicit cadence are separate settings. Preserve authoritative accepted scoring and centered touch input; commentary cannot delay score success. No legacy migrations or scores required.

| Requirement | Acceptance method | Actual evidence / state |
|---|---|---|
| SW026-R1 Auth, host authority and source facts | Real handler/client synthetic integration; rejected guest/nonmember/invalid operations, frozen alias and UUID checks | Specialist service tests passed; lead integration pending |
| SW026-R2 One fenced playback and bounded use | Lease races, stale callbacks, pre-dispatch reservations, duplicate stream rejection | Rehearsal store only; production SQL budgets/outbox remain open |
| SW026-R3 Native progressive audio | Java/adapter compilation, packaged build; later physical audible onset/focus/lifecycle | Specialist Java compilation and7adaptertests; lead native build pending |
| SW026-R4 Safe captions and cancellation | Authenticated projection, silent hydration, Undo/profile/pause/game/background/epoch cancellation |18specialist client/UItests; lead found heartbeat operation mismatch and completed-caption loss, fixes assigned |
| SW026-R5 Voice choice | Default Victor, bounded Ditzy option, independent style/cadence; voice change bumps profile version | Implementation assigned; no more paid generation authorized |
| SW026-R6 Durable state | Atomic accepted-room outbox and durable job/lease/attempt/account-budget store in disposable DB | Not implemented; no production readiness implied by in-memory tests |

## Design and impact

Use [service design](SW-026-draft-authenticated-commentary-service.md). Lead owns shared profile/settings, Android registration and later room commit boundaries. Backend expert owns new service/store/handler; native expert owns new Java transport/plugin and JS wrapper; UI expert owns new controller/caption modules. Specialist worktrees remain isolated. No scoring/rules changes.

Server resolves bounded voiceOption values to public voice IDs; neither an arbitrary provider ID nor freeform writer text is accepted from clients. Voice profile changes invalidate pending incompatible audio. Real AI writing needs a server-only writer adapter and its own configuration/usage cap; ElevenLabs alone supplies speech.

## Risks and execution bounds

| Risk | Mitigation / closure condition | State |
|---|---|---|
| Process-memory attempts can reset and overspend | Synthetic-only capability and zero live-provider enablement; durable transactional adapter before paid integration | Open |
| Download timing mistaken for audible speech | Distinguish HTTP firstbyte, native audio-position proxy, physical speaker onset | Open |
| Native/client/backend contract drift | Lead real-handler integration tests and packaged compilation | In progress |
| Private personal context/memory collected without agreed lifetime | No durable gender/blurb or cross-game memory; one owner retention question pending | Open |
| Voice choice conflated with humor or cadence | Separate validated voiceOption; explicit frequency required | In progress |

Four approved audition requests are exhausted. No additional provider calls, live deployment or device installation authorized. Owner selected default voice after hearing authored sample clips; this is voice preference, not acceptance of full-game live AI humor. Specialist reviews are development evidence, not independent commercial approval.

Owner approves90-day heard-commentary/feedback retention and Forget history; profiles editable until removal; audio expires sooner, exact period undecided. Implement scope and audience checks plus expiry/deletion propagation before enabling durable collection. The earlier retention question is resolved for commentary history.

## Completion and decision

Pending integrated source, focused contracts, configured Node24 verification, native package build and real-device/audio trial. Remaining Sprint3 durable/live slice and Sprints4–6 are not declared complete.
