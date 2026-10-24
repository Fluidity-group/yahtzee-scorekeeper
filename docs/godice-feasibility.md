# GoDice feasibility: stage 2 preparation

## Current gate

Android Studio and the Windows SDK are installed. A Capacitor development shell now builds
successfully using project-scoped JDK 21 and Gradle settings. See
[Android development](android-development.md) for the debug APK and physical-device test.
No global Java/Node settings or unrelated development sessions have been changed.

Particula's [API licence](https://raw.githubusercontent.com/ParticulaCode/GoDiceJavaScriptAPI/main/LICENSE.md)
limits the published API to personal/academic use and non-public experimental applications;
it excludes commercial deployment. Confirm a suitable commercial agreement with Particula
before incorporating their API in this public commercial-product repository. No vendor
code or protocol implementation has been added. This is a concrete release dependency,
not an assumption that a public GitHub repository grants commercial rights.

Suggested enquiry to send yourself: “We are developing an Android-first commercial dice
scorekeeper with a paid GoDice integration, followed by iOS. Can you provide commercial API
terms, fees, permitted distribution of integration source, branding requirements, and the
supported SDK/protocol and firmware versions?” No enquiry has been sent automatically.

## Implemented without vendor dependencies

Open `/?dice-lab=1`. The isolated capture lab uses clearly labelled test dice; it cannot
connect to Bluetooth or write game scores. Test connection count, explicit turn context,
fresh movement before settling, held values, uncertain/tilted readings, cancellation,
three/four-roll limits, disconnection and stale callbacks. Export the bounded diagnostic
trace for inspection. Diagnostics reset on reload and never mix with game analytics.

The pure capture controller accepts normalized transport events. Each connection has an
epoch; each armed capture has a token. Old connection callbacks and old capture tokens
cannot fill a current roll. Reconnection and backgrounding pause capture. Actual hardware
does not necessarily supply tokens: a future adapter must bind delivery to its current
capture session, require fresh movement and test delayed firmware notifications. Tokens
alone cannot prove that a delayed radio notification belongs to the current physical roll.

Each accepted snapshot contains player/turn IDs, five faces, held flags and diagnostic
sequence references. Evidence older than the bounded 500-event trace may be absent; the
lab is not a durable audit store. The future game adapter must persist raw evidence and
accepted rolls together and preserve real/simulated provenance.

## Verified upstream information

