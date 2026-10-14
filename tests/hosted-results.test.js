import { describe, it, expect } from 'vitest';
import { createCoreGame } from '../src/game/core.js';
import { BASE_KEYS } from '../src/game/categories.js';
import { renderHostedResults, hostedResultHighlights } from '../src/ui/hosted-results.js';

function fixture() {
 const game = createCoreGame({ names: ['Amber', 'Keith'], id: 'game' });
 game.players[0].id = 'account-a'; game.players[1].id = 'account-b';
 game.status = 'finished'; game.revision = 26;
 game.sheets = [Object.fromEntries(BASE_KEYS.map(key => [key, 0])), Object.fromEntries(BASE_KEYS.map(key => [key, 0]))];
 game.sheets[0].largeStraight = 40;
 return { game, members: [{ userId: 'account-a' }, { userId: 'account-b' }], capabilities: { rematch: true }, rematch: { gameId: 'game', gameRevision: 26, ready: [] } };
}
describe('hosted finished-game results', () => {
 it('renders only finished shared games, preserves final names and scorecard facts', () => {
  const room = fixture();
  expect(renderHostedResults({ room, userId: 'account-a' })).toContain('Amber wins!');
  expect(hostedResultHighlights(room.game)[0].detail).toBe('Amber finished 40 points ahead.');
  room.game.status = 'active';
  expect(renderHostedResults({ room })).toBe('');
  expect(renderHostedResults()).toBe('');
 });
 it('escapes names in results, highlights, waiting and starter text', () => {
  const room = fixture(); room.game.players[0].name = '<img src=x onerror="x">';
  room.nextStarterId = 'account-a'; room.rematch.ready = ['account-b'];
  const html = renderHostedResults({ room, userId: 'account-b' });
  expect(html).not.toContain('<img'); expect(html).toContain('&lt;img src=x onerror=&quot;x&quot;&gt;');
  expect(html).toContain('starts the next game.');
 });
 it('shows shared zero-score victory without claiming an unresolved starter or winning margin', () => {
  const room = fixture(); room.game.sheets[0].largeStraight = 0;
  const html = renderHostedResults({ room, userId: 'account-a' });
  expect(html).toContain('A shared victory'); expect(html).not.toContain('starts the next');
  expect(hostedResultHighlights(room.game).some(item => item.title === 'Winning margin')).toBe(false);
  expect(html).toContain('13 zero-scoring categories');
 });
 it('uses current own-account readiness and never grants outsider controls', () => {
  const room = fixture(); room.rematch.ready = ['account-b'];
  expect(renderHostedResults({ room, userId: 'account-a' })).toContain('data-action="rematch-ready"');
  expect(renderHostedResults({ room, userId: 'account-b' })).toContain('data-action="rematch-withdraw"');
  expect(renderHostedResults({ room, userId: 'outsider' })).not.toContain('data-action="rematch-');
  room.rematch.gameRevision = 25;
  expect(renderHostedResults({ room, userId: 'account-b' })).toContain('data-action="rematch-ready"');
  expect(renderHostedResults({ room, userId: 'account-b' })).not.toContain('✓ Ready');
 });
 it('disables disconnected or pending actions and explains update-required capability', () => {
  const room = fixture();
  expect(renderHostedResults({ room, userId: 'account-a', connected: false })).toContain('disabled>Play again');
  expect(renderHostedResults({ room, userId: 'account-a', connected: false })).toContain('Reconnecting');
  expect(renderHostedResults({ room, userId: 'account-a', busy: true })).toContain('Saving your readiness');
  room.capabilities.rematch = false;
  const html = renderHostedResults({ room, userId: 'account-a' });
  expect(html).toContain('update is required'); expect(html).not.toContain('data-action="rematch-');
 });
 it('shows complete-scorecard bonus and scratches facts only with explicit game scope', () => {
  const room = fixture(); Object.assign(room.game.sheets[0], { aces:3, twos:6, threes:9, fours:12, fives:15, sixes:18 });
  const highlights = hostedResultHighlights(room.game);
  expect(highlights).toHaveLength(3);
  expect(highlights[1].detail).toContain('+35 upper bonus');
  expect(renderHostedResults({ room })).toContain('THIS GAME');
  delete room.game.sheets[1].aces;
  expect(hostedResultHighlights(room.game).some(item => item.title === 'Fewest scratches')).toBe(false);
 });
});
