import './pulse.css';

export function pulseReduced(media = globalThis.matchMedia) {
 return typeof media === 'function' && media('(prefers-reduced-motion: reduce)').matches === true;
}

// No pulses on initial loads, reconnect snapshots without new accepted actions,
// corrections, optional metrics, or unrelated status updates.
export function acceptedPulse(previous, next) {
 if (!previous || !next || previous.id !== next.id) return null;
 const seen = new Set((previous.events || []).map(event => event.id));
 const fresh = (next.events || []).filter(event => !seen.has(event.id));
 const action = fresh.filter(event => ['score', 'bonus', 'final-chain-roll'].includes(event.type)).at(-1);
 if (!action) return null;
 const nextTurn = next.status === 'active' && previous.activeSeat !== next.activeSeat;
 const bonus = action.type === 'bonus' || action.type === 'final-chain-roll' ? action.value || 0 : action.bonus || 0;
 // A failed chain-roll on its own isn't an achievement; it may hand over a turn.
 if (action.type === 'final-chain-roll' && bonus === 0 && !nextTurn) return null;
 return { score: action.type === 'score' ? { seat: action.seat, category: action.category } : null, bonusSeat: bonus > 0 ? action.seat : null, turnSeat: nextTurn ? next.activeSeat : null };
}

const active = new WeakMap();
export function pulseAccepted(root, previous, next, { reduced = pulseReduced() } = {}) {
 const effect = acceptedPulse(previous, next);
 const prior = active.get(root);
 if (prior) { clearTimeout(prior.timer); prior.targets.forEach(([target, className]) => target.classList.remove(className)); active.delete(root); }
 if (!effect || reduced) return effect;
 const targets = [];
 const mark = (target, className) => { if (target) { target.classList.add(className); targets.push([target, className]); } };
 if (effect.score) mark(root.querySelector(`[data-score-key="${effect.score.category}"][data-score-seat="${effect.score.seat}"]`), 'accepted-score');
 if (effect.turnSeat !== null) {
  mark(root.querySelector('.current-player'), 'accepted-turn');
  mark(root.querySelector('.turn-indicator'), 'accepted-turn');
 }
 if (effect.bonusSeat !== null) mark(root.querySelectorAll('.player-heading')[effect.bonusSeat], 'accepted-bonus');
 if (targets.length) {
  const timer = setTimeout(() => { targets.forEach(([target, className]) => target.classList.remove(className)); active.delete(root); }, 1000);
  active.set(root, { targets, timer });
 }
 return effect;
}
