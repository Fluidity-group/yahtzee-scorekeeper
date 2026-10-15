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
