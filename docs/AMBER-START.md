# Amber: start here

3 November 2026. Use `/srv/yahtzee/amber` on **fg-dev** and your own
`amber/` topic branch; `/srv/yahtzee/main` is coordination-only. Read `AGENTS.md`,
[latest handover](next-chat-current.md) and [status](status.md) first.

## Run your edits

In your fg-dev terminal:

```bash
cd /srv/yahtzee/amber
whoami
git status --short --branch
git branch --show-current
git fetch origin
```

Expect user `amber` and the topic branch you started. If dirty or unexpected, stop and identify
the work; do not stash, reset or switch over it. Use **Node24** (`node --version`),
run `npm ci`, and ask Dan/admin to provision the validated, ignored public-only
`.env.ios-test.local` in your worktree. Never paste its values into chat or Git.

```bash
node scripts/prepare-ios-test.mjs --check
npm run dev -- --mode ios-test --host 127.0.0.1 --port 8477 --strictPort
```

Keep it running. If occupied, choose another unused port; don't stop another
person's server. On **your computer**, open another terminal:

```bash
ssh -N -L 18477:127.0.0.1:8477 amber@fg-dev
```

Use your configured fg-dev SSH destination if different. Open
<http://localhost:18477/> or Studio at <http://localhost:18477/?studio=1>.
Adjust the tunnel if you change ports.

[Live Studio](https://fluidity-group.github.io/yahtzee-scorekeeper/?studio=1)
uses your existing account and deployed code, not local edits. Local hosted play
also uses the **real backend**: agree a test table/game with Dan. Draft/preview
is private; **Publish changes shared reactions** for future accepted scores.

## Test first

1. Existing account, avatar and saved games/table seats survive reopening.
   Compare **Menu → More Tools → About this build** on both phones.
2. Phone layout at small/large text and portrait/landscape; dialogs, numeric
   entries during resizing, saved avatars and their animations.
3. An agreed manual test game with Dan: fixed/sum scores, totals, turn ownership,
   latest-turn Undo, Home/Resume, reconnect and final results.
4. Studio: Full House / Dan / score25; save, reload, preview each recipient and
   explicitly publish. Check custom versus standard recipient popups and no
   replay on reload. Try Chance=23 and another score for exact-score matching.

## Known limits and open checks

- Both recorded phone installs are **build79**, with identical57web assets;
  account/avatar/game continuity and paired gameplay still need acceptance.
  Earlier sizing/avatar/animation reports need retesting, not presumed fixes.
- iPhone OTA feed is empty (404 expected); physical update/rollback tests remain
  open. Its profile expires **8 November,14:52 America/Chicago**; OTA cannot
  extend signing. See [iPhone](releases/SW-079-local-network-updates.md) and
  [Pixel](releases/SW-080-pixel-build79.md) release records.
- Camera, voice/push and the game-rule builder are deferred. Paid Gemini
  generation needs agreed testing. Never uninstall or clear app/browser data.

## Report bugs and submit fixes

Create one [GitHub issue](https://github.com/Fluidity-group/yahtzee-scorekeeper/issues/new)
per problem; check duplicates first. Include device/browser/OS, native build and
source commit (local: `git rev-parse HEAD`), game mode/rule version, reproduction
steps, expected/actual result, frequency and a redacted screenshot/video. Use
synthetic player labels/scores; omit personal data, tokens and reset/invite links.

Keep fixes scoped, add a regression test and commit before handing over. Push
explicitly with `git push -u origin <your-branch>` (substitute your actual branch
name). New PRs target **master** after the SW083 landing; check
[the current status](status.md) before starting. Fetch current master and integrate
it with a normal merge on your own branch when your work is committed and safe;
preserve edits and never reset/rebase shared history to catch up. Link the bug and
report checks/untested cases.
Full gate: Node24, `npm ci --prefix device/pi`, then
`node scripts/engineering-check.mjs verify`; report optional camera skips.
Never force-push or deploy phones/backend as part of an ordinary bug fix.
