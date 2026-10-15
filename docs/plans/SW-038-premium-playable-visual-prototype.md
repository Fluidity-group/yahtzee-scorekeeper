# SW-038: premium clubhouse playable visual review

15 October 2026. Owner requests a playable home/menu and scoring interaction with custom graphics, animation, sound and Rachel, brought back for review. State: implemented and browser-verified for owner visual review, standalone local prototype only. Product-change/live-commentary/imagegen workflows. No production game, cloud record, Pixel APK or provider change.

## Scope and acceptance

- Original emerald/brass/plum clubhouse room art and fictional Rachel character portrait; tactile consistent SVG game iconography.
- Phone-first home modes, pregame voice choice, centered scoring dialog, named compact peer fields at right, settings drawer and bottom Undo.
- Working in-memory scoring/count/fixed/total entry, total update, Full House/Yahtzee signatures, quiet correction/Undo and reduced-motion handling.
- Gesture-started sound effects and approved actual Rachel recorded welcome, stop/mute/skip. Scoring quips are clearly caption previews; no invented dynamic spoken voice or live-generation performance claim.
- No live requests or saved games; prototype ratings/preferences remain in-memory. Retain the freshly cleared production record state.
- Browser verification at desktop and320/390px: home→setup→welcome→score, modal/keyboard, safe viewport, controls, sound/mute, reduced motion, Undo and scene navigation. Physical phone listening remains owner review.

## Asset and audio provenance

Built-in image generation creates `docs/reviews/sw038/assets/clubhouse-room.png` and transparent `rachel-character.png`; final prompts retained with assets in the accompanying asset manifest. Portrait is an original fictional design, not the actual voice actor's likeness. No additional provider synthesis.

`rachel-welcome.mp3` copies the existing explicitly approved fictional Alex/Sam smoke sample from ignored `artifacts/sw026-sprint3/rachel-live-welcome.mp3`. Source metadata confirms voiceTYKLc7ViOIGE13dSZYlK/Rachel and exact caption. This is a recorded sample, not live AI. Earlier Victor auditions are not substituted. Playback events drive portrait/wave animation; downloading is not hearing evidence.

## Boundaries and review

Implement in `docs/reviews/sw038/` plus a small review entry point. Preserve root pre-existing work. No engine/dependency rewrite for this one interaction; CSS/SVG/Canvas/Web Audio suffice to establish the art/motion direction. Do not connect optional uninstalled Figma/Product Design integrations. No expert delegation requested in this turn; primary agent handles prototype.

Implemented `docs/reviews/sw038/index.html`, `prototype.css`, `prototype.js` and original assets. Review URL `http://127.0.0.1:8482/reviews/sw038/` served by existing local review server. Existing server retained; no service replaced or published. Scoped branch `codex/sw038-premium-visual-prototype` in the established isolated checkout; root pre-existing changes preserved. CSS/SVG/Canvas/Web Audio; no added package, engine rewrite or native plugin.

Browser checks: home menu/mode setup; actual recorded welcome playing state; phone320×740 and390×844 without horizontal overflow; landscape844×390 centered modal capped354px/scrollable; centered390px Full House modal height523px/y160.5. Real UI selections verify Full House25→edit0→Undo25; Aces3 and manual29 accumulate57; upper30+25+20 unlock35bonus for110, Undo returns55; Yahtzee50 and new Full House25 save correctly. Numeric99 refused while9 remains, with an in-dialog alert; Escape closes/restores Chance button focus. Reduced-motion disables portrait/celebration and clean-language switch immediately rewrites current quip. Sound checkbox/header and recorded native HTML audio controls exercised; no browser warning/error logs in final inspected buffer. No physical sound/haptics or provider latency acceptance inferred.

Root ignored `artifacts/sw038` contains desktop/home/scoring and320/390phone screenshots, syntax/static report and review evidence. `node --check` passed. Static check69unique HTML IDs/no missing JS ID references, no live-network or persistence APIs in prototype JS; recorded audio SHA matches approved source byte-for-byte. Original room1536×1024RGB, Rachel1254×1254RGBA with alpha preserved. [Asset manifest and exact prompts](../reviews/sw038/assets/README.md). Score data/ratings/settings remain in memory; reload resets the demonstration. Existing cleared game records are not recreated.

This is design evidence, not integrated multiplayer or Pixel acceptance. Audio and fictional captions are independent and labeled; ratings do not claim adaptive learning. Physical touch/listening and owner art/motion judgment remain open. Current live scoring, multiplayer authority, SW036 installed APK and cloud configuration remain outside this review.
