import {it,expect} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {BASE_KEYS} from '../src/game/categories.js';
import {tournamentStandings} from '../src/multiplayer/tournament.js';
import {roomHandler} from '../server/rooms/handler.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',time='2026-10-14T12:00:00.000Z';
function started(mode='standard'){return startRoom(joinRoom(createRoom({id:'00000000-0000-4000-8000-000000000003',code:'ABCDEFGH',userId:host,name:'Host',mode,time}),{userId:guest,name:'Guest',time}),{userId:host,time});}
function score(room,category,value,id){return playRoom(room,{userId:room.members[room.game.activeSeat].userId,gameId:room.game.id,expectedRevision:room.revision,commandId:id,action:{type:'score',category,value},time});}
function harness(initial){let room=structuredClone(initial);let commits=0;const history=new Map();
 const store={rematchAvailable:async()=>true,tournamentsAvailable:async()=>true,competitionAvailable:async()=>true,get:async()=>structuredClone(room),async commit(next,revision){if(room.revision!==revision)return false;room=structuredClone(next);history.set(room.game.id,room.game);commits++;return true;}};
 const handler=roomHandler({store,authenticate:async r=>r.headers.get('Test-User'),now:()=>time});
 const call=async(user,body)=>{const r=await handler(new Request('https://test.invalid',{method:'POST',headers:{'Test-User':user},body:JSON.stringify({code:room.code,...body})}));return {status:r.status,...await r.json()};};
 const undo=()=>({operation:'command',gameId:room.game.id,expectedRevision:room.revision,commandId:'undo-latest-score',action:{type:'undo-score',target:room.game.events.findLast(e=>e.type==='score').id}});
 return {call,undo,history,get room(){return room;},get commits(){return commits;}};
}
it('undoes wrong Yahtzee from prior player seat, keeps audit and safely deduplicates',async()=>{
 const h=harness(score(started(),'yahtzee',50,'wrong-yahtzee-score'));const body=h.undo();
 expect((await h.call(guest,{...body,action:{...body.action,seat:0}})).status).toBe(403);
 expect((await h.call(host,{...body,gameId:undefined})).status).toBe(409);
 const result=await h.call(host,body);expect(result.status).toBe(200);expect(result.room.game.activeSeat).toBe(0);expect(result.room.game.sheets[0].yahtzee).toBeUndefined();expect(result.room.game.events.some(e=>e.type==='score-undo')).toBe(true);
 expect((await h.call(host,body)).status).toBe(200);expect(h.commits).toBe(1);expect(h.history.get(h.room.game.id)).toEqual(h.room.game);
});
it('racing next-player score closes undo rather than losing either players work',async()=>{
 const h=harness(score(started(),'yahtzee',50,'wrong-yahtzee-score')),undo=h.undo();
 const results=await Promise.all([h.call(guest,{operation:'command',gameId:h.room.game.id,expectedRevision:h.room.revision,commandId:'guest-next-score',action:{type:'score',category:'chance',value:20}}),h.call(host,undo)]);
 expect(results[0].status).toBe(200);expect(results[1].status).not.toBe(200);expect(h.room.game.sheets[0].yahtzee).toBe(50);expect(h.room.game.sheets[1].chance).toBe(20);
});
it.each(['standard','competition','accumulative'])('advertises and authorizes own last-turn Undo for hosted %s',async mode=>{
 const h=harness(score(started(mode),'chance',20,'mode-score'));
 const read=await h.call(host,{operation:'read'});expect(read.room.capabilities.undoScore).toBe(true);
 const body=h.undo();expect((await h.call(guest,body)).status).toBe(403);
 const result=await h.call(host,body);expect(result.status).toBe(200);expect(result.room.game.sheets[0].chance).toBeUndefined();expect(result.room.game.activeSeat).toBe(0);
});
it('reopens final Standard tournament game, clears readiness and excludes stale completed snapshot from standings',()=>{
 let room=started();for(let n=0;room.game.status!=='finished';n++)room=score(room,BASE_KEYS.find(k=>room.game.sheets[room.game.activeSeat][k]===undefined),0,`finished-category-${n}`);
 const finished=structuredClone(room.game);room.tournament={name:'Cup',gameCount:2,playerCount:2,rules:structuredClone(room.game.rules),status:'completed'};room.gameSequence=2;room.rematch={ready:[host,guest]};
 const latest=room.game.events.findLast(e=>e.type==='score');room=playRoom(room,{userId:guest,gameId:room.game.id,expectedRevision:room.revision,commandId:'undo-final-category',action:{type:'undo-score',target:latest.id},time});
 expect(room.game.status).toBe('active');expect(room.tournament.status).toBe('playing');expect(room.rematch).toBeNull();expect(tournamentStandings(room,[finished]).completedGames).toBe(0);
});
