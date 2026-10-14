import {it,expect,vi} from 'vitest';
import {createCoreGame,command} from '../src/game/core.js';
import {createCommentaryService} from '../server/commentary/service.js';
import {InMemoryCommentaryStore} from '../server/commentary/in-memory-store.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',stranger='00000000-0000-4000-8000-000000000003';
const roomId='00000000-0000-4000-8000-000000000010',time='2026-10-14T18:00:00.000Z',device='host-device-1';
function fixture(options={}){
 let tick=Date.parse(time),sequence=20;
 let game=createCoreGame({id:roomId,names:['Alice','Bob'],source:'manual',time});
 game=command(game,{type:'start',seat:0},{id:'start001',time});game=command(game,{type:'score',seat:0,category:'chance',value:25},{id:'score001',time});
 let room={id:roomId,hostId:host,members:[{userId:host,name:'Alice'},{userId:guest,name:'Bob'}],game};
 const store=new InMemoryCommentaryStore(),providers={writeLine:vi.fn(async()=>({text:'Alice, twenty-five. The paperwork has ambitions.',containsProfanity:false})),streamAudio:vi.fn(async function*(){yield new Uint8Array([1,2,3]);})};
 const service=createCommentaryService({store,profile:{profanityAllowed:true,humorIntensity:'dark',frequency:'balanced'},getRoom:async()=>structuredClone(room),now:()=>tick,randomId:()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`,budget:{maxRequests:10,maxCharacters:100000},syntheticProviders:providers,...options});
 return {service,store,providers,get room(){return room;},setRoom:value=>{room=value;},advance:value=>{tick+=value;},host,guest,roomId,device};
}
async function ready(f){const id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);await f.service.prepareTrusted(id);const lease=await f.service.acquire(host,roomId,{device});const claim=await f.service.claimPlayback(host,roomId,{jobId:id,device,epoch:lease.epoch});return {id,lease,claim,body:{jobId:id,device,epoch:lease.epoch,claimToken:claim.token}};}
it('captures only accepted facts with actual names and deduplicates simultaneous trusted command moments',async()=>{
 const f=fixture(),event=f.room.game.events.at(-1).id;const ids=await Promise.all([f.service.enqueueAccepted(f.room,event),f.service.enqueueAccepted(f.room,event)]);expect(ids[0]).toBe(ids[1]);
 const job=f.store.snapshot().jobs.get(ids[0]);expect(job.facts.label).toBe('Alice');expect(job.facts.observation).toBe('accepted-score-only');expect(job.facts.namesInstructionAuthority).toBe('none');expect(job.audience).toEqual([host,guest]);
 const hidden={...f.room,game:{...f.room.game,hideTotals:true}};const other=fixture();const hiddenId=await other.service.enqueueAccepted(hidden,event);expect(other.store.snapshot().jobs.get(hiddenId).facts.seats.every(s=>!('total' in s))).toBe(true);
});
it('rejects invalid UUID, nonmember and guest host operations',async()=>{
 const f=fixture();await expect(f.service.getProfile('not-auth',roomId)).rejects.toMatchObject({status:401});await expect(f.service.getProfile(stranger,roomId)).rejects.toMatchObject({status:403});await expect(f.service.acquire(guest,roomId,{device})).rejects.toMatchObject({status:403});
});
it('settings CAS has one winner and cancels earlier queued work without a second paid job',async()=>{
 const f=fixture(),id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);
 const results=await Promise.allSettled([f.service.setProfile(host,roomId,{expectedVersion:1,changes:{frequency:'highlights'}}),f.service.setProfile(host,roomId,{expectedVersion:1,changes:{frequency:'lively'}})]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(f.store.snapshot().jobs.get(id).reason).toBe('profile-changed');expect(await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id)).toBe(id);
});
it('defaults to providers disabled without spending budget',async()=>{
 const f=fixture({syntheticProviders:null}),id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);await f.service.prepareTrusted(id);expect(f.store.snapshot().jobs.get(id).reason).toBe('providers-disabled');expect(f.store.snapshot().attempts.size).toBe(0);
});
it('serializes worker race and persists submitted budget before provider invocation',async()=>{
 const f=fixture(),id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);f.providers.writeLine.mockImplementation(async()=>{expect(f.store.snapshot().attempts.size).toBe(1);expect([...f.store.snapshot().attempts.values()][0].status).toBe('submitted');return {text:'Ready.',containsProfanity:false};});
 await Promise.all([f.service.prepareTrusted(id),f.service.prepareTrusted(id)]);expect(f.providers.writeLine).toHaveBeenCalledTimes(1);expect(f.store.snapshot().budgets.get(roomId).requests).toBe(1);
});
it('failed writer consumes reservation, sanitized failure cannot alter scoring',async()=>{
 const f=fixture(),snapshot=JSON.stringify(f.room),id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);f.providers.writeLine.mockRejectedValue(Error('provider-secret'));expect(await f.service.prepareTrusted(id)).toBeNull();expect(f.store.snapshot().budgets.get(roomId).requests).toBe(1);expect(f.store.snapshot().jobs.get(id).status).toBe('failed');expect(JSON.stringify(f.room)).toBe(snapshot);
});
it('request and character ceilings prevent additional provider dispatch',async()=>{
 const f=fixture({budget:{maxRequests:1,maxCharacters:100000}}),r=await ready(f);await expect(f.service.audio(host,roomId,r.body)).rejects.toMatchObject({status:429});expect(f.providers.streamAudio).not.toHaveBeenCalled();
 const tiny=fixture({budget:{maxRequests:10,maxCharacters:1}}),id=await tiny.service.enqueueAccepted(tiny.room,tiny.room.game.events.at(-1).id);await expect(tiny.service.prepareTrusted(id)).rejects.toMatchObject({status:429});expect(tiny.providers.writeLine).not.toHaveBeenCalled();
});
it('host devices race once and expired epochs cannot heartbeat or acknowledge new playback',async()=>{
 const f=fixture();const result=await Promise.allSettled([f.service.acquire(host,roomId,{device}),f.service.acquire(host,roomId,{device:'host-device-2'})]);expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 f.advance(16000);const next=await f.service.acquire(host,roomId,{device:'host-device-3'});expect(next.epoch).toBe(2);await expect(f.service.heartbeat(host,roomId,{device,epoch:1})).rejects.toMatchObject({status:409});
});
it('returns the first chunk while provider stream has not completed and prevents parallel duplicate audio billing',async()=>{
 const f=fixture(),r=await ready(f);let finish;const pending=new Promise(resolve=>{finish=resolve;});f.providers.streamAudio.mockImplementation(async function*(){yield new Uint8Array([7]);await pending;yield new Uint8Array([8]);});
 const stream=await f.service.audio(host,roomId,r.body),reader=stream.getReader();expect((await reader.read()).value).toEqual(new Uint8Array([7]));expect([...f.store.snapshot().attempts.values()].find(a=>a.stage==='tts').status).toBe('submitted');
 await expect(f.service.audio(host,roomId,r.body)).rejects.toMatchObject({status:409});finish();expect((await reader.read()).value).toEqual(new Uint8Array([8]));expect((await reader.read()).done).toBe(true);expect([...f.store.snapshot().attempts.values()].find(a=>a.stage==='tts').firstAudibleMs).toBeNull();
});
it('host acknowledgments are idempotent, report only host exposure and reject guests/stale sequence',async()=>{
 const f=fixture(),r=await ready(f),stream=await f.service.audio(host,roomId,r.body);await new Response(stream).arrayBuffer();
 const first=await f.service.playbackEvent(host,roomId,{...r.body,status:'started',sequence:1});expect(first.heardBy).toEqual([host]);expect(first.expectedAudience).toEqual([host,guest]);expect(await f.service.playbackEvent(host,roomId,{...r.body,status:'started',sequence:1})).toEqual(first);
 await expect(f.service.playbackEvent(guest,roomId,{...r.body,status:'completed',sequence:2})).rejects.toMatchObject({status:403});expect((await f.service.playbackEvent(host,roomId,{...r.body,status:'completed',sequence:2})).status).toBe('completed');await expect(f.service.playbackEvent(host,roomId,{...r.body,status:'started',sequence:1})).rejects.toMatchObject({status:409});
});
it.each(['undo','pause','game','profile'])('revalidates %s before playback and does not spend on invalid audio',async reason=>{
 const f=fixture(),r=await ready(f);
 if(reason==='undo'){const event=f.room.game.events.at(-1);f.setRoom({...f.room,game:{...f.room.game,events:[...f.room.game.events,{id:'undo',type:'score-undo',target:event.id}]}});}
 if(reason==='pause')f.setRoom({...f.room,paused:true});if(reason==='game')f.setRoom({...f.room,game:{...f.room.game,id:'different'}});if(reason==='profile')await f.service.setProfile(host,roomId,{expectedVersion:1,changes:{profanityAllowed:false}});
 await expect(f.service.audio(host,roomId,r.body)).rejects.toMatchObject({status:409});expect(f.providers.streamAudio).not.toHaveBeenCalled();
});
it('an unrelated accepted score revision allows an accurate already-started sentence to finish',async()=>{
 const f=fixture(),r=await ready(f),stream=await f.service.audio(host,roomId,r.body);await new Response(stream).arrayBuffer();await f.service.playbackEvent(host,roomId,{...r.body,status:'started',sequence:1});f.setRoom({...f.room,revision:99,game:{...f.room.game,revision:99,events:[...f.room.game.events,{id:'other',type:'score',seat:1,category:'chance',value:20}]}});expect((await f.service.playbackEvent(host,roomId,{...r.body,status:'completed',sequence:2})).status).toBe('completed');
});
it('transaction callback rollback keeps partial changes out and refuses asynchronous work',async()=>{
 const store=new InMemoryCommentaryStore();await expect(store.transaction(state=>{state.settings.set('x',{});throw Error('failed');})).rejects.toThrow('failed');expect(store.snapshot().settings.size).toBe(0);await expect(store.transaction(async state=>{state.settings.set('x',{});})).rejects.toThrow('synchronous');expect(store.snapshot().settings.size).toBe(0);
});

it('timeouts and cancels a stalled injected stream while preserving consumed budget and no guest exposure',async()=>{
 const f=fixture({streamTimeoutMs:5}),r=await ready(f);f.providers.streamAudio.mockImplementation(async function*(){await new Promise(()=>{});yield new Uint8Array([1]);});
 const reader=(await f.service.audio(host,roomId,r.body)).getReader();await expect(reader.read()).rejects.toThrow('interrupted');expect(f.store.snapshot().budgets.get(roomId).requests).toBe(2);expect(f.store.snapshot().exposure.size).toBe(0);
});
it('failure before playback onset records no heard accounts',async()=>{
 const f=fixture(),r=await ready(f);const receipt=await f.service.playbackEvent(host,roomId,{...r.body,status:'failed',sequence:1});expect(receipt.heardBy).toEqual([]);expect(receipt.expectedAudience).toEqual([host,guest]);
});
it('a profile switch while writer is in flight fences its late candidate',async()=>{
 const f=fixture(),id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);let finish;f.providers.writeLine.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const pending=f.service.prepareTrusted(id);await vi.waitFor(()=>expect(f.providers.writeLine).toHaveBeenCalledTimes(1));await f.service.setProfile(host,roomId,{expectedVersion:1,changes:{profanityAllowed:false}});finish({text:'Late candidate.',containsProfanity:false});expect(await pending).toBeNull();expect(f.store.snapshot().jobs.get(id).status).toBe('cancelled');
});
it('validates paused state between streamed chunks and rejects delayed stale-epoch acknowledgment',async()=>{
 const f=fixture(),r=await ready(f);let finish;const pending=new Promise(resolve=>{finish=resolve;});f.providers.streamAudio.mockImplementation(async function*(){yield new Uint8Array([1]);await pending;yield new Uint8Array([2]);});
 const reader=(await f.service.audio(host,roomId,r.body)).getReader();await reader.read();await f.service.playbackEvent(host,roomId,{...r.body,status:'started',sequence:1});f.setRoom({...f.room,paused:true});finish();await expect(reader.read()).rejects.toThrow('interrupted');expect(f.store.snapshot().exposure.get(r.claim.token).status).toBe('interrupted');f.advance(16000);await f.service.acquire(host,roomId,{device:'host-device-2'});await expect(f.service.playbackEvent(host,roomId,{...r.body,status:'completed',sequence:2})).rejects.toMatchObject({status:409});
});

it('writer deadline consumes the submitted attempt and fences a stalled writer without delaying scores',async()=>{
 const f=fixture({writerTimeoutMs:5}),id=await f.service.enqueueAccepted(f.room,f.room.game.events.at(-1).id);f.providers.writeLine.mockImplementation(()=>new Promise(()=>{}));expect(await f.service.prepareTrusted(id)).toBeNull();expect(f.store.snapshot().jobs.get(id).status).toBe('failed');expect(f.store.snapshot().budgets.get(roomId).requests).toBe(1);
});

it('Undo invalidates completed exposure without erasing it and settings hide incompatible completed captions',async()=>{
 const f=fixture(),r=await ready(f),stream=await f.service.audio(host,roomId,r.body);await new Response(stream).arrayBuffer();await f.service.playbackEvent(host,roomId,{...r.body,status:'started',sequence:1});await f.service.playbackEvent(host,roomId,{...r.body,status:'completed',sequence:2});
 const target=f.room.game.events.at(-1).id;f.setRoom({...f.room,game:{...f.room.game,events:[...f.room.game.events,{id:'undo-later',type:'score-undo',target}]}});const jobs=await f.service.list(host,roomId);expect(jobs[0].caption).toBeNull();expect(f.store.snapshot().exposure.get(r.claim.token)).toMatchObject({status:'completed',valid:false,heardBy:[host]});
 const other=fixture(),q=await ready(other),audio=await other.service.audio(host,roomId,q.body);await new Response(audio).arrayBuffer();await other.service.playbackEvent(host,roomId,{...q.body,status:'started',sequence:1});await other.service.playbackEvent(host,roomId,{...q.body,status:'completed',sequence:2});await other.service.setProfile(host,roomId,{expectedVersion:1,changes:{profanityAllowed:false}});expect((await other.service.list(host,roomId))[0].caption).toBeNull();expect(other.store.snapshot().exposure.get(q.claim.token).status).toBe('completed');
});

it('requires an explicit cadence profile and never silently chooses balanced for a table',()=>{
 expect(()=>fixture({profile:undefined})).toThrow('Explicit valid commentary settings');
 expect(()=>fixture({profile:{profanityAllowed:true,humorIntensity:'dark'}})).toThrow('Explicit valid commentary settings');
});
it('voice settings use host CAS and fence previous-voice jobs independently of intensity and profanity',async()=>{
 const f=fixture(),r=await ready(f);expect((await f.service.getProfile(host,roomId)).voiceOption).toBe('victor');
 const results=await Promise.allSettled([f.service.setProfile(host,roomId,{expectedVersion:1,changes:{voiceOption:'ditzy'}}),f.service.setProfile(host,roomId,{expectedVersion:1,changes:{voiceOption:'victor'}})]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 const settings=await f.service.getProfile(host,roomId);expect(settings).toMatchObject({version:2,voiceOption:'ditzy',humorIntensity:'dark',profanityAllowed:true,frequency:'balanced'});expect(f.store.snapshot().jobs.get(r.id).reason).toBe('profile-changed');
 await expect(f.service.audio(host,roomId,r.body)).rejects.toMatchObject({status:409});await expect(f.service.setProfile(host,roomId,{expectedVersion:2,changes:{voiceOption:'https://arbitrary.invalid'}})).rejects.toMatchObject({status:400});
});
it('synthetic TTS receives only the server-resolved selected voice and remains live-provider disabled',async()=>{
 const f=fixture(),r=await ready(f),stream=await f.service.audio(host,roomId,r.body);await new Response(stream).arrayBuffer();expect(f.providers.streamAudio.mock.calls[0][0].voice).toEqual({voiceOption:'victor',voiceId:'cPoqAvGWCPfCfyPMwe4z'});expect((await f.service.getProfile(host,roomId)).capabilities.liveProviders).toBe(false);
});
