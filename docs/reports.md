# Clubhouse Reports

Reports is a browser view at `?reports=1`, linked from the browser Home screen,
game menu and Reaction Studio. Use the existing game account and the usual
configured web build. For local development, use Node24 and
`npm run dev -- --mode ios-test`; add `?reports=1` to that server's URL.
This source change does not publish the live site or update a phone.

## Overall tournament results

The report reads your authorised online tables and saved game history. It shows
verified completed tournament wins, points titles and most-game-wins titles
separately, participation counts, completed-game wins and combined points. A
player winning either or both honours earns one tournament-won count. Ties count
for each winner; solo games do not award competitive wins. Awards require all
expected game sequences, scorecards, roster and frozen rules to reconcile.

Choose all saved online games or tournament games only. Finished games in ongoing
tables can contribute game totals; unfinished/reopened games cannot. Mixed-rule
combined points describe recorded volume. Averages and player comparisons require
one exact frozen rules/source/solo-or-group contract. The selector distinguishes
contracts even when their human-readable mode/version labels match.

## Player patterns

Select a player account and matching contract to see average/best/spread, dated
score trends, upper-bonus conversion, zero-score frame counts, category means and
usual accepted entry positions. Peer category means use opponents' scorecards in
that player's same games; denominators are shown. Recent/prior averages show their
actual sample sizes and exclude games with unknown completion dates.

Entry-order metrics require replay to match every final category and bonus, with
all13frames accounted for. Corrections retain the original frame's position;
undone scores and excluded turns do not become opening choices. Missing dates or
history are shown as unknown. Manual scoring records choices and accepted values;
it does not establish physical-roll frequency, thinking time, luck or personality.

## Privacy and integrity

Reports issues only existing authenticated `sessions`, `history` and `read`
requests, fenced to the account that opened it. All pages load with bounded
concurrency and cursor checks. A room revision change or failed page produces an
explicit retry state, not a complete-looking partial total. Older missing history,
incomplete scorecards and unverified tournament awards have visible coverage notes.

Latest game revisions replace stale snapshots; the current room game overrides its
archive so reopened results stay excluded. Identities follow account IDs, not
nicknames. Only accessible tables contribute; another player's private tables are
not fetched. Local-only device games are not uploaded, migrated or merged by name.
No game command, schema migration, privileged key or counter write is required.
Refresh manually for subsequent updates. Account changes, sign-out and browser
back-cache retirement clear private reports and fence delayed reads. Same-account
token refresh keeps filters and charts mounted.

See [SW082](plans/SW-082-clubhouse-reports.md) for exact qualification and remaining
browser/live-account acceptance. Phone deployment remains held.
