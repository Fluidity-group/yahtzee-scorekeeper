import './pulse.css';
import { acceptedOutcome, celebration } from '../game/celebrations.js';

export function pulseReduced(media = globalThis.matchMedia) {
 return typeof media === 'function' && media('(prefers-reduced-motion: reduce)').matches === true;
}

export function acceptedPulse(previous, next) {
 const action = acceptedOutcome(previous, next);
 if (!action) return null;
 const nextTurn = next.status === 'active' && previous.activeSeat !== next.activeSeat;
 const bonus = action.type === 'bonus' || action.type === 'final-chain-roll' ? action.value || 0 : action.bonus || 0;
 const score = action.type === 'score' && action.value > 0 ? { seat: action.seat, category: action.category } : null;
 if (!score && bonus <= 0 && !nextTurn) return null;
 return { score, bonusSeat: bonus > 0 ? action.seat : null, turnSeat: nextTurn ? next.activeSeat : null };
}

const active = new WeakMap();
const observed = new WeakMap();
export function cancelPulse(root) {
 const prior = active.get(root);
 if (!prior) return;
 clearTimeout(prior.timer);
 prior.targets.forEach(([target, className]) => target.classList.remove(className));
 prior.nodes.forEach(node => node.remove());
 active.delete(root);
}

// Bounded cell decorations: no full-screen layer, audio, input lock or focus changes.
export function pulseAccepted(root, previous, next, { reduced = false, intensity = 'signature' } = {}) {
 cancelPulse(root);
 const action = acceptedOutcome(previous, next);
 let history = observed.get(root);
 if (!history || history.gameId !== next?.id) history = { gameId: next?.id, ids: new Set() };
 const duplicate = action && history.ids.has(action.id);
 // Remember the current authoritative audit so stale/reconnect delivery cannot replay.
 history.ids = new Set([...history.ids, ...[...(previous?.events || []), ...(next?.events || [])].map(event => event.id)]);
 observed.set(root, history);
 const effect = duplicate ? null : acceptedPulse(previous, next);
 if (!effect || reduced || pulseReduced()) return effect;
 const visual = drawPulse(root, previous, next, effect, action, intensity);
 if (visual.targets.length || visual.nodes.length) {
  const deadline = Date.now() + 1200;
  const timer = setTimeout(() => cancelPulse(root), 1200);
  active.set(root, { ...visual, timer, deadline, previous, next, effect, action, intensity });
 }
 return effect;
}

function drawPulse(root, previous, next, effect, action, intensity) {
 const targets = [], nodes = [];
 const mark = (target, className) => { if (target) { target.classList.add(className); targets.push([target, className]); } };
 const heading = seat => root.querySelector(`[data-player-seat="${seat}"]`) || root.querySelectorAll('.player-heading')[seat];
 const cell = effect.score ? root.querySelector(`[data-score-key="${effect.score.category}"][data-score-seat="${effect.score.seat}"]`) : null;
 mark(cell, 'accepted-score');
 if (effect.turnSeat !== null) {
  mark(heading(effect.turnSeat), 'accepted-turn');
  mark(root.querySelector('.turn-indicator'), 'accepted-turn');
 }
 if (effect.bonusSeat !== null) mark(heading(effect.bonusSeat), 'accepted-bonus');
 const moment = celebration(previous, next);
 if(effect.score)mark(heading(effect.score.seat),'playform-score-total');
 if(effect.score&&['aces','twos','threes','fours','fives','sixes'].includes(effect.score.category))mark(root.querySelector(`.header-bonus-dashboard[data-bonus-header-seat="${effect.score.seat}"]`),'header-bonus-updated');
 if(moment?.upperBonus)root.querySelectorAll(`[data-bonus-seat="${action.seat}"],[data-bonus-header-seat="${action.seat}"]`).forEach(target=>mark(target,'playform-bonus-awarded'));
 const kind = moment?.kind === 'finish' ? (action?.category === 'yahtzee' || moment.bonus > 0 ? 'yahtzee' : moment.upperBonus ? 'upper-bonus' : action?.category === 'fullHouse' ? 'full-house' : ['smallStraight', 'largeStraight'].includes(action?.category) ? 'straight' : 'score') : moment?.kind;
 const anchor = cell || (effect.bonusSeat !== null ? heading(effect.bonusSeat) : null);
 if (anchor && kind && kind !== 'score' && intensity !== 'subdued' && anchor.ownerDocument) {
  mark(anchor, `pulse-${kind}`);
  const emblem = anchor.ownerDocument.createElement('span');
  emblem.className = `pulse-emblem pulse-emblem-${kind}`;
  emblem.setAttribute('aria-hidden', 'true');
  if (kind === 'straight') {
   const count = action.category === 'smallStraight' ? 4 : 5;
   for (let i = 0; i < count; i++) {
    const step = anchor.ownerDocument.createElement('i');
    step.textContent = '•'; step.style.setProperty('--step', i); emblem.append(step);
   }
  } else emblem.textContent = kind === 'full-house' ? '3 + 2' : kind === 'upper-bonus' ? '+35' : '✦';
  anchor.append(emblem); nodes.push(emblem);
  if (kind === 'yahtzee' && intensity === 'showtime') {
   for (let i = 0; i < 6; i++) {
    const spark = anchor.ownerDocument.createElement('i');
    spark.className = 'pulse-spark'; spark.setAttribute('aria-hidden', 'true');
    spark.style.setProperty('--spark', i); spark.textContent = '·'; anchor.append(spark); nodes.push(spark);
   }
  }
 }
 return {targets,nodes};
}

/** Reattach an already awarded visual after DOM replacement; never reset its deadline. */
export function refreshPulse(root) {
 const prior = active.get(root);
 if (!prior) return false;
 if (Date.now() >= prior.deadline || pulseReduced()) {cancelPulse(root);return false;}
 prior.targets.forEach(([target,className])=>target.classList.remove(className));
 prior.nodes.forEach(node=>node.remove());
 const visual = drawPulse(root, prior.previous, prior.next, prior.effect, prior.action, prior.intensity);
 prior.targets = visual.targets;
 prior.nodes = visual.nodes;
 return true;
}
