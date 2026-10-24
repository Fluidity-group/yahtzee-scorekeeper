# SW-017 hosted manual rematch deployment

User authorized updating Supabase, web and the paired Pixel on 13 October 2026 (“update everything”). Development qualification: 500 tests/63 files, all configured builds and source consistency; eight isolated PostgreSQL checks. This rollout includes slice1 only, not tournaments or Competition v2. Physical two-account acceptance remains open.

## Preserved identities and rollback

- Qualified dirty source snapshot: artifacts/sw017-rollout/software-source.zip, SHA256 c4806875819c895c9818911bea7f4c21fe5e04b8dea2bce402cbb272895fc25d. Source HEAD e599b71dc60a5cb20b9aa9091c8e4a7453b72dfc; no clean-source release claim.
- Candidate migration SHA256 76fcaf067a10595514dcdb5eb5e6781e6e2c9e9dce3786b2a869d3f563999aed; candidate function SHA256 19e88b5b856ff2bdef77606f68e308cd1704fc5bdc9a6647bb969ca17624ac63.
- Candidate APK SHA256 33c40480751f6e9159f05198d44610c527d23ab5eaac6423aaa606a5a623b5f1. Prior installed APK saved as artifacts/sw017-rollout/pixel-before.apk, SHA256 fc489ac6952a17e99ccf7f398b4a852468810ea106daa146688cc9aa4c084ef9.
- Prior function source saved privately as function-before.ts; normalized SHA256 c196a85a9b4bf8cd5a3104b4c5c4d2e6a224899ef8e5cc5dd0193306a6f924cc.
- Prior Pages commit 4fd84d098e503685bc9c26e57c2a7eaaf978bbbd.
- Eight existing room records, seven with games, captured privately in ignored rooms-before.json before migration; SHA256 9b72865d87fe7f97662f621db64fb34c182541054e28996b6a38fe87c15e2719. History table absent before rollout. No private account details copied into this record.

Keep history tables and a transactional compatible backend after migration. Do not restore the older room-only writer once history is active; fix forward or safely disable game writes/rematches. Web/APK rollback must retain user data and remain compatible with current game identities. No room deletion, app clearing or schema rollback authorized.

## Execution

Completed prototype rollout on 13 October 2026. Migration dashboard reported success; live verification found eight rooms, seven archived games, all seven snapshots exactly equal to the original current game snapshots, historyVersion1 and capability true. Authenticated clients cannot execute the capability RPC directly. Proof: artifacts/sw017-rollout/database-verified.png. No existing scores or rosters changed.

Function deployed through existing dashboard; full reload/clipboard readback SHA256 matches the candidate. Legacy gateway JWT verification remains OFF for existing custom authentication, unchanged. Public GET405, unsigned POST401 and OPTIONS204 passed. Exact authenticated two-account game operations remain physical acceptance.

Web published as gh-pages commit fcc4a63507f5021312e73ece7bcb132ff535e62d. Live index HTTP200/hash matches candidate b31b8973f5e0597d9ccd175b1bca2704e03a885c8de4f2bcee28f441d9217813; entry/prototype/UI/client JavaScript HTTP200 and exact byte identity all passed (web-asset-readback.json). Public browser rendered manual game setup; web-deployed.png. Existing browser/PWA sessions may need a reload to activate new assets.

Freshly connected Pixel updated with adb install -r, preserving app data. Installed base.apk pulled and SHA256 matches candidate 33c40480751f6e9159f05198d44610c527d23ab5eaac6423aaa606a5a623b5f1. Launcher resolved and MainActivity start returned Status ok. No app clearing/uninstall or permissions changes. Sandbox ADB/network attempts were unavailable; authorized elevated commands completed successfully.

Ready for user testing of manual host/QR guest, two completed games, both-ready rematch, winner starts next, correction/withdrawal/reconnect and history. These are deployed features, not yet physically accepted. Full tournaments, account-wide analytics, nickname editing, manual combination reports and Competition v2 remain pending sprint slices.
