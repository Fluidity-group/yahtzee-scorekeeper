import { computeTotals, filledBaseCount } from '../game/scoring.js';

const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

// Receives an already accepted snapshot, never commands a game or resolves authority.
export function acceptedFacts(game, eventId, accountIds) {
  const event = game.events.find(e => e.id === eventId);
  if (!event || !['score', 'score-correction', 'bonus', 'final-chain-roll', 'final-chain-end'].includes(event.type)) return null;
  if (accountIds.length !== game.players.length || new Set(accountIds).size !== accountIds.length || accountIds.some(id => !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))) throw new Error('Unique account UUIDs required for each seat.');
  // Facts must be captured at the accepting command, not invented retrospectively from newer totals.
  if (game.events.at(-1).commandId !== event.commandId) throw new Error('Capture facts at the accepted command snapshot.');
  const seats = game.sheets.map((sheet, seat) => ({ accountId: accountIds[seat], seat, label: `Player ${String.fromCharCode(65 + seat)}`, ...(!game.hideTotals ? { total: computeTotals(sheet).grand, upperBonus: computeTotals(sheet).bonus } : {}), remaining: 13 - filledBaseCount(sheet) }));
  const best = game.hideTotals ? null : Math.max(...seats.map(s => s.total));
  return freeze({ schemaVersion: 1, gameId: game.id, eventId, commandId: event.commandId, eventType: event.type, revision: game.revision, acceptedAt: event.time, rulesVersion: game.rules.version, mode: game.mode, source: event.source ?? game.source, seat: event.seat, accountId: accountIds[event.seat], label: seats[event.seat].label, category: event.category ?? null, value: event.value ?? 0, bonus: event.bonus ?? 0, correctionTarget: event.target ?? null, seats, disclosurePolicy: game.hideTotals ? 'category-scores-only' : 'scores-and-totals', leaders: game.hideTotals ? [] : seats.filter(s => s.total === best).map(s => s.accountId), tied: game.hideTotals ? null : seats.filter(s => s.total === best).length > 1, complete: game.status === 'finished', finalChain: game.finalChain ? { ...game.finalChain } : null, snapshotBasis: 'at-acceptance', scoreDependencies: game.events.filter(e => e.type === 'score').map(e => e.id), observation: 'accepted-score-only' });
}

export function factsValid(facts, game) {
  if (facts.gameId !== game.id) return false;
  const index = game.events.findIndex(e => e.id === facts.eventId);
  if (index < 0) return false;
  const original = game.events[index];
  const target = original.type === 'score-correction' ? original.target : original.id;
  return !game.events.slice(index + 1).some(e => ['score-undo', 'score-correction'].includes(e.type) && (e.target === target || facts.scoreDependencies.includes(e.target)));
}



