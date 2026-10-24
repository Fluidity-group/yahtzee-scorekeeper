import {it,expect} from 'vitest';
import {TrayTracker,fitTray} from '../src/dice/camera/tray-tracker.js';
const p=[[.3,.2],[.6,.2],[.7,.3],[.7,.6],[.6,.7],[.3,.7],[.2,.6],[.2,.3]];
const move=(p,dx,dy)=>p.map(([x,y])=>[x+dx,y+dy]);
it('resyncs a small stable translation after three observations',()=>{
 const t=new TrayTracker();t.reset(p);expect(t.update(p).state).toBe('locked');const q=move(p,.025,.01);
 expect(t.update(q).state).toBe('moving');expect(t.update(q).state).toBe('moving');const r=t.update(q);expect(r.state).toBe('resynced');r.polygon.forEach((v,i)=>{expect(v[0]).toBeCloseTo(q[i][0]);expect(v[1]).toBeCloseTo(q[i][1]);});expect(t.update(q).state).toBe('locked');
});
it('ignores jitter, pauses on loss and refuses far-away or competing candidates',()=>{
 const t=new TrayTracker();t.reset(p);t.update(p);expect(t.update(move(p,.001,0)).state).toBe('locked');
 expect(t.update(null,0).state).toBe('seeking');expect(t.update(p,2).state).toBe('seeking');expect(t.update(move(p,.15,0)).state).toBe('seeking');expect(t.update(p).state).toBe('locked');
});
it('matches cyclic order and winding, while preserving confirmed bounds',()=>{
 const q=move(p,.02,0),r=fitTray(p,[...q.slice(3),...q.slice(0,3)].reverse());expect(r.error).toBeLessThan(.00001);expect(r.shift).toBeCloseTo(.02);
});
it('does not accept one-frame jumps or a large shape change',()=>{
 const t=new TrayTracker();t.reset(p);t.update(p);expect(t.update(move(p,.03,0)).state).toBe('moving');expect(t.update(p).state).toBe('locked');
 expect(t.update(p.map(([x,y])=>[x*.75,y*.75])).state).toBe('seeking');
});
it('does not silently anchor at a displaced first observation',()=>{
 const t=new TrayTracker();t.reset(p);expect(t.update(move(p,.04,0)).state).toBe('moving');
});
it('does not mistake alternating individual corner jitter for whole-tray movement',()=>{
 const t=new TrayTracker();t.reset(p);t.update(p);
 for(let i=0;i<30;i++){
  const q=p.map(v=>[...v]);q[i%8][0]+=(i%2?1:-1)*.009;
  expect(t.update(q).state).toBe('locked');
 }
});
it('resyncs a translated tray despite corner jitter between observations',()=>{
 const t=new TrayTracker();t.reset(p);t.update(p);let r;
 for(let i=0;i<3;i++){
  const q=move(p,.025,.01);q[i][0]+=(i%2?1:-1)*.008;r=t.update(q);
 }
 expect(r.state).toBe('resynced');
});
