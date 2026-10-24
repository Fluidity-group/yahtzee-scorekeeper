# SW-064: Reviewed YAHTZ Pixel update

24 October2026. Owner authorization: “lets update both phones. first the pixel.” Engineer Codex. Target freshly detected Pixel11ProXL USB serial67080DLDV005JQ. App ID com.fluiditygroup.diceclubhouse.dev.

Application source a73676b, handover/source checkout b3e7ea7; no application/native source diff between them. Clean Node24 gate1,191passed/13optional camera skips/all configured builds/source stable; independently reviewed SW063 fixes. Evidence artifacts/engineering/2026-10-24T16-11-57-202Z-b531a766/report.json.

Current installed version observed1.0/code1, last update20October. This task builds the same-ID/manual-test real-backend package with validated public configuration and voice/push disabled. No Supabase/database deployment or live table command. Preserve accounts, app storage and existing tournament/rules; use targeted install-r only after identity/certificate/asset verification. Never uninstall or clear data to resolve a failure.

Evidence/rollback: retain current installed APK, certificate/version and hash under ignored artifacts/sw064; record replacement APK identity, public asset equality, certificate match, install and launch separately. Same signing identity is required. Existing prior signed APK provides a data-preserving rollback under owner authorization. Actual user sign-in/game/tournament and touch acceptance remain separate from successful install/launch.

State: Pixel installed and launch verified on24October2026 at11:26 America/Chicago. iPhone remains next/not updated. User visual/account/tournament acceptance remains pending.

## Actual packaging and device evidence

JDK21/Gradle8.14.3 assembleDebug succeeded (216 tasks). Validated public-only manual-test configuration; paid voice/push remain disabled.46built web assets matched synced and APK bytes; two generated Cordova compatibility stubs are empty and verified. APK90465fe14bae6c6dd922b19821758dff10fb42eb4747d7d52986587d26647640; prior installed APK453fffff9756bbdf5a5c8cf6ae875e51b091a6b0552c44aa139ef0137dc695bd retained as rollback. Both verified with certificate SHA256e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8.

Targeted adb install-r returned Success. Installed APK pulled back and hash matched the candidate. App UID10531 and firstInstallTime16September2026 unchanged; lastUpdateTime24October2026 11:26:32. No uninstall/data-clear or hosted game command issued. MainActivity launch Status ok, cold start394ms, process running/top resumed; captured native fatal count0. This establishes install/launch, not actual UI/login/tournament/phone-game acceptance. Artifact evidence artifacts/sw064/apk-verification.json and install/launch logs. Stable APK artifacts/sw064/yahtz-reviewed-pixel.apk; before/after installed APKs retained.

Capacitor sync resolved the pinned dependency junction to local relative paths; only those generated path/line-ending changes were restored after packaging. No plugin/version or application/native source change was committed. Application source remains a73676b; installer built from b3e7ea7 checkout (completion docs only after qualification). Local public configuration stays ignored and is not pushed. No new APK signing key, app identity change, Supabase function deploy, schema/RLS/migration or tournament rewrite.
Subsequent owner confirmation: new YAHTZ UI and existing tournament visible under the same accounts on both Pixel and iPhone. iPhone update completed in SW065; full played-game acceptance remains pending. No backend/table command or data clear performed by Codex.
