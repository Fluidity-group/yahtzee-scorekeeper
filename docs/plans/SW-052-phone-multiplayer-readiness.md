# SW-052: phone multiplayer readiness and upper-total alignment

21 October 2026. Owner: Codex. State: fixes verified, Android artifact prepared, signed iPhone build installed/launched; physical two-phone acceptance open. See final qualification below.
Baseline: SW050 runtime e17d972 plus SW051 documentation. Scoped branch codex/sw052-phone-multiplayer-readiness; no pre-existing root changes are overwritten wholesale.

## Requirements

- R1: Own upper total is centered in the own-score column, including a secured bonus, without widening opponent fields or repeating totals.
- R2: Android/iPhone/web users can host, join via link/code and start only with the fixed tournament roster present. Existing membership and saved state survive return.
- R3: Addressed invitations require explicit recipient acceptance; play requests require explicit readiness. Links/alerts navigate, never mutate membership, scores or pause state.
- R4: Prepare current Android/iOS test artifacts; separate successful compilation, signing, installation and physical acceptance. Preserve all existing accounts/tournaments/settings.
- R5: Synchronize applicable skills, engineering status, build manifest and next-chat handover to actual evidence.

## Reproduction and diagnosis

Screenshot4249 shows own upper total right aligned. Source upper summary uses a two-column spanning header and explicit justify-content:flex-end, so it cannot align to the score-column center. Replace the spanning layout with semantic label/value cells and center the value within its own column.

Native shared-link investigation: generic native/HTTPS links have no destination kind; prototype routes every non-invitation destination through member-only read. A first-time guest cannot read before joining and is returned to home. Distinguish join links from existing-member play/ready destinations, preserve intent through sign-in, and use existing explicit join form/authoritative seat checks. Email-invite links retain acceptance flow.

## Verification plan and execution bounds

Reproduce layout on actual local app and link routing with regression fixtures before fixes. Cover own/peer totals, earned/hidden bonus, shared-link joins, existing paused member return, invite acceptance, host/join/start and roster-full start gate. Run focused checks, then Node24 configured gate and native compilation. Use fictional fixtures/disposable database checks for mutations; real tables are read-only. No new real invitations, phone alerts, cloud rewrites, clearing app data or public release implied by build preparation.

Android/iOS builds use existing public-only manual test configuration, voice deferred/push off. Mac reachability, signing identity and physical iPhone are freshly inspected. No signing identity, unavailable Mac or absent phone must remain an explicit installation gate. Update this record with actual results before declaring ready.

## Risks and completion

Primary risks: confusing shared join links with member-return notifications; totals drifting when bonus ribbons appear; claiming iOS readiness from web assets alone. Mitigate with intent regression tests, geometry checks on phone widths and separate native artifact/signing/install evidence. Codex self-review is development evidence; owner two-phone acceptance remains required. Full qualification and build identities pending.

## Final qualification — 21 October 2026

Source/runtime0bc8ca04c237af7dfa7ce0c8af62c93b14451327, clean/stable Node24.19.0 gate artifacts/engineering/2026-10-21T19-13-27-263Z-9937aee5/report.json, source SHA256 c9a36b9e901f3062ffebcfacb98f5339285a6485b9e00cfda7bbbd357b01bb83. All1,144tests passed,13optional camera skips, configured web/native/iOS-web/edge builds passed. Social SQL/RLS disposable PostgreSQL22checks passed. These use fictional fixtures, not owner-account mutations.

Root evidence: artifacts/sw052/browser-check.json, apk-verification.json, ios-verification.json, iphone-installation.json and candidate-manifest.json. Three phone widths320/393/448px, earned/unearned upper total center within1px of own column, no width overflow, own column wider than peer; actual local centered entry and handoff passed. Added routing/acceptance coverage; existing fixed-roster start, wrong-account/RLS, paused membership, expiry, replay and concurrent last-seat coverage passed.

Initial regressions demonstrated spanning upper-total mismatch and missing join intent. Full gate first failed three old tests tied to the deliberately replaced merged-cell markup; those were updated without removing behavior coverage. Final review also reproduced a stale pending join on next app launch; accepted join now clears the matching destination, while sign-in/failed joins preserve it. Gate rerun on final source passed clean and stable.

Android JDK21/Gradle8.14.3 compile succeeded. APK SHA256 5cd3bca7b0fdd61b053cceeb5c2c84906957660731ad2928f6371588f98e7a39,46source/synced/packaged assets matched. First packaging attempt under legacy Windows PowerShell wrote an SDK properties file with incompatible encoding; PowerShell7 packaging succeeded without source changes. Packaging was repeated sequentially after the final engineering builds to avoid shared generated-output races. Pixel not installed/updated in this task.

Mac Xcode27.1/macOS26.6.2/AppleSilicon Node24.19.0: simulator and unsigned arm64 device compilation passed; final signed physical app compiled against Amber iPhone17Pro/iOS26.6.2, using existing Personal Team2YD8HRPQ93 and stable bundle com.fluiditygroup.diceclubhouse.dev. Signed app signature verified, profile includes target device; expiry 2026-10-28T19:09:36. Binary SHA256 8c62ddb2ba5c346ea82be793c27b3a6f2c87c88e82a27cc0c03b9a81519b2c94. All46source/synced/signed assets matched and are byte-identical to Android public assets. Installed without uninstall/reset; devicectl launch confirmed. Initial no-device/profile, SSH errSecInternalComponent and first-time trust gates were resolved by owner Xcode sign-in/certificate, USB trust/DeveloperMode, GUI Terminal key permission and iPhone developer trust. GUI signing is the verified path; no password/private key was collected or copied.

Live read-only schema check: social RPC present, anon execution false, authenticated execution true, invitations/play-request RLS enabled;5rooms/28archived games/4accounts at observation. No hosted commands, scoring/membership/settings writes or backend/public-web deployment were issued. Owner play may change live totals independently. Phone notifications remain off and no provider worker was started. Existing Safari data stays intact; the native app has separate local storage and needs the same existing account for membership/cloud history.

Current native test app installation and successful launch are verified; two-phone invite/join/start/scoring/touch acceptance remains owner work. Keep next-game UI priority, latest-own-turn Undo and frozen tournament rules unchanged. SW051 analytics remains a review proposal, not an app feature shipped by SW052.
