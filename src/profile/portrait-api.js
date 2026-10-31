import{auth,configured}from'../multiplayer/client.js';
const base=import.meta.env.VITE_SUPABASE_URL||'',publicKey=import.meta.env.VITE_SUPABASE_ANON_KEY||'';
export async function portraitSession(){if(!configured||!auth)return null;const result=await auth.getSession();if(result.error)throw Error('Could not check your account. Try again.');return result.data?.session||null;}
export async function requestPortrait(payload,{timeoutMs=105000,expectedOwner}={}){
 const session=await portraitSession();if(!session)throw Error('Sign in through Online tables to save portraits across phones.');
 if(expectedOwner&&session.user.id!==expectedOwner)throw Error('Your account changed. Reopen Your avatar for the current account.');
 let response;try{response=await fetch(base+'/functions/v1/portraits',{method:'POST',headers:{'Content-Type':'application/json',apikey:publicKey,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeoutMs)});}catch{throw Error('Connection interrupted. Reopen Your avatar to check this draft before generating another.');}
 let data;try{data=await response.json();}catch{throw Error('Portrait service returned an unreadable response. Reopen to check your draft.');}
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Could not update your portrait.');
 const current=await portraitSession();if(current?.user?.id!==session.user.id)throw Error('Your account changed. Reopen Your avatar for the current account.');
 if(!data||typeof data!=='object')throw Error('Invalid portrait response.');
 for(const p of [data.profile,data.job,...(data.profiles||[])].filter(Boolean))if(p.url&&!safePortraitUrl(p.url))throw Error('Invalid portrait image location.');
 if(data.animation?.url&&!safeAvatarAnimationUrl(data.animation.url))throw Error('Invalid avatar animation location.');
 return data;
}
export function safePortraitUrl(value){try{const u=new URL(value),expected=new URL(base);return u.protocol==='https:'&&u.origin===expected.origin&&u.pathname.startsWith('/storage/v1/object/sign/clubhouse-portraits/');}catch{return false;}}
export function safeAvatarAnimationUrl(value){try{const u=new URL(value),expected=new URL(base);return u.protocol==='https:'&&u.origin===expected.origin&&u.pathname.startsWith('/storage/v1/object/sign/clubhouse-avatar-animations/')&&u.pathname.endsWith('.mp4');}catch{return false;}}
