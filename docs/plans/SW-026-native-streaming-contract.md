# SW-026 native commentary streaming slice

14 October 2026. Native expert lane; implementation and synthetic adapter proof only. No installed plugin, provider playback or physical audible acceptance. Existing app dependencies: Capacitor8.5.2, Media3 ExoPlayer1.11.1, Android min24/compile36/target36. No new Gradle dependency is required.

## Integration manifest

NEW Java sources under android/app/src/main/java/com/fluiditygroup/diceclubhouse/dev/: LiveCommentaryPlugin.java and CommentaryStreamDataSource.java. NEW src/commentary/native-player.js and tests/commentary-native-player.test.js.

Lead-owned MainActivity integration is one line before super.onCreate:

```java
registerPlugin(LiveCommentaryPlugin.class);
```

The class shares the existing activity package. No registration/build.gradle/prototype was changed by this lane. Lead should run the normal sync/Android build after integration; registration and packaged runtime are not established by compilation alone.

## Authenticated stream contract

Backend/native experts agreed HTTPS GET /commentary/{encodedRoomId}/audio/{encodedJobId}. Headers: Authorization Bearer current user JWT, X-Commentary-Claim single-use claim token, X-Commentary-Epoch fenced integer, X-Commentary-Device session nonce. Credentials never appear in the URL. Authentication, host membership, claim validity and lease expiry are server checks, not client authority. One consumed claim is not retried after failure or reconnect. GET returns 200 audio/mpeg and incremental MP3 bytes; all other statuses and redirects fail closed. No arbitrary provider text, business key or voice identifier reaches the native transport.

createNativeCommentaryPlayer({serviceBase,getAccessToken,plugin,onMeasurement,now}) returns play({claim,signal,onEvent}), stop(reason), renew({claim}) and dispose(). claim is {roomId,jobId,token,epoch,deviceId,expiresAt}. Controller must supply only an authenticated claim and cancel on invalid facts, pause, sign-out, lease loss, game change, mute or profile/profanity changes. It must not treat unrelated room revisions as invalid. Renew uses a newly authenticated server lease response, never a locally extended authority.

Native plugin uses Media3 ProgressiveMediaSource backed by incremental HttpURLConnection InputStream reads. It does not fetch a blob/arrayBuffer, write a temporary clip or accumulate complete audio. Redirects are disabled so auth headers cannot be forwarded. Reads have a 2MiB encoded limit and 5s network timeouts; playback has a 30s clip limit, 15s maximum lease interval, 256KiB target buffer and 200ms initial playback buffer. These are experimental bounds, not qualified latency thresholds. No seeking or automatic source retry is offered.

## Lifecycle, focus and measurement

ExoPlayer manages speech audio focus and noisy-route handling; focus suppression/loss, background, destruction and expired lease interrupt and release the player. Background resume does not replay. Server lease/fact validity still belongs to the controller/backend; native counters fence old callbacks and sequence duplicate receipts.

opening is not started exposure. Native first-byte is the first InputStream read; native playout-started comes from Media3 onAudioPositionAdvancing, whose documented timestamp is approximate derived playout. JS maps this to started with measurementBasis native-audio-position-proxy and physicalAudibilityVerified false. It cannot establish audience hearing, speaker volume, Bluetooth delay or real event-to-first-audible latency.

For a phone benchmark, record server acceptance/writer/stream times and local receipt/native open/first-byte/position-advancing monotonic intervals separately. Report server/device clock uncertainty rather than subtracting unsynchronized wall clocks. Physical first-audible requires synchronized audio capture or loopback on an identified build/device/route, compared with a visible/instrumented accepted-event marker. Collect cold/warm speaker/Bluetooth runs, timeout/calls/background/mute/Undo/profile switches and whole-game listening. No such physical proof exists in this slice.

## Verification

11 native-adapter tests pass (Vitest4.1.11, Node24) covering scoped URL/header validation, proxy-start semantics, stale epoch/events, consumed-claim dedupe, abort/auth races, fenced renewal and concurrent play. Local stop/supersede/native-call failure callbacks carry the next monotonic sequence, with late terminal/failure-call rejection races covered. Adapter events are synthetic and do not establish native runtime or provider streaming.

Both new Java classes compiled successfully with JDK21.0.11 against existing Android36, Media3 and Capacitor cached classes; output under ignored artifacts/native-commentary/classes. Full isolated Gradle compile did not complete: ordinary JBR25 is incompatible with Gradle8.14.3; switching JDK21 and configured Gradle cache reached a missing generated Cordova module in the snapshot. Standalone javac validates class/API compatibility, not APK packaging or actual audio. Lead normal native sync/build remains a required integration check.

## Primary research

- [Android Media3 network stacks](https://developer.android.com/media/media3/exoplayer/network-stacks): DataSource integration supports selecting the progressive transport.
- [AnalyticsListener](https://developer.android.com/reference/androidx/media3/exoplayer/analytics/AnalyticsListener): audio-position advancing reports approximate derived playout, not physical speaker audibility.
- [Android audio focus](https://developer.android.com/media/optimize/audio-focus): ExoPlayer can manage focus through setAudioAttributes; target35+ focus requires the top app or foreground service. This slice deliberately plays only in the foreground.
- [Capacitor Android plugin guide](https://capacitorjs.com/docs/plugins/android) and [Plugin lifecycle source](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/src/main/java/com/getcapacitor/Plugin.java): register native plugin, emit listener events and release resources on pause/destruction.

No dependency downloads, MainActivity/Gradle edits, device inspection/install or provider call occurred in this lane. Owner listening/voice choice and authenticated deployed backend remain separate gates.
