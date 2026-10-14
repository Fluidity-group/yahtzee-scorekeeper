import { it, expect } from 'vitest';
import { runReplay } from '../scripts/replay-live-commentary.mjs';
it('replays twelve fresh complete games with 2/4/8 seats, Competition final chains, corrections, Undo and audience privacy', () => {
  const result = runReplay();
  expect(result.games).toBe(12); expect(result.providerCalls).toBe(0);
  expect(new Set(result.reports.map(r => r.players))).toEqual(new Set([2, 4, 8]));
  expect(result.reports.filter(r => r.mode === 'competition').every(r => r.rulesVersion === 2 && r.finalChainSuccesses === r.players)).toBe(true);
  expect(result.reports.filter(r => r.mode === 'standard').every(r => r.undos === 1)).toBe(true);
  expect(result.reports.every(r => r.corrections === 1)).toBe(true);
  expect(result.reports.reduce((sum, r) => sum + r.silentRepeats, 0)).toBeGreaterThan(0);
});
