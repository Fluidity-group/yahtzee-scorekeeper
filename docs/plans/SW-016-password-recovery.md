# SW-016: hosted password recovery

13 October 2026. Owner: product owner; coordinator: Codex; independent reviewer unassigned. State: implementation in progress. Software scope; no camera, game authority, database schema or Android installation changes.

User authorizes adding recovery UI, publishing it, fixing Supabase URL configuration and sending Amber a new recovery email. Existing dirty master source and local saves preserved. New credentials must be entered and submitted by the user, not Codex.

## Requirements and acceptance

- REC-1: email recovery link opens the hosted app, validates its recovery session and offers new password/confirmation. Missing, expired and malformed links offer another email rather than trusting an existing signed-in account.
- REC-2: remove recovery tokens/code/error parameters from the address before async auth work. Do not log/export credentials or tokens. Retain explicit URL-session detection disabled for ordinary room login.
- REC-3: matching passwords of at least eight characters, duplicate-submit prevention, surfaced failures and success only after Supabase accepts the update. Tests use synthetic credentials only.
- REC-4: Forgot password requests email with exact hosted recovery redirect; local/room scoring remains isolated.
- REC-5: configured engineering gate, published asset identity and live empty/invalid-link UI checked before changing Supabase Site URL/allow list and sending replacement email.

## Design and bounds

Dedicated recovery entry before legacy/lab/game routing. Explicit recovery fragment session (dashboard/default implicit flow) and PKCE code exchange (app-requested flow) supported. No password update for an existing unrelated session without a valid recovery URL. Request and result errors do not disclose whether an email is registered. Exact hosted URLs only; no wildcard redirect access. Supabase initial Site URL is http://localhost:3000 and redirect list empty; preserve this as rollback configuration.

Actual checks, deployment identities and remaining acceptance will be appended. Human completion of Amber's new-password entry remains required. Source is a preserved dirty development baseline; this is not commercial qualification.

## Actual completion

Implemented recovery routing/module/page plus Forgot password link.12 new DOM tests cover valid fragment/session handling, PKCE exchange, URL sanitization, missing/incomplete/wrong-type/expired links, password validation, pending/duplicate submits, failed updates and exact email redirect.45 focused tests/4 files passed. First full-gate build failed on top-level await unsupported by target browsers; corrected asynchronous entry. Final Node24.19.0 gate passed476 tests/60 files, zero skips, all configured builds and unchanged-source check; artifacts/engineering/2026-10-13T21-52-03-247Z-fb0180c3/report.json. Optional existing evaluation/camera inputs reused; no new recognition acceptance.

Authorized web deployment and URL configuration complete; see ../releases/SW-016-2026-10-13-password-recovery.md for source/asset/gh-pages identities and rollback. Site URL hosted root; allow-list exact ?reset=1 recovery URL. Live request and expired-link UI verified after PWA refresh. Replacement email request accepted and independently recorded as200 /recover in Supabase user logs. No actual password/token handled by Codex. New-password entry, mail delivery and Android sign-in remain human acceptance; no Android update, backend/schema deployment or physical game acceptance.

Reference implementation follows official Supabase resetPasswordForEmail/setSession/updateUser flow: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail and https://supabase.com/docs/guides/auth/passwords .
