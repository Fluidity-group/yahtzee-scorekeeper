import { BASE_KEYS, META } from '../game/categories.js';
import {renderBonusGraphic,renderUpperCategoryIndicator} from './bonus-graphic.js';
import { computeTotals } from '../game/scoring.js';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hues = [162,267,205,24,48,332,185,232];
const validSeat = (game, seat) => Number.isInteger(seat) && seat >= 0 && seat < game.players.length;
const stateClass = (game, seat, winners) => game.status === 'active' ? seat === game.activeSeat ? 'turn-column current-player' : 'waiting-column' : winners.includes(seat) ? 'winner-column' : '';
const seatStyle = seat => `--player-hue:${hues[seat % hues.length]}`;
function readonlyScore(game, key, seat) {
 const value = game.sheets[seat][key], name = game.players[seat].name;
 const label = `${name} (seat ${seat + 1}), ${META[key].name}: ${value === undefined ? 'open' : value === 0 ? 'scratched, zero points' : `${value} points`}`;
 return `<span class="phone-peer-score ${value === undefined ? 'score-placeholder' : `recorded-score ${value === 0 ? 'scratched-score' : ''}`}" aria-label="${esc(label)}">${value === undefined ? '—' : value === 0 ? '<span class="scratch-value" aria-hidden="true">0<small>SCRATCH</small></span>' : esc(value)}</span>`;
}
function heading(game, seat, totals, winners, own) {
 const name = esc(game.players[seat].name), active = game.status === 'active';
 const count = BASE_KEYS.filter(key => game.sheets[seat][key] !== undefined).length;
 const status = active ? seat === game.activeSeat ? own ? 'YOUR TURN' : 'PLAYING' : 'WAITING' : winners.includes(seat) ? 'WINNER' : 'FINISHED';
 return `<div class="player-summary"><span class="player-name" title="${name}" aria-label="${name}, seat ${seat + 1}${own ? ', your scorecard' : ''}">${name}</span>${game.hideTotals && active ? '<span class="hidden-total">Total hidden</span>' : `<strong>${esc(totals[seat] ?? computeTotals(game.sheets[seat]).grand)}</strong>`}<small class="seat-status">${status}</small><small>${own ? 'You · ' : ''}${count}/13</small></div>`;
}
/** Display adapter only. Caller retains score/bonus authority and dialog behavior. */
export function renderPhoneScorecard(game, { viewerSeat = null, scoreCell, bonusCell, totals = [], winners = [], peerOffset = 0 } = {}) {
 if (!game?.players?.length) return '';
 const hidden = game.hideTotals && game.status === 'active';
 const own = validSeat(game, viewerSeat), featuredSeat = own ? viewerSeat : validSeat(game, game.activeSeat) ? game.activeSeat : 0;
 const peers = game.players.map((_, seat) => seat).filter(seat => seat !== featuredSeat);
 const offset = Math.max(0, Math.min(peers.length - 1, Number.isInteger(peerOffset) ? peerOffset : 0));
 const rail = (render, kind = '') => `<div class="phone-peer-window"><div class="phone-peer-track ${kind}">${peers.map(seat => `<div class="phone-peer-slot ${stateClass(game, seat, winners)}" data-player-seat="${seat}" style="${seatStyle(seat)}">${render(seat)}</div>`).join('')}</div></div>`;
 const controls = peers.length > 1 ? `<div class="phone-peer-controls" aria-label="Opponent score navigation"><button type="button" data-phone-peer-step="-1" aria-label="Previous opponent"${offset === 0 ? ' disabled' : ''}>‹</button><span data-phone-peer-position role="status" aria-live="polite">${offset + 1}/${peers.length}</span><button type="button" data-phone-peer-step="1" aria-label="Next opponent"${offset === peers.length - 1 ? ' disabled' : ''}>›</button></div>` : '';
 const featuredCell = key => own && scoreCell ? scoreCell(key, featuredSeat) : `<td data-score-key="${key}" data-score-seat="${featuredSeat}">${readonlyScore(game, key, featuredSeat)}</td>`;
 const featuredBonus = own && bonusCell ? bonusCell(featuredSeat, {hideTotals:hidden}) : `<td>${hidden ? 'Hidden' : esc(game.sheets[featuredSeat].yahtzeeBonus || '—')}</td>`;

 const bonusProgress=seat=>hidden?'<span class="bonus-hidden">Hidden until finish</span>':`<div class="bonus-projection" data-bonus-seat="${seat}">${renderBonusGraphic(game.sheets[seat],{name:game.players[seat].name,compact:seat!==featuredSeat})}</div>`;
 const upperTotal = seat => hidden?'Hidden':computeTotals(game.sheets[seat]).upperTotal;
 const lowerTotal = seat => hidden?'Hidden':computeTotals(game.sheets[seat]).lower;
 const grandTotal = seat => hidden?'Hidden':computeTotals(game.sheets[seat]).grand;
 return `<section class="phone-scorecard" style="--peer-offset:${offset};--featured-hue:${hues[featuredSeat % hues.length]}" data-phone-peer-count="${peers.length}">${controls||!own?`<div class="phone-scorecard-caption"><span>${own?'':'Watching the table'}</span>${controls}</div>`:''}<div class="score-table-wrap"><table class="core-score-table phone-score-table"><colgroup><col class="phone-category-col"><col class="phone-own-col">${peers.length ? '<col class="phone-comparison-col">' : ''}</colgroup><thead><tr><th scope="col"><span class="category-heading">Scores</span><button type="button" class="scorecard-display-button" data-action="scorecard-display" aria-label="Scorecard text size">Aa</button></th><th scope="col" data-player-seat="${featuredSeat}" class="player-heading phone-own-heading ${stateClass(game, featuredSeat, winners)}" style="${seatStyle(featuredSeat)}">${heading(game, featuredSeat, totals, winners, own)}</th>${peers.length ? `<th scope="col" class="phone-comparison-heading" aria-label="Other players, read only">${rail(seat => heading(game, seat, totals, winners, false), 'phone-peer-headings')}</th>` : ''}</tr></thead><tbody><tr class="score-section"><th scope="row" colspan="${peers.length?3:2}">Upper section <button type="button" class="bonus-guide" data-action="bonus-guide" aria-label="Explain upper bonus and pace">?</button></th></tr>${BASE_KEYS.slice(0,6).map(key => `<tr><th scope="row" class="${game.status === 'active' && game.sheets[featuredSeat][key] !== undefined ? 'category-filled' : ''}"><span class="upper-category-label"><span>${esc(META[key].name)}</span>${renderUpperCategoryIndicator(game.sheets[featuredSeat],key,{name:game.players[featuredSeat].name})}</span></th>${featuredCell(key)}${peers.length ? `<td class="phone-comparison-cell">${rail(seat => `<span data-score-key="${key}" data-score-seat="${seat}">${readonlyScore(game, key, seat)}</span>`)}</td>` : ''}</tr>`).join('')}<tr class="summary-row bonus-progress-row"><th scope="row" colspan="2"><div class="own-bonus-summary"><span>Bonus chase</span>${bonusProgress(featuredSeat)}</div></th>${peers.length ? `<td class="phone-comparison-cell">${rail(seat => bonusProgress(seat))}</td>` : ''}</tr><tr class="summary-row "><th scope="row">Upper + bonus</th><td>${upperTotal(featuredSeat)}</td>${peers.length ? `<td class="phone-comparison-cell">${rail(seat => upperTotal(seat))}</td>` : ''}</tr><tr class="score-section"><th scope="row" colspan="${peers.length?3:2}">Lower section</th></tr>${BASE_KEYS.slice(6).map(key => `<tr><th scope="row" class="${game.status === 'active' && game.sheets[featuredSeat][key] !== undefined ? 'category-filled' : ''}">${esc(META[key].name)}</th>${featuredCell(key)}${peers.length ? `<td class="phone-comparison-cell">${rail(seat => `<span data-score-key="${key}" data-score-seat="${seat}">${readonlyScore(game, key, seat)}</span>`)}</td>` : ''}</tr>`).join('')}<tr class="summary-row "><th scope="row">Lower subtotal</th><td>${lowerTotal(featuredSeat)}</td>${peers.length ? `<td class="phone-comparison-cell">${rail(seat => lowerTotal(seat))}</td>` : ''}</tr><tr class="summary-row"><th scope="row">Yahtzee bonuses</th>${featuredBonus}${peers.length ? `<td class="phone-comparison-cell">${rail(seat => hidden ? 'Hidden' : esc(game.sheets[seat].yahtzeeBonus || '—'))}</td>` : ''}</tr><tr class="summary-row grand-total-row"><th scope="row">Grand total</th><td>${grandTotal(featuredSeat)}</td>${peers.length ? `<td class="phone-comparison-cell">${rail(seat => grandTotal(seat))}</td>` : ''}</tr></tbody></table></div></section>`;
}

