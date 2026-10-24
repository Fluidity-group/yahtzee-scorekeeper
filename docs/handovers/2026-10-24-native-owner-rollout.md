# Owner-led Pixel then iPhone test update

24 October SW067 both-phone update completed under explicit owner authorization. Integrated source06db45a/applicationdb094a4 installed and launched on Pixel11ProXL and iPhone17Pro; all46public assets match. Pixel installed APK f95f3e1114ef97bf42e26364486df90363dbb42e4d9e59402809aca7a2f28de9 read back exactly, same signer/UID10531/first-install date. iPhone same-ID/team signed Xcode build/profile/assets verified and devicectl install/launch succeeded; data-container metadata path changed, private contents not read. No uninstall/data clear or backend/DB/public web deployment/table command. iOS profile expires28October2026 at14:09America/Chicago. New-build account/tournament return and full manual game acceptance remain pending owner observation. Camera/voice stay deferred. See integrated docs/releases/SW-067-core-manual-phone-update.md and docs/plans/SW-067-core-manual-phone-update.md. This supersedes older native-update-pending notes below.

Requested sequence: Dan updates the Pixel from the ROG after accepting the reviewed build, then supplies/uses the Mac/Xcode steps for Amber's iPhone. These are preparation instructions, not a record of installation. No backend/database deployment is required for this UI candidate.

## Qualified source and data preservation

Use `codex/amber-ui-lab` at the recorded SW063 checkpoint. Application qualification is commit a73676b: Node24,1,191tests passed/13optional camera skips/all configured builds/source stable. Later completion-document commits do not alter app source. The active ROG source is `C:/Codex/Yahtzee Game/artifacts/sw054/source`; do not switch/reset the dirty old root checkout. Confirm fresh Git/source/device identities before packaging.

Keep the current app ID on both platforms: `com.fluiditygroup.diceclubhouse.dev`. Keep existing signing identities, accounts, browser/app storage and tournament membership. Never uninstall/clear data to work around signing, login or build problems. Do not migrate or rewrite existing tournament rules, roster or scores. Preserve prior APK/app/source rollback artifacts separately.

## Dan: Pixel update from ROG

1. Select the qualified review source. Use Node24 and its pinned dependencies. Ensure `.env.ios-test.local` contains only the validated public phone fields from the existing phone handoff; never copy server/provider keys. The helper rejects unexpected fields. Existing source under SW045 has the previously used ignored public-only configuration; validate it before reusing it in the chosen checkout.
2. Run `node scripts/prepare-ios-test.mjs --check`, then `node scripts/prepare-ios-test.mjs`. This prepares the shared manual-test web assets with the real public backend and voice disabled; it does not install an iPhone app from Windows. Then run `node node_modules/@capacitor/cli/bin/capacitor sync android`.
3. Build those already-prepared assets with `scripts/build-android.ps1 -SkipWebBuild`, using the existing ROG JDK21 and Android SDK paths. Do not let a default unconfigured web rebuild replace the public-backend test assets. Verify the resulting app's bundle ID, signing certificate, source/synced/APK asset hashes and source revision. The old SW052 verification helper hard-codes the old source/APK; do not treat it as proof for the new package.
4. Freshly connect/unlock the Pixel and select its actual adb serial. Verify the installed app/signing identity and preserve data. Use a targeted data-preserving `adb -s <verified-serial> install -r <verified-apk>`. Stop if the certificate/app ID differs; do not uninstall. Record install result and actual package hash, then launch and confirm the new UI on the phone.

## Amber/Dan: Mac and Xcode iPhone update

1. Transfer/checkout the same qualified source on the Mac; copy only validated public app configuration, not Windows sessions, private keys or server credentials. Use Node24 and pinned `npm ci` dependencies. Run `node scripts/prepare-ios-test.mjs --check`, then `node scripts/prepare-ios-test.mjs` to build and sync the iOS assets. The helper checks Xcode and the qualified Capacitor adapters.
2. Open `ios/App/App.xcodeproj` in Xcode. Select the App scheme, the connected/unlocked iPhone and the existing signing team/bundle ID. Verify the current signing certificate, device trust/Developer Mode and provisioning expiry. The previous Personal Team profile date is historical, not fresh signing evidence.
3. Build and Run in Xcode. The owner handles any Apple sign-in, keychain, device-trust or developer-trust prompt locally. Do not transfer passwords or private signing keys. Keep the same app identity/container; do not delete the installed app. Record signing/build/install/launch separately and compare the packaged public assets to the qualified shared source/Pixel package.

## Actual two-phone game acceptance

Sign into the same existing accounts, return through Saved games & tournaments and verify the same tournament/game/seat/rules/score state on both phones. A paused tournament stays paused until an intentional owner action. Play the intended real game; accepted scoring saves real progress. Check own-seat authority, both-phone updates/reconnect, score confirmation/Undo, back/Home/Resume, readability and final Ready/next-game behavior. Confirm final trophies/Personal Best/Razzie statistics only after completed games. Record the actual phone builds and observations; automated tests and installs alone do not establish this acceptance.

If a UI update fails, stop and retain evidence. Restore a known signed same-ID app/source through a data-preserving update, not a database rollback or app-data reset. See SW052 for historical rollback identities and SW063 for current review scope/remaining gates.

Deployment progress: SW064 now records Pixel installation/launch of the reviewed build with preserved app identity/data container. iPhone remains pending; follow its fresh Mac/Xcode checks above. These instructions are not proof of two-phone game acceptance.

Latest SW065 completion supersedes earlier pending notes: Pixel and iPhone installs/launches verified;46public assets matched, owner confirmed Home and same-account existing tournament on both. No data-clear/uninstall/Supabase-DB deployment/table command; full played-game acceptance pending. iPhone development profile expires28October2026; inspect signing freshly before future updates.
