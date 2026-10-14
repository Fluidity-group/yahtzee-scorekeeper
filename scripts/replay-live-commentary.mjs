import assert from 'node:assert/strict';
import { createCoreGame, command } from '../src/game/core.js';
import { BASE_KEYS } from '../src/game/categories.js';
import { acceptedFacts } from '../src/commentary/facts.js';
import { createProfile, updateProfile } from '../src/commentary/profiles.js';
import { ExposureMemory, syntheticLine } from '../src/commentary/memory.js';
import { CommentaryJobs } from '../src/commentary/jobs.js';

// No keys, provider calls, durable identities or live games. Authored synthetic fixtures.
export function runReplay() {
  const accounts = Array.from({ length: 16 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
  const memory = new ExposureMemory(), reports = [];
  let sequence = 0, milliseconds = Date.parse('2026-10-14T18:00:00Z');
  const act = (g, type, extra = {}) => command(g, { type, seat: g.activeSeat, ...extra }, { id: `replay-${++sequence}`, time: new Date(milliseconds += 1000).toISOString() });
  let settings = createProfile({ profanityAllowed: false, humorIntensity: 'dark', frequency: 'lively' });
  for (let round = 0; round < 12; round++) {
    const count = [2, 4, 8][round % 3], competition = round % 2 === 1;
    const audience = accounts.slice(round % 4 === 3 ? 8 : round % 4 === 2 ? 1 : 0, (round % 4 === 3 ? 8 : round % 4 === 2 ? 1 : 0) + count);
    let game = createCoreGame({ id: `synthetic-${round}`, names: audience.map((_, i) => `Fixture ${i}`), mode: competition ? 'competition' : 'standard', rulesVersion: competition ? 2 : 1, source: 'manual', time: new Date(milliseconds).toISOString() });
    const jobs = new CommentaryJobs(memory), report = { gameId: game.id, players: count, mode: game.mode, rulesVersion: game.rules.version, accepted: 0, completed: 0, interrupted: 0, silentRepeats: 0, corrections: 0, undos: 0, finalChainSuccesses: 0, ties: 0 };
    const process = () => {
      for (const event of game.events.filter(e => e.commandId === game.events.at(-1).commandId)) {
        const facts = acceptedFacts(game, event.id, audience); if (!facts) continue;
        report.accepted++; if (facts.tied) report.ties++;
        const id = jobs.enqueue(facts, settings, { live: true, audience });
        assert.ok(id); assert.equal(jobs.enqueue(facts, settings, { live: true, audience }), null);
        let line = syntheticLine(facts, settings, sequence);
        if (line && memory.repeats(line.text, line.premise, audience)) { line = null; report.silentRepeats++; }
        jobs.generate(id, line); if (!line) continue;
        const context = { game, profile: settings, now: milliseconds, owner: audience[0], lease: { owner: audience[0], epoch: 1 } };
        assert.equal(jobs.start(id, context, audience), true);
        if (report.accepted === 2 || report.accepted % 9 === 0) {
          settings = updateProfile(settings, { profanityAllowed: !settings.profanityAllowed });
          jobs.revalidate({ ...context, profile: settings }); report.interrupted++;
        } else { assert.equal(jobs.finish(id, { owner: audience[0], epoch: 1 }, audience), true); report.completed++; }
      }
    };
    // A real accepted Standard Undo and replacement before another score.
    if (!competition) {
      game = act(act(game, 'start'), 'score', { category: 'chance', value: 10 }); process();
      const target = game.events.at(-1).id;
      game = act(game, 'undo-score', { seat: 0, target }); report.undos++;
      jobs.revalidate({ game, profile: settings, now: milliseconds, owner: audience[0], lease: { owner: audience[0], epoch: 1 } });
      assert.equal(memory.records.get(`${game.id}:${target}:${jobs.jobs.values().next().value.profileVersion}`)?.line.valid ?? false, false);
    }
    while (game.status === 'active') {
      if (game.finalChain) {
        if (!game.turn) game = act(game, 'start');
        const success = game.finalChain.attempt === 1 && game.turn.manualRolls.length === 1;
        game = act(game, 'final-chain-roll', { face: success ? 6 : null });
        if (success) report.finalChainSuccesses++;
        process(); continue;
      }
      const category = [...BASE_KEYS.filter(k => k !== 'yahtzee'), 'yahtzee'].find(k => game.sheets[game.activeSeat][k] === undefined);
      game = act(act(game, 'start'), 'score', { category, value: category === 'yahtzee' ? 50 : 0 }); process();
      if (category === 'aces' && report.corrections === 0) {
        const target = game.events.at(-1), scoreSeat = target.seat;
        game = act(game, 'correct-score', { seat: scoreSeat, target: target.id, value: 1 }); report.corrections++;
        process(); jobs.revalidate({ game, profile: settings, now: milliseconds, owner: audience[0], lease: { owner: audience[0], epoch: 1 } });
      }
    }
    assert.equal(game.status, 'finished'); assert.equal(game.sheets.every(s => BASE_KEYS.every(k => s[k] !== undefined)), true);
    if (competition) assert.equal(report.finalChainSuccesses, count);
    const originalGame = JSON.stringify(game), privateOverlap = memory.context([audience[0], accounts[15]], [game.id], settings);
    assert.equal(privateOverlap.callbacks.length, 0);
    assert.equal(JSON.stringify(privateOverlap).includes('recorded'), false);
    if (round === 11) { jobs.forget(audience[0]); assert.equal(memory.context(audience, [game.id], settings).callbacks.length, 0); assert.equal(JSON.stringify(game), originalGame); }
    reports.push(report);
  }
  return { synthetic: true, games: reports.length, rosters: [2, 4, 8], providerCalls: 0, durableWrites: 0, reports, limitations: ['Authored local lines; no AI writing or listening quality evidence.', 'In-memory contracts; no durable queue, authentication or provider integration.', 'Controlled premise-tag suppression only; no semantic classifier.', 'No device audio or measured latency; no retention policy selected.'] };
}
if (process.argv[1]?.endsWith('replay-live-commentary.mjs')) console.log(JSON.stringify(runReplay(), null, 2));



