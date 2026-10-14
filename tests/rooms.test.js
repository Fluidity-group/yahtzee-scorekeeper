import { describe,it,expect } from 'vitest';
import { createRoom,joinRoom,startRoom,playRoom } from '../src/multiplayer/room.js';
import { roomHandler } from '../server/rooms/handler.js';

const time='2026-09-16T12:00:00.000Z',host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002';
const lobby=()=>createRoom({id:'00000000-0000-4000-8000-000000000009',code:'ABCDEFGH',userId:host,name:'Dan',time});
const game=()=>startRoom(joinRoom(lobby(),{userId:guest,name:'Amber',time}),{userId:host,time});
const score=(room,overrides={})=>playRoom(room,{userId:host,action:{type:'score',category:'twos',value:8},commandId:'score-command-1',expectedRevision:room.revision,time,...overrides});

describe('online room authority',()=>{
 it.each(['toString','__proto__','constructor',null,{},123])('rejects unsupported room mode %s',mode=>{
  expect(()=>createRoom({id:lobby().id,code:'ABCDEFGH',userId:host,name:'Dan',mode,time})).toThrow('Unknown game mode.');
 });
 it('keeps implicit manual turn starts outside the public command namespace',()=>{
  let room=score(game(),{commandId:'guest-score-start'});
  room=score(room,{userId:guest,commandId:'guest-score',action:{type:'score',category:'twos',value:8}});
  expect(room.game.sheets[1].twos).toBe(8);expect(room.game.activeSeat).toBe(0);
  expect(room.game.events.filter(e=>e.commandId==='room:guest-score:start'&&e.type==='turn-start')).toHaveLength(1);
 });
 it('allows only the host to start and fixes the roster after starting',()=>{
  const room=joinRoom(lobby(),{userId:guest,name:'Amber',time});
  expect(()=>startRoom(room,{userId:guest,time})).toThrow('Only the host');
  expect(()=>joinRoom(game(),{userId:'third',name:'Sam',time})).toThrow('has started');
 });
 it('limits rooms to eight distinct names, with idempotent rejoining',()=>{
  let room=lobby();
  expect(joinRoom(room,{userId:host,name:'Dan',time})).toBe(room);
  expect(()=>joinRoom(room,{userId:guest,name:'dAn',time})).toThrow('name is taken');
  for(let i=1;i<8;i++)room=joinRoom(room,{userId:`user-${i}`,name:`Player ${i}`,time});
  expect(()=>joinRoom(room,{userId:guest,name:'Amber',time})).toThrow('eight players');
 });
 it('expires invitations without locking out existing members',()=>{
  expect(()=>joinRoom(lobby(),{userId:guest,name:'Amber',time:'2026-09-20T12:00:00.000Z'})).toThrow('expired');
  expect(joinRoom(lobby(),{userId:host,time:'2026-09-20T12:00:00.000Z'}).members).toHaveLength(1);
 });
 it('ignores forged seats and refuses another player’s turn',()=>{
  expect(()=>score(game(),{userId:guest,action:{type:'score',seat:0,category:'twos',value:8}})).toThrow('another player');
  expect(()=>score(game(),{userId:'outsider'})).toThrow('not a member');
  const room=score(game());expect(room.game.sheets[0].twos).toBe(8);expect(room.game.activeSeat).toBe(1);
 });
 it('rejects stale and invalid scores without mutating the room',()=>{
  const room=game();expect(()=>score(room,{expectedRevision:0})).toThrow('changed');
  expect(()=>score(room,{action:{type:'score',category:'twos',value:99}})).toThrow();
  expect(room.game.sheets[0].twos).toBeUndefined();
 });
 it('deduplicates accepted commands and restricts corrections to their owner',()=>{
  const room=score(game());expect(score(room,{expectedRevision:0})).toBe(room);
  const target=room.game.events.find(e=>e.type==='score').id;
  expect(()=>score(room,{userId:guest,commandId:'correction-1',action:{type:'correct-score',seat:0,target,value:2}})).toThrow('own scores');
  const corrected=score(room,{commandId:'correction-1',action:{type:'correct-score',target,value:2}});
  expect(corrected.game.sheets[0].twos).toBe(2);expect(corrected.game.activeSeat).toBe(1);
 });
 it('preserves the hidden-totals choice and account IDs through play',()=>{
  const room=startRoom({...lobby(),hideTotals:true},{userId:host,time});
  expect(score(room).game.hideTotals).toBe(true);expect(room.game.players[0].id).toBe(host);
 });
});

