import {buildCommentaryPrompt,COMMENTARY_OUTPUT_SCHEMA,validateWriterResult,writerCandidateDiagnostics} from './writer-prompt.js';
const ENDPOINT='https://api.anthropic.com/v1';
export class AnthropicWriterError extends Error {constructor(code,status=null){super('Commentary writer unavailable: '+code);this.code=code;this.status=status;}}
const fail=(code,status)=>{throw new AnthropicWriterError(code,status);};
export function parseAnthropicCredential(text){
 const matches=String(text).match(/(?<![A-Za-z0-9_-])sk-ant-[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-])/g)||[];
 const unique=[...new Set(matches)];if(unique.length!==1)fail('credential-ambiguous');return unique[0];
}
function headers(key,workspaceId){
 if(typeof key!=='string'||!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key))fail('credential-unavailable');
 if(workspaceId!==undefined&&(!/^wrkspc_[A-Za-z0-9]{8,100}$/.test(workspaceId)))fail('workspace-invalid');
 return {'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json',...(workspaceId?{'anthropic-workspace-id':workspaceId}:{})};
}
async function boundedJson(response,maxBytes,signal){
 if(!response.ok)fail('provider-http',response.status);if(!response.body)fail('provider-empty');
 const reader=response.body.getReader(),chunks=[];let size=0;
 while(true){
  const {done,value}=await new Promise((resolve,reject)=>{const abort=()=>reject(new AnthropicWriterError('deadline'));if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});reader.read().then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});if(done)break;
  size+=value.byteLength;if(size>maxBytes){await reader.cancel();fail('response-cap');}chunks.push(value);
 }
 try{return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks.map(c=>Buffer.from(c)))));}catch{fail('provider-json');}
}
export async function listAnthropicModels({key,workspaceId,fetchImpl=fetch,deadlineMs=15000}={}){
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>60000)fail('limits-invalid');const signal=AbortSignal.timeout(deadlineMs);
 try{const response=await fetchImpl(ENDPOINT+'/models?limit=100',{method:'GET',headers:headers(key,workspaceId),signal});const data=await boundedJson(response,262144,signal);
  if(!Array.isArray(data.data))fail('models-shape');return {models:data.data.map(model=>({id:model.id,displayName:model.display_name,lifecycle:model.lifecycle??null})),hasMore:data.has_more===true};
 }catch(error){if(error instanceof AnthropicWriterError)throw error;fail(signal.aborted?'deadline':'provider-unavailable');}
}
export function buildAnthropicWriterRequest(input,{model,maxOutputTokens}={}){
 if(typeof model!=='string'||!/^claude-[a-z0-9-]{1,80}$/.test(model)||!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>1024)fail('request-config-invalid');
 const prompt=buildCommentaryPrompt(input),body={model,max_tokens:maxOutputTokens,stream:false,system:prompt.system,messages:[{role:'user',content:prompt.user}],output_config:{format:{type:'json_schema',schema:COMMENTARY_OUTPUT_SCHEMA}}};
 if(model==='claude-sonnet-5-5'){body.thinking={type:'between_tools'};body.output_config.effort='high';}
 const payload=JSON.stringify(body);return {body,payload,packet:prompt.packet,submittedCharacters:[...payload].length,promptVersion:3};
}
// This adapter is separate from the in-memory rehearsal service. A durable budget gate
// and explicit paid allowance are mandatory for live invocation, never implied by a key.
export function createAnthropicWriter({model,workspaceId,getKey,fetchImpl=fetch,limits,allowPaid=false,budgetGate,now=()=>performance.now()}={}){
 if(typeof model!=='string'||!/^claude-[a-z0-9-]{1,80}$/.test(model))fail('model-invalid');
 for(const name of ['maxRequests','maxInputCharacters','maxOutputTokens','deadlineMs','maxResponseBytes'])if(!Number.isSafeInteger(limits?.[name])||limits[name]<1)fail('limits-invalid');
 if(limits.maxOutputTokens>1024||limits.deadlineMs>60000||limits.maxInputCharacters>50000||limits.maxResponseBytes>262144)fail('limits-too-large');
 let submitted=0;const seenRequestIds=new Set();
 async function write(input,{requestId}={}){
  if(!allowPaid)fail('paid-disabled');if(typeof budgetGate?.reserve!=='function'||typeof budgetGate?.finish!=='function')fail('durable-budget-required');if(typeof getKey!=='function')fail('credential-unavailable');
  if(typeof requestId!=='string'||!/^[A-Za-z0-9:_-]{8,200}$/.test(requestId))fail('request-id-invalid');
  let request;try{request=buildAnthropicWriterRequest(input,{model,maxOutputTokens:limits.maxOutputTokens});}catch{fail('input-invalid');}
  const {payload,packet}=request,characters=request.submittedCharacters;if(characters>limits.maxInputCharacters)fail('input-cap');
  if(seenRequestIds.has(requestId))fail('request-duplicate');if(submitted>=limits.maxRequests)fail('request-cap');submitted++;seenRequestIds.add(requestId); // synchronously fence concurrent calls before await
  const controller=new AbortController(),start=now();let timer,reservation,usage={inputTokens:null,outputTokens:null},providerRequestId=null,validationReason=null,candidateDiagnostics=null;
  try{
   const key=await getKey();const requestHeaders=headers(key,workspaceId);
   reservation=await budgetGate.reserve({requestId,provider:'anthropic',model,submittedCharacters:characters,maxOutputTokens:limits.maxOutputTokens});
   if(!reservation?.id||reservation.durable!==true||reservation.approved!==true)fail('durable-budget-required');
   const response=await Promise.race([fetchImpl(ENDPOINT+'/messages',{method:'POST',headers:requestHeaders,body:payload,signal:controller.signal}),new Promise((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new AnthropicWriterError('deadline'));},limits.deadlineMs);})]);
   const requestHeader=response.headers.get('request-id');if(/^req_[A-Za-z0-9]{8,100}$/.test(requestHeader||''))providerRequestId=requestHeader;
   const data=await boundedJson(response,limits.maxResponseBytes,controller.signal);
   usage={inputTokens:Number.isSafeInteger(data.usage?.input_tokens)?data.usage.input_tokens:null,outputTokens:Number.isSafeInteger(data.usage?.output_tokens)?data.usage.output_tokens:null};
   if(data.stop_reason!=='end_turn')fail('incomplete-output');
   if(!Array.isArray(data.content)||!data.content.length||data.content.length>16)fail('output-shape');
   const texts=[];for(const block of data.content){
    if(!block||typeof block!=='object')fail('output-shape');
    if(block.type==='text'){if(typeof block.text!=='string')fail('output-shape');texts.push(block.text);}
    else if(block.type==='thinking'){if(typeof block.thinking!=='string'||typeof block.signature!=='string')fail('output-shape');}
    else if(block.type==='redacted_thinking'){if(typeof block.data!=='string')fail('output-shape');}
    else fail('output-shape');
   }
   if(texts.length!==1)fail('output-shape');
   let parsed;try{parsed=JSON.parse(texts[0]);}catch{fail('output-json');}
   candidateDiagnostics=writerCandidateDiagnostics(parsed,packet);
   let result;try{result=validateWriterResult(parsed,packet);}catch(error){
    const reasons={'Invalid writer schema':'schema','Writer grounding mismatch':'grounding','Writer settings/tags mismatch':'settings-or-tags','Unknown event grounding':'event-reference','Unknown personal profile source':'profile-reference','Missing target blurb source':'missing-blurb','Invalid spoken line':'line-length','Incomplete or tagged writer utterance':'line-completeness','Spoken line exceeds word limit':'line-word-count','Clean profile incompatible':'clean-incompatible','Target profile required':'target-profile-required','Wrong named target':'wrong-named-target','Ambiguous target name':'ambiguous-target-name'};validationReason=reasons[error.message]||'validation';fail('output-invalid');
   }
   if(usage.outputTokens!==null&&(!Number.isSafeInteger(usage.outputTokens)||usage.outputTokens<0||usage.outputTokens>limits.maxOutputTokens))fail('usage-invalid');
   await budgetGate.finish(reservation.id,{status:'completed',...usage,providerRequestId,candidateDiagnostics,elapsedMs:now()-start});return {...result,model,usage,latencyMs:now()-start};
  }catch(error){
   if(reservation?.id){try{await budgetGate.finish(reservation.id,{status:controller.signal.aborted?'unknown':'failed',failureCode:error instanceof AnthropicWriterError?error.code:'provider-unavailable',failureStatus:error instanceof AnthropicWriterError?error.status:null,validationReason,...usage,providerRequestId,candidateDiagnostics,elapsedMs:now()-start});}catch{/* durable reconciliation remains required */}}
   if(error instanceof AnthropicWriterError)throw error;fail(controller.signal.aborted?'deadline':'provider-unavailable');
  }finally{clearTimeout(timer);}
 }
 return {write,get submittedRequests(){return submitted;},liveConfigured:allowPaid===true,model};
}

