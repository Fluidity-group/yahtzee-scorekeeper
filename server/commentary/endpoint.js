import {createRequestTrace} from './request-trace.js';
import {localRoom} from './local-sessions.js';
import {createCommentaryService} from './service.js';
import {DurableCommentaryStore,createSupabaseCommentaryRpc} from './durable-store.js';
import {createCommentaryProviders,createDurableProviderGate,composeCommentaryEndpoint} from './provider-runtime.js';
import {createSupabaseRoomAdapter} from '../rooms/supabase-adapter.js';

function createEndpoint({env,fetchImpl=fetch,snapshotCache,onOperation=()=>{},waitUntil=promise=>promise.catch(()=>{})}={}){
 const get=name=>typeof env?.get==='function'?env.get(name):env?.[name];
const scopeId='d1ce0000-0000-4000-8000-000000000026';
const url=get('SUPABASE_URL'),key=get('SUPABASE_SERVICE_ROLE_KEY');
const enabled=get('COMMENTARY_LIVE_ENABLED')==='true';
const allowance={id:get('COMMENTARY_ALLOWANCE_ID')||'sw026-pixel-owner-test',expiresAt:Date.parse(get('COMMENTARY_ALLOWANCE_EXPIRES_AT')||''),maxWriterRequests:200,maxTtsRequests:200,maxTtsCharacters:36000};
const {store:roomStore,authenticate}=createSupabaseRoomAdapter({url,key,fetchImplementation:fetchImpl});
async function resource(path,options={}){
 const response=await fetchImpl(url+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Commentary persistence unavailable.');return response.json();
}
const rpc=(operation,body)=>resource('rpc/'+operation,{method:'POST',body:JSON.stringify(body)});
function createRuntime(){
 const persistence=new DurableCommentaryStore({scopeId,incremental:true,seed:snapshotCache?.current,onSnapshot:row=>{if(snapshotCache&&(!snapshotCache.current||row.version>=snapshotCache.current.version))snapshotCache.current=row;},rpc:createSupabaseCommentaryRpc({url,getServiceKey:()=>key,fetchImplementation:fetchImpl,timeoutMs:8000})});
 const gate=createDurableProviderGate({
  verifyPersistence:()=>persistence instanceof DurableCommentaryStore&&persistence.version!==null,
  readAllowance:async id=>id===allowance.id?{...allowance,approved:enabled,revoked:!enabled}:null,
  reserveAttempt:async input=>{
   const limits=await resource('clubhouse_commentary_limits?scope_id=eq.'+scopeId+'&room_id=eq.'+input.roomId+'&select=max_requests,max_characters,expires_at');
   if(!limits[0]||Date.parse(limits[0].expires_at)<=Date.now())throw Error('No current administered test allowance.');
   return persistence.transaction(state=>{
    const attempt=state.attempts.get(input.requestId),job=state.jobs.get(input.jobId);
    if(!attempt||attempt.jobId!==input.jobId||attempt.stage!==input.stage||attempt.status!=='submitted'||attempt.providerDispatchedAt||job?.roomId!==input.roomId||job.profile.enabled!==true||['cancelled','silent','failed'].includes(job.status)||input.allowanceId!==allowance.id||input.expiresAt!==allowance.expiresAt||Date.now()>=allowance.expiresAt)throw Error('Provider attempt is not dispatchable.');
    if(input.stage==='writer'&&(job.status!=='generating'||job.workerToken!==input.requestId)||input.stage==='tts'&&(job.status!=='streaming'||!job.claim))throw Error('Provider job stage changed.');
    if(input.stage==='tts'){const lease=state.leases.get(input.roomId);if(job.activeTtsAttemptId!==input.requestId||!lease||lease.owner!==job.claim.owner||lease.device!==job.claim.device||lease.epoch!==job.claim.epoch||lease.expiresAt<=persistence.databaseNowMs)throw Error('Playback lease expired before voice dispatch.');}
    const dispatched=[...state.attempts.values()].filter(value=>value.allowanceId===allowance.id&&value.providerDispatchedAt);
    if(dispatched.filter(value=>value.stage===input.stage).length>=(input.stage==='writer'?allowance.maxWriterRequests:allowance.maxTtsRequests)||input.stage==='tts'&&dispatched.filter(value=>value.stage==='tts').reduce((total,value)=>total+(value.submittedCharacters||0),0)+input.submittedCharacters>allowance.maxTtsCharacters)throw Error('Administered provider ceiling reached.');
    const budget=state.budgets.get(input.roomId),delta=Math.max(0,input.submittedCharacters-attempt.characters);if(budget.requests>Number(limits[0].max_requests)||budget.characters+delta>Number(limits[0].max_characters))throw Error('Administered room ceiling reached.');budget.characters+=delta;
    Object.assign(attempt,{allowanceId:input.allowanceId,providerDispatchedAt:Date.now(),provider:input.provider,model:input.model,submittedCharacters:input.submittedCharacters,maxOutputTokens:input.maxOutputTokens??null});
    return {id:attempt.id,requestId:input.requestId,allowanceId:input.allowanceId,stage:input.stage,committed:true};
   });
  },
  finishAttempt:(id,metadata)=>persistence.transaction(state=>{const attempt=state.attempts.get(id);if(!attempt)throw Error('Missing durable attempt.');Object.assign(attempt,{providerResult:metadata,providerFinishedAt:Date.now()});return true;}),
 });
 const providers=enabled?createCommentaryProviders({fetchImpl,allowPaid:true,allowance,durableGate:gate,getAnthropicKey:()=>get('ANTHROPIC_API_KEY'),getElevenLabsKey:()=>get('ELEVENLABS_API_KEY'),model:get('COMMENTARY_WRITER_MODEL')||'claude-haiku-4-5-20251001',writerLimits:{maxRequests:1,maxInputCharacters:50000,maxOutputTokens:512,deadlineMs:12000,maxResponseBytes:20000},audioLimits:{firstByteMs:10000,completeMs:25000,maxBytes:524288,maxLineCharacters:180}}):null;
 const service=createCommentaryService({store:persistence,getRoom:async id=>{const local=persistence.read('localSessions',id);return local?localRoom(local):roomStore.byId(id);},now:()=>persistence.databaseNowMs??Date.now(),profile:{enabled:false,profanityAllowed:true,humorIntensity:'dark',frequency:'balanced',voiceOption:'rachel'},liveProviders:providers,maxAgeMs:30000,writerTimeoutMs:15000,streamTimeoutMs:30000,budget:{maxRequests:400,maxCharacters:4000000}});
 async function processRoom(roomId){
  await persistence.initialize();
  const rows=await resource('clubhouse_commentary_outbox?scope_id=eq.'+scopeId+'&room_id=eq.'+roomId+'&processed_at=is.null&select=idempotency_key,payload&order=created_at.asc&limit=10');
  for(const row of rows){
   try{const jobId=await service.enqueueCommitted(row.payload);await rpc('clubhouse_commentary_ack_outbox',{p_scope:scopeId,p_idempotency_key:row.idempotency_key,p_status:jobId?'enqueued':'invalidated',p_job_id:jobId});}catch{await rpc('clubhouse_commentary_ack_outbox',{p_scope:scopeId,p_idempotency_key:row.idempotency_key,p_status:'retry',p_job_id:null}).catch(()=>{});}
  }
  await persistence.refresh();
  const pending=[...persistence.snapshot().jobs.values()].filter(job=>job.roomId===roomId&&job.status==='pending').slice(-3);
  for(const job of pending)await service.prepareTrusted(job.id);
 }
 return {persistence,service,processRoom};
}
return async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-commentary-claim, x-commentary-epoch, x-commentary-device','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}});
 try{
  const actor=await authenticate(request);if(!actor)return new Response(JSON.stringify({error:'Sign in to use commentary.'}),{status:401,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  const runtime=createRuntime();await runtime.persistence.initialize();
  let body=null;if(request.method==='POST'){const raw=await request.clone().text();if(raw.length<=4096){try{body=JSON.parse(raw);}catch{}}}
  onOperation(body?.operation);
  if(body?.operation==='local-start'&&(!enabled||!Number.isFinite(allowance.expiresAt)||allowance.expiresAt<=Date.now()))throw Error('Live commentary is not configured.');
  if(body?.operation==='profile-update'&&body.changes?.enabled===true){
   await runtime.service.authorized(actor,body.roomId,true);
   if(!enabled||!Number.isFinite(allowance.expiresAt)||allowance.expiresAt<=Date.now())throw Error('Live test configuration is not enabled.');
   // Allowance provisioning follows successful profile CAS; rejected requests cannot grant usage.
  }
  const handler=composeCommentaryEndpoint({service:runtime.service,authenticate:async()=>actor,refresh:()=>runtime.persistence.refresh()});
  const response=await handler(request);
  if(response.ok&&(body?.operation==='local-start'||body?.operation==='profile-update'&&body.changes?.enabled===true)){await rpc('clubhouse_commentary_set_limit',{p_scope:scopeId,p_room:body.roomId,p_max_requests:400,p_max_characters:4000000,p_expires_at:new Date(allowance.expiresAt).toISOString()});}
  if(response.ok&&body?.roomId&&['jobs-read','profile-update','local-start','local-command'].includes(body.operation)){
   await runtime.service.authorized(actor,body.roomId);
   waitUntil(runtime.processRoom(body.roomId).catch(()=>{}));
  }
  return response;
 }catch{return new Response(JSON.stringify({error:'Commentary unavailable. Scores can continue.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});}
};
}

// Request-scoped diagnostics wrap the existing endpoint without changing its guards.
export function createLiveCommentaryEndpoint(options={}){
 // A private warm-isolate snapshot is only a transfer hint. Every request still
 // authenticates and checks its version against the database before any use.
 const snapshotCache={current:null};
 return async request=>{
  const trace=createRequestTrace({fetchImpl:options.fetchImpl||fetch,emit:options.onTelemetry||((value)=>console.info('[Commentary request]',JSON.stringify(value))),region:typeof options.env?.get==='function'?options.env.get('SB_REGION'):options.env?.SB_REGION});
  let operation=request.method==='GET'?'audio':'unknown';
  const knownOperations=new Set(['profile-read','profile-update','jobs-read','playback-start','playback-acquire','playback-claim','playback-event','playback-heartbeat','feedback','forget','local-start','local-read','local-command','player-profile-read','player-profile-update','player-profile-delete']);
  const endpoint=createEndpoint({...options,fetchImpl:trace.fetch,snapshotCache,onOperation:value=>{if(knownOperations.has(value))operation=value;},waitUntil:promise=>(options.waitUntil||((task)=>task.catch(()=>{})))(promise.finally(()=>trace.report('background-complete',operation,200)))});
  const response=await endpoint(request);if(request.method==='OPTIONS')return response;
  trace.report('response',operation,response.status);
  const headers=new Headers(response.headers);headers.set('Server-Timing',trace.serverTiming());
  if(operation!=='audio'||!response.ok||!response.body)return new Response(response.body,{status:response.status,headers});
  const reader=response.body.getReader();let first=true;
  return new Response(new ReadableStream({async pull(controller){try{const next=await reader.read();if(next.done){trace.report('stream-complete',operation,response.status);controller.close();return;}if(first){first=false;trace.report('stream-first-byte',operation,response.status);}controller.enqueue(next.value);}catch(error){trace.report('stream-failed',operation,response.status);controller.error(error);}},async cancel(reason){await reader.cancel(reason);trace.report('stream-cancelled',operation,response.status);}}),{status:response.status,headers});
 };
}
