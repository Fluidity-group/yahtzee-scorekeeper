# Proposed: versioned game engine and accepted-event triggers

Date: 30 October 2026. Author: Codex. Product decision owner: Dan.
Status: proposed design; not implementation or approval of new gameplay rules.
Scope and acceptance: [SW071 sprint design](../plans/SW-071-versioned-engine-stabilisation-sprint.md).

## Context

The current game has a useful pure core and authoritative hosted room layer, but identical saved Competition v2 data can acquire different final-category behavior when the interpreter changes. Current visual/custom-trigger paths are split across legacy and prototype applications. The previous Pixel package also contains UI/assets absent from the selected Git release. A complete baseline and approved rule examples are prerequisites to extraction.

## Proposed decision

Retain the current stack. Extract one deterministic engine used by local and server adapters. Distinguish rule profile, play arrangement, tournament structure and input source. Pin immutable rule-pack identity/hash plus versioned policies/interpreter and state/event schemas; a configuration snapshot/hash alone is insufficient. New behavior receives a new identity, while existing supported profiles retain their exact semantics.

Persist accepted transitions before evaluating presentation effects. Define stable accepted-event contracts, a pure declarative trigger evaluator and bounded effect plans. Game-changing rules resolve within the authoritative transition; presentation actions never alter points, ownership or turns. Shared trigger definitions are versioned, while device rendering/accessibility preferences remain local. Account for retries, audience disclosure, expiry, correction and Undo explicitly; do not promise exactly-once audible delivery.

Use isolated working folders per developer/task, interface-first integration and independently identified release builds/assets. Restore missing UI from recovered source rather than treating compiled APK bundles as maintainable source. Keep local avatar restoration distinct from future account-synchronised portraits.

## Alternatives and tradeoffs

- Continuing edits in prototype.js is initially cheap but perpetuates duplicated conditions and collaboration conflicts.
- A full boardgame.io or native engine rewrite adds migration/authority/storage risk; reuse relevant state/move patterns without adopting the framework now.
- A general scripting/rule language creates uncontrolled combinations and harder validation; start with allowlisted policies and predicates.
- Full event-sourced storage replacement is unnecessary for stabilisation. Retain accepted snapshots/audit and prove canonical replay with fixtures before expanding it.

This adds contract/version discipline and compatibility fixtures. It avoids building new fun features during stabilisation, but provides a testable extension path: add a synthetic rule variant and celebration without editing central orchestration.

## Decision gates

Dan must approve rule examples and the visual baseline. Existing ambiguous v2 games require an explicit compatibility decision. Developers/personnel and committed sprint slice remain unassigned. Nothing in this document authorizes a backend deployment, phone installation, data reset, paid provider call or CI/protection change.
