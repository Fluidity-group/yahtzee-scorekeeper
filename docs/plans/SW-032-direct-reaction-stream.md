# SW-032: Direct accepted-reaction audio on Pixel

14 October 2026 / Codex lead. State: implementation in progress; deployment and physical acceptance open.
Baseline: isolated codex/sw031-commentary-roundtrips, qualified80393ca; latest SW031 owner retest median10.081s (8.269–13.554s).

## Purpose and requirements

User authorizes removing commentary discovery polling and extra playback handshakes, then deploying backend/Pixel for measured response testing. One authenticated native reaction request selects only an accepted score or explicitly armed welcome, writes the line, atomically claims/reserves voice, and streams MP3. Scoring remains independent. Keep freshness, membership/host, profile/Undo, device/epoch ownership, paid ceilings, true native receipts, feedback and quiet resume.

## Acceptance and verification

- Direct native hot path has no jobs-read or playback-start discovery/claim HTTP calls. Server-derived identity metadata binds receipts before bytes.
- New-score updates and explicitly armed greetings trigger requests; resume does not replay history; newest waiting score follows current speech.
- Forged/missing events, guests, stale profile, Undo, lease conflicts and duplicate requests cannot dispatch unauthorized voice.
- Node24 configured gate, actual PostgreSQL suite, Android compile, bundle/APK readback and data-preserving Pixel installation.
- Actual score-to-playout proxy measured on owner retest; provider transfer is not physical hearing. No latency success prefilled.

## Design and impact

Versioned direct GET reaction route with bounded request headers. Existing authenticated mutation/receipt routes retained for old releases and rollback. Direct mode suppresses background generation on its initiating commentary POSTs; accepted outbox ingestion is server-only. No migration planned. Native parses bounded server binding metadata before playout and retains foreground interruption/lease timers. Lease renewal remains safety maintenance, not discovery polling.

## Risks and bounds

High: provider duplication or stale authority; durable writer claim, exact CAS/room fences, final current-state acquisition/audio reservation, first-byte validity and fixed dispatch ceilings retained. Medium: native binding ordering/quiet resume/welcome completion; explicit regression cases and owner physical gate. Existing allowance unchanged. No agent-triggered paid diagnostic generation planned; owner test supplies real latency.

## Evidence and completion

Pending implementation and qualification. Preserve all existing games/profiles and root dirty work. Root task record is not evidence of current installed state.

## Delivered implementation and evidence

Direct accepted-event/native response path implemented. Local owner mirror avoids outbox discovery; hosted accepted outbox authorization retained. Final writer validation+claim+voice reservation share one CAS/room-fenced batch, with providers outside retryable work. Native binds server authority before receipts, never manufactures hearing. No native ready-job polling/start handshake;5second timer only renews an active safety lease. Current speech/terminal receipts, latest waiting score, explicit welcomes, quiet resume, feedback/Forget and cancellation remain.

Clean34084bc qualified under Node24:1,023tests passed/13optionalcamera skips/all builds/unchanged source;31real PostgreSQL checks, including combined direct commit before bytes. New SQL fixture failures were corrected (explicit settings and live-configured offline fake providers), then complete suite passed. Android compile/38assets/private-key-pattern scan passed. Synthetic direct local first-byte trace covers4snapshot/4batch phases across writing+audio; not live latency evidence.

Commentaryv8 deployed/canonical readback matched/unsigned401; roomv9 unchanged, no migration or agent-triggered paid diagnostic. Pixel serial verified, APK3c0613297c050dc19159a946c1367944b93f35e82bc4adbc01f6060b672dfc20 installed-r/readback/launch verified with data preserved. Rendered keypad checked, owner interaction untouched. A startup Capacitor triggerEvent error was logged while UI rendered; no physical voice proof inferred. [Release, exact identities, owner test and rollback](../releases/SW-032-direct-reaction-stream.md). Actual owner latency/quality acceptance remains open.

## First installed-build retest

Owner activity immediately supplied fresh exact-build proxies:9,063ms in an inspected earlier score; retained queued samples26,280/26,211ms with16,987/16,691ms current-speech waits and~7.9/8.3s native request/startup. Hosted backend first-byte6.7–7.5s; writer1.8–2.3s,voice0.17–0.21s. Remaining hosted conditional loads/batches/resource reads and writer-after-speech scheduling still dominate. Rollout and no-poll/no-start-handshake architecture verified; latency acceptance remains failed/open. See release retest section and root ignored artifacts/sw032/first-retest-*.json. No additional agent-triggered generation.
