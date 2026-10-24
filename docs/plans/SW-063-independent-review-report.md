# SW063 independent source and endpoint review

Reviewed 24 October 2026: clean commit `d8a8118`, `codex/amber-ui-lab`. Read-only review of tracked source; no live account/session access, browser automation, room/score/tournament mutation, provider calls or deployment. A harmless ignored artifact fixture was created solely to verify LAN file protection.

## Findings

1. **P2 — Personal Best Yahtzee count ignores accepted score corrections.** `src/game/personal-records.js:14` derives explicit manual reports from the original score event and never applies `score-correction`. Real `createCoreGame`/`command` reproduction: start manual turn, score Yahtzee 50, correct its score event to 0: accepted sheet becomes 0, `recordedYahtzees` returns 1. Reverse case, score 0 then correct to 50: accepted sheet becomes 50, helper returns 0. Completed-game account summaries consume this helper unchanged, so the new record can be wrong even though final scores are correct. Apply the latest accepted correction to score-report evidence before deriving reports, while preserving observed dice evidence, bonus evidence and Undo filtering. Add both correction directions, repeated corrections and a completed account-summary regression.

2. **P2 — Offline LAN lab serves ignored artifacts as static files.** `lab/vite.config.js:12` allows the whole checkout but has no artifact/private deny rule. Its watcher exclusion does not protect HTTP reads. Read-only GET of the newly created harmless `artifacts/sw063/benign-http-fixture.txt` returned HTTP 200 and exact fixture bytes on port 8475, while the same route returned 403 on port 8476. The preview already has a correctly anchored artifact deny rule at `preview/vite.config.js:14`. Any LAN client that knows a filename can read non-default-denied artifacts, including logs/review evidence; no sensitive contents were requested or exposed during this audit. Add equivalent anchored artifact and private-folder denies to the lab while retaining the intended GET review API; add a resolved-config and benign HTTP denial regression. Default `.env`/Git denies currently resolve true.

## Evidence

- Node `v24.19.0`: existing focused suite, 7 files / 85 tests passed: personal-records, home-account, room-supabase-adapter, rooms, social-return.dom, phone-preview, amber-lab. These tests do not cover the two findings above.
- Supplied broader qualification: 1,186 tests / 13 optional camera skips / configured builds / stable source, report `artifacts/engineering/2026-10-24T16-00-16-402Z-931ecb45/report.json`. This is distinct from my focused rerun.
- Authorized read-only LAN probes: 8475 `/`, `/lab/`, `/lab/entry.js`, `/src/bootstrap.js`, `/lab/uuid.js`, `/__lab/status`, `/__lab/requests`: HTTP 200; status identified d8a8118, codex/amber-ui-lab, online disabled. Root contains `/lab/entry.js`.
- 8476 `/`, `/preview/entry.js`, `/src/bootstrap.js`, `/lab/uuid.js`: HTTP 200; root contains `/preview/entry.js`. The `__lab` URLs on 8476 return HTML SPA fallback, not a lab API. HTTP 200 alone is not API evidence.
- Both entry modules install secure `getRandomValues` UUID fallback before dynamically importing application dependencies. Existing timestamp-aware HTML and UUID tests pass. No live browser execution/phone geometry inferred.

## Endpoint inventory and coverage classification

