import {it,expect} from 'vitest';
import {GameCapture} from '../src/dice/game-capture.js';
import {createCoreGame,command,scoreOptions} from '../src/game/core.js';
let serial=0;
const act=(game,type,extra={})=>command(game,{type,seat:game.activeSeat,...extra},{id:`test${++serial}`});
const start=()=>act(createCoreGame({id:'game',names:['A','B']}),'start',{source:'godice'});
const status={paused:false,dice:Array.from({length:5},(_,i)=>({id:`die${i}`,epoch:1,connected:true}))};
function settle(c,faces,held=Array(5).fill(false)){
 faces.forEach((face,i)=>{if(!held[i]){c.receive({id:`die${i}`,epoch:1,kind:'moving'});c.receive({id:`die${i}`,epoch:1,kind:'stable',face});}});
}
it('requires fresh movement then confirms a physical roll with source and evidence',()=>{
 let g=start();const c=new GameCapture();c.arm(g,status,Array(5).fill(false));
 for(let i=0;i<5;i++)c.receive({id:`die${i}`,epoch:1,kind:'stable',face:6});
 expect(c.candidate()).toBeNull();
 settle(c,[3,3,4,1,6]);g=act(g,'roll',c.action(g));
 expect(g.turn.rolls[0].source).toBe('godice');expect(g.events.at(-1).capture.events).toHaveLength(15);
 expect(scoreOptions(g,g.turn.rolls[0].dice).scores.chance).toBe(17);
 expect(()=>act(g,'score',{category:'chance',value:20})).toThrow('does not match');
 g=act(g,'score',{category:'chance',value:17});expect(g.activeSeat).toBe(1);expect(g.turn).toBeNull();
});
it('carries held values forward and blocks disturbed held dice',()=>{
 let g=start();const c=new GameCapture();c.arm(g,status,Array(5).fill(false));settle(c,[3,3,4,1,6]);g=act(g,'roll',c.action(g));
 const held=[true,true,false,false,false];c.arm(g,status,held);settle(c,[3,3,3,3,3],held);expect(c.candidate().dice).toEqual([3,3,3,3,3]);
 c.receive({id:'die0',epoch:1,kind:'uncertain',face:3});expect(c.candidate()).toBeNull();
 c.cancel();c.arm(g,status,held);settle(c,[3,3,3,3,3],held);g=act(g,'roll',c.action(g));
 g=act(g,'correct-roll',{dice:[3,3,3,3,4]});expect(g.turn.rolls[1].source).toBe('manual-correction');
 expect(g.events.find(e=>e.type==='roll'&&e.dice.every(n=>n===3))).toBeTruthy();
});
it('enforces three rolls and rejects captures from a stale game revision',()=>{
 let g=start();const c=new GameCapture();
 for(let i=0;i<3;i++){c.arm(g,status,Array(5).fill(false));settle(c,[1,2,3,4,5]);const action=c.action(g);g=act(g,'roll',action);expect(()=>c.action(g)).toThrow('turn changed');}
 expect(()=>c.arm(g,status,Array(5).fill(false))).toThrow('Roll limit');
});
it('pauses on disconnect/background and ignores stale connection notifications',()=>{
 const g=start(),c=new GameCapture();c.arm(g,status,Array(5).fill(false));
 c.receive({id:'die0',epoch:0,kind:'moving'});c.receive({id:'die0',epoch:0,kind:'stable',face:6});expect(c.raw).toHaveLength(0);
 c.sync(g,{...status,paused:true});expect(c.capture.turn.paused).toBeTruthy();expect(c.candidate()).toBeNull();
 c.cancel();c.arm(g,status,Array(5).fill(false));settle(c,[1,2,3,4,5]);
 c.sync(g,{...status,dice:status.dice.map((d,i)=>({...d,connected:i!==2}))});expect(c.candidate()).toBeNull();
});
it('does not transfer a held value to a replacement physical die',()=>{
 let g=start();const c=new GameCapture();c.arm(g,status,Array(5).fill(false));settle(c,[1,2,3,4,5]);g=act(g,'roll',c.action(g));
 const changed={...status,dice:status.dice.map((d,i)=>({...d,id:i===0?'replacement':d.id}))};
 expect(()=>c.arm(g,changed,[true,false,false,false,false])).toThrow('dice set changed');
 expect(()=>c.arm(g,changed,Array(5).fill(false))).not.toThrow();
});
