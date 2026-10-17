# SW046 phone notification setup and rollout

17 October2026. Source implementation, not live phone-delivery acceptance. Both directions are supported by design: iPhone organiser → Android member and Android organiser → iPhone member. Existing tournament members need no new invitation or acceptance. Opening a tournament sends nothing automatically; Invite, Ask to play and I'm ready are explicit actions.

## What the owner needs to provide

### Apple

In Xcode → Settings → Accounts, sign in and check the team. A Personal Team is the free development team; real APNs requires an eligible developer team with Push Notifications enabled. The Mac currently reports zero valid code-signing identities; that alone does not establish whether the owner already has a paid membership. Owner completes account/2FA, agreements and any enrollment purchase; no purchase or credential submission is automated.

For the stable app ID `com.fluiditygroup.diceclubhouse.dev`, enable Push Notifications in the Apple developer account and Xcode Signing & Capabilities. Refresh development provisioning. Supply Team ID, APNs Key ID and the downloaded `.p8` key in an ignored `.private/` folder, not in chat or Git. Record any necessary bundle-ID change before installing; do not silently change the ID or remove the working app. APNs sandbox is used for development builds; production is a separate explicit configuration. The new AppDelegate callbacks and native push plugin are prepared; the source does not add a push entitlement before signing is available, so basic simulator/manual testing remains possible.

### Android / Firebase

Use a Firebase project with Cloud Messaging HTTPv1 enabled. Register Android package `com.fluiditygroup.diceclubhouse.dev`; put the downloaded Android app configuration at ignored `android/app/google-services.json`. The Gradle plugin is already conditional on this file. Provide a server-only service-account JSON with permission to send FCM messages, stored in ignored `.private/`, never bundled in the app. Firebase is only a notification transport; accounts, games and authority stay in Supabase. No iOS Firebase SDK is needed because iPhone delivery uses APNs directly.

### Delivery service

The additive `202610170001_tournament_social.sql` migration must be qualified/deployed before the new UI can use its inbox/RPC. Do not reset existing tables, insert replacement memberships or change the old tournament to install this feature. Before/after the authorised migration, compare existing room state/member IDs/revision, all existing games, accounts, profiles and settings. Existing score endpoints are unchanged. Keep this deployment separate from signing/provider configuration.

Run the Node24 worker on a supervised always-on server (the ROG can serve as a temporary test host). It needs server-only Supabase service-role access and the APNs/FCM files. Put these fields in ignored `.env.social-push.local`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY
APNS_TEAM_ID=YOUR_TEAM
APNS_KEY_ID=YOUR_KEY_ID
APNS_PRIVATE_KEY_FILE=.private/apns-key.p8
APNS_BUNDLE_ID=com.fluiditygroup.diceclubhouse.dev
APNS_ENVIRONMENT=sandbox
FCM_SERVICE_ACCOUNT_FILE=.private/firebase-service-account.json
```

With approved provider configuration, `node scripts/deliver-tournament-push.mjs --once` processes one bounded batch. `--watch` checks the server outbox every5seconds and refreshes its FCM access token. Deploy the watcher under a service manager before claiming continuous delivery. No worker is started by installing the app; no provider notification was sent by the implementation tests. There is no client polling loop for notifications. An offline worker affects alerts only; invitations/requests remain in the database inbox.

After signing, native provider setup and the worker are ready, build with public `VITE_PUSH_ENABLED=true` (iOS: `.env.ios-test.local`; Android: its native build environment). Then tap Invitations → Enable phone alerts on each phone. Permission denial never blocks games. Registration is restored without another prompt on later authenticated launches if permission remains granted, unless disabled in-app. Device tokens are account-bound and updated on registration; explicit sign-out attempts to deactivate that installation before clearing auth. Offline sign-out may leave a generic server alert registered until the next successful removal/registration; taps always require fresh account membership. Do not promise immediate revocation after an offline sign-out.

## Routing and delivery limits

Push taps navigate from code/event metadata and recheck membership; they never grant a seat, resume a tournament, accept an invitation or mark ready. Direct app links `diceclubhouse://table/ABCDEFGH` are registered on both native platforms. HTTPS share links retain the existing web/QR/code fallback. Verified HTTPS-to-native Universal Links/App Links need an owner-controlled domain, association files and signing fingerprints/entitlements; these are not claimed configured. Phone notification taps do not need that domain to open the native app's destination.

New invitations are addressed to a verified account email; acceptance binds the stable auth UUID. They are saved in-app, not automatically emailed by this implementation. Share the invitation link with someone who hasn't registered yet. Membership already stored in the current tournament stays valid without an invitation record. The fixed roster cannot grow after starting.

Provider acceptance is recorded as `sent` in the outbox, not device delivery or player readiness. APNs/FCM may delay, suppress or collapse notifications; Focus/offline/permissions remain OS-controlled. Readiness comes only from the recipient's explicit response. Pending play requests expire after10minutes; repeated sends have a60second cooldown and per-account limits. Workers use leases, bounded retries, invalid-token cleanup, stale-context checks and event collapse identifiers. The queue is at-least-once; duplicate provider delivery is still possible after an uncertain send, and must not mutate the game.

## Real-device acceptance still needed

On a separate two-account test tournament, exercise create/invite/accept both host directions, existing paused-table return, foreground/background/cold-start taps, signed-out/wrong-account routing, old requests after game advancement, permission denial, token refresh, duplicate sends, mute/sign-out and network loss. Check exact target identity, game sequence, scores, pause state and unchanged membership before using the owner's current tournament. Do not send test alerts/invitations to real users without their explicit action/authorization.

Sources accessed17October2026: [Capacitor push](https://capacitorjs.com/docs/apis/push-notifications), [deep links](https://capacitorjs.com/docs/guides/deep-links), [Apple capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-ios), [FCM server authorization](https://firebase.google.com/docs/cloud-messaging/send/v1-api).
