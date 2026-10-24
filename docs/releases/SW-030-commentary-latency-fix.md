# SW-030 commentary latency repair — 14 October2026

State: implemented, qualified, backend deployed and Pixel installed for owner review. Codex lead/self-review; not independent release or physical sound acceptance. Owner explicitly requested continued investigation, research and fix after SW029 telemetry identified14.4second score startup and26.7second welcome. No additional paid diagnostic generation, key/config/model/voice change, game score edit or public guest-web publication.

## Diagnosis and repair

Largest measured delay was writer-result→voice dispatch:6.891seconds score/15.307seconds welcome. Writer stage2.5–3.0seconds includes reservation; ElevenLabs first byte0.18–0.32seconds. Repeated whole-scope RPC transfers and polling writes are architectural contributors; exact old network/CAS/worker split was uninstrumented. SQL means15.63ms load/17.06ms commit do not explain multi-second gaps by themselves. [Investigation and primary-source research](../plans/SW-030-commentary-latency-investigation.md).

Version-checked refreshes omit unchanged snapshots, private warm-isolate cache seeds are checked against the actual database version before use, and delta commits send only changed/deleted records. Every authenticated request retains initialization, explicit authorization/refresh, room membership/host, profile, Undo, audience, lease/epoch and provider-budget checks. Unchanged caption projection polling skips writes; authority-sensitive no-op transactions keep canonical CAS. A single global version remains for now, preserving the existing global provider ceiling and consistency; per-room partition/event delivery remains a measured follow-up option.

Migration9 adds service-role-only conditional-load and patch RPCs. Patch locks the scope exclusively before reconstructing full state, then invokes the unchanged canonical commit with all existing protections. Anonymous/authenticated roles remain denied. Old clients/backends remain compatible. No new client-authorized direct SQL route.

Privacy-safe request/background/stream-first-byte numeric logs and Server-Timing expose operation counts, upstream header times and submitted byte totals. New jobs persist readyAt. Pixel logs native first-byte and playout separately; score→native timing menu remains available. No captions, blurbs, request bodies, keys or claim tokens are logged. No new regional pin: database is us-east-2, and the researched edge-region list did not offer a matching pin; diagnostics now record actual SB_REGION. No buffering/voice/model/quality change was justified by current evidence.

## Qualification

Clean executable source `20fd90a40f53fa526dac624b1c53d1936622bd19`, branch `codex/sw030-commentary-latency`; source SHA256 `f1ab95898216b596ec97ac50c9f0f60d998db3d08b566f4c5bcdefffb39a90c5`. Isolated checkout `C:\Users\Fluid\.codex\worktrees\poc-s01-commentary\Yahtzee Game`. Node24 configured gate:996tests passed,13optional camera skips, all builds/unchanged source. Report `artifacts/engineering/2026-10-15T00-18-38-053Z-fa292d2f/report.json`. Earlier run passed tests/builds but final source changed after a temporary Windows mapped-file lock left a stale generated bundle; qualified rerun includes the final generated source. No gate waiver.

27 actual disposable PostgreSQL checks passed via incremental path, including grants, concurrent CAS, global budget/attempt retention, immutable owner, lease expiry at commit, hearing receipts, Forget/retention, outbox authority and local-seat mirrors. Source tests cover stale warm seeds, malformed conditional clocks, unrelated concurrent changes, deletion transport, zero-write ready polling and preserved private/cap boundaries.

Representative transport workload (80jobs×6,000character evidence, initialize+five unchanged polls+one status update):6,287,238→490,581JSON bytes,92.2% reduction;6→1writes. This is not a physical latency benchmark. Live conditional-load read check:559,747byte snapshot→69byte not-modified reply, current version checked. Root ignored `artifacts/sw030/transport-benchmark.json`, `database-qualification.json`, `engineering-qualification.json`, `live-conditional-check.json` retain evidence.

## Rollout identities

Supabase project `ezgawsdmvuoqrxlfbgen`, migration `202610140009_commentary_incremental_transport.sql` SHA256 `1c559745f71e1d4397fca1062614377398f4873b51011a46342ca95d5a8ec67d`. Transactional apply and schema-cache reload;17rooms/18games/revision sum334 and complete row fingerprints unchanged before/after. New RPC privilege readback and private RLS verified. Live-commentaryv6 ACTIVE, downloaded bundle canonically matches `c97eaf5d1bfcf6eaecc7301de5ecc6844034d97469fe1361975f959a30f1353b`; unsigned401. Game-roomv9 remains unchanged. Existing provider/administered ceilings/expiry retained.

Pixel11ProXL fresh inventory; install-r with data retained, launcher Status ok. APK SHA256 `a6a22ea6b3114235ae1bdb0a90c819c9b919a7d6e03a4b72696c4bb1fb0d9d35`,7,562,568bytes;38native assets matched, private full-key pattern scan passed, installed APK pulled and hash-matched. Root ignored `artifacts/sw030/` contains manifests and installed readback. Native change is timing logging only; scoring/UI behavior remains SW029.

## Remaining acceptance and rollback

Physical post-fix score-to-sound benchmark is open. Owner should play several fresh scores with commentary enabled, allow playback to start/complete, then inspect Menu→More tools→Commentary response times. Correlate new numeric server/native logs to separate residual request, worker, first-byte and playout gaps; report sample count/median/tail before asserting audible improvement. No synthetic/generated audio or server receipt is represented as physical hearing.

Rollback: restore SW029 commentaryv5 source and previous Pixel APK `artifacts/sw029/pixel-installed.apk` under authorized repair scope. Leave additive migration9 in place; it does not replace the canonical commit and old RPCs remain compatible. Retain migration8/local mirrors and existing scores/history. Disable voice if needed; no destructive database rollback or app clearing required.
