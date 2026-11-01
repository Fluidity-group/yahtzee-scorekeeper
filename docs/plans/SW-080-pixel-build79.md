# SW080: Align the Pixel with qualified iPhone build79

1 November 2026. Owner: Dan. Implementer/self-review: Codex/fluidity. Software release task; preparation in progress, not installed or physically accepted. Branch `codex/sw080-pixel-build79`, base `5345722` on SW079/PR #12. Shared coordination checkout remains untouched.

## Purpose and requirements

Dan authorises updating the paired Pixel using fg-dev ADB. Preserve the existing app, signer, account and game data; never uninstall, clear storage or use downgrade/signature-bypass options. iPhone, backend, web, release feed and master are outside scope.

- PX1: package exactly the57 qualified manual `ios-test` web assets installed on Amber's build79, from clean source `3ff068b490a587a636b888522b6da1fe5b95b3f5` and validated public-only configuration; push disabled and commentary deferred.
- PX2: compile Android version1.0/build79 with JDK21/SDK36 and locked dependencies, pass native tests and the configured Node24 engineering gate. Preserve generated adapter integration in Git.
- PX3: verify exact app ID `com.fluiditygroup.diceclubhouse.dev` and installed/candidate certificate equality; preserve current APK and package metadata before `adb install -r`.
- PX4: read back installed APK and metadata, compare candidate hash, app identity/UID/first-install time and launch status. Owner account/avatar/saved-game retention and paired gameplay remain separate acceptance gates.

## Design and impact

Reproduced the clean source web bundle on fg-dev because the Mac became unreachable. All57 assets exactly match the recorded iPhone hashes; no asset/source identity substitution. Native checkout base5345722 differs from qualified3ff068b only in documentation. Standard Capacitor Android sync adds pinned updater8.54.0 to the two generated Gradle adapter files; no hand-written app logic or dependency-version change. Cloud auto-updates/telemetry remain disabled and the product updater UI remains iOS-only.

## Verification and execution bounds

Installed Pixel build71 and public APK are preserved under ignored `/srv/yahtzee/main/artifacts/sw080/`. Current certificate SHA256 `e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8`. Preparation assets match57/57; Android native build/tests and clean-source engineering gate are pending. Do not install on test, identity or signer failure. No private app container, credentials or gameplay commands are needed.

## Completion

Pending: native/full checks, candidate verification, same-ID/signer install and launch. See the identified release record for resulting artifact hashes and device evidence. Codex self-review is not independent acceptance.
