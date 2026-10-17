# SW046 implementation: account invitations and tournament play requests

17 October 2026. Owner authorised implementation for Android/iOS and preservation of the current tournament/both memberships. Implementation and qualification in progress; no live deployment. SW045 native test and approved shared visual direction remain separate. No account, tournament, notification or provider mutation during this review.

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

## Implemented candidate

- Additive SQL RPC/inbox/RLS for verified-email invitations, atomic UUID membership acceptance in lobby, play requests and explicit readiness without changing scores/pause state. Existing members have no new invitation gate. Per-account cooldown, expired/revoked/stale checks and transactional push outbox with leases/invalid-token cleanup.
- Shared invitations/players UI, authenticated cold/warm destination routing and native App/Push adapters. Server-only Node24 APNs HTTP2 + FCM HTTPv1 worker; provider configuration, supervised operation and real alert delivery pending. HTTPS app associations are not configured; existing web share fallback and native custom-scheme routing are prepared.
- Owner changed primary UI direction to Playform during implementation; see SW047 for actual shared home/score/bonus surface. Saved explicit theme preferences preserved; new installs default light.
- Disposable PostgreSQL checks22passed including concurrent last-seat acceptance, unchanged existing paused snapshots, original two members, recipient ownership, retries, readiness, expired/revoked/stale requests and worker leases. Evidence artifacts/sw046-db/report.json. Focused JS/DOM pulse/bonus/social checks40passed. Full gate and native builds pending at this checkpoint.
- Phone setup: docs/handovers/SW-046-phone-notifications.md. Mac signing identity count0, physical iPhone unavailable; owner unsure whether an Apple Developer membership exists. No purchases, private key transfer, real notifications, cloud mutation, account/profile replacement, Pixel update or web publication.

## Final candidate qualification — 17 October2026

Qualified source 01e7a5537795ba2dce5c89f84de6e0a1a2b53fd8, runtime b9ed275dc0efe4b657a97c9d1c8c974c0a02f29d; the only intervening change ignores the generated Kotlin compiler cache. Initial concurrent gate caught that cache as new source; all checks passed, then the final clean/stable gate passed after the exclusion. No executable source changed.

- Node24.19.0 configured gate:1,122tests passed,13optional camera tests skipped, web/native/iOS-web/room/commentary builds passed. Evidence artifacts/engineering/2026-10-17T21-34-29-557Z-df2ab0f5/report.json under artifacts/sw045/source; source SHA256 0efa07167ce965a82b4f23bdb10c2d61dafe2b805b91fe3beaec9e81231e5f85.
- Disposable PostgreSQL22checks passed on exact committed migration, including concurrent last-seat acceptance, recipient RLS, existing paused membership preservation, stale requests and delivery lease fences. Root evidence artifacts/sw046/db-report.json.
- Android JDK21.0.8/Gradle8.14.3 assembleDebug succeeded; APK9,104,685bytes, SHA256 c24fe8b1f5754394f59c5f1f24520a8a9f4137718939d283576739c1aa7454ac;49packaged web assets byte-matched. Candidate artifacts/sw046/playform-invites-debug.apk; not installed on Pixel. Firebase app configuration absent, push public flag off.
- Mac Apple Silicon/macOS26.6.2/Xcode27.1: unsigned simulator compilation succeeded, data-preserving install/launch PID10484,47source/synced/built/installed assets byte-matched. Actual Playform home/status-bar screenshot visually inspected at artifacts/sw046/playform-launch.png. Mac source folder /Users/ambercavanaugh/Developer/yahtzee-sw046-b9ed275; snapshot9831da3. Previous SW045 source folder retained. Physical phone/signing remains pending.
- Browser393×852 and320px: actual local scoring, turn handoff, correction→Undo confirmation/return and centred entry checked with fictional Alex/Sam;48px score targets/no width overflow; dark/light appearance and saved dark reload checked. Reduced-motion behavior is code/automated evidence, not a physical-device measurement. No console errors observed.
- No production schema/function change, web publication, physical phone installation, account/tournament/profile/settings reset, cloud membership backfill or real push delivery. Existing live tournament and both memberships remain on the prior working deployment. New feature availability in live apps awaits rollout and signing/provider setup; it is not claimed operational there.
- Frozen manifest: artifacts/sw046/candidate-manifest.json. Runtime source tar SHA2563168cd03ae1ff28cad6f424ed170055d25bcc16269fe04a251b41cb6c4208cc2. This documentation-only completion update does not alter runtime qualification.
