import { UPPER } from './categories.js';
import { upperSubtotal, UPPER_BONUS_THRESHOLD, UPPER_BONUS_POINTS } from './scoring.js';

// Derived accepted-sheet facts. Reachability is a theoretical ceiling, never odds.
export function upperProgress(sheet = {}) {
 const subtotal = upperSubtotal(sheet);
 const open = UPPER.filter(({key}) => sheet[key] === undefined);
 const benchmark = UPPER.filter(({key}) => sheet[key] !== undefined).reduce((n, {face}) => n + 3 * face, 0);
 const maximum = subtotal + open.reduce((n, {face}) => n + 5 * face, 0);
 return {subtotal, threshold:UPPER_BONUS_THRESHOLD, award:UPPER_BONUS_POINTS,
  needed:Math.max(0, UPPER_BONUS_THRESHOLD-subtotal), pace:subtotal-benchmark,
  remaining:open.length, maximum,
  state:subtotal >= UPPER_BONUS_THRESHOLD ? 'secured' : maximum < UPPER_BONUS_THRESHOLD ? 'unreachable' : 'possible'};
}
