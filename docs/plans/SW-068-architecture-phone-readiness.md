# SW-068: Architecture review before the next phone build

27 October 2026. Owner: product owner. Architect/reviewer: Codex (single-agent source review, not independent release approval).
State: review and guidance maintenance completed; application fixes proposed, not implemented; no deployment or physical acceptance.
Project: SW, with INT phone-acceptance dependencies. Branch: `codex/sw068-architecture-phone-readiness`.
Frozen reviewed baseline: `d3d80370ed16623791d12c729653a960d90e9317`; application source unchanged from SW066 `db094a4` and SW067 installation source `06db45a`.

## Purpose and acceptance

Review the repository architecture, manual-game risks, phone build path, dependency health and continuity guidance before another phone build. Preserve accounts, games, rules, native identities and historical release evidence. Camera, voice, push, purchases and live changes are outside execution scope.

| Requirement | Method | Actual result | State |
|---|---|---|---|
| SW068-1: Establish baseline | Git ancestry/diff and live remote comparison | Current published baseline d3d8037; application identical to SW066/SW067 | Verified |
| SW068-2: Review component contracts and likely failures | Source/design/test review and synthetic fault probes | Three reproduced gaps; see findings | Reviewed; fixes open |
| SW068-3: Verify configured automation | Locked root/Pi installs, Node 24.15.0 engineering gate | 1,192 passed, 13 optional camera skips; all configured builds; clean stable source | Verified |
| SW068-4: Verify database authority separately | Existing disposable PostgreSQL suites, synthetic accounts only | Room/history 24 checks; social/invitations 22 checks passed | Verified locally |
| SW068-5: Reconcile skills/memory | All six repository skills, memory, current routing/contracts | Current source routing, manual packaging and historical precedence clarified | Updated |
| SW068-6: Establish real phone acceptance | Fresh signing/target inspection and owner gameplay | Not performed by this review | Open |

## Assessment and coverage

Keep the present architecture and vanilla JavaScript/Capacitor stack for the manual POC. A framework rewrite or new backend would add risk without closing the remaining acceptance gaps. The valuable boundaries are pure immutable rules, authenticated server commands, atomic room/archive/receipt commits, and UI adapters that do not own scoring authority.

Inventory covered 137 files under src, 21 server files, 24 Pi files, 13 SQL migrations and 142 test files, plus native projects, build scripts, preview/lab configuration and engineering records. Direct tracing concentrated on bootstrap, local persistence, scoring/Undo/final chains, multiplayer/auth/realtime/retry, tournament/history/account summaries, invitations, native links/lifecycle, safe areas and packaging. Camera/BLE, commentary, Pi and legacy code were reviewed at component interfaces and through their configured suites; this was not an exhaustive line-by-line security audit or physical qualification. The architecture map referenced hardware source directories absent from this checkout; no CAD/electrical review is claimed.

Strengths worth preserving:

- `src/game/core.js` keeps rule snapshots and immutable commands separate from transport; corrections retain history and Undo reverses the latest completed turn.
- `src/multiplayer/room.js` and the handler enforce membership, game identity, revision and actor ownership. Transactional history and social SQL tests exercise permission denial, duplicate receipts, rollback, frozen rosters/rules and concurrent last-seat acceptance.
- Local save journaling covers reload before asynchronous IndexedDB completion and reports storage failure. The recovery-only conflict gap below needs closing without removing that benefit.
- Account awards use Auth UUID, finished snapshots, correction-aware totals and separate rule sets. Manual unknown rolls remain unknown.
- Native shells share the web game; iOS uses qualified App/Push/StatusBar adapters. Sensor proposals and the Pi authority remain separate from cloud seats/commands.
- Published baseline GitHub check `yahtzee` completed successfully. Required-check/branch-protection enforcement was not inspected or changed.

## Reproduced findings and recommended corrections

All three synthetic probes intentionally assert the desired behavior and fail on the frozen baseline. They are diagnostic evidence under ignored `artifacts/sw068`, not additions to or weakened expectations in the configured suite. No runtime fix is included in SW068.

### F1 — P2: Account changes do not invalidate the old room session

Location: `src/multiplayer/ui.js:145`, room subscription at line 81, delivery at line 83.

The auth listener forwards every new session to the outer account callback but only tears down room state on SIGNED_OUT. A SIGNED_IN event with a different UUID leaves internal `user`, `generation`, subscription and pending requests associated with the previous account. A buffered callback can then deliver the previous room as the previous user after the outer app has switched accounts.

Reproduction: open Alice's synthetic active room; deliver SIGNED_IN for Bob without an intervening SIGNED_OUT; deliver the old subscription's next room revision. The game callback fires once with Alice's identity; the expected count is zero. This models cross-tab auth changes or replacement sessions, not a claim that the deployed server permits Bob to score as Alice. Server membership/RLS remain intact.

