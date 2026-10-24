---
name: release-qualification
description: Prepare and qualify an identified product release with scoped test evidence, deployment manifest and rollback.
---

# release qualification

Read the relevant deployment contract and AGENTS.md. Inventory the intended source and pre-existing changes; a dirty-tree run is development evidence, not a reproducible release. Run the configured engineering gate and record skips and external dependencies. Prepare docs/releases/<release-id>.md with source/build/configuration identities, automated and physical evidence, target, remaining gates and rollback. Inspect the actual target freshly before an authorized deployment. Deployment, boot cutover and physical acceptance are distinct stages; do not infer authorization from preparing the manifest. If checks fail, stop promotion and preserve evidence.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.

For the manual Android/iOS test pair, use validated public-only `.env.ios-test.local` and `scripts/prepare-ios-test.mjs`; keep server/provider secrets and Windows login sessions off the Mac. Match packaged/synced assets to the qualified source and record bundle IDs and artifact hashes. An unsigned simulator app is not an installable physical-iPhone build: freshly check signing identity and physical destination, then record compilation, installation and owner acceptance separately. Match the Mac host fingerprint to the verified handover when its IP changes; keep access files ignored. Do not enable push merely to prepare manual test builds.


Treat a separate sample/review-branch push, main promotion, public web/backend deployment and each native installation as distinct targets. Respect the latest owner rollout sequence in the current handover. A real-backend sample is not an isolated fake database; never advance user tournaments merely to qualify UI. Verify LAN servers deny private artifacts as well as environment/Git files.

Current task routing: resolve SW066/core manual integration from docs/status.md and docs/handovers/2026-10-24-core-manual-integration.md. Manual scoring and tournament dependability on Android/iOS is the owner priority; camera and voice work stays deferred until the owner resumes it after manual-core acceptance. Preserve prior source/device evidence; a running app is not complete-game acceptance. Keep these repository skills and current memory/handover routing synchronized when promoting a build.
