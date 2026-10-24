# SW-017 tournaments, Competition final chain and pulse UI

Prototype rollout authorized by user: earlier matching Supabase/web/Pixel update, then explicit “update the Pixel whenever you're ready” after combined candidate explanation. Matching backend/web first, Pixel afterwards; preserve existing account/game/app data. Not commercial release or independent acceptance.

## Qualified candidate

Node24.19.0 final gate575 tests/70 files, no skips, all web/native-web/room builds and unchanged source passed. artifacts/engineering/2026-10-14T00-51-48-176Z-d80553b7/report.json; dirty source SHA25671b688a9df19e39b86484ee703c363fd2ffadfa96135ceea3c534f6e0b9dd51f.23 isolated PostgreSQL checks passed (artifacts/sw017-rematch/database-report.json). Core/server/DOM tests include first final-category50, repeated3 attempts, third failure only, other players, protocol authority, frozen tournament rules, corrections, retry recovery and reduced motion.

Local built web UI manually exercised using synthetic local save: final Yahtzee50 leaves active chain, failed roll1 leaves2, successful next roll adds100 and renews attempt with3. Phone390x844/tablet768x1024 DOM widths match viewport; controls44–78px. Full-house/final/+100 celebration screenshots inspected. artifacts/sw017-final-chain/*.png. This is actual built local UI evidence, not two-account physical acceptance.

Backend SHA256b3d2965eef05b3f2258cc71d2d2f4e22f8a2b409b0496e81dcfc9f6de1b10c3b. Web index SHA256d197e6b81ab596a763475444570e0e8ab386d0e876bb4904b76779872153c9cb. Standard APK SHA2561a276a9b52e18da0f6d91e2fe137e83bb208a9f74b5b7c6d71aca681b8508e1b, artifacts/sw017-final-chain/android-test-candidate.apk; offline Gradle14s,124 tasks/27 executed. Asset comparison and installed readback to follow. No native Java changes/native unit rerun.

## Backup/compatibility

Fresh Supabase inventory:9 rooms/10 archived current-or-finished games captured in ignored database-before.json. Current backend readback SHA25619e88b5b856ff2bdef77606f68e308cd1704fc5bdc9a6647bb969ca17624ac63 preserved in function-before.ts. Previous Pages commit fcc4a63507f5021312e73ece7bcb132ff535e62d. Previous APK preserved as artifacts/sw017-rollout/pixel-installed.apk, SHA25633c40480751f6e9159f05198d44610c527d23ab5eaac6423aaa606a5a623b5f1. Fresh connected Pixel model confirmed; installed identity recheck before install.

Apply only additive migrations202610140001_hosted_tournaments and202610140002_competition_final_chain; initial history migration already present. No score rewrites, tables dropped, expired history fabricated or app clearing. V1 completed/ongoing/rematched games retain full rules; new manual Competition table/tournament opts into2. Existing3 physical games remain finished and unmodified. Competition first-final50 qualifies; extra attempts3 with100 per qualifying repeat. Standard/Accumulative/hardware retain existing rules.

Keep history and tournament protections after rollout. Older runtime cannot safely write v2 games; use compatible fixed-forward backend or disable affected writes rather than reverting to the previous writer. Previous web/APK can be restored preserving data, but cannot play v2 until updated. No source staging/push; Pages publishes built assets only.

## Actual execution

Completed authorized prototype rollout. Fresh installed previous APK hash matched33c40480751f6e9159f05198d44610c527d23ab5eaac6423aaa606a5a623b5f1; data-preserving adb install -r succeeded. Pulled installed new APK hash matches1a276a9b52e18da0f6d91e2fe137e83bb208a9f74b5b7c6d71aca681b8508e1b and MainActivity launch returned Status ok. App data not cleared; no native permission changes. Five APK assets matched qualified native bundle (apk-asset-check.json).

Two additive migrations pasted/read back exactly and executed successfully. Live postcheck:9 rooms/10 games unchanged, tournament/final-chain capabilities true, authenticated client direct RPC execute false. database-deployed.png. Migration hashes059048973864e5b40d2a8f0f3e2fdd2619a008b01e64a61b326da34228499777 and4d727f6b7fd1ef7bc4b46e1b2eb23315acb5deadd78ca808ece913671d945577. Backup database-before.json SHA256fc2c143d6576e0efef366154faafa0c032bdd62bc890534e379266963a0a91d8.

Backend deployment confirmed, full reload source hash equals qualifiedb3d2965eef05b3f2258cc71d2d2f4e22f8a2b409b0496e81dcfc9f6de1b10c3b. Legacy gateway JWT remains OFF with existing custom auth, unchanged. GET405/unsigned POST401/OPTIONS204 passed. Web gh-pages commita5dfa986a0ce87f82fc4c9fe7a987518238a0ffa. Live index/entry/prototype/UI/client bytes all matched qualified files (web-asset-readback.json). Existing browser initially served older cached description; one reload activated verified new Competition final-chain description. web-deployed.png. Guest browsers/Home Screen app should refresh before testing.

Scoped source archive artifacts/sw017-final-chain/software-source.zip SHA25611317829f99e43c2cf848595e1a72b52c89f53de49190b3edf91f0ae3fd82014 preserves src/server/tests/migrations/config, excludes env/secrets/ignored datasets. Dirty development source is not a reproducible clean commercial release.

User acceptance remains: two signed-in Android/Safari devices, tournament pause/restart/standings/final ceiling, final-chain repeat/failedattempts, nickname/history preservation and preference for new effects. Create a new manual Competition room/tournament for version2; old tables/rematches keep v1. No completed historical game reopened. User's three prior physically played games confirmed stored and reported working apart from final Yahtzee; this does not accept new tournament/chain candidate.
