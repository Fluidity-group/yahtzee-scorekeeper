// Server-side one-shot worker. A supervised scheduler is a separate deployment step.
import{readFileSync}from'node:fs';
import{parseEnv}from'node:util';
import{randomUUID,createPrivateKey}from'node:crypto';
import{dispatchSocialBatch,deliverApns,deliverFcm,googleAccessToken}from'../server/social/push-delivery.mjs';
const watch=process.argv.includes('--watch');
if(!process.argv.includes('--once')&&!watch)throw Error('Use --once or --watch with an explicitly configured server environment. No worker was started.');
const path=process.env.SOCIAL_PUSH_ENV_FILE||'.env.social-push.local';
const env={...parseEnv(readFileSync(path,'utf8')),...process.env};
const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','APNS_TEAM_ID','APNS_KEY_ID','APNS_PRIVATE_KEY_FILE','APNS_BUNDLE_ID','FCM_SERVICE_ACCOUNT_FILE'];
if(required.some(k=>!env[k]))throw Error('Phone delivery needs complete APNs/FCM/server configuration. No messages were claimed.');
const origin=new URL(env.SUPABASE_URL);if(origin.protocol!=='https:')throw Error('Server URL must use HTTPS.');
const apns={teamId:env.APNS_TEAM_ID,keyId:env.APNS_KEY_ID,privateKey:readFileSync(env.APNS_PRIVATE_KEY_FILE,'utf8'),bundleId:env.APNS_BUNDLE_ID,sandbox:env.APNS_ENVIRONMENT!=='production'};
const fcm=JSON.parse(readFileSync(env.FCM_SERVICE_ACCOUNT_FILE,'utf8'));
const parsedKey=createPrivateKey(apns.privateKey);if(parsedKey.asymmetricKeyType!=='ec'||parsedKey.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('APNs needs a P-256 private key. No messages claimed.');
// Fail before claiming if provider credentials cannot be parsed/authenticated.
let fcmToken=await googleAccessToken(fcm),tokenAt=Date.now();
const rpc=async(name,body)=>{const response=await fetch(origin.href.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',signal:AbortSignal.timeout(12000),headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error('Notification queue unavailable');return response.json();};
do{
 try{
  if(Date.now()-tokenAt>50*60*1000){fcmToken=await googleAccessToken(fcm);tokenAt=Date.now();}
  const result=await dispatchSocialBatch({rpc,leaseId:randomUUID(),deliver:job=>job.platform==='ios'?deliverApns(job,apns):deliverFcm(job,fcm,{accessToken:fcmToken})});
  if(result.claimed||!watch)console.log(JSON.stringify(result)); // Provider acceptance counts, never proof of opening/readiness.
 }catch{console.error('Notification delivery unavailable; pending requests remain in the app.');if(!watch)process.exitCode=1;}
 if(watch)await new Promise(resolve=>setTimeout(resolve,5000));
}while(watch);
