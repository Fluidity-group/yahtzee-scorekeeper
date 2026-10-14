# Yahtzee Scorekeeper

Engineering entry point: [AGENTS.md](AGENTS.md), [current status](docs/status.md),
and [repeatable verification](docs/engineering-workflow.md). Older milestone
statements below are historical; current acceptance and deployment gates live in
the status record and linked domain evidence.

A Yahtzee scorekeeper PWA evolving into an Android-first, connected-dice game.
See [the current prototype specification](docs/prototype-development-spec.md). The original
two-player implementation and its specification remain available for legacy saves.

## Current development milestone

The default Clubhouse prototype supports 1–8 local test players, Standard/Competition/
Accumulative rules, explicit turns, manual scoring, simulated dice, corrections, per-game
roll insights, history and JSON export. Phone and tablet layouts use the midnight/teal theme
with a light option. QR multiplayer and account screens now have a Supabase backend
implementation deployed for testing; two-phone acceptance testing is pending. See
[multiplayer setup](docs/multiplayer-development.md). Bluetooth and new commentary
are not connected yet.

New games use a separate database and a synchronous recovery journal before IndexedDB commits.
Use one tab per game during this local prototype. The original game, commentary and statistics
are preserved at `?legacy=1`, with their original saving behaviour. No old records are migrated.
See [the testing guide](docs/local-prototype-testing.md) for the next device check.

An Android development shell is now available. Build a debug APK with
`scripts/build-android.ps1` from PowerShell. See [Android development](docs/android-development.md)
for project-local Java/SDK setup and Pixel testing. Bluetooth integration is not included.

## Run (WSL, Node 22)

```bash
cd "/mnt/c/Codex/Yahtzee Game"
export PATH="/home/fluidity/.nvm/versions/node/v22.22.1/bin:$PATH"
npm ci
CHOKIDAR_USEPOLLING=true npm run dev -- --host 127.0.0.1 # http://localhost:8473
npm run build    # production build into dist/ (PWA service worker + manifest)
npm run preview  # serve the built app
npm test         # Vitest (from phase 2 on)
npm run icons    # regenerate PWA icons in public/icons/
```

The Node path above is this workstation's existing installation; use your own Node 22 path
elsewhere. Polling lets Vite detect Windows edits in this WSL checkout. These settings apply
only to the current shell/process; do not change global Node defaults or stop unrelated
Claude Code sessions. Preview uses port 8474. Check port ownership before stopping a server.

### Responsive UI checks

- Test widths 360, 390, 430, 768, 1024 and 1280px, including short landscape windows.
- Start a game, record upper/fixed/sum scores, and confirm totals and turn highlighting.
- Resize with an unfinished numeric entry; its value should remain intact.
- Close a scoring panel using × or Escape; the score must not change and keyboard focus
  should return to the control that opened it.
- Check Settings, Stats, and both scorecard sections remain reachable on a phone.
- Physical phone/tablet feedback is still required before the next implementation slice.

## Testing on your phone (WSL2 networking)

WSL2 has its own virtual IP, so the dev server's `Network:` URL is usually **not** reachable from
your phone directly. Easiest paths:

- **Windows port proxy (one-time, in an elevated Windows PowerShell):**
  ```powershell
  netsh interface portproxy add v4tov4 listenport=8473 listenaddress=0.0.0.0 connectport=8473 connectaddress=(wsl hostname -I).Trim()
  ```
  First restart this project's dev server with `--host 0.0.0.0` instead of `--host 127.0.0.1`.
  Then open `http://<your-windows-LAN-ip>:8473/` on your phone (same Wi-Fi). Allow the port
  through Windows Firewall if prompted.
- Or build and `npm run preview -- --host`, or push to any static host for a quick install test.

