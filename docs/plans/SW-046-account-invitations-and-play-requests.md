# SW046 proposal: account invitations and tournament play requests

17 October 2026. Research/design proposal, not implemented, deployed or owner-approved for execution. SW045 native test and approved shared visual direction remain separate. No account, tournament, notification or provider mutation during this review.

## Experience

Either iOS or Android can create the same server-owned tournament. Sign-in uses email; authenticated Supabase account UUID remains the identity and membership key. An existing tournament member returns to the same seat from either platform without a replacement roster or join-code requirement. Organiser roles remain enforced; being a member does not confer host authority.

At tournament setup, Invite player accepts a specific email or a share link. Recipient sees sender, tournament and game count and explicitly accepts or declines. Bind acceptance to the verified recipient account; email is an invitation address, not a database primary key. Pending invitations and accepted membership are distinct. Do not expose a public account-email directory or reveal account existence in the sender response. New accounts may claim a pending invitation only after verification. Preserve fixed rosters after tournament start; this feature does not add mid-tournament seats or recreate existing tables.

For an existing tournament, show member state and a Ready to play? action. Keith requests Amber; her notification says “Keith is ready for Game 8 of 12. Open your tournament.” A tap opens the same table, fetching fresh authorised state. If signed out, retain the intended destination through email-code login. Joining the screen does not resume a paused tournament or mark a player ready automatically. After explicit readiness, the organiser sees both players ready and can resume/continue using the existing legal state transition. Expired requests show the current table state; they never replay old start commands.

Notifications cannot force an app to open on another phone. Foreground uses an in-app banner; background/closed uses an OS notification if permission/delivery permits. Silent/Focus/offline/disabled notifications do not block scoring or tournament access. Show Waiting for Amber versus Amber is ready only from an actual response, not from a push-send receipt. Request expiry/cooldown and repeat-tap deduplication prevent stale or repeated alerts. Member can dismiss/mute requests.

## Proposed architecture

- Retain Supabase as the only game/account authority. Neither phone hosts a peer server; no matching OS version or Wi-Fi is required, but online changes require internet and protocol-compatible clients.
- Add server-authorised pending invitations, accepted/declined/revoked states and durable per-user notification inbox. Membership acceptance is idempotent and atomic with seat-capacity/frozen-roster checks.
- Add separate short-lived play-request/readiness records keyed to tournament/current game and requester/recipient. Validate existing membership, host permissions where applicable, rate limits, expiry and fresh revisions. Do not couple transient request delivery to game revision churn.
- Register authenticated per-install device tokens with platform/environment, rotation and sign-out/revocation handling. Send via server-side outbox worker with dedupe, bounded retries and invalid-token cleanup. Notification payload is a navigation hint; membership is always checked again on the server. Never embed account sessions or authority-granting commands in push payloads.
- Capacitor App routing plus verified iOS Universal Links/Android App Links for shared HTTPS invitation links. Notification taps route directly to the same destination. Cold launch, foreground and login completion converge on one navigation handler. Web fallback retains current share-link/QR/code joining. Invitation acceptance remains explicit.
- Native notifications via Capacitor Push Notifications, APNs on iOS and Firebase Cloud Messaging on Android. Keep game data/auth in Supabase; Firebase is only a delivery transport. Verify Apple signing-team eligibility, push entitlement and APNs credentials, FCM project/device permissions and stable link-domain configuration before real-device push qualification. No purchases, enrollment or credentials are assumed from the basic simulator build.
- Missing push still leaves a persistent in-app invitation/request and explicit share-link fallback. Do not poll to simulate closed-app push or infer delivery/hearing/opening from provider acceptance.

## Delivery and acceptance

1. Qualify current Android–native iOS account login/return and both organiser roles on a separate test table; preserve existing live tournament and settings.
2. Implement account-targeted invitations, explicit acceptance and persistent membership/inbox with backend ownership/revision/idempotency regression tests.
3. Implement destination routing and play-request/readiness UI, preserving pending route through sign-in, pause state and current scores. Exercise denied access, stale/cancelled invites and returning members after admission expiry.
4. Add/qualify real-device notifications both directions: foreground/background/closed app, permission denied, signed out/wrong account, network loss, duplicate taps, token rotation and stale game requests. Record sent/provider accepted/app opened/member ready as distinct events.

Phone notifications are not yet integrated. The first iOS target intentionally has no push/App routing plugin; adding them is a new qualified capability slice. Real-device APNs eligibility/signing remains a prerequisite; no App Store launch is required by this proposal.

## Evidence and primary references

Existing `src/multiplayer/room.js` stores UUID members, permits new joins only in the lobby and restricts fixed tournament size; existing members return before new-admission expiry checks. `src/multiplayer/ui.js` provides share/QR/code and saved sessions. No addressed-invite/push service was established by this source review.

- [Capacitor deep links](https://capacitorjs.com/docs/guides/deep-links)
- [Capacitor push notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Apple APNs registration](https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns)
- [Apple supported iOS capabilities](https://developer.apple.com/help/account/reference/supported-capabilities-ios)
- [FCM Android setup](https://firebase.google.com/docs/cloud-messaging/android/get-started)

Accessed 17 October 2026. Proposed design is distinct from existing deployed capability.