- [Particula's JavaScript API documentation](https://github.com/ParticulaCode/GoDiceJavaScriptAPI)
  describes roll-start and stable/fake-stable/tilt/movement notifications, battery, colour,
  and accelerometer vectors accompanying outcomes. Do not assume a continuous raw IMU feed.
- [Chrome's Web Bluetooth documentation](https://developer.chrome.com/docs/capabilities/bluetooth)
  provides a possible Android Chrome feasibility route. It requires a secure context and
  a user-triggered device chooser. An ordinary phone LAN HTTP URL is not sufficient.
  Browser support is not proof of compatibility with an embedded Android WebView.

## Next hardware session

1. Resolve API terms and connect/authorize the Pixel for the first native-app test.
2. Choose the permitted adapter; keep the current vanilla UI and pure game core.
3. Build an Android shell with native BLE, or use Android Chrome for an initial permitted
   hardware experiment. Use USB localhost forwarding or trusted HTTPS for browser testing.
   Do not bypass certificate warnings or expose development secrets through a public tunnel.
4. Pair five dice individually, identify each, record battery/state and verify every face.
5. Test held rerolls, delayed settling, pickups, disconnects, app backgrounding and corrections.
6. Connect accepted hardware snapshots to the scorecard only after these traces are reviewed.

Hardware reliability, Android packaging, permission prompts and simultaneous real-dice
connections remain untested. The current lab is preparation for that test, not a completed
GoDice integration.

Validation: the full suite passes 164 tests, including eight capture-boundary tests. The
production PWA build succeeds. Browser smoke checks verified an accepted simulated roll,
disconnect pausing/acceptance blocking, and a 390px layout without horizontal page overflow.

## First native connection test (16 September 2026)

Menu → Connect dice now uses the MIT-licensed `@capacitor-community/bluetooth-le` 8.3.0 plugin on Android. It opens a user-controlled Bluetooth picker, connects up to five selected devices, shows disconnects and allows removal. Closing the test panel or backgrounding the app releases its connections. Device selections are temporary and are not uploaded. Android 12+ uses Nearby devices permission without location access.

This is generic BLE connection testing only: no Particula API code, characteristic commands, face decoding, notifications, battery requests or automatic game scoring are present. Browsers show an explanation directing the user to the Android host. The existing simulation lab is unchanged.

On the Pixel: close the official GoDice app, wake the dice, open Menu → Connect dice, tap Add a die, grant Nearby devices access if prompted, and select one of your dice. Repeat for five, observe the connected count, then close and reopen the panel to verify cleanup. If the picker is empty, check charging/wake state and Bluetooth. Real radio reliability remains to be verified with the user's physical dice.

The user has not yet obtained Particula permission. Request written permission for private evaluation of the full API in a prototype intended for a commercial app, and agree publication/commercial terms before distributing that implementation. The existing public web app must not accidentally publish a private evaluation adapter.

## Android full-API evaluation (current)

The user explicitly requested local Android testing with the published API while arranging agreements. The complete upstream `godice.js` and licence are in the gitignored `local-evaluation/godice/` directory, pinned to commit `1a0cc90f4f3d366be41e97b545cc7a6e323124ab`. Only an ES module export was appended to the upstream file. `native.js` subclasses it to use Capacitor BLE rather than Web Bluetooth, retaining the full parser, vectors, shell transforms and command API.

Vite resolves `#dice-panel` to this evaluation UI only in native mode. Web builds resolve the generic connection explanation. Native bundles carry a `godice-evaluation.json` marker; the Pages publisher refuses marked builds. Vendor sources and generated native web assets are gitignored. No commercial permission has been claimed or obtained by this implementation.

Menu → Connect dice opens the live D6 test. Add up to five GoDice, inspect each physical face against the displayed value, identify dice using the LED pulse, and inspect colour/battery replies. The trace differentiates roll-start, settled, uncertain, moved and tilted events and includes vectors and raw packet bytes. It is bounded in memory, logs to Android diagnostics, and does not enter game analytics. Removing a die or closing/backgrounding the panel disconnects it. Reconnect is explicit and bounded. Test readings do not yet submit turns or scores.

All public API functions are retained; the initial user interface focuses on D6, identity, battery and notifications. Other shell modes and LED settings remain available in the adapter for later testing. Hardware validation is required before connecting this adapter to the turn capture controller.

### Connection lifetime fix
The Android connection panel now keeps one app-session connection set when dismissed with X or Back. Reopening reuses the selected dice and current readings. Explicit Remove / Disconnect all controls end connections. The game shows a read-only connected count and live faces, and no longer claims Bluetooth is disconnected merely because simulated scoring was selected. Hardware readings are still separate from scoring. Background/foreground transitions clear displayed faces until fresh events arrive; app restart requires reconnecting. A regression test covers close → receive → reopen, background stale-reading clearance, and explicit disconnect.

### First local GoDice scoring stage
With five dice connected, open a local game and choose **Start GoDice turn** before that player's turn has started. Tap **Capture first roll**, physically throw all five dice, check the captured faces, and tap **Confirm this roll**. The scorecard now suggests values from that confirmed roll. Select holds and Capture reroll for later rolls. Three-roll rules (and Competition's last-turn fourth roll) are enforced. Corrections are offered after confirmation and retain the original physical readings in the event history. Finish this turn manually remains available if capture cannot settle.

Hardware capture is fenced to the game, turn, player, revision and fixed physical device set. New movement is required for each rolled die; tilted/uncertain events do not become confirmed results. Held-die movement, disconnects and backgrounding block the candidate. Original raw notifications and normalized evidence are persisted with the confirmed roll, marked `godice`, rather than `simulated`. Hardware turns are currently local-only; online room commands still use manual scoring until host capture sharing is implemented and tested.

**Connect all dice** scans for eight seconds, includes already connected dice, removes duplicate advertisements, randomly selects five from larger sets, flashes spare dice blue, disconnects them, and connects the selected set. With fewer than five, available dice connect and the UI explains how to retry. Cancel scan leaves the existing set untouched. Scan and connection failures are surfaced, not treated as successful five-dice readiness. GoDice protocol code remains restricted to the local native build.

### Android connection recovery (16 September 2026)

Pixel logs showed GATT status 133 while establishing connections, including a new connection about 30 ms after spare disconnection. This does not prove radio flooding. Connect all now stops scanning, waits 1 second, establishes each link through service discovery and notification subscription, and awaits colour/battery replies (bounded at 2 seconds) before a 1-second gap to the next die. Transient establishment failures receive at most three attempts, with 1.5/3-second backoff after cleanup. These are conservative prototype timings to validate on hardware, not vendor-mandated delays.

Retries preserve healthy connections and the previously selected set. The randomly excluded spare still flashes blue and is disconnected before adding missing playing dice. Failed cleanup stops further connection attempts. Native logs include connection phases and the panel logs retries and metadata readiness. Retest with six awake dice, then retry after a partial connection failure and verify healthy dice remain connected.

### Battery-aware spare selection

On a fresh Connect all with more than five dice, battery levels are read sequentially using short-lived GATT connections. The five highest measured batteries are selected; ties are random. Unknown readings rank below measured batteries and produce a warning. The excluded die flashes blue with its battery percentage shown. Partial retries preserve the selected set and healthy connections; use Disconnect all before requesting a fresh battery-based selection. This replaces the earlier random-only spare choice.

### Automatic local GoDice games

The game now uses one physical-dice display. A GoDice game starts the current player's turn when exactly five dice are connected. Movement begins capture; on later rolls, untouched dice retain their confirmed values and any die reporting movement joins the reroll. Every moved die must report a settled face. A 900 ms quiet period then saves the roll automatically. Score selection ends the turn and starts the next player's turn, which requires all five dice to move again. Rule-defined roll limits remain enforced (including competition's fourth final roll).

Connection changes/backgrounding invalidate a capture; reconnect and Reset this roll before continuing. Managing connections cancels an in-flight capture and dice movement in that dialog is ignored. Corrections and manual fallback remain available. The quiet-period boundary is a prototype heuristic to validate with physical dice, especially staggered pickup and slow sequential throws. With five or fewer discovered dice there is no spare to flash; fewer than five connected dice blocks capture.

### Settled-reading recovery

Device logs showed FS/MS/TS packets followed by normal S packets. Automatic capture now clears a held die's invalid flag when a valid settled face arrives; previously that flag could block a roll permanently. A current-epoch S notification during an active roll can supply a missing R notification, with inferred movement recorded in evidence. Idle S packets still cannot start rolls.

FS/MS packets now retain their subtype. During an active roll only, a prototype geometry check accepts an FS/MS face when its signed D6 axis agrees with the parsed face, vector magnitude is 48–80, and dominant-axis alignment is at least 0.97. Original packet type and reported quality remain in evidence. Tilted TS packets and less-flat estimates still require checking. These geometry thresholds require physical validation after recharging; missing notifications are never replaced with invented faces.
