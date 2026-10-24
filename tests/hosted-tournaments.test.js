import {describe,it,expect} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setRematchReady} from '../src/multiplayer/rematch.js';
import {setTournamentPaused,tournamentStandings} from '../src/multiplayer/tournament.js';
import {BASE_KEYS} from '../src/game/categories.js';
import {roomHandler} from '../server/rooms/handler.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003',time='2026-10-14T01:00:00.000Z';
const config={name:'Silly names cup',gameCount:2,playerCount:2};
const lobby=(tournament=config,extra={})=>createRoom({id,code:'ABCDEFGH',userId:host,name:'Custard',time,tournament,...extra});
const start=()=>startRoom(joinRoom(lobby(),{userId:guest,name:'Custard Queen',time}),{userId:host,time});
function finish(room,hostChance=0,guestChance=0){
 for(let n=0;room.game.status!=='finished';n++){
  const seat=room.game.activeSeat,category=BASE_KEYS.find(k=>room.game.sheets[seat][k]===undefined);
  room=playRoom(room,{userId:room.members[seat].userId,gameId:room.game.id,expectedRevision:room.revision,commandId:`game-${room.gameSequence??1}-score-${n}`,action:{type:'score',category,value:category==='chance'?(seat?guestChance:hostChance):0},time});
 }return room;
}
const ready=(room,userId)=>setRematchReady(room,{userId,gameId:room.game.id,gameRevision:room.game.revision,ready:true,commandId:`ready-for-${userId}`,nextGameId:'00000000-0000-4000-8000-000000000099',time});

describe('hosted tournament lifecycle',()=>{
 it('validates configuration and requires exact roster before starting',()=>{
  for(const tournament of [false,{...config,name:''},{...config,gameCount:21},{...config,gameCount:2.5},{...config,playerCount:1}])expect(()=>lobby(tournament)).toThrow();
  expect(()=>lobby(config,{source:'godice'})).toThrow('manual');
  expect(()=>startRoom(lobby(),{userId:host,time})).toThrow('chosen number');
  const full=joinRoom(lobby(),{userId:guest,name:'Queen',time});
  expect(()=>joinRoom(full,{userId:'third',name:'Third',time})).toThrow('chosen number');
  expect(joinRoom(full,{userId:guest,name:'Renamed',time})).toBe(full);
 });
 it('freezes rules and winner starts the second game, then blocks game three',()=>{
  let room=start();room.tournament.rules.name='Frozen rules';room=finish(room,1,2);const original=structuredClone(room.game);
  room=ready(ready(room,host),guest);expect(room.game.activeSeat).toBe(1);expect(room.gameSequence).toBe(2);
  expect(room.game.rules).toEqual(original.rules);expect(room.tournament.rules.name).toBe('Frozen rules');
  room=finish(room,3,1);expect(room.tournament.status).toBe('completed');
  expect(()=>ready(room,host)).toThrow('complete');
 });
 it('pauses midgame without changing scores, requires host and exact revision, resumes exact state',()=>{
  const original=start(),body={gameId:original.game.id,expectedRevision:original.revision,paused:true,time};
  expect(()=>setTournamentPaused(original,{...body,userId:guest})).toThrow('Only the host');
  expect(()=>setTournamentPaused(original,{...body,userId:host,expectedRevision:0})).toThrow('changed');
  const paused=setTournamentPaused(original,{...body,userId:host});expect(paused.game).toEqual(original.game);
  expect(()=>playRoom(paused,{userId:host})).toThrow('paused');
  const resumed=setTournamentPaused(JSON.parse(JSON.stringify(paused)),{userId:host,gameId:paused.game.id,expectedRevision:paused.revision,paused:false,time});
  expect(resumed.game).toEqual(original.game);expect(resumed.tournament.status).toBe('playing');
 });
 it('pause between games blocks all-ready advance and completed tournament cannot pause',()=>{
  let room=ready(finish(start()),host);room=setTournamentPaused(room,{userId:host,gameId:room.game.id,expectedRevision:room.revision,paused:true,time});
  expect(()=>ready(room,guest)).toThrow('paused');
  room=setTournamentPaused(room,{userId:host,gameId:room.game.id,expectedRevision:room.revision,paused:false,time});
  room=finish(ready(room,guest));expect(()=>setTournamentPaused(room,{userId:host,paused:true})).toThrow('complete');
 });
});

