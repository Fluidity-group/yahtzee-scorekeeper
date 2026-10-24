import { describe, it, expect } from 'vitest';
import { DiceCapture } from '../src/dice/capture.js';

function setup(limit = 3) {
  const capture = new DiceCapture({ now: () => 100 });
  const epochs = Array.from({ length: 5 }, (_, i) => capture.connect(`d${i}`));
  capture.start({ turnId: 'turn1', playerId: 'p1', limit });
  const reading = (i, kind, face, token = capture.turn?.round?.token) => capture.receive({ id: `d${i}`, epoch: epochs[i], kind, face, token });
  const settle = () => { for (let i = 0; i < 5; i++) { reading(i, 'moving'); reading(i, 'stable', i + 1); } };
  return { capture, reading, settle, epochs };
}

describe('turn-gated dice capture', () => {
  it('requires five connections and fresh movement after arming', () => {
    const empty = new DiceCapture();
    expect(() => empty.start({ turnId: 't', playerId: 'p' })).toThrow('five');
    const { capture, reading, settle } = setup();
    capture.arm();
    for (let i = 0; i < 5; i++) reading(i, 'stable', 6);
    expect(capture.candidate()).toBeNull();
    settle();
    expect(capture.accept().dice).toEqual([1, 2, 3, 4, 5]);
    expect(() => capture.accept()).toThrow();
  });
  it('ignores readings outside the current roll and after completion', () => {
    const { capture, reading, settle } = setup();
    const old = capture.arm(); capture.cancel(); capture.arm();
    reading(0, 'moving', null, old); reading(0, 'stable', 6, old);
    expect(capture.turn.round.faces[0]).toBeNull();
    settle(); capture.end(); reading(0, 'stable', 6);
    expect(capture.candidate()).toBeNull();
  });
  it('keeps held values and blocks a held die that moves', () => {
    const { capture, reading, settle } = setup();
    capture.arm(); settle(); capture.accept();
    capture.arm([true, false, false, false, false]);
    for (let i = 1; i < 5; i++) { reading(i, 'moving'); reading(i, 'stable', 6); }
    expect(capture.candidate().dice).toEqual([1, 6, 6, 6, 6]);
    reading(0, 'moving'); reading(0, 'stable', 1);
    expect(capture.candidate()).toBeNull();
  });
  it('revokes a candidate when a die moves or tilts again', () => {
    const { capture, reading, settle } = setup();
    capture.arm(); settle(); reading(0, 'tilted');
    expect(capture.candidate()).toBeNull();
    reading(0, 'stable', 1); expect(capture.candidate()).not.toBeNull();
    reading(0, 'moving'); expect(capture.candidate()).toBeNull();
  });
  it('pauses on disconnect and rejects late callbacks from old connections', () => {
    const { capture, reading, settle } = setup();
    capture.arm(); settle(); capture.disconnect('d0', 1);
    expect(capture.candidate()).toBeNull();
    capture.connect('d0'); reading(0, 'stable', 6);
    expect(capture.devices.get('d0').face).toBeNull();
    expect(() => capture.arm()).toThrow('active');
  });
  for (const limit of [3, 4]) it(`enforces ${limit} accepted rolls, cancellation consumes none`, () => {
    const { capture, settle } = setup(limit);
    capture.arm(); capture.cancel();
    for (let i = 0; i < limit; i++) { capture.arm(); settle(); capture.accept(); }
    expect(() => capture.arm()).toThrow('limit');
  });
  it('rejects invalid values and first-roll holding; preserves returned snapshots', () => {
    const { capture, reading, settle } = setup();
    expect(() => capture.arm([true, false, false, false, false])).toThrow('first');
    capture.arm(); expect(() => reading(0, 'stable', 7)).toThrow('face');
    settle(); const candidate = capture.candidate(); candidate.dice[0] = 6;
    const accepted = capture.accept(); expect(accepted.dice[0]).toBe(1);
    accepted.dice[0] = 6;
    expect(capture.turn.accepted[0].dice[0]).toBe(1);
    expect(capture.log.at(-1).dice[0]).toBe(1);
  });
});