| Family | Implemented surface | Evidence / live limits |
| --- | --- | --- |
| Lab / preview static and HMR | HTML, bootstrap, source/assets, Vite client/HMR; lab GET status, GET/POST requests | Source/tests plus GET probes above. No POST or source-update probe in this review. Artifact exposure confirmed only with harmless fixture. |
| Cloud room Edge Function | `/functions/v1/game-room`, OPTIONS/POST; list, sessions(open/completed), tournaments, create, join, read, history, standings, start, command, ready, pause, resume | Handler/adapter/member-seat/revision/receipt/CAS source inspected; rooms and adapter focused tests passed. No cloud authenticated or unauthenticated probes performed by this reviewer; no deployed-health conclusion. |
| Supabase Auth | SDK session/user, password/OTP sign-in, recovery/update, sign-out/token refresh | Client/recovery/social return contracts inspected; social-return tests passed. No login/session inspection or identity mutations. |
| Supabase database / realtime | Room/game history/receipts and capability/atomic commit RPCs, membership-filtered realtime; authenticated `clubhouse_social` RPC and invitations/play-request subscriptions | Source and migrations reviewed for membership/confirmed UUID boundaries. Social action surface: inbox, device register/remove, invite create/accept/decline/revoke, play create/ready/decline/cancel. Disposable SQL suite is historical broader evidence, not rerun here. No live DB or realtime probes. |
| Commentary Edge Function | `/functions/v1/live-commentary`; local session read/start/command, profile/player-profile reads/updates/delete, jobs, feedback/forget, playback lease/claim/events, reaction preparation; claimed audio/reaction GET streams | Source inventory only in this audit; disabled in both LAN configs. Existing broader configured tests are source qualification, not provider/audio/deployed evidence. No synthesis or paid calls. |
| Legacy provider integration | Browser Anthropic messages; development `/api/tts` ElevenLabs proxy | Source inventory only; these plugins are absent from lab/preview configuration. Not live tested. |
| Pi vision | GET `/health`, `/observation` | Separate implemented device service, unchanged; no current device/physical probes. |
| Pi game/setup | Static `/`, `/client.js`; `/api/create`, `/api/recover`, `/api/join`, `/api/rooms/:id[/operation]`, `/api/devices/:id/:operation`; setup GET `/`, `/status`, POST `/connect` | Separate implemented device services, unchanged; source inventory only, no live operations/device acceptance. |
| Camera/dice assets and native integrations | Opt-in camera/dice-lab bootstrap queries, local vision assets, native BLE/push/link/audio adapters | Broader optional camera skips remain explicit; no browser/device/signing/APNs/FCM/audio verification in this review. |

History reads paginate in descending sequence; account summaries deduplicate by game UUID, include owner seats only, replace reopened current snapshots and reread room revisions before accepting results. Social links distinguish explicit join from read-only member returns. Server authority derives seat from authenticated UUID and checks expected revisions/current games; receipt replay is actor/fingerprint fenced in the durable handler. No additional concrete authority/pagination regression was established in this bounded review.

## Documentation / remaining gates

- At reviewed d8a8118, current SW062 status/project-memory/project record still says full clean gate pending, although the supplied later qualification report passed. Parent is reconciling those records; this is an evidence-timing discrepancy rather than a failed test.
- Existing manual-multiplayer skill mentions Competition v2 final-chain introduction but omits the newer no-Joker/first-final-Yahtzee clarification recorded in SW048/SW049; sync this contract reminder rather than treating version number alone as complete rules.
- No current cloud deployed-byte match, authenticated account/tournament journey, real-time continuity, cached update lifecycle, phone visual/touch acceptance, camera assets/physical recognition, native installation/signing freshness, APNs/FCM delivery or audible playback established by this review. Preserve those as separate gates. Existing user tournament was untouched.

## Independent fix recheck — 24 October, working changes after d8a8118

Both reported findings are resolved in the reviewed working source. This is a focused follow-up, not qualification of all later documentation changes or a new committed release.

- Personal-record correction map uses latest accepted `score-correction` value keyed by original event ID. It preserves explicit attached-bonus and actual observed-roll evidence. Score corrections survive filtering when emitted during an unrelated later turn which is subsequently undone. Independent actual-core-command replay verified both 50-to-0 and 0-to-50 after scoring and undoing that unrelated turn; counts are now 0 and 1 respectively. Added tests cover both directions, repeated corrections, completed account summary, actual observed Yahtzee preservation and unrelated undone-turn filtering.
- Lab deny rules now match preview's checkout-anchored artifacts rule plus private/env/Git protection. Independent read-only GET of the harmless fixture returned 403 through both ordinary `/artifacts/...` and `/@fs/C:/...` URLs. Root, workbench and secure UUID source still return 200. Added resolved-config regression checks intended source remains available and artifact/private/env/Git paths are denied.
- Independent Node24 focused rerun: 5 files / 26 tests passed (personal-records, home-account, lab-file-policy, amber-lab, phone-preview).
- No additional concrete residual issue found in these two fixes. The broader endpoint/device/visual/deployment gates above remain unchanged. Full final-source qualification and committed identity remain coordinator tasks.