Recommendation before the next candidate: treat UUID changes and sign-out as session boundaries; invalidate asynchronous generations, stop watchers, clear room/standings/working state, close account-bound dialogs and explicitly bind subsequent reads to the new user. Keep same-UUID TOKEN_REFRESHED events from needlessly losing a valid table. Add regression coverage for old pending reads/mutations, buffered realtime, sign-out and same-user refresh.

### F2 — P2: Recovery-only storage accepts stale snapshots

Location: `src/core-store.js:9`.

saveCore overwrites the synchronous journal before checking an existing snapshot. Stale/conflicting revisions are rejected only inside the IndexedDB transaction. If that transaction is unavailable, the catch returns recoveryOnly for any journal write, so a stale tab can overwrite a newer recovery-only save.

Reproduction: make IndexedDB transactions reject; save synthetic revision 3 with aces=3, then the stale tab's revision 2 with aces=2. Both calls claim recovery-only success and loadCore returns revision 2/aces=2. The desired result preserves revision 3 or rejects the stale writer.

Recommendation before the next candidate: protect the journal's revision/content before replacement, including same-revision divergent writes. Design cross-tab serialization or immutable journal entries so a check-then-write does not merely move the race. Retain newer recoverable evidence and surface conflicts. Cover sequential stale writes, equal-revision divergence, unavailable IndexedDB, interleaved tabs and reload recovery.

### F3 — P2: The manual phone-config validator allows push enablement

Location: `scripts/ios-test-config.mjs:4` and line 10; consumer `scripts/prepare-ios-test.mjs`.

The validator accepts and returns VITE_PUSH_ENABLED=true while forcibly disabling commentary. The native account adapter may register a notification token when that flag is true and permission was already granted. This contradicts the current manual-build scope and handover, although the recorded SW066/SW067 packages used push disabled.

Reproduction: validate synthetic public-only config with VITE_PUSH_ENABLED=true. It returns true instead of rejecting it or forcing false. No provider, permission prompt or registration request was executed by the probe.

Recommendation before packaging: reject true or explicitly force false in the manual-only preparation path; retain a separate deliberate push-enabled workflow for later. Test true, false and missing values, and inspect effective build configuration. This does not establish push was enabled on either installed phone.

## Design and build risks

| ID | Risk and evidence | Recommendation / closure |
|---|---|---|
| R1 | Manual behavior is selected by MODE=ios-test, including on Android. Ordinary native builds can restore saved voice prompts; the Android PowerShell default rebuild uses native. | Continue the documented shared manual preparation + Android SkipWebBuild path. Prefer a platform-neutral manual-test profile and a manifest that rejects wrong mode, missing backend and enabled providers. Do not switch the current phone build to ordinary native. |
| R2 | Both native projects retain version/build 1; there is no obvious source/build identity in the connection panel. Hash manifests exist outside the UI. | Add a small About/build identifier and shareable sanitized diagnostics: source/build, platform, mode, online/recovery state and capability flags. Exclude tokens, emails, blurbs and full table content. Keep this optional for the first controlled test if exact package hashes are independently recorded. |
| R3 | Home loads every account session/history and refetches on Home return; requests are pooled but not cached. getSession in loadHomeAccount is not wrapped in the existing deadline helper. | Keep local play independent (current UI generation guards help); add bounded auth/history loading and account/revision-keyed caching after measuring real history size. Avoid introducing a new analytics backend before evidence of need. |
| R4 | Dense event orchestration in prototype.js and module-level multiplayer UI state make lifecycle correctness hard to review. Some dynamic imports are also static, so Vite reports they cannot form separate chunks. | After F1/F2 and phone acceptance, extract session controller, persistence/recovery adapter and dialog lifecycle ownership; format touched code. Preserve pure rules and avoid a broad refactor before testing. |
| R5 | Normal Vite dev/preview binds all interfaces and mounts a legacy unauthenticated TTS proxy if a server key exists. The dedicated lab/phone-preview configs omit that proxy. | Use the dedicated manual preview. Before reusing normal LAN dev with paid configuration, make the legacy proxy explicit opt-in and bounded/authenticated. No credentials were inspected and no paid request was made. |
| R6 | Ordinary PWA uses autoUpdate. Cached-client safety is described in contracts but not covered by the configured DOM-only gate. | Before any public-web rollout, test a previously cached client through score entry, update, close/reopen and reconnect. Native packages disable PWA and do not inherit this gate. |
| R7 | Public HTTPS invitation links are parsed in JavaScript, but native manifests declare the custom scheme; Android verified HTTPS links/iOS associated-domain delivery are not established by parser tests. | Test custom-scheme cold/warm entry and browser QR fallback on real devices. Treat HTTPS opening directly into native apps as a future verified App/Universal Link addition. |

## Dependency assessment

