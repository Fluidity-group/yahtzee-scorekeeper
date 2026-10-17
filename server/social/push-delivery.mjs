import{createSign}from'node:crypto';
import{connect}from'node:http2';
const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
export function signedJwt(header,payload,key){const input=encoded(header)+'.'+encoded(payload),signer=createSign(header.alg==='ES256'?'SHA256':'RSA-SHA256');signer.update(input);signer.end();return input+'.'+signer.sign({key,...(header.alg==='ES256'?{dsaEncoding:'ieee-p1363'}:{})}).toString('base64url');}
export function apnsRequest(job,{teamId,keyId,privateKey,bundleId,sandbox=true},now=Date.now()){
 if(!teamId||!keyId||!privateKey||!bundleId)throw Error('APNs configuration missing');
 const issued=Math.floor(now/1000),token=signedJwt({alg:'ES256',kid:keyId},{iss:teamId,iat:issued},privateKey);
 return{origin:sandbox?'https://api.sandbox.push.apple.com':'https://api.push.apple.com',headers:{':method':'POST',':path':'/3/device/'+encodeURIComponent(job.token),authorization:'bearer '+token,'apns-topic':bundleId,'apns-push-type':'alert','apns-priority':'10','apns-collapse-id':job.data.eventId+':'+job.data.kind,'apns-expiration':String(Math.floor(Date.parse(job.expiresAt)/1000))},body:JSON.stringify({aps:{alert:{title:job.title,body:job.body},sound:'default'},...job.data})};
}
async function sendHttp2(request){
 return new Promise((resolve,reject)=>{
  const client=connect(request.origin);let stream,status,body='';const timer=setTimeout(()=>{stream?.close();client.destroy();reject(Error('APNs timeout'));},12000);
  const fail=()=>{clearTimeout(timer);client.destroy();reject(Error('APNs transport failed'));};client.once('error',fail);
  stream=client.request({...request.headers,'content-type':'application/json'});stream.setEncoding('utf8');stream.on('response',headers=>{status=Number(headers[':status']);});stream.on('data',chunk=>{if(body.length<8192)body+=chunk;});stream.once('error',fail);stream.once('end',()=>{clearTimeout(timer);client.close();let json={};try{json=JSON.parse(body);}catch{}resolve({status,json});});stream.end(request.body);
 });
}
export async function deliverApns(job,config,{send=sendHttp2,now=Date.now()}={}){
 const {status,json}=await send(apnsRequest(job,config,now));
 return{outcome:status===200?'sent':status===429||status>=500?'retry':'failed',invalid:status===410||['BadDeviceToken','DeviceTokenNotForTopic','Unregistered'].includes(json?.reason)};
}
export function fcmMessage(job){return{message:{token:job.token,notification:{title:job.title,body:job.body},data:Object.fromEntries(Object.entries(job.data).map(([k,v])=>[k,String(v)])),android:{priority:'high',ttl:Math.max(0,Math.floor((Date.parse(job.expiresAt)-Date.now())/1000))+'s',notification:{channel_id:'tournament-play',icon:'ic_stat_dice',tag:job.data.eventId+':'+job.data.kind}}}};}
export async function googleAccessToken(account,{fetchImpl=fetch,now=Date.now()}={}){
 if(!account?.client_email||!account.private_key||!account.project_id)throw Error('FCM service account configuration missing');
 const issued=Math.floor(now/1000),assertion=signedJwt({alg:'RS256',typ:'JWT'},{iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:issued,exp:issued+3600},account.private_key);
 const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 if(!response.ok)throw Error('FCM authentication failed');const value=await response.json();if(typeof value.access_token!=='string')throw Error('FCM authentication failed');return value.access_token;
}
export async function deliverFcm(job,account,{fetchImpl=fetch,accessToken}={}){
 const token=accessToken||await googleAccessToken(account,{fetchImpl});
 const response=await fetchImpl('https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(account.project_id)+'/messages:send',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(fcmMessage(job))});
 let error={};if(!response.ok)try{error=(await response.json()).error||{};}catch{}
 const invalid=error.details?.some(d=>d.errorCode==='UNREGISTERED')===true;
 return{outcome:response.ok?'sent':response.status===429||response.status>=500?'retry':'failed',invalid};
}
export async function dispatchSocialBatch({rpc,deliver,leaseId}){
 const jobs=await rpc('clubhouse_claim_social_push',{p_lease:leaseId,p_limit:10}),result={claimed:jobs.length,sent:0,retry:0,failed:0,unacknowledged:0};
 await Promise.all(jobs.map(async job=>{let outcome;try{outcome=await deliver(job);}catch{outcome={outcome:'retry',invalid:false};}
  const accepted=await rpc('clubhouse_finish_social_push',{p_id:job.id,p_lease:leaseId,p_outcome:outcome.outcome,p_invalid:outcome.invalid===true});
  if(accepted)result[outcome.outcome]++;else result.unacknowledged++;
 }));
 return result;
}
