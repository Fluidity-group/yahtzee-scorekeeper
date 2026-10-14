# Proposed QR joining flow

Status: implemented using Supabase; see `multiplayer-development.md` for deployment
and the remaining two-phone acceptance test. GoDice capture is a subsequent stage.

The Android host creates an online room and displays a QR invitation plus a short
room code. Guests open the HTTPS invitation in their phone browser, authenticate
with their account, then join the lobby. The host starts with up to eight players.
The host connects to GoDice; browser guests receive game updates over the internet.
Manual games use the same flow without dice hardware.

Keep the Android phone as the game organiser and dice gateway, with a backend
responsible for validating turns, storing accepted commands, and synchronising
participants. Invitation tokens identify a room; they do not replace authentication
or grant host privileges. Expire invitations, restrict room capacity, and retain
the existing idempotent command model to handle reconnects without duplicate scores.

This lets guests use Wi-Fi or mobile data, including iPhone browsers. A server
directly on the Android phone is technically possible but requires reachable
local networking, lifecycle handling, and additional platform permission work.
That approach is a possible later offline mode, not the recommended first release.

Supabase now supplies accounts, validated room commands, storage and live updates.
Measure operating costs during the prototype tests. Hardware capture
remains subject to the GoDice commercial licensing gate documented separately.

Platform reference: https://developer.android.com/privacy-and-security/local-network-permission
