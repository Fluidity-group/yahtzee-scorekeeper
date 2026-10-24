const mechanisms = ['misdirection', 'understatement', 'absurd-stakes', 'reversal'];
const premises = ['dynasty', 'bureaucracy', 'luxury', 'space-mission'];
const normalized = text => text.normalize('NFKC').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
export class ExposureMemory {
  constructor() { this.records = new Map(); this.ratings = new Map(); }
  generated(line, audience) {
    if (this.records.has(line.id)) return false;
    if (!mechanisms.includes(line.mechanism) || !premises.includes(line.premise) || !audience.length || new Set(audience).size !== audience.length) throw new Error('Controlled metadata and unique audience required.');
    this.records.set(line.id, { line: structuredClone(line), audience: [...audience], status: 'generated', epoch: null, heardBy: [] });
    return true;
  }
  exposure(id, status, epoch, heardBy = []) {
    const record = this.records.get(id);
    if (!record) throw new Error('Unknown line.');
    if (record.status === status && record.epoch === epoch) return false;
    if (!Number.isSafeInteger(epoch) || epoch < 1 || heardBy.some(id => !record.audience.includes(id))) throw new Error('Invalid playback audience/epoch.');
    const allowed = record.status === 'generated' ? ['started', 'failed'] : record.status === 'started' ? ['completed', 'interrupted', 'failed'] : [];
    if (!allowed.includes(status) || (record.epoch !== null && record.epoch !== epoch)) throw new Error('Invalid exposure transition.');
    Object.assign(record, { status, epoch, heardBy: [...new Set([...record.heardBy, ...heardBy])] });
    return true;
  }
  context(audience, authorizedSourceIds = [], profile = null) {
    const exposed = [...this.records.values()].filter(r => r.heardBy.some(id => audience.includes(id)));
    return {
      // Only controlled tags cross audience boundaries, never private transcript/facts.
      avoidPremises: [...new Set(exposed.map(r => r.line.premise))],
      callbacks: exposed.filter(r => profile && r.line.humorIntensity === profile.humorIntensity && (profile.profanityAllowed || !r.line.containsProfanity) && r.status === 'completed' && r.line.valid !== false && authorizedSourceIds.includes(r.line.gameId) && audience.every(id => r.audience.includes(id) && r.heardBy.includes(id))).map(r => structuredClone(r.line)),
    };
  }
  repeats(text, premise, audience) {
    return [...this.records.values()].some(r => r.heardBy.some(id => audience.includes(id)) && (normalized(r.line.text) === normalized(text) || r.line.premise === premise));
  }
  invalidateEvent(gameId, eventId) {
    for (const record of this.records.values()) if (record.line.gameId === gameId && record.line.eventId === eventId) record.line.valid = false;
  }
  rate(id, accountId, rating) {
    const record = this.records.get(id);
    if (!record?.heardBy.includes(accountId) || !['funny', 'missed', 'too-far'].includes(rating)) throw new Error('Feedback requires an exposed listener.');
    this.ratings.set(`${id}:${accountId}`, { id, accountId, rating, mechanism: record.line.mechanism });
  }
  forget(accountId) {
    const removed = new Set();
    for (const [id, record] of this.records) if (record.audience.includes(accountId)) { this.records.delete(id); removed.add(id); }
    for (const [key, rating] of this.ratings) if (rating.accountId === accountId || removed.has(rating.id)) this.ratings.delete(key);
  }
}
export function syntheticLine(facts, profile, sequence = 0) {
  if (facts.eventType === 'score-correction' || (facts.eventType === 'final-chain-roll' && facts.value === 0)) return null;
  if (profile.frequency === 'highlights' && !facts.complete && !facts.finalChain && facts.category !== 'yahtzee' && facts.value < 30) return null;
  const mechanism = mechanisms[sequence % mechanisms.length], premise = premises[Math.floor(sequence / mechanisms.length) % premises.length];
  const endings = {
    dynasty: { playful: 'A dynasty. The crown is still on back order.', savage: 'A dynasty built on a very small spreadsheet.', dark: 'The dynasty has made excellent funeral arrangements.' },
    bureaucracy: { playful: 'The paperwork is becoming suspiciously impressive.', savage: 'Bureaucracy finally found a use for this box.', dark: 'The paperwork will outlive every ambition at this table.' },
    luxury: { playful: 'The luxury resort has added a folding chair.', savage: 'Five-star ambition. One-star accommodation.', dark: 'The luxury resort now offers complimentary despair.' },
    'space-mission': { playful: 'Mission control has cautiously opened the biscuits.', savage: 'Mission control would like its funding back.', dark: 'Mission control has upgraded the emergency to a lifestyle.' },
  };
  const announcement = facts.eventType === 'final-chain-end'
    ? (facts.complete ? 'The game is complete.' : `${facts.label}'s final bonus attempt ended.`)
    : ['bonus', 'final-chain-roll'].includes(facts.eventType)
      ? `${facts.label} recorded ${facts.value} bonus points.`
      : `${facts.label} scored ${facts.value} in ${facts.category}.`;
  const text = `${announcement} ${endings[premise][profile.humorIntensity]}`;
  return { id: `${facts.gameId}:${facts.eventId}:${profile.version}`, gameId: facts.gameId, eventId: facts.eventId, profileVersion: profile.version, humorIntensity: profile.humorIntensity, containsProfanity: false, text, mechanism, premise, valid: true, synthetic: true };
}





