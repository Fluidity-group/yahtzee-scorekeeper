// Disposable PostgreSQL; never reads or writes a hosted tournament.
import{execFileSync,spawnSync,spawn}from'node:child_process';
import{readFileSync,mkdirSync,writeFileSync}from'node:fs';
import{randomUUID}from'node:crypto';
import assert from'node:assert/strict';
import{createRoom,joinRoom,startRoom}from'../src/multiplayer/room.js';
const name='yahtzee-social-'+randomUUID().slice(0,8),image='timescale/timescaledb:2.29.2-pg16';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const report={startedAt:new Date().toISOString(),checks:[],passed:false};let started=false;
const str=v=>"'"+String(v).replaceAll("'","''")+"'",json=v=>str(JSON.stringify(v))+'::jsonb';
function raw(sql){return spawnSync('docker',['exec','-i',name,'psql','-U','postgres','-At','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:30000});}
function query(sql){const r=raw(sql);if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();}
function asyncRaw(sql){return new Promise(resolve=>{const child=spawn('docker',['exec','-i',name,'psql','-U','postgres','-At','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',v=>stdout+=v);child.stderr.on('data',v=>stderr+=v);child.on('close',status=>resolve({status,stdout,stderr}));child.stdin.end(sql);});}
const callSql=(actor,action,payload={})=>`set role authenticated;set request.jwt.claim.sub=${str(actor)};select public.clubhouse_social(${str(action)},${json(payload)});`;
const call=(actor,action,payload={})=>JSON.parse(query(callSql(actor,action,payload)).split('\n').at(-1));
const refused=(actor,action,payload)=>assert.notEqual(raw(callSql(actor,action,payload)).status,0);
const check=(label,fn)=>{fn();report.checks.push({label,passed:true});console.log('PASS '+label);};
const time=new Date().toISOString();
const lobby=createRoom({id:'00000000-0000-4000-8000-000000000009',code:'ABCDEFGH',userId:host,name:'Alex',time,tournament:{name:'Fictional test',gameCount:12,playerCount:2}});
const old=startRoom(joinRoom({...lobby,id:'00000000-0000-4000-8000-000000000008',code:'ABCDEFGJ'},{userId:guest,name:'Sam',time}),{userId:host,time});old.tournament.status='paused';
function insert(r){query(`insert into public.clubhouse_rooms(id,code,host_id,member_ids,revision,state,created_at) values('${r.id}','${r.code}','${r.hostId}',array[${r.members.map(m=>str(m.userId)+'::uuid')}],${r.revision},${json(r)},${str(time)});`);}
try{
 execFileSync('docker',['run','--rm','-d','--network','none','--tmpfs','/var/lib/postgresql/data','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust',image],{encoding:'utf8',timeout:30000});started=true;
 for(let n=0;n<60;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{encoding:'utf8'}).status===0)break;await new Promise(r=>setTimeout(r,250));}
 query(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
 insert into auth.users values('${host}','alex@example.com',now(),false),('${guest}','sam@example.com',now(),false),('${other}','lee@example.com',now(),false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,service_role;create publication supabase_realtime;`);
 query(readFileSync('supabase/migrations/202609160001_rooms.sql','utf8'));insert(lobby);insert(old);const oldSnapshot=query(`select state from public.clubhouse_rooms where id='${old.id}';`);
 const before=query(`select jsonb_agg(to_jsonb(r) order by code) from public.clubhouse_rooms r;`);
 query(readFileSync('supabase/migrations/202610170001_tournament_social.sql','utf8'));
 query(readFileSync('supabase/migrations/202610170001_tournament_social.sql','utf8'));
 check('additive migration reruns without changing existing room, membership, settings or pause state',()=>assert.equal(query(`select jsonb_agg(to_jsonb(r) order by code) from public.clubhouse_rooms r;`),before));
 check('outsider cannot invite or request existing tournament members',()=>{refused(other,'invite-create',{id:randomUUID(),code:lobby.code,email:'sam@example.com'});refused(other,'play-create',{id:randomUUID(),code:old.code,recipientId:guest,gameId:old.game.id});});
 check('new invitations cannot extend a started tournament roster',()=>refused(host,'invite-create',{id:randomUUID(),code:old.code,email:'lee@example.com'}));
 const invite=randomUUID();call(host,'invite-create',{id:invite,code:lobby.code,email:' SAM@example.com '});
 check('email invitation reaches only verified intended recipient and sender',()=>{assert.equal(call(guest,'inbox').invitations[0].id,invite);assert.equal(call(other,'inbox').invitations.length,0);assert.equal(query(`set role authenticated;set request.jwt.claim.sub='${other}';select count(*) from public.clubhouse_invitations;`).split('\n').at(-1),'0');});
 check('repeated invite is idempotent and reveals no account-directory lookup',()=>{assert.deepEqual(call(host,'invite-create',{id:randomUUID(),code:lobby.code,email:'sam@example.com'}),{ok:true});assert.equal(query('select count(*) from public.clubhouse_invitations;'),'1');});
 check('wrong account cannot accept, decline or revoke someone else’s invitation',()=>{refused(other,'invite-accept',{id:invite,name:'Lee'});refused(host,'invite-accept',{id:invite,name:'Host'});refused(other,'invite-decline',{id:invite});refused(guest,'invite-revoke',{id:invite});});
 check('recipient can accept once and has the same saved seat on retry',()=>{assert.equal(call(guest,'invite-accept',{id:invite,name:'Sam'}).code,lobby.code);assert.equal(call(guest,'invite-accept',{id:invite,name:'Other name'}).code,lobby.code);const r=JSON.parse(query(`select state from public.clubhouse_rooms where id='${lobby.id}';`));assert.equal(r.members.length,2);assert.equal(r.members[1].name,'Sam');assert.equal(r.revision,lobby.revision+1);});
 const device=randomUUID();call(guest,'device-register',{id:device,platform:'android',token:'fictional-device-token-not-real'});
 const request=randomUUID(),payload={id:request,code:old.code,recipientId:guest,gameId:old.game.id};call(host,'play-create',payload);
 check('existing members can request a paused tournament without reacceptance or mutation',()=>{assert.equal(call(guest,'inbox').requests[0].id,request);assert.equal(query(`select state from public.clubhouse_rooms where id='${old.id}';`),oldSnapshot);});
 check('request retry creates exactly one request and delivery event',()=>{call(host,'play-create',payload);assert.equal(query('select count(*) from public.clubhouse_play_requests;'),'1');assert.equal(query('select count(*) from public.clubhouse_social_push_outbox;'),'1');});
 check('cooldown prevents repeated taps from alerting the same player',()=>refused(host,'play-create',{...payload,id:randomUUID()}));
 check('sender cannot forge recipient readiness and outsider cannot respond',()=>{refused(host,'play-ready',{id:request});refused(other,'play-ready',{id:request});});
 check('both platform roles can request and explicit readiness does not resume or advance',()=>{call(guest,'play-ready',{id:request});assert.equal(call(host,'inbox').requests[0].status,'ready');assert.equal(query(`select state from public.clubhouse_rooms where id='${old.id}';`),oldSnapshot);call(guest,'play-create',{id:randomUUID(),code:old.code,recipientId:host,gameId:old.game.id});});
 check('direct writes and push leases are unavailable to client accounts',()=>{assert.notEqual(raw(`set role authenticated;delete from public.clubhouse_invitations;`).status,0);assert.notEqual(raw(`set role authenticated;select public.clubhouse_claim_social_push('${randomUUID()}',10);`).status,0);});
 const req2=call(host,'inbox').requests.find(q=>q.sender_id===guest);query(`update public.clubhouse_play_requests set expires_at=now()-interval '1 second' where id='${req2.id}';`);
 check('expired readiness is rejected without game mutation',()=>{refused(host,'play-ready',{id:req2.id});assert.equal(call(host,'inbox').requests.find(q=>q.id===req2.id).actionable,false);});
 const req3=randomUUID();query(`update public.clubhouse_play_requests set created_at=now()-interval '2 minutes';`);call(host,'play-create',{...payload,id:req3});
 const lease=randomUUID();const jobs=JSON.parse(query(`set role service_role;select public.clubhouse_claim_social_push('${lease}',10);`).split('\n').at(-1));
 check('worker leases only current pending notifications with opaque navigation hints',()=>{assert.equal(jobs.length,1);assert.equal(jobs[0].data.kind,'play');assert.equal(jobs[0].data.code,old.code);assert.equal(jobs[0].platform,'android');assert.equal(query(`set role service_role;select public.clubhouse_claim_social_push('${randomUUID()}',10);`).split('\n').at(-1),'[]');});
 check('notification acknowledgment is fenced by lease ownership',()=>{assert.equal(query(`set role service_role;select public.clubhouse_finish_social_push('${jobs[0].id}','${randomUUID()}','sent',false);`).split('\n').at(-1),'f');assert.equal(query(`set role service_role;select public.clubhouse_finish_social_push('${jobs[0].id}','${lease}','sent',false);`).split('\n').at(-1),'t');});
 call(guest,'device-remove',{id:device});
 check('sign-out/mute deactivates only the current account installation',()=>assert.equal(query(`select active from public.clubhouse_social_devices where id='${device}';`),'f'));
 check('original tournament and both memberships are still exactly preserved',()=>assert.equal(query(`select state from public.clubhouse_rooms where id='${old.id}';`),oldSnapshot));
 const race={...lobby,id:randomUUID(),code:'ABCDEFGK'};insert(race);const raceA=randomUUID(),raceB=randomUUID();
 call(host,'invite-create',{id:raceA,code:race.code,email:'sam@example.com'});call(host,'invite-create',{id:raceB,code:race.code,email:'lee@example.com'});
 const competing=await Promise.all([asyncRaw(callSql(guest,'invite-accept',{id:raceA,name:'Sam'})),asyncRaw(callSql(other,'invite-accept',{id:raceB,name:'Lee'}))]);
 check('concurrent invitation acceptance cannot take the same last seat',()=>{assert.equal(competing.filter(r=>r.status===0).length,1);const r=JSON.parse(query(`select state from public.clubhouse_rooms where id='${race.id}';`));assert.equal(r.members.length,2);assert.equal(r.revision,1);});
 const revoked={...lobby,id:randomUUID(),code:'ABCDEFGL'};insert(revoked);const revokedId=randomUUID();call(host,'invite-create',{id:revokedId,code:revoked.code,email:'lee@example.com'});call(host,'invite-revoke',{id:revokedId});
 check('revoked invitations never create membership',()=>{refused(other,'invite-accept',{id:revokedId,name:'Lee'});assert.equal(query(`select cardinality(member_ids) from public.clubhouse_rooms where id='${revoked.id}';`),'1');});
 const staleId=randomUUID();query(`update public.clubhouse_play_requests set created_at=now()-interval '2 minutes';`);call(guest,'play-create',{id:staleId,code:old.code,recipientId:host,gameId:old.game.id});query(`update public.clubhouse_rooms set state=jsonb_set(state,'{gameSequence}','2'::jsonb) where id='${old.id}';`);
 check('a request from a previous game cannot mark the current game ready',()=>{refused(host,'play-ready',{id:staleId});assert.equal(call(host,'inbox').requests.find(r=>r.id===staleId).actionable,false);});
 query(`update public.clubhouse_rooms set state=${json(old)} where id='${old.id}';`);
 query(`update auth.users set email_confirmed_at=null where id='${other}';`);
 check('unverified accounts cannot claim email invitations or read private social records',()=>{refused(other,'inbox');assert.equal(query(`set role authenticated;set request.jwt.claim.sub='${other}';select count(*) from public.clubhouse_invitations where recipient_email='lee@example.com';`).split('\n').at(-1),'0');});
 report.passed=true;
}catch(error){report.error=error.message;process.exitCode=1;console.error(error.message);}
finally{if(started)spawnSync('docker',['stop',name],{encoding:'utf8',timeout:30000});mkdirSync('artifacts/sw046-db',{recursive:true});writeFileSync('artifacts/sw046-db/report.json',JSON.stringify({...report,completedAt:new Date().toISOString()},null,2)+'\n');}
