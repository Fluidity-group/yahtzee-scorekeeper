# SW067: Install the integrated manual-game candidate on both phones

24 October 2026. Owner: Dan/Amber. Coordinator: Codex, lead architect.
User authorization: “pixel connected, update. Iphone also connected”.
State: Pixel and iPhone deployed/launch verified. Visual/account/tournament return and full played-game acceptance remain open for these builds.
Source: integrated checkout `artifacts/sw066/source`, revision06db45a; application code unchanged from clean-gate revisiondb094a4. No source changes during packaging/deployment.

## Purpose and requirements

Deploy the independently reviewed SW066 manual-scoring correction and Amber core integration to Pixel and iPhone, preserving app identity, account/tournament data and frozen game rules. Camera and voice remain deferred. No public website/backend/database deployment or live game commands.

## Acceptance and verification

| Requirement | Observable criterion | Method / actual result | State |
|---|---|---|---|
| SW067-1 | Exact qualified Pixel candidate, compatible signer | APK f95f3e1114ef97bf42e26364486df90363dbb42e4d9e59402809aca7a2f28de9; candidate/installed-old certificate e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8 match | Verified |
| SW067-2 | Data-preserving Pixel update and exact installed bytes | Target67080DLDV005JQ; install-r Success; pulled-back APK matches; UID10531 and firstInstallTime16September2026 unchanged | Deployed |
| SW067-3 | Pixel launcher starts updated app | MainActivity Status ok; cold start367ms | Verified |
| SW067-4 | Matching source and46public assets on Mac | New isolated /Users/ambercavanaugh/Developer/yahtzee-sw067-06db45a; Node24.19.0/npm-ci/public config validation; all46source/synced assets match Pixel manifest | Verified |
| SW067-5 | Signed same-ID/team/device-valid iPhone app matches Pixel | Xcode27.1, fresh wired paired iPhone17Pro00008150-000E6DAE0A87401C, Developer Mode enabled; existing Apple Development identity found. Desktop-context build succeeded; deep/strict signature/team/device-profile and46packaged assets verified; profile expires28October2026 | Verified |
| SW067-6 | iPhone update/install/launch without uninstall/data clear | Same-ID devicectl install and launch both success; no uninstall/data clear, private app contents not read | Deployed |
| SW067-7 | Full two-phone manual-game acceptance | Scoring/Undo/corrections/Home-Resume/background-reconnect/completion-Ready-next and existing tournament/account return require owner observations | Open |

## Design and impact

Reuse the qualified SW066 Android artifact; verify prior APK/signature before targeted install-r. Retain pulled prior APK for rollback. Stage committed source and validated public-only configuration on the Mac; no provider/server secrets, Windows sessions or private signing keys transferred. Use its existing desktop signing context because prior SSH-only codesign failed; one-time job is removed after completion. Preserve original Mac source/app artifacts and install same bundle `com.fluiditygroup.diceclubhouse.dev`, team2YD8HRPQ93. Record container metadata without reading private app-data contents; changed container paths alone do not establish data loss or persistence.

## Risks and bounds

- No uninstall, app-data clearing, account/score/table mutation, schema/RLS migration or backend deployment.
- Stop on signer/team/bundle mismatch, expired profile, mismatched packaged assets or install failure; retain evidence.
- The prior iPhone development profile expires28October2026; inspect the newly signed profile before installation.
- Automated qualification remains SW066 clean Node24 gate:1,192passed/13optional camera skips/all configured builds/source stable. No source change warrants repeating that gate for this deployment-only task.

## Evidence and completion

Ignored evidence in `artifacts/sw067` under integrated checkout: Pixel before/after APKs, package metadata, install/launch logs, Mac staging/asset/signing/install records. Mac evidence lives under its new isolated source/artifacts. Both installed/launch verified. Release details: ../releases/SW-067-core-manual-phone-update.md. iPhone data-container metadata path changed; contents unread and owner return confirmation pending. One-time Mac build job removed. Both-phone visual/account/tournament and played-game acceptance are distinct from install success.
