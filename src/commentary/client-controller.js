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
 function stop(reason){
  if(run){run.cancelled=true;run.abort.abort();Promise.resolve(player.stop(reason)).catch(()=>{});run=null;}
  lease=null;publish({playing:null});
 }
 function invalidate(reason){generation++;abort.abort();abort=new AbortController();pending=null;stop(reason);}
 function update(next){
  if(disposed)return;
  const switched=scope(next)!==scope(context),profileChanged=next?.profileVersion!==context?.profileVersion;
  const seen=new Set(context?.game?.events?.map(e=>e.id)||[]);
  const changedTargets=(next?.game?.events||[]).filter(e=>!seen.has(e.id)&&['score-undo','score-correction'].includes(e.type)).map(e=>e.target);
  const epochLost=run&&next&&Object.hasOwn(next,'leaseEpoch')&&next.leaseEpoch!==run.claim.epoch;
  const dependent=run&&changedTargets.some(id=>run.job.dependencyEventIds.includes(id)||run.job.eventId===id);
  if(context?.game&&next?.game&&context.game.id===next.game.id&&next.visible!==false)for(const event of next.game.events||[])if(!seen.has(event.id))observeScoreEvent(event);
  context=next;
  if(changedTargets.length)publish({captions:state.captions.filter(caption=>!changedTargets.some(id=>caption.eventId===id||caption.dependencyEventIds.includes(id)))});
  if(switched||profileChanged||epochLost||dependent||!speakable())invalidate(switched?'context-changed':profileChanged?'profile-changed':epochLost?'lease-lost':dependent?'facts-invalidated':'playback-unavailable');
  if(switched){suppressed=new Set();playedGreetingCommands=new Set();}
  if(switched||profileChanged){initial=true;hydrated=new Set();attempted=new Set();greetings=new Set();greetingCommands=new Set();publish({captions:[],error:null,measurement:null});}
  if(!context?.userId||!context?.roomId||!context?.game)publish({status:'offline',captions:[]});
  else publish({status:context.paused?'paused':speakable()?'ready':'caption-only'});
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
 let completionBarrier=null;
 function receive(current,event){
  event={...event,status:event?.state||event?.status};
  if(event?.jobId!==current.job.id||event.epoch!==current.claim.epoch||!lifecycle.has(event.status)||!Number.isInteger(event.sequence)||event.sequence<=current.sequence)return;
  if(current.cancelled&&event.status!=='interrupted')return;
  if(current.ended||event.status==='started'&&current.started)return;
  if(event.status==='failed'||event.status==='interrupted')console.warn('[Commentary]',event.status,/^[a-zA-Z0-9_-]{1,80}$/.test(event.reason||'')?event.reason:'playback-stopped');
  current.sequence=event.sequence;
  if(event.status==='started')current.started=true;
  if(terminal.has(event.status))current.ended=true;
  const timing=playbackTiming(current.job,event);
  const payload={...(timing?{timing:{basis:timing.basis,elapsedMs:timing.elapsedMs,nativeStartupMs:timing.nativeStartupMs}}:{}),jobId:current.job.id,device:deviceId,epoch:current.claim.epoch,claimToken:current.claim.token,status:event.status,sequence:event.sequence};
  // Preserve real native evidence only. A host receipt never marks other people as having heard.
  current.receipts=current.receipts.then(()=>invoke('playback-event',payload,undefined,current.roomId)).catch(()=>{});
  if(!current.cancelled&&run===current)publish({measurement:{jobId:current.job.id,status:event.status,measurementBasis:event.measurementBasis||'unknown',nativeElapsedMs:event.nativeElapsedMs??null}});
  if(current.ended&&run===current){run=null;publish({playing:null,status:speakable()?'ready':'caption-only'});const receipt=current.receipts;completionBarrier=receipt;void Promise.all([receipt,pending]).then(()=>{if(completionBarrier===receipt)completionBarrier=null;return refresh();}).catch(()=>{if(completionBarrier===receipt)completionBarrier=null;});}
 }
 async function refresh({profile:suppliedProfile}={}){
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
   greetings.add(jobId);hydrated.delete(jobId);return true;
  }
  if(typeof sourceCommandId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(sourceCommandId)||playedGreetingCommands.has(sourceCommandId))return false;
  greetingCommands.add(sourceCommandId);
  for(const caption of state.captions)if(caption.sourceCommandId===sourceCommandId)hydrated.delete(caption.id);
  return true;
 }
 return {update,refresh,heartbeat,feedback,forgetHistory,allowGreeting,snapshot,dispose(){if(disposed)return;invalidate('disposed');disposed=true;context=null;publish({status:'offline',captions:[]});}};
}















