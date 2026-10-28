---
name: release-qualification
description: Prepare and qualify an identified product release with scoped test evidence, deployment manifest and rollback.
---

# release qualification

Read the relevant deployment contract and AGENTS.md. Inventory the intended source and pre-existing changes; a dirty-tree run is development evidence, not a reproducible release. Run the configured engineering gate and record skips and external dependencies. Prepare docs/releases/<release-id>.md with source/build/configuration identities, automated and physical evidence, target, remaining gates and rollback. Inspect the actual target freshly before an authorized deployment. Deployment, boot cutover and physical acceptance are distinct stages; do not infer authorization from preparing the manifest. If checks fail, stop promotion and preserve evidence.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.

For the manual Android/iOS test pair, use validated public-only `.env.ios-test.local` and `scripts/prepare-ios-test.mjs`; keep server/provider secrets and Windows login sessions off the Mac. Both platforms currently package the shared `ios-test` assets: on Android sync these assets and use `scripts/build-android.ps1 -SkipWebBuild`, so the default native rebuild cannot replace them. Verify effective push disabled/commentary endpoint empty; SW069 forces these overrides in the public-only manual preparation validator. Match packaged/synced assets to the qualified source and record bundle IDs and artifact hashes. An unsigned simulator app is not an installable physical-iPhone build: freshly check signing identity and physical destination, then record compilation, installation and owner acceptance separately. Match the Mac host fingerprint to the verified handover when its IP changes; keep access files ignored. Do not enable push merely to prepare manual test builds.


Treat a separate sample/review-branch push, main promotion, public web/backend deployment and each native installation as distinct targets. Respect the latest owner rollout sequence in the current handover. A real-backend sample is not an isolated fake database; never advance user tournaments merely to qualify UI. Verify LAN servers deny private artifacts as well as environment/Git files.

Current routing: read docs/status.md and docs/project-memory.md for the active revision, host checkout and task; SW066/SW067 establish the integrated manual baseline, and docs/plans/SW-068-architecture-phone-readiness.md records the latest review and open findings. Windows paths in older handovers are workstation-specific. Manual Android/iOS reliability is the owner priority; camera, voice and push remain deferred. Preserve accounts/tables and distinguish automated verification, installation and complete-game acceptance.
