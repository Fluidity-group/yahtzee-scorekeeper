import {describe,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setRematchReady} from '../src/multiplayer/rematch.js';
import {setTournamentPaused} from '../src/multiplayer/tournament.js';
import {acceptedOutbox} from '../server/commentary/accepted-outbox.js';
import {projectLeaseClock,conservativeLeaseDeadline} from '../server/commentary/lease-clock.js';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003',nextId='00000000-0000-4000-8000-000000000004';
const time='2026-10-14T18:00:00.000Z';
function lobby(tournament){return joinRoom(createRoom({id,code:'ABCDEFGH',userId:a,name:'Alex',time,...(tournament?{tournament:{name:'Club Night',playerCount:2,gameCount:2}}:{})}),{userId:b,name:'Sam',time});}
const active=()=>startRoom(lobby(),{userId:a,time});
const play=(room,action,commandId='command_0001')=>playRoom(room,{userId:room.members[room.game.activeSeat].userId,action,commandId,expectedRevision:room.revision,gameId:room.game.id,time});
const map=(before,after,extra={})=>acceptedOutbox({before,after,actorId:a,commandId:'command_0001',operation:'command',acceptedAt:time,...extra});
const builder=vi.fn(({room,purpose,sourceCommandId,acceptedAt,priorGame})=>({purpose,gameId:room.game.id,commandId:sourceCommandId,eventId:'lifecycle-'+sourceCommandId,observation:'accepted-lifecycle-only',snapshotBasis:'at-acceptance',acceptedAt,seats:room.game.players.map((p,seat)=>({accountId:p.id,seat,displayName:p.name})),priorGameSummary:priorGame?.authorized?{basis:'authorized-finished-history'}:null}));
describe('trusted accepted-transition outbox preparation',()=>{
 it('derives frozen named score facts from real rules and seat UUIDs without mutation',()=>{
  const before=active(),after=play(before,{type:'score',category:'chance',value:25}),copy=JSON.stringify(after),rows=map(before,after);
  expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({kind:'moment',purpose:'score',expectedRoomRevision:before.revision,acceptedRoomRevision:after.revision,audience:[a,b],dispatch:'after-transaction-commit-only'});
  expect(rows[0].facts).toMatchObject({accountId:a,displayName:'Alex',value:25,rulesVersion:1});expect(rows[0].facts.seats.map(s=>s.total)).toEqual([25,0]);
  expect(Object.isFrozen(rows[0].facts.seats)).toBe(true);expect(JSON.stringify(after)).toBe(copy);
 });
 it('is deterministic across transaction retries and quiet on command receipt replay',()=>{
  const before=active(),after=play(before,{type:'score',category:'chance',value:0});expect(map(before,after)).toEqual(map(before,after));
  expect(map(after,playRoom(after,{userId:a,action:{type:'score',category:'chance',value:0},commandId:'command_0001',expectedRevision:after.revision,gameId:after.game.id,time}))).toEqual([]);
 });
 it('does not emit for reads, hydration, pause, ordinary turn start or existing event history',()=>{
  const before=active(),after=play(before,{type:'start'});
  for(const operation of ['read','hydrate','pause','join','command'])expect(map(before,after,{operation})).toEqual([]);
  expect(map(before,before,{operation:'resume'})).toEqual([]);
 });
 it('rejects cross-seat actor, malformed UUID, revision gap and foreign command append',()=>{
  const before=active(),after=play(before,{type:'score',category:'chance',value:25});
  expect(()=>map(before,after,{actorId:b})).toThrow('Event actor');
  expect(()=>map(before,after,{actorId:'Alex'})).toThrow('UUID actor');
  expect(()=>map(before,{...after,revision:after.revision+1})).toThrow('one accepted');
  const foreign=structuredClone(after);foreign.game.events.at(-1).commandId='other_command';expect(()=>map(before,foreign)).toThrow('Only accepted');
  foreign.game.events.push({...after.game.events.at(-1),id:'foreign-id'});expect(()=>map(before,foreign)).toThrow('Only accepted');
 });
 it('rejects ownership/roster rewrites and replaced event history',()=>{
  const before=active(),after=play(before,{type:'score',category:'chance',value:25});
  expect(()=>map(before,{...after,members:[after.members[1],after.members[0]]})).toThrow('ownership');
  const subsequent=play(after,{type:'score',category:'chance',value:20},'command_0002');subsequent.game.events[0].id='replaced';
  expect(()=>map(after,subsequent,{actorId:b,commandId:'command_0002'})).toThrow('history prefix');
 });
 it('correction/Undo emits cancellation target rather than another punchline',()=>{
  const before=active(),scored=play(before,{type:'score',category:'chance',value:25}),target=scored.game.events.find(e=>e.type==='score').id;
  for(const type of ['correct-score','undo-score']){
   const after=playRoom(scored,{userId:a,action:{type,target,value:20},commandId:'correct_0001',expectedRevision:scored.revision,gameId:scored.game.id,time});
   expect(map(scored,after,{commandId:'correct_0001'})).toMatchObject([{kind:'invalidate',purpose:'correction',facts:null,invalidates:[{targetEventId:target}]}]);
  }
 });
 it('supports server automatic next-turn tail without fabricating later totals',()=>{
  const before=active(),after=play(before,{type:'score',category:'chance',value:25});
  after.game.events.push({id:'next-helper',commandId:'room:command_0001:next',type:'turn-start',seat:1,time});
  expect(map(before,after)[0].facts.value).toBe(25);
 });
 it('selects final-chain closure rather than the simultaneous failed roll',()=>{
  let before=startRoom(createRoom({id,code:'ABCDEFGH',userId:a,name:'Alex',mode:'competition',rulesVersion:2,time}),{userId:a,time}),n=0;
  for(const category of ['aces','twos','threes','fours','fives','sixes','threeKind','fourKind','fullHouse','smallStraight','largeStraight','chance'])before=play(before,{type:'score',category,value:0},'fill_'+String(++n).padStart(8,'0'));
  before=play(before,{type:'score',category:'yahtzee',value:50},'chain_start');
  before=play(before,{type:'final-chain-roll',face:null},'chain_roll1');before=play(before,{type:'final-chain-roll',face:null},'chain_roll2');
  const after=play(before,{type:'final-chain-roll',face:null},'chain_roll3');
  const rows=map(before,after,{commandId:'chain_roll3'});expect(rows).toHaveLength(1);expect(rows[0].facts).toMatchObject({eventType:'final-chain-end',complete:true,value:0});
 });
 it('hidden totals remain undisclosed',()=>{
  const before=active();before.game.hideTotals=true;const after=play(before,{type:'score',category:'chance',value:25});
  expect(map(before,after)[0].facts.seats.every(s=>!('total'in s))).toBe(true);
 });
 it('opening invokes shared builder only on host accepted lobby start',()=>{
  const before=lobby(),after=startRoom(before,{userId:a,time}),rows=map(before,after,{operation:'start',openingFacts:builder});
  expect(rows[0].purpose).toBe('opening');expect(rows[0].facts.seats[0].displayName).toBe('Alex');
  expect(()=>map(before,after,{operation:'start',openingFacts:builder,actorId:b})).toThrow('Host');
  expect(()=>map(before,after,{operation:'start'})).toThrow('builder');
 });
 it('return requires paused-to-playing transition, not a repeated resume',()=>{
  const playing=startRoom(lobby(true),{userId:a,time});const before=setTournamentPaused(playing,{userId:a,gameId:playing.game.id,expectedRevision:playing.revision,paused:true,time});
  const after=setTournamentPaused(before,{userId:a,gameId:before.game.id,expectedRevision:before.revision,paused:false,time});
  expect(map(before,after,{operation:'resume',openingFacts:builder})[0].purpose).toBe('return');
  const again=setTournamentPaused(after,{userId:a,gameId:after.game.id,expectedRevision:after.revision,paused:false,time});expect(map(after,again,{operation:'resume',openingFacts:builder})).toEqual([]);
 });
 it('next-game emits on all-ready game replacement and does not infer private prior history',()=>{
  let before=active(),n=0;for(const category of ['aces','twos','threes','fours','fives','sixes','threeKind','fourKind','fullHouse','smallStraight','largeStraight','yahtzee','chance'])for(let seat=0;seat<2;seat++)before=play(before,{type:'score',category,value:0},'fill_'+String(++n).padStart(8,'0'));
  const options={gameId:before.game.id,gameRevision:before.game.revision,ready:true,nextGameId:nextId,time};
  const partial=setRematchReady(before,{...options,userId:a,commandId:'ready_0001'});expect(map(before,partial,{operation:'ready',commandId:'ready_0001',openingFacts:builder})).toEqual([]);
  const after=setRematchReady(partial,{...options,userId:b,commandId:'ready_0002'});
  const row=map(partial,after,{actorId:b,operation:'ready',commandId:'ready_0002',openingFacts:builder})[0];expect(row).toMatchObject({gameId:nextId,purpose:'next-game',facts:{priorGameSummary:null}});
 });
 it('rejects misbound lifecycle builder output',()=>{
  const before=lobby(),after=startRoom(before,{userId:a,time});expect(()=>map(before,after,{operation:'start',openingFacts:()=>({})})).toThrow('binding mismatch');
 });
});
describe('server-clock conservative lease timing',()=>{
 const projection=()=>projectLeaseClock({epoch:2,expiresAt:10015000},10000000);
 it('deducts whole round trip and margin on monotonic request clock',()=>{expect(conservativeLeaseDeadline(projection(),{sentAt:100,receivedAt:1100})).toEqual({deadline:14850,remainingMs:13750,expired:false,epoch:2});});
 it('cannot revive an expired lease through a slow response',()=>{expect(conservativeLeaseDeadline(projection(),{sentAt:100,receivedAt:20000}).expired).toBe(true);});
 it('uses server relative window regardless of phone wall clock offset',()=>{const p=projection();expect(conservativeLeaseDeadline({...p,serverNowMs:p.serverNowMs+1e12,expiresAt:p.expiresAt+1e12},{sentAt:100,receivedAt:200})).toEqual(conservativeLeaseDeadline(p,{sentAt:100,receivedAt:200}));});
 it('rejects inconsistent windows, backward monotonic time and excessive lease',()=>{expect(()=>conservativeLeaseDeadline({...projection(),remainingMs:20000},{sentAt:0,receivedAt:1})).toThrow('Inconsistent');expect(()=>conservativeLeaseDeadline(projection(),{sentAt:2,receivedAt:1})).toThrow('Monotonic');expect(()=>conservativeLeaseDeadline(projection(),{sentAt:0,receivedAt:1,maxLeaseMs:1000})).toThrow('excessive');});
});



