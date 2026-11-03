import{PortraitError}from'../../src/profile/portrait-contract.js';
import{createSupabaseRoomAdapter}from'../rooms/supabase-adapter.js';
import{createAvatarAnimationAdapter}from'./animations.js';
export function createPortraitAdapter({url,key,fetchImplementation=fetch,requestTimeoutMs=15000}){
 const deadline=signal=>signal?AbortSignal.any([signal,AbortSignal.timeout(requestTimeoutMs)]):AbortSignal.timeout(requestTimeoutMs);
 const authorization={apikey:key,Authorization:`Bearer ${key}`};
 async function call(action,actor,payload,{signal}={}){
  const response=await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_portraits`,{method:'POST',headers:{...authorization,'Content-Type':'application/json'},signal:deadline(signal),body:JSON.stringify({p_action:action,p_actor:actor,p_payload:payload})});
  const data=await response.json();if(!response.ok){if(data.code==='40001')throw new PortraitError('Your avatar changed on another phone. Refresh before confirming.',409);if(data.code==='42501')throw new PortraitError('This portrait is not available to this account.',403);if(String(data.message).includes('budget'))throw new PortraitError('The portrait test budget has been reached. Your saved avatar is unchanged.',429);if(String(data.message).includes('rate limit'))throw new PortraitError('Too many portrait attempts. Try again later.',429);throw new PortraitError('Portrait storage could not be checked. Reopen Your avatar before retrying.',503);}return data;
 }
 const path=p=>{if(typeof p!=='string'||! /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(original|portrait)$/i.test(p))throw new PortraitError('Invalid image path.');return p;};
 async function storage(route,options){let response;try{response=await fetchImplementation(url+'/storage/v1/'+route,{...options,headers:{...authorization,...options.headers},signal:deadline(options.signal)});}catch{throw new PortraitError('Portrait storage could not connect.',503);}if(!response.ok)throw new PortraitError('Portrait storage could not finish. Try again.',503);return response;}
 const images={
  async put(p,bytes,mime){await storage('object/clubhouse-portraits/'+path(p),{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false'},body:bytes});},
  async sign(p){const response=await storage('object/sign/clubhouse-portraits/'+path(p),{method:'POST',signal:AbortSignal.timeout(Math.min(requestTimeoutMs,4000)),headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:900})});const data=await response.json();if(typeof data.signedURL!=='string'||!data.signedURL.startsWith('/object/sign/clubhouse-portraits/'))throw new PortraitError('Invalid portrait response.',503);return url+'/storage/v1'+data.signedURL;},
  async remove(paths,{signal}={}){if(!paths.length)return;await storage('object/clubhouse-portraits',{method:'DELETE',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[...new Set(paths.map(path))]})});}
 };
 async function maintenanceActors(){const response=await fetchImplementation(`${url}/rest/v1/rpc/clubhouse_portrait_cleanup_owners`,{method:'POST',headers:{...authorization,'Content-Type':'application/json'},body:'{}',signal:deadline()});if(!response.ok)throw new PortraitError('Cleanup list unavailable.',503);return response.json();}
 return{store:{call,maintenanceActors},images,clips:createAvatarAnimationAdapter({url,key,fetchImplementation}),authenticate:createSupabaseRoomAdapter({url,key,fetchImplementation}).authenticate};
}
