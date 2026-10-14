import {acceptedFacts,factsValid} from '../../src/commentary/facts.js';
import {createProfile,updateProfile} from '../../src/commentary/profiles.js';
import {resolveCommentaryVoice} from './voice-routing.js';
import {createPlayerProfile} from '../../src/commentary/player-profile.js';
import {RetrievalAdaptation,COMMENTARY_RETENTION_MS} from './retrieval-adaptation.js';

const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const token=/^[A-Za-z0-9_-]{8,100}$/;
export class CommentaryError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status)=>{throw new CommentaryError(message,status);};
const positive=(v,name)=>{if(!Number.isSafeInteger(v)||v<1)throw Error('Positive bounded '+name+' required');return v;};
const name=value=>String(value).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,24);
export function createCommentaryService({store,getRoom,now=()=>Date.now(),randomId=()=>crypto.randomUUID(),profile,leaseMs=15000,maxAgeMs=15000,maxLineCharacters=500,maxAudioBytes=524288,streamTimeoutMs=20000,firstByteTimeoutMs=Math.min(10000,streamTimeoutMs),writerTimeoutMs=10000,budget={maxRequests:0,maxCharacters:0},syntheticProviders=null}={}) {
 if(!store||typeof getRoom!=='function')throw Error('Injected store and authoritative room reader required');
 for(const [label,value]of Object.entries({leaseMs,maxAgeMs,maxLineCharacters,maxAudioBytes,streamTimeoutMs,firstByteTimeoutMs,writerTimeoutMs}))positive(value,label);
 if(!Number.isSafeInteger(budget.maxRequests)||budget.maxRequests<0||!Number.isSafeInteger(budget.maxCharacters)||budget.maxCharacters<0)throw Error('Explicit bounded budget required');
 if(firstByteTimeoutMs>streamTimeoutMs)throw Error('First-byte deadline exceeds stream deadline');
 const initial=createProfile(profile);
 function memory(state){return Object.assign(new RetrievalAdaptation({now}),{records:state.memoryRecords,feedback:state.feedback,profiles:state.playerProfiles,preferenceSharing:state.preferenceSharing,summaries:state.memorySummaries,caches:state.memoryCaches});}
 function purge(state){
  memory(state).purgeExpired();for(const [key,receipt]of state.exposure)if(receipt.expiresAt!=null&&receipt.expiresAt<=now()){memory(state).invalidateDerived();state.exposure.delete(key);const job=state.jobs.get(receipt.jobId);if(job){job.line=null;job.reason='history-expired';}}
 }
 function feedbackProjection(state,job,userId){
  const receipt=job.claim?state.exposure.get(job.claim.token):null;
  const terminal=receipt&&['completed','interrupted'].includes(receipt.status)&&receipt.firstExposureAt!=null;
  const basis=terminal&&job.audience.includes(userId)?(receipt.heardBy.includes(userId)?'playback':'caption'):null;
  const rating=state.feedback.get(job.id+':'+userId);
  return {feedbackBasis:basis,feedbackValue:rating?.rating||null};
 }
 async function sourcePermissions(actor,room){
  const snapshot=store.snapshot(),ids=new Set();for(const job of snapshot.jobs.values()){
   if(!job.audience.includes(actor))continue;
   const source=job.roomId===room.id?room:await getRoom(job.roomId);
   if(source?.members.some(member=>member.userId===actor)&&room.members.every(listener=>source.members.some(member=>member.userId===listener.userId)))ids.add(job.facts.gameId);
  }return [...ids].slice(-200);
 }
 function rememberTrusted(state,job,line){
  const subject=line.subject||line.subjects?.[0];
  if(!line.mechanism||!subject)return; // Unknown/absent tags cannot fabricate adaptive evidence.
  try{memory(state).remember({id:job.id,gameId:job.facts.gameId,eventId:job.facts.eventId,targetAccountId:job.facts.accountId,text:line.text,mechanism:line.mechanism,premise:line.premise||subject,subjects:line.subjects||[subject],profileVersion:job.profile.version,humorIntensity:job.profile.humorIntensity,containsProfanity:line.containsProfanity},job.audience);}catch{/* Uncontrolled provider metadata stays usable as caption, never learned. */}
 }
 function memoryExposure(state,job,receipt){
  const m=memory(state);if(!m.records.has(job.id))return;
  try{m.exposure(job.id,{status:receipt.status,epoch:receipt.epoch,heardBy:receipt.heardBy});}catch{/* Receipt remains canonical; unsupported metadata/duplicate terminal adds no learning. */}
 }

 async function authorized(userId,roomId,host=false){
  if(!uuid.test(userId||''))fail('Sign in to use commentary.',401);if(!uuid.test(roomId||''))fail('Invalid room ID.');
  const room=await getRoom(roomId);if(!room)fail('Room not found.',404);
  if(!room.members?.some(m=>m.userId===userId))fail('Table membership required.',403);if(host&&room.hostId!==userId)fail('Only the host controls playback and settings.',403);return room;
 }
 const settings=(state,roomId)=>state.settings.get(roomId)||initial;
 function eligible(state,job,room,{started=false}={}){
  if(room.game?.id!==job.facts.gameId)return 'game-changed';if(!factsValid(job.facts,room.game))return 'invalid-event';
  if(room.tournament?.status==='paused'||room.paused===true)return 'paused';
  if(settings(state,room.id).version!==job.profile.version)return 'profile-changed';
  const age=now()-Date.parse(job.facts.acceptedAt);if(!started&&(!Number.isFinite(age)||age<0||age>maxAgeMs))return 'stale';return null;
 }
 function cancel(state,job,reason){
  const exposure=job.claim?state.exposure.get(job.claim.token):null;if(reason==='invalid-event'){if(exposure)exposure.valid=false;memory(state).invalidateEvent(job.facts.gameId,job.facts.eventId);}
  if(['completed','failed','cancelled','silent'].includes(job.status)){if(['invalid-event','profile-changed'].includes(reason)){job.line=null;job.reason=reason;}return;}job.status='cancelled';job.reason=reason;job.line=null;if(job.claim){const receipt=state.exposure.get(job.claim.token);if(receipt?.status==='started'){receipt.status='interrupted';receipt.valid=reason!=='invalid-event';memoryExposure(state,job,receipt);}}}
 function lease(state,room,userId,device,epoch){const current=state.leases.get(room.id);if(!current||current.owner!==userId||current.device!==device||current.epoch!==epoch||current.expiresAt<=now())fail('Playback lease is stale.',409);return current;}
 function reserve(state,job,stage,characters){
  const used=state.budgets.get(job.roomId)||{requests:0,characters:0};
  if(used.requests+1>budget.maxRequests||used.characters+characters>budget.maxCharacters)fail('Commentary budget exhausted.',429);
  const attempt={id:randomId(),jobId:job.id,stage,characters,status:'submitted',at:now()};
  state.budgets.set(job.roomId,{requests:used.requests+1,characters:used.characters+characters});state.attempts.set(attempt.id,attempt);return attempt;
 }
 async function getProfile(userId,roomId){await authorized(userId,roomId);return store.transaction(state=>({...settings(state,roomId),capabilities:{providerMode:syntheticProviders?'synthetic':'disabled',liveProviders:false}}));}
 async function setProfile(userId,roomId,{expectedVersion,changes}={}){
  const room=await authorized(userId,roomId,true);if(!Number.isSafeInteger(expectedVersion)||!changes||typeof changes!=='object'||Object.keys(changes).some(k=>!['profanityAllowed','humorIntensity','frequency','voiceOption'].includes(k)))fail('Invalid settings change.');
  return store.transaction(state=>{const prior=settings(state,roomId);if(prior.version!==expectedVersion)fail('Commentary settings changed.',409);let next;try{next=updateProfile(prior,changes);}catch{fail('Invalid commentary settings.');}state.settings.set(roomId,next);for(const job of state.jobs.values())if(job.roomId===room.id)cancel(state,job,'profile-changed');return next;});
 }
 // Trusted server acceptance adapter ONLY. No handler operation exposes this method.
 async function enqueueAccepted(room,eventId){
  if(!uuid.test(room?.id||''))throw Error('Trusted accepted room required');
  const facts=acceptedFacts(room.game,eventId,room.members.map(m=>m.userId));if(!facts)return null;
  const named=structuredClone(facts);named.seats.forEach(s=>{s.label=name(room.game.players[s.seat].name);});named.label=named.seats[named.seat].label;named.namesInstructionAuthority='none';
  const momentKey=room.id+':'+facts.gameId+':'+facts.commandId;
  return store.transaction(state=>{
   if(state.moments.has(momentKey))return state.moments.get(momentKey);
   const id=randomId(),p=settings(state,room.id),quiet=['score-correction'].includes(facts.eventType)||(p.frequency==='highlights'&&!facts.complete&&facts.category!=='yahtzee'&&facts.value<30);
   state.jobs.set(id,{id,roomId:room.id,momentKey,facts:named,profile:p,audience:room.members.map(m=>m.userId),status:quiet?'silent':'pending',line:null,claim:null});state.moments.set(momentKey,id);return id;
  });
 }
 async function prepareTrusted(jobId){
  const prior=store.snapshot().jobs.get(jobId);if(!prior)return null;const room=await getRoom(prior.roomId);const authorizedSourceIds=room?await sourcePermissions(prior.facts.accountId,room):[];
  const claim=await store.transaction(state=>{
   const job=state.jobs.get(jobId);if(!job||job.status!=='pending')return null;
   const reason=room?eligible(state,job,room):'room-missing';if(reason){cancel(state,job,reason);return null;}
   if(!syntheticProviders?.writeLine){job.status='silent';job.reason='providers-disabled';return null;}
   purge(state);const m=memory(state);
   for(const member of room.members){const personal=state.playerProfiles.get(member.userId);if(personal?.sharedRoomIds?.includes(room.id)){personal.sharedGameIds=[...new Set([...personal.sharedGameIds,room.game.id])];m.setPreferenceSharing(member.userId,[room.game.id]);}}
   let adaptive;try{adaptive=m.context({actorId:room.hostId,targetAccountId:job.facts.accountId,audience:job.audience,gameId:job.facts.gameId,authorizedSourceIds,profile:job.profile});}catch{adaptive=null;}
   job.personalProfileVersion=state.playerProfiles.get(job.facts.accountId)?.profile.version||0;
   const input={facts:job.facts,profile:job.profile,source:'synthetic-service-rehearsal',personalContext:state.playerProfiles.get(job.facts.accountId)?.sharedRoomIds?.includes(room.id)?adaptive?.personalContext||null:null,preferences:adaptive?.writerPreferences||null};const attempt=reserve(state,job,'writer',[...JSON.stringify(input)].length);
   job.status='generating';job.workerToken=attempt.id;return {input,attempt,jobId};
  });if(!claim)return null;
  let line,writerTimer;const writerController=new AbortController();
  try{
   line=await Promise.race([Promise.resolve().then(()=>syntheticProviders.writeLine({...structuredClone(claim.input),signal:writerController.signal})),new Promise((_resolve,reject)=>{writerTimer=setTimeout(()=>{writerController.abort();reject(Error('Writer timeout'));},writerTimeoutMs);})]);
  }catch{
   await store.transaction(state=>{state.attempts.get(claim.attempt.id).status='failed';const job=state.jobs.get(jobId);if(job?.workerToken===claim.attempt.id&&job.status==='generating')job.status='failed';});return null;
  }finally{clearTimeout(writerTimer);}
  const fresh=await getRoom(prior.roomId);
  return store.transaction(state=>{
   const attempt=state.attempts.get(claim.attempt.id);attempt.status='succeeded';const job=state.jobs.get(jobId);
   if(job.status!=='generating'||job.workerToken!==claim.attempt.id)return null;
   if((state.playerProfiles.get(job.facts.accountId)?.profile.version||0)!==job.personalProfileVersion){cancel(state,job,'personal-profile-changed');return null;}
   const reason=fresh?eligible(state,job,fresh):'room-missing';if(reason){cancel(state,job,reason);return null;}
   if(line===null){job.status='silent';return null;}
   // Synthetic validation only; production classifier/rewrite still required.
   if(!line||typeof line.text!=='string'||!line.text.trim()||[...line.text].length>maxLineCharacters||/[\u0000-\u001f\u007f]/.test(line.text)||typeof line.containsProfanity!=='boolean'||(!job.profile.profanityAllowed&&line.containsProfanity)){job.status='failed';job.reason='invalid-candidate';return null;}
   job.line={text:line.text,containsProfanity:line.containsProfanity,source:'synthetic'};rememberTrusted(state,job,line);job.status='ready';return {id:job.id,text:job.line.text};
  });
 }
 async function acquire(userId,roomId,{device}={}){
  await authorized(userId,roomId,true);if(!token.test(device||''))fail('Invalid playback device.');
  return store.transaction(state=>{const prior=state.leases.get(roomId);if(prior&&prior.expiresAt>now()&&(prior.owner!==userId||prior.device!==device))fail('Another host device owns playback.',409);const value={...(prior&&prior.expiresAt>now()?prior:{}),owner:userId,device,epoch:prior&&prior.expiresAt>now()?prior.epoch:(prior?.epoch||0)+1,expiresAt:now()+leaseMs};state.leases.set(roomId,value);return value;});
 }
 async function heartbeat(userId,roomId,{device,epoch}={}){
  const room=await authorized(userId,roomId,true);
  const result=await store.transaction(state=>{
   const current=lease(state,room,userId,device,epoch);
   if(current.activeJobId){
    const job=state.jobs.get(current.activeJobId);
    if(!job||!['claimed','streaming','started'].includes(job.status))return {rejected:true,reason:'active-playback-cancelled'};
    const reason=eligible(state,job,room,{started:job.status==='started'});
    if(reason){cancel(state,job,reason);return {rejected:true,reason};}
   }
   current.expiresAt=now()+leaseMs;return {value:current};
  });
  if(result.rejected)fail('Playback renewal rejected: '+result.reason,409);
  return result.value;
 }
 async function list(userId,roomId){const room=await authorized(userId,roomId);return store.transaction(state=>{purge(state);for(const job of state.jobs.values())if(job.roomId===roomId){const reason=eligible(state,job,room,{started:job.status==='started'});if(reason)cancel(state,job,reason);}return [...state.jobs.values()].filter(j=>j.roomId===roomId&&j.facts.gameId===room.game?.id).slice(-20).map(j=>({id:j.id,gameId:j.facts.gameId,eventId:j.facts.eventId,acceptedAt:j.facts.acceptedAt,dependencyEventIds:[...j.facts.scoreDependencies],status:j.status,caption:j.line?.text||null,reason:j.reason||null,profileVersion:j.profile.version,...feedbackProjection(state,j,userId)}));});}
 async function claimPlayback(userId,roomId,{jobId,device,epoch}={}){
  const room=await authorized(userId,roomId,true);return store.transaction(state=>{
   const current=lease(state,room,userId,device,epoch),job=state.jobs.get(jobId);if(!job||job.roomId!==roomId)fail('Commentary job not found.',404);
   const reason=eligible(state,job,room);if(reason){cancel(state,job,reason);return {claimed:false,reason};}
   if(job.claim?.epoch===epoch&&job.claim.device===device&&['claimed','streaming','started'].includes(job.status))return {claimed:true,token:job.claim.token};
   if(job.status!=='ready')fail('Commentary is not ready.',409);
   if(current.activeJobId&&current.activeJobId!==jobId){const active=state.jobs.get(current.activeJobId);if(active&&['claimed','streaming','started'].includes(active.status))fail('Commentary is already playing.',409);}
   job.claim={token:randomId(),owner:userId,device,epoch};job.status='claimed';current.activeJobId=jobId;return {claimed:true,token:job.claim.token};
  });
 }
 async function playbackEvent(userId,roomId,{jobId,device,epoch,claimToken,status,sequence}={}){
  const room=await authorized(userId,roomId,true);if(!['started','completed','interrupted','failed'].includes(status)||!Number.isSafeInteger(sequence)||sequence<1)fail('Invalid playback event.');
  return store.transaction(state=>{
   lease(state,room,userId,device,epoch);const job=state.jobs.get(jobId);if(!job||job.roomId!==roomId||job.claim?.token!==claimToken||job.claim.epoch!==epoch||job.claim.device!==device)fail('Playback claim is stale.',409);
   const prior=state.exposure.get(claimToken);if(prior&&sequence===prior.sequence){if(status!==prior.status)fail('Playback receipt collision.',409);return prior;}
   if(prior&&sequence<=prior.sequence)fail('Playback sequence is stale.',409);
   const reason=eligible(state,job,room,{started:prior?.status==='started'});if(reason){cancel(state,job,reason);return {accepted:false,reason};}
   if(status==='started'&&job.audioFirstByteAt==null)fail('Audio must begin streaming before reported speech.',409);
   const allowed=prior?.status==='started'?['completed','interrupted','failed']:!prior?['started','failed']:[];
   if(!allowed.includes(status)||(!prior&&!['streaming','claimed'].includes(job.status)))fail('Invalid exposure transition.',409);
   const receipt={jobId,epoch,sequence,status,at:now(),reportingAccount:userId,heardBy:prior?.heardBy|| (status==='started'?[userId]:[]),firstExposureAt:prior?.firstExposureAt??(status==='started'?now():null),expiresAt:prior?.expiresAt??(status==='started'?now()+COMMENTARY_RETENTION_MS:null),expectedAudience:[...job.audience],valid:true};state.exposure.set(claimToken,receipt);memoryExposure(state,job,receipt);job.status=status;if(['completed','interrupted','failed'].includes(status)){const current=state.leases.get(roomId);if(current?.activeJobId===jobId)delete current.activeJobId;}return receipt;
  });
 }
 async function audio(userId,roomId,{jobId,device,epoch,claimToken}={}){
  const room=await authorized(userId,roomId,true);
  const start=await store.transaction(state=>{
   lease(state,room,userId,device,epoch);const job=state.jobs.get(jobId);if(!job||job.roomId!==roomId||job.claim?.token!==claimToken||job.claim.epoch!==epoch||job.claim.device!==device)fail('Playback claim is stale.',409);
   const reason=eligible(state,job,room);if(reason){cancel(state,job,reason);fail('Commentary was cancelled.',409);}
   if(job.status!=='claimed')fail('Audio already requested.',409);if(!syntheticProviders?.streamAudio)fail('Voice provider is disabled.',503);
   const attempt=reserve(state,job,'tts',[...job.line.text].length);job.status='streaming';return {attempt,text:job.line.text,profile:job.profile};
  });
  const controller=new AbortController();let bytes=0,firstByteAt=null;const started=now();
  const timer=setTimeout(()=>controller.abort(),streamTimeoutMs),firstTimer=setTimeout(()=>controller.abort(),firstByteTimeoutMs);
  const stream=new ReadableStream({
   async start(out){
    try {
     const iterator=syntheticProviders.streamAudio({text:start.text,profile:start.profile,voice:resolveCommentaryVoice(start.profile.voiceOption),signal:controller.signal,source:'synthetic'})[Symbol.asyncIterator]();
     while(true){
      const next=await new Promise((resolve,reject)=>{
       const abort=()=>reject(Error('Interrupted'));if(controller.signal.aborted){abort();return;}controller.signal.addEventListener('abort',abort,{once:true});
       Promise.resolve(iterator.next()).then(resolve,reject).finally(()=>controller.signal.removeEventListener('abort',abort));
      });if(next.done)break;const chunk=next.value;
      const fresh=await getRoom(roomId);const valid=await store.transaction(state=>{const job=state.jobs.get(jobId);let reason=fresh?eligible(state,job,fresh,{started:job.status==='started'}):'room-missing';try{lease(state,fresh||room,userId,device,epoch);}catch{reason='playback-owner';}if(reason){cancel(state,job,reason);return false;}return !['cancelled','failed','completed','interrupted'].includes(job.status);});
      if(controller.signal.aborted||!valid)throw Error('Interrupted');if(!(chunk instanceof Uint8Array))throw Error('Invalid audio');if(!chunk.byteLength)continue;
      bytes+=chunk.byteLength;if(bytes>maxAudioBytes)throw Error('Audio byte cap');if(firstByteAt===null){firstByteAt=now();clearTimeout(firstTimer);const accepted=await store.transaction(state=>{const job=state.jobs.get(jobId);if(!job||['cancelled','failed','completed','interrupted'].includes(job.status))return false;job.audioFirstByteAt=firstByteAt;state.attempts.get(start.attempt.id).firstByteAt=firstByteAt;return true;});if(!accepted)throw Error('Interrupted');}out.enqueue(chunk);
     }
     if(!bytes||controller.signal.aborted)throw Error('No complete audio');
     await store.transaction(state=>{Object.assign(state.attempts.get(start.attempt.id),{status:'succeeded',bytes,firstByteMs:firstByteAt-started,completeMs:now()-started,firstAudibleMs:null});});out.close();
    }catch{
     controller.abort();await store.transaction(state=>{const job=state.jobs.get(jobId);state.attempts.get(start.attempt.id).status='failed';if(job&&['streaming','claimed'].includes(job.status))job.status='failed';});out.error(new CommentaryError('Commentary audio interrupted.',502));
    }finally{clearTimeout(timer);clearTimeout(firstTimer);}
   },
   async cancel(){controller.abort();clearTimeout(timer);clearTimeout(firstTimer);await store.transaction(state=>{state.attempts.get(start.attempt.id).status='interrupted';const job=state.jobs.get(jobId);cancel(state,job,'client-disconnected');});},
  });
  return stream;
 }

 async function feedback(userId,roomId,{jobId,value,basis}={}){
  const room=await authorized(userId,roomId);if(!['like','dislike'].includes(value)||!['playback','caption'].includes(basis))fail('Choose Like or Dislike with an exact rating basis.');
  return store.transaction(state=>{purge(state);const job=state.jobs.get(jobId);if(!job||job.roomId!==roomId||!job.audience.includes(userId))fail('This commentary is not available to your account.',403);
   const projection=feedbackProjection(state,job,userId);if(!projection.feedbackBasis||(basis==='playback'&&projection.feedbackBasis!=='playback'))fail('Feedback is available after speech with your own authorized basis.',409);
   const receipt=state.exposure.get(job.claim.token),prior=state.feedback.get(job.id+':'+userId);
   // Canonical feedback also works for a caption with no trusted rich metadata. No tags are invented.
   state.feedback.set(job.id+':'+userId,{recordId:job.id,accountId:userId,rating:value,basis,at:now(),expiresAt:receipt.expiresAt});
   memory(state).invalidateDerived();const m=memory(state);m.setPreferenceSharing(userId,[room.game.id]);
   return {jobId,value,basis,changed:prior?.rating!==value||prior?.basis!==basis,expiresAt:receipt.expiresAt};
  });
 }
 async function getPlayerProfile(userId,roomId){await authorized(userId,roomId);return store.transaction(state=>{const own=state.playerProfiles.get(userId);return own?{...own.profile,shareWithRoom:own.sharedRoomIds.includes(roomId)}:{accountId:userId,version:state.playerProfileVersions.get(userId)||0,displayName:'',gender:'',blurb:'',shareWithRoom:false};});}
 async function setPlayerProfile(userId,roomId,{expectedVersion,changes}={}){
  const room=await authorized(userId,roomId);if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).some(key=>!['displayName','gender','blurb','shareWithRoom'].includes(key))||('shareWithRoom'in changes&&typeof changes.shareWithRoom!=='boolean'))fail('Invalid personal profile change.');
  return store.transaction(state=>{const prior=state.playerProfiles.get(userId);if((state.playerProfileVersions.get(userId)||0)!==expectedVersion)fail('Personal profile changed.',409);
   let checked;try{checked=createPlayerProfile({...prior?.profile,...changes,accountId:userId,version:expectedVersion+1});}catch{fail('Check optional profile fields.');}
   const shared=new Set(prior?.sharedRoomIds||[]);if(changes.shareWithRoom===true)shared.add(roomId);if(changes.shareWithRoom===false)shared.delete(roomId);
   const m=memory(state);m.setPlayerProfile(userId,checked,{sharedGameIds:shared.has(roomId)?[room.game.id]:[]});state.playerProfiles.get(userId).sharedRoomIds=[...shared];state.playerProfileVersions.set(userId,checked.version);m.setPreferenceSharing(userId,shared.has(roomId)?[room.game.id]:[]);
   for(const job of state.jobs.values())if(job.facts.accountId===userId)cancel(state,job,'personal-profile-changed');return {...checked,shareWithRoom:shared.has(roomId)};
  });
 }
 async function deletePlayerProfile(userId,roomId,{expectedVersion}={}){await authorized(userId,roomId);if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)fail('Expected personal profile version required.');return store.transaction(state=>{const prior=state.playerProfiles.get(userId);if((state.playerProfileVersions.get(userId)||0)!==expectedVersion)fail('Personal profile changed.',409);state.playerProfiles.delete(userId);state.playerProfileVersions.set(userId,expectedVersion+1);state.preferenceSharing.delete(userId);memory(state).invalidateDerived();for(const job of state.jobs.values())if(job.facts.accountId===userId)cancel(state,job,'personal-profile-changed');return {deleted:true,version:expectedVersion+1};});}
 async function forgetHistory(userId,roomId){await authorized(userId,roomId);return store.transaction(state=>{const removed=memory(state).forgetHistory(userId);let affected=0;for(const job of state.jobs.values())if(job.audience.includes(userId)){cancel(state,job,'history-forgotten');job.line=null;job.reason='history-forgotten';if(job.claim)state.exposure.delete(job.claim.token);affected++;}for(const [key,rating]of state.feedback)if(rating.accountId===userId||state.jobs.get(rating.recordId)?.audience.includes(userId))state.feedback.delete(key);return {...removed,affectedJobs:affected,durability:'process-memory-rehearsal'};});}

 return {feedback,getPlayerProfile,setPlayerProfile,deletePlayerProfile,forgetHistory,authorized,getProfile,setProfile,enqueueAccepted,prepareTrusted,acquire,heartbeat,list,claimPlayback,playbackEvent,audio};
}
