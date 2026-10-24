# SW-060: Highest score and most recorded Yahtzees

23 October 2026. Requester: Amber. Developer/reviewer: Codex self-review. Source baseline 8f4f840, codex/amber-ui-lab. Software only, no release/deployment.

## Requirements and design

Personal Best section in trophy dialog with two independent records: highest personal final score and most recorded Yahtzees in one completed game. Same UUID-owned, deduplicated completed online history as SW059; exact rule contracts/solo status kept separate. Each record includes its own date. No local history is implied and unfinished games are excluded. Pure computeTotals supplies bonus-inclusive score.

Manual input does not record every physical roll. Explicitly label “Most recorded Yahtzees in one game” and explain the evidence boundary, as communicated to Amber. Count saved matching-dice roll observations with correction/exclusion/Undo applied; explicit manual score/bonus/final-chain reports contribute once per reported turn, without duplicating an observed Yahtzee. Never divide bonus points to infer a count, since weighted rules differ. No history means unknown, rendered as a dash/Not recorded; a known zero remains zero. The literal all-physical-roll record remains unavailable for unrecorded manual play.

Gold-accent two-reel panel matches trophy cabinet and existing themes. No new audio, account writes, backend schema or changes to scoring/seat authority. Existing lab fixtures with score sheets but no roll events intentionally show Not recorded, retaining the sample disclaimer.

## Acceptance and verification

| Requirement | Method | Result |
|---|---|---|
| Separate highest-score and most-Yahtzee games, owner seat and deduplication | Account-summary regression | Passed |
| Dice/manual counts, no double count, weighted/final-chain/Undo/correct/exclude semantics | Pure helper tests | Passed |
| Unknown versus recorded zero and honest lab display | Helper and DOM checks | Passed |
| Existing trophy/Razzie and account flows preserved | Focused checks and engineering gate | Passed |

Risks: incomplete manual observation is disclosed rather than treated as actual physical count. Visual mobile/large-text/light-dark acceptance remains owner review; browser automation was not used. Node24 gate passed:1,184 tests/13 optional camera skips, all configured builds and source stability. Evidence artifacts/engineering/2026-10-24T04-14-26-701Z-56490387/report.json.20 focused checks, lab build and LAN/HMR passed. Only completion records changed after verification. Source/DOM tests do not establish touch geometry.
