import {it,expect} from 'vitest';
import {upperProgress} from '../src/game/upper-progress.js';
import {computeTotals} from '../src/game/scoring.js';
it('reports an empty card without inventing a forecast',()=>{
 expect(upperProgress()).toMatchObject({subtotal:0,needed:63,pace:0,remaining:6,maximum:105,state:'possible'});
});
it('lets stronger categories compensate, with zero counting as filled',()=>{
 expect(upperProgress({aces:0,twos:8,threes:15})).toMatchObject({subtotal:23,pace:5,remaining:3,state:'possible'});
 expect(upperProgress({aces:3,twos:6,threes:12,fours:12,fives:15})).toMatchObject({subtotal:48,pace:3,needed:15,maximum:78,state:'possible'});
});
it.each([63,65])('secures the bonus at %i with no double counting',subtotal=>{
 const sheet={aces:subtotal-60,twos:10,threes:15,fours:20,fives:15};
 expect(upperProgress(sheet)).toMatchObject({state:'secured',needed:0,award:35});
 expect(computeTotals(sheet).grand).toBe(subtotal+35);
});
it('distinguishes attainable exact ceiling from missed and impossible cards',()=>{
 const sheet={aces:3,twos:6,threes:12,fours:12,fives:0};
 expect(upperProgress(sheet)).toMatchObject({subtotal:33,maximum:63,state:'possible'});
 expect(upperProgress({...sheet,fours:8})).toMatchObject({maximum:59,state:'unreachable'});
 expect(upperProgress({...sheet,sixes:18})).toMatchObject({remaining:0,state:'unreachable'});
});
it('rederives after correction or reopening a category rather than retaining stale progress',()=>{
 const sheet={aces:3,twos:6,threes:9,fours:12,fives:15,sixes:18};
 expect(upperProgress(sheet).state).toBe('secured');
 sheet.sixes=0;expect(upperProgress(sheet)).toMatchObject({state:'unreachable',pace:-18});
 delete sheet.sixes;expect(upperProgress(sheet)).toMatchObject({state:'possible',pace:0,remaining:1});
});
