export const COMMENTARY_COLLECTIONS=Object.freeze(['settings','jobs','moments','leases','attempts','budgets','exposure','memoryRecords','feedback','playerProfiles','playerProfileVersions','preferenceSharing','memorySummaries','memoryCaches','localSessions']);
export function emptyDurableCommentaryState(){return Object.fromEntries(COMMENTARY_COLLECTIONS.map(key=>[key,new Map()]));}
export function encodeCommentaryState(state){
 if(!state||Object.keys(state).some(key=>!COMMENTARY_COLLECTIONS.includes(key)))throw Error('Unknown durable commentary collection.');
 const output=Object.create(null);
 for(const key of COMMENTARY_COLLECTIONS){if(!(state[key] instanceof Map))throw Error('Explicit Map collection required.');output[key]=Object.create(null);for(const [id,value]of state[key]){if(typeof id!=='string'||!id||id.length>1024||['__proto__','constructor','prototype'].includes(id))throw Error('Safe bounded durable key required.');output[key][id]=value;}}
 const serialized=JSON.stringify(output,(_key,value)=>{if(typeof value==='function'||typeof value==='bigint'||(typeof value==='number'&&!Number.isFinite(value)))throw Error('Only finite JSON commentary values are durable.');return value;});
 if(new TextEncoder().encode(serialized).byteLength>32*1024*1024)throw Error('Durable commentary snapshot limit exceeded.');
 return JSON.parse(serialized);
}
export function decodeCommentaryState(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).some(key=>!COMMENTARY_COLLECTIONS.includes(key)))throw Error('Invalid durable commentary state.');
 const state=emptyDurableCommentaryState();for(const key of COMMENTARY_COLLECTIONS){const value=payload[key]??{};if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid durable commentary collection.');state[key]=new Map(Object.entries(value));}
 encodeCommentaryState(state);return state;
}
const validVersion=value=>Number.isSafeInteger(value)&&value>=0;
/** Async initialize/refresh boundary is mandatory before shared service snapshot() reads.
 * Synchronous callbacks may rerun after CAS conflicts. NEVER call providers in callbacks. */
export class DurableCommentaryStore {
 constructor({rpc,scopeId,maxRetries=5}={}){if(typeof rpc!=='function'||typeof scopeId!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(scopeId)||!Number.isSafeInteger(maxRetries)||maxRetries<1||maxRetries>10)throw Error('Durable transport, scope UUID and bounded retries required.');this.rpc=rpc;this.scopeId=scopeId;this.maxRetries=maxRetries;this.state=null;this.version=null;this.databaseNowMs=null;this.tail=Promise.resolve();}
 async load(){const row=await this.rpc('clubhouse_commentary_load',{p_scope:this.scopeId});if(!row||!validVersion(row.version)||!Number.isFinite(row.databaseNowMs))throw Error('Invalid durable commentary snapshot.');return {state:decodeCommentaryState(row.state),version:row.version,databaseNowMs:row.databaseNowMs};}
 install(row){this.state=row.state;this.version=row.version;this.databaseNowMs=row.databaseNowMs;}
 serialized(fn){const result=this.tail.then(fn);this.tail=result.catch(()=>{});return result;}
 async initialize(){await this.refresh();return this;}
 refresh(){return this.serialized(async()=>{const row=await this.load();this.install(row);return this.snapshot();});}
 read(collection,key){if(!this.state||!COMMENTARY_COLLECTIONS.includes(collection))throw Error('Initialized supported collection required.');return structuredClone(this.state[collection].get(key));}
 snapshot(){if(!this.state)throw Error('Await durable store initialization/refresh before snapshot.');return structuredClone(this.state);}
 transaction(fn){if(typeof fn!=='function')return Promise.reject(Error('Synchronous transaction callback required.'));return this.serialized(async()=>{
  for(let attempt=0;attempt<this.maxRetries;attempt++){
   const fresh=await this.load();this.install(fresh);const next=structuredClone(fresh.state),result=fn(next,{databaseNowMs:fresh.databaseNowMs,version:fresh.version});
   if(result&&typeof result.then==='function')throw Error('Transaction callback must be synchronous; no provider work in transaction.');
   const payload=encodeCommentaryState(next),committed=await this.rpc('clubhouse_commentary_commit',{p_scope:this.scopeId,p_expected_version:fresh.version,p_state:payload});
   if(committed?.committed===true){if(committed.version!==fresh.version+1||!Number.isFinite(committed.databaseNowMs))throw Error('Invalid durable commit version.');this.install({state:next,version:committed.version,databaseNowMs:committed.databaseNowMs});return structuredClone(result);}
   if(committed?.committed!==false)throw Error('Invalid durable commit result.');
  }
  throw Error('Durable commentary contention limit reached; provider not dispatched.');
 });}
 expire(){return this.serialized(async()=>{const result=await this.rpc('clubhouse_commentary_expire',{p_scope:this.scopeId});this.install(await this.load());return result;});}
 forget(accountId){if(typeof accountId!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(accountId))return Promise.reject(Error('Authenticated account UUID required.'));return this.serialized(async()=>{const result=await this.rpc('clubhouse_commentary_forget',{p_scope:this.scopeId,p_account:accountId});this.install(await this.load());return result;});}
}
// Backend-only transport. Caller supplies the service credential; no key loading at import.
export function createSupabaseCommentaryRpc({url,getServiceKey,fetchImplementation=fetch,timeoutMs=5000}={}){
 const base=new URL(url);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||typeof getServiceKey!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>15000)throw Error('Explicit secure backend RPC configuration required.');
 const routes=new Set(['clubhouse_commentary_load','clubhouse_commentary_commit','clubhouse_commentary_expire','clubhouse_commentary_forget']);
 return async(operation,body)=>{if(!routes.has(operation))throw Error('Unsupported commentary durability operation.');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const key=await getServiceKey();if(typeof key!=='string'||!key||/[\r\n]/.test(key))throw Error();const response=await fetchImplementation(`${base.href.replace(/\/$/,'')}/rest/v1/rpc/${operation}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});if(!response.ok)throw Error();return await response.json();}catch{throw Error('Commentary durability request failed.');}finally{clearTimeout(timer);}
 };
}
