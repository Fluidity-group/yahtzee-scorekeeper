import { computeTotals } from './scoring.js';
import { results } from './core.js';
// Compare confirmed snapshots only. Initial loads and corrections are deliberately quiet.
export function celebration(previous, next) {
 if (!previous || previous.id !== next.id) return null;
 const seen = new Set(previous.events.map(event => event.id));
 const fresh = next.events.filter(event => !seen.has(event.id));
 const event = fresh.filter(event => event.type === 'score' || event.type === 'bonus' || (event.type === 'final-chain-roll' && event.value > 0) || (event.type === 'final-chain-end' && previous.status !== 'finished' && next.status === 'finished')).at(-1);
 if (!event) return null;
 const upperBonus = computeTotals(previous.sheets?.[event.seat] || {}).bonus === 0 && computeTotals(next.sheets?.[event.seat] || {}).bonus === 35;
 const finish = previous.status !== 'finished' && next.status === 'finished';
 const kind = finish ? 'finish' : event.type === 'bonus' || event.type === 'final-chain-roll' || event.bonus > 0 || (event.category === 'yahtzee' && event.value > 0) ? 'yahtzee' : upperBonus ? 'upper-bonus' : event.category === 'largeStraight' && event.value > 0 ? 'straight' : event.category === 'fullHouse' && event.value > 0 ? 'full-house' : 'score';
 const bonus = event.type === 'bonus' || event.type === 'final-chain-roll' ? event.value : event.bonus || 0;
 return { kind, seat: event.seat, category: event.category, value: event.value, upperBonus, bonus };
}

// Render these strings using textContent; all statements describe accepted score facts.
export function celebrationMessage(effect, game) {
 const name = game.players[effect.seat]?.name || 'Player';
 if (effect.kind === 'finish') {
  const result = results(game);
  return { title: result.solo ? 'Game complete!' : result.winners.length > 1 ? 'A shared victory!' : `${game.players[result.winners[0]].name} wins!`, subtitle: 'What a game. Well played!' };
 }
 if (effect.kind === 'yahtzee') return { title: effect.bonus > 0 ? `YAHTZEE · +${effect.bonus}!` : 'YAHTZEE!', subtitle: `${name} · ${effect.bonus > 0 ? 'Bonus secured. Keep it rolling!' : 'Five of a kind. What a moment!'}` };
 if (effect.kind === 'upper-bonus') return { title: 'Upper bonus · +35!', subtitle: `${name} · 63 reached. Bonus secured!` };
 if (effect.kind === 'full-house') return { title: 'FULL HOUSE!', subtitle: `${name} · Full house scored. Nicely played!` };
 return { title: 'LARGE STRAIGHT!', subtitle: `${name} · Large straight scored. Beautiful!` };
}
