import {describe,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setTournamentPaused} from '../src/multiplayer/tournament.js';
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
 const lobby=joinRoom(createRoom({id:roomId,code:'ABCDEFGH',userId:host,name:'Alex',time:time(),...(options.tournament?{tournament:{name:'Friday Dice Club',playerCount:2,gameCount:2}}:{})}),{userId:guest,name:'Sam',time:time()});room=startRoom(lobby,{userId:host,time:time()});
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

async function completedReturn(f){
 const scored=f.score(),target=scored.moment.facts.eventId,time=new Date(initial).toISOString(),playing=f.room;
 const beforeRoom=setTournamentPaused(playing,{userId:host,gameId:playing.game.id,expectedRevision:playing.revision,paused:true,time}),acceptedRoom=setTournamentPaused(beforeRoom,{userId:host,gameId:playing.game.id,expectedRevision:beforeRoom.revision,paused:false,time});f.setRoom(acceptedRoom);
 const commandId='resume_0001',moment=acceptedOutbox({before:beforeRoom,after:acceptedRoom,actorId:host,commandId,operation:'resume',acceptedAt:time,openingFacts})[0];
 const jobId=await f.service.enqueueCommitted({moment,beforeRoom,acceptedRoom,receipt:{room_id:roomId,command_id:commandId,actor_id:host,fingerprint:'accepted-resume'}});await f.service.prepareTrusted(jobId);
 const lease=await f.service.acquire(host,roomId,{device}),claim=await f.service.claimPlayback(host,roomId,{jobId,device,epoch:lease.epoch}),body={jobId,device,epoch:lease.epoch,claimToken:claim.token};await heard(f,body);return {...body,target};
}
describe('completed return lifecycle validity and retained actual exposure',()=>{
 it('own Undo invalidates captured score caption/history facts while retaining only reported host exposure',async()=>{
  const f=await fixture({tournament:true}),body=await completedReturn(f),captions=await f.service.list(host,roomId);expect(captions.find(j=>j.id===body.jobId)).toMatchObject({status:'completed',purpose:'return',lifecycleVerified:true,caption:expect.any(String)});
  const original=f.store.snapshot();expect(original.memoryRecords.get(body.jobId)).toMatchObject({validFacts:true,status:'completed',heardBy:[host]});expect(original.exposure.get(body.claimToken)).toMatchObject({status:'completed',valid:true,heardBy:[host]});
  f.setRoom(playRoom(f.room,{userId:host,action:{type:'undo-score',target:body.target},commandId:'undo_0001',gameId:f.room.game.id,expectedRevision:f.room.revision,time:new Date(initial).toISOString()}));
  const after=await f.service.list(host,roomId);expect(after.find(j=>j.id===body.jobId)).toMatchObject({caption:null,lifecycleVerified:false,reason:'invalid-event'});
  const state=(await f.restart()).snapshot();expect(state.memoryRecords.get(body.jobId)).toMatchObject({validFacts:false,status:'completed',heardBy:[host]});expect(state.exposure.get(body.claimToken)).toMatchObject({status:'completed',valid:false,heardBy:[host]});expect(state.exposure.get(body.claimToken).expectedAudience).toEqual([host,guest]);expect(f.providers.writeLine).toHaveBeenCalledOnce();
 });
 it('unrelated later accepted score preserves completed valid return caption and never marks guest heard',async()=>{
  const f=await fixture({tournament:true}),body=await completedReturn(f);f.score(guest,20,'score_0002');const after=await f.service.list(guest,roomId);
  expect(after.find(j=>j.id===body.jobId)).toMatchObject({status:'completed',purpose:'return',lifecycleVerified:true,caption:'Alex, your stationery has formed a shadow government.'});
  const state=(await f.restart()).snapshot();expect(state.memoryRecords.get(body.jobId)).toMatchObject({validFacts:true,heardBy:[host]});expect(state.exposure.get(body.claimToken)).toMatchObject({valid:true,heardBy:[host]});expect(state.exposure.get(body.claimToken).heardBy).not.toContain(guest);expect(f.providers.writeLine).toHaveBeenCalledOnce();
 });
});

it('live setup can claim and dispatch at 17 seconds but refuses unheard jobs after 30 seconds',async()=>{
 const f=await fixture({maxAgeMs:30000});const input=f.score(),jobId=await f.service.enqueueCommitted(input);await f.service.prepareTrusted(jobId);f.advance(11000);
 const lease=await f.service.acquire(host,roomId,{device});const claim=await f.service.claimPlayback(host,roomId,{jobId,device,epoch:lease.epoch});expect(claim.claimed).toBe(true);f.advance(6000);
 const audio=await f.service.audio(host,roomId,{jobId,device,epoch:lease.epoch,claimToken:claim.token});expect([...new Uint8Array(await new Response(audio).arrayBuffer())]).toEqual([1,2]);expect(f.providers.streamAudio).toHaveBeenCalledOnce();
 const stale=await fixture({maxAgeMs:30000});const prior=await ready(stale);stale.advance(30001);const jobs=await stale.service.list(host,roomId);expect(jobs.find(j=>j.id===prior.jobId)).toMatchObject({status:'cancelled',reason:'stale'});expect(stale.providers.streamAudio).not.toHaveBeenCalled();
});

