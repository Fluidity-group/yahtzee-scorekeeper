# SW-069: Close the three SW068 manual-core findings

27 October 2026. Owner: product owner. Implementation/review: Codex; no independent approval implied.
State: implemented and automatically verified; not deployed or physically accepted.
Project: SW. Baseline: review commit 326df3c, application baseline db094a4; branch codex/sw069-manual-core-reliability, stacked on review PR #2.

## Purpose and requirements

The owner requests fixing SW068 F1–F3, permanent regression coverage, full configured verification and a review PR. Both phones must remain unchanged. Preserve account/seat authority, rules, saved games and manual-only feature exclusions. No dependency upgrade, database migration, server deployment or phone packaging/install is included.

| Requirement | Observable acceptance | Verification | Actual result |
|---|---|---|---|
| SW069-1: Account-session boundary | Different UUID/sign-out invalidates buffered realtime, pending auth/room/mutation/history results and prior-account dialogs; same-user token refresh retains the table; sign-in retains explicit join intent | Synthetic DOM session, app and social tests; existing invitations/return tests | Passed |
| SW069-2: Recovery conflict safety | Newer and same-revision divergent journals cannot be overwritten by stale/interleaved writers during IndexedDB failure; exact retries and legacy journals remain supported | fake-indexeddb tests with failed transactions and interleaved storage writes | Passed |
| SW069-3: Manual push guard | Explicit true, false and missing push input all produce push=false and empty commentary endpoint | Public-only config regression tests | Passed |
| SW069-4: Whole-source checks | Configured Node24 gate passes with stable source; report camera skips and native/physical limits | engineering-check verify; scoped diff review | Passed: 1,216 tests/13 optional camera skips; all builds/source stable |

## Design and impact

Account changes advance the multiplayer request generation and tear down room subscriptions, pending flags and standings while keeping the auth watcher bound to its current online opening. Auth listener callbacks are separately fenced against retired openings. Same-UUID auth refresh does not reset a valid game. New-account navigation is deferred outside the Supabase auth callback to avoid reentering its auth lock. The outer app closes score dialogs and restores its preserved local game reference without rendering the old hosted game as local. Social dialogs/pending actions receive the same account epoch boundary.

Recovery now uses immutable per-write journal keys. A preflight revision/content check rejects known stale/conflicting snapshots; rechecking after asynchronous database failure catches interleaved writers. Different snapshots cannot overwrite each other's keys. Equal-revision divergence remains preserved and is surfaced as SaveConflict rather than silently choosing a winner. IndexedDB's existing transactional comparison remains authoritative when available. Only captured superseded journals are pruned after a successful database commit, with exact-byte checks to avoid deleting a concurrent replacement. Existing one-key-per-game journals remain readable; no game database/schema change or destructive migration is required.

The public-only manual preparation validator forces VITE_PUSH_ENABLED=false, matching its existing empty-commentary override, for both native platforms. Saved notification/voice preferences are not modified.

## Risks and bounds

- Genuine same-revision divergent recovery records require user-assisted recovery; both branches are retained rather than discarding scores. This does not implement a general multi-tab merge or a new recovery UI.
- New journal keys are read by the new client; older clients enumerate the same prefix but lack the new conflict checks. Do not run mixed application builds concurrently during acceptance. No installed app or stored user data was touched here.
- Commands already accepted by the server before sign-out remain accepted; the fix prevents late presentation/navigation under the replacement account, not retroactive command cancellation.
- Full configured web/native-web builds do not establish an APK/Xcode build, valid signing, native instrumentation, live authenticated continuity or physical acceptance. Phone updates are explicitly excluded by the owner.

## Evidence and completion

Before application changes, permanent focused tests produced 9 expected failures and 10 passes, covering all three root causes; evidence artifacts/sw069-before.json. Extended coverage includes interleaved tabs, real auth-event ordering during sign-in, deferred score cleanup and social acceptance. Focused and full final results will be recorded after verification. No check or expectation is weakened to mask a defect; the storage test retains its synchronous recovery-content/cleanup assertions while allowing the new immutable journal-key format.

Focused result: 54 tests passed across 9 files; artifacts/sw069-focused.json. Same-user SIGNED_IN/TOKEN_REFRESHED, explicit join after real auth event, retired listeners, old reads/mutations, deferred score cleanup, social dialogs/acceptance, immutable journal interleavings and legacy compatibility are covered. The full clean gate subsequently passed; see final evidence below. The owner also requested a two-user synchronization workflow; docs/engineering-workflow.md now records branch ownership, Git/design handover and exact phone-build identity.

## Final qualification and handover

- Clean candidate b25b6d9c606abed94364c0eca542052b8cc9e4ae, Node24.15.0: 1,216 passed/13 optional camera skips, 144 test files passed/1 skipped; production web, native web, iOS manual-test web and both edge-function builds passed; no source changes during run.
- Evidence: artifacts/engineering/2026-10-28T00-05-43-478Z-5c2d02e9/report.json (UTC filename; local date 27 October). Source SHA256 7df80fc3845ab3fd81304575db5e33df23b268fa673dfa7bbbec47b8feb6f4a5. Focused evidence: artifacts/sw069-focused.json, 54 tests/9 files passed. Before-fix evidence remains artifacts/sw069-before.json.
- Release-qualification skill validation and git diff --check passed. The final evidence-record commit changes documentation only; application qualification remains the clean b25b6d9 run. There are no standalone configured lint/type-check scripts. Existing canvas/navigation simulation notices and mixed-import chunk warnings remain; no warning was suppressed.
- No database/server behavior changed; prior SW068 disposable SQL evidence is not claimed as a fresh SW069 SQL run. No packages/lockfiles/CI were changed. Dependency-advisory remediation remains separate work.
- Not performed: APK/Gradle or Xcode/signing builds, native instrumentation, real browser visual/cache acceptance, live authenticated game/DB calls, camera assets or physical tests. No phone connected, updated, cleared or reset; no deployment/provider call/live score command.
- Review branch: codex/sw069-manual-core-reliability, based on review PR #2. Review that prerequisite and these fixes separately; agents must not merge either. After review, select the intended source and follow the phone acceptance/signing/manifest checks under separate installation authorization. Same-revision divergent journals are retained and surfaced for explicit recovery; no automatic branch merge is implied.
