import {it,expect,vi} from 'vitest';
import {createCoreGame,command} from '../src/game/core.js';
import {createCommentaryService} from '../server/commentary/service.js';
import {InMemoryCommentaryStore} from '../server/commentary/in-memory-store.js';
import {commentaryHandler} from '../server/commentary/handler.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',roomId='00000000-0000-4000-8000-000000000010',time='2026-10-14T18:00:00.000Z';
const post=body=>new Request('https://local.invalid/commentary',{method:'POST',headers:{Authorization:'Bearer synthetic-user'},body:JSON.stringify(body)});
function fixture(user=host){
 let serial=20,game=createCoreGame({id:roomId,names:['Alice','Bob'],time,source:'manual'});game=command(game,{type:'start',seat:0},{id:'start001',time});game=command(game,{type:'score',seat:0,category:'chance',value:25},{id:'score001',time});
 const room={id:roomId,hostId:host,members:[{userId:host},{userId:guest}],game},store=new InMemoryCommentaryStore();
 const service=createCommentaryService({store,profile:{profanityAllowed:true,humorIntensity:'dark',frequency:'balanced'},getRoom:async()=>room,now:()=>Date.parse(time),randomId:()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`,budget:{maxRequests:2,maxCharacters:100000},syntheticProviders:{writeLine:async()=>({text:'Alice, twenty-five.',containsProfanity:false}),streamAudio:async function*(){yield new Uint8Array([1,2,3]);}}});
 return {room,store,service,handler:commentaryHandler({service,authenticate:async()=>user})};
}
it('requires confirmed auth injection and membership for even read operations',async()=>{
 for(const user of [null,'invalid-UUID']){const f=fixture(user);expect((await f.handler(post({operation:'jobs-read',roomId}))).status).toBe(401);}
 const f=fixture('00000000-0000-4000-8000-000000000003');expect((await f.handler(post({operation:'profile-read',roomId}))).status).toBe(403);
});
it('rejects client enqueue, writer input, facts, arbitrary text and provider routing keys',async()=>{
 const f=fixture();for(const body of [{operation:'enqueue',roomId},{operation:'jobs-read',roomId,facts:{}},{operation:'playback-claim',roomId,text:'invented'},{operation:'profile-update',roomId,expectedVersion:1,changes:{voiceId:'arbitrary'}}])expect((await f.handler(post(body))).status).toBe(400);
 expect(f.store.snapshot().jobs.size).toBe(0);
});
it('host settings CAS does not allow guest authority and returns safe capabilities',async()=>{
 const guestHandler=fixture(guest);expect((await guestHandler.handler(post({operation:'profile-update',roomId,expectedVersion:1,changes:{frequency:'lively'}}))).status).toBe(403);
 const f=fixture(),read=await (await f.handler(post({operation:'profile-read',roomId}))).json();expect(read.result.capabilities.liveProviders).toBe(false);
 expect((await f.handler(post({operation:'profile-update',roomId,expectedVersion:1,changes:{frequency:'highlights'}}))).status).toBe(200);expect((await f.handler(post({operation:'profile-update',roomId,expectedVersion:1,changes:{frequency:'lively'}}))).status).toBe(409);
});
it('safe job reads never create moments or expose identities, prompts or private facts',async()=>{
 const f=fixture();expect((await (await f.handler(post({operation:'jobs-read',roomId}))).json()).result).toEqual([]);const id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);await f.service.prepareTrusted(id);
 const data=await (await f.handler(post({operation:'jobs-read',roomId}))).json();expect(data.result[0]).toMatchObject({id,gameId:roomId,caption:'Alice, twenty-five.',status:'ready',profileVersion:1});expect(data.result[0].dependencyEventIds).toHaveLength(1);expect(JSON.stringify(data)).not.toContain(host);expect(data.result[0]).not.toHaveProperty('facts');
});
it('job-scoped GET carries claim in headers and streams audio without URL secrets or arbitrary body',async()=>{
 const f=fixture(),id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);await f.service.prepareTrusted(id);
 const lease=(await (await f.handler(post({operation:'playback-acquire',roomId,device:'host-device-1'}))).json()).result;
 const claim=(await (await f.handler(post({operation:'playback-claim',roomId,device:'host-device-1',epoch:lease.epoch,jobId:id}))).json()).result;
 const headers={Authorization:'Bearer synthetic-user','X-Commentary-Claim':claim.token,'X-Commentary-Epoch':String(lease.epoch),'X-Commentary-Device':'host-device-1'};
 const url=`https://local.invalid/commentary/${roomId}/audio/${id}`,response=await f.handler(new Request(url,{headers}));expect(response.headers.get('content-type')).toBe('audio/mpeg');expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1,2,3]));
 expect((await f.handler(new Request(url,{headers}))).status).toBe(409);expect((await f.handler(new Request(url+'?token=unsafe',{headers}))).status).toBe(404);
});
it('enforces bounded bodies and sanitizes adapter/provider exceptions',async()=>{
 const f=fixture();expect((await f.handler(new Request('https://local.invalid/commentary',{method:'POST',body:'x'.repeat(4097)}))).status).toBe(413);
 const handler=commentaryHandler({service:f.service,authenticate:vi.fn(async()=>{throw Error('credential-secret');})});const response=await handler(post({operation:'jobs-read',roomId}));expect(response.status).toBe(500);expect(await response.text()).not.toContain('credential-secret');
});
