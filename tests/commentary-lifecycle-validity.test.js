import {describe,it,expect} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setTournamentPaused} from '../src/multiplayer/tournament.js';
import {setRematchReady} from '../src/multiplayer/rematch.js';
import {BASE_KEYS} from '../src/game/categories.js';
import {openingFacts} from '../src/commentary/opening-facts.js';
import {acceptedOutbox} from '../server/commentary/accepted-outbox.js';
import {validateLifecycleMoment,lifecycleFactsValid} from '../src/commentary/lifecycle-validity.js';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003',nextId='00000000-0000-4000-8000-000000000004',time='2026-10-14T20:00:00.000Z';
function lobby(){return joinRoom(createRoom({id,code:'ABCDEFGH',userId:a,name:'Alex',time,tournament:{name:'Night',playerCount:2,gameCount:2}}),{userId:b,name:'Sam',time});}
function fixture(purpose='opening'){
 let before=lobby(),accepted=startRoom(before,{userId:a,time}),operation='start',actorId=a;
 if(purpose==='return'){
  accepted=playRoom(accepted,{userId:a,action:{type:'score',category:'chance',value:25},commandId:'score_source',expectedRevision:accepted.revision,gameId:accepted.game.id,time});
  before=setTournamentPaused(accepted,{userId:a,gameId:accepted.game.id,expectedRevision:accepted.revision,paused:true,time});accepted=setTournamentPaused(before,{userId:a,gameId:before.game.id,expectedRevision:before.revision,paused:false,time});operation='resume';
 }
 if(purpose==='next-game'){
  let n=0;for(const category of BASE_KEYS)for(let seat=0;seat<2;seat++)accepted=playRoom(accepted,{userId:accepted.members[accepted.game.activeSeat].userId,action:{type:'score',category,value:0},commandId:'finish_'+String(++n).padStart(8,'0'),expectedRevision:accepted.revision,gameId:accepted.game.id,time});
  const opts={gameId:accepted.game.id,gameRevision:accepted.game.revision,ready:true,nextGameId:nextId,time};before=setRematchReady(accepted,{...opts,userId:a,commandId:'ready_first'});accepted=setRematchReady(before,{...opts,userId:b,commandId:'lifecycle_source'});operation='ready';actorId=b;
 }
 const moment=acceptedOutbox({before,after:accepted,operation,actorId,commandId:'lifecycle_source',acceptedAt:time,openingFacts})[0];
 return {moment,receipt:{room_id:id,command_id:'lifecycle_source',actor_id:actorId,fingerprint:JSON.stringify({operation})},beforeRoom:before,acceptedRoom:accepted,room:accepted,jobProfileVersion:1,currentProfileVersion:1};
}
describe('accepted lifecycle validity',()=>{
 it.each(['opening','return','next-game'])('validates real accepted %s mapper output with committed receipt and original roster',purpose=>{const f=fixture(purpose),before=JSON.stringify(f);expect(validateLifecycleMoment(f)).toEqual({valid:true,reason:null});expect(JSON.stringify(f)).toBe(before);expect(lifecycleFactsValid(f)).toBe(true);});
 it('never promotes hydration or blank/synthetic writer refs into committed lifecycle authority',()=>{
  const f=fixture();for(const patch of [{receipt:null},{receipt:{...f.receipt,command_id:''}},{receipt:{...f.receipt,actor_id:b}},{moment:{...f.moment,purpose:'hydrate'}},{moment:{...f.moment,facts:{...f.moment.facts,eventId:''}}},{moment:{...f.moment,facts:{...f.moment.facts,observation:'writer-prose'}}},{beforeRoom:f.acceptedRoom}])expect(lifecycleFactsValid({...f,...patch})).toBe(false);
 });
 it('allows unrelated accepted score while an intro is already playing but suppresses an unstarted stale welcome',()=>{
  const f=fixture();const room=playRoom(f.room,{userId:a,action:{type:'score',category:'chance',value:25},commandId:'later_score',expectedRevision:f.room.revision,gameId:f.room.game.id,time});
  expect(validateLifecycleMoment({...f,room,started:true}).valid).toBe(true);expect(validateLifecycleMoment({...f,room})).toEqual({valid:false,reason:'progress-changed-before-start'});
 });
 it.each(['correct-score','undo-score'])('cancels return speech when %s changes a captured score',type=>{
  const f=fixture('return'),target=f.room.game.events.find(event=>event.type==='score').id;
  const room=playRoom(f.room,{userId:a,action:{type,target,value:20},commandId:'later_change',expectedRevision:f.room.revision,gameId:f.room.game.id,time});
  expect(validateLifecycleMoment({...f,room,started:true})).toEqual({valid:false,reason:'source-score-invalidated'});
 });
 it('pause cancels and persisted cancellation prevents resurrection after another resume',()=>{
  const f=fixture('return');const paused=setTournamentPaused(f.room,{userId:a,gameId:f.room.game.id,expectedRevision:f.room.revision,paused:true,time});
  expect(validateLifecycleMoment({...f,room:paused,started:true}).reason).toBe('paused');const resumed=setTournamentPaused(paused,{userId:a,gameId:paused.game.id,expectedRevision:paused.revision,paused:false,time});
  expect(validateLifecycleMoment({...f,room:resumed,cancelled:true,started:true}).reason).toBe('source-cancelled');
 });
 it('rejects room/game/profile/seat/account/name ownership substitutions',()=>{
  const f=fixture();for(const patch of [{room:{...f.room,id:nextId}},{room:{...f.room,game:{...f.room.game,id:nextId}}},{currentProfileVersion:2},{room:{...f.room,members:[f.room.members[1],f.room.members[0]]}},{room:{...f.room,hostId:b}},{room:{...f.room,game:{...f.room.game,players:[{...f.room.game.players[0],name:'Other'},f.room.game.players[1]]}}}])expect(lifecycleFactsValid({...f,...patch,started:true})).toBe(false);
 });
 it('unfinished hidden lifecycle facts never contain totals/leaders, and forged disclosure fails',()=>{
  const f=fixture('return');f.beforeRoom.game.hideTotals=f.acceptedRoom.game.hideTotals=true;
  f.moment=acceptedOutbox({before:f.beforeRoom,after:f.acceptedRoom,operation:'resume',actorId:a,commandId:'lifecycle_source',acceptedAt:time,openingFacts})[0];
  expect(lifecycleFactsValid(f)).toBe(true);expect(f.moment.facts.leaders).toEqual([]);expect(f.moment.facts.seats.every(seat=>!('total'in seat))).toBe(true);
  const forged=structuredClone(f.moment);forged.facts.seats[0].total=25;expect(validateLifecycleMoment({...f,moment:forged}).reason).toBe('source-facts-mismatch');
 });
});
