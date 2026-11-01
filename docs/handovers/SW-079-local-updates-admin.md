# SW079: Local update hosting and signing handover

## Current build checkout and server — 1 November 2026

Mac build checkout: **`/Users/ambercavanaugh/Developer/yahtzee-sw079-3ff068b/source`**, clean detached qualified commit `3ff068b490a587a636b888522b6da1fe5b95b3f5`, cloned through a Git source bundle so build identity is preserved. Earlier source tar archives contain no `.git`; use this real checkout for build tooling. Old Mac checkouts were preserved.

The approved public `.updates.local.json` has already been copied there, together with validated public-only `.env.ios-test.local`. No private key/session was copied. Public trust settings hash matches fg-dev: `1d0a16a7f9b323879b9be66ffa349ed3359b98b6b1fc21f5a8a3bbb8076a8f2f`. Real manifest endpoint is `https://fg-dev.taila7bb48.ts.net/yahtzee/ios-test.json`, channel `ios-test`, RSA-3072 public SPKI. Administrator-owned private signing key stays on fg-dev; public copies are under `/srv/yahtzee-updates/public/`. The administrator reports `yahtzee-updates.service` running pinned3ff068b on Node24.22.2/loopback8475 behind nginx, serving `/srv/yahtzee-updates/releases`. Normal TLS and expected empty-feed404 were independently checked from both fg-dev and Mac; no redirects or TLS exceptions. No manifest or bundle was published.

Actual Mac preparation (`npm ci` with project-local cache; preflight; Vite ios-test build; five-plugin SPM sync) and unsigned generic iOS device compilation succeeded. Build outputs/dependencies are scoped under the new project. `CODE_SIGNING_ALLOWED=NO` and `CODE_SIGNING_REQUIRED=NO`; no keychain command/workaround or signing/provisioning update was attempted. App at `artifacts/sw079/DerivedData/Build/Products/Debug-iphoneos/App.app` is unsigned/unprovisioned and **must not be treated as installable**. Native bundle ID remains `com.fluiditygroup.diceclubhouse.dev`, version1.0/build79; all57 prepared/synced/compiled assets match.

Configured native runtime (same independently computed on fg-dev and Mac): `clubhouse-ios-updates-1:bf0fd70d0af5dddb702d33990163290bd4c0cdd75651f990ccaf79fcbc44ef09`. Do not substitute the synthetic-test runtime. Source digest remains `ebf71f8d4037c61d2d615650ae57faa1e7b2315ec7342f57a48bec9c11878125`. Mac evidence: `artifacts/sw079/unsigned-device-build.log`, `unsigned-build-report.json`, `configured-assets.json`; sanitized reports also preserved in fg-dev task artifacts. Executable SHA-256 before signing: `cce332b30671b1854a741a11dd1ce096a3ea605951fedc16410aa2beccfcaa95`. Signing will change relevant package identities and needs fresh readback.

Amber's local next step is opening `ios/App/App.xcodeproj` in this checkout, checking the existing team/app ID and physical iPhone, then signing/building through her normal unlocked local session. She handles Apple prompts. No signed build or installation has happened.

**Update publication is not open.** The administrator will announce a fixed command with Dan approval per bundle ID. Do not invent/implement a submission protocol, use the raw signing-key CLI as Codex, access the private key or publish diagnostic/synthetic artifacts. The generic packaging examples below describe implementation capabilities, not an approved current publication procedure.


## Verified Mac connection — 1 November 2026

From fg-dev as `fluidity`, use **`ssh amber-mac '<command>'`**. The administrator configured its identity and strict host-key entry. Direct-IP SSH is not equivalent and fails by design; do not rediscover/copy keys or weaken host checks. Fresh verification returned `ambercavanaugh`, host `amber-mac.home.arpa`, Apple Silicon macOS26.6.2 and Xcode27.1 (27A9275), selected at `/Applications/Xcode.app/Contents/Developer`. `devicectl` sees Amber's physical iPhone17Pro connected; simulator entries are separate and are not installation targets.

Node is absent from the default noninteractive SSH PATH. The previously documented portable toolchain was verified: `/Users/ambercavanaugh/Developer/yahtzee-tools/node-v24.19.0-darwin-arm64/bin` provides Node24.19.0/npm11.17.0; system Git is2.54.0. Prepend that directory per build shell; do not install a global runtime or edit startup files.

The owner/administrator states that Amber's login keychain is locked in SSH sessions. **Signing must be performed by Amber locally at the Mac.** SSH is available for read-only checks and project preparation/unsigned compilation; do not attempt keychain unlock, credential transfer or a desktop-session signing workaround. No signing, installation, remote file edit or keychain command was performed by these checks. Real update HTTPS/public-key configuration remains outstanding before the enabled native build.


The owner requests manual local-network updates in the next iPhone build. Source implements the updater; this document is a setup specification, not evidence of deployment. Server administration, deployment-key provisioning, Mac compilation/signing and physical phone validation are still needed. Never install an unconfigured updater build merely to complete a task.

## Public native trust configuration

