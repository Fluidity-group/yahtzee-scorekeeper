# SW-069: Close the three SW068 manual-core findings

27 October 2026. Owner: product owner. Implementation/review: Codex; no independent approval implied.
State: implementation complete; focused checks passed; full qualification pending; not deployed or physically accepted.
Project: SW. Baseline: review commit 326df3c, application baseline db094a4; branch codex/sw069-manual-core-reliability, stacked on review PR #2.

## Purpose and requirements

The owner requests fixing SW068 F1–F3, permanent regression coverage, full configured verification and a review PR. Both phones must remain unchanged. Preserve account/seat authority, rules, saved games and manual-only feature exclusions. No dependency upgrade, database migration, server deployment or phone packaging/install is included.

| Requirement | Observable acceptance | Verification | Actual result |
|---|---|---|---|
| SW069-1: Account-session boundary | Different UUID/sign-out invalidates buffered realtime, pending auth/room/mutation/history results and prior-account dialogs; same-user token refresh retains the table; sign-in retains explicit join intent | Synthetic DOM session, app and social tests; existing invitations/return tests | Focused passed |
| SW069-2: Recovery conflict safety | Newer and same-revision divergent journals cannot be overwritten by stale/interleaved writers during IndexedDB failure; exact retries and legacy journals remain supported | fake-indexeddb tests with failed transactions and interleaved storage writes | Focused passed |
| SW069-3: Manual push guard | Explicit true, false and missing push input all produce push=false and empty commentary endpoint | Public-only config regression tests | Focused passed |
| SW069-4: Whole-source checks | Configured Node24 gate passes with stable source; report camera skips and native/physical limits | engineering-check verify; scoped diff review | Pending |

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

Focused result: 54 tests passed across 9 files; artifacts/sw069-focused.json. Same-user SIGNED_IN/TOKEN_REFRESHED, explicit join after real auth event, retired listeners, old reads/mutations, deferred score cleanup, social dialogs/acceptance, immutable journal interleavings and legacy compatibility are covered. Full gate remains pending. The owner also requested a two-user synchronization workflow; docs/engineering-workflow.md now records branch ownership, Git/design handover and exact phone-build identity.