it('saves lobby voice and own shared blurb without a game or paid generation, then greets the accepted start once',async()=>{
 const f=await fixture();f.setRoom(f.lobby);const settings=await f.service.setProfile(host,roomId,{expectedVersion:1,changes:{enabled:true,frequency:'lively',voiceOption:'rachel'}});expect(settings.greetingJobId).toBeUndefined();
 await f.service.setPlayerProfile(host,roomId,{expectedVersion:0,changes:{displayName:'Alex',blurb:'I alphabetize staplers.',shareWithRoom:true}});await f.service.setPlayerProfile(guest,roomId,{expectedVersion:0,changes:{displayName:'Sam',blurb:'I lose golf balls.',shareWithRoom:true}});
 expect(f.providers.writeLine).not.toHaveBeenCalled();expect(f.store.snapshot().jobs.size).toBe(0);expect(f.store.snapshot().playerProfiles.get(host).sharedGameIds).toEqual([]);await expect(f.service.setProfile(guest,roomId,{expectedVersion:settings.version,changes:{enabled:false}})).rejects.toMatchObject({status:403});
 const before=f.room,accepted=startRoom(before,{userId:host,time:new Date(initial).toISOString()});f.setRoom(accepted);const commandId='lobby_start_0001',moment=acceptedOutbox({before,after:accepted,actorId:host,commandId,operation:'start',acceptedAt:new Date(initial).toISOString(),openingFacts})[0];
 const evidence={moment,beforeRoom:before,acceptedRoom:accepted,receipt:{room_id:roomId,command_id:commandId,actor_id:host,fingerprint:'lobby-start-fingerprint'}};const jobId=await f.service.enqueueCommitted(evidence);expect(await f.service.enqueueCommitted(evidence)).toBe(jobId);await f.service.prepareTrusted(jobId);await f.service.prepareTrusted(jobId);expect(f.providers.writeLine).toHaveBeenCalledOnce();expect(f.providers.writeLine.mock.calls[0][0]).toMatchObject({purpose:'opening',profile:{frequency:'lively',voiceOption:'rachel'},facts:{scoresRecorded:0}});expect(f.store.snapshot().playerProfiles.get(host).sharedGameIds).toContain(accepted.game.id);
});

it('checks each historical source room once per writing pass while retaining membership filtering',async()=>{const f=await fixture(),past='00000000-0000-4000-8000-000000000077';await f.store.transaction(state=>{for(let i=0;i<5;i++)state.jobs.set('past-'+i,{id:'past-'+i,roomId:past,audience:[host],facts:{gameId:'old-game'},status:'completed',line:null});return true;});const accepted=f.score(),jobId=await f.service.enqueueCommitted(accepted);await f.service.prepareTrusted(jobId);expect(f.getRoom.mock.calls.filter(([id])=>id===past)).toHaveLength(1);expect(f.providers.writeLine).toHaveBeenCalledOnce();});

it('accepted score reactions coalesce by revision without interrupting a claimed line',async()=>{
 const f=await fixture();const first=await f.service.enqueueCommitted(f.score(host,20,'queue_score_1'));await f.service.prepareTrusted(first);expect(f.store.snapshot().jobs.get(first).status).toBe('ready');
 const second=await f.service.enqueueCommitted(f.score(guest,21,'queue_score_2'));expect(f.store.snapshot().jobs.get(first).status).toBe('silent');await f.service.prepareTrusted(second);const lease=await f.service.acquire(host,roomId,{device});await f.service.claimPlayback(host,roomId,{jobId:second,device,epoch:lease.epoch});
 const before=f.room,commandId='queue_score_3',after=playRoom(before,{userId:host,action:{type:'score',category:'aces',value:3},commandId,gameId:before.game.id,expectedRevision:before.revision,time:new Date(initial).toISOString()});f.setRoom(after);const moment=acceptedOutbox({before,after,actorId:host,commandId,operation:'command',acceptedAt:new Date(initial).toISOString()})[0];const third=await f.service.enqueueCommitted({moment,beforeRoom:before,acceptedRoom:after,receipt:{room_id:roomId,command_id:commandId,actor_id:host,fingerprint:'queue-third'}});expect(f.store.snapshot().jobs.get(second).status).toBe('claimed');expect(f.store.snapshot().jobs.get(third).status).toBe('pending');
});
