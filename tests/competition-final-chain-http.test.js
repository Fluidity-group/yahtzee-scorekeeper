import {it,expect} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {BASE_KEYS} from '../src/game/categories.js';
import {roomHandler} from '../server/rooms/handler.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',time='2026-10-14T01:00:00Z';
function chain(){
 let room=startRoom(joinRoom(createRoom({id:'00000000-0000-4000-8000-000000000003',code:'ABCDEFGH',userId:host,name:'Host',mode:'competition',rulesVersion:2,time}),{userId:guest,name:'Guest',time}),{userId:host,time});
 let n=0;
 for(const category of ['yahtzee',...BASE_KEYS.filter(k=>!['chance','yahtzee'].includes(k)),'chance'])for(const userId of [host,guest]){
  room=playRoom(room,{userId,gameId:room.game.id,expectedRevision:room.revision,commandId:`category-command-${n++}`,action:{type:'score',category,value:userId===guest&&category==='yahtzee'?50:userId===guest&&category==='chance'?30:0,...(userId===guest&&category==='chance'?{yahtzeeFace:6}:{})},time});
 }
 return room;
}
function harness(available=true){
 let room=chain();const archives=new Map();let commits=0;
 const store={rematchAvailable:async()=>true,tournamentsAvailable:async()=>true,competitionAvailable:async()=>available,get:async()=>structuredClone(room),receipt:async()=>null,async commit(next,revision){if(room.revision!==revision)return false;room=structuredClone(next);archives.set(room.game.id,room.game);commits++;return true;}};
 const handler=roomHandler({store,authenticate:async request=>request.headers.get('Test-User'),now:()=>time});
 const call=async(userId,body)=>{const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'Test-User':userId},body:JSON.stringify({code:room.code,...body})}));return {status:response.status,...await response.json()};};
 const roll=(face,commandId)=>({operation:'command',rulesVersion:2,gameId:room.game.id,expectedRevision:room.revision,commandId,action:{type:'final-chain-roll',face}});
 return {call,roll,archives,get room(){return room;},get commits(){return commits;}};
}
it('preserves exact last-player chain until all three failures, atomically saving its chronology',async()=>{
 const h=harness();expect(h.room.game.status).toBe('active');expect(h.room.game.finalChain.seat).toBe(1);
 for(let n=1;n<=3;n++){
  const result=await h.call(guest,h.roll(null,`failed-roll-${n}`));expect(result.status).toBe(200);expect(result.room.game.status).toBe(n===3?'finished':'active');
 }
 expect(h.archives.get(h.room.game.id).events.filter(e=>e.type==='final-chain-roll')).toHaveLength(3);
});
it('requires new protocol, exact seat/game and capability; retries cannot add another bonus',async()=>{
 const h=harness();const body=h.roll(3,'successful-bonus-roll');
 expect((await h.call(host,body)).status).toBe(403);
 expect((await h.call(guest,{...body,rulesVersion:undefined})).status).toBe(409);
 expect((await h.call(guest,{...body,gameId:'stale-game'})).status).toBe(409);
 expect((await h.call(guest,body)).room.game.sheets[1].yahtzeeBonus).toBe(200);
 expect((await h.call(guest,body)).room.game.sheets[1].yahtzeeBonus).toBe(200);expect(h.commits).toBe(1);
 const unavailable=harness(false);expect((await unavailable.call(guest,unavailable.roll(null,'unsupported-roll'))).status).toBe(503);expect(unavailable.commits).toBe(0);
});
it('does not finish tournament or award standings while a final chain remains active',async()=>{
 const h=harness();h.room.tournament={name:'Two games',gameCount:2,playerCount:2,rules:structuredClone(h.room.game.rules),status:'playing'};h.room.gameSequence=2;
 for(let n=1;n<=3;n++){const response=await h.call(guest,h.roll(null,`tournament-failed-${n}`));expect(response.room.tournament.status).toBe(n===3?'completed':'playing');}
});
