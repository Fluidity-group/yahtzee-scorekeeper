import { factsValid } from './facts.js';
import { fixtureLineCompatible } from './profiles.js';

// Local contract rehearsal only: not a durable queue, authentication service or lease.
export class CommentaryJobs {
  constructor(memory, { maxAgeMs = 15000, maxAttempts = 2 } = {}) {
    if (!(maxAgeMs > 0) || !Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error('Bounded job limits required.');
    this.memory = memory; this.maxAgeMs = maxAgeMs; this.maxAttempts = maxAttempts;
    this.jobs = new Map(); this.seenEvents = new Set();
  }
  enqueue(facts, profile, { live = false, audience = [] } = {}) {
    const eventKey = `${facts.gameId}:${facts.eventId}`;
    if (!live || this.seenEvents.has(eventKey)) return null; // hydration/reload is deliberately quiet
    this.seenEvents.add(eventKey);
    const id = `${eventKey}:${profile.version}`;
    const job = { id, facts: structuredClone(facts), profileVersion: profile.version, audience: [...audience], status: 'pending', attempts: 0, line: null, playback: null };
    this.jobs.set(id, job); return id;
  }
  generate(id, line) {
    const job = this.jobs.get(id);
    if (!job || !['pending', 'retry'].includes(job.status)) return false;
    job.attempts++;
    if (!line) { job.status = 'silent'; return true; }
    if (line.gameId !== job.facts.gameId || line.eventId !== job.facts.eventId || line.profileVersion !== job.profileVersion || line.id !== job.id) throw new Error('Line must match its grounded job.');
    if (job.line && JSON.stringify(job.line) !== JSON.stringify(line)) throw new Error('Retry must preserve the generated candidate.');
    this.memory.generated(line, job.audience);
    job.line = structuredClone(line); job.status = 'ready'; return true;
  }
  failure(id) {
    const job = this.jobs.get(id);
    if (!job || !['pending', 'retry', 'ready'].includes(job.status)) return false;
    // A future durable worker must persist this attempt counter atomically.
    if (job.status !== 'ready') job.attempts++;
    job.status = job.attempts < this.maxAttempts ? 'retry' : 'failed'; return true;
  }
  eligibility(job, { game, profile, now, paused = false, owner, lease }) {
    if (!factsValid(job.facts, game)) return 'invalid-event';
    if (job.profileVersion !== profile.version || (job.line && !fixtureLineCompatible(job.line, profile))) return 'profile-changed';
    if (paused) return 'paused';
    if (!lease || lease.owner !== owner || !Number.isSafeInteger(lease.epoch) || lease.epoch < 1) return 'playback-owner';
    const age = now - Date.parse(job.facts.acceptedAt);
    if (!Number.isFinite(age) || age < 0 || age > this.maxAgeMs) return 'stale';
    return null;
  }
  start(id, context, heardBy = []) {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'ready') return false;
    const reason = this.eligibility(job, context);
    if (reason) { this.cancel(job, reason); return false; }
    this.memory.exposure(job.line.id, 'started', context.lease.epoch, heardBy);
    job.playback = { owner: context.owner, epoch: context.lease.epoch }; job.status = 'started'; return true;
  }
  finish(id, playback, heardBy = []) {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'started' || playback.owner !== job.playback.owner || playback.epoch !== job.playback.epoch) return false;
    this.memory.exposure(job.line.id, 'completed', playback.epoch, heardBy); job.status = 'completed'; return true;
  }
  cancel(job, reason) {
    if (reason === 'invalid-event') this.memory.invalidateEvent(job.facts.gameId, job.facts.eventId);
    if (job.status === 'started') this.memory.exposure(job.line.id, 'interrupted', job.playback.epoch);
    job.status = 'cancelled'; job.reason = reason; job.line = null;
  }
  forget(accountId) {
    for (const [id, job] of this.jobs) if (job.audience.includes(accountId)) {
      if (['pending', 'retry', 'ready', 'started'].includes(job.status)) this.cancel(job, 'history-forgotten');
      this.jobs.delete(id);
    }
    this.memory.forget(accountId);
  }
  revalidate(context) {
    for (const job of this.jobs.values()) {
      if (job.facts.gameId !== context.game.id) {
        if (['pending', 'retry', 'ready', 'started'].includes(job.status)) this.cancel(job, 'game-changed');
        continue;
      }
      if (!factsValid(job.facts, context.game)) this.memory.invalidateEvent(job.facts.gameId, job.facts.eventId);
      if (!['pending', 'retry', 'ready', 'started'].includes(job.status)) {
        if (job.profileVersion !== context.profile.version) job.line = null;
        continue;
      }
      let reason = this.eligibility(job, context);
      // Let an accurate sentence finish across ordinary scoring and time passing.
      if (job.status === 'started' && reason === 'stale') reason = null;
      if (job.status === 'started' && (job.playback.epoch !== context.lease?.epoch || job.playback.owner !== context.lease?.owner || job.playback.owner !== context.owner)) reason = 'playback-owner';
      if (reason) this.cancel(job, reason);
    }
  }
}