function harness({beforeById=async()=>{},randomCode=()=> 'ABCDEFGH'}={}){
 const states=new Map();
 const store={
  async byId(id){await beforeById(id);return [...states.values()].find(r=>r.id===id);},
  async get(code){return structuredClone(states.get(code));},
  async list(id){return [...states.values()].filter(r=>r.members.some(m=>m.userId===id));},
  async recentCount(){return 0;},
  async insert(room){if(states.has(room.code)||[...states.values()].some(r=>r.id===room.id))return false;states.set(room.code,room);return true;},
  async update(room,revision){if(states.get(room.code).revision!==revision)return false;states.set(room.code,room);return true;},
 };
 const handler=roomHandler({store,authenticate:async r=>r.headers.get('Test-User'),now:()=>time,randomCode});
 const call=async (user,body)=>{const response=await handler(new Request('https://test.invalid',{method:'POST',headers:user?{'Test-User':user}:{},body:JSON.stringify(body)}));return {status:response.status,...await response.json()};};
 return {states,call};
}
describe('room HTTP boundary',()=>{
 it.each(['toString','__proto__','constructor'])('rejects inherited mode %s through the HTTP create boundary',async mode=>{
  const {call,states}=harness();const response=await call(host,{operation:'create',requestId:lobby().id,name:'Dan',mode});
  expect(response.status).toBe(400);expect(response.error).toBe('Unknown game mode.');expect(states.size).toBe(0);
 });
 it('returns an existing create request only to its host, even if another caller is a member',async()=>{
  const {call,states}=harness(),room=joinRoom(lobby(),{userId:guest,name:'Amber',time});states.set(room.code,room);
  const body={operation:'create',requestId:room.id,name:'Dan'};
  expect((await call(host,body)).room.id).toBe(room.id);
  const denied=await call(guest,body);expect(denied.status).toBe(403);expect(denied.room).toBeUndefined();expect(states.size).toBe(1);
 });
 it.each([host,guest])('recovers concurrent create UUID conflict for caller %s with owner validation',async secondCaller=>{
  let lookups=0,release,n=0;const barrier=new Promise(resolve=>release=resolve);
  const {call,states}=harness({beforeById:async()=>{if(++lookups<=2){if(lookups===2)release();await barrier;}},randomCode:()=>['ABCDEFGH','ABCDEFGJ','ABCDEFGK','ABCDEFGM'][n++]});
  const body={operation:'create',requestId:lobby().id,name:'Dan'};
  const responses=await Promise.all([call(host,body),call(secondCaller,body)]);
  expect(responses.map(r=>r.status)).toEqual(secondCaller===host?[200,200]:[200,403]);expect(states.size).toBe(1);
  if(secondCaller===host)expect(responses[0].room).toEqual(responses[1].room);else expect(responses[1].room).toBeUndefined();
 });
 it('requires authentication and membership before exposing any scorecard',async()=>{
  const {call}=harness();expect((await call(null,{operation:'list'})).status).toBe(401);
  const created=await call(host,{operation:'create',requestId:lobby().id,name:'Dan',mode:'standard'});
  expect(created.status).toBe(200);
  expect((await call(guest,{operation:'read',code:'ABCDEFGH'})).status).toBe(403);
  expect((await call(guest,{operation:'list'})).rooms).toEqual([]);
 });
 it('does not lose a concurrent join and makes the host review roster changes',async()=>{
  const {states,call}=harness();states.set('ABCDEFGH',lobby());
  const responses=await Promise.all([call(guest,{operation:'join',code:'ABCDEFGH',name:'Amber'}),call('third',{operation:'join',code:'ABCDEFGH',name:'Sam'})]);
  expect(responses.map(r=>r.status)).toEqual([200,200]);expect(states.get('ABCDEFGH').members).toHaveLength(3);
  expect((await call(host,{operation:'start',code:'ABCDEFGH',expectedRevision:0})).status).toBe(409);
 });
 it('accepts a duplicate concurrent score only once',async()=>{
  const {states,call}=harness(),room=game();states.set(room.code,room);
  const body={operation:'command',code:room.code,commandId:'command-duplicate',expectedRevision:room.revision,action:{type:'score',category:'yahtzee',value:50}};
  const responses=await Promise.all([call(host,body),call(host,body)]);
  expect(responses.map(r=>r.status)).toEqual([200,200]);
  expect(states.get(room.code).game.events.filter(e=>e.type==='score')).toHaveLength(1);
 });
});
