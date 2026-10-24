// Vendor-independent boundary. Transport adapters emit normalized events;
// readings never become game rolls without explicit acceptance.
export class DiceCapture {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.devices = new Map();
    this.turn = null;
    this.sequence = 0;
    this.log = [];
  }

  record(type, data = {}) {
    const event = { sequence: ++this.sequence, time: this.now(), type, ...data };
    this.log.push(event);
    if (this.log.length > 500) this.log.shift();
    return event;
  }

  connect(id) {
    if (!id) throw new Error('Device ID required.');
    if (!this.devices.has(id) && this.devices.size === 5) throw new Error('This set already has five dice.');
    const epoch = (this.devices.get(id)?.epoch || 0) + 1;
    this.devices.set(id, { id, epoch, connected: true, face: null, state: 'unknown', updated: 0 });
    this.record('connected', { id, epoch });
    if (this.turn) this.pause('Connection changed. Start a fresh capture.');
    return epoch;
  }

  disconnect(id, epoch) {
    const die = this.devices.get(id);
    if (!die || die.epoch !== epoch) return;
    die.connected = false;
    die.face = null;
    die.state = 'disconnected';
    this.record('disconnected', { id, epoch });
    if (this.turn) this.pause('A die disconnected. Reconnect or finish manually.');
  }

  start({ turnId, playerId, limit = 3 }) {
    if (this.turn) throw new Error('End the current capture first.');
    if (!turnId || !playerId || ![3, 4].includes(limit)) throw new Error('Invalid turn context.');
    if (this.devices.size !== 5 || [...this.devices.values()].some(d => !d.connected)) {
      throw new Error('Connect all five dice first.');
    }
    this.turn = { turnId, playerId, limit, accepted: [], round: null, paused: null };
    this.record('turn-start', { turnId, playerId, limit });
  }

  arm(held = [false, false, false, false, false]) {
    const turn = this.turn;
    if (!turn || turn.paused) throw new Error('Start an active capture first.');
    if (turn.round) throw new Error('Accept or cancel the current roll first.');
    if (turn.accepted.length >= turn.limit) throw new Error('Roll limit reached.');
    if (held.length !== 5 || !held.every(v => typeof v === 'boolean') || held.every(Boolean)) throw new Error('Choose at least one die to roll.');
    if (!turn.accepted.length && held.some(Boolean)) throw new Error('The first roll needs all five dice.');
    const last = turn.accepted.at(-1);
    turn.round = {
      token: this.record('armed', { turnId: turn.turnId, held: [...held] }).sequence,
      held: [...held], faces: held.map((keep, i) => keep ? last.dice[i] : null),
      moved: new Set(), evidence: [], invalid: new Set(),
    };
    return turn.round.token;
  }

  receive({ id, epoch, kind, face = null, token = null }) {
    const die = this.devices.get(id);
    if (!die || !die.connected || die.epoch !== epoch) {
      this.record('ignored-old-connection', { id, epoch }); return;
    }
    if (!['moving', 'stable', 'tilted', 'uncertain'].includes(kind)) throw new Error('Unknown reading kind.');
    if (kind === 'stable' && (!Number.isInteger(face) || face < 1 || face > 6)) throw new Error('Invalid die face.');
    die.face = kind === 'stable' ? face : null;
    die.state = kind;
    die.updated = this.now();
    const event = this.record('reading', { id, epoch, kind, face, token });
    const turn = this.turn, round = turn?.round;
    if (!round || turn.paused || round.token !== token) return;
    const index = [...this.devices.keys()].indexOf(id);
    round.evidence.push(event.sequence);
    if (round.held[index]) {
      if (kind !== 'stable' || face !== round.faces[index]) round.invalid.add(id);
      return;
    }
    if (kind === 'moving') { round.moved.add(id); round.faces[index] = null; }
    else if (kind === 'stable' && round.moved.has(id)) round.faces[index] = face;
    else round.faces[index] = null;
  }

  candidate() {
    const turn = this.turn, round = turn?.round;
    if (!round || turn.paused || round.invalid.size || round.faces.some(n => n === null)) return null;
    return { turnId: turn.turnId, playerId: turn.playerId, token: round.token,
      dice: [...round.faces], held: [...round.held], evidence: [...round.evidence] };
  }

  accept() {
    const candidate = this.candidate();
    if (!candidate) throw new Error('Wait for fresh, settled readings from every rolled die.');
    this.turn.accepted.push(structuredClone(candidate));
    this.turn.round = null;
    this.record('accepted', structuredClone(candidate));
    return candidate;
  }

  cancel() {
    if (!this.turn?.round) return;
    this.record('roll-cancelled', { token: this.turn.round.token });
    this.turn.round = null;
  }

  pause(reason) {
    if (!this.turn) return;
    this.cancel();
    this.turn.paused = reason;
    this.record('paused', { reason });
  }

  end(reason = 'turn-complete') {
    if (!this.turn) return;
    this.record('turn-ended', { turnId: this.turn.turnId, reason });
    this.turn = null;
  }
}
