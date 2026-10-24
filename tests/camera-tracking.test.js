import {describe,it,expect} from 'vitest';
import {HoldTracker,StabilityGate,assignSlots,validPolygon,SeatTracker} from '../src/dice/camera/tracking.js';
import {InputCoordinator} from '../src/dice/input/coordinator.js';
const scene=[1,2,3,4,5].map((value,i)=>({value,x:.15+i*.15,y:.5}));
describe('camera holds',()=>{
 it('does not confuse hand occlusion with pickup',()=>{const t=new HoldTracker();t.reset(scene);for(let i=0;i<10;i++)t.observe(scene.slice(0,2),{occluded:true});expect(t.proposal(scene).mask).toEqual(Array(5).fill(null));});
 it('records a reroll even when all final values and positions repeat',()=>{const t=new HoldTracker();t.reset(scene);for(let i=0;i<3;i++)t.observe(scene.slice(0,2));expect(t.proposal(scene).mask).toEqual([true,true,false,false,false]);});
 it('a brief missed detection does not establish removal',()=>{const t=new HoldTracker();t.reset(scene);t.observe(scene.slice(0,2));t.observe(scene);expect(t.removed.size).toBe(0);});
 it('new attempts release old holds',()=>{const t=new HoldTracker();t.reset(scene);for(let i=0;i<3;i++)t.observe(scene.slice(0,2));t.reset(scene);for(let i=0;i<3;i++)t.observe(scene.slice(2));expect(t.proposal(scene).mask).toEqual([false,false,true,true,true]);});
 it('assigns duplicate faces one-to-one without asserting physical identity',()=>{const before=scene.map(d=>({...d,value:6})),after=[...before].reverse();const out=assignSlots(before,after,[true,true,false,false,false]);expect(new Set(out).size).toBe(5);expect(out[0]).toEqual(before[0]);});
 it('requires held values to exist',()=>expect(()=>assignSlots(scene,scene.map(d=>({...d,value:6})),[true,false,false,false,false])).toThrow());
 it('requires enough stable time and clears on occlusion',()=>{const g=new StabilityGate();expect(g.update(scene,0,false)).toBe(false);g.update(scene,200,false);g.update(scene,400,false);expect(g.update(scene,700,false)).toBe(true);expect(g.update(scene,800,true)).toBe(false);expect(g.update(scene,900,false)).toBe(false);});
 it('rejects unordered or degenerate floor polygons',()=>{const p=[[.2,.1],[.8,.1],[.9,.2],[.9,.8],[.8,.9],[.2,.9],[.1,.8],[.1,.2]];expect(validPolygon(p)).toBe(true);expect(validPolygon([...p].sort())).toBe(false);expect(validPolygon(Array(8).fill([.5,.5]))).toBe(false);});
 it('labels entry side, not final side; competing hands abstain',()=>{const t=new SeatTracker(),h=y=>[{x:.5,y}];[.1,.2,.3,.4,.5,.6].forEach(y=>t.update([h(y)]));expect(t.update([h(.7)])).toBe(0);t.update([h(.8),h(.9)]);t.update([h(.8),h(.8)]);t.update([h(.7),h(.7)]);expect(t.seats.size).toBeGreaterThanOrEqual(1);const u=new SeatTracker();[.1,.2,.3].forEach(y=>u.update([h(y),h(1-y)]));expect(u.update([h(.4),h(.6)])).toBe(null);});
});
describe('input acceptance boundary',()=>{
 function setup(){let id=0;const c=new InputCoordinator({now:()=>1000,id:()=>String(++id)});c.start('camera');c.arm({gameId:'g',turnId:'t',revision:0,playerId:'A'});const e={source:'camera',sessionId:c.session,sequence:1,captureId:c.captureId,context:c.context,kind:'candidate',observedAt:1000,dice:scene};return {c,e};}
 it('rejects previous sessions, stale frames, wrong context, and duplicate sequence',()=>{const {c,e}=setup();expect(c.receive({...e,sessionId:'old'})).toBe(false);expect(c.receive({...e,observedAt:-2000})).toBe(false);expect(c.receive({...e,sequence:2,context:{...e.context,revision:1}})).toBe(false);expect(c.receive({...e,sequence:3})).toBe(true);expect(c.receive({...e,sequence:3})).toBe(false);});
 it('accepts once and preserves analytics fields',()=>{const {c,e}=setup();c.receive(e);const args={values:[1,2,3,4,5],heldMask:Array(5).fill(false),playerId:'A',rollNumber:1};const r=c.accept(args);expect(r.rolledValues).toEqual(args.values);expect(r.identityScope).toBe('logical-slots');expect(()=>c.accept(args)).toThrow();});
 it('invalidates on new movement',()=>{const {c,e}=setup();c.receive(e);c.receive({...e,sequence:2,kind:'invalidated'});expect(c.pending).toBe(null);});
 it('does not coerce unknown holds or change a kept value',()=>{const {c,e}=setup();c.receive(e);expect(()=>c.accept({values:[1,2,3,4,5],heldMask:[null,false,false,false,false],playerId:'A'})).toThrow();expect(()=>c.accept({values:[1,2,3,4,5],heldMask:[true,false,false,false,false],playerId:'A',previous:{after:[6,2,3,4,5]}})).toThrow();});
});
