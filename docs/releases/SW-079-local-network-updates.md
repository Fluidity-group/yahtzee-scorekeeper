# SW079: Local-network iPhone updater qualification

1 November 2026. Owner: Dan. Implementer/self-review: Codex/fluidity. **Implemented and automatically verified; not installed, signed or physically accepted.** Isolated branch `codex/sw079-local-app-updates`, stacked on SW078/PR #11 at `67159a2`. Shared coordination checkout, deployed web/backend and installed phones remain unchanged.

## Qualified source and checks

- Clean code: `3ff068b490a587a636b888522b6da1fe5b95b3f5`; digest `ebf71f8d4037c61d2d615650ae57faa1e7b2315ec7342f57a48bec9c11878125`.
- Node24.15.0 configured gate: **1,456 tests passed, 13 optional camera tests skipped, all web/native-web/Edge builds passed; source unchanged**. Evidence: `artifacts/engineering/2026-11-01T18-41-44-115Z-52ee867b/report.json`.
- Focused updater/adjacent identity gate: 59 tests across 9 files, including 52 new updater tests. `artifacts/sw079-focused.log`.
- Actual clean configured `ios-test` build → 57-file deterministic ZIP → detached RSA/SHA-256 manifest → client signature/native-runtime verification passed. Only ephemeral in-memory **synthetic** signing key, no private key file, no real update server or phone. `artifacts/sw079/synthetic-report.json`. Synthetic assets/releases must never be installed or published as a real release; the temporary ignored trust file was removed.
- iOS Capacitor sync succeeded and generated SPM includes the fifth adapter, `@capgo/capacitor-updater` 8.54.0 (Capacitor8-compatible, MPL-2.0, upstream source unmodified). This is native source/dependency integration, not Swift/Xcode compilation.
- Runtime dependency audit reports zero advisories. Full dependency install also reports development-tool advisories; no audit-fix or unrelated dependency upgrade was applied.
- Initial development gate correctly failed the shared build-identity invariant after changing iOS alone. Settings/iOS/Android package metadata were aligned at build79; the invariant was not weakened. Android source/version metadata changed only; Android native sync/build/install was not performed.

## Implemented behavior

On an updater-enabled iPhone: clubhouse menu → More Tools → App updates. Manual check/download/activate; running and staged versions/notes are visible. Downloads require a fixed trusted HTTPS feed and RSA-signed bounded/unexpired manifest, increasing sequence and semantic version, exact app/channel/platform/native build and native runtime fingerprint. Fingerprint includes native sources/adapters, persistence code, public app connection configuration and trust settings. Incompatible native, data/configuration or trust changes require a fresh native build.

Native download verifies the signed SHA-256. Staged metadata, native bundle hash/version/status and expiry are rechecked before switching. Activation/explicit rollback require Home with no pending save/score or hosted session; the safety predicate is re-evaluated after asynchronous validation. Dialog-opening and late-response fences preserve pending score/other dialog content. No automatic background activation or plugin `next()` scheduling occurs.

The native startup watchdog stays armed until successful product initialization (including persistence load) or recovery UI plus persistence check. A failed/unconfirmed startup uses the plugin's native fallback; JS records the restored version and keeps the accepted sequence high-water mark, preventing retry loops. Manual previous-bundle and packaged-bundle restore retain app user data; automatic previous deletion is disabled. No app/IndexedDB/account/profile reset is called. These mechanisms have automated simulated-adapter tests; actual on-device storage retention and watchdog timing remain acceptance gates.

Cloud checks/stats/channel endpoints, URL modification and preview are disabled. HTTPS-only native downloads and redirect-downgrade protection remain enabled. `NSLocalNetworkUsageDescription` documents LAN access; no LAN discovery, certificate exception or background push entitlement was added.

## Publishing and trust

Ignored `.updates.local.json` supplies only the admin's HTTPS manifest address, channel and SPKI public verification key. Absence disables downloads, invalid settings fail the build; no real trust file/key has been supplied. The release signer matches the administrator-held private key against the native public key. ZIP packaging rejects private/linked/oversized/secret-shaped assets and unqualified builds, locks out concurrent publishers and publishes hash-named archives plus an atomic manifest. The narrow static helper exposes only manifests/immutable archives on loopback for an administrator HTTPS reverse proxy. No system package/service/TLS settings changed and no server was started persistently.

Concrete public configuration, signing/publishing/hosting commands and physical tests: [administrator/Mac handover](../handovers/SW-079-local-updates-admin.md). No private signing key belongs in Git, chat, app bundles or on the Mac. No migration, database, existing Auth configuration or provider function change is required; consumed Supabase approvals remain spent.

## Source handoff prepared

Ignored `artifacts/sw079/handoff/yahtzee-sw079-3ff068b-source.tar.gz`, tracked qualified source only, SHA-256 `ea2b926da48a5902b08148049ca0092cf4ec4a1ea1fe6be2a87a1cac7783bc3e`. Validated public-only `.env.ios-test.local` is supplied separately in that ignored handoff folder, with current recovery/invitation origin, push off and commentary deferred. It is not committed or inside the source archive. There are no account sessions or signing keys in the handoff.

## Remaining gates and authorised next action

Dan authorises this feature in the next iPhone build and tests before installation. Automated checks are complete; next obtain the actual HTTPS hostname/public verification key and Mac access, then build fresh configured assets with those exact inputs, compile/sign for Amber's physical iPhone, compare identity/team/profile and install without uninstall/data clearing. Verify accounts/avatars/games retained, staging during play/offline behavior, explicit Home activation and deliberately broken synthetic startup fallback. Only physical evidence can close those gates. No need to re-ask the same feature/install permission; ask only for missing access, owner-local Apple prompts or a material signing/app-identity change.

Current real TLS/key and Mac/signing/device access remain unavailable. Do not install a disabled-trust or synthetic-key build to complete the task. Existing owner phone data stays untouched. No independent review, device acceptance, live server publication, Android update or master promotion is implied by this source qualification.

## Seven-day signing limit

OTA does not extend Apple provisioning. The supported alternative to free Personal Team's seven-day profile is Apple Developer Program membership, currently US$99/year/local equivalent, and an appropriate distribution method. TestFlight provides up to 90 days per build; publish replacements thereafter. Preserve existing app/team identity when choosing enrolment/signing, and review any team migration before installation. Owner handles membership/payment/Apple credentials; Codex has not purchased, enrolled or changed accounts.

Sources checked: [Apple membership](https://developer.apple.com/programs/) and [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
