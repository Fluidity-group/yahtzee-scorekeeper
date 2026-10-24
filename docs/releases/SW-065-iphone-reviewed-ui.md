# SW-065: Reviewed iPhone update preparation

24 October2026. Owner explicitly authorized both phones, Pixel first. Pixel SW064 install/launch completed. iPhone installation and launch are now verified; owner confirmed the new UI and existing tournament on both phones.

Same application source a73676b, staged checkout e6d97c8 (intervening docs only). New isolated Mac directory /Users/ambercavanaugh/Developer/yahtzee-sw065-e6d97c8; prior native source/app artifacts left untouched. Source and validated public-only phone configuration transferred; no Windows login, provider/server credential or signing private key copied. Mac Xcode27.1, Node24.19.0 and existing valid Apple Development identity/Personal Team2YD8HRPQ93 inspected freshly. Keep bundle com.fluiditygroup.diceclubhouse.dev.

Physical iPhone17Pro UDID00008150-000E6DAE0A87401C initially listed paired/available, but app query encountered connection-reset transport failure. USB/unlock/trust requested. Dependency/public asset preparation completed successfully; all46source/synced/signed iPhone public assets match the installed Pixel. No install until identity/profile/assets and real device connectivity verified. No uninstall/data clear, account/room command, Supabase/database deployment. Actual phone UI/account/tournament acceptance remains separate.

## Successful build, install and owner confirmation

Initial direct SSH codesign failed with errSecInternalComponent. A one-time build in the already logged-in Mac GUI bootstrap context succeeded without changing keychain permissions, collecting passwords or exporting keys. The completed temporary job was removed. This was not a persistent login item or scheduled automation.

Xcode device build succeeded; codesign deep/strict verification passed. Same bundle com.fluiditygroup.diceclubhouse.dev and Personal Team2YD8HRPQ93, physical target included in the provisioning profile. Profile expires2026-10-28T19:09:36Z (28October14:09America/Chicago); future development rebuilds require fresh signing checks. Signed binary SHA256a636f1ae295346e9c6a0b13056da22838be24a3cf85e5793a079067ca7bbf700.46public assets matched the Pixel/source/synced/signed bundle byte-for-byte.

Devicectl installed the same-ID app and launched it successfully. No uninstall/data clear or live game command issued. iOS reported a changed app-data-container path; no private app data or authentication contents were read. Owner explicitly confirmed “Yes, both phones look correct” in response to whether the new YAHTZ screen and existing tournament were visible under the same accounts. This confirms Home/account/tournament-return acceptance, not a complete played game or all visual/gesture edge cases. Full two-phone game acceptance remains pending.

Local evidence: artifacts/sw064/mac-stage.json, mac-public-asset-match.json, iphone-signed-verification.json and iphone-installation-verification.json. Mac evidence is in the isolated source/artifacts folder. Prior native Mac project/app left intact for rollback. Source deployed remains a73676b (checkout e6d97c8 docs only). Main/backend/Supabase/schema/RLS/migrations and existing frozen tournament rules were not changed.