import{auth,configured}from'../multiplayer/client.js';
import{portraitSession,requestPortrait}from'./portrait-api.js';
import{setAccountAvatar,setPeerAvatars}from'./avatar-view.js';
let ticket=0,lastOwner=null;
export async function refreshAccountAvatar(){const token=++ticket;if(!configured||!auth)return;try{const session=await portraitSession();if(token!==ticket)return;if(!session){lastOwner=null;setAccountAvatar(null);return;}if(lastOwner!==session.user.id){setAccountAvatar(null);lastOwner=session.user.id;}const {profile}=await requestPortrait({operation:'profile'},{timeoutMs:15000,expectedOwner:session.user.id});if(token===ticket&&profile.ownerId===session.user.id)setAccountAvatar(profile);}catch{/* Existing avatar/preset remains usable during a connection failure. */}}
export async function refreshTableAvatars(code){try{const data=await requestPortrait({operation:'peers',code},{timeoutMs:15000});setPeerAvatars(data.profiles);return true;}catch{return false;}}
export function watchAccountAvatars(onChange=()=>{}){
 if(!configured||!auth)return()=>{};
 const refresh=()=>{if(!document.hidden)void refreshAccountAvatar();};
 const changed=()=>onChange();globalThis.addEventListener('clubhouse-avatar-changed',changed);globalThis.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
 const subscription=auth.onAuthStateChange?.((_event,session)=>{const next=session?.user?.id||null;ticket++;if(next!==lastOwner){lastOwner=next;setAccountAvatar(null);globalThis.dispatchEvent(new CustomEvent('clubhouse-account-changed',{detail:{ownerId:next}}));}setTimeout(refresh,0);});
 const timer=setInterval(refresh,60000);refresh();
 return()=>{ticket++;clearInterval(timer);subscription?.data?.subscription?.unsubscribe();globalThis.removeEventListener('clubhouse-avatar-changed',changed);globalThis.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
}
