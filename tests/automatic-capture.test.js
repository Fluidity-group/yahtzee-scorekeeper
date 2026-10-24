import {it,expect} from 'vitest';
import {AutomaticCapture,flatFace} from '../src/dice/automatic-capture.js';
import {createCoreGame,command} from '../src/game/core.js';
let serial=0;
const act=(g,type,extra={})=>command(g,{type,seat:g.activeSeat,...extra},{id:`auto${++serial}`});
const status={paused:false,dice:Array.from({length:5},(_,i)=>({id:`d${i}`,epoch:1,connected:true}))};
const start=()=>act(createCoreGame({id:'automatic',names:['A','B'],source:'godice'}),'start');
const event=(c,g,i,kind,face)=>c.receiveFor(g,status,{id:`d${i}`,epoch:1,kind,face});
const roll=(c,g,faces)=>faces.forEach((f,i)=>{event(c,g,i,'moving');event(c,g,i,'stable',f);});
it('automatically captures all five, infers held dice on rerolls, and stops at three',()=>{
 let g=start();const c=new AutomaticCapture();
 event(c,g,0,'stable',5);expect(c.capture).toBeNull();
 roll(c,g,[5,5,5,2,4]);expect(c.candidate().dice).toEqual([5,5,5,2,4]);g=act(g,'roll',c.action(g));
 event(c,g,3,'moving');event(c,g,3,'stable',5);
 // Another die joining the same roll must release its implicit hold.
 event(c,g,4,'moving');expect(c.candidate()).toBeNull();event(c,g,4,'stable',6);
 expect(c.candidate().held).toEqual([true,true,true,false,false]);
 expect(c.candidate().dice).toEqual([5,5,5,5,6]);g=act(g,'roll',c.action(g));
 event(c,g,4,'moving');event(c,g,4,'stable',5);g=act(g,'roll',c.action(g));
 event(c,g,0,'moving');expect(c.capture).toBeNull();expect(g.turn.rolls).toHaveLength(3);
 g=act(g,'score',{category:'yahtzee',value:50});g=act(g,'start');
 event(c,g,0,'moving');event(c,g,0,'stable',1);expect(c.candidate()).toBeNull();
});
it('blocks insufficient dice, pauses dropouts and rejects stale epochs',()=>{
 const g=start(),c=new AutomaticCapture();
 c.receiveFor(g,{...status,dice:status.dice.slice(0,4)},{id:'d0',epoch:1,kind:'moving'});expect(c.capture).toBeNull();
 c.receiveFor(g,status,{id:'d0',epoch:0,kind:'moving'});expect(c.capture).toBeNull();
 roll(c,g,[1,2,3,4,5]);c.sync(g,{...status,dice:status.dice.map((d,i)=>({...d,connected:i!==1}))});
 expect(c.candidate()).toBeNull();expect(c.capture.turn.paused).toBeTruthy();
});
it('retains uncertain face readings for display and records an explicit override without changing raw data',()=>{
 const g=start(),c=new AutomaticCapture();
 roll(c,g,[1,4,1,5,5]);event(c,g,3,'uncertain',5);
 expect(c.candidate()).toBeNull();expect(c.readings.get('d3').face).toBe(5);
 c.override(3,5);expect(c.candidate().dice).toEqual([1,4,1,5,5]);
 const action=c.action(g);expect(action.capture.manualOverrides[0].original.kind).toBe('uncertain');
 expect(action.capture.events.at(-1).kind).toBe('uncertain');
 expect(act(g,'roll',action).turn.rolls[0].dice).toEqual([1,4,1,5,5]);
});
it('recovers a held die after a tilt and accepts a changed stable face without its missing R packet',()=>{
 let g=start();const c=new AutomaticCapture();roll(c,g,[1,2,3,4,5]);g=act(g,'roll',c.action(g));
 event(c,g,0,'moving');event(c,g,1,'tilted',2);expect(c.candidate()).toBeNull();
 event(c,g,1,'stable',2);event(c,g,2,'stable',6);event(c,g,0,'stable',6);
 expect(c.candidate().dice).toEqual([6,2,6,4,5]);expect(c.candidate().held).toEqual([false,true,false,true,true]);
});
it('resolves flat FS/MS readings within a roll but rejects tilted geometry and stale/idle samples',()=>{
 const g=start(),c=new AutomaticCapture();
 const flat={id:'d4',epoch:1,kind:'uncertain',packet:'FS',face:5,xyz:[0,-1,-62]};
 c.receiveFor(g,status,flat);expect(c.capture).toBeNull();
 roll(c,g,[1,2,3,4,5]);c.receiveFor(g,status,flat);expect(c.candidate().dice[4]).toBe(5);
 expect(c.raw.at(-1).reportedKind).toBe('uncertain');expect(c.raw.at(-1).packet).toBe('FS');
 expect(flatFace({...flat,xyz:[23,-17,-56]})).toBe(false);
 expect(flatFace({...flat,packet:'TS'})).toBe(false);
 expect(flatFace({...flat,face:2})).toBe(false);
 expect(flatFace({...flat,packet:'MS'})).toBe(true);
 c.receiveFor(g,status,{...flat,epoch:0,face:6});expect(c.candidate().dice[4]).toBe(5);
});
