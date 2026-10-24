import {it,expect} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
const time='2026-09-16T12:00:00.000Z';let n=0;
const start=()=>startRoom(joinRoom(createRoom({id:'hardware-room',code:'ABCDEFGH',userId:'host',name:'Host',source:'godice',time}),{userId:'guest',name:'Guest',time}),{userId:'host',time});
const act=(room,userId,action,extra={})=>playRoom(room,{userId,action,commandId:`hardware-command-${++n}`,expectedRevision:room.revision,time,...extra});
const roll=room=>({type:'roll',dice:[5,5,5,2,4],held:Array(5).fill(false),deviceIds:['a','b','c','d','e'],capture:{gameId:room.game.id,revision:room.game.revision,turnId:room.game.turn.id,playerId:room.game.players[room.game.activeSeat].id,events:[],evidence:[]}});
const live=(room,phase='rolling')=>({type:'dice-state',phase,turnId:room.game.turn.id,gameRevision:room.game.revision,faces:Array(5).fill(null),moving:Array(5).fill(true),connected:5});
it('separates automatic turns from legal public IDs that collide with old helper suffixes',()=>{
 let r=start();
 expect(r.game.turn.id).toBe(`room:${r.id}:first-turn:turn`);
 const firstRoll=roll(r);
 r=act(r,'host',firstRoll,{commandId:'score-command-next'});
 r=act(r,'host',{type:'score',category:'fives',value:15},{commandId:'score-command'});
 expect(r.game.activeSeat).toBe(1);expect(r.game.turn.source).toBe('godice');
 expect(r.game.turn.id).toBe('room:score-command:next:turn');expect(r.liveDice.turnId).toBe(r.game.turn.id);
 expect(r.game.events.filter(e=>e.type==='roll')).toHaveLength(1);
 r=act(r,'host',roll(r));
 expect(r.game.events.filter(e=>e.type==='roll')).toHaveLength(2);
 expect(()=>act(r,'host',{type:'manual-fallback'},{commandId:'room:score-command:next'})).toThrow('Invalid command ID');
 expect(()=>act(r,'guest',firstRoll,{commandId:'score-command-next',expectedRevision:0})).toThrow('another player');
});
it('continues an existing room without rewriting historical helper IDs',()=>{
 let r=start();const oldId=`${r.id}-first-turn`;
 r.game.turn.id=`${oldId}:turn`;
 r.game.events[0]={...r.game.events[0],id:`${oldId}:0`,commandId:oldId,turnId:r.game.turn.id};
 const historical=structuredClone(r.game.events[0]);
 r=act(r,'host',roll(r));expect(r.game.events[0]).toEqual(historical);
 const scored=act(r,'host',{type:'score',category:'fives',value:15});
 expect(scored.game.events[0]).toEqual(historical);expect(scored.game.turn.id).toMatch(/^room:/);
 expect(act(scored,'host',{type:'manual-fallback'},{commandId:oldId,expectedRevision:0})).toBe(scored);
});
it('host records for both seats while only the current player may score',()=>{
 let r=start();r=act(r,'host',roll(r));r=act(r,'host',{type:'score',category:'fives',value:15});
 expect(r.game.activeSeat).toBe(1);expect(r.game.turn.source).toBe('godice');
 expect(()=>act(r,'guest',roll(r))).toThrow('Only the GoDice host');
 r=act(r,'host',roll(r));expect(r.game.events.filter(e=>e.type==='roll').at(-1).seat).toBe(1);
 expect(()=>act(r,'host',{type:'score',category:'chance',value:21})).toThrow('another player');
 expect(()=>act(r,'guest',{type:'score',category:'chance',value:30})).toThrow('does not match');
 r=act(r,'guest',{type:'score',category:'chance',value:21});expect(r.game.activeSeat).toBe(0);
});
it('validates live state and blocks scoring during motion, with host-only authority',()=>{
 let r=start();r=act(r,'host',roll(r));
 expect(()=>act(r,'guest',live(r))).toThrow('Only the GoDice host');
 expect(()=>act(r,'host',{...live(r),faces:[9]})).toThrow('Invalid');
 r=act(r,'host',live(r));expect(r.liveDice.phase).toBe('rolling');
 expect(()=>act(r,'host',{type:'score',category:'fives',value:15})).toThrow('settle');
 const stale=roll(r);r=act(r,'host',roll(r));expect(r.liveDice.phase).toBe('settled');
 expect(()=>act(r,'host',stale)).toThrow('another turn or revision');
});
it('deduplicates delegated host rolls without allowing guests to replay host commands',()=>{
 let r=start();r=act(r,'host',roll(r));r=act(r,'host',{type:'score',category:'fives',value:15});
 const action=roll(r),revision=r.revision,id='delegated-roll-id';
 r=act(r,'host',action,{commandId:id});
 expect(act(r,'host',action,{commandId:id,expectedRevision:revision})).toBe(r);
 expect(()=>act(r,'guest',action,{commandId:id,expectedRevision:revision})).toThrow('another player');
});
it('keeps manual rooms manual and lets the active guest correct a settled roll',()=>{
 let r=start();r=act(r,'host',roll(r));r=act(r,'host',{type:'score',category:'fives',value:15});r=act(r,'host',roll(r));
 r=act(r,'guest',{type:'correct-roll',dice:[5,5,5,2,6]});expect(r.liveDice.faces).toEqual([5,5,5,2,6]);
 r=act(r,'guest',{type:'manual-fallback'});expect(r.game.turn.source).toBe('manual');
 const manual=startRoom(createRoom({id:'manual-room',code:'ABCDEFGH',userId:'host',name:'Host',time}),{userId:'host',time});
 expect(()=>act(manual,'host',{type:'start',source:'godice'})).toThrow('mode is fixed');
 expect(()=>act(manual,'host',roll(r))).toThrow('Only the GoDice host');
});
