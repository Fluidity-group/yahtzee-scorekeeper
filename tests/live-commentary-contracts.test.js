import { describe, it, expect } from 'vitest';
import { createCoreGame, command } from '../src/game/core.js';
import { acceptedFacts, factsValid } from '../src/commentary/facts.js';
import { createProfile, updateProfile } from '../src/commentary/profiles.js';
import { ExposureMemory, syntheticLine } from '../src/commentary/memory.js';
import { CommentaryJobs } from '../src/commentary/jobs.js';
const accounts = Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
const time = '2026-10-14T18:00:00.000Z';
let sequence = 0;
const act = (game, type, data = {}) => command(game, { type, seat: game.activeSeat, ...data }, { id: `c${++sequence}`, time });
const profile = () => createProfile({ profanityAllowed: false, humorIntensity: 'dark', frequency: 'lively' });
function fixture() {
  let game = createCoreGame({ id: `g${++sequence}`, names: ['Private Alice', 'Private Bob'], source: 'manual', time });
  game = act(act(game, 'start'), 'score', { category: 'chance', value: 25 });
  const facts = acceptedFacts(game, game.events.at(-1).id, accounts.slice(0, 2));
  const memory = new ExposureMemory(), jobs = new CommentaryJobs(memory), settings = profile();
  const id = jobs.enqueue(facts, settings, { live: true, audience: accounts.slice(0, 2) });
  jobs.generate(id, syntheticLine(facts, settings));
  return { game, facts, memory, jobs, settings, id, context: { game, profile: settings, now: Date.parse(time), owner: accounts[0], lease: { owner: accounts[0], epoch: 1 } } };
}
describe('accepted commentary facts', () => {
  it('uses UUID ownership and anonymous labels without physical-roll/time claims', () => {
    const f = fixture();
    expect(f.facts.label).toBe('Player A'); expect(f.facts.accountId).toBe(accounts[0]);
    expect(f.facts.seats.map(s => s.total)).toEqual([25, 0]);
    expect(JSON.stringify(f.facts)).not.toMatch(/Private Alice|Private Bob|dice|decision|duration/);
    expect(f.facts.observation).toBe('accepted-score-only');
    expect(() => acceptedFacts(f.game, f.facts.eventId, ['Alice', 'Bob'])).toThrow('UUID');
  });
  it('distinguishes failed chain reports, successful bonus, final closure and actual zero score', () => {
    const f = fixture();
    expect(syntheticLine({ ...f.facts, eventType: 'final-chain-roll', value: 0 }, f.settings)).toBeNull();
    expect(syntheticLine({ ...f.facts, eventType: 'final-chain-roll', value: 100 }, f.settings).text).toContain('100 bonus points');
    expect(syntheticLine({ ...f.facts, eventType: 'final-chain-end', complete: false }, f.settings).text).toContain('final bonus attempt ended');
    const ended = syntheticLine({ ...f.facts, eventType: 'final-chain-end', complete: true }, f.settings).text;
    expect(ended).toContain('The game is complete.'); expect(ended).not.toMatch(/winner|0 points/);
    expect(syntheticLine({ ...f.facts, value: 0 }, f.settings).text).toContain('scored 0 in chance');
  });
  it('explicitly suppresses total, bonus and lead facts when totals are hidden', () => {
    const f = fixture(), hidden = { ...f.game, hideTotals: true };
    const facts = acceptedFacts(hidden, f.facts.eventId, accounts.slice(0, 2));
    expect(facts.disclosurePolicy).toBe('category-scores-only'); expect(facts.leaders).toEqual([]); expect(facts.tied).toBeNull();
    expect(facts.seats.every(s => !('total' in s) && !('upperBonus' in s))).toBe(true);
    expect(syntheticLine(facts, f.settings).text).not.toMatch(/lead|total|bonus/i);
  });
  it('does not derive old event totals from a later accepted snapshot', () => {
    const f = fixture(), newer = act(act(f.game, 'start'), 'score', { category: 'chance', value: 25 });
    expect(() => acceptedFacts(newer, f.facts.eventId, accounts.slice(0, 2))).toThrow('snapshot');
    const facts = acceptedFacts(newer, newer.events.at(-1).id, accounts.slice(0, 2));
    expect(facts.tied).toBe(true); expect(facts.leaders).toEqual(accounts.slice(0, 2));
    expect(factsValid(f.facts, newer)).toBe(true);
  });
  it('invalidates snapshot total claims when another earlier score is corrected', () => {
    const f = fixture(), next = act(act(f.game, 'start'), 'score', { category: 'chance', value: 20 });
    const facts = acceptedFacts(next, next.events.at(-1).id, accounts.slice(0, 2));
    const corrected = act(next, 'correct-score', { seat: 0, target: f.facts.eventId, value: 15 });
    expect(factsValid(facts, corrected)).toBe(false);
    expect(Object.isFrozen(facts.seats[0])).toBe(true);
  });
  it('invalidates original and superseded correction claims without mutating score history', () => {
    const f = fixture(), corrected = act(f.game, 'correct-score', { seat: 0, target: f.facts.eventId, value: 20 });
    expect(factsValid(f.facts, corrected)).toBe(false);
    const correction = acceptedFacts(corrected, corrected.events.at(-1).id, accounts.slice(0, 2));
    expect(correction.seats[0].total).toBe(20); expect(syntheticLine(correction, f.settings)).toBeNull();
    const next = act(corrected, 'correct-score', { seat: 0, target: f.facts.eventId, value: 18 });
    expect(factsValid(correction, next)).toBe(false); expect(f.game.sheets[0].chance).toBe(25);
  });
});
describe('local job lifecycle', () => {
  it('is quiet on hydration/reload and idempotent across retry and profile changes', () => {
    const f = fixture(); expect(f.jobs.enqueue(f.facts, f.settings)).toBeNull();
    expect(f.jobs.enqueue(f.facts, updateProfile(f.settings, { frequency: 'balanced' }), { live: true, audience: accounts.slice(0, 2) })).toBeNull();
    expect(f.jobs.generate(f.id, syntheticLine(f.facts, f.settings))).toBe(false);
    expect(f.jobs.start(f.id, f.context, [accounts[0]])).toBe(true);
    expect(f.jobs.start(f.id, f.context, [accounts[0]])).toBe(false);
    expect(f.jobs.finish(f.id, { owner: accounts[0], epoch: 1 }, [accounts[0]])).toBe(true);
    expect(f.jobs.finish(f.id, { owner: accounts[0], epoch: 1 }, [accounts[0]])).toBe(false);
  });
  it('rejects changed candidates on retry and incompatible fixture language', () => {
    const f = fixture(), line = syntheticLine(f.facts, f.settings);
    f.jobs.failure(f.id);
    expect(() => f.jobs.generate(f.id, { ...line, text: 'A different candidate.' })).toThrow('preserve');
    const flagged = fixture();
    flagged.jobs.jobs.get(flagged.id).line.containsProfanity = true;
    expect(flagged.jobs.start(flagged.id, flagged.context, [accounts[0]])).toBe(false);
    expect(flagged.jobs.jobs.get(flagged.id).reason).toBe('profile-changed');
  });
  it('clears queued/playback caches on forgetting without replaying consumed events', () => {
    const f = fixture(), snapshot = JSON.stringify(f.game);
    f.jobs.start(f.id, f.context, accounts.slice(0, 2));
    f.memory.rate(f.id, accounts[0], 'funny');
    f.jobs.forget(accounts[0]);
    expect(f.jobs.jobs.size).toBe(0); expect(f.memory.records.size).toBe(0); expect(f.memory.ratings.size).toBe(0);
    expect(f.jobs.enqueue(f.facts, f.settings, { live: true, audience: accounts.slice(0, 2) })).toBeNull();
    expect(JSON.stringify(f.game)).toBe(snapshot);
  });
  it('cancels old-game pending/playing lines on game switch while preserving actual exposure and authorized completed callbacks', () => {
    const pending = fixture(), playing = fixture(), completed = fixture(), newGame = fixture().game;
    playing.jobs.start(playing.id, playing.context, accounts.slice(0, 2));
    completed.jobs.start(completed.id, completed.context, accounts.slice(0, 2));
    completed.jobs.finish(completed.id, { owner: accounts[0], epoch: 1 }, accounts.slice(0, 2));
    for (const f of [pending, playing, completed]) f.jobs.revalidate({ ...f.context, game: newGame });
    expect(pending.jobs.jobs.get(pending.id)).toMatchObject({ status: 'cancelled', reason: 'game-changed' });
    expect(playing.jobs.jobs.get(playing.id)).toMatchObject({ status: 'cancelled', reason: 'game-changed' });
    expect(playing.memory.records.get(playing.id)).toMatchObject({ status: 'interrupted', heardBy: accounts.slice(0, 2) });
    expect(completed.memory.context(accounts.slice(0, 2), [completed.game.id], completed.settings).callbacks).toHaveLength(1);
  });
  it('interrupts an owner change even when the lease epoch is accidentally reused', () => {
    const f = fixture();
    f.jobs.start(f.id, f.context, accounts.slice(0, 2));
    f.jobs.revalidate({ ...f.context, owner: accounts[1], lease: { owner: accounts[1], epoch: 1 } });
    expect(f.jobs.jobs.get(f.id)).toMatchObject({ status: 'cancelled', reason: 'playback-owner' });
    expect(f.jobs.finish(f.id, { owner: accounts[0], epoch: 1 }, [accounts[0]])).toBe(false);
    expect(f.memory.records.get(f.id).status).toBe('interrupted');
  });
  it('bounds failed attempts and allows one successful retry', () => {
    const f = fixture(), jobs = new CommentaryJobs(f.memory);
    const id = jobs.enqueue(f.facts, f.settings, { live: true, audience: accounts.slice(0, 2) });
    jobs.failure(id); expect(jobs.jobs.get(id).status).toBe('retry');
    jobs.failure(id); expect(jobs.jobs.get(id).status).toBe('failed');
    expect(jobs.generate(id, syntheticLine(f.facts, f.settings))).toBe(false);
    const another = new CommentaryJobs(new ExposureMemory()), next = another.enqueue(f.facts, f.settings, { live: true, audience: accounts.slice(0, 2) });
    another.failure(next); expect(another.generate(next, syntheticLine(f.facts, f.settings))).toBe(true);
  });
  it.each(['stale', 'paused', 'owner', 'profile'])('refuses %s output before playback', reason => {
    const f = fixture(); const c = { ...f.context };
    if (reason === 'stale') c.now += 15001;
    if (reason === 'paused') c.paused = true;
    if (reason === 'owner') c.owner = accounts[1];
    if (reason === 'profile') c.profile = updateProfile(f.settings, { profanityAllowed: true });
    expect(f.jobs.start(f.id, c, [accounts[0]])).toBe(false); expect(f.jobs.jobs.get(f.id).status).toBe('cancelled');
    expect(f.memory.context(accounts.slice(0, 2), [f.game.id]).callbacks).toEqual([]);
  });
  it('interrupts Undo/profile/lease changes but ordinary later scores do not stop accurate speech', () => {
    const f = fixture(); f.jobs.start(f.id, f.context, accounts.slice(0, 2));
    const newer = act(act(f.game, 'start'), 'score', { category: 'chance', value: 10 });
    f.jobs.revalidate({ ...f.context, game: newer, now: Date.parse(time) + 16000 });
    expect(f.jobs.jobs.get(f.id).status).toBe('started');
    f.jobs.revalidate({ ...f.context, profile: updateProfile(f.settings, { profanityAllowed: false }) });
    expect(f.memory.records.get(f.id).status).toBe('interrupted'); expect(f.jobs.jobs.get(f.id).line).toBeNull();
    const u = fixture(); u.jobs.start(u.id, u.context, accounts.slice(0, 2));
    const undone = act(u.game, 'undo-score', { seat: 0, target: u.facts.eventId });
    u.jobs.revalidate({ ...u.context, game: undone });
    expect(u.memory.records.get(u.id)).toMatchObject({ status: 'interrupted', line: { valid: false } });
    expect(u.memory.context(accounts.slice(0, 2), [u.game.id]).callbacks).toEqual([]);
    const l = fixture(); l.jobs.start(l.id, l.context, [accounts[0]]);
    l.jobs.revalidate({ ...l.context, lease: { owner: accounts[0], epoch: 2 } });
    expect(l.jobs.finish(l.id, { owner: accounts[0], epoch: 1 }, [accounts[0]])).toBe(false);
  });
});
describe('exposure and audience memory', () => {
  it('requires completed, heard, authorized source context for callbacks', () => {
    const f = fixture(), audience = accounts.slice(0, 2);
    expect(f.memory.context(audience, [f.game.id], f.settings).callbacks).toEqual([]);
    f.jobs.start(f.id, f.context, audience);
    expect(f.memory.context(audience, [f.game.id], f.settings).callbacks).toEqual([]);
    f.jobs.finish(f.id, { owner: accounts[0], epoch: 1 }, audience);
    expect(f.memory.context(audience, [f.game.id], f.settings).callbacks).toHaveLength(1);
    expect(f.memory.context(audience, [], f.settings).callbacks).toEqual([]);
    const overlap = f.memory.context([accounts[0], accounts[2]], [f.game.id], f.settings);
    expect(overlap.callbacks).toEqual([]); expect(overlap.avoidPremises).toEqual(['dynasty']);
    expect(JSON.stringify(overlap)).not.toContain('recorded');
    expect(f.memory.context([accounts[2], accounts[3]], [f.game.id]).avoidPremises).toEqual([]);
  });
  it('requires explicit language policy for raw callback text and clears completed playback caches on profile switch', () => {
    const f = fixture(), audience = accounts.slice(0, 2);
    f.jobs.start(f.id, f.context, audience); f.jobs.finish(f.id, { owner: accounts[0], epoch: 1 }, audience);
    expect(f.memory.context(audience, [f.game.id]).callbacks).toEqual([]);
    f.memory.records.get(f.id).line.containsProfanity = true;
    expect(f.memory.context(audience, [f.game.id], f.settings).callbacks).toEqual([]);
    expect(f.memory.context(audience, [f.game.id], updateProfile(f.settings, { profanityAllowed: true })).callbacks).toHaveLength(1);
    f.jobs.revalidate({ ...f.context, profile: updateProfile(f.settings, { profanityAllowed: false }) });
    expect(f.jobs.jobs.get(f.id)).toMatchObject({ status: 'completed', line: null });
    expect(f.memory.records.get(f.id).status).toBe('completed');
  });
  it('does not expose a raw dark callback after intensity changes to playful', () => {
    const f = fixture(), audience = accounts.slice(0, 2);
    f.jobs.start(f.id, f.context, audience); f.jobs.finish(f.id, { owner: accounts[0], epoch: 1 }, audience);
    const lighter = updateProfile(f.settings, { humorIntensity: 'playful' });
    const context = f.memory.context(audience, [f.game.id], lighter);
    expect(context.callbacks).toEqual([]); expect(context.avoidPremises).toEqual(['dynasty']);
    expect(f.memory.context(audience, [f.game.id], f.settings).callbacks).toHaveLength(1);
  });
  it('rejects unexposed ratings and outsider acknowledgments and clears derived memory only', () => {
    const f = fixture(); const before = JSON.stringify(f.game);
    expect(() => f.memory.rate(f.id, accounts[0], 'funny')).toThrow('exposed');
    expect(() => f.memory.exposure(f.id, 'started', 1, [accounts[2]])).toThrow('audience');
    f.jobs.start(f.id, f.context, [accounts[0]]);
    f.memory.rate(f.id, accounts[0], 'funny'); expect(f.memory.ratings.size).toBe(1);
    expect(f.settings.humorIntensity).toBe('dark'); expect(f.settings.profanityAllowed).toBe(false);
    f.memory.forget(accounts[0]); expect(f.memory.records.size).toBe(0); expect(f.memory.ratings.size).toBe(0);
    expect(JSON.stringify(f.game)).toBe(before);
  });
  it('uses premise tags to suppress paraphrases and counts interrupted exposure', () => {
    const f = fixture(); f.jobs.start(f.id, f.context, [accounts[0]]);
    f.jobs.revalidate({ ...f.context, paused: true });
    expect(f.memory.repeats('An entirely different dynasty punchline.', 'dynasty', [accounts[0]])).toBe(true);
    expect(f.memory.repeats('An entirely different dynasty punchline.', 'dynasty', [accounts[2]])).toBe(false);
  });
  it('keeps profanity/intensity/frequency independent and rejects implicit defaults', () => {
    expect(profile()).toMatchObject({ profanityAllowed: false, humorIntensity: 'dark', frequency: 'lively' });
    expect(updateProfile(profile(), { profanityAllowed: true, humorIntensity: 'playful' })).toMatchObject({ version: 2, profanityAllowed: true, humorIntensity: 'playful', frequency: 'lively' });
    expect(() => createProfile({})).toThrow('settings');
  });
});





