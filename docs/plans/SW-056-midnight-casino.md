# SW-056: Midnight Casino redesign

23 October2026. Owner: Amber/Dan; engineering: Codex. Explicit user request to implement handoff, followed by phased-plan/begin-implementation instruction. Branch `codex/amber-ui-lab`, baseline28086ef. Development only; no main promotion/public deployment.

## Audit and changed direction

Read supplied START_HERE, CODEX_MASTER_BRIEF, PRODUCT_SPEC, ACCEPTANCE_TESTS and REFERENCE_INDEX. Inspected primary boards07_retro_budget_game/08_city_locations, original scorecard/results screenshots and recording contact sheet. START_HERE misnames the primary assets08/09; actual reference index and ZIP correctly use07/08. Original recordings/screenshots show the previous Playform UI, and current SW055 also has larger Home titles, trophy detail and past opponents. Preserve those additions.

Actual stack: vanilla JS/Vite/Capacitor, pure rules `src/game/core.js`/scoring/upper-progress, `src/prototype.js` view/controller, Dexie+journal persistence, Supabase authenticated room/revision commands and append-only archives. Hosted membership uses account UUID. Existing upper-progress already computes the legal five-dice ceiling separately from four-dice pace. Correction/Undo is appended history; rematch/tournament readiness is separate from turn rotation.

No existing persistent avatar/image-generation implementation or location metadata was found. Commentary providers are text/speech, not portrait generation. No generation credential/service may be assumed. The lab intentionally has no production backend credentials, so multi-device authority cannot be physically accepted here.

User's new retro casino/illustrated-avatar direction supersedes earlier no-casino/no-avatar visual decisions for this workstream. It does not authorize changing game rules, player counts, tournament limits or start readiness.

## Phased implementation

| Phase | Components and outcome | Verification / gates |
|---|---|---|
|0 · audit and plan|This feature map, references, precedence and decision ledger|Complete source/reference audit; source videos reviewed via supplied contact sheet rather than claimed full playback|
|1 · shared visual system|Original code-native city illustrations and character portraits; retro tokens/components across Home/setup/menu/scorecard/results/history; preserve routes and SW055 additions; settings/mute/preview controls|DOM/navigation/build and accessible contrast/readability review; no photographic/generated concept boards shipped as UI|
|2 · locations and lobby|Miami/Sydney/LasVegas/Tokyo selector; local design preference first, then validated host-selected room metadata persisted/synchronized; prominent roster portraits with real names and existing start controls|Roundtrip/capability/ownership and lobby tests; no gameplay effect|
|3 · accepted events|Ordinary positive acceptance silent; zero/upper bonus/first legal impossibility use one combined event; authoritative4s deadline blocks scoring; preserve automatic turn rotation and tournament readiness; corrections/Undo invalidate appropriately|Pure transition tests, server acceptance/retry/reconnect/client lock tests; two-device test remains required|
|4 · avatars|Persistent presets and four-style upload/preview/regenerate/confirm flow; account-owned portrait adapter, explicit original retention, private storage and honest provider fallback|No paid call until provider and costs authorized; no success claim for unavailable transformation; cross-device account persistence needs backend qualification|
|5 · results/history/audio/polish|Cohesive restyle of actual metrics, clear mute and bounded effects, reduced motion, narrow/desktop layouts|Full Node24 engineering gate on final candidate, native build as scoped, physical two-device QA and owner acceptance before promotion|

## Decision ledger and bounds

- Approved exact event copy: `LOSER LOSER LOSER LOSER`. Ordinary positive scores: no message/popup. Zero and bonus may use numeric0/+35 visual facts while final verbal/combined/victory/tie copy remains undecided; do not invent permanent jokes.
- Special events require server-owned accepted time/deadline and command guards, not only a decorative client timeout. Late-join/reconnect/skipping policy and repeated eligibility transitions after correction remain open; retain event identity/at-most-once processing and flag policy before shipping phase3.
- First four cities only. Additional cities and looping ambient audio are not approved. Host-selected immutable-at-creation room location is a proposed integration default; local phase1 preview does not claim a synchronized tournament setting.
- Four portrait style names/final rendering provider, costs, retention infrastructure and cross-device storage are unresolved. Preset fallback can work without a provider. A local photo preview is never described as an illustrated transformation.
- Visual/code choices are reviewable in the lab; no independent design, licensing, security or device acceptance is implied. No copying of GTA artwork. SVG illustration is original and suits the graphic style without new image-provider costs.

## Acceptance / evidence

Phase1 implemented for lab review: shared retro skin across existing DOM, original vector city/character art, persistent device-only city/preset/mute preferences, four-city selector, four-preset confirmation, private upload preview/four style choices with disabled/honest generator fallback, and existing route access. Explicit light/dark choice survives; only an unset device receives the new dark default. Existing SW055 titles/trophies/people retained. No names are replaced by character labels. Original photos stay transient in memory and object URLs are revoked on close; no photo is uploaded, retained or represented as a generated portrait. Sound is muted by default and starts only after an explicit enable interaction; no loops.

Ordinary accepted positive scores no longer display saved-score messages or category pulse/emblems. Recovery/error notices remain. Existing upper-bonus and finish presentation is retained pending phase3; synchronized zero/bonus/impossibility announcement state and server input fences are NOT yet implemented. No client-only lock is presented as multiplayer synchronization.

30 focused checks passed (`artifacts/sw056/phase1-checks.json`): distinct original assets, validated preference persistence/theme preservation, full Home-to-location/avatar/settings/local-game navigation, four photo-style controls and unavailable-provider messaging, oversize photo rejection, local preview cleanup, score/Undo and existing launch contracts. The former positive-Yahtzee pulse assertion was deliberately updated to verify silent acceptance while retaining actual Undo coverage. An initial cleanup test exposed that a mocked close did not fire native close events; explicit close now clears the private preview immediately as well as through the dialog close listener.

Stable Node24 full engineering gate passed:1,163 tests passed,13 optional camera skips; web/PWA, native web, iOS-test web, commentary-edge and room-edge builds passed. Evidence: `artifacts/engineering/2026-10-23T23-55-44-613Z-6bcacab3/report.json`. Source was stable during the passing run; this is dirty development-source evidence, followed by record-only documentation updates and a scoped checkpoint commit. The first gate passed all checks but failed source stability because generated server bundles normalized CRLF to LF; both were proven text-identical after newline normalization and the gate rerun passed. No backend semantic change or deployment. Live LAN module/style responses200; visual/native acceptance remains open. Remaining phases2–5 and unresolved ledger above remain open; do not treat this visual checkpoint as the whole synchronized/portrait feature release. Browser observation previously denied, so no alternate browser automation used. Amber visual/readability/native acceptance remains pending. Source packet preserved under ignored `artifacts/sw056/handoff`; no credentials extracted or copied.
