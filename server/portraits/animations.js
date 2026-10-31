import{AVATAR_REACTIONS}from'../../src/profile/avatar-reactions.js';
import{PortraitError,UUID}from'../../src/profile/portrait-contract.js';
export function createAvatarAnimationAdapter({url,key,fetchImplementation=fetch}){
 const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 async function rpc(name,body){const r=await fetchImplementation(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(body)});if(!r.ok){if(r.status===403)throw new PortraitError('This animation is not available at your table.',403);throw new PortraitError('Avatar animation is temporarily unavailable.',503);}return r.json();}
 const path=p=>{if(typeof p!=='string'||! /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[a-z-]+\.mp4$/i.test(p))throw new PortraitError('Invalid avatar animation path.');return p;};
 return{
  async read(actor,{ownerId,avatarId,kind,code}){
   if(!UUID.test(ownerId||'')||!UUID.test(avatarId||'')||!AVATAR_REACTIONS.includes(kind)||code!==undefined&&!/^[A-Z2-9]{8}$/.test(code))throw new PortraitError('Invalid avatar animation request.');
   const data=await rpc('clubhouse_avatar_animation',{p_actor:actor,p_owner:ownerId,p_avatar:avatarId,p_kind:kind,p_code:code||null});if(!data)return null;
   if(data.path!==ownerId+'/'+avatarId+'/'+kind+'.mp4')throw new PortraitError('Avatar animation identity changed.',409);
   const r=await fetchImplementation(url+'/storage/v1/object/sign/clubhouse-avatar-animations/'+path(data.path),{method:'POST',headers,body:JSON.stringify({expiresIn:900})});if(!r.ok)throw new PortraitError('Avatar animation could not connect.',503);const signed=await r.json();if(typeof signed.signedURL!=='string'||!signed.signedURL.startsWith('/object/sign/clubhouse-avatar-animations/'))throw new PortraitError('Invalid avatar animation location.',503);
   return{kind,avatarId,url:url+'/storage/v1'+signed.signedURL};
  },
  async cleanup(){const paths=await rpc('clubhouse_avatar_animation_cleanup',{});if(!paths.length)return;const r=await fetchImplementation(url+'/storage/v1/object/clubhouse-avatar-animations',{method:'DELETE',headers,body:JSON.stringify({prefixes:paths.map(path)})});if(!r.ok)throw Error('Animation cleanup remains queued');await rpc('clubhouse_avatar_animation_cleanup',{p_deleted:paths});}
 };
}
