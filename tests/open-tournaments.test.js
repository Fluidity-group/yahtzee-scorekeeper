import {it,expect} from 'vitest';
import {createRoom,joinRoom,startRoom} from '../src/multiplayer/room.js';
import {setTournamentPaused} from '../src/multiplayer/tournament.js';
import {roomHandler} from '../server/rooms/handler.js';
import {renderOpenTournaments} from '../src/multiplayer/tournament-list.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',time='2026-10-13T18:00:00.000Z';
function paused(){const room=startRoom(joinRoom(createRoom({id:'00000000-0000-4000-8000-000000000003',code:'ABCDEFGH',userId:host,name:'Host',time,tournament:{name:'Weekend cup',gameCount:3,playerCount:2}}),{userId:guest,name:'Guest',time}),{userId:host,time});return setTournamentPaused(room,{userId:host,gameId:room.game.id,expectedRevision:room.revision,paused:true,time});}
it('curates paused first, separates completed tournaments and preserves host/guest labels',()=>{
 const p=paused(),active={...p,id:'active',code:'BCDEFGHJ',tournament:{...p.tournament,name:'<Active>',status:'playing'}},complete={...p,tournament:{...p.tournament,status:'completed'}};
 const html=renderOpenTournaments([active,complete,p],host);expect(html.indexOf('Weekend cup')).toBeLessThan(html.indexOf('&lt;Active&gt;'));expect(html.match(/tournament-return/g)).toHaveLength(2);expect(html).toContain('Continue hosting');expect(html).not.toContain('<Active>');expect(renderOpenTournaments([p],guest)).toContain('Return to tournament');
});
it('lists only authenticated membership, pages stable cursor and reopens paused game without a write',async()=>{
 const p=paused();let writes=0,listed=[];
 const store={rematchAvailable:async()=>true,tournamentsAvailable:async()=>true,competitionAvailable:async()=>false,openTournaments:async(user,before)=>{listed.push({user,before});return user===host?Array.from({length:20},()=>({state:p,created_at:time,id:p.id})):[];},get:async()=>structuredClone(p),update:async()=>{writes++;},commit:async()=>{writes++;}};
 const handler=roomHandler({store,authenticate:async request=>request.headers.get('Test-User')});
 const call=async(user,body)=>{const r=await handler(new Request('https://test.invalid',{method:'POST',headers:{'Test-User':user},body:JSON.stringify(body)}));return {status:r.status,...await r.json()};};
 const result=await call(host,{operation:'tournaments'});expect(result.rooms).toHaveLength(20);expect(result.nextBefore).toEqual({createdAt:time,id:p.id});
 expect((await call('outsider',{operation:'tournaments'})).rooms).toEqual([]);expect(listed[1].user).toBe('outsider');
 expect((await call(host,{operation:'tournaments',before:{createdAt:time,id:'invalid&filter'}})).status).toBe(400);
 const reopened=await call(host,{operation:'read',code:p.code});expect(reopened.room.game).toEqual(p.game);expect(reopened.room.hostId).toBe(host);expect(reopened.room.tournament.status).toBe('paused');expect(writes).toBe(0);
 expect((await call('outsider',{operation:'read',code:p.code})).status).toBe(403);
});
it('saved sessions uses authenticated account and explicit view, never a supplied player identity',async()=>{
 const p=paused(),requested=[];
 const store={rematchAvailable:async()=>true,tournamentsAvailable:async()=>true,competitionAvailable:async()=>false,sessions:async(user,view,before)=>{requested.push({user,view,before});return user===host?[{state:p,created_at:time,id:p.id}]:[];}};
 const handler=roomHandler({store,authenticate:async()=>guest});
 const call=async view=>{const r=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({operation:'sessions',view,userId:host})}));return {status:r.status,...await r.json()};};
 expect((await call('open')).rooms).toEqual([]);expect(requested[0]).toEqual({user:guest,view:'open',before:undefined});expect((await call('all')).status).toBe(400);
});
