# SW-043: cross-platform game experience and design direction

17 October 2026. Owner: Keith/product owner. Architect and development reviewer: Codex.
State: researched proposal and interactive design study; no production UI replacement, iOS build or deployment.
Baseline: SW042, qualified code 9b4f19a, documentation acd6db7. Owner reports last build worked well. That report is user acceptance evidence for that playtest, not exhaustive platform qualification.

## Scope update — 17 October 2026

Owner likes the design territory and requests livelier concepts. AI voice and commercial-release work are deferred; optimise for two-player Android/iOS testing on an available Mac. The narrower current plan is [SW044](SW-044-two-player-design-lab.md); the voice/commercial scope and broad estimates below are historical proposal material, not the current delivery target.

## Product direction

Create an installed iOS and Android game with web participation, equal manual-game hosting, one authoritative multiplayer service, and a professional, lively interface. Preserve existing tournaments, accounts, frozen aliases, settings and scoring rules. Remove illustrated commentators, AI branding, character references and avatars from the new presentation. No casino decoration, felt, gold trim, neon glow, loot/reward currency or slot-machine motion. Voice commentary remains optional audio, without a character-led UI; this is not authorization to delete profiles/history or rewrite provider behaviour.

The design territory is a contemporary sports scorebook: ink, warm white, cobalt and coral; confident typography, fine grid lines, generous touch targets, precise charts. Fun comes from progress, rivalry and well-timed movement. It should feel like a designed application rather than a webpage of panels or a themed game skin. Name/brand remains undecided; “Matchday” in the study is a direction label, not a rename decision.

## Architecture recommendation

Use Capacitor for installed iOS/Android, Vite + React + TypeScript for the new presentation, semantic HTML/CSS and SVG for scorecards/charts, Motion for selected transitions. Retain the existing pure JS rules and multiplayer protocol behind typed adapters; migrate those modules only where useful, not as a blanket rewrite. Retain the current Supabase Auth/room/command/history services and local durable storage. Keep web/PWA as a full manual-game client.

Graphics engine choice: PixiJS as an optional, bounded 2D effects surface if the first performance spike shows an actual need. Start the scorecard and tournament graphics with SVG and Motion. Do not render the entire application in a canvas or introduce a permanent render loop for an idle scorecard. WebGL is the initial accelerated baseline; WebGPU is not a device requirement. React does not itself improve graphics; it provides maintainable component/state boundaries for the redesign.

This is an installed native shell with a shared web-rendered UI, not a SwiftUI UI or a fully native game engine. It is a deliberate fit for a touch scorecard, rich statistics, physical dice and turn-based multiplayer. Native Swift/Kotlin adapters own audio, app lifecycle, safe areas, deep links, haptics and later hardware access. No new engine can fix slow server speech generation or multiplayer races by itself.

| Option | Fit and cost in this project | Decision |
|---|---|---|
| Capacitor + React/TS + SVG/Motion; optional PixiJS | Keeps JS rules, browser participation, existing native Android investment and backend; new UI can coexist during migration | Recommended |
| Phaser + Capacitor | Sound choice for a scene-based 2D videogame; adds scene/input/render lifecycle where most of our UI is a scorecard, text and charts | Reconsider for a later virtual-dice/minigame surface; not the app shell |
| Flutter + Flame | Credible alternative for a greenfield app/game; would rebuild UI and bridge/port existing client logic, audio and storage | Runner-up if we deliberately fund a client rewrite |
| React Native + Skia/Reanimated | Strong native UI route; much existing DOM/SVG UI needs replacement and web compatibility needs deliberate work | Not enough benefit to justify migration now |
| Godot / Unity | Appropriate for a 3D table, physics-led virtual dice or real-time world; substantially different client/runtime and web tradeoffs | Defer unless the product changes to that kind of game |
| Separate SwiftUI and Android native apps | Excellent platform-specific control, two presentation implementations and larger parity burden | Do not choose for the current team/product |

## iOS work and equal hosting

There is no iOS project or custom Swift commentary plugin in the inspected qualified checkout. Android has a custom streaming LiveCommentary plugin and camera plugin; several UI/voice entry paths explicitly check Android. Adding an iOS target alone will not supply feature parity.

