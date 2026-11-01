# SW079: Manual local-network iPhone updates

1 November 2026. Owner: Dan. Implementer: Codex/fluidity. State: implemented and automatically verified; not deployed/physically accepted. Isolated `codex/sw079-local-app-updates`, based on SW078 `67159a2`. Phone installation waits for tests and fresh Mac/signing/device checks. No backend/database/web deployment or Android installation is in scope.

## Requirements and acceptance

- UP1: iPhone menu offers manual check/download/activate and explicit rollback, with current/staged version visible. Browser/older native adapters remain playable without updater access.
- UP2: accept only RSA/SHA-256-signed, bounded, unexpired manifests from a fixed HTTPS origin/path, exact app/platform/channel/native build/runtime, monotonically newer sequence and valid version/source/hash. No arbitrary update URL field or plaintext/TLS exceptions.
- UP3: native download enforces SHA-256; revalidate signed metadata, compatibility and staged native bundle before activation. Failed checks/downloads cannot change running bundle. Persisted state uses a separate bounded updater key; preserve sessions, game/IndexedDB/profile data.
- UP4: download may stage while playing; activate/rollback only at Home with no save/score/dialog/game operation pending. Never use plugin `next()` or auto activation. Native watchdog reverts an unconfirmed startup. Confirm health only after product initialization succeeds; retain previous bundle for manual rollback, plus packaged baseline.
- UP5: reproducible clean-source ZIP/manifest packaging and a narrow localhost static update service for administrator HTTPS proxying. Keys and deployment settings stay ignored; shipping disabled when trust configuration is absent. No system-service changes by Codex.
- UP6: focused failure/race/signature/version/compatibility/rollback/UI/publisher tests, complete Node24 gate, synced iOS SPM integration. Record Mac compilation and actual iPhone rollback/storage acceptance separately; Linux tests are not native signing evidence.

## Design

Use pinned `@capgo/capacitor-updater` 8.54.0 (peer Capacitor ^8), its native SHA-256 download and startup watchdog/retained bundle mechanisms. Disable cloud auto updates/stats/channel endpoints, URL mutation, previews and HTTPS downgrades. Custom app policy verifies detached RSA/SHA-256 manifest signatures before the native adapter sees a download URL. The admin-controlled HTTPS origin serves immutable approved bundles; no working directory is exposed. Native build 79 and runtime `clubhouse-ios-updates-1:<native fingerprint>` gate compatibility. Rules/game schema changes that cannot preserve old saves need a new native runtime/explicit migration design, not an OTA patch.

Public build trust configuration lives in ignored `.updates.local.json`; absent configuration disables network updates. Release signing is an administrator operation using a private key outside Git/chat. Do not generate a real deployment key here or access credential directories. Synthetic test keys exist only in temporary/in-memory fixtures. Initial signed native install adds this plugin; it cannot extend Apple provisioning.

## Signing and infrastructure

Apple free Personal Team profiles expire after seven days. The supported alternative is Apple Developer Program membership (currently US$99/year/local equivalent); TestFlight builds last up to 90 days and need replacement builds thereafter. Do not purchase/enrol/change Apple accounts on the owner's behalf. Preserve existing bundle ID/team/data; new team migration requires a separate reviewed decision.

Sources checked 1 November: https://capgo.app/docs/plugins/updater/self-hosted/manual-update/ ; https://capgo.app/docs/live-updates/rollbacks/ ; https://developer.apple.com/help/account/basics/about-your-developer-account ; https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/ . Self-hosted HTTPS hostname/public verification key, Mac access, signing and physical acceptance are external gates; useful implementation/testing proceeds without them.

## Evidence and remaining gates

Focused verification passed 59 tests across 9 files (including the existing build-identity tests), covering signed metadata, native/config/persistence fingerprint, corrupt/offline downloads, checksum mismatch, sequence replay, startup identity, watchdog restoration, explicit rollback, pending-save and dialog races, signing failures/concurrent publishers and private-file serving. First development full run found the existing shared build counter mismatch; aligned Settings/iOS/Android package metadata to build79 without weakening the invariant. Clean initial implementation c29517e passed the full gate; final semantic anti-downgrade refinements and synthetic actual-bundle qualification are being verified before review. Runtime dependency audit reports zero advisories. See ../handovers/SW-079-local-updates-admin.md for concrete TLS/key/packaging and physical acceptance steps. No native compilation, installation, key provisioning or server configuration has occurred.

Final clean source 3ff068b: 1,456 tests/13 optional camera skips/all configured builds/source stable. Synthetic actual 57-file native bundle ZIP/signature/runtime roundtrip passed without a private-key file or real endpoint. See ../releases/SW-079-local-network-updates.md. Mac/signing, real HTTPS/trust settings and physical rollback/data acceptance remain open. No phone installed.
