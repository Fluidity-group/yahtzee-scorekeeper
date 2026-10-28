import{parseEnv}from'node:util';
const required=['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','VITE_GAME_WEB_URL'];
export function validateIosTestConfig(text){
 const values=parseEnv(text),allowed=new Set([...required,'VITE_EMAIL_OTP_ENABLED','VITE_PUBLIC_BASE','VITE_COMMENTARY_URL','VITE_PUSH_ENABLED']);
 for(const key of Object.keys(values))if(!allowed.has(key))throw Error('The iOS config must contain public app fields only; unexpected field '+key);
 for(const key of required)if(!values[key]?.trim())throw Error('Missing public configuration field '+key);
 for(const key of['VITE_SUPABASE_URL','VITE_GAME_WEB_URL'])if(new URL(values[key]).protocol!=='https:')throw Error(key+' must use HTTPS.');
 const key=values.VITE_SUPABASE_ANON_KEY;
 if(!key.startsWith('sb_publishable_')){let payload;try{payload=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url'));}catch{throw Error('Expected a public Supabase anon or publishable key.');}if(payload.role!=='anon')throw Error('Only a public anon key is allowed in the iOS build.');}
 return{...Object.fromEntries([...allowed].filter(k=>values[k]!==undefined).map(k=>[k,values[k]])),VITE_PUBLIC_BASE:'/',VITE_COMMENTARY_URL:'',VITE_PUSH_ENABLED:'false'};
}
