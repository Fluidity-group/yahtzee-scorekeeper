# SW077: Desktop Reaction Studio with private drafts and publication

31 October 2026. Owner: Dan; implementer: Codex/fluidity on fg-dev. State: implemented with focused verification; full clean-source gate pending. Not deployed or physically accepted.
Baseline: 2aae047091e2e7a7901a655204874211205c81ab, reaction-engine PR #9. Isolated codex/sw077-web-reaction-studio at artifacts/sw077/source. The coordination checkout and PR #9 are preserved. Agent review is development evidence, not owner release approval.

## Purpose and scope

Owner selects the Studio desktop concept: existing accounts, table selection, private account-owned saved drafts, exact/range conditions, local recipient preview, explicit review and publish to the game. Phones receive published settings and retain gameplay/quiet controls; complex in-phone authoring is retired. A compatible future phone build is required before reaction updates can be used; no phone deployment is authorised here. Game-rule authoring remains a separate versioned design and is not implemented by this change.

## Acceptance

| ID | Observable behaviour | Method / result |
|---|---|---|
| ST1 | Web Studio opens through ?studio=1 with existing account sign-in and only member tables. Account/room changes fence late reads/writes/previews. | HTTP/client/UI regressions pass; same-user refresh, late saves/review, account return and expected-user transport are covered. |
| ST2 | Drafts are account-owned, stored privately on the backend and reload across computers; saved drafts have revision CAS and uncertain-save retry identity. Save/preview never change published settings or scores. | Actual disposable PostgreSQL/PLpgSQL/RLS:12checks passed; source handler tests pass. |
| ST3 | Preview uses the shared reaction evaluator/renderer, scorer avatar, exact score/range and selected recipient, with standard fallback and no scoring/provider generation call. | DOM/pure preview tests pass for exact/range/defaults and actual score legality, with no scoring or provider-generation calls. |
| ST4 | Review publishes only an exact saved draft revision to the selected table, preserving rule ownership, current game/room/config checks and durable command receipts. Rematches retain table settings. | HTTP tests and actual SQL commit wrapper pass including changed/discarded draft between read and commit, future-only state and immutable receipt retries. |
| ST5 | Studio layout supports keyboard/desktop/narrow browser access, authored-rule library, new/edit/delete draft, disabled and host pause flows. Phone authoring is replaced by a desktop Studio route. | Studio DOM tests pass; old phone editor/component-only tests are replaced by stronger Studio save/preview/publish/CAS/auth coverage. Builds pending. |
| ST6 | Node24 configured gate passes on clean source; document migration/backend/web rollout and rollback, with phones held. | Pending. |

## Design

The same static web application hosts Studio, using the existing Supabase Auth session and room API. No additional accounts, paid service or server on fg-dev. GitHub Pages is already configured at https://fluidity-group.github.io/yahtzee-scorekeeper/ with HTTPS; ?studio=1 avoids static-host deep-link routing assumptions. This task prepares source and a review PR, not live publication.

Private draft rows are service-only behind the authenticated room endpoint and RLS. Only current table members can list/save/discard their own draft UUIDs. Draft revisions and request fingerprints prevent overwrites/ambiguous retries across computers. A draft is scoped to the table and references its reviewed published config version. Draft save never mutates shared room/history/score state. Tombstones prevent discarded draft identities being reused by stale requests.

Publish loads the exact private saved revision, validates it against the current roster and authored-rule ownership, and commits through the existing room/history/receipt transaction. The reviewed config/game and room revision are checked. An uncertain retry uses the same immutable command payload; future edits cannot alter an already-accepted publication. Saved draft content is retained separately. A service-only clubhouse_commit_reaction_draft wrapper locks room then draft, checks the exact current draft revision/base/owner, verifies unchanged game and publication marker, then calls the existing room/history/receipt commit in the same transaction. Save/discard use the same lock order. Accepted receipt replay precedes draft checks. No extra capability RPC is added to the phone scoring path; missing draft storage gives Studio an explicit server-update error. Conflicts require an explicit reload/review/rebase, not automatic overwrite.

Rules remain frozen for current games. Publishing registered reaction actions applies to future accepted scores; it does not replay old events, generate paid media, restart a table or change points. Existing SW076 bounded queue/delivery/scoring-lock contracts are preserved.

## Risks, evidence and remaining gates

Cross-account asynchronous writes, private-draft exposure, stale publication, same-account two-computer edits, changing tables with unsaved input, and preview escaping into real delivery receive explicit regression coverage. Deployment requires additive migration, matching room endpoint and configured web publication; compatible native clients and paired gameplay/OS audio/animation acceptance are later authorised gates. No credentials, account data or private media are copied into Git. No live backend, database, provider or device action is performed by this task.

## Independent development review

Reviewer independent_engine_avatar_review tested baseline2aae047 plus the SW077 source tree without editing it or contacting live services. Recheck82tests/7files and all12actual disposable PostgreSQL/RLS checks passed. Findings fixed with permanent coverage: review continuing after an account/table change; removal drafts losing their discard controls after the published rule disappears; save/discard racing publication; browser back-cache restoring a retired editor. Authoring now defers auth-backed reads outside the Supabase auth callback. Host pause preserves dirty draft edits; embedded previews do not create a global game overlay or fetch clips while typing. JSONB key ordering is normalised when identifying already-published saved content. A later focused120tests/8files passed after the additional Studio model/lifecycle/adapter coverage and retirement of obsolete phone-authoring helpers.

Skills were re-read: product-change and manual-multiplayer still route authority, ownership, session fencing and evidence correctly; no reusable-rule change is required. Status/memory/current handover are updated in this topic branch.

## Rollout preparation and rollback (not executed)

1. Review and integrate dependency PR #9 and this topic PR normally, preserving master’s physical-test gate.
2. Apply additive migration202610310001_reaction_studio_drafts.sql, then publish the matching generated game-room function and validated web build to existing GitHub Pages. Do not use an unconfigured/offline qualification bundle as a rollout package. Studio is accessed at the existing web root with ?studio=1.
3. Verify real existing-account login, private drafts across two computers, conflict review and a synthetic/new test table before selecting compatible phone builds. Devices remain held until separately authorised. No exact-once audible playback or APNs/FCM promise is made.
4. Roll back web/backend by publishing the previous approved versions normally. Retain the additive private draft table/data; old clients do not read it, and no historical table/game/profile migration is needed. Never uninstall or clear phone data.
