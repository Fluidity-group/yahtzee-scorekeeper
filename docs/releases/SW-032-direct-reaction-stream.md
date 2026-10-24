# SW-032 direct reaction streaming — 14 October 2026

State: implemented and qualified; live backend deployed and matching Pixel APK installed for owner testing. Codex development self-review; physical latency/humor and independent acceptance remain open. User explicitly authorized the architectural change and Pixel update. No agent-triggered paid generation, allowance increase, migration, score edit or app-data clearing.

## Behavior and authority

Android commentary now starts from a newly accepted score update or explicitly armed welcome. One authenticated native GET selects the persisted accepted reaction, writes its complete quip if needed, atomically claims playback and reserves voice, then streams MP3. Native parses server-assigned job/caption/token/device/epoch/lease metadata before playback callbacks. The browser no longer polls for ready speech or makes a separate playback-start/claim request on this path. Saved-game hydration/resume stays quiet. Current speech completes; only the newest waiting score is retained.

Local mirrors already contain accepted jobs, so they avoid a hosted outbox request. Hosted ingestion still follows actual host authorization and immutable accepted receipts. Final writer validation, acquisition, one-time claim and audio reservation share one atomic commentary-version/room-revision-fenced commit. Providers and stream opening remain outside retryable work. A concurrently owned writer is rejected without polling or duplicate dispatch. Undo/profile/settings/age/pause/member/host/device/lease checks, first-byte/periodic validation, provider caps and real receipt accounting remain. Lease renewal is safety maintenance, not discovery polling. Legacy/browser caption routes remain compatible for rollback and caption-only clients.

Scoring is independent of voice. Like/Dislike becomes available from actual terminal receipt projection. Cancellation during connection/authentication cannot open a late request. Deliberate no-commentary204 and failed connection are separate native outcomes. Numeric request queue, server writer/voice/first-byte, native binding/first-byte/playout and score-submission timings remain distinguishable. Native position is a proxy, not proof of sound reaching ears.

## Qualification and identities

- Clean source `34084bc9cf03bcf832592c1a9444dac493396a93`, branch `codex/sw032-direct-reaction-stream`, isolated checkout `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`.
- Source SHA256 `360f6354b3ea55f9c48a06415506b00c1a2fb7f069178f46a0ddac894589bb33`.
- Node24 configured gate:1,023tests passed,13optionalcamera skips; web/native/commentary/room builds and unchanged-source verification passed. `artifacts/engineering/2026-10-15T01-24-06-472Z-36523a89/report.json`.
-31actual disposable PostgreSQL checks passed, including new direct writer-finalization/claim/audio-reservation atomic commit before bytes; host ownership, no inferred hearing and duplicate selection retained. Earlier new test fixture omitted explicit defaults/live-configured fake providers; corrected offline fixture and reran successfully. No real provider calls by these tests.
- Synthetic composed endpoint proves one native request for local welcome, selected Rachel intro, no outbox query, no discovery/start handshake; first-byte4conditional snapshots/4fenced batches across the entire writing+audio path,2provider reservations. Numeric timings are synthetic and are not live speed evidence. `artifacts/sw032/direct-request-benchmark.json`.
- Android JDK21/offline Gradle compile passed;38native assets byte matched, private credential pattern scan passed.

## Deployment and Pixel

Supabase `ezgawsdmvuoqrxlfbgen`: live-commentaryv8 ACTIVE, source downloaded and canonical SHA256 `7aa8a05b1a7b1de8a65872131634620b4bac5b16578c12de53ea06a655413b10` matched the qualified bundle. UnsignedPOST401. Game-roomv9 unchanged; no migrations. Existing server-only keys, Rachel voice, writer quality and administered200writer/200voice/36,000character ceilings/18October expiry unchanged.

Fresh Pixel serial `67080DLDV005JQ`, modelPixel11ProXL, transport `192.168.0.229:44167` verified before install. APK SHA256 `3c0613297c050dc19159a946c1367944b93f35e82bc4adbc01f6060b672dfc20`,7,563,498bytes; install-r succeeded, launcherStatusok, installedAPK pulled and hash matched. Data preserved. Postinstall screenshot shows the rendered centered score keypad, with owner interaction untouched. A startup Capacitor triggerEvent console error was observed; rendered UI continued, no native fatal exception was found in the inspected excerpt. This is not commentary physical acceptance.

Root ignored `artifacts/sw032/` retains gate/SQL/benchmark, deployment readback, APK verification, device/install/launch and screenshot evidence. No public guest-web publication.

## Owner test and rollback

Enter a fresh score with commentary enabled while Rachel is silent; compare Menu→More tools→Commentary response times with the prior8.269–13.554second/10.081second median baseline. Also test one score during speech separately to expose queue occupancy. Expect welcome once, correct player/blurb, feedback after speech, Undo cancellation and foreground-only playback. Physical post-change timings are open until fresh exact-build samples arrive; no percentage improvement is claimed.

Rollback: deploy SW031 commentaryv7 source and reinstall `artifacts/sw031/pixel-installed.apk` using-r. Keep existing migrations8–11 and all scores/mirrors/history. Old routes remain supported. Do not clear app data or roll back schema.

## Immediate owner retest after installation

Owner began interacting with the installed app while delivery checks were finishing. Read-only Pixel excerpt confirmed the new B3hg3dHe/C9ScPEa8 bundles and direct-request/bound callbacks. One earlier inspected score sample was9,063ms submission→native position (native request/startup7,669ms). Two retained subsequent samples were26,280/26,211ms, including16,987/16,691ms of explicit current-speech queueing and7,933/8,301ms native request/startup. A further request waited11,775ms. These are actual new-build proxies, not physical listening acceptance, and they do not establish acceptable latency. The earlier9,063ms line rotated out of the later bounded capture; its observed numeric value is recorded here separately from retained samples.

New server traces for reaction first-byte responses6.715–7.544s show writer1.765–2.304s and voice first byte0.169–0.213s. Hosted path still made7–10conditional loads,6–9fenced batches and10–13resource reads, plus accepted-outbox acknowledgement and provider reservation/result operations. This isolates substantial remaining serial backend coordination/retry/network work after removal of browser discovery/start round trips. Writing begins when the queued reaction request can start, so it currently adds to existing-speech queue delay. Do not label this a completed latency fix or weaken authority checks to reduce it.

Root artifacts/sw032/first-retest-requests.json and first-retest-pixel.json retain safe numeric evidence. No agent-triggered paid diagnostic requests; these samples came from owner activity. Architectural rollout is complete; responsiveness acceptance remains failed/open. Next performance work needs a separately qualified reduction in hosted accepted-fact/authority round trips and overlap of writing with current speech, with no polling or duplicate dispatch and without overlapping spoken audio.
