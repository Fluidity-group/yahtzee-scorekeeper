import{avatarProfile}from'./avatar-view.js';
import{portraitSession,requestPortrait}from'./portrait-api.js';
const cache=new Map();
globalThis.addEventListener?.('clubhouse-account-changed',()=>cache.clear());
export async function avatarAnimation(accountId,kind,code){
 const profile=avatarProfile(accountId);if(!profile?.avatarId||profile.kind!=='generated'||!kind)return null;
 const session=await portraitSession();if(!session)return null;
 const key=[session.user.id,accountId,profile.avatarId,kind,code||''].join(':'),cached=cache.get(key);
 let promise=cached?.until>Date.now()?cached.promise:null;
 if(!promise){promise=requestPortrait({operation:'animation',ownerId:accountId,avatarId:profile.avatarId,kind,...(code?{code}:{})},{expectedOwner:session.user.id,timeoutMs:10000}).then(data=>data.animation?.avatarId===profile.avatarId&&data.animation?.kind===kind?data.animation:null).catch(()=>null);if(cache.size>100)cache.clear();cache.set(key,{promise,until:Date.now()+12*60*1000});}
 const result=await promise;if(avatarProfile(accountId)?.avatarId!==profile.avatarId)return null;
 const current=await portraitSession();return current?.user?.id===session.user.id?result:null;
}
