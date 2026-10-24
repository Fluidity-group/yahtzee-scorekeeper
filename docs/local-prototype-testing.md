# Local prototype: device feedback gate

Validation on 2026-09-16: 156 automated tests pass and the production PWA build succeeds.
Browser checks at 390 × 844 cover manual scoring, immediate reload, score correction,
weighted Yahtzee/bonus turns and corrected-roll analytics. The eight-player table scrolls
inside its panel without page overflow; the scorecard now contains the turn controls and is the sole category-entry surface.
Automated full-game scenarios complete all thirteen categories for 1/2/8 players in every mode.
Actual Pixel/iPhone touch use, offline installation and physical GoDice are not yet verified.

This milestone tests scoring and interaction on one device. Local names stand in for future
accounts; they do not identify persistent users across games. Online joining, native Android,
Bluetooth, billing and hosted commentary remain later stages.

## Quick checks

The compact layout puts totals and category progress in sticky player column headings.
The toolbar's **Menu** contains New game, History, Roll insights, rules, Export, appearance
and Dice lab. Manual turns use the slim status line; the old roster cards and repeated
Yahtzee question are removed. Additional Yahtzees are entered in the bonus row. For
simulated play the dice controls remain available above the scorecard.

Responsive check: at 390 × 844 the two-player scorecard begins about 89px below the top,
with all thirteen base categories visible. Eight-player layouts scroll within the table
without widening the page. At 1100 × 900 the scorecard begins about 117px below the top.
Keypad scoring correctly updated the compact total and moved the active-player indicator.

1. Create a Standard manual game with two or three players. Tap Threes in the active player column,
   and tap four dice: the score is 12 and the next player can tap their own cell. Manual turns start when a score is confirmed; simulated dice still require explicit Start my turn.
2. Reload immediately after scoring. The score and next player should survive.
3. Tap that recorded score and correct it. Turn order should stay unchanged.
4. Create a solo Accumulative game with simulated input. Set all dice to 1, record the
   roll, and score Yahtzee for 100. On the next turn roll five 2s and confirm a 90-point
   bonus. Start the fresh extra turn and score a normal category: this ends the chain.
5. Record a full house but score Chance. Roll insights should still count the full house.
   Correct or exclude a last roll and check that insights use the corrected/accepted data.
6. Create an eight-player game. On a narrow phone the scorecard scrolls horizontally
   inside its panel and keeps category labels visible. Check names, contrast and tap comfort.
7. Try History, JSON Export, and the original-game link. Original saves and statistics
   remain in their original database; the new prototype does not reinterpret them.

## Rules used for this prototype

- Standard: three rolls, additional qualifying Yahtzee +100 and Joker category on the same turn.
- Competition: three rolls; four whenever the player's last category remains open.
  Each qualifying bonus Yahtzee adds 100 and starts a fresh turn for that player.
- Accumulative: three rolls; five 1s through five 6s score 100/90/80/70/60/50 for the first
  and each bonus Yahtzee. Bonuses grant fresh turns. One eventual normal category ends the chain.
- A non-zero initial Yahtzee is required for bonuses. A scratched box still invokes Joker
  placement when a repeated Yahtzee must fill a category.
- Manual play trusts the player's roll count and combination declarations.
- Category corrections change points without rewriting historical turns or granted bonuses.
  Correct dice before confirming a score; bonus reversal is not yet exposed.

## Persistence and current limits

New snapshots and original roll/score/correction events are stored locally. A synchronous
localStorage journal protects the gap before IndexedDB commits. If IndexedDB fails, the UI
reports recovery storage and retains the accepted state. A full journal prevents accepting
the action. Use one tab per game; this is not a multiplayer concurrency implementation.
Browser-data removal still removes saves. Export produces a backup for inspection; import
for the new format is not yet exposed. The legacy route retains its original debounce save.

Insights count matching rolls and distinct turns separately; inclusive kinds/straights are
labelled. Manual turns without dice readings are missing data, not failed rolls. Simulated
data stays labelled. Cross-game account statistics come after identities and sync.