For installation/service-worker testing, use an HTTPS deployment (ordinary LAN HTTP is
only a UI preview). To **install** (Add to Home Screen): Android Chrome shows an install prompt / menu item;
iOS Safari → Share → *Add to Home Screen* (works, with iOS's usual PWA quirks).

## Status — phased build (see spec §11)

- [x] **Phase 1** — Scaffold (Vite + vite-plugin-pwa) and port the v3 mockup UI with in-memory state.
- [x] **Phase 2** — Pure `categories`/`scoring`/`rules`, Vitest + jsdom tests (24), UI wired to them.
      Corrected house rules: derived turn state, per-player `makeupOwed` counter, +100 gated on
      Yahtzee=50, edit-doesn't-pass-turn, game-over + winner.
- [x] **Juice A–E** — active-column highlight, who-goes-first (coin flip), canvas-confetti tiers +
      flavour toasts, file-based `SoundEngine` (synth fallback), Amber-only spoken pep talks.
- [x] **AI pep talks (G, optional)** — bring-your-own Anthropic key in ⚙️ Settings generates Amber's
      lines live via `claude-haiku-4-5`; key stays in this device's `localStorage`, sent only to
      api.anthropic.com. Falls back seamlessly to the built-in lines with no key / offline / on error.
- [x] **ElevenLabs voice + escalation (H, optional)** — expressive `eleven_v3` delivery as the primary
      voice (Web Speech fallback), via a dev/preview `/api/tts` proxy that keeps `ELEVENLABS_API_KEY`
      server-side. Configure voice id / model (`eleven_v3` / `Flash v2.5` / multilingual v2) / stability /
      style, a max-savagery cap, and profanity in ⚙️ Settings.
- [x] **Commentary overhaul (Build 2)** — a line fires on **every new score** by either player (the SFX
      covers the latency, the voice lands right after) and is **captioned on-screen**; edits don't fire,
      and a newer score **cancels the in-flight one** so voices never stack. Roasts **both** Dan and Amber
      with comeback detection, "what they need to win", and jab fodder (weak uppers, untouched Chance,
      brutal scratches). Fallback chain: ElevenLabs (tagged, ~3.5s budget) → Web Speech (plain) → skip.
      A special closing line fires on game over (winner hype + loser roast).
- [x] **Custom commentary triggers** — author your own lines in ⚙️ → *Custom lines* for specific events
      (value, category, category+value, scratch, or event: Yahtzee/bonus/game-over, with an optional
      player filter). Stored in `localStorage`; placeholders `{scorer} {opponent} {value} {category}
      {scorerTotal} {opponentTotal} {leader} {margin}`. Custom lines take **priority** over the AI
      (and work with no Claude key); the most-specific rule wins, multiple lines pick at random avoiding
      repeats, and anything with no match falls through to the AI.
- [x] **Spontaneity pass** — each AI line is assigned a random **delivery persona** (deadpan statistician,
      noir detective, nature-doc narrator, …) + **sentence shape** (one-word verdict, fake headline, brutal
      metaphor, …), never repeating the persona back-to-back; the model is shown its **recent lines** to
      avoid repeating its own tics; **streak/trend flags** (scratch runs, cold streaks, a long-held lead)
      feed the prompt; and the leash is looser (react to the vibe, vary length). `temperature` stays 1.0
      (the API max).
- [x] **Phase 3** — Dexie persistence (`src/db.js`): debounced autosave of the active game (full
      delete+bulkPut of its entries), resume on reload (replays the log → same derived turn state),
      finalize + save on game over, and `abandonActive()` when a new game starts. A loaded game that's
      already complete is finalized instead of resumed. Finished games kept for History/Stats.
- [ ] Phase 4 — New game / names, game-over finalize + save record.
- [ ] Phase 5 — History screen.
- [x] **Phase 6 / item F** — Stats screen (header **Stats** button → overlay, **Back to game**, doesn't
      disturb an in-progress game). Pure `src/game/stats.js` `computeStats(allFinished())`; Chart.js
      (bundled + precached, loaded on open) renders a win-share donut, avg-by-category grouped bar,
      grand-total-over-time line, and final-score histogram, plus header + fun-counter cards and a
      friendly empty state. Reduced-motion turns Chart animation off.
- [ ] Phase 7 — Polish: vendored fonts, accessibility, JSON export backed by Dexie, offline verify.

Run `npm test` for the suite. To curate real audio, drop clips in `public/sounds/` (see the
README there) — anything missing falls back to the built-in synth automatically.

### ElevenLabs voice (optional)

Copy `.env.example` to `.env` and set `ELEVENLABS_API_KEY` (gitignored, server-side only — the
Vite `/api/tts` proxy reads it; it is never sent to the browser). Then in ⚙️ Settings: turn on
**Use ElevenLabs**, paste a **Voice ID**, pick the model (`eleven_v3` recommended) and stability,
and hit **Test voice**. The proxy runs in `npm run dev` and `npm run preview` only — on a plain
static deploy there's no proxy, so it falls back to the device's Web Speech voice automatically.