1. Establish Mac/Xcode build access, Apple signing identity/developer membership for TestFlight, app bundle IDs and a reproducible signed build pipeline. Current Capacitor 8 documentation requires Xcode 26+. Windows remains useful for shared code, Android and web; it cannot run local Xcode builds.
2. Add the pinned matching Capacitor iOS runtime. Configure safe areas, launch, storage, email/identity redirects, Universal Links and invitation return. Verify existing account opens the same room/seat; installed iOS may require sign-in independently of Safari.
3. Make hosting a capability of the authenticated account, not “an Android device.” iPhone/Android/web can create/join/start/pause/resume manual tournaments under the same server ownership checks. The server hosts authoritative state; a phone is the organiser/controller. Closing the organiser app must not destroy the table. Transferring organiser authority is separate future work.
4. Implement a Swift audio adapter to the existing claim/stop/ack contract. Prove authenticated streaming transport, interruption, mute/silent-switch policy, Bluetooth route changes, background/foreground, stale welcome cancellation, Undo invalidation and single-speaker ownership. Start with foreground playback; do not promise background audio without a defined product requirement. Browser voice remains an explicit capability/autoplay track, not assumed parity.
5. BLE/camera are separate hardware integration gates. Manual hosting parity must not wait for them. An iPhone host can organise a manual game even when an Android owns an available peripheral. Peripheral-gateway delegation, if desired, needs its own authority design; do not imply that is implemented.

Estimated effort, not a quote: a focused iOS risk spike 3–5 engineer-days; a current-UI manual multiplayer TestFlight beta 10–15 engineer-days once signing/build access is ready; voice parity another 5–10 engineer-days. These estimates overlap parts of the roadmap below and must not be added blindly. Hardware, Apple review turnaround, account enrolment, commercial billing and store artwork are excluded. No Mac/account access is established by this proposal and no purchase is authorised.

## Interaction and visual design

- Home: resume the current rivalry first; four clear game choices below. Put preferences in an accessible menu, not a wall of setup fields. Commentary is a compact optional sound preference, with no face or character biography.
- Play: tiny tournament context; own scorecard dominates, compact named opponent alongside. Keep the SW042 horizontal upper indicators and improve their visual resolution. Distinguish open, scored and scratched with shape/labels as well as colour. Upper/lower sections, bonus chase and latest-score Undo stay intact. Scoring remains a centred touch dialog.
- Tournament: one compact story chip on the scorecard when consequential; full animated race and history in a drawer/page. Do not consume the scoring viewport with a dashboard. Completed games show Continue/Ready first, statistics below.
- Results: progress line of 12 games, wins race and cumulative-points race clearly separated, lead changes and streaks on the timeline. Tap a moment for exact figures and provenance. No invented win probability, physical dice odds or “thinking time” from score timestamps.
- Presentation events: ordinary score180–250ms settle; total update250–400ms; bonus threshold450–700ms; leader change300–500ms; tournament clinch up to1.2s, dismissible and never blocking the next action. These are proposed motion budgets, subject to device measurement. No continuous shaking/pulsing or repeating confetti. Sound/haptics optional, reduced-motion static alternative and immediate screen-reader outcome.
- Timing: acknowledge tap immediately, show pending state, celebrate only the accepted score. Command retries do not duplicate effects. On correction/Undo recompute charts and withdraw stale claims; historical heard commentary remains honest. Voice preparation/playback never holds a scoring control.

## Exact tournament excitement

For two players, nine completed decisive games with wins Keith6, Amber 3 and three games remaining:
- Initial: “Amber needs all three remaining wins to draw 6–6. Keith needs one win to secure the wins title.”
- Amber wins next:6–4, two remaining; “Two more wins to draw.”
- Keith wins next:7–3, two remaining; wins title secured. Continue all scheduled games unless an explicit future early-finish rule is approved.
- Next game is tied under existing shared-win rules:7–4, two remaining. Keith also secures the wins title because Amber can reach only6.
- Amber wins all three outright:6–6, shared wins title. Cumulative points can still have a different winner; no automatic tiebreak or sudden death.

Compute this in a pure deterministic tournament-insight module from accepted completed-game results, active rules, remaining schedule and shared tied wins. Finished-category counts or provisional current-game totals do not become a tournament win. Unknown/incomplete archive data yields “updating” rather than a confident scenario. For3–8 players initially show verified remaining opportunities and leaders; publish elimination/clinch claims only after mathematically exact multi-player handling is tested. Suppress hidden unfinished aggregates. A timestamp chart is entry cadence, never roll speed or physical decision time.

Other useful stories: lead changes, largest completed-game comeback, best upper section, secured bonus, late chance to draw, best-game pace and personal records. Declare the baseline, denominator and minimum sample for any trend. Real seven-game data can validate calculations read-only; the design study uses fictional data and does not label it as an actual tournament.

## Six delivery stages

Planning range: six 1–2-week sprints; allow roughly 8–12 calendar weeks for a small team with design, shared-client and native/backend capability and prompt owner feedback. Capacity and iOS spike results can change this. The iOS beta can arrive before the full visual redesign; App Store approval is not included or guaranteed.

