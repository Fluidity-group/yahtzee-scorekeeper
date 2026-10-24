# SW067: Integrated manual-game update installed on Pixel and iPhone

24 October2026. Owner authorization: “pixel connected, update. Iphone also connected”. Coordinator: Codex. Both same-ID app updates installed and launched successfully; visual/account/tournament return and full played-game acceptance remain unconfirmed for these exact builds.

## Source and qualification

Source06db45a in `artifacts/sw066/source`; application code identical to qualifieddb094a4. SW066 independent agent reviewed the Amber UI, found/rechecked queued-dialog-close fix (30tests/8files); clean Node24.19.0 gate1,192passed/13optional camera skips/all builds/source stable. This deployment changes no application code, scoring/server contracts, frozen tournament rules or database schema. Camera and voice remain deferred.

## Pixel

Fresh target Pixel11ProXL serial67080DLDV005JQ. Retained installed APK before update. Candidate and prior app certificates matched SHA256`e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8`. Targeted adb install-r returned Success. Pulled-back installed APK SHA256`f95f3e1114ef97bf42e26364486df90363dbb42e4d9e59402809aca7a2f28de9` matches the qualified candidate exactly. Same app ID`com.fluiditygroup.diceclubhouse.dev`, UID10531 and firstInstallTime16September2026 retained. MainActivity launch Status ok, cold start367ms. No uninstall or app-data clear issued; private app-data contents not read. Prior APK retained at ignored `artifacts/sw067/pixel-before.apk` for authorized same-signer rollback.

## iPhone

Fresh wired/paired iPhone17Pro UDID00008150-000E6DAE0A87401C, iOS26.6.2, Developer Mode enabled. Connected through the previously verified strict-host-key Mac SSH connection. Isolated Mac source `/Users/ambercavanaugh/Developer/yahtzee-sw067-06db45a`; prior Mac source/apps retained.

Transferred committed source and validated public-only phone config/asset manifest; no server/provider credential, Windows session or private signing key copied. Mac Node24.19.0/npm-ci and public-asset preparation succeeded. Xcode27.1 signed device build succeeded in the existing desktop signing context; temporary job removed afterwards. Codesign deep/strict verified; same bundle ID and Personal Team2YD8HRPQ93; target UDID present in valid profile. Provision expires2026-10-28T19:09:36Z (28October14:09America/Chicago). Signed app binary SHA256`3ff2783dec589adfe59556d2ee8bd67a6755def73acc51ae633bbe6177a39be4`.

All46public assets match Pixel manifest, prepared/synced source and signed app byte-for-byte. Devicectl same-ID install and launch both reported success. Data-container metadata path changed; no private app-data contents read and no uninstall/data clear issued. Container path change alone does not establish contents lost or retained. Owner must confirm existing account/tournament return for this update.

## Evidence, rollback and next acceptance

Ignored integrated-checkout `artifacts/sw067` retains before/after APKs, package metadata, install/launch logs, asset manifest and Mac staging/signing/installation JSON. Mac isolated-source artifacts retain signed app and build/install logs. SW064/SW065 old signed builds remain available; restore only by authorized data-preserving same-ID/signer update, never uninstall/data-clear or revert shared scores.

No public web/backend/Supabase/database deployment, live scoring/table command, push enablement or camera/voice reactivation. Complete manual two-phone game remains open: same accounts/table/seat/rules, accepted score propagation, Undo/corrections, Home/Resume, background/reconnect, results/Ready/next-game and real account summaries. Install/launch success does not establish these observations.
