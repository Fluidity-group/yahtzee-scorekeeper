import { registerPlugin } from '@capacitor/core';
const nativePlugin=registerPlugin('LiveCommentary');
const safeHeader=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\r\n]/.test(value);
export function streamRequest(serviceBase,claim,accessToken,monotonicNow=performance.now()){
 const base=new URL(serviceBase);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw new Error('A configured HTTPS commentary service is required.');
 if(!claim||!safeHeader(claim.roomId,200)||!safeHeader(claim.jobId,200)||!safeHeader(claim.token,512)||!safeHeader(claim.deviceId,200)||!safeHeader(accessToken,8192)||!Number.isSafeInteger(claim.epoch)||claim.epoch<1)throw new Error('A bounded authenticated playback claim is required.');
 const remaining=claim.monotonicDeadline-monotonicNow;if(!Number.isFinite(remaining)||remaining<=0)throw new Error('Playback claim expired.');
 const endpoint=`${base.href.replace(/\/$/,'')}/commentary/${encodeURIComponent(claim.roomId)}/audio/${encodeURIComponent(claim.jobId)}`;
 return {endpoint,accessToken,claimToken:claim.token,deviceId:claim.deviceId,jobId:claim.jobId,epoch:claim.epoch,leaseRemainingMs:Math.min(15000,Math.floor(remaining))};
}
// Native position advancing is a playout proxy. It never proves speaker sound or audience hearing.
export function createNativeCommentaryPlayer({plugin=nativePlugin,serviceBase,getAccessToken,onMeasurement=event=>console.info('[Commentary native]',JSON.stringify({stage:event.state,jobId:event.jobId,elapsedMs:event.nativeElapsedMs})),monotonicNow=()=>performance.now()}={}){
 let listener=null,listenerPending=null,current=null,generation=0;
 const seen=new Set();
 const finishCurrent=()=>{current?.removeAbort?.();current=null;};
 const listen=async()=>{if(listener)return;if(listenerPending){await listenerPending;return;}listenerPending=plugin.addListener('playback',event=>{
  const active=current;if(!active||event.jobId!==active.claim.jobId||event.epoch!==active.claim.epoch||!Number.isSafeInteger(event.sequence)||event.sequence<=active.sequence)return;
  active.sequence=event.sequence;
  if(['first-byte','playout-started'].includes(event.state))onMeasurement({...event,physicalAudibilityVerified:false});
  if(event.state==='playout-started')active.onEvent({...event,state:'started',physicalAudibilityVerified:false});
  else if(['completed','interrupted','failed'].includes(event.state)){active.onEvent(event);finishCurrent();}
 });listener=await listenerPending;listenerPending=null;};
 const stop=async(reason='cancelled')=>{
  generation++;const prior=current;finishCurrent();await plugin.stop({reason});
  if(prior)prior.onEvent({jobId:prior.claim.jobId,epoch:prior.claim.epoch,state:'interrupted',sequence:prior.sequence+1,reason,measurementBasis:'client-cancellation',physicalAudibilityVerified:false});
 };
 return {
  async play({claim,signal,onEvent=()=>{}}){
   if(signal?.aborted)return false;
   const key=`${claim?.jobId}:${claim?.epoch}:${claim?.token}`;if(seen.has(key))return false;
   const ownGeneration=++generation;const prior=current;finishCurrent();await plugin.stop({reason:'superseded'});
   if(prior)prior.onEvent({jobId:prior.claim.jobId,epoch:prior.claim.epoch,state:'interrupted',sequence:prior.sequence+1,reason:'superseded',measurementBasis:'client-cancellation'});
   if(generation!==ownGeneration||signal?.aborted)return false;await listen();
   const accessToken=await getAccessToken();if(generation!==ownGeneration||signal?.aborted)return false;
   const request=streamRequest(serviceBase,claim,accessToken,monotonicNow());seen.add(key);
   const abort=()=>{void stop('aborted').catch(()=>{});};
   current={claim,onEvent,sequence:0,removeAbort:()=>signal?.removeEventListener('abort',abort)};signal?.addEventListener('abort',abort,{once:true});
   try{await plugin.play(request);return true;}catch(error){if(generation===ownGeneration&&current?.claim.jobId===claim.jobId){const sequence=(current?.sequence || 0)+1;finishCurrent();onEvent({jobId:claim.jobId,epoch:claim.epoch,state:'failed',sequence,reason:'native-playback-failed'});}throw error;}
  },
  stop,
  async renew({claim}){
   if(!current||claim.jobId!==current.claim.jobId||claim.epoch!==current.claim.epoch||claim.token!==current.claim.token)return false;
   const request=streamRequest(serviceBase,claim,'renewal-validation-only',monotonicNow());current.claim=claim;
   await plugin.renew({jobId:claim.jobId,epoch:claim.epoch,leaseRemainingMs:request.leaseRemainingMs});return true;
  },
  async dispose(){await stop('disposed');await listener?.remove();listener=null;}
 };
}
