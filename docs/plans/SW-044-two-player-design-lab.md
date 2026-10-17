# SW-044: lively two-player design lab and native iOS testing

17 October 2026. Product owner: Keith. Architect/designer: Codex.
State: concept work; no replacement of the working game, native build or deployment authorised by this document.
Baseline: SW042 working application; SW043 architecture/review direction liked by owner. Mac availability confirmed by owner this session; actual machine/Xcode/signing access not yet inspected.

## Revised brief — takes precedence over SW043 scope

Focus on the best two-player test experience for Keith on Android and Amber on iOS, with either player organising the same manual tournament. Continue growing through actual playtests. Commercial release, monetisation, store marketing and commercial qualification are outside the current work. Defer AI voice and its iOS implementation entirely. Preserve the existing Android commentary implementation/settings rather than removing it or changing the current installed build.

Keep the shared Capacitor + web UI + existing authoritative game backend direction. Native iOS packaging is the first technical task on the confirmed Mac. It does not depend on introducing React or a game engine. Add the shared component foundation incrementally once the chosen interaction is proven. Use SVG/CSS/Motion for charts/transitions; PixiJS remains an optional effects tool, not a prerequisite or a wholesale canvas rewrite.

## Design concepts

The lab at docs/reviews/sw044/index.html compares three deliberately different treatments of the same fictional two-player situation:

- **Rally:** light editorial scorebook, cobalt/coral, crisp court markings and a points transfer from frame to total. Best starting point for daily scoring.
- **Night Match:** matte ink, ice blue and apricot, compact match scoreboard, contrasting race lanes and a clear gap indicator. A focused evening/game-night treatment, without neon glow or casino decoration.
- **Playform:** warm paper, punchy lilac/orange, oversized geometric marks and a satisfying bonus assembly. More expressive visual play, with readable score fields and restrained typography.

The common behaviour is the product: immediate touch feedback, centred score modal, named small opponent, bonus target, latest-frame Undo, accurate tournament stakes. None includes AI branding, avatars, currency or paid content. Sound means brief optional local game effects, never speech; off initially. Reduced motion must preserve all score/status information. Themes do not determine player authority.

All lab figures are fictional. Initial upper subtotal39 is Aces3, Twos6, Threes3, Fours12, Fives15; Sixes open. Lower subtotal121 gives total160. Opponent total208. Four Sixes adds24, secures35 bonus at63, total219 and lead11; three Sixes adds18, upper57, total178, still30 behind. Scratch records0 and remains distinct from open+. These local animations are demonstrations, not accepted server commands. Production celebrates only an accepted command and never waits for sound/motion before scoring.

Tournament is initially Keith6, Amber3, nine completed decisive games of12. Three outright Amber wins produce a6–6 shared wins title; a Keith win or a shared-win draw next secures Keith’s wins title. Points remain a separate race. Results buttons simulate completed games; adding an individual score must never automatically award a tournament win.

## The easiest test route

1. **Now: select the interaction direction.** Review the three concepts in a normal browser and at phone width. The lab is standalone and has no accounts, backend connection, provider calls or persistent game writes. Pick a base plus favourite moments from the others rather than implementing three separate products.
2. **First native iOS slice on the Mac.** Inspect Mac/Xcode/device access and signing, add the matching Capacitor iOS target to a scoped checkout, package the existing manual game, test same-account invitation/return and Android↔iOS hosting. Use direct Xcode installation for the first development device; use TestFlight if it makes subsequent delivery easier with the available account. Signing required for device installation is a technical prerequisite, not a commercial-release project. No AI voice, BLE or camera parity in this slice.
3. **One redesigned scoring slice on both devices.** Integrate the selected scorecard, centred entry, bonus feedback and last-turn Undo through shared components. Keep current rules, receipts, revisions, accounts and saved tournament. Build Android APK and iOS from the same shared revision; retain Safari/Home Screen web as the fast preview/fallback.
4. **Tournament drama.** Add deterministic outcome scenarios, short results transitions, race timeline, lead crossings and truthful score-entry replay. Show compact stakes during play; deeper analytics in a drawer. Pair each animated chart with exact numbers and quiet alternative.
5. **Repeat and tune through play.** Keep a visible test build ID, easy return to the current table, platform diagnostics and a small read-only event/timing view. Replay synthetic scenarios in a separate development lab. Never put test outcomes into the real tournament. Compare touch effort, readable rows, animation frame time and scoring recovery on the two physical phones. No commercial submission gate.

Do not carry the old SW043 8–12-week estimate as a commitment for this narrower target. Re-estimate after the Mac spike and design selection. First native manual-game packaging and one polished scoring slice should precede a broad UI migration. Physical device access and signing are the remaining iOS installation dependencies; Mac ownership alone does not prove a successful build.

## Acceptance / evidence

| Requirement | Review / verification | State |
|---|---|---|
| Lively but readable | Three concepts, visible score/bonus/lead change, own-first fields and compact peer | Design lab |
| Touch scoring | Centred modal,44px targets, scratch versus open, latest-frame Undo, no input lock during effects | Browser verification pending |
| Honest stakes |6–3 comeback, shared draws/clinch, points separate, score does not imply game winner | Browser verification pending |
| Quiet mode | Reduced motion, local sound opt-in, no voice/provider calls | Browser verification pending |
| Two native testers | Same account/seat, either platform hosts; no data reset; two identified native builds | Not built in this task |

UI-motion examples are prototypes, not measured production frame-rate promises. Risks: excessive effects obscure scoring; use short hierarchical sequences and no continuous decoration. Animations may be interrupted by another input; state and latest command must remain correct. Haptics require a platform adapter and physical testing; browser sound is not proof of native haptics. Keep the known-good game available while the design is refined.

## Design-lab checks — 17 October

Browser: all three concepts at 320px without page overflow; full-width preview 390px and 440px checked. Centred390px score dialog 352px wide, height 416px, top 214px in 844px viewport. Score targets 44px high. Three Sixes→178; scratch0 distinguished from open+; four Sixes→219 with upper63/63/bonus35/lead11 in every concept. Night bonus Undo→160; Playform immediate Undo during effects→160; reduced motion keeps219 exact. Accepted numbers now stay exact throughout settling animation, avoiding an intermediate losing number alongside a leading status. Race tested three Amber wins→6–6; tied game→Keith clinches; inline chip updates after closing6–4. No console errors in inspected buffer.

Evidence: artifacts/sw044/three-concepts.png, playform-phone-390.png and browser-check.json. JavaScript syntax check passed. Engineering inventory check recorded separately; no full production test/build gate required for this documents-only independent lab. Subjective visual/sound/haptic and physical native iOS/Android acceptance remain open. No live records were accessed or written.
