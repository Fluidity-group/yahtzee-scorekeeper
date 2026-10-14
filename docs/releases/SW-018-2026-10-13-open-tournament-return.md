# SW-018 open tournament return rollout

User requests account-owned open-tournament list and safe exit/return as host. Prior “update the Pixel whenever you're ready” authorization continues for this related tournament improvement; matching backend/web required. Preserve game/app/account data. No database migration, scoring/rules changes or history mutation.

Qualified dirty development source SHA256d31284d2f728e342e75af6d800c267e31c0e32a37136a7a185cce10e3e417aac. Final Node24 gate582 tests/71 files, no skips, all builds/source consistency passed; artifacts/engineering/2026-10-14T02-01-04-126Z-500d4a34/report.json. APK built offline13s/124tasks27executed, artifacts/sw018-return/android-test-candidate.apk SHA25695c28dfb51ab754ee1ee1e2702955af2db543ee56107e5cd344f4277b0f5c8a6. Backend67637dd6d23301d2f5a2736632f457b56d07dd519b82eb23ef89b45f18d24e8a; web index36b11de6acb5ec0a6c93850aef213e085c0a1807a20ce209367f89d712f6380e.

Fresh paired Pixel confirmed connected. Prior installed APK preserved as artifacts/sw017-final-chain/pixel-installed.apk SHA2561a276a9b52e18da0f6d91e2fe137e83bb208a9f74b5b7c6d71aca681b8508e1b; recheck before update. Prior backendb3d2965eef05b3f2258cc71d2d2f4e22f8a2b409b0496e81dcfc9f6de1b10c3b and Pages commita5dfa986a0ce87f82fc4c9fe7a987518238a0ffa. Compatible prior SW-017 backend/web/APK can be restored preserving tournament/history schema and rules2; list unavailable on prior backend, new UI must report server update requirement. Never revert to a pre-history writer or clear records/app data.

Completed prototype rollout. Prior backend source captured/readback hash matchedb3d2965eef05b3f2258cc71d2d2f4e22f8a2b409b0496e81dcfc9f6de1b10c3b in artifacts/sw018-return/function-before.ts. Updated backend deployed through dashboard/full reload byte hash matched67637dd6d23301d2f5a2736632f457b56d07dd519b82eb23ef89b45f18d24e8a; backend-deployed.png. No schema/permission changes. Unsigned tournaments request401.

Web gh-pages commit69b13ed99419cb4142cbafd5044cb3c5784a5505. Public index/entry/UI/client/prototype HTTP200 and exact bytes matched qualified build (web-asset-readback.json). Existing browser/Home Screen may need refresh. Source checkout not staged/pushed.

Five APK assets match qualified dist-native (apk-asset-check.json). Fresh installed predecessor hash verified1a276a9b52e18da0f6d91e2fe137e83bb208a9f74b5b7c6d71aca681b8508e1b. Data-preserving install-r succeeded; installed sha256sum95c28dfb51ab754ee1ee1e2702955af2db543ee56107e5cd344f4277b0f5c8a6 matched candidate; MainActivity launch Status ok. No app clearing or new native permission. No Java changes/native unit rerun. No hosted scoring/pause/membership mutation during rollout.

Authoritative return reads same saved game/host and keeps shared pause until explicit host resume. Paginated member-only query independently finds older open tournaments, excludes completed and does not expose other accounts' memberships. New signed-in two-phone exit/restart/resume acceptance remains open; automated mock transport/DOM evidence does not establish physical PostgREST/account journey acceptance.

Scoped source archive artifacts/sw018-return/software-source.zip SHA25665e2c266700650c5748669f2a5784bf7300e18593c8910365ca4c17c4b694c15 preserves candidate source/config/tests, excluding env/secrets/ignored data. Documentation follows source qualification; commercial reproducibility remains unclaimed.

