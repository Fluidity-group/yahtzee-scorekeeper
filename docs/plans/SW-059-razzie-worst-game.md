# SW-059: Razzie worst-game section

23 October 2026. Requester: Amber. Developer/reviewer: Codex self-review. Baseline c67b38b on codex/amber-ui-lab. Software only; no release or deployment.

## Purpose, design and boundaries

Add a playful worst-game section below trophy statistics using existing account-owned completed online history. First-version interpretation of “worst game”: lowest personal final score, labelled explicitly in the UI and communicated to Amber. Largest loss/last-place count are possible future alternatives, not implemented. Keep exact scoring rule contracts and solo/multiplayer histories separate. Reuse the pure scoring total including earned bonuses; actual signed-in UUID selects the seat. Zero is a real result. Deduplicate game IDs through the existing summary; report tied lowest-score game count and latest tied date. No additional server reads, shared-state mutation, schema, rank or award changes. Local-only history is outside this account source and explicitly excluded in the section copy.

Pink-accent Razzie panel matches casino/noir tokens. Real low score, rules/version/date and ties shown; empty history has a friendly empty state, unavailable account never renders a fabricated zero. Sample profile remains labelled and uses the same summarizer; sample history is fictional. No audio or automatic messaging.

## Acceptance and risks

| Requirement | Verification | Result |
|---|---|---|
| Correct personal lowest score and zero/ties | Aggregation test with duplicate games, active game, foreign account and distinct rule versions | Passed |
| Preserve bonus-inclusive totals and correct seat | Separate own/opponent and bonus fixture | Passed |
| Honest readable display | DOM fixture with zero, date, tie count, unsafe rule label, empty and error states | Passed |
| Existing trophies/people/authority intact | Focused account tests then configured gate | Passed |

Risk: “worst” definition is an implementation assumption awaiting owner review, not a new scoring rule. Modes stay separate to avoid misleading comparisons. Real device/light-dark geometry remains manual acceptance; source/DOM/HTTP tests do not establish visual or touch quality.

## Completion evidence

Implemented and automatically verified.19 focused checks passed; full Node24 gate passed with1,178 tests/13 optional camera skips, all configured builds and source stability. Evidence: artifacts/engineering/2026-10-24T04-10-50-565Z-34830750/report.json. Isolated lab build and LAN/HMR passed. Only completion records changed after gate; application source unchanged. No public promotion, native device install or physical acceptance claimed.
