# SW046/SW047 candidate: Playform and tournament invitations

17 October2026. Owner authorises implementation, Playform primary direction and preservation of the existing tournament/memberships. This record begins before final qualification. No live schema migration, production web publication, Pixel install, physical iPhone install or real push delivery is claimed. Candidate simulator update is development testing.

## Changes and compatibility

Shared Playform home/score/bonus treatment; new explicit invitations and play requests, persistent UUID membership and authenticated destination return. Existing room/scoring endpoints, account IDs, score/history ownership and fixed started rosters are unchanged. Existing members require no invitation record or reacceptance. Social migration adds tables/functions/RLS only; new seat acceptance mutates only its intended pre-start lobby in a locked transaction. Play/readiness requests do not mutate room state, revision, pause status or scores.

Native App/Push/StatusBar adapters are pinned; public push flag is off pending setup. iOS/Android manual test assets use ios-test mode, which defers voice without altering stored preferences/shared profile settings. Native custom-scheme routing and push-tap destination handlers are implemented; verified HTTPS app associations, provider credentials/signing and operational continuous delivery remain setup gates. In-app email-addressed invitations are not automatic outbound emails.

## Evidence and target

Source revision, full engineering result and native build identities will be appended after qualification. Current focused pulse/bonus/social checks40passed; disposable PostgreSQL22passed including preservation, RLS, explicit acceptance/readiness, concurrent capacity and worker lease fences. Browser actual-app393×852/320px fictional local score/correction/Undo review completed; screenshots in artifacts/sw046. These do not constitute real-phone push or two-account native/cloud acceptance.

Targets: existing Android package and iOS bundle `com.fluiditygroup.diceclubhouse.dev`; the working server project remains unchanged during candidate work. Existing user settings/tournament snapshots must be compared before and after any separately authorised migration/deployment. The Mac currently has no code-signing identity and no connected physical iPhone; native simulator compilation is distinct from signing/installing onto Amber's phone.

## Rollout / rollback

See SW046 phone-notification handoff. Deploy only this additive migration after recording protected fingerprints and testing authenticated/unauthorised operations. No reset/replacement tournament or membership backfill. Publish/install qualified assets with data retained, then test both host roles on a separate two-account table before owner-tournament scoring. Enable phone alerts only after real provider/signing/worker setup and dedicated device tests. Do not send invitations/notifications to real people as an automated smoke test.

Rollback client code with data-preserving updates; leave additive social schema in place. Old clients retain existing room/read/score/QR/code behavior. Disable the new worker/flag to stop alerts if needed; this does not remove memberships or scores. Do not reverse legitimate accepted seats or delete tournament history to roll back presentation. Preserve acceptance audit and provider-acceptance versus actual user-readiness distinctions.
