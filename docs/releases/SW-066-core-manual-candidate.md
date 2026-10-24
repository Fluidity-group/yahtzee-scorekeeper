# SW066 core manual-game test candidate

24 October 2026. Coordinator/lead architect: Codex. Independent UI review: expert_ui_review agent. Scope: merge Amber UI into core, repair queued-close navigation, manual-game Android/iOS readiness and project continuity. Camera/voice development deferred by owner.

## Identities and verification

- Base Amber `7cd7b6c`, merged from master `e599b71` in `a34ebce`; SW066 correction and regression tracked in subsequent commit. See plan for final clean gate and promotion identity.
- Node24.19.0; pinned lockfile, reused local dependencies (npm unavailable); JDK21.0.8, cached Gradle8.14.3. Android assembleDebug succeeded,216 tasks executed. No optional camera runtime qualification.
- Validated public-only phone config from existing SW045 source; voice disabled, push remains disabled. No server/provider secrets copied. Android/iOS retain app ID `com.fluiditygroup.diceclubhouse.dev`.
- Android APK SHA256 `f95f3e1114ef97bf42e26364486df90363dbb42e4d9e59402809aca7a2f28de9`, path `android/app/build/outputs/apk/debug/app-debug.apk` in integrated checkout. Signature verified; certificate SHA256 `e65e9ca5a9dbb4b3596c4482186076c58212f747accc00214af3785f506ffba8` matches SW064.
- All46public assets hash-match prepared manual web, Android synced assets, iOS synced assets and APK. Ignored artifact evidence `artifacts/sw066-assets.json`. Source references regenerated during Capacitor sync were returned to portable node_modules-relative paths before commit; machine-specific dependency paths excluded.
- iOS web assets and project synchronized; no new Xcode compile/sign/install from this Windows host. Existing iPhone profile expires28October2026; fresh Mac signing inspection is required.
- Independent review:66tests/15files initially; fix recheck30tests/8files. Queued-close regression failed before fix and passed after, including avatar/venue/settings interaction and private-preview cleanup.

## Deployment and acceptance

No new native install, public web/backend/Supabase/database deployment or live tournament command. Owner confirms Android/iOS versions running; full cross-phone manual acceptance remains open. Existing SW064/SW065 phones have the previous native source, not this queued-close correction.

Before install, freshly verify target app/signature, preserve storage, and use same-ID data-preserving replacement only under owner deployment authorization. iOS needs matching signed Xcode build; web-bundle success is not physical signing evidence. Keep prior SW064 APK/SW065 signed-app artifacts for data-preserving rollback; do not uninstall, clear data or revert shared database scores. Main Git rollback uses revert commits, never force-push/reset.

Test the same-account existing tournament on both phones: scoring/own-seat enforcement, Undo/corrections, Home/Resume, background/reconnect, completed game results, Ready/next-game and real account summaries. Do not report complete-game acceptance until actual observations are supplied. Deferred shared venues/events/generated portraits/push are outside this candidate.
