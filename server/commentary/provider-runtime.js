import {createAnthropicWriter} from './anthropic-writer.js';
import {WRITER_MECHANISMS,WRITER_SUBJECTS} from './writer-prompt.js';
import {resolveCommentaryVoice} from './voice-routing.js';
import {commentaryHandler} from './handler.js';
const gates=new WeakSet(),uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,identifier=/^[A-Za-z0-9:_-]{8,200}$/;
export class ProviderRuntimeError extends Error{constructor(code,status=null){super('Commentary provider unavailable: '+code);this.code=code;this.status=status;}}
const fail=(code,status)=>{throw new ProviderRuntimeError(code,status);};
const positive=(value)=>Number.isSafeInteger(value)&&value>0;
// Composition must supply REAL backend RPC functions; this factory is not persistence.
// Rehearsal objects/boolean durable claims alone cannot enable paid runtime.
export function createDurableProviderGate({verifyPersistence,readAllowance,reserveAttempt,finishAttempt}={}){
 if([verifyPersistence,readAllowance,reserveAttempt,finishAttempt].some(fn=>typeof fn!=='function'))fail('database-ledger-required');
 const gate={verifyPersistence,readAllowance,reserveAttempt,finishAttempt};gates.add(gate);return Object.freeze(gate);
}
export function serviceWriterPacket({facts,profile,personalContext=null,preferences={},targetAccountId}={}){
 const purpose=facts?.purpose||'score',target=targetAccountId||facts?.accountId||facts?.seats?.[0]?.accountId;
 if(!uuid.test(target||''))fail('target-invalid');
 // The service supplies ONLY consented target context. Never accept a rival profile list.
 if(personalContext&&personalContext.accountId!==target)fail('target-profile-mismatch');
 const tags=(name,allowed)=>[...new Set((Array.isArray(preferences?.[name])?preferences[name]:[]).filter(tag=>allowed.includes(tag)))].slice(0,12);
 return {purpose,facts,profile,targetAccountId:target,playerProfiles:personalContext?[{accountId:target,gender:personalContext.gender||'',blurb:personalContext.blurb||''}]:[],feedback:{likedMechanisms:tags('likedMechanisms',WRITER_MECHANISMS),dislikedMechanisms:tags('dislikedMechanisms',WRITER_MECHANISMS),likedSubjects:tags('likedSubjects',WRITER_SUBJECTS),dislikedSubjects:tags('dislikedSubjects',WRITER_SUBJECTS),avoidSubjects:tags('avoidSubjects',WRITER_SUBJECTS),ratingsCount:Number.isSafeInteger(preferences?.ratingsCount)&&preferences.ratingsCount>=0?preferences.ratingsCount:0}};
}
export function createCommentaryProviders({allowPaid=false,allowance,durableGate,getAnthropicKey,getElevenLabsKey,model='claude-haiku-4-5-20251001',workspaceId,writerLimits,audioLimits,fetchImpl=fetch,now=()=>Date.now(),monotonicNow=()=>performance.now()}={}){
 let writerRequests=0,ttsRequests=0,ttsCharacters=0;const seen=new Set();
 function active(signal){if(signal?.aborted)fail('cancelled');if(!allowPaid)fail('paid-disabled');if(!gates.has(durableGate))fail('database-ledger-required');if(!identifier.test(allowance?.id||'')||!Number.isFinite(allowance.expiresAt)||allowance.expiresAt<=now()||!['maxWriterRequests','maxTtsRequests','maxTtsCharacters'].every(k=>positive(allowance[k])))fail('allowance-invalid-or-expired');}
 function binding(input){if(!uuid.test(input?.roomId||'')||!uuid.test(input?.jobId||'')||!identifier.test(input?.requestId||''))fail('trusted-job-binding-required');return {roomId:input.roomId,jobId:input.jobId,requestId:input.requestId};}
 async function reserve(input,stage,details){
  active(input.signal);const bind=binding(input),key=stage+':'+bind.requestId;if(seen.has(key))fail('attempt-duplicate');seen.add(key);
  let verified,authority;try{verified=await durableGate.verifyPersistence();authority=verified===true?await durableGate.readAllowance(allowance.id):null;}catch{fail('ledger-unavailable');}
  if(verified!==true)fail('database-ledger-required');active(input.signal);
  if(authority?.id!==allowance.id||authority.approved!==true||authority.revoked===true||authority.expiresAt!==allowance.expiresAt||authority.expiresAt<=now()||['maxWriterRequests','maxTtsRequests','maxTtsCharacters'].some(k=>authority[k]!==allowance[k]))fail('allowance-not-approved');
  let receipt;try{receipt=await durableGate.reserveAttempt({...bind,stage,allowanceId:allowance.id,expiresAt:allowance.expiresAt,...details});}catch{fail('ledger-unavailable');}
  if(!identifier.test(receipt?.id||'')||receipt.allowanceId!==allowance.id||receipt.requestId!==bind.requestId||receipt.stage!==stage||receipt.committed!==true)fail('reservation-uncommitted');
  return receipt;
 }
 async function finish(id,metadata){try{await durableGate.finishAttempt(id,metadata);}catch{fail('ledger-reconciliation-required');}}
 async function writeLine(input){
  active(input?.signal);binding(input);if(!writerLimits||typeof getAnthropicKey!=='function')fail('writer-config-required');if(writerRequests>=allowance.maxWriterRequests)fail('writer-cap');writerRequests++;
  const packet=serviceWriterPacket(input);
  const writer=createAnthropicWriter({model,workspaceId,getKey:async()=>{active(input.signal);return getAnthropicKey();},limits:{...writerLimits,maxRequests:1},allowPaid:true,now:monotonicNow,fetchImpl:(url,options)=>{active(input.signal);return fetchImpl(url,{...options,signal:input.signal?AbortSignal.any([options.signal,input.signal]):options.signal});},budgetGate:{reserve:async details=>{const receipt=await reserve(input,'writer',details);return {id:receipt.id,durable:true,approved:true};},finish}});
  const line=await writer.write(packet,{requestId:input.requestId});
  return {text:line.spokenText,mechanism:line.mechanism,subject:line.subject,subjects:[line.subject],containsProfanity:line.containsProfanity,profileSourceAccountIds:line.profileSourceAccountIds,groundingBasis:line.groundingBasis,source:line.source,model:line.model,usage:line.usage};
 }
 async function* streamAudio(input){
  active(input?.signal);binding(input);
  if(!audioLimits||!['firstByteMs','completeMs','maxBytes','maxLineCharacters'].every(k=>positive(audioLimits[k]))||audioLimits.firstByteMs>audioLimits.completeMs||audioLimits.completeMs>60000||audioLimits.maxBytes>5242880||typeof getElevenLabsKey!=='function')fail('audio-config-required');
  const text=input.text;if(typeof text!=='string'||!text.trim()||text.trim()!==text||/[\u0000-\u001f\u007f\[\]`<>]/.test(text)||!/[.!?]["']?$/.test(text)||[...text].length>audioLimits.maxLineCharacters)fail('complete-line-required');
  const voice=resolveCommentaryVoice(input.profile?.voiceOption);if(input.voice&&(input.voice.voiceId!==voice.voiceId||input.voice.voiceOption!==voice.voiceOption))fail('voice-route-mismatch');
  const characters=[...text].length;if(ttsRequests>=allowance.maxTtsRequests||ttsCharacters+characters>allowance.maxTtsCharacters)fail('tts-cap');ttsRequests++;ttsCharacters+=characters;
  let key;try{key=await getElevenLabsKey();}catch{fail('credential-unavailable');}active(input.signal);if(typeof key!=='string'||!(/^[a-f0-9]{64}$/i.test(key)||/^sk_[A-Za-z0-9_-]{20,}$/.test(key)))fail('credential-unavailable');
  const receipt=await reserve(input,'tts',{provider:'elevenlabs',model:'eleven_flash_v2_5',submittedCharacters:characters});
  const controller=new AbortController(),signal=input.signal?AbortSignal.any([controller.signal,input.signal]):controller.signal,start=monotonicNow();let firstTimer,completeTimer,reader,bytes=0,firstByteMs=null,completed=false,failureCode=null,failureStatus=null;
  try{
   active(signal);firstTimer=setTimeout(()=>controller.abort(),audioLimits.firstByteMs);completeTimer=setTimeout(()=>controller.abort(),audioLimits.completeMs);
   const interrupted=promise=>new Promise((resolve,reject)=>{const abort=()=>reject(new ProviderRuntimeError('cancelled-or-deadline'));if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
   const response=await interrupted(fetchImpl('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(voice.voiceId)+'/stream?output_format=mp3_44100_128',{method:'POST',signal,headers:{'xi-api-key':key,'content-type':'application/json',accept:'audio/mpeg'},body:JSON.stringify({text,model_id:'eleven_flash_v2_5'})}));
   if(!response.ok)fail('provider-http',response.status);if(!response.headers.get('content-type')?.includes('audio/')||!response.body)fail('non-audio-response');reader=response.body.getReader();
   while(true){const {done,value}=await interrupted(reader.read());if(done)break;if(!value?.byteLength)continue;bytes+=value.byteLength;if(bytes>audioLimits.maxBytes)fail('audio-byte-cap');if(firstByteMs===null){firstByteMs=monotonicNow()-start;clearTimeout(firstTimer);}active(signal);yield value;}
   if(!bytes)fail('empty-audio');completed=true;await finish(receipt.id,{status:'completed',bytes,firstByteMs,completeMs:monotonicNow()-start,firstAudibleMs:null});
  }catch(error){failureCode=error instanceof ProviderRuntimeError?error.code:'provider-unavailable';failureStatus=error instanceof ProviderRuntimeError?error.status:null;if(error instanceof ProviderRuntimeError)throw error;fail('provider-unavailable');}
  finally{controller.abort();clearTimeout(firstTimer);clearTimeout(completeTimer);try{await reader?.cancel();}catch{}if(!completed)await finish(receipt.id,{status:failureCode?(failureCode==='cancelled-or-deadline'?'interrupted-or-unknown':'failed'):'interrupted',failureCode,failureStatus,bytes,firstByteMs,firstAudibleMs:null});}
 }
 return {writeLine,streamAudio,providerMode:'server-live',liveConfigured:allowPaid===true};
}
// Auth must verify a real Supabase user token, not decode unverified JWT claims.
export function composeCommentaryEndpoint({service,authenticate,refresh}={}){
 if(!service||typeof authenticate!=='function'||typeof refresh!=='function')fail('durable-composition-required');
 return commentaryHandler({service,authenticate:async request=>{const actor=await authenticate(request);if(!uuid.test(actor||''))return null;await refresh({userId:actor,request});return actor;}});
}