/** Shared offset persists through caller renders. Horizontal swipe leaves vertical scroll alone. */
export function bindPhoneScorecard(container, { onPeerOffsetChange = () => {} } = {}) {
 const card = container.querySelector('.phone-scorecard');
 if (!card) return () => {};
 let start = null;
 function move(step) {
  const count = Number(card.dataset.phonePeerCount), current = Number(card.style.getPropertyValue('--peer-offset'));
  if (count < 2) return;
  const offset = Math.max(0, Math.min(count - 1, current + step));
  if (offset === current) return;
  card.style.setProperty('--peer-offset', offset);
  card.querySelector('[data-phone-peer-step="-1"]').disabled = offset === 0;
  card.querySelector('[data-phone-peer-step="1"]').disabled = offset === count - 1;
  card.querySelector('[data-phone-peer-position]').textContent = `${offset + 1}/${count}`;
  onPeerOffsetChange(offset);
 }
 function navigate(event) {
  const button = event.target.closest('[data-phone-peer-step]');
  if (button && card.contains(button) && !button.disabled) move(Number(button.dataset.phonePeerStep));
 }
 function touchStart(event) {
  start = event.touches.length === 1 && event.target.closest('.phone-peer-window') ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;
 }
 function touchEnd(event) {
  if (!start || event.changedTouches.length !== 1) {start=null;return;}
  const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;
  start=null;
  if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)*1.5) move(dx < 0 ? 1 : -1);
 }
 const cancel = () => {start=null;};
 card.addEventListener('click', navigate);
 card.addEventListener('touchstart', touchStart, {passive:true});
 card.addEventListener('touchend', touchEnd, {passive:true});
 card.addEventListener('touchcancel', cancel, {passive:true});
 return () => {card.removeEventListener('click',navigate);card.removeEventListener('touchstart',touchStart);card.removeEventListener('touchend',touchEnd);card.removeEventListener('touchcancel',cancel);};
}
