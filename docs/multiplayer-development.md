# QR multiplayer prototype

13 October2026: hosted password recovery implemented in src/multiplayer/recovery.js/recovery-page.js, selected before game routing by bootstrap. Login offers Forgot password. Supabase Site URL is the hosted root; allow-list includes exact https://fluiditygroup-git.github.io/yahtzee-scorekeeper/?reset=1. Dashboard recovery fragments and app-requested recovery redirects both reach new-password UI; credentials are removed from address before auth calls. Missing/expired links offer a new request, not an unrelated saved session. User enters/submits new credentials. Web deployed and replacement email accepted; actual user password update/Android sign-in remain acceptance. See releases/SW-016-2026-10-13-password-recovery.md.

Implemented locally: Supabase account client, email-code and existing-password
sign-in, host/join screens, QR invitations, lobby roster, host-controlled start,
shared manual scorecard, live updates, reconnect refresh, and per-player scoring.
The backend is deployed to Supabase project `ezgawsdmvuoqrxlfbgen`; the browser
build is published at https://fluiditygroup-git.github.io/yahtzee-scorekeeper/.
The real two-phone acceptance test still requires two game accounts and device testing.

## Configuration and deployment

Use the existing Supabase development project. The browser and Android app need
the same public settings in the gitignored `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_GAME_WEB_URL=https://fluiditygroup-git.github.io/yahtzee-scorekeeper/
VITE_PUBLIC_BASE=/yahtzee-scorekeeper/
VITE_EMAIL_OTP_ENABLED=false
```

The publishable key is public app configuration. Never use a secret/service-role
key or database password here. The native build always uses `/` for asset paths;
its invitations still point to the published web URL.

1. Run `supabase/migrations/202609160001_rooms.sql` in the development project's
   SQL editor once. This creates the room table, enables RLS and member-only
   reading, blocks direct client writes, and enables Realtime.
2. Run `npm run build:rooms` from WSL with the project's Node installation. This
   bundles the same scoring rules used by the app into
   `supabase/functions/game-room/index.ts`; do not edit the generated file.
3. Deploy `game-room` using the Supabase CLI or dashboard editor. CLI command:
   `npx supabase functions deploy game-room --project-ref PROJECT --use-api`.
   The checked-in config disables the legacy gateway JWT check because the
   handler validates every bearer token against Supabase Auth itself. The handler
   rejects anonymous and unconfirmed accounts. The service-role key is supplied
   only inside the Edge Function runtime and never shipped to clients.
4. For email codes, first configure custom SMTP, set `VITE_EMAIL_OTP_ENABLED=true`,
   and set the Magic Link email template to include
   `{{ .Token }}`. Configure custom SMTP before inviting general users; the
   default Supabase sender only delivers to organisation members and has tight
   limits. For the initial two-phone test, create two confirmed test accounts in
   Authentication → Users with distinct emails and passwords. Each tester enters
   their own credentials using **Sign in with an existing password**. Do not
   disable email confirmation globally to work around delivery.
5. Run `npm run build` followed by `node scripts/publish-test-web.mjs` in WSL.
   This uses the existing GitHub login and an isolated `artifacts/pages-publish`
   checkout to publish built assets on `gh-pages`, leaving the source branch alone.
   Wait for the Pages build to finish. Then run
   `scripts/build-android.ps1` and install the APK with `adb install -r`.

## Data and authority

Each room stores a revision, fixed roster after start, host account ID, mode,
hidden-total preference and shared game snapshot. Player IDs are account IDs.
Eight-character invitations expire for new joins after 48 hours. Existing members
can rejoin after play begins. Rooms are listed only for their members.

The function authenticates the caller before reading or changing a room. It
derives the seat from membership, validates scores with the shared core, restricts
corrections to their owner, and saves with a revision compare-and-swap. Command
IDs make retrying an accepted score idempotent. Concurrent joins are retried;
the host must review a changed roster before starting. Local Dexie saves remain
separate and cannot overwrite a shared game.

Supabase Realtime pushes accepted snapshots. A 15-second refresh also checks for
missed updates, with faster reconnect attempts after failure. Scoring waits for
server acceptance and is blocked while disconnected. Hidden totals are a display
preference; members still receive complete scoring data.

## Device acceptance

1. Host signs in on Pixel and creates a Standard manual room.
2. iPhone scans the QR using its camera, signs in as the second account, and joins.
3. Verify names, player colours, chosen mode, and hidden-total preference.
4. Host starts. Only the active player's own phone can add a category; other
   players can inspect scores and correct only their own recorded scores.
5. Record an upper count, X, a fixed score, and a keypad total. Verify each accepted
   score and next turn on both phones. Test an additional Standard Yahtzee.
6. Disconnect/reconnect one phone and reload its browser. Rejoin from the
   invitation or Your online games; ensure no duplicate scores or lost progress.
7. Finish a game; verify winner/ties and reveal hidden totals on both devices.
8. Repeat with mobile data on one phone to verify this is not Wi-Fi-dependent.

Only after this passes should real GoDice testing begin. The existing commercial
licensing gate in `godice-feasibility.md` still applies. Current rooms are manual;
no simulated or real BLE input is silently presented as connected dice.

## Verification recorded

- Full suite: 186 tests passed across 20 files before the final password-default adjustment.
- Deployed function: unsigned requests return 401 with the function's own sign-in error.
- Android build and installation succeeded with the Supabase connection.
- Production dependency audit after adding Supabase and QR libraries: zero reported vulnerabilities.
- Signed-in two-device play and physical QR scanning remain user acceptance steps.

References:
- https://supabase.com/docs/guides/functions/quickstart-dashboard
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/guides/auth/auth-smtp

## Shared host GoDice prototype

The Android host creates a room with **GoDice · connected to this host**, connects
exactly five dice, and shares its QR invitation. Guests use the same responsive
scorecard in the web app and do not need Bluetooth access. Keep the host app open
and both phones online during play.

Only the host account can submit physical rolls and live movement snapshots.
Only the active player can score their turn. The server validates scoring against
accepted dice and starts the next player's turn automatically. Live updates have
a separate room revision so movement does not invalidate captured game revisions.
Scoring waits while the host reports rolling or paused dice. Corrections retain
the original capture evidence. Manual rooms continue using their existing flow.

### Physical acceptance test

1. Create a NEW host-GoDice room on Android; connect five charged dice.
2. Join from the iPhone QR link as the second account and start on Android.
3. Roll all five, then reroll a subset. Compare faces, roll count and matching
   categories on both screens. Only the active player's scoring cells enable.
4. Score on the active phone. Pass the physical dice and repeat for the guest's
   turn while Android remains the Bluetooth host. Choose the guest score on iPhone.
5. Check a face correction, the three-roll limit, connection loss and reconnect.
6. Refresh the guest browser and rejoin; verify accepted rolls and scores persist.

Background hosting and automatic BLE recovery after restarting Android are not
implemented in this prototype. Physical two-phone acceptance remains required;
automated tests simulate the host notifications and authenticated room commands.
Release verification: 229 tests passed across 32 files; Android debug APK built and installed on Pixel; matching web assets published and verified live; deployed room function returns 401 for unsigned POST requests.
