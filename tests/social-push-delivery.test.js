import{it,expect,vi}from'vitest';
import{generateKeyPairSync,verify}from'node:crypto';
import{apnsRequest,deliverApns,deliverFcm,dispatchSocialBatch}from'../server/social/push-delivery.mjs';
const job={id:'job',platform:'ios',token:'fixture-token',title:'Ready?',body:'A player is ready.',expiresAt:'2099-01-01T00:00:00Z',data:{code:'ABCDEFGH',eventId:'fixture-event',kind:'play'}};
const{privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),config={teamId:'team',keyId:'key',bundleId:'com.example.fixture',privateKey,sandbox:true};
it('signs APNs tokens correctly and keeps navigation independent from game commands',()=>{
 const r=apnsRequest(job,config,1000000),jwt=r.headers.authorization.slice(7),[h,p,s]=jwt.split('.');
 expect(verify('SHA256',Buffer.from(h+'.'+p),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(s,'base64url'))).toBe(true);
 expect(r.origin).toContain('sandbox');expect(r.headers['apns-topic']).toBe(config.bundleId);
 expect(r.headers['apns-collapse-id']).toBe('fixture-event:play');
 expect(JSON.parse(r.body)).toMatchObject({code:'ABCDEFGH',kind:'play',aps:{alert:{title:'Ready?'}}});
 expect(JSON.parse(r.body).action).toBeUndefined();
});
it('distinguishes provider acceptance, retryable failure and invalid device tokens',async()=>{
 expect(await deliverApns(job,config,{send:async()=>({status:200,json:{}})})).toEqual({outcome:'sent',invalid:false});
 expect(await deliverApns(job,config,{send:async()=>({status:429,json:{}})})).toEqual({outcome:'retry',invalid:false});
 expect(await deliverApns(job,config,{send:async()=>({status:410,json:{reason:'Unregistered'}})})).toEqual({outcome:'failed',invalid:true});
 const fetchImpl=vi.fn(async()=>({ok:false,status:404,json:async()=>({error:{details:[{errorCode:'UNREGISTERED'}]}})}));
 expect(await deliverFcm({...job,platform:'android'},{project_id:'fixture'},{fetchImpl,accessToken:'fixture-access-token'})).toEqual({outcome:'failed',invalid:true});
 const body=JSON.parse(fetchImpl.mock.calls[0][1].body);expect(body.message.android.notification.channel_id).toBe('tournament-play');expect(body.message.data.kind).toBe('play');
});
it('fences queue acknowledgments and retries transport failures without claiming user readiness',async()=>{
 const rpc=vi.fn(async(name,body)=>name==='clubhouse_claim_social_push'?[job,{...job,id:'job2'}]:body.p_id==='job'),deliver=vi.fn(async value=>{if(value.id==='job2')throw Error('network');return{outcome:'sent',invalid:false};});
 expect(await dispatchSocialBatch({rpc,deliver,leaseId:'lease'})).toEqual({claimed:2,sent:1,retry:0,failed:0,unacknowledged:1});
 expect(rpc).toHaveBeenCalledWith('clubhouse_finish_social_push',{p_id:'job2',p_lease:'lease',p_outcome:'retry',p_invalid:false});
 expect(rpc.mock.calls.some(([name])=>name==='clubhouse_social')).toBe(false);
});
