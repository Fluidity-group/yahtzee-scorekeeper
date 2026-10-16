import {describe,it,expect} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setRematchReady,nextStarter} from '../src/multiplayer/rematch.js';
import {BASE_KEYS} from '../src/game/categories.js';
import {roomHandler} from '../server/rooms/handler.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',time='2026-10-13T18:00:00.000Z';
function finished({tie=false}={}){
 let room=startRoom(joinRoom(createRoom({id:'00000000-0000-4000-8000-000000000009',code:'ABCDEFGH',userId:host,name:'Captain Custard',time}),{userId:guest,name:'Queen of Dice',time}),{userId:host,time});
 for(let n=0;room.game.status!=='finished';n++){
  const seat=room.game.activeSeat,category=BASE_KEYS.find(k=>room.game.sheets[seat][k]===undefined);
  room=playRoom(room,{userId:room.members[seat].userId,expectedRevision:room.revision,commandId:`score-${n}-command`,action:{type:'score',category,value:!tie&&seat===1&&category==='largeStraight'?40:0},time});
 }
 return room;
}
const ready=(room,userId,options={})=>setRematchReady(room,{userId,gameId:room.game.id,gameRevision:room.game.revision,commandId:`ready-${userId}`,ready:true,nextGameId:'00000000-0000-4000-8000-000000000099',time,...options});
describe('same-table rematch rules',()=>{
 it('waits for each account then starts the guest winner with a new game and frozen rules',()=>{
  const room=finished(),original=structuredClone(room);room.game.rules.name='Frozen game rule';
  let next=ready(room,host);expect(next.game.id).toBe(room.game.id);expect(next.rematch.ready).toEqual([host]);
  next=ready(next,guest);expect(next.game.id).not.toBe(room.game.id);expect(next.code).toBe(room.code);expect(next.members).toEqual(room.members);expect(next.game.activeSeat).toBe(1);expect(next.game.startingSeat).toBe(1);expect(next.game.rules.name).toBe('Frozen game rule');expect(next.game.sheets).toEqual([{},{}]);expect(next.game.players.map(p=>p.id)).toEqual([host,guest]);expect(original.game.events).toHaveLength(room.game.events.length);expect(next.game.players.map(p=>p.name)).toEqual(['Captain Custard','Queen of Dice']);
 });
 it('allows withdrawal and rejects forged/stale/not-finished readiness',()=>{
  const room=finished();const accepted=ready(room,host);
  expect(ready(accepted,host,{ready:false}).rematch.ready).toEqual([]);
  expect(()=>ready(room,'outsider')).toThrow('not a member');expect(()=>ready(room,host,{gameRevision:0})).toThrow('results changed');expect(()=>ready({...room,game:{...room.game,status:'active'}},host)).toThrow('Finish');
 });
 it('score correction clears readiness and invalidates approval of earlier results',()=>{
  let room=ready(finished(),host);const revision=room.game.revision,target=room.game.events.find(e=>e.type==='score'&&e.seat===1&&e.category==='largeStraight').id;
  room=playRoom(room,{userId:guest,gameId:room.game.id,expectedRevision:room.revision,commandId:'correct-before-rematch',action:{type:'correct-score',target,value:0},time});
  expect(room.rematch).toBeNull();expect(()=>ready(room,guest,{gameRevision:revision})).toThrow('results changed');
 });
 it('rejects stale and older-client scoring after a successor starts',()=>{
  const old=finished(),room=ready(ready(old,host),guest),body={userId:guest,expectedRevision:room.revision,commandId:'stale-command',action:{type:'score',category:'aces',value:1},time};
  expect(()=>playRoom(room,{...body,gameId:old.game.id})).toThrow('new game');expect(()=>playRoom(room,body)).toThrow('new game');
 });
 it('rotates the proposed tied starter among tied accounts without swapping seats',()=>{
  const room=finished({tie:true});expect(nextStarter(room)).toBe(1);room.game.startingSeat=1;expect(nextStarter(room)).toBe(0);
 });
});

