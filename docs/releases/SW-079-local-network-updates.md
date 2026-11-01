# SW079: Local-network iPhone updater qualification

1 November 2026. Owner: Dan. Implementer/self-review: Codex/fluidity. **Qualified code; Amber-local signing and same-ID build79 installation verified. Launch blocked by iOS security; physical acceptance pending.** Isolated branch `codex/sw079-local-app-updates`, stacked on SW078/PR #11 at `67159a2`. Shared coordination checkout, deployed web/backend and Android remain unchanged.

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

Mac SSH is now verified through `amber-mac`, with Node24.19.0, Xcode27.1 and the physical iPhone connected. Signing remains owner-local because the SSH keychain is locked; no unlock/workaround is authorised. Actual HTTPS/public-key trust configuration and native compilation/signing/physical acceptance remain outstanding. Do not install a disabled-trust or synthetic-key build to complete the task. Existing owner phone data stays untouched. No independent review, device acceptance, live server publication, Android update or master promotion is implied by this source qualification.

## Seven-day signing limit

OTA does not extend Apple provisioning. The supported alternative to free Personal Team's seven-day profile is Apple Developer Program membership, currently US$99/year/local equivalent, and an appropriate distribution method. TestFlight provides up to 90 days per build; publish replacements thereafter. Preserve existing app/team identity when choosing enrolment/signing, and review any team migration before installation. Owner handles membership/payment/Apple credentials; Codex has not purchased, enrolled or changed accounts.

Sources checked: [Apple membership](https://developer.apple.com/programs/) and [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

## Real trust configuration and unsigned Mac compilation

1 November: the administrator configured trusted HTTPS hosting and public RSA-3072 verification settings, and reserved signing/publication for a future fixed Dan-approved per-bundle command. No submission procedure has been announced; no keys were accessed or release submitted. The release feed is empty and returns404 normally over trusted HTTPS.

Prepared clean actual Git checkout `/Users/ambercavanaugh/Developer/yahtzee-sw079-3ff068b/source` at qualified3ff068b. Its ignored updater/app configs were copied and validated without private material. Normal TLS/empty-feed reachability and exact public-config hash match were verified on both hosts. Mac Node24.19.0/Xcode27.1 preparation/SPM sync passed. Generic iOS-device build succeeded with signing explicitly off and project-local build/package paths. All57 compiled assets match prepared/synced files and source/build identity; app ID unchanged, version1.0/build79. Unsigned app has neither code signature nor embedded provision. No phone installed; this is not signing/device-acceptance evidence.

Actual native runtime is `clubhouse-ios-updates-1:bf0fd70d0af5dddb702d33990163290bd4c0cdd75651f990ccaf79fcbc44ef09`, identically computed on Mac/fg-dev from the real public configuration. Evidence: `artifacts/sw079/live-trust-check.json`, `configured-runtime.json`, `mac-unsigned-build-report.json`, `mac-configured-assets.json`; full unsigned build log remains in the Mac checkout. See the updated administrator/Mac handover for exact paths and owner-local signing steps. Earlier missing-server/Mac gates above are historical; remaining gates are Amber-local signing and physical storage/update/rollback acceptance plus the administrator's announced signing/publication procedure.

## Owner-signed physical-iPhone installation

1 November SW079 signed device installation: Amber built/signed locally in Xcode for her physical iPhone. Verified deep/strict signature, app ID `com.fluiditygroup.diceclubhouse.dev`, unchanged team `2YD8HRPQ93`, target-device inclusion, entitlements and profile expiry `2026-11-08T20:52:45Z`. All 57 qualified web assets match source `3ff068b`; two additional Capacitor Cordova stubs are empty. Same-ID in-place install succeeded and fresh device metadata confirms version1.0/build79 replacing build70. No uninstall, app-data clearing, container read or remote signing occurred. Launch is blocked by iOS security (untrusted profile/invalid signature/inadequate entitlements); local package checks passed and Amber has been asked to trust the Developer App profile on her iPhone. Launch and owner account/avatar/game retention acceptance remain pending. Feed publication/physical OTA rollback tests remain pending; Android, web/backend and master are unchanged. This supersedes earlier unsigned/not-installed notes below.

The owner explicitly authorised checking and updating the physical iPhone without uninstalling or clearing data. The signed device package was frozen under the Mac checkout at `artifacts/sw079/owner-signed-build79.app`, independently rechecked, and installed with `devicectl device install app`. Executable SHA-256: `da63ba2a5c572ef7558787229663986290f219c70d011c95b3dc109c6b091e7e`. The provisioning profile expires 8 November at 14:52:45 America/Chicago; OTA cannot extend that deadline.

Evidence copied into ignored fg-dev task artifacts: `artifacts/sw079/signed-device-verification.json` and `device-install-summary.json`. Mac task artifacts retain the frozen package and preinstall/postinstall/install/launch JSON. Initial copy verification stopped before installation because total-file counting included the two empty Capacitor stubs; exact comparison established 57 qualified assets plus those two known empty files before installation. No check was weakened.

`devicectl device process launch` failed with CoreDeviceError10002/FBSOpenApplicationErrorDomain3, reporting invalid signature, inadequate entitlements or a profile not explicitly trusted. The signed package passed deep/strict verification and matching application/team entitlements, so the next owner-local step is Settings → General → VPN & Device Management → Developer App → Trust/Allow & Restart if offered, followed by opening Dice Clubhouse Dev. Do not delete the app/profile or change signing identity. A successful install does not establish launch or user-data retention; those remain separate gates.

Preserve Amber's local Xcode development-team selection and plist formatting edits in the Mac checkout; they are not a new qualified source revision. Do not regenerate assets from that dirty signing checkout or silently adopt its changed native fingerprint for OTA publication. The installed runtime remains the qualified configured fingerprint recorded above. No release was submitted/signed/published to the empty update service.