describe('derived tournament standings',()=>{
 it('has independent points and wins champions, preserves account ownership and counts current correction once',()=>{
  const room=finish(start(),1,2),first=structuredClone(room.game),second=structuredClone(first),third=structuredClone(first);
  second.id='second';second.sheets[0].chance=1;second.sheets[1].chance=2;
  third.id='third';third.sheets[0].chance=30;third.sheets[1].chance=0;
  room.tournament.gameCount=3;room.tournament.status='completed';room.game=third;
  const result=tournamentStandings(room,[first,second,third]);
  expect(result.completedGames).toBe(3);expect(result.pointsLeaders).toEqual([host]);expect(result.winsLeaders).toEqual([guest]);
  expect(result.standings.map(p=>p.points)).toEqual([32,4]);expect(result.standings.map(p=>p.wins)).toEqual([1,2]);
  const stale=structuredClone(third);stale.sheets[0].chance=0;
  expect(tournamentStandings(room,[first,second,stale])).toEqual(result);
 });
 it('shares tied wins and excludes active hidden scores',()=>{
  const room=start();room.hideTotals=true;room.game.sheets[0].chance=30;
  expect(tournamentStandings(room,[]).standings.map(p=>p.points)).toEqual([0,0]);
  const tie=finish(start()).game;tie.id='prior-tied-game';expect(tournamentStandings(room,[tie]).standings.map(p=>p.wins)).toEqual([1,1]);
 });
 it('recomputes final wins after an own-score correction without reopening tournament',()=>{
  let room=finish(start(),1,2);const first=structuredClone(room.game);
  room=finish(ready(ready(room,host),guest),3,1);
  const target=room.game.events.find(e=>e.type==='score'&&e.seat===0&&e.category==='chance').id;
  room=playRoom(room,{userId:host,gameId:room.game.id,expectedRevision:room.revision,commandId:'final-correction-request',action:{type:'correct-score',target,value:0},time});
  const standings=tournamentStandings(room,[first]);expect(standings.winsLeaders).toEqual([guest]);expect(standings.completedGames).toBe(2);expect(standings.final).toBe(true);
  expect(()=>ready(room,host)).toThrow('complete');
 });
 it('rejects a malformed roster or changed rule snapshot instead of awarding misleading wins',()=>{
  const room=start(),game=finish(start()).game;game.id='prior-game';
  const extra=structuredClone(game);extra.players.push({id:'outsider',name:'Unexpected'});extra.sheets.push({chance:30});
  expect(()=>tournamentStandings(room,[extra])).toThrow('different roster');
  const different=structuredClone(game);different.rules.rolls=4;expect(()=>tournamentStandings(room,[different])).toThrow('different rules');
 });
});

describe('tournament HTTP authority and durable pause',()=>{
 function harness(available=true){
  let room=start();const receipts=new Map();let writes=0;
  const store={rematchAvailable:async()=>true,tournamentsAvailable:async()=>available,get:async()=>structuredClone(room),receipt:async(_,command)=>receipts.get(command),tournamentGames:async()=>[],async commit(next,revision,{actor,commandId,fingerprint}){if(room.revision!==revision)return false;room=structuredClone(next);writes++;if(commandId)receipts.set(commandId,{actor_id:actor,fingerprint});return true;}};
  const handler=roomHandler({store,authenticate:async request=>request.headers.get('Test-User'),now:()=>time});
  const call=async(userId,body)=>{const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'Test-User':userId},body:JSON.stringify({code:room.code,...body})}));return {status:response.status,...await response.json()};};
  return {call,store,get room(){return room;},get writes(){return writes;}};
 }
 it('retries accepted pause after a later resume without re-pausing or changing data',async()=>{
  const h=harness(),pause={operation:'pause',commandId:'pause-request-id',gameId:h.room.game.id,expectedRevision:h.room.revision};
  expect((await h.call(guest,pause)).status).toBe(403);
  expect((await h.call(host,pause)).status).toBe(200);
  expect((await h.call(host,{operation:'resume',commandId:'resume-request-id',gameId:h.room.game.id,expectedRevision:h.room.revision})).status).toBe(200);
  expect((await h.call(host,pause)).room.tournament.status).toBe('playing');expect(h.writes).toBe(2);
  expect((await h.call(host,{...pause,operation:'resume'})).status).toBe(403);
 });
 it('missing capability permits read but rejects changes and standings; outsiders denied',async()=>{
  const h=harness(false);expect((await h.call(host,{operation:'read'})).room.capabilities.tournaments).toBe(false);
  expect((await h.call(host,{operation:'pause'})).status).toBe(503);expect((await h.call(host,{operation:'standings'})).status).toBe(503);expect(h.writes).toBe(0);
  const capable=harness();expect((await capable.call('outsider',{operation:'standings'})).status).toBe(403);
 });
 it('persists a receipt for an already-paused request before later resume',async()=>{
  const h=harness();const body=(operation,commandId)=>({operation,commandId,gameId:h.room.game.id,expectedRevision:h.room.revision});
  await h.call(host,body('pause','first-pause-request'));
  const redundant=body('pause','second-pause-request');expect((await h.call(host,redundant)).status).toBe(200);
  await h.call(host,body('resume','later-resume-request'));
  expect((await h.call(host,redundant)).room.tournament.status).toBe('playing');expect(h.writes).toBe(3);
 });
 it('re-reads standings if the room changes during history loading',async()=>{
  const h=harness();let loads=0;
  h.store.tournamentGames=async()=>{if(++loads===1)await h.call(host,{operation:'pause',commandId:'pause-during-history',gameId:h.room.game.id,expectedRevision:h.room.revision});return [];};
  const response=await h.call(host,{operation:'standings'});expect(response.status).toBe(200);expect(loads).toBe(2);expect(response.roomRevision).toBe(h.room.revision);
 });
});
