# SW-001: Reproducible standard native build

Date: 1 October 2026. Owner: product owner. Engineer: Codex. Independent reviewer: unassigned.
State: implemented; automated source-path verification passed; not deployed or physically accepted.
Project/gate: software, reproducible-input portion of G0/G2. Dirty baseline preserved.

## Purpose and requirements

SW-001-A: standard native build must resolve versioned generic BLE panel without private inputs.
SW-001-B: authorized private evaluation remains explicit, requires private inputs and emits the existing publication-blocking marker.
SW-001-C: native asset base and disabled service worker remain supported in both modes; setup must not offer unavailable capture in standard native.
SW-001-D: supported source snapshot excludes ignored private code; retain actual build/test evidence and dependency identity.

## Acceptance and verification

| Requirement | Method | Actual evidence | State |
|---|---|---|---|
| A | Build prepared source copy without local-evaluation | before-native.log fails ENOENT; after-native.log builds generic panel | Verified |
| B | Explicit evaluation build with/without private inputs; marker regression | evaluation-absent.log fails ENOENT; marker test passes; local private build passed with marker | Verified |
| C | Resolved Vite config and local/host setup tests | 11 focused tests passed with Node 24.19.0 | Verified |
| D | Non-ignored source inventory and engineering gate | Supported-source gate passed; see completion limits | Verified for source paths |

## Design and impact

Root cause: native alias unconditionally selected deliberately ignored local-evaluation/godice/panel.js. Native-mode UI assumed capture availability. Standard native now uses src/dice/connection-ui.js; native-evaluation opts into private panel and marker. No automatic fallback. Pure rules, seat/revision checks and command authority unchanged. Generic connection testing does not qualify GoDice decoding. See ../android-development.md for build/sync and configuration migration and ../decisions/2026-10-01-native-distributions.md for the distribution decision.

Reviewed npm build/sync, engineering gate, PowerShell packaging, web publication guard, Capacitor webDir and source mode checks. Standard gate stays native. Both sync paths overwrite dist-native; packaging checks marker even when skipping web build, and evaluation APK uses a distinct name. Private sources and existing ignore rules are preserved.

## Risks and execution bounds

Private inputs/licence and configuration remain separately provisioned; standard success cannot qualify proprietary evaluation. Existing native-specific env must be provisioned for native-evaluation. Shared output requires explicit re-sync; marker check bounds accidental stale private packaging. No staging, publishing, deployment or physical test is authorized. No concurrent implementation observed; current checkout used, pre-existing changes preserved.

## Completion and decision

Initial reproduction attempt with npm could not start (npm absent on this shell PATH); direct Node/Vite initially hit sandbox spawn EPERM. Approved subprocess run reproduced ENOENT in correct reproduction directory. These setup failures are not defect reproduction. Logs: artifacts/native-baseline-check/reproduction/. Actual clean-source compilation then passed. Dependency install/aggregate evidence and limits to be recorded after verification. Remote CI, independent review, Android Gradle/APK, phones, real GoDice and Pi acceptance remain open.


Final automated evidence (1 October 2026):

- Node 24.19.0 workstation gate: 299 tests across 47 files, zero skips; web/native/room builds passed. Report: artifacts/engineering/2026-10-01T15-06-33-211Z-4cf812d3/report.json. Source SHA-256: 14ee07cc777b7a151573e050032cf91ac4418953f1b6151ca0f179805856813a; source consistency passed.
- Supported non-ignored source copy: 269 passed, 13 skipped out of 282 tests (12 OpenCV recognizer tests and one Pi outbound replay test); web/native/room builds passed. Report: artifacts/native-baseline-check/supported-source/artifacts/engineering/2026-10-01T15-06-45-511Z-10af22a7/report.json. Source SHA-256: 14ee07cc777b7a151573e050032cf91ac4418953f1b6151ca0f179805856813a; source consistency passed. Private code absent; optional camera assets absent. Manifest: artifacts/native-baseline-check/supported-source-manifest.json (735 files). Snapshot has an empty local commit only to support runner identity, no source staged; it is not a release revision.
- Initial supported-copy gate failed on Pi replay's undeclared OpenCV prerequisite; retained at supported-source/artifacts/engineering/2026-10-01T15-05-23-415Z-86bfe75b. Added the same explicit asset-availability skip as the recognizer suite, honoring PI_TEST_RELEASE_ROOT. Camera-enabled rerun executed and passed the replay test; absence rerun reports its skip.
- Private build: artifacts/native-baseline-check/private-build.log and private-build/godice-evaluation.json; missing-input failure: reproduction/evaluation-absent.log. Standard bundles checked for generic panel, absence of private marker and absence of service worker.
- Exact dependency record: artifacts/native-baseline-check/dependencies.json (root and installed lock digests plus key installed versions). Dependencies reused through node_modules junction, not freshly installed. npm is absent from this shell PATH; no fresh npm ci or Pi dependency installation performed. Fresh-install/remote CI validation remains open; source-copy result does not establish dependency-install reproducibility.
- PowerShell packaging syntax parsed without errors. Build/sync scripts reviewed; no Capacitor sync, Gradle/APK or physical/remote execution performed. Existing synced private assets were preserved.

Changed scope: vite.config.js, package.json, scripts/build-android.ps1, src/prototype.js, src/multiplayer/ui.js, tests/native-build.test.js, tests/native-setup.dom.test.js, tests/multiplayer-ui.dom.test.js, tests/pi-relay.test.js, docs/android-development.md and SW-001/project/status/decision records. No source staging, publishing or device deployment. Documentation completion edits occur after the reported source digests; executable source is unchanged after the passing gates.

Decision: native blocker fixed and automated source-path acceptance satisfied by Codex development verification; aggregate G0/G2, fresh dependency install, independent review, remote CI enforcement and all physical qualification remain open.


Subsequent evidence, 1 October: SW-006 performed fresh root/Pi npm ci on WSL Node24.15.0 and passed the integrated private-code-free software source gate (304 tests, 13 camera skips, web/native/room builds, stable digest). See [SW-006 first-slice results](SW-006-first-slice-results.md). This closes the local fresh-dependency-install limitation for that later identified snapshot, not remote CI or aggregate/physical gates. Original SW-001 results above retain their earlier reused-dependency scope.