Administrator supplies an HTTPS hostname that the iPhone can reach and validate normally. No plaintext LAN exception, self-signed trust bypass or public tunnel is configured by this work. Provision an RSA signing key (2048 bits minimum) using the approved credentials process. Keep the private key out of Git, chat, build assets and phones. Codex tests use synthetic temporary keys only. Export its **public** SPKI DER bytes as base64 into this ignored per-checkout file, `.updates.local.json`:

```json
{
  "manifestUrl": "https://updates.example.test/yahtzee/ios-test.json",
  "channel": "ios-test",
  "publicKeySpki": "<administrator-provided public SPKI DER, base64>"
}
```

These fields are public and are compiled into the iPhone web bundle. The file's absence disables downloads, while native rollback/health support remains integrated. Invalid supplied configuration fails the build. The native runtime fingerprint binds native sources, adapters, persistence code, public backend configuration, build number and trust settings; use the same approved trust file when building compatible updates. Changes to any of those require another native build. Do not copy private signing material to the Mac.

Also validate the existing public-only `.env.ios-test.local`; use the corrected current `VITE_GAME_WEB_URL=https://fluidity-group.github.io/yahtzee-scorekeeper/`. Updater trust settings are separate and must not be inserted into that environment file's strict whitelist.

## Build and sign a release

Use a clean committed source checkout, Node24 and pinned `npm ci` dependencies. Native build 79 includes the iOS updater. On the Mac, `node scripts/prepare-ios-test.mjs --check` then `node scripts/prepare-ios-test.mjs` checks/syncs the five qualified adapters and public configuration. Xcode compilation/signing/device installation remains a separate gate. Preserve app ID `com.fluiditygroup.diceclubhouse.dev`, existing team/container and user data. Never uninstall/clear data for an update or signing problem.

For a later web-only update, build clean `ios-test`/native assets from compatible native source/trust configuration and create public metadata, for example:

```json
{"version":"1.0.1","sequence":1,"nativeBuild":"79","notes":"Describe the approved changes"}
```

Every new release must increase the sequence and use a unique version. Publication expiration is seven days; renew/reissue metadata as a new release when needed. The administrator invokes:

```sh
node scripts/package-local-update.mjs dist-native artifacts/local-update-release release-metadata.json .updates.local.json <approved-signing-key-file>
```

This reads the key only in the administrator process, checks it matches the public trust key, packages only clean identified native assets, rejects linked/private/oversized assets, creates immutable SHA-256-named ZIPs and atomically publishes the signed manifest. The manifest carries exact native build/runtime, channel, version, sequence, source commit, archive size/hash and expiry. A dedicated publication lock rejects concurrent writers. Never publish a working source tree or serve a directory containing credentials.

## Local HTTPS service

`node scripts/serve-local-updates.mjs artifacts/local-update-release 8475` exposes only approved JSON manifest names and hash-named bundle files on loopback. The administrator provides the trusted HTTPS reverse proxy and its fixed `/yahtzee/` mapping. It must preserve public CORS/GET/HEAD/OPTIONS behavior, deny all other files, and avoid redirects. The helper never binds an external interface or configures a system service. Publishing a release/running a long-lived service is not implied by package preparation; follow the owner's deployment authorisation.

The initial installed native policy must use the actual HTTPS address/public verification key. After provisioning, build and compare two synthetic signed releases through the same real trusted LAN endpoint before using real game data.

## On-device qualification before acceptance

- Record Mac/Xcode, actual physical iPhone, current installed app identity/team and fresh provisioning validity. Simulator build or Linux web bundle success is not a signed physical app.
- Same-ID install; confirm existing account, avatars, games and scores. Do not advance or reset real scores just to exercise updates.
- From Menu → More Tools → App updates, manually check/download. Confirm download does not restart the running app or interrupt a game/save. Activation and rollback must require Home with no pending score/save and explicit confirmation.
- Corrupt archive/signature, incompatible native fingerprint, expired/old sequence and offline endpoint fail without changing the running version. No redirect to another source or HTTP downgrade is permitted.
- Install a deliberately broken synthetic startup release; confirm native watchdog restores the previous working bundle, preserves account/game data and does not retry that sequence. Automatic readiness is signalled only after product initialization succeeds, or recovery UI has opened successfully.
- Verify explicit restore of the prior healthy downloaded bundle and packaged baseline. A rollback does not reset the accepted sequence high-water mark; issue a higher release sequence for corrected updates. Native reinstall/signing and incompatible data-schema changes remain outside OTA.

## Apple seven-day limit

The updater cannot extend a signing profile. Free Personal Team provisioning expires after seven days. Apple Developer Program membership is currently US$99/year or local equivalent; TestFlight builds last up to 90 days, after which upload a replacement native build. Use the existing Apple account/team where possible and review app-identity/data implications before changing teams. Owner handles enrolment/payment/Apple sign-in locally. No purchase or account change has been performed.

References: https://developer.apple.com/help/account/basics/about-your-developer-account ; https://developer.apple.com/programs/ ; https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/ ; https://capgo.app/docs/plugins/updater/self-hosted/manual-update/ . Plugin 8.54.0 is pinned, peer-compatible with Capacitor8, MPL-2.0; upstream native source is unmodified. Revalidate policy/licensing before commercial distribution; no store approval is inferred here.