The saved final audit on 27 October reports 12 vulnerable dependency nodes: 1 high, 6 moderate, 5 low; Pi dependencies report zero. The initial install/audit reported 8; advisory data changed between queries, so the saved final report is the current evidence. The high node is undici 7.30.0 through dev-only jsdom. Other nodes are Vitest/mocker, Capacitor CLI/xcode/uuid, fast-uri, serialize-javascript and the PWA/Workbox/Rollup/deepmerge build chain. Their placement does not establish an exploitable shipped phone path.

Recommend a separate tooling-maintenance branch: Vitest 4.1.12 or later patched compatible version; updated undici through a compatible jsdom/lockfile resolution; compatible URI/serializer updates; deliberate upstream review for xcode/uuid. npm suggests major/downgrade changes for Capacitor CLI and the PWA chain; a CLI downgrade would violate the current exact 8.5.2 preparation contract: do not apply npm audit fix --force or silently change Capacitor versions. Requalify selected updates and native sync/build behavior. Do not combine dependency churn with the recovery/account fixes without reason.

## Phone test sequence and additions

1. Fix/recheck F1–F3, freeze the candidate, and run the configured gate. A passing existing suite alone does not close these new findings.
2. Freshly inspect Mac signing and both target identities. The last recorded iPhone profile expires 28 October 2026 at 14:09 America/Chicago; this review did not inspect or renew it.
3. Prepare both packages from the same public-only manual assets; verify provider/push flags, app ID, signer, asset hashes and data-preserving update/rollback. Automated web builds here used no real phone config and are not installable candidates.
4. Record existing accounts/table/seat/frozen rules; observe return without mutating the paused state. Play intentional owner-approved scores only during the actual phone test.
5. Exercise own-seat restrictions, double taps, a dropped/uncertain save, airplane-mode/reconnect, screen lock/background, Home/Resume and process restart. Reconcile accepted scores and turn state on both phones.
6. Exercise correction, latest-turn Undo, completed-game Undo, two-player readiness, withdrawn readiness and next-game identity/starter. Use synthetic/disposable acceptance tables for new rule edge cases; never rewrite owner history.
7. Check Competition final-category first/repeat Yahtzee and failed-attempt finish; preserve old frozen Joker rules. Complete the tournament and reconcile independent points/wins/ties, trophies, Personal Best and Razzie.
8. Check small-phone geometry, large text, numeric keyboard, landscape, reduced motion, VoiceOver/TalkBack and menu/dialog replacement on both platforms. Record actual observations and remaining failures, then obtain owner acceptance.

The only additions worth considering before the next build are reliable session invalidation, safer recovery, enforced manual flags and visible build identity. Shared venues, generated portraits, synchronized effects, push, camera and commentary should wait for manual-core acceptance. Keep the approved YAHTZ visual direction; the Online multiplayer tile's people-first intermediate panel is an existing owner-reviewed design, not a newly discovered routing defect.

## Evidence and completion

- Clean baseline engineering evidence: `artifacts/engineering/2026-10-27T23-19-32-884Z-640804b6/report.json`; Node 24.15.0, source SHA256 `54c313b0ed42e5efa3d381d21feb5ba154b6557ecfbbe940bd441a2d17adc660`, no source changes during run. Initial sandbox worker-spawn EPERM attempt was superseded by the approved successful rerun.
- Database evidence: `artifacts/sw017-rematch/database-report.json` (24 checks) and `artifacts/sw046-db/report.json` (22 checks). Existing scripts use these historical directory names; these files were freshly generated here. Disposable containers were stopped/removed by the scripts.
- F1–F3 probes: `artifacts/sw068/*.probe.test.js`, `review.config.mjs`, `review-probes.json`. Reproduce with Node 24: `node node_modules/vitest/vitest.mjs run --config artifacts/sw068/review.config.mjs`. Final result: three expected assertion failures exposing the findings. An earlier alias-resolution harness error was corrected before drawing the F1 conclusion.
- Dependency details: ignored `artifacts/sw068/dependency-audit.json`; no dependency versions or lockfiles changed.
- Baseline remote check: https://github.com/Fluidity-group/yahtzee-scorekeeper/actions/runs/40530830942/job/122282825915 . This is the published baseline's check, not a check of later review-document changes.

Review artifacts are local ignored evidence; the descriptions and reproduction steps above are the durable findings. No APK/Xcode compilation, native unit/instrumentation test, real browser rendering, physical device, authenticated hosted account, deployed-byte inspection, optional camera runtime, electrical/CAD acceptance or commercial review was performed. No standalone lint/typecheck scripts are configured; no new CI/check enforcement was introduced. Application source remains unchanged and the next build is not declared qualified for deployment. F1–F3 and phone acceptance remain open, owned by the next scoped implementation/qualification tasks.

Final documentation checks: all six skill-creator validations passed; git diff --check passed; engineering inspect passed at artifacts/engineering/2026-10-27T23-26-48-233Z-a15a4145. Only docs and repository skills changed; the clean application gate above remains applicable.
