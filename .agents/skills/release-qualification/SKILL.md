---
name: release-qualification
description: Prepare and qualify an identified product release with scoped test evidence, deployment manifest and rollback.
---

# release qualification

Read the relevant deployment contract and AGENTS.md. Inventory the intended source and pre-existing changes; a dirty-tree run is development evidence, not a reproducible release. Run the configured engineering gate and record skips and external dependencies. Prepare docs/releases/<release-id>.md with source/build/configuration identities, automated and physical evidence, target, remaining gates and rollback. Inspect the actual target freshly before an authorized deployment. Deployment, boot cutover and physical acceptance are distinct stages; do not infer authorization from preparing the manifest. If checks fail, stop promotion and preserve evidence.

See docs/engineering-workflow.md in the active repository for commands and evidence conventions. Apply this workflow only to the user's requested scope.