function harness({available=true,failAfterCommit=false}={}){
 const initial=finished(),states=new Map([[initial.code,initial]]),receipts=new Map(),games=new Map();let ids=10,failed=false;
 const store={
  rematchAvailable:async()=>available,
  get:async code=>structuredClone(states.get(code)),
  receipt:async(id,command)=>receipts.get(command),
  async commit(next,revision,{actor,commandId,fingerprint}){
   const old=states.get(next.code);if(old.revision!==revision)return false;
   games.set(old.game.id,structuredClone(old.game));games.set(next.game.id,structuredClone(next.game));states.set(next.code,structuredClone(next));
   if(commandId)receipts.set(commandId,{actor_id:actor,fingerprint});
   if(failAfterCommit&&!failed&&next.game.id!==old.game.id){failed=true;throw Error('uncertain committed response');}return true;
  },
  update:async()=>{throw Error('must use transaction');},
  history:async()=>[...games.values()].filter(g=>g.status==='finished').map((state,i)=>({state,sequence_number:i+1})),
 };
 const handler=roomHandler({store,authenticate:async request=>request.headers.get('Test-User'),now:()=>time,randomId:()=>`00000000-0000-4000-8000-${String(++ids).padStart(12,'0')}`});
 const call=async(userId,body)=>{const r=await handler(new Request('https://test.invalid',{method:'POST',headers:{'Test-User':userId},body:JSON.stringify(body)}));return {status:r.status,...await r.json()};};
 const body=userId=>({operation:'ready',code:initial.code,gameId:initial.game.id,gameRevision:initial.game.revision,ready:true,commandId:`ready-${userId}`});
 return {store,states,games,receipts,call,body,initial};
}
describe('rematch HTTP concurrency and persistence',()=>{
 it('simultaneous ready commands create one successor and preserve complete score/event history',async()=>{
  const h=harness(),responses=await Promise.all([h.call(host,h.body(host)),h.call(guest,h.body(guest))]);
  expect(responses.map(r=>r.status)).toEqual([200,200]);const next=h.states.get(h.initial.code);expect(next.gameSequence).toBe(2);expect(next.game.activeSeat).toBe(1);expect(h.games.size).toBe(2);expect(h.games.get(h.initial.game.id)).toEqual(h.initial.game);expect(h.receipts.size).toBe(2);
  const retry=await h.call(guest,h.body(guest));expect(retry.room.game.id).toBe(next.game.id);expect(h.games.size).toBe(2);
 });
 it('retry after an uncertain committed response returns the accepted successor',async()=>{
  const h=harness({failAfterCommit:true});await h.call(host,h.body(host));expect((await h.call(guest,h.body(guest))).status).toBe(500);
  const accepted=h.states.get(h.initial.code).game.id;expect((await h.call(guest,h.body(guest))).room.game.id).toBe(accepted);expect(h.games.size).toBe(2);
 });
 it('rejects changed payload/actor reuse and outsiders',async()=>{
  const h=harness();await h.call(host,h.body(host));expect((await h.call(host,{...h.body(host),ready:false})).status).toBe(403);expect((await h.call(guest,h.body(host))).status).toBe(403);expect((await h.call('outsider',h.body(host))).status).toBe(403);
 });
 it('missing migration advertises no rematch and never advances the game',async()=>{
  const h=harness({available:false});expect((await h.call(host,{operation:'read',code:h.initial.code})).room.capabilities.rematch).toBe(false);expect((await h.call(host,h.body(host))).status).toBe(503);expect(h.states.get(h.initial.code)).toEqual(h.initial);
 });
 it('uncertain capability failure never falls back to a room-only score update',async()=>{
  const h=harness();h.store.rematchAvailable=async()=>{throw Error('unavailable');};let updated=false;h.store.update=async()=>{updated=true;return true;};
  const result=await h.call(host,{operation:'command',code:h.initial.code,gameId:h.initial.game.id,commandId:'correct-save-test',expectedRevision:h.initial.revision,action:{type:'correct-score',target:h.initial.game.events.find(e=>e.type==='score').id,value:1}});
  expect(result.status).toBe(500);expect(updated).toBe(false);
 });
 it('missing RPC cannot bypass history persistence for a migrated first game',async()=>{
  const h=harness({available:false});h.states.get(h.initial.code).historyVersion=1;
  expect((await h.call(host,{operation:'read',code:h.initial.code})).status).toBe(200);
  expect((await h.call(host,{operation:'command',code:h.initial.code,gameId:h.initial.game.id,commandId:'protected-history',expectedRevision:h.initial.revision,action:{type:'correct-score',target:h.initial.game.events.find(e=>e.type==='score').id,value:0}})).status).toBe(503);
 });
 it('history exposes full snapshots only to the existing roster',async()=>{
  const h=harness();await h.call(host,h.body(host));await h.call(guest,h.body(guest));const response=await h.call(guest,{operation:'history',code:h.initial.code});expect(response.games).toEqual([{...h.initial.game,sequence:1}]);expect((await h.call('outsider',{operation:'history',code:h.initial.code})).status).toBe(403);
 });
});
