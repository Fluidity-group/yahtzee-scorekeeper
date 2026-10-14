# SW-017 Competition final-turn Yahtzee chain

13 October2026. Owner/reviewer: Codex development review; user product owner. Bug-investigation and product-change workflows. State: investigation/reproduction and local development; not deployed. Baseline current tournament candidate, deployed slice1 unchanged.

User tested three games successfully except Amber scored Yahtzee50 in her final category and game ended. Read-only Supabase latest three completed snapshots confirms latest Competition v1 last-category Yahtzee50 and status finished. Private snapshots stored only in ignored artifacts/sw017-final-chain/recent-games.json; no emails/account IDs in versioned records. Earlier first/closing-category ambiguity is resolved by this explicit case: first final-category Yahtzee qualifies, fill category first then bonus-only attempts. Initial final base-category allowance stays4; extra attempts3; success on any of3 renews; only full failed attempt ends player's chain, preserving other players' unfinished turns. Existing qualifying repeat bonus remains+100, scratched prior Yahtzee remains ineligible for repeats.

## Acceptance

- First final-category Yahtzee50 opens a chain instead of finishing; repeated final-turn Yahtzee uses Joker category/+100 then chain.
- Manual failures1/2 preserve attempt; failure3 ends player chain; success on roll1/2/3 adds100 and grantsfresh3.
- Server exact member/seat/revision/game/protocol guards prevent stale/duplicate/other-seat scoring. Explicit confirmed manual outcome UI, not recognition or metric-only logging.
- Persist version2 state/rules/attempts; ordinary rematches and tournaments preserve frozen rules. V1 saved/completed games and Standard/Accumulative/hardware remain unchanged.
- Old-client writes to v2 require update; capability RPC service-only/fail-closed. Combined web/native/backend gate and APK identity before rollout.

## Implementation decisions

New manual Competition sessions opt into rulesVersion2. Core gameRules returns frozen v1 or validated manual Competition2. finalChain seat/attempt plus turn phase final-bonus/manualRolls retain authoritative reported chronology. Client final-chain-roll command face null or1–6 is independent from optional metrics. Roll reporting uses normal score authority/persistence, never fabricated recognition. Completed historical games are not reopened or awarded unplayed attempts. V1 rematches retain frozen rules; start a new v2 Competition table/tournament to use the corrected contract.

Expert core/UI implementation isolated in worktrees; root owns server/capability/creation integration. Current test version untouched; deployment/physical gates separate.

## Evidence and remaining work

Pending final integration/qualification. Live inspection confirms three recent complete snapshots; none mutated. Core pre-fix reproduction retained in isolated evidence; exact checks/candidate identities to follow.

## Implementation, qualification and rollout

Completed local implementation and user-authorized prototype rollout. Core23 new tests cover three-roll chains, first-final50, repeats on1/2/3, long chain, third-failure only, unfinished opponents, ownership/immutable copies and v1 compatibility. HTTP3 tests cover version/seat/game/capability/retry/persistence/final-tournament behavior. UI8 tests cover confirmations, guest/pause/reconnect, create/start/write version and first-final50. Ordinary persistence finally now rerenders unlocked controls after saves; avoids keeping new bonus controls disabled.

Final Node24.19.0 gate575 tests/70 files, zero skips, web/native-web/backend builds and unchanged source passed. artifacts/engineering/2026-10-14T00-51-48-176Z-d80553b7/report.json; source SHA25671b688a9df19e39b86484ee703c363fd2ffadfa96135ceea3c534f6e0b9dd51f.23 disposable PostgreSQL16 checks passed including final-chain snapshot/chronology and service-only capability. Historical v1 reproduction recorded artifacts/sw017-final-chain/pre-fix-reproduction.json; live read-only snapshots confirmed same symptom.

Shared pulse UI adds finite score-save/turn/bonus animations, truthful full-house and final-chain celebrations, stronger results/readiness styling. Initial load/unchanged reconnect/corrections quiet; reduced motion suppresses effects. Native/web built UI locally exercised at390x844/768x1024: first final50 staysactive, failure1 leaves2, success nextroll adds100 and renews3. Outcome buttons44–78px; document no horizontal overflow. Local synthetic saves only; no hosted score manipulation. Preview stopped and viewport reset.

Pixel updated preserving data, installed hash1a276a9b52e18da0f6d91e2fe137e83bb208a9f74b5b7c6d71aca681b8508e1b/launcher verified. Supabase migrations+matching backend and web deployed/read back;9 rooms/10 games preserved. See docs/releases/SW-017-2026-10-13-tournaments-final-chain.md for identities/rollback/actual evidence. All3 prior physical test games remain archived, no retroactive bonus granted. Guest reload needed. New manual Competition games/tournaments choose2; old saved tables/rematches retain1. New two-device physical acceptance remains open.