Scorecard-entry revision: tap empty cells for count/fixed scoring or Mark 0. Three/four of a kind and Chance open an on-screen keypad with clear/backspace, keyboard support and a 0–30 limit. Cancelling an entry leaves the turn unchanged.

Additional Yahtzees: on the active player's turn, use **+ Yahtzee** in the **Yahtzee bonuses**
row after filling the first Yahtzee category. Pick the five matching faces, then confirm.
Competition/Accumulative add the bonus and grant a fresh turn; repeat for further Yahtzees.
Standard guides you to the required category and saves its +100 at the same time. A first
Yahtzee marked zero allows Joker placement but no bonus. Original category points are preserved.

The bonus total is now inside the same button as the plus sign (for example **100 +**),
not a separate number above it. With no bonus yet it reads **Yahtzee +**. Use the default
**Standard** mode for the current device tests: first Yahtzee 50, each eligible additional
Yahtzee +100 together with Joker category scoring, no extra turn. Manual face selection
determines placement, not the bonus amount. Existing saved custom modes keep their rules.

Upper-category count entry now presents **1, 2, 3, 4, 5, X**; X records zero.
New-game setup has **Hide score totals until the end**, saved per game in all modes.
Category scores and bonuses remain visible; running grand totals are hidden in the
scorecard and history until completion. Existing games continue showing totals.
This is a display preference, not a secrecy boundary: export retains full game data.

Proposed animation direction (not yet implemented):
- Score confirmation: a brief tile bounce and point accent, only after saving succeeds.
- Large straight: five dice light in sequence with a short sweeping trail.
- Yahtzee: a player-coloured particle burst and "YAHTZEE!" banner, about 1 second.
- Turn change: a single soft pulse on the next player's header.
- Finish: reveal totals if hidden, highlight the winner (all tied winners), and offer
  Play again. Solo completion celebrates the final score without claiming a record.
- Respect reduced motion; sound and haptics should be separately optional. Effects
  should not block input, replay on reload, or celebrate score corrections as new rolls.


Turn visibility: the active player's full column retains its colour and stronger borders; all waiting columns use readable neutral greys. Verify emphasis moves on both devices after a score, and finished games restore every player's colour.


## Shared scorecard visual update (16 September 2026)
Android and joined browsers share the same scorecard and celebration code. Waiting headers have no highlight stripe; explicit YOUR TURN / PLAYING / WAITING labels separate turn state from player identity. Open categories use outlined tiles (Open on other seats, + on the actionable seat), recorded scores use solid tiles, and scratches display an X with a zero-point accessible label.

Confirmed score events trigger a brief score pop. Yahtzees and bonus Yahtzees show a burst, large straights show a five-dice sequence, and game completion shows a winner/tie/solo message with persistent result labels. Initial loads, repeated snapshots and corrections do not trigger celebrations. Reduced-motion preferences disable movement. Network delivery can slightly offset celebration timing between devices.

## Planned commentary output
Prefer Google Cast for table audio, with one designated playback controller (Android host by default). A Cast-enabled speaker/receiver is required; Bluetooth-only speakers use the phone's Bluetooth output. Generate a commentary clip once server-side, queue its HTTPS media URL on the receiver, keep captions available to everyone, and avoid simultaneous playback from every phone. Implement Android Cast sender support and capability-detect supported browser senders; do not assume iPhone Safari supports the web Cast sender. Include stop, volume, disconnect, and local audio fallback. Casting and voice generation are planned, not implemented in this visual update.
References: https://developers.google.com/cast/docs/overview and https://developers.google.com/cast/docs/audio

Upper-section bonus celebration: a confirmed score crossing the upper subtotal from below 63 to at least 63 triggers a gold +35 celebration. If the score also completes the game or earns a Yahtzee bonus, the main celebration includes the +35 in its caption. Refreshes and correction-only updates are quiet.
