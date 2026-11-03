import {renderTournamentFinale} from './finale-dashboard.js';
import{renderAvatar}from'../profile/avatar-view.js';
import { results } from '../game/core.js';
import { BASE_KEYS } from '../game/categories.js';
import { computeTotals } from '../game/scoring.js';
import { renderTournamentStandings } from './tournament.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

// Final scorecard facts only: no inferred rolls, speed, or lifetime records.
export function hostedResultHighlights(game) {
 if (game?.status !== 'finished') return [];
 const outcome = results(game), highlights = [];
 if (outcome.winners.length === 1 && game.players.length > 1) {
  const winner = outcome.winners[0];
  const runnerUp = Math.max(...outcome.totals.filter((_, seat) => seat !== winner));
  highlights.push({ title: 'Winning margin', detail: `${game.players[winner].name} finished ${outcome.totals[winner] - runnerUp} points ahead.` });
 }
 const bonusSeats = game.sheets.flatMap((sheet, seat) => computeTotals(sheet).bonus ? [seat] : []);
 if (bonusSeats.length) highlights.push({ title: 'Upper bonus secured', detail: `${bonusSeats.map(seat => game.players[seat].name).join(' · ')} earned the +35 upper bonus.` });
 const scratches = game.sheets.map(sheet => BASE_KEYS.filter(category => sheet[category] === 0).length);
 const fewest = Math.min(...scratches);
 if (game.sheets.every(sheet => BASE_KEYS.every(category => sheet[category] !== undefined))) {
  const names = game.players.filter((_, seat) => scratches[seat] === fewest).map(player => player.name).join(' · ');
  highlights.push({ title: fewest === 0 ? 'Every category scored' : 'Fewest scratches', detail: `${names}: ${fewest} zero-scoring ${fewest === 1 ? 'category' : 'categories'}.` });
 }
 return highlights.slice(0, 3);
}

export function renderHostedResults({ room, userId, connected = true, busy = false, scorecardMarkup = '' } = {}) {
 const game = room?.game;
 if (game?.status !== 'finished') return '';
 const outcome = results(game), winners = outcome.winners;
 const title = outcome.solo ? 'Game Complete' : winners.length > 1 ? 'A Shared Victory' : `${game.players[winners[0]].name} Wins!`;
 const members = room.members || [];
 const ownSeat = members.findIndex(member => member.userId === userId);
 const supported = room.capabilities?.rematch === true;
 const rematch = room.rematch;
 const current = rematch?.gameId === game.id && rematch?.gameRevision === game.revision;
 const ready = new Set(current && Array.isArray(rematch.ready) ? rematch.ready : []);
 const ownReady = ownSeat >= 0 && ready.has(userId);
 const tournament=room.tournament,final=tournament?.status==='completed',paused=tournament?.status==='paused';
 const starterId = room.nextStarterId ?? (current ? rematch.nextStarterId : null);
 const starter = game.players.find(player => player.id === starterId);
 const highlights = hostedResultHighlights(game);
 const waiting = game.players.filter((_, seat) => !ready.has(members[seat]?.userId));
 const message = paused ? 'Tournament paused. Your results are saved; the host can resume the next game.' : !connected ? 'Reconnecting—checking the table. Your finished game remains here.' : busy ? 'Saving your readiness…' : !supported ? 'A hosted-game update is required before this table can play again.' : ownSeat < 0 ? 'Only players at this table can mark themselves ready.' : ownReady ? waiting.length ? `You’re ready. Waiting for ${waiting.map(player => player.name).join(' · ')}.` : 'Everyone is ready. Checking the next game…' : 'Play again with the same group. The next game starts when everyone is ready.';
 const continuation=final?'<p class="hosted-rematch-message">Tournament complete. Both final leaderboards are shown below.</p>':`<div class="hosted-rematch"><h3>${tournament?`Next: game ${(room.gameSequence??1)+1} of ${tournament.gameCount}${(room.gameSequence??1)+1===tournament.gameCount?' · Final game!':''}`:'Keep the table going'}</h3>${supported && ownSeat >= 0 ? `<button class="hosted-rematch-button${ownReady ? ' hosted-withdraw' : ''}" data-action="${ownReady ? 'rematch-withdraw' : 'rematch-ready'}"${!connected || busy || paused ? ' disabled' : ''}>${ownReady ? 'Not ready yet' : tournament ? 'Ready for next game' : 'Play again'}</button>` : ''}<ul class="hosted-ready-roster" aria-label="Next game readiness">${game.players.map((player, seat) => `<li><span>${escape(player.name)}${members[seat]?.userId === userId ? ' <small>· You</small>' : ''}</span><strong>${ready.has(members[seat]?.userId) ? '✓ Ready' : '○ Waiting'}</strong></li>`).join('')}</ul><p class="hosted-rematch-message">${escape(message)}</p></div>`;
 const resultMarkup = `<section class="hosted-results" aria-labelledby="hostedResultTitle"><span class="hosted-results-kicker">THIS GAME · ${escape(game.rules.name)}</span><h2 id="hostedResultTitle">${escape(title)}</h2>${final?'':continuation}<button class="all-scores" data-action="analytics">${tournament?'Tournament':'Game'} insights · scores &amp; replay ↗</button><ol class="hosted-final-scores" aria-label="Final scores">${game.players.map((player, seat) => `<li><span class="result-player"><span class="result-avatar">${renderAvatar({accountId:player.id,name:player.name})}</span>${escape(player.name)}${winners.includes(seat) && !outcome.solo ? '<small>Winner</small>' : ''}</span><strong>${outcome.totals[seat]}<small>points</small></strong></li>`).join('')}</ol>${starter&&!final ? `<p class="hosted-next-starter">${escape(starter.name)} starts the next game.</p>` : ''}${highlights.length ? `<div class="hosted-highlights" aria-label="This game highlights">${highlights.map(highlight => `<article><h3>${escape(highlight.title)}</h3><p>${escape(highlight.detail)}</p></article>`).join('')}</div>` : ''}${tournament&&!final?`<h3>Tournament standings</h3>${renderTournamentStandings(room.tournamentStandings,{final})}`:''}</section>`;
 return final?renderTournamentFinale({room,connected,finalGameMarkup:resultMarkup,scorecardMarkup}):resultMarkup;
}
