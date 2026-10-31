# SW075 independent development-agent review

31 October 2026. Reviewer: independent_engine_avatar_review (separate agent context). Frozen source: clean da3f3eacdafaef0aa4ee2d23ab7e551e87e2d4c5, branch codex/recover-rog-interface. Implementation/recheck target is a separate worktree; original review did not edit code or access live accounts/providers/credentials. This is independent agent development review, not external/human release approval.

## Original findings

| ID | Severity and frozen-source location | Reproduction | Required fix |
|---|---|---|---|
| A1 | P2 avatar-view.js6–10 | Ownrev2 + peerrev1 makes renderer show old image; old own response rolls store to1 | Revision-aware acceptance and consistent lookup |
| A2 | P2 midnight-panels.js13/19/24 | Accountcharacter4/devicecharacter1 highlights1; confirm can overwrite account | Follow account selection; preserve server choice before explicit edit |
| A3 | P2 portrait-panel.js19–20/33–39 | Two clicks after uncertain Generate produce two UUIDs with no status check; reopened failing draft has hidden retry | Stable pending identity, Check/Forget, no blind paid retry |
| A4 | P2 portraits/handler.js8/20 | Existing generated profilerev3 + signing failure returns500/no profile; reload shows fallback preset | Return metadata independently of image delivery |
| A5 | P2 portraits/handler.js7/15 and adapter11 | Hanging queued removal blocks profile RPC indefinitely | Prioritise metadata; bounded cleanup/network and durable retry |

Eight existing test files passed33tests independently. Synthetic read-only probes established A1–A5. Parent added permanent regressions in avatar-profile-stability.dom.test.js and portrait-profile-availability.test.js. Recheck must be recorded separately from this original finding table.

## Architecture findings

Current score presentation is hard-coded, broad-audience and not a configurable participant program. Legacy CustomTriggers is local/name-matched/text-only and not connected to production bootstrap. New definitions need author/actor/recipient separation, UUID/local-seat identity, versioned future-only edits and server roster checks. Gameplay program edits must be separate from reactions. The existing four-second pacing lock is an actual contract, not safe dead-code deletion. Competition v2 reuse and bonus-Undo outbox mismatch require explicit treatment; see SW075 design and prior review.

## Cleanup finding

Legacy production shell can be removed if an exact test fixture preserves historical assertions. Legacy main/db/rules/moments/commentary/custom-trigger cluster is still test-referenced; shared scoring/categories/CSS remain active. Source/generated edge bundles are not disposable merely because they look old.

## Recheck

Requested against the implementation worktree after A1–A5 fixes. Pending reviewer response and final qualification; no original finding is marked independently closed yet.
