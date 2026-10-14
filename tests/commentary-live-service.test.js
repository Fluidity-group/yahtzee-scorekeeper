import {describe,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {acceptedOutbox} from '../server/commentary/accepted-outbox.js';
import {openingFacts} from '../src/commentary/opening-facts.js';
import {createCommentaryService} from '../server/commentary/service.js';
import {DurableCommentaryStore,emptyDurableCommentaryState,encodeCommentaryState} from '../server/commentary/durable-store.js';
import {InMemoryCommentaryStore} from '../server/commentary/in-memory-store.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',roomId='00000000-0000-4000-8000-000000000003',scopeId='00000000-0000-4000-8000-000000000004',device='host-phone';
const initial=Date.parse('2026-10-14T18:00:00Z');
async function fixture(options={}){
 let wall=initial,mono=0,sequence=10,state=encodeCommentaryState(emptyDurableCommentaryState()),version=0,room;
 const time=()=>new Date(wall).toISOString(),rpc=vi.fn(async(operation,body)=>{
  if(operation==='clubhouse_commentary_load')return {version,state:structuredClone(state),databaseNowMs:wall};
  if(operation==='clubhouse_commentary_commit'){if(body.p_expected_version!==version)return {committed:false};state=structuredClone(body.p_state);version++;return {committed:true,version,databaseNowMs:wall};}
  throw Error('Unsupported synthetic RPC');
 });
 const store=await new DurableCommentaryStore({rpc,scopeId}).initialize();
 const lobby=joinRoom(createRoom({id:roomId,code:'ABCDEFGH',userId:host,name:'Alex',time:time()}),{userId:guest,name:'Sam',time:time()});room=startRoom(lobby,{userId:host,time:time()});
 const providers={liveConfigured:true,writeLine:vi.fn(async()=>({text:'Alex, your stationery has formed a shadow government.',containsProfanity:false,mechanism:'misdirection',subject:'player-blurb'})),streamAudio:vi.fn(async function*(){yield new Uint8Array([1,2]);})};
 const getRoom=vi.fn(async id=>id===roomId?structuredClone(room):null);
 const configuration={store,getRoom,profile:{enabled:true,humorIntensity:'dark',profanityAllowed:true,frequency:'balanced'},now:()=>store.databaseNowMs,monotonicNow:()=>mono,randomId:()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`,budget:{maxRequests:100,maxCharacters:1000000},liveProviders:providers,...options};
 const service=createCommentaryService(configuration);
 function score(user=host,value=25,commandId='score_0001'){
  const before=room;room=playRoom(room,{userId:user,action:{type:'score',category:'chance',value},commandId,gameId:room.game.id,expectedRevision:room.revision,time:time()});
  const moment=acceptedOutbox({before,after:room,actorId:user,commandId,operation:'command',acceptedAt:time()})[0];return {moment,beforeRoom:before,acceptedRoom:structuredClone(room),receipt:{room_id:roomId,command_id:commandId,actor_id:user,fingerprint:'accepted-'+commandId}};
 }
 return {service,configuration,store,rpc,providers,getRoom,lobby,get room(){return room;},setRoom:next=>{room=next;},score,advance:ms=>{wall+=ms;mono+=ms;},get state(){return structuredClone(state);},async restart(){return new DurableCommentaryStore({rpc,scopeId}).initialize();}};
}
async function ready(f){const accepted=f.score(),jobId=await f.service.enqueueCommitted(accepted);await f.service.prepareTrusted(jobId);const lease=await f.service.acquire(host,roomId,{device});const claim=await f.service.claimPlayback(host,roomId,{jobId,device,epoch:lease.epoch});return {jobId,device,epoch:lease.epoch,claimToken:claim.token};}
async function heard(f,body){await new Response(await f.service.audio(host,roomId,body)).arrayBuffer();await f.service.playbackEvent(host,roomId,{...body,status:'started',sequence:1});await f.service.playbackEvent(host,roomId,{...body,status:'completed',sequence:2});}
describe('live service on actual durable-store class with synthetic RPC/providers',()=>{
 it('rejects in-memory live provider wiring and maps one committed score to one persisted job',async()=>{
  const f=await fixture();expect(()=>createCommentaryService({...f.configuration,store:new InMemoryCommentaryStore()})).toThrow('durable persistence');
  const input=f.score(),job=await f.service.enqueueCommitted(input);expect(await f.service.enqueueCommitted(input)).toBe(job);await f.service.prepareTrusted(job);await f.service.prepareTrusted(job);
  expect(f.providers.writeLine).toHaveBeenCalledOnce();expect(f.providers.writeLine.mock.calls[0][0]).toMatchObject({roomId,jobId:job,requestId:expect.any(String),facts:{accountId:host,value:25}});expect((await f.restart()).snapshot().jobs.get(job).status).toBe('ready');
 });
 it('rejects forged accepted value/audience/revision and receipt fingerprint before jobs/providers',async()=>{
  const f=await fixture(),input=f.score();for(const change of [value=>{value.moment.facts.value=999;},value=>{value.moment.audience.reverse();},value=>{value.moment.acceptedRoomRevision++;},value=>{value.receipt.fingerprint='';}]){
   const fake=structuredClone(input);change(fake);await expect(f.service.enqueueCommitted(fake)).rejects.toThrow();
  }expect(f.store.snapshot().jobs.size).toBe(0);expect(f.providers.writeLine).not.toHaveBeenCalled();
 });
 it('disabled tables consume accepted moments quietly and enable creates exactly one committed welcome',async()=>{
  const f=await fixture({profile:{enabled:false,humorIntensity:'dark',profanityAllowed:true,frequency:'balanced'}});const input=f.score(),job=await f.service.enqueueCommitted(input);expect(f.store.snapshot().jobs.get(job).status).toBe('silent');await f.service.prepareTrusted(job);expect(f.providers.writeLine).not.toHaveBeenCalled();
  const result=await f.service.setProfile(host,roomId,{expectedVersion:1,changes:{enabled:true}});expect(result.greetingJobId).toBeTruthy();expect(f.store.snapshot().jobs.get(result.greetingJobId).facts.purpose).toBe('return');
  await f.service.prepareTrusted(result.greetingJobId);expect(f.providers.writeLine).toHaveBeenCalledOnce();await expect(f.service.setProfile(host,roomId,{expectedVersion:1,changes:{enabled:true}})).rejects.toMatchObject({status:409});expect(f.store.snapshot().jobs.size).toBe(2);
  const captions=await f.service.list(host,roomId);expect(captions.find(c=>c.id===result.greetingJobId)).toMatchObject({caption:expect.any(String),sourceCommandId:expect.any(String),lifecycleVerified:true});
 });
 it('fresh enable intro counts scoring boxes rather than nonnull bonus bookkeeping',async()=>{
  const f=await fixture({profile:{enabled:false,humorIntensity:'dark',profanityAllowed:true,frequency:'balanced'}});f.room.game.sheets[0].yahtzeeBonus=0;
  const result=await f.service.setProfile(host,roomId,{expectedVersion:1,changes:{enabled:true}});expect(f.store.snapshot().jobs.get(result.greetingJobId).facts).toMatchObject({purpose:'opening',scoresRecorded:0});
 });
 it('accepts grounded lifecycle and refuses hydration/replay creating a second greeting',async()=>{
  const f=await fixture(),commandId='start_0001',moment=acceptedOutbox({before:f.lobby,after:f.room,actorId:host,commandId,operation:'start',acceptedAt:new Date(initial).toISOString(),openingFacts})[0];
  const input={moment,beforeRoom:f.lobby,acceptedRoom:f.room,receipt:{room_id:roomId,command_id:commandId,actor_id:host,fingerprint:'accepted-start'}};const job=await f.service.enqueueCommitted(input);expect(await f.service.enqueueCommitted(input)).toBe(job);await f.service.prepareTrusted(job);expect((await f.service.list(host,roomId))[0]).toMatchObject({purpose:'opening',sourceCommandId:commandId});expect(f.providers.writeLine).toHaveBeenCalledOnce();
 });
 it('target-only shared blurb CAS fences late writer result and preserves feedback ownership',async()=>{
  const f=await fixture();await f.service.setPlayerProfile(host,roomId,{expectedVersion:0,changes:{blurb:'I collect stationery.',shareWithRoom:true}});await f.service.setPlayerProfile(guest,roomId,{expectedVersion:0,changes:{blurb:'Private golf profile.',shareWithRoom:false}});
  const input=f.score(),job=await f.service.enqueueCommitted(input);let finish;f.providers.writeLine.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const pending=f.service.prepareTrusted(job);while(!finish)await new Promise(resolve=>setTimeout(resolve,0));expect(f.providers.writeLine.mock.calls[0][0].personalContext.blurb).toBe('I collect stationery.');expect(JSON.stringify(f.providers.writeLine.mock.calls[0][0])).not.toContain('Private golf profile');
  await f.service.setPlayerProfile(host,roomId,{expectedVersion:1,changes:{blurb:'Changed.'}});finish({text:'Old profile line.',containsProfanity:false});expect(await pending).toBeNull();expect(f.store.snapshot().jobs.get(job).reason).toBe('personal-profile-changed');
 });
 it('persistent completed speech enables own host playback feedback and guest caption feedback without guest hearing',async()=>{
  const f=await fixture(),body=await ready(f);await heard(f,body);await f.service.feedback(host,roomId,{jobId:body.jobId,value:'like',basis:'playback'});await f.service.feedback(guest,roomId,{jobId:body.jobId,value:'dislike',basis:'caption'});
  const snapshot=(await f.restart()).snapshot();expect(snapshot.exposure.get(body.claimToken).heardBy).toEqual([host]);expect(snapshot.feedback.get(body.jobId+':'+guest).basis).toBe('caption');await expect(f.service.feedback(guest,roomId,{jobId:body.jobId,value:'like',basis:'playback'})).rejects.toMatchObject({status:409});
 });
 it('unknown dispatched writer outcome stays consumed after restart and is never retried',async()=>{
  const f=await fixture(),input=f.score(),job=await f.service.enqueueCommitted(input);f.providers.writeLine.mockImplementation(async request=>{await f.store.transaction(state=>{state.attempts.get(request.requestId).providerDispatchedAt=initial;});throw Error('Ambiguous provider failure');});
  expect(await f.service.prepareTrusted(job)).toBeNull();const state=(await f.restart()).snapshot();expect([...state.attempts.values()][0].status).toBe('unknown');const restarted=createCommentaryService({...f.configuration,store:await f.restart()});expect(await restarted.prepareTrusted(job)).toBeNull();expect(f.providers.writeLine).toHaveBeenCalledOnce();expect(state.budgets.get(roomId).requests).toBe(1);
 });
 it('preserves provider-completed accounting while hiding a post-generation incompatible utterance',async()=>{
  const f=await fixture(),input=f.score(),job=await f.service.enqueueCommitted(input);f.providers.writeLine.mockImplementation(async request=>{await f.store.transaction(state=>{Object.assign(state.attempts.get(request.requestId),{status:'completed',outputTokens:90,providerDispatchedAt:initial});});await f.service.setProfile(host,roomId,{expectedVersion:1,changes:{voiceOption:'ditzy'}});return {text:'Old voice sentence.',containsProfanity:false};});
  expect(await f.service.prepareTrusted(job)).toBeNull();expect([...f.store.snapshot().attempts.values()][0]).toMatchObject({status:'completed',outputTokens:90});expect(f.store.snapshot().jobs.get(job).line).toBeNull();
 });
 it('streams many chunks without database reads per chunk and persists onset before exposing first byte',async()=>{
  const f=await fixture(),body=await ready(f);f.providers.streamAudio.mockImplementation(async function*(){for(let i=0;i<100;i++)yield new Uint8Array([i]);});
  f.getRoom.mockClear();f.rpc.mockClear();const reader=(await f.service.audio(host,roomId,body)).getReader();const first=await reader.read();expect(first.value).toEqual(new Uint8Array([0]));expect((await f.restart()).snapshot().jobs.get(body.jobId).audioFirstByteAt).toBe(initial);
  while(!(await reader.read()).done){}expect(f.getRoom.mock.calls.length).toBeLessThan(10);expect(f.rpc.mock.calls.length).toBeLessThan(30);expect(f.store.snapshot().attempts.size).toBe(2);
 });
 it('periodic validation cancels paused table even while next audio chunk stalls',async()=>{
  const f=await fixture({streamValidationMs:5}),body=await ready(f);let resume;f.providers.streamAudio.mockImplementation(async function*(){yield new Uint8Array([1]);await new Promise(resolve=>{resume=resolve;});yield new Uint8Array([2]);});const reader=(await f.service.audio(host,roomId,body)).getReader();await reader.read();f.setRoom({...f.room,paused:true});const next=reader.read();await expect(next).rejects.toMatchObject({status:502});resume();expect(f.store.snapshot().jobs.get(body.jobId).reason).toBe('paused');
 });
 it('cached monotonic lease expiry interrupts stalled speech despite static database clock',async()=>{
  const f=await fixture({leaseMs:20,streamValidationMs:500}),body=await ready(f);let resume;f.providers.streamAudio.mockImplementation(async function*(){yield new Uint8Array([1]);await new Promise(resolve=>{resume=resolve;});});const reader=(await f.service.audio(host,roomId,body)).getReader();await reader.read();f.advance(25);await expect(reader.read()).rejects.toMatchObject({status:502});resume();expect(f.providers.streamAudio).toHaveBeenCalledOnce();
 });
 it('final validation rejects profile change made after final chunk before stream completion',async()=>{
  const f=await fixture(),body=await ready(f);f.providers.streamAudio.mockImplementation(async function*(){yield new Uint8Array([1]);await f.service.setProfile(host,roomId,{expectedVersion:1,changes:{profanityAllowed:false}});});await expect(new Response(await f.service.audio(host,roomId,body)).arrayBuffer()).rejects.toMatchObject({status:502});expect(f.store.snapshot().jobs.get(body.jobId).line).toBeNull();
 });
});

it('monotonic chunk boundary catches changed table before yielding when timers have not run',async()=>{
 const f=await fixture(),body=await ready(f);f.providers.streamAudio.mockImplementation(async function*(){yield new Uint8Array([1]);f.advance(501);f.setRoom({...f.room,paused:true});yield new Uint8Array([2]);});const reader=(await f.service.audio(host,roomId,body)).getReader();expect((await reader.read()).value).toEqual(new Uint8Array([1]));await expect(reader.read()).rejects.toMatchObject({status:502});
});
it('restart never re-enters a dispatched generating job after process death',async()=>{
 const f=await fixture(),job=await f.service.enqueueCommitted(f.score()),attemptId='00000000-0000-4000-8000-000000000099';await f.store.transaction(state=>{Object.assign(state.jobs.get(job),{status:'generating',workerToken:attemptId});state.attempts.set(attemptId,{id:attemptId,jobId:job,stage:'writer',status:'submitted',providerDispatchedAt:initial});state.budgets.set(roomId,{requests:1,characters:1000});});const restarted=createCommentaryService({...f.configuration,store:await f.restart()});expect(await restarted.prepareTrusted(job)).toBeNull();expect(f.providers.writeLine).not.toHaveBeenCalled();expect((await f.restart()).snapshot().budgets.get(roomId).requests).toBe(1);
});
