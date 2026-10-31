import { computeTotals } from './scoring.js';
import { results } from './core.js';

// A later Undo/correction invalidates an accepted outcome, including batched snapshots.
// Hydration has no previous snapshot; event IDs are authority, never player labels.
export function acceptedOutcome(previous, next) {
 if (!previous || !next || previous.id !== next.id) return null;
 const seen = new Set((previous.events || []).map(event => event.id));
 const invalidated = new Set((next.events || []).filter(event => ['score-undo', 'score-correction'].includes(event.type)).map(event => event.target));
 return (next.events || []).filter(event => !seen.has(event.id) && !invalidated.has(event.id) &&
  (event.type === 'score' || event.type === 'bonus' || event.type === 'final-chain-roll' ||
   (event.type === 'final-chain-end' && previous.status !== 'finished' && next.status === 'finished'))).at(-1) || null;
}

// Compare confirmed snapshots only. No rankings or derived total cues during hidden play.
export function celebration(previous, next) {
 const event = acceptedOutcome(previous, next);
 if (!event) return null;
 const finish = previous.status !== 'finished' && next.status === 'finished';
 const bonus = event.type === 'bonus' || event.type === 'final-chain-roll' ? event.value || 0 : event.bonus || 0;
 if (!finish && !(event.value > 0 || bonus > 0)) return null;
 const upperBonus = !(next.hideTotals && next.status === 'active') &&
  computeTotals(previous.sheets?.[event.seat] || {}).bonus === 0 && computeTotals(next.sheets?.[event.seat] || {}).bonus === 35;
 const kind = finish ? 'finish' : bonus > 0 || (event.category === 'yahtzee' && event.value > 0) ? 'yahtzee' :
  upperBonus ? 'upper-bonus' : ['smallStraight', 'largeStraight'].includes(event.category) && event.value > 0 ? 'straight' :
  event.category === 'fullHouse' && event.value > 0 ? 'full-house' : 'score';
 return { kind, seat: event.seat, category: event.category, value: event.value, upperBonus, bonus };
}

// Render with textContent; statements describe accepted category facts, not observed dice.
export function celebrationMessage(effect, game) {
 const name = game.players[effect.seat]?.name || 'Player';
 if (effect.kind === 'finish') {
  const result = results(game);
  return { title: result.solo ? 'Game Complete!' : result.winners.length > 1 ? 'A Shared Victory!' : `${game.players[result.winners[0]].name} Wins!`, subtitle: result.solo ? `${result.totals[0]} points. Well played!` : result.winners.length > 1 ? `${result.winners.map(seat=>game.players[seat].name).join(' & ')} tied on ${result.totals[result.winners[0]]} points.` : `${result.totals[result.winners[0]]} points · ${result.totals[result.winners[0]]-Math.max(...result.totals.filter((_,seat)=>seat!==result.winners[0]))} ahead. Well played!` };
 }
 if (effect.kind === 'yahtzee') return { title: effect.bonus > 0 ? `YAHTZEE · +${effect.bonus}!` : 'YAHTZEE!', subtitle: `${name} · ${effect.bonus > 0 ? 'Bonus secured. Keep it rolling!' : 'Yahtzee scored. What a moment!'}` };
 if (effect.kind === 'upper-bonus') return { title: 'Upper bonus · +35!', subtitle: `${name} · 63 reached. Bonus secured!` };
 if (effect.kind === 'full-house') return { title: 'FULL HOUSE!', subtitle: `${name} · Full house scored. Nicely played!` };
 if (effect.kind === 'straight') return { title: effect.category === 'smallStraight' ? 'SMALL STRAIGHT!' : 'LARGE STRAIGHT!', subtitle: `${name} · Straight scored. Beautiful!` };
 return { title: 'Score saved', subtitle: `${name} · ${effect.value} points scored.` };
}
