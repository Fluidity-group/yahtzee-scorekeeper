# SW072: Start stabilisation with release identity and asset completeness guards

30 October 2026. Owner: Dan. Coordinator/implementer: Codex. Independent reviewer unassigned.
Scope: first implementation slice of [SW071](SW-071-versioned-engine-stabilisation-sprint.md), authorized by “lets get this going”. Design PR #5 is still open; this branch is stacked on its exact tip a394b64. Shared master remains9179f73. No deployment or rule semantics change.

## Requirements and evidence

| ID | Required outcome | Method | Result |
|---|---|---|---|
| R1 | Identify packaged source independently of native versionCode | Embedded commit/source digest/profile/state plus matching JSON artifact; native App.getInfo separately | Verified automatically; full gate and packaged bundle identity checks passed |
| R2 | Missing or changed declared UI assets stop a build | Reviewed SHA256 contract checked in Vite buildStart; new public assets require declaration | Implemented; missing/altered/undeclared cases covered |
| R3 | About is reachable through the actual application | Home → clubhouse menu → More tools → About this build; no game mutation | Focused app navigation test passed |
| R4 | Do not claim a complete baseline without recovered source | Recovery ledger below; provenance and product acceptance separate from build identity | Open; ROG access requested |

## Implementation and limits

scripts/build-identity.mjs inventories Git source without reading environment values, remotes, user names or credential paths. Same-commit dirty edits change the source fingerprint; modified builds are labelled, not represented as clean releases. Vite embeds that identity in the application and emits build-identity.json. This is source identification, not a signed APK hash or a claim that ignored configuration/assets were captured. Public configuration/signing identities and final artifact hashes still belong to release qualification. The asset contract separately covers declared public runtime files.

public-assets.required.json declares the eleven existing icon/sound runtime files by path/hash. Build preparation rejects missing, changed and undeclared runtime files. Optional public/camera-assets, README.md and .DS_Store are excluded explicitly. Recovered portrait assets must be reviewed and added with their owning source; this initial inventory does not falsely claim to contain those missing portraits. No asset contract is refreshed automatically by the build.

The About dialog displays commit, source state/fingerprint and build profile; native platforms additionally show the actual installed version/build from Capacitor App, and an active game shows its current mode/rules version. Existing v2 semantics are not claimed to be fully pinned by these labels. Development previews without packaged metadata say so. No account IDs, device serials, keys, environment contents or private portraits are published.

## Baseline recovery ledger

| Symptom | Actual evidence | Required next evidence | State |
|---|---|---|---|
| Avatar/style regression | Preserved before APK has richer picker/four portrait style images, absent from current source/new package | Accessible ROG source for prior build70; source/assets provenance, approved behavior | Blocked on source access |
| Avatar did not transfer | Current Git picker stores local preferences only | Owner chooses local-restoration vs account-sync scope; preserve unknown stored IDs until source recovered | Decision requested |
| Screen sizing | Old/new APK CSS differs; owner reports older sizing | Recovered layout source and owner-approved comparison at target viewports/preferences | Unresolved; no fix claimed |
| Animations missing | prototype dispatches score pulse only on upper/repeat bonuses; helpers cover more moments | Recovered approved event policy and actual score-to-effect integration regressions | Unresolved; no wiring change in this PR |
| Source identity unclear | APK matched requested Git source but omitted prior features | About/build artifact identity plus pre-release feature comparison ledger | Identification implemented; comparison remains open |

Raw prior/new APK evidence remains ignored under /srv/yahtzee/main/artifacts/sw070. Do not copy compiled bundles into maintainable source or overwrite the preserved dirty ROG checkout. Read-only source recovery must exclude secrets, signing material, personal portraits, account sessions and datasets. Once accessible, compare paths/content to Git, classify each difference, and recover only scoped reviewed source/assets on a dedicated branch.

## Parallel development handoff

The main checkout remains a coordination baseline. Use one isolated task worktree/branch and independent dependencies/build output per person. Current worktree: /srv/yahtzee/main/artifacts/sw072/source; branch codex/sw072-release-baseline-guards. Neither main nor PR #4/#5 working folders were edited.

For the next tasks, assign one owner to ROG baseline recovery and one to approved rule examples/contracts. Keep prototype.js single-writer; this PR only adds About navigation and does not extract the engine or change score effects. Review public-assets.required.json alongside every recovered artwork change. Record dependencies when stacking; merge design before this branch, retarget via GitHub if necessary, and compare the final diff after squash/merge. Agents do not merge their own work.

## Decisions and remaining work

Outstanding source access, Competition first-vs-repeat final-chain policy and avatar-transfer scope were requested asynchronously. Rule-dependent changes wait for answers. Work on actual missing UI and game-engine extraction remains in SW071; this slice is a release safeguard, not completion of S1–S8 or permission to install phones.

## Checks and completion

Focused Node24 tests: 12 passed across4files (asset/source guards, About actual app navigation, adjacent Home/native contracts). Clean7b31215 Node24.15.0 full gate passed: 1,222tests/13optional camera skips/all configured builds/source stable. Emitted and embedded metadata matched commit/source fingerprint for production, native and ios-test profiles. Evidence: artifacts/engineering/2026-10-31T04-38-54-830Z-42be367f/report.json. UTC evidence date is31October; local task date is30October America/Chicago. No native compilation/install, live data/provider/backend mutation or physical acceptance. Shared master untouched; all implementation remains on the scoped branch.
