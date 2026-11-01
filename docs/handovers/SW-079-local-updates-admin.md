# SW079: Local update hosting and signing handover

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
