import {createRequestTrace} from './request-trace.js';
import {localRoom} from './local-sessions.js';
import {createCommentaryService,CommentaryError} from './service.js';
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
 const persistence=new DurableCommentaryStore({scopeId,incremental:true,atomicBatches:true,seed:snapshotCache?.current,onSnapshot:row=>{if(snapshotCache&&(!snapshotCache.current||row.version>=snapshotCache.current.version))snapshotCache.current=row;},rpc:createSupabaseCommentaryRpc({url,getServiceKey:()=>key,fetchImplementation:fetchImpl,timeoutMs:8000})});
 const gate=createDurableProviderGate({
  verifyPersistence:()=>persistence instanceof DurableCommentaryStore&&persistence.version!==null,
  readAllowance:async id=>id===allowance.id?{...allowance,approved:enabled,revoked:!enabled}:null,
  reserveAttempt:async input=>{if(input.allowanceId!==allowance.id||input.expiresAt!==allowance.expiresAt||Date.now()>=allowance.expiresAt)throw Error('Administered allowance mismatch');return rpc('clubhouse_commentary_dispatch',{p_scope:scopeId,p_input:input});},
  finishAttempt:(id,metadata)=>rpc('clubhouse_commentary_finish',{p_scope:scopeId,p_id:id,p_metadata:metadata}),
 });
 const providers=enabled?createCommentaryProviders({fetchImpl,allowPaid:true,allowance,durableGate:gate,getAnthropicKey:()=>get('ANTHROPIC_API_KEY'),getElevenLabsKey:()=>get('ELEVENLABS_API_KEY'),model:get('COMMENTARY_WRITER_MODEL')||'claude-haiku-4-5-20251001',writerLimits:{maxRequests:1,maxInputCharacters:50000,maxOutputTokens:512,deadlineMs:12000,maxResponseBytes:20000},audioLimits:{firstByteMs:10000,completeMs:25000,maxBytes:524288,maxLineCharacters:180}}):null;
 async function getRooms(ids){
  const result=[],hosted=[];
  for(const id of ids){const local=persistence.read('localSessions',id);if(local){result.push(localRoom(local));continue;}const batch=persistence.batchContext;if(batch?.rooms.has(id)){result.push(structuredClone(batch.rooms.get(id)));continue;}if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid source room.');hosted.push(id);}
  for(let i=0;i<hosted.length;i+=100){const group=hosted.slice(i,i+100),rows=await resource('clubhouse_rooms?id=in.('+group.join(',')+')&select=state');
   if(!Array.isArray(rows)||rows.some(row=>!group.includes(row.state?.id)))throw Error('Invalid source room response.');
   for(const id of group){const room=rows.find(row=>row.state.id===id)?.state||null;result.push(room);persistence.batchContext?.rooms.set(id,structuredClone(room));}
  }return result;
 }
 const service=createCommentaryService({store:persistence,deferAudio:true,getRooms,getRoom:async id=>{const local=persistence.read('localSessions',id);if(local)return localRoom(local);const batch=persistence.batchContext;if(batch?.rooms.has(id))return structuredClone(batch.rooms.get(id));const room=await roomStore.byId(id);if(batch)batch.rooms.set(id,structuredClone(room));return room;},now:()=>persistence.databaseNowMs??Date.now(),profile:{enabled:false,profanityAllowed:true,humorIntensity:'dark',frequency:'balanced',voiceOption:'rachel'},liveProviders:providers,maxAgeMs:30000,writerTimeoutMs:15000,streamTimeoutMs:30000,budget:{maxRequests:400,maxCharacters:4000000}});
 async function ingestRoom(roomId){
  await persistence.initialize();
  const rows=await resource('clubhouse_commentary_outbox?scope_id=eq.'+scopeId+'&room_id=eq.'+roomId+'&processed_at=is.null&select=idempotency_key,payload&order=created_at.asc&limit=10');
  for(const row of rows){
   try{const jobId=await persistence.batch(()=>service.enqueueCommitted(row.payload));await rpc('clubhouse_commentary_ack_outbox',{p_scope:scopeId,p_idempotency_key:row.idempotency_key,p_status:jobId?'enqueued':'invalidated',p_job_id:jobId});}catch{await rpc('clubhouse_commentary_ack_outbox',{p_scope:scopeId,p_idempotency_key:row.idempotency_key,p_status:'retry',p_job_id:null}).catch(()=>{});}
  }
 }
 async function processRoom(roomId){
  await ingestRoom(roomId);
  await persistence.refresh();
  const pending=[...persistence.snapshot().jobs.values()].filter(job=>job.roomId===roomId&&job.status==='pending').sort((a,b)=>Date.parse(a.facts.acceptedAt)-Date.parse(b.facts.acceptedAt)||(a.facts.revision||0)-(b.facts.revision||0)).slice(-3);
  for(const job of pending)await service.prepareTrusted(job.id);
 }
 async function reaction(actor,roomId,selector,{prepareOnly=false}={}){
  let missing=false,selected=null,rows=null;
  const beforeClaim=async()=>{
   await service.authorized(actor,roomId,true);
   if(rows)for(const row of rows)await service.enqueueCommitted(row.payload);
   const exists=[...persistence.snapshot().jobs.values()].some(j=>j.roomId===roomId&&j.facts.gameId===selector.gameId&&(selector.jobId?j.id===selector.jobId:selector.sourceCommandId?j.facts.commandId===selector.sourceCommandId:j.facts.eventId===selector.eventId));
   if(!exists&&!rows){missing=true;return null;}
   selected=await service.selectReaction(actor,roomId,{...selector,preparing:prepareOnly});
   if(selected?.status==='generating')throw new CommentaryError('Reaction already preparing.',409);
   return selected?.id;
  };
  const afterReady=()=>{if(selector.signal?.aborted)throw new CommentaryError('Reaction cancelled.',409);return prepareOnly?{prepared:true,jobId:selected.id}:service.bindReaction(actor,roomId,selector);};
  let result=await service.prepareTrusted(null,{beforeClaim,afterReady});
  if(missing){
   rows=await resource('clubhouse_commentary_outbox?scope_id=eq.'+scopeId+'&room_id=eq.'+roomId+'&processed_at=is.null&select=idempotency_key,payload&order=created_at.asc&limit=10');
   result=await service.prepareTrusted(null,{beforeClaim,afterReady});
   // Durable enqueue/claim has committed. Acknowledgements are bookkeeping, off the audio path.
   const snapshot=persistence.snapshot();waitUntil(Promise.all(rows.map(row=>{const id=snapshot.moments.get(row.idempotency_key);return rpc('clubhouse_commentary_ack_outbox',{p_scope:scopeId,p_idempotency_key:row.idempotency_key,p_status:id?'enqueued':'invalidated',p_job_id:id||null});})).catch(()=>{}));
  }
  return result;
 }
 return {persistence,service,processRoom,ingestRoom,reaction};
}
return async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-commentary-claim, x-commentary-epoch, x-commentary-device, x-commentary-direct, x-commentary-event, x-commentary-job, x-commentary-profile','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}});
 try{
  const actor=await authenticate(request);if(!actor)return new Response(JSON.stringify({error:'Sign in to use commentary.'}),{status:401,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  const runtime=createRuntime();
  const direct=new URL(request.url).pathname.match(/\/commentary\/([0-9a-f-]{36})\/reaction\/([0-9a-f-]{36})$/i);
  if(request.method==='GET'&&direct){
   if(new URL(request.url).search)return new Response(null,{status:400});
   const roomId=direct[1],selector={gameId:direct[2],device:request.headers.get('X-Commentary-Device'),eventId:request.headers.get('X-Commentary-Event'),sourceCommandId:request.headers.get('X-Commentary-Command'),jobId:request.headers.get('X-Commentary-Job'),profileVersion:Number(request.headers.get('X-Commentary-Profile'))};
   if(request.signal.aborted)return new Response(null,{status:499});
   const result=await runtime.reaction(actor,roomId,{...selector,signal:request.signal});
   if(!result)return new Response(null,{status:204});
   const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(result.binding))));
   return new Response(result.body.openStream(),{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Commentary-Binding':encoded}});
  }
  let body=null;if(request.method==='POST'){const raw=await request.clone().text();if(raw.length<=4096){try{body=JSON.parse(raw);}catch{}}}
  onOperation(body?.operation);
  if(body?.operation==='reaction-prepare'){
   const fields=['operation','roomId','gameId','eventId','jobId','sourceCommandId','profileVersion','device'];
   if(Object.keys(body).some(k=>!fields.includes(k)))return new Response(JSON.stringify({error:'Invalid reaction selector.'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
   try{const prepared=await runtime.reaction(actor,body.roomId,{...body,signal:request.signal},{prepareOnly:true});return new Response(JSON.stringify({result:prepared||{prepared:false}}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});}catch(error){return new Response(JSON.stringify({error:'Reaction preparation unavailable.'}),{status:error instanceof CommentaryError?error.status:503,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});}
  }
  const operate=async()=>{await runtime.persistence.initialize();
  if(body?.operation==='local-start'&&(!enabled||!Number.isFinite(allowance.expiresAt)||allowance.expiresAt<=Date.now()))throw Error('Live commentary is not configured.');
  if(body?.operation==='profile-update'&&body.changes?.enabled===true){
   await runtime.service.authorized(actor,body.roomId,true);
   if(!enabled||!Number.isFinite(allowance.expiresAt)||allowance.expiresAt<=Date.now())throw Error('Live test configuration is not enabled.');
   // Allowance provisioning follows successful profile CAS; rejected requests cannot grant usage.
  }
  const handler=composeCommentaryEndpoint({service:runtime.service,authenticate:async()=>actor,refresh:()=>runtime.persistence.refresh()});
  const response=await handler(request.clone());
  if(response.ok&&body?.roomId&&['jobs-read','profile-update','local-start','local-command'].includes(body.operation))await runtime.service.authorized(actor,body.roomId);
  return response;};
  let response=await runtime.persistence.batch(operate);if(typeof response==='function')response=response();
  if(response.ok&&(body?.operation==='local-start'||body?.operation==='profile-update'&&body.changes?.enabled===true)){await rpc('clubhouse_commentary_set_limit',{p_scope:scopeId,p_room:body.roomId,p_max_requests:400,p_max_characters:4000000,p_expires_at:new Date(allowance.expiresAt).toISOString()});}
  if(response.ok&&request.headers.get('X-Commentary-Direct')!=='1'&&body?.roomId&&['jobs-read','profile-update','local-start','local-command'].includes(body.operation)){
   waitUntil(runtime.processRoom(body.roomId).catch(()=>{}));
  }
  return response;
 }catch(error){return new Response(JSON.stringify({error:'Commentary unavailable. Scores can continue.'}),{status:request.method==='GET'&&error instanceof CommentaryError?error.status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});}
};
}

// Request-scoped diagnostics wrap the existing endpoint without changing its guards.
export function createLiveCommentaryEndpoint(options={}){
 // A private warm-isolate snapshot is only a transfer hint. Every request still
 // authenticates and checks its version against the database before any use.
 const snapshotCache={current:null};
 return async request=>{
  const trace=createRequestTrace({fetchImpl:options.fetchImpl||fetch,emit:options.onTelemetry||((value)=>console.info('[Commentary request]',JSON.stringify(value))),region:typeof options.env?.get==='function'?options.env.get('SB_REGION'):options.env?.SB_REGION});
  let operation=request.method==='GET'?(new URL(request.url).pathname.includes('/reaction/')?'reaction':'audio'):'unknown';
  const knownOperations=new Set(['reaction-prepare','profile-read','profile-update','jobs-read','playback-start','playback-acquire','playback-claim','playback-event','playback-heartbeat','feedback','forget','local-start','local-read','local-command','player-profile-read','player-profile-update','player-profile-delete']);
  const endpoint=createEndpoint({...options,fetchImpl:trace.fetch,snapshotCache,onOperation:value=>{if(knownOperations.has(value))operation=value;},waitUntil:promise=>(options.waitUntil||((task)=>task.catch(()=>{})))(promise.finally(()=>trace.report('background-complete',operation,200)))});
  const response=await endpoint(request);if(request.method==='OPTIONS')return response;
  trace.report('response',operation,response.status);
  const headers=new Headers(response.headers);headers.set('Server-Timing',trace.serverTiming());
  if(!['audio','reaction'].includes(operation)||!response.ok||!response.body)return new Response(response.body,{status:response.status,headers});
  const reader=response.body.getReader();let first=true;
  return new Response(new ReadableStream({async pull(controller){try{const next=await reader.read();if(next.done){trace.report('stream-complete',operation,response.status);controller.close();return;}if(first){first=false;trace.report('stream-first-byte',operation,response.status);}controller.enqueue(next.value);}catch(error){trace.report('stream-failed',operation,response.status);controller.error(error);}},async cancel(reason){await reader.cancel(reason);trace.report('stream-cancelled',operation,response.status);}}),{status:response.status,headers});
 };
}