| Stage | Work | Reviewable exit |
|---|---|---|
| 1. Prove the direction | Two-phone design study; typography, density, motion/sound palette; iOS signed risk spike; profile current frame/input/audio performance | Owner approves actual phone interaction; Mac/signing/audio risks measured; architecture confirmed or revisited |
| 2. Establish the shared UI | React/TS shell behind a controlled route; typed room/platform adapters; tokens and accessible components; persistence compatibility; native safe areas | iOS/Android/web open the same synthetic room; existing production experience remains available |
| 3. Deliver one excellent turn | Full scorecard, centred entry, scratch, bonus indicators, last-turn Undo, accepted-event animation and offline local flow | Mixed native/browser scoring with exactly-once effects; no lost/duplicate scores or commentary dependency |
| 4. Make tournaments alive | Pure scenarios, wins/points races, game timeline, streak/record calculations, animated replay and data drilldown | All two-player edge cases including tied games/Undo/final chains tested; honest small-sample analytics |
| 5. Complete platform parity | Create/join/host from either native platform; invite/auth return; iOS voice; lifecycle/reconnect/interruption and PWA upgrade journeys | Keith hosts Android/Amber joins iOS, then Amber hosts iOS/Keith joins Android; web participates; voice optional and reliable |
| 6. Qualify and refine | Physical two-phone usability, performance/battery, accessibility/reduced motion, repeated tournament sessions, error diagnostics, rollback; signed beta distribution | Identified Android APK + iOS TestFlight build + web release; owner acceptance and remaining store gates recorded |

Implementation roles proposed for later authorisation: UI/design owner; native iOS/audio owner; multiplayer/insights owner; lead integration/qualification. Independent reviews where needed are not established by self-review. No agents are dispatched by this plan.

## Acceptance and execution bounds

| Requirement | Verification / gate | State |
|---|---|---|
| R1 Cross-platform authority | Physical Android→iOS and iOS→Android manual hosting, Safari participation, wrong-seat/revision rejection, resume same room/account | Proposed |
| R2 Score integrity | Reuse regression suite; new adapter contracts, retry/idempotency, correction/Undo, final chains and hidden totals | Proposed |
| R3 Visual quality | Owner phone review of typography, density, motion and sound; no avatars/casino cues; legible compact opponent | Design study |
| R4 Honest insights | Exact6–3/remaining3 scenarios, draws/shared winners, points separate, incomplete history, Undo invalidation | Demo scenarios; production module pending |
| R5 Performance | Proposed target 60fps transitions on the two named phones, frame-time p95 ≤20ms for short sampled animations, local pressed feedback ≤100ms; report frame drops/long tasks and do not equate animation duration with server latency | Unmeasured target |
| R6 Native lifecycle | Audio interruption/background/route; safe areas and keyboard; invitation/sign-in return; foreground reconnect; installed upgrades preserve storage | Not implemented on iOS |
| R7 Accessibility | Dynamic text, 44px minimum touch, contrast/non-colour cues, screen reader, motion/sound controls | Production gate pending |

Risks: iOS build/signing access and audio transport are the largest near-term unknowns; isolate in stage1. UI migration can regress state; keep existing core authoritative and adapters small. Excess effects can obscure play; bounded timeline, prioritised events and no input interlocks. New scenario calculations can misstate winners; pure tests, shared-win cases and full recalculation on Undo. Native/web storage and auth differ; account identity restores cloud rooms, local-only games need explicit import rather than promised automatic transfer. Store submission requires privacy, sign-in/account management and content review; graphics alone is not store readiness.

## Research (official sources, accessed 17 October2026)

- Capacitor iOS and current build requirements: https://capacitorjs.com/docs/ios
- Capacitor game support: https://capacitorjs.com/docs/guides/games
- PixiJS 2D renderer: https://pixijs.com/8.x/guides/getting-started/intro
- Motion React: https://motion.dev/docs/react
- Phaser scope: https://docs.phaser.io/phaser/getting-started/what-is-phaser
- Flutter games toolkit: https://docs.flutter.dev/resources/games-toolkit
- React Native platform boundaries: https://reactnative.dev/docs/platform-specific-code.html
- Godot web export constraints: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- Apple signing/distribution: https://developer.apple.com/programs/whats-included/ and https://developer.apple.com/testflight/

The architecture/effort/design choices above are Codex engineering judgments, not vendor performance promises. Research and a standalone visual study do not establish deployed feature parity. Next decision: approve/refine visual territory and authorise stage1 only; no production replacement or store submission in this task.

## Design-study verification

17 October: browser reviewed at1280px and full-width phone preview320/390/440px, no page overflow; smallest score target97px wide at320px (height44px). Centred score dialog fits390px. Demo scores115→130 after Fives15, then183 after Sixes18 reaches upper63 plus35 bonus. Latest-frame Undo returns115 after undoing the initial Fives entry. Three Amber wins produce6–6 shared title; Keith win and tied-game outcomes each secure Keith’s title. Reduced-motion preference applies and console error buffer empty. HTML fixture corrected during review to use legal four-dice counts; current Fours12 is three dice. Evidence artifacts/sw043/; engineering inventory inspection passed. No full production gate was run for this documents-only proposal; no production source/build/provider/deployment changed.
