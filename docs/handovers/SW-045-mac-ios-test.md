# Mac handoff — SW045 manual iOS test

The approved visual mix is Rally layout, Night Match race lanes, Playform bonus animation. First prove the working manual game natively on iOS. Keep all cloud games/accounts/settings; no backend deployment or voice work is required.

## What is needed on the Mac

1. Xcode26 or later, opened once so its platform components and initial setup are complete; a compatible macOS version. Select the installed Xcode under Settings → Locations → Command Line Tools. Exact compatibility is checked on that Mac rather than guessed from its model.
2. Node.js24 and Git. Install dependencies with the pinned lockfile; do not update package versions during the first build.
3. Apple ID added to Xcode Settings → Accounts for development signing. Use an existing development team or Personal Team if supported for this target. No paid-account purchase or commercial submission is part of this step. Enter account/password/2FA yourself on the Mac; never send credentials in chat.
4. Amber’s iPhone and a USB cable for first installation. Unlock, Trust this Mac, and enable Developer Mode if Xcode/iPhone requests it. Xcode must recognise the device and have the required platform support for its installed iOS version.
5. Open Codex on the Mac for the build/diagnostics there. The Windows chat currently has no connection to the Mac; no remote access has been configured or assumed.

## First build

Unzip the supplied SW045 handoff into its own folder. It contains source, the generated Xcode project, prebuilt web assets and ignored public-only .env.ios-test.local. It contains no account sessions, game database, private AI/server keys or signing certificates.

From that folder:

```sh
node --version
npm ci
npm run ios:check
npm run ios:sync
npm run ios:open
```

The first script validates versions/config without printing keys. ios:sync rebuilds native web assets and refreshes the generated SPM package. It does not compile an IPA. In Xcode, use App.xcodeproj (SPM, no CocoaPods needed), App target → Signing & Capabilities → your Team, select the connected iPhone and Run. Keep the bundle ID stable once the first build is installed; if Personal Team cannot register the proposed ID, record any agreed development-ID change before installation.

If Xcode reports an expired/incompatible device support/runtime or signing error, record the exact diagnostic and fix that prerequisite. Do not reset device/app data. Direct development signing may need periodic re-signing; TestFlight can be considered later for easier delivery, not a commercial-launch prerequisite.

## Get back into the existing tournament

Sign in as Amber with the exact existing account. Open Saved tables and the existing tournament, or enter its existing join code. Confirm the same aliases, game number, pause state and scores before touching anything. Do not resume a paused tournament automatically. Do not create a replacement table to recover her seat. New app-local text/theme preferences may initially differ from Safari; the browser’s local data is not erased or silently migrated.

First verify synthetic local play and a separate explicitly identified test table before changing live tournament scores. Check centred score entry, zero versus open, latest-score Undo and next-player cutoff, portrait/keyboard/notch/home-indicator behaviour, background/foreground and reconnect. Reverse the host roles on an identified test game. Cloud authority remains on the server when an organiser phone closes.

## Paste into Codex on the Mac

> Continue SW045 from this handoff folder. Read AGENTS.md, docs/plans/SW-045-ios-manual-test-build.md and docs/handovers/SW-045-mac-ios-test.md. The owner authorised the first iOS manual test build and wants the tournament/settings retained. Inspect Mac/Xcode/Node and the connected iPhone freshly; prepare and build the App target, resolve normal build issues, then install with data retained. Apple account/2FA/licence/device-trust actions belong to the owner. No AI voice, backend deployment, database reset or live tournament score changes. Report exact source/archive identity, Xcode/device/OS, signing/build/install evidence and remaining gates. The approved Rally/race-lane/bonus redesign is a subsequent shared UI slice, not yet integrated into this first build.

## Official reference

Capacitor8 iOS requirements and device run: https://capacitorjs.com/docs/ios . SPM integration: https://capacitorjs.com/docs/ios/spm . Accessed17 October2026. Actual compilation and installation remain pending until executed on the Mac.
