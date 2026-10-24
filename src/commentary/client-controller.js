import {observeScoreEvent,playbackTiming,forgetPlaybackTimings} from './latency.js';
import {conservativeLeaseDeadline} from './lease-clock.js';
// Authenticated adapter contract: request({operation,roomId,...payload},{signal}) -> {result}.
// This controller sends IDs/settings receipts only, never writer text, provider keys or game commands.
const terminal=new Set(['completed','interrupted','failed']);
const lifecycle=new Set(['started',...terminal]);
export function createCommentaryClient({request,player,deviceId,onChange=()=>{},allowSyntheticPlayback=false,monotonicNow=()=>performance.now()}={}) {
 if(typeof request!=='function'||!player||typeof player.play!=='function'||typeof player.stop!=='function'||!deviceId)throw Error('Authenticated transport, player and device ID required.');
 let context=null,generation=0,abort=new AbortController(),initial=true,hydrated=new Set(),attempted=new Set(),greetings=new Set(),greetingCommands=new Set(),playedGreetingCommands=new Set(),suppressed=new Set(),run=null,lease=null,pending=null,disposed=false;
 let state={status:'offline',captions:[],playing:null,error:null,measurement:null};
 const snapshot=()=>({...state,captions:state.captions.map(c=>({...c,dependencyEventIds:[...c.dependencyEventIds]})),playing:state.playing?{...state.playing}:null});
 const publish=patch=>{state={...state,...patch};try{onChange(snapshot());}catch{/* UI subscribers never interfere with scoring or service state. */}};
 const scope=c=>`${c?.roomId||''}/${c?.game?.id||''}/${c?.userId||''}`;
 const speakable=()=>context?.userId&&context.userId===context.hostId&&context.enabled&&!context.listenerMuted&&!context.paused&&context.visible!==false;
 const invoke=(operation,payload={},signal=abort.signal,roomId=context.roomId)=>request({operation,roomId,...payload},{signal}).then(response=>response.result);
 function stopNative(reason){
  // Install the barrier before calling native code: stop may emit a terminal callback synchronously.
  const prior=nativeStopBarrier;let resolveStop,rejectStop;const stopped=new Promise((resolve,reject)=>{resolveStop=resolve;rejectStop=reject;});
  const barrier=Promise.all([prior?.catch(()=>{}),stopped]);nativeStopBarrier=barrier;
  void barrier.then(()=>{
   if(nativeStopBarrier!==barrier)return;nativeStopBarrier=null;nativeStopFailed=false;
   // Invalidation discards abandoned work; only currently authorized desired work can drain.
   void react();
  },()=>{
   if(nativeStopBarrier!==barrier)return;nativeStopBarrier=null;nativeStopFailed=true;desired=null;
   if(!disposed&&speakable())publish({status:'caption-only',error:'Voice unavailable. Scores are saved normally.'});
  });
  try{Promise.resolve(player.stop(reason)).then(resolveStop,rejectStop);}catch(error){rejectStop(error);}
  return barrier;
 }
 function stop(reason){
  if(run){const active=run;active.cancelled=true;if(!nativeStopFailed)void stopNative(reason);active.abort.abort();run=null;}
  lease=null;publish({playing:null});
 }
 function invalidate(reason){generation++;abort.abort();abort=new AbortController();pending=null;desired=null;completionBarrier=null;stop(reason);}
 function update(next){
  if(disposed)return;
  const switched=scope(next)!==scope(context),profileChanged=next?.profileVersion!==context?.profileVersion;
  const seen=new Set(context?.game?.events?.map(e=>e.id)||[]);
  const changedTargets=(next?.game?.events||[]).filter(e=>!seen.has(e.id)&&['score-undo','score-correction'].includes(e.type)).map(e=>e.target);
  const epochLost=run&&next&&Object.hasOwn(next,'leaseEpoch')&&next.leaseEpoch!==run.claim.epoch;
  const dependent=run&&changedTargets.some(id=>run.job.dependencyEventIds.includes(id)||run.job.eventId===id);
  if(context?.game&&next?.game&&context.game.id===next.game.id&&next.visible!==false)for(const event of next.game.events||[])if(!seen.has(event.id))observeScoreEvent(event);
  const newest=!switched?(next?.game?.events||[]).filter(e=>!seen.has(e.id)&&['score','bonus'].includes(e.type)).at(-1):null;
  context=next;
  if(newest&&speakable()){if(desired)desired.superseded=true;desired={eventId:newest.id,queuedAt:monotonicNow()};}
  if(switched||profileChanged||!speakable())desired=null;
  if(changedTargets.length)publish({captions:state.captions.filter(caption=>!changedTargets.some(id=>caption.eventId===id||caption.dependencyEventIds.includes(id)))});
  const replacement=dependent&&!switched&&!profileChanged&&!epochLost&&speakable()&&newest&&!changedTargets.includes(newest.id)?desired:null;
  if(switched||profileChanged||epochLost||dependent||!speakable())invalidate(switched?'context-changed':profileChanged?'profile-changed':epochLost?'lease-lost':dependent?'facts-invalidated':'playback-unavailable');
  // A corrected prior line does not erase a distinct newly accepted score in the same snapshot.
  if(replacement)desired=replacement;
  if(switched){suppressed=new Set();playedGreetingCommands=new Set();}
  if(switched||profileChanged){initial=true;hydrated=new Set();attempted=new Set();greetings=new Set();greetingCommands=new Set();publish({captions:[],error:null,measurement:null});}
  if(!context?.userId||!context?.roomId||!context?.game)publish({status:'offline',captions:[]});
  else publish({status:context.paused?'paused':speakable()&&!nativeStopFailed?'ready':'caption-only'});
  const replaceWaiting=newest&&run?.awaitingPreparation;
  if(replaceWaiting)stop('superseded-pending-reaction');
  if(newest&&(run?.started||replaceWaiting)&&desired&&direct())prepareAhead(desired);
  if(desired&&changedTargets.includes(desired.eventId)){desired.superseded=true;desired=null;}
  // Accepted updates must wake direct playback even when the session refresh has already pumped.
  if(newest&&direct())void react();
 }
 function greetingAllowed(job){return !playedGreetingCommands.has(job?.sourceCommandId)&&(greetings.has(job?.id)||greetingCommands.has(job?.sourceCommandId));}
 function validCaptionJob(job){
  if(suppressed.has(job?.id))return false;
  if(!Array.isArray(job?.dependencyEventIds)||job.dependencyEventIds.length>512||job.dependencyEventIds.some(id=>typeof id!=='string'))return false;
  const lifecycle=['opening','return','next-game'].includes(job?.purpose);
  if(lifecycle){
   if(job.lifecycleVerified!==true||typeof job.sourceCommandId!=='string'||! /^[A-Za-z0-9_-]{8,100}$/.test(job.sourceCommandId)||job.eventId!==`lifecycle-${job.sourceCommandId}`||!Number.isFinite(Date.parse(job.acceptedAt)))return false;
  }else{
   if(job?.purpose!==undefined&&job.purpose!=='score')return false;
   const index=context.game.events.findIndex(event=>event.id===job?.eventId);
   if(index<0||context.game.events.slice(index+1).some(event=>['score-undo','score-correction'].includes(event.type)&&(event.target===job.eventId||job.dependencyEventIds.includes(event.target))))return false;
  }
  return typeof job?.id==='string'&&job.gameId===context.game.id&&job.profileVersion===context.profileVersion&&['ready','claimed','streaming','started','completed','interrupted','failed'].includes(job.status)&&typeof job.caption==='string'&&job.caption.length>0&&job.caption.length<=1000&&Array.isArray(job.dependencyEventIds);}
 let desired=null,preparationTail=Promise.resolve(),nativeStopBarrier=null,nativeStopFailed=false;
 function prepareAhead(target){
  const fence=generation,signal=abort.signal,roomId=context.roomId,gameId=context.game.id,profileVersion=context.profileVersion;
  target.preparation=preparationTail=preparationTail.catch(()=>{}).then(async()=>{
   if(fence!==generation||signal.aborted||target.superseded||!speakable())return;
   const began=monotonicNow();console.info('[Commentary prepare]',JSON.stringify({stage:'start'}));
   try{const result=await invoke('reaction-prepare',{gameId,profileVersion,device:deviceId,eventId:target.eventId},signal,roomId);console.info('[Commentary prepare]',JSON.stringify({stage:'complete',elapsedMs:Math.max(0,Math.round(monotonicNow()-began)),prepared:result?.prepared===true}));return result;}
   catch{console.info('[Commentary prepare]',JSON.stringify({stage:'unavailable',elapsedMs:Math.max(0,Math.round(monotonicNow()-began))}));}
  });
 }

 const direct=()=>typeof player.playReaction==='function'&&context?.directReaction===true;
 async function react(){
  if(disposed||!direct()||!speakable()||run||completionBarrier||nativeStopBarrier||nativeStopFailed||!desired)return;
  const {queuedAt=monotonicNow(),preparation,superseded,...target}=desired;desired=null;const fence=generation,dequeuedAt=monotonicNow(),queueMs=Math.max(0,Math.round(dequeuedAt-queuedAt));
  console.info('[Commentary direct]',JSON.stringify({stage:'dequeued',queueMs}));
  const active={job:{id:'connecting',eventId:target.eventId,dependencyEventIds:target.eventId?[target.eventId]:[]},claim:{epoch:0},roomId:context.roomId,sequence:0,started:false,ended:false,cancelled:false,abort:new AbortController(),receipts:Promise.resolve(),awaitingPreparation:!!preparation};
  run=active;publish({status:'connecting',playing:null});
  try{if(preparation)await preparation;if(fence!==generation||run!==active||active.abort.signal.aborted)return;active.awaitingPreparation=false;console.info('[Commentary direct]',JSON.stringify({stage:'request',queueMs,preparationWaitMs:Math.max(0,Math.round(monotonicNow()-dequeuedAt)),sinceQueuedMs:Math.max(0,Math.round(monotonicNow()-queuedAt))}));await player.playReaction({selector:{roomId:context.roomId,gameId:context.game.id,deviceId,profileVersion:context.profileVersion,...target},signal:active.abort.signal,onBind:binding=>{
   if(fence!==generation||run!==active||active.cancelled||active.abort.signal.aborted||!validCaptionJob(binding?.job)||target.eventId&&binding.job.eventId!==target.eventId||target.jobId&&binding.job.id!==target.jobId||target.sourceCommandId&&binding.job.sourceCommandId!==target.sourceCommandId||binding.claim?.jobId!==binding.job.id||binding.claim.roomId!==context.roomId||binding.claim.deviceId!==deviceId||binding.lease.owner!==context.userId||binding.lease.device!==deviceId||binding.lease.epoch!==binding.claim.epoch)return false;
   active.job=binding.job;active.claim=binding.claim;lease={...binding.lease,monotonicDeadline:binding.claim.monotonicDeadline};
   publish({playing:{jobId:active.job.id,caption:active.job.caption},status:'playing',captions:[...state.captions.filter(c=>c.id!==active.job.id),{...active.job}].slice(-20)});return true;
  },onEvent:event=>receive(active,event)});
  }catch{if(fence===generation){if(run===active){
   // Stop even an unbound failed request before draining newer work; only bound output has a receipt identity.
   if(active.claim.epoch===0)active.cancelled=true;
   try{await stopNative('player-failed');}catch{if(fence===generation){invalidate('player-failed');publish({status:'caption-only',error:'Voice unavailable. Scores are saved normally.'});}return;}
   if(fence!==generation)return;
   if(run===active&&active.claim.epoch>0)receive(active,{jobId:active.job.id,epoch:active.claim.epoch,state:'failed',sequence:active.sequence+1,reason:'native-request-failed',measurementBasis:'client-request-failure'});
  }publish({error:'Voice unavailable. Scores are saved normally.'});}}
  finally{if(run===active&&active.claim.epoch===0){run=null;publish({status:'ready',playing:null});void react();}}
 }
 let completionBarrier=null;
 function receive(current,event){
  event={...event,status:event?.state||event?.status};
  if(event?.jobId!==current.job.id||event.epoch!==current.claim.epoch||!lifecycle.has(event.status)||!Number.isInteger(event.sequence)||event.sequence<=current.sequence)return;
  if(current.cancelled&&event.status!=='interrupted')return;
  if(current.ended||event.status==='started'&&current.started)return;
  if(event.status==='failed'||event.status==='interrupted')console.warn('[Commentary]',event.status,/^[a-zA-Z0-9_-]{1,80}$/.test(event.reason||'')?event.reason:'playback-stopped');
  current.sequence=event.sequence;
  if(event.status==='started'){current.started=true;if(run===current&&direct()&&desired&&!desired.preparation)prepareAhead(desired);}
  if(terminal.has(event.status))current.ended=true;
  const receiptGeneration=generation;
  const timing=playbackTiming(current.job,event);
  const payload={...(timing?{timing:{basis:timing.basis,elapsedMs:timing.elapsedMs,nativeStartupMs:timing.nativeStartupMs}}:{}),jobId:current.job.id,device:deviceId,epoch:current.claim.epoch,claimToken:current.claim.token,status:event.status,sequence:event.sequence};
  // Preserve real native evidence only. A host receipt never marks other people as having heard.
  current.receipts=current.receipts.then(()=>invoke('playback-event',payload,undefined,current.roomId)).then(receipt=>{
   if(direct()&&terminal.has(event.status)&&(receipt?.jobId!==current.job.id||receipt.epoch!==current.claim.epoch||receipt.sequence!==event.sequence||receipt.status!==event.status||receipt.accepted===false))throw Error('Terminal receipt was not acknowledged');
   if(receiptGeneration===generation&&direct()&&terminal.has(receipt?.status)&&['completed','interrupted'].includes(receipt.status)&&receipt.jobId===current.job.id&&receipt.epoch===current.claim.epoch&&receipt.firstExposureAt!=null&&receipt.expectedAudience?.includes(context?.userId)&&context?.roomId===current.roomId){
    current.feedbackReady=true;const basis=receipt.heardBy?.includes(context.userId)?'playback':'caption';
    publish({captions:state.captions.map(c=>c.id===current.job.id?{...c,status:receipt.status,feedbackBasis:basis}:c)});
   }return receipt;
  }).catch(()=>{if(terminal.has(event.status))current.terminalReceiptFailed=true;});
  if(!current.cancelled&&run===current)publish({...(event.status==='started'?{error:null}:{}),measurement:{jobId:current.job.id,status:event.status,measurementBasis:event.measurementBasis||'unknown',nativeElapsedMs:event.nativeElapsedMs??null}});
  if(current.ended&&run===current){run=null;publish({playing:null,status:speakable()?'ready':'caption-only'});const receipt=current.receipts;completionBarrier=receipt;void Promise.all([receipt,pending]).then(()=>{if(completionBarrier===receipt)completionBarrier=null;if(receiptGeneration!==generation)return;if(current.terminalReceiptFailed){publish({status:'caption-only',error:'Commentary could not confirm playback. Keep playing; scores are saved.'});return;}if(direct()){void react();if(!current.feedbackReady)return refresh({readCaptions:true});return;}return refresh();}).catch(()=>{if(completionBarrier===receipt)completionBarrier=null;});}
 }
 async function refresh({profile:suppliedProfile,readCaptions=false}={}){
  if(direct()){
   if(readCaptions&&context?.userId){try{const projection=await invoke('jobs-read');const jobs=Array.isArray(projection)?projection:projection.jobs;publish({captions:jobs.filter(validCaptionJob)});}catch{}}
   void react();return;
  }
  if(disposed||!context?.userId||!context?.game||!context?.roomId)return;
  if(pending)return pending;
  const fence=generation,signal=abort.signal;
  const current=async()=>{
   try{
    const profile=suppliedProfile||await invoke('profile-read',{},signal);if(fence!==generation)return;
    if(profile.version!==context.profileVersion){invalidate('profile-changed');publish({captions:[],status:'settings-changed'});return;}
    const jobs=await invoke('jobs-read',{},signal);if(fence!==generation)return;
    const projection=Array.isArray(jobs)?jobs:jobs.jobs;
    if(!Array.isArray(projection))throw Error('Invalid caption projection');
    const captionJobs=projection.filter(validCaptionJob);
    if(run){
     const live=projection.find(job=>job?.id===run.job.id);
     if(!live||!['ready','claimed','streaming','started'].includes(live.status)||!validCaptionJob(live)){
      invalidate('server-cancelled');
      publish({captions:captionJobs.slice(-20).map(job=>({id:job.id,caption:job.caption,eventId:job.eventId,acceptedAt:job.acceptedAt,sourceCommandId:job.sourceCommandId,purpose:job.purpose,dependencyEventIds:[...job.dependencyEventIds],...(['playback','caption'].includes(job.feedbackBasis)?{feedbackBasis:job.feedbackBasis,...(['like','dislike'].includes(job.feedbackValue)?{feedbackValue:job.feedbackValue}:{})}:{})})),error:null,status:'caption-only'});
      return;
     }
    }
    publish({captions:captionJobs.slice(-20).map(job=>({id:job.id,caption:job.caption,eventId:job.eventId,acceptedAt:job.acceptedAt,sourceCommandId:job.sourceCommandId,purpose:job.purpose,dependencyEventIds:[...job.dependencyEventIds],...(['playback','caption'].includes(job.feedbackBasis)?{feedbackBasis:job.feedbackBasis,...(['like','dislike'].includes(job.feedbackValue)?{feedbackValue:job.feedbackValue}:{})}:{})})),error:null});
    if(initial){projection.forEach(job=>{if(!greetingAllowed(job)||!['opening','return','next-game'].includes(job.purpose)||job.lifecycleVerified!==true)hydrated.add(job.id);});initial=false;if(!greetings.size&&!greetingCommands.size)return;}
    const capability=profile.capabilities||{},voiceAllowed=capability.liveProviders===true||allowSyntheticPlayback&&capability.providerMode==='synthetic';
    if(!voiceAllowed){if(run)invalidate('provider-unavailable');publish({status:'caption-only'});return;}
    if(!speakable()||run||completionBarrier)return;
    const job=[...captionJobs].reverse().sort((a,b)=>Date.parse(b.acceptedAt)-Date.parse(a.acceptedAt)).find(job=>job.status==='ready'&&(!greetingAllowed(job)||['opening','return','next-game'].includes(job.purpose)&&job.lifecycleVerified===true)&&(!hydrated.has(job.id)||greetingAllowed(job))&&!attempted.has(job.id));if(!job)return;
    if((job.purpose||'score')==='score')for(const older of captionJobs)if(older!==job&&(older.purpose||'score')==='score'&&older.status==='ready')attempted.add(older.id);
    attempted.add(job.id);greetings.delete(job.id);greetingCommands.delete(job.sourceCommandId);if(['opening','return','next-game'].includes(job.purpose))playedGreetingCommands.add(job.sourceCommandId);
    const acquisitionSentAt=monotonicNow();
    const combined=capability.atomicPlaybackStart===true?await invoke('playback-start',{device:deviceId,jobId:job.id},signal):null;if(combined&&!combined.claim?.claimed)return;
    const acquired=combined?.lease||await invoke('playback-acquire',{device:deviceId},signal);if(fence!==generation)return;
    if(acquired.owner!==context.userId||acquired.device!==deviceId||!Number.isInteger(acquired.epoch))return;
    const acquiredTiming=conservativeLeaseDeadline(acquired,{sentAt:acquisitionSentAt,receivedAt:monotonicNow()});
    if(acquiredTiming.expired)return;
    lease={...acquired,monotonicDeadline:acquiredTiming.deadline};
    const claim=combined?.claim||await invoke('playback-claim',{jobId:job.id,device:deviceId,epoch:lease.epoch},signal);if(fence!==generation||!claim.claimed||monotonicNow()>=lease.monotonicDeadline)return;
    const playbackClaim={roomId:context.roomId,jobId:job.id,token:claim.token,epoch:lease.epoch,deviceId,expiresAt:lease.expiresAt,monotonicDeadline:lease.monotonicDeadline};
    const active={job,claim:playbackClaim,roomId:context.roomId,sequence:0,started:false,ended:false,cancelled:false,abort:new AbortController(),receipts:Promise.resolve()};
    run=active;publish({playing:{jobId:job.id,caption:job.caption},status:'playing'});
    // Detached from scoring and caption polling. Native callbacks establish playback evidence.
    Promise.resolve().then(()=>{if(run===active&&!active.abort.signal.aborted)return player.play({claim:playbackClaim,signal:active.abort.signal,onEvent:event=>receive(active,event)});}).catch(()=>{console.warn('[Commentary] native-playback-failed');if(run===active){stop('player-failed');publish({status:'caption-only',error:'Voice unavailable. Scores are saved normally.'});}});
   }catch(error){if(fence===generation&&!signal.aborted)publish({status:'caption-only',error:'Commentary unavailable. Scores are saved normally.'});}
  };
  const task=current();pending=task;
  try{await task;}finally{if(pending===task)pending=null;}
 }
 async function heartbeat(){
  if(!run||!lease||!speakable())return;
  const active=run,fence=generation;
  try{
   const renewalSentAt=monotonicNow();
   const renewed=await invoke('playback-heartbeat',{device:deviceId,epoch:lease.epoch});
   if(fence!==generation||run!==active)return;
   if(renewed.owner!==context.userId||renewed.device!==deviceId||renewed.epoch!==lease.epoch){invalidate('lease-lost');return;}
   const renewedTiming=conservativeLeaseDeadline(renewed,{sentAt:renewalSentAt,receivedAt:monotonicNow()});
   if(renewedTiming.expired){invalidate('lease-lost');return;}
   lease={...renewed,monotonicDeadline:renewedTiming.deadline};active.claim={...active.claim,expiresAt:renewed.expiresAt,monotonicDeadline:renewedTiming.deadline};
   await player.renew?.({claim:active.claim});
  }catch{if(fence===generation)invalidate('lease-lost');}
 }
 async function feedback({jobId,value,basis}={}) {
  if(disposed||!context?.userId||!['like','dislike'].includes(value)||!['playback','caption'].includes(basis))throw Error('Feedback unavailable.');
  const caption=state.captions.find(item=>item.id===jobId);
  if(!caption||caption.feedbackBasis!==basis)throw Error('Feedback unavailable for this remark.');
  const fence=generation,signal=abort.signal;
  const result=await invoke('feedback',{jobId,value,basis},signal).catch(()=>{throw Error('Could not save feedback.');});
  if(fence!==generation||signal.aborted)throw Error('Commentary session changed.');
  if(result?.jobId!==jobId||result?.value!==value||result?.basis!==basis)throw Error('Could not save feedback.');
  publish({captions:state.captions.map(item=>item.id===jobId?{...item,feedbackValue:value}:item)});
  await refresh();
  if(fence!==generation)throw Error('Commentary session changed.');
  return result;
 }
 async function forgetHistory() {
  forgetPlaybackTimings();
  if(disposed||!context?.userId||!context?.roomId)throw Error('Sign in to forget commentary history.');
  suppressed=new Set([...suppressed,...hydrated,...attempted,...state.captions.map(item=>item.id)]);
  invalidate('history-forgotten');initial=true;hydrated=new Set();attempted=new Set();greetings=new Set();greetingCommands=new Set();
  publish({captions:[],playing:null,measurement:null,error:null});
  const fence=generation,signal=abort.signal;
  try{
   const result=await invoke('forget-history',{},signal);
   if(fence!==generation||signal.aborted)throw Error('Commentary session changed.');
   await refresh();
   if(fence!==generation)throw Error('Commentary session changed.');
   return result;
  }catch(error){if(fence===generation&&!signal.aborted)publish({error:'Could not forget commentary history. Try again.'});throw Error(fence===generation?'Could not forget commentary history.':'Commentary session changed.');}
 }
 function allowGreeting({jobId,sourceCommandId,gameId,profileVersion}={}){
  if(disposed||!context?.userId||context.userId!==context.hostId||!context.enabled||gameId!==context.game?.id||profileVersion!==undefined&&profileVersion!==context.profileVersion)return false;
  if(jobId!==undefined){
   if(typeof jobId!=='string'||!/^[A-Za-z0-9_-]{8,200}$/.test(jobId)||attempted.has(jobId)||suppressed.has(jobId))return false;
   greetings.add(jobId);hydrated.delete(jobId);if(direct())desired={jobId};return true;
  }
  if(typeof sourceCommandId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(sourceCommandId)||playedGreetingCommands.has(sourceCommandId))return false;
  greetingCommands.add(sourceCommandId);
  if(direct())desired={sourceCommandId};
  for(const caption of state.captions)if(caption.sourceCommandId===sourceCommandId)hydrated.delete(caption.id);
  return true;
 }
 return {update,refresh,heartbeat,feedback,forgetHistory,allowGreeting,snapshot,dispose(){if(disposed)return;invalidate('disposed');disposed=true;context=null;publish({status:'offline',captions:[]});}};
}















