// Disposable, cached PostgreSQL16, --network none; no hosted database or provider.
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {DurableCommentaryStore,encodeCommentaryState} from '../server/commentary/durable-store.js';
const {createCommentaryService}=await import(process.env.COMMENTARY_SERVICE_UNDER_TEST||'../server/commentary/service.js');
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setRematchReady} from '../src/multiplayer/rematch.js';
import {acceptedOutbox} from '../server/commentary/accepted-outbox.js';
import {openingFacts} from '../src/commentary/opening-facts.js';
import {createLocalSession} from '../server/commentary/local-sessions.js';
import {createCoreGame,command} from '../src/game/core.js';
const image='timescale/timescaledb:2.29.2-pg16',container=`yahtzee-commentary-${randomUUID().slice(0,8)}`,directory='artifacts/commentary-durable';
const scope='00000000-0000-4000-8000-000000000099',roomId='00000000-0000-4000-8000-000000000010',host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002';
const migration=readFileSync('supabase/migrations/202610140005_commentary_durable_state.sql','utf8');
const localMigration=readFileSync('supabase/migrations/202610140008_local_commentary_sessions.sql','utf8');
const incrementalMigration=readFileSync('supabase/migrations/202610140009_commentary_incremental_transport.sql','utf8');
const batchMigration=readFileSync('supabase/migrations/202610140010_commentary_atomic_batches.sql','utf8'),providerMigration=readFileSync('supabase/migrations/202610140011_commentary_provider_operations.sql','utf8');
const roomMigration=readFileSync('supabase/migrations/202610140006_commentary_room_outbox.sql','utf8');
const report={batchMigrationSha256:createHash('sha256').update(batchMigration).digest('hex'),providerMigrationSha256:createHash('sha256').update(providerMigration).digest('hex'),incrementalMigrationSha256:createHash('sha256').update(incrementalMigration).digest('hex'),localMigrationSha256:createHash('sha256').update(localMigration).digest('hex'),roomMigrationSha256:createHash('sha256').update(roomMigration).digest('hex'),startedAt:new Date().toISOString(),image,migrationSha256:createHash('sha256').update(migration).digest('hex'),checks:[],passed:false};let created=false;
const quote=value=>`'${String(value).replaceAll("'","''")}'`,json=value=>`${quote(JSON.stringify(value))}::jsonb`;
function run(sql){return spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:30000});}
function query(sql){const result=run(sql);if(result.status!==0)throw Error(result.stderr);return result.stdout.trim();}
async function check(label,fn){await fn();report.checks.push({label,passed:true});console.log(`PASS ${label}`);}
const parameters={clubhouse_commentary_batch:b=>`${quote(b.p_scope)}::uuid,${b.p_expected_version},${json(b.p_changes)},${json(b.p_deleted)},${json(b.p_rooms)}`,clubhouse_commentary_dispatch:b=>`${quote(b.p_scope)}::uuid,${json(b.p_input)}`,clubhouse_commentary_finish:b=>`${quote(b.p_scope)}::uuid,${quote(b.p_id)},${json(b.p_metadata)}`,clubhouse_commentary_load_changed:b=>`${quote(b.p_scope)}::uuid,${b.p_known_version??'null'}`,clubhouse_commentary_patch:b=>`${quote(b.p_scope)}::uuid,${b.p_expected_version},${json(b.p_changes)},${json(b.p_deleted)}`,clubhouse_commentary_load:b=>`${quote(b.p_scope)}::uuid`,clubhouse_commentary_commit:b=>`${quote(b.p_scope)}::uuid,${b.p_expected_version},${json(b.p_state)}`,clubhouse_commentary_expire:b=>`${quote(b.p_scope)}::uuid`,clubhouse_commentary_forget:b=>`${quote(b.p_scope)}::uuid,${quote(b.p_account)}::uuid`};
let collisions=0;
const rpc=async(operation,body)=>{assert(parameters[operation]);const raw=query(`set role service_role;select public.${operation}(${parameters[operation](body)});`),result=raw==='t'?true:raw==='f'?false:JSON.parse(raw);if(result.committed===false)collisions++;return result;};
const store=()=>new DurableCommentaryStore({rpc,scopeId:scope,incremental:true,atomicBatches:true});
const limit=(requests,characters=1000000)=>query(`set role service_role;select public.clubhouse_commentary_set_limit('${scope}','${roomId}',${requests},${characters},clock_timestamp()+interval '1 hour');`);
try{
 execFileSync('docker',['image','inspect',image],{encoding:'utf8',timeout:10000});
 execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--tmpfs','/var/lib/postgresql/data','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust',image],{encoding:'utf8',timeout:30000});created=true;
 let ready=false;for(let n=0;n<60;n++){if(spawnSync('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],{encoding:'utf8',timeout:2000}).status===0){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,250));}assert(ready,'Disposable database did not start');
 query('create role anon;create role authenticated;create role service_role bypassrls;');
 await check('migration reruns without changing existing room or score schema',()=>{query('create table public.test_scores(id text primary key,score integer);insert into public.test_scores values(\'existing-score\',50);');query(migration);query(migration);query(localMigration);query(incrementalMigration);query(batchMigration);query(providerMigration);assert.equal(query('select score from public.test_scores;'),'50');});
 await check('anonymous/authenticated roles cannot read/write state or invoke privileged RPCs/allowances',()=>{for(const role of ['anon','authenticated'])for(const sql of [`select * from public.clubhouse_commentary_items;`,`select public.clubhouse_commentary_load('${scope}');`,`select public.clubhouse_commentary_batch('${scope}',0,'{}','{}','[]');`,`select public.clubhouse_commentary_dispatch('${scope}','{}');`,`select public.clubhouse_commentary_finish('${scope}','invalid','{}');`,`select public.clubhouse_commentary_load_changed('${scope}',null);`,`select public.clubhouse_commentary_patch('${scope}',0,'{}','{}');`,`select public.clubhouse_commentary_set_limit('${scope}','${roomId}',100,100000,clock_timestamp()+interval '1 hour');`])assert.notEqual(run(`set role ${role};${sql}`).status,0);assert.notEqual(run(`set role service_role;insert into public.clubhouse_commentary_items(scope_id,collection,item_key,value)values('${scope}','jobs','forged','{}');`).status,0);});
 await check('incremental conditional loads are current and no-op reads do not advance the global version',async()=>{
  const current=await store().initialize(),before=current.version;await current.refresh();assert.equal(current.version,before);const raw=await rpc('clubhouse_commentary_load_changed',{p_scope:scope,p_known_version:before});assert.equal(raw.notModified,true);assert.equal(raw.state,undefined);await current.transaction(()=>true,{skipUnchanged:true});assert.equal(current.version,before);
 });
 const a=await store().initialize();
 await check('initialized durable store survives new instance and independent concurrent CAS retains both writers',async()=>{const b=await store().initialize();await Promise.all([a.transaction(state=>state.settings.set('a',{version:1})),b.transaction(state=>state.settings.set('b',{version:1}))]);const restarted=await store().initialize();assert.deepEqual([...restarted.snapshot().settings.keys()].sort(),['a','b']);assert(collisions>=1);});
 const time=new Date().toISOString();let game=createCoreGame({id:roomId,names:['Alice','Bob'],source:'manual',time});game=command(game,{type:'start',seat:0},{id:'start-test',time});game=command(game,{type:'score',seat:0,category:'chance',value:25},{id:'score-test',time});const room={id:roomId,hostId:host,members:[{userId:host,name:'Alice'},{userId:guest,name:'Bob'}],game};
 let providerCalls=0;const provider={writeLine:async()=>{providerCalls++;const ledger=JSON.parse(query(`select value from public.clubhouse_commentary_items where scope_id='${scope}'and collection='attempts' order by created_at limit 1;`));assert.equal(ledger.status,'submitted');return {text:'The paperwork has ambitions.',containsProfanity:false,mechanism:'misdirection',subject:'bureaucracy',premise:'bureaucracy'};},streamAudio:async function*(){yield new Uint8Array([1,2,3]);}};
 // Docker subprocess calls deliberately use a60s synthetic freshness fixture; production15s remains unchanged.
 const service=createCommentaryService({maxAgeMs:60000,store:a,getRoom:async()=>structuredClone(room),profile:{humorIntensity:'dark',profanityAllowed:true,frequency:'balanced'},budget:{maxRequests:100,maxCharacters:1000000},syntheticProviders:provider});
 let job;
 await check('unadministered usage defaults to denied, with no writer dispatch or consumed attempt',async()=>{job=await service.enqueueAccepted(room,game.events.at(-1).id);await assert.rejects(service.prepareTrusted(job),/allowance/);assert.equal(providerCalls,0);const restarted=await store().initialize();assert.equal(restarted.snapshot().attempts.size,0);});
 limit(10);
 await check('real service reservation persists attempt plus budget before synthetic writer dispatch and survives restart',async()=>{await a.refresh();await service.prepareTrusted(job);assert.equal(providerCalls,1);const restarted=await store().initialize();assert.equal(restarted.snapshot().jobs.get(job).status,'ready');assert.equal(restarted.snapshot().budgets.get(roomId).requests,1);});
  await check('database lease horizon and owner epoch prevent future-clock or within-epoch takeover',async()=>{
  const current=await store().initialize();await assert.rejects(current.transaction(state=>state.leases.set(roomId,{owner:host,device:'host-test-device',epoch:1,expiresAt:Date.now()+60000})),/bounded horizon/);
 });
 let lease,claim;
 await check('lease, one-time claim, reported host exposure, caption feedback and own profile are durable',async()=>{lease=await service.acquire(host,roomId,{device:'host-test-device'});claim=await service.claimPlayback(host,roomId,{jobId:job,device:'host-test-device',epoch:lease.epoch});const body={jobId:job,device:'host-test-device',epoch:lease.epoch,claimToken:claim.token};await new Response(await service.audio(host,roomId,body)).arrayBuffer();const startedReceipt=await service.playbackEvent(host,roomId,{...body,status:'started',sequence:1});assert.notEqual(startedReceipt.accepted,false);assert.equal(startedReceipt.status,'started');assert.deepEqual(startedReceipt.heardBy,[host]);const completedReceipt=await service.playbackEvent(host,roomId,{...body,status:'completed',sequence:2});assert.notEqual(completedReceipt.accepted,false);assert.equal(completedReceipt.status,'completed');assert.deepEqual(completedReceipt.heardBy,[host]);await service.feedback(guest,roomId,{jobId:job,value:'like',basis:'caption'});await service.setPlayerProfile(guest,roomId,{expectedVersion:0,changes:{blurb:'Synthetic chess hobby',shareWithRoom:true}});const restarted=await store().initialize();const state=restarted.snapshot();assert.deepEqual(state.exposure.get(claim.token).heardBy,[host]);assert.equal(state.feedback.get(`${job}:${guest}`).basis,'caption');assert.equal(state.playerProfiles.get(guest).profile.blurb,'Synthetic chess hobby');assert.equal(state.leases.get(roomId).epoch,lease.epoch);});
  await check('same-epoch owner takeover and epoch regression are rejected by database fencing',async()=>{
  const current=await store().initialize();await assert.rejects(current.transaction(state=>{const old=state.leases.get(roomId);state.leases.set(roomId,{...old,owner:guest,expiresAt:Date.now()+14000});}),/owner cannot change/);
  await assert.rejects(current.transaction(state=>{const old=state.leases.get(roomId);state.leases.set(roomId,{...old,epoch:0,expiresAt:Date.now()+14000});}),/Invalid fenced/);
 });
 await check('last administered usage slot has one concurrent winner and cannot dispatch the denied contender',async()=>{const current=await store().initialize(),used=current.snapshot().budgets.get(roomId);limit(used.requests+1);const left=await store().initialize(),right=await store().initialize();let dispatched=0;const reserve=(instance,id)=>instance.transaction(state=>{state.attempts.set(id,{id,jobId:job,stage:'writer',characters:1,status:'submitted',at:Date.now()});const before=state.budgets.get(roomId);state.budgets.set(roomId,{requests:before.requests+1,characters:before.characters+1});return id;}).then(()=>dispatched++);const results=await Promise.allSettled([reserve(left,'last-slot-a'),reserve(right,'last-slot-b')]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(dispatched,1);const restart=await store().initialize();assert.equal(restart.snapshot().budgets.get(roomId).requests,used.requests+1);});
 await check('attempt reservation cannot reset/refund and crashes leave submitted accounting for reconciliation',async()=>{const current=await store().initialize();const before=current.snapshot(),attempt=[...before.attempts.values()].find(value=>value.status==='submitted');assert(attempt);await assert.rejects(current.transaction(state=>{state.budgets.get(roomId).requests=0;}),/cannot reset/);await assert.rejects(current.transaction(state=>{state.attempts.delete(attempt.id);}),/cannot be removed/);const finishedId=[...before.attempts.entries()].find(([,value])=>value.status==='succeeded')[0];await assert.rejects(current.transaction(state=>{state.attempts.get(finishedId).status='submitted';}),/cannot change or reset/);assert.equal((await store().initialize()).snapshot().attempts.get(attempt.id).status,'submitted');});
 await check('failed callback and invalid SQL payload roll back without persisting partial feedback',async()=>{const current=await store().initialize(),v=current.version;await assert.rejects(current.transaction(state=>{state.feedback.set('broken',{rating:'like'});throw Error('rollback');}),/rollback/);assert.equal((await store().initialize()).version,v);const bad=encodeCommentaryState(current.snapshot());bad.budgets[roomId]={requests:0};assert.notEqual(run(`set role service_role;select public.clubhouse_commentary_commit('${scope}',${v},${json(bad)});`).status,0);});
 await check('database time enforces90day history/feedback expiry and clears cached/caption derivatives',async()=>{const current=await store().initialize();await current.transaction(state=>{state.memoryRecords.get(job).expiresAt=Date.now()-1;state.feedback.get(`${job}:${guest}`).expiresAt=Date.now()-1;state.exposure.get(claim.token).expiresAt=Date.now()-1;state.memoryCaches.set('derived',{value:{secret:'synthetic only'}});state.memorySummaries.set(host,{value:{}});});const result=await current.expire();assert(result.expiredJobs>=1);const state=current.snapshot();assert.equal(state.feedback.size,0);assert.equal(state.exposure.size,0);assert.equal(state.memoryRecords.size,0);assert.equal(state.memoryCaches.size,0);assert.equal(state.memorySummaries.size,0);assert.equal(state.jobs.get(job).line,null);assert.equal(state.playerProfiles.get(guest).profile.blurb,'Synthetic chess hobby');});
 await check('Forget is atomic across history/ratings/exposure/caches without touching scores, raw profiles or consumed budgets',async()=>{const current=await store().initialize(),before=current.snapshot().budgets.get(roomId).requests;await current.transaction(state=>{state.jobs.get(job).line={text:'Synthetic private remembered line'};state.jobs.get(job).status='ready';state.feedback.set(`${job}:${guest}`,{recordId:job,accountId:guest,rating:'like',expiresAt:Date.now()+10000});state.exposure.set('forget-exposure',{jobId:job,reportingAccount:host,expectedAudience:[host,guest]});state.memoryRecords.set(job,{audience:[host,guest],line:{targetAccountId:host}});state.memoryCaches.set('context',{accounts:[host,guest]});});await current.forget(guest);const state=(await store().initialize()).snapshot();assert.equal(state.jobs.get(job).line,null);assert.equal(state.jobs.get(job).status,'cancelled');assert.equal(state.feedback.size,0);assert.equal(state.exposure.size,0);assert.equal(state.memoryRecords.size,0);assert.equal(state.memoryCaches.size,0);assert.equal(state.budgets.get(roomId).requests,before);assert.equal(query('select score from public.test_scores;'),'50');assert(state.playerProfiles.has(guest));});
 const outbox={idempotencyKey:JSON.stringify([roomId,roomId,'accepted-one','moment','score']),roomId,gameId:roomId,commandId:'accepted-one',actorId:host,expectedRoomRevision:0,acceptedRoomRevision:1,acceptedAt:time,kind:'moment',purpose:'score',audience:[host,guest],facts:{eventId:'accepted-one'},invalidates:[]};
 const append=`select clubhouse_commentary_private.append_outbox('${scope}',${json([outbox])});`;
 await check('private accepted outbox hook rolls back with its parent transaction and preserves retry collision authority',()=>{
  assert.notEqual(run(`begin;update public.test_scores set score=99;${append}select 1/0;commit;`).status,0);
  assert.equal(query('select score from public.test_scores;'),'50');assert.equal(query('select count(*) from public.clubhouse_commentary_outbox;'),'0');
  assert.equal(query(append),'1');assert.equal(query(append),'0');
  assert.notEqual(run(`select clubhouse_commentary_private.append_outbox('${scope}',${json([{...outbox,facts:{eventId:'tampered'}}])});`).status,0);
  assert.equal(query('select count(*) from public.clubhouse_commentary_outbox;'),'1');
  const invalid={...outbox,idempotencyKey:JSON.stringify([roomId,roomId,'bad','moment','score']),commandId:'bad',acceptedRoomRevision:0};
  assert.notEqual(run(`select clubhouse_commentary_private.append_outbox('${scope}',${json([invalid])});`).status,0);
  for(const role of ['authenticated','service_role'])assert.notEqual(run(`set role ${role};${append}`).status,0);
 });
 await check('slow renewed lease cannot revive an epoch that expires between load and actual SQL commit',async()=>{
  const current=await store().initialize();query(`update public.clubhouse_commentary_items set value=jsonb_set(value,'{expiresAt}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)+1000))where scope_id='${scope}'and collection='leases'and item_key='${roomId}';`);
  const slowRpc=async(op,body)=>{if(op!=='clubhouse_commentary_commit')return rpc(op,body);return JSON.parse(query(`select pg_sleep(1.2);set role service_role;select public.clubhouse_commentary_commit(${parameters.clubhouse_commentary_commit(body)});`));};
  const delayed=await new DurableCommentaryStore({rpc:slowRpc,scopeId:scope}).initialize();await assert.rejects(delayed.transaction((state,clock)=>{const old=state.leases.get(roomId);assert(old.expiresAt>clock.databaseNowMs);state.leases.set(roomId,{...old,expiresAt:clock.databaseNowMs+14000});}),/Expired playback epoch/);
 });
 await check('slow paid stream reservation after claim expiry is rejected before attempt/budget dispatch',async()=>{
  const current=await store().initialize();limit(current.snapshot().budgets.get(roomId).requests+2);await current.transaction((state,clock)=>{const old=state.leases.get(roomId),epoch=old.epoch+1;state.leases.set(roomId,{owner:host,device:'host-test-device',epoch,expiresAt:clock.databaseNowMs+14000,activeJobId:job});Object.assign(state.jobs.get(job),{status:'claimed',claim:{owner:host,device:'host-test-device',epoch,token:'expired-stream-test'}});});
  query(`update public.clubhouse_commentary_items set value=jsonb_set(value,'{expiresAt}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)+1000))where scope_id='${scope}'and collection='leases'and item_key='${roomId}';`);
  const slowRpc=async(op,body)=>{if(op!=='clubhouse_commentary_commit')return rpc(op,body);return JSON.parse(query(`select pg_sleep(1.2);set role service_role;select public.clubhouse_commentary_commit(${parameters.clubhouse_commentary_commit(body)});`));};
  const delayed=await new DurableCommentaryStore({rpc:slowRpc,scopeId:scope}).initialize();const before=delayed.snapshot().budgets.get(roomId).requests;
  await assert.rejects(delayed.transaction(state=>{state.jobs.get(job).status='streaming';state.attempts.set('slow-expired-audio',{id:'slow-expired-audio',jobId:job,stage:'tts',characters:1,status:'submitted',at:Date.now()});state.budgets.get(roomId).requests++;state.budgets.get(roomId).characters++;}),/unexpired fenced playback/);
  const restart=await store().initialize();assert.equal(restart.snapshot().attempts.has('slow-expired-audio'),false);assert.equal(restart.snapshot().budgets.get(roomId).requests,before);
 });
 await check('late completion after actual SQL lease expiry does not fabricate completed exposure',async()=>{
  const current=await store().initialize();await assert.rejects(current.transaction(state=>{const value=state.jobs.get(job);value.status='completed';state.exposure.set(value.claim.token,{jobId:job,epoch:value.claim.epoch,sequence:2,status:'completed',reportingAccount:host,heardBy:[host],expectedAudience:[host,guest]});}),/Speech receipt requires current/);assert.equal((await store().initialize()).snapshot().exposure.has('expired-stream-test'),false);
 });

 await check('atomic room wrapper migration and grants qualify on actual PostgreSQL',()=>{
  query("create schema auth;create function auth.uid()returns uuid language sql as 'select null::uuid';create table public.clubhouse_rooms(id uuid primary key,code text unique,host_id uuid,member_ids uuid[],revision bigint,state jsonb,created_at timestamptz default now());grant all on public.clubhouse_rooms to service_role;");
  query(readFileSync('supabase/migrations/202610130001_hosted_game_history.sql','utf8'));query(roomMigration);query(localMigration);query(incrementalMigration);query(batchMigration);query(providerMigration);
  assert.equal(query('set role service_role;select public.clubhouse_commentary_atomic_available();'),'t');
  for(const role of ['anon','authenticated'])assert.notEqual(run('set role '+role+';select public.clubhouse_commentary_atomic_available();').status,0);
 });
 const atomicScope='d1ce0000-0000-4000-8000-000000000026';
 let lobby=createRoom({id:roomId,code:'ABCDEFGH',userId:host,name:'Alice',time});lobby=joinRoom(lobby,{userId:guest,name:'Bob',time});
 query('insert into public.clubhouse_rooms(id,code,host_id,member_ids,revision,state)values('+quote(roomId)+','+quote(lobby.code)+','+quote(host)+',array['+quote(host)+'::uuid,'+quote(guest)+'::uuid],'+lobby.revision+','+json(lobby)+');');
 const started={...startRoom(lobby,{userId:host,time}),historyVersion:1},openingId='opening-command-01';
 const openingRows=acceptedOutbox({before:lobby,after:started,actorId:host,commandId:openingId,operation:'start',acceptedAt:time,openingFacts});
 const atomic=(after,before,id,rows,fp='test-fingerprint',actor=host)=>'set role service_role;select public.clubhouse_commit_game_commentary('+quote(roomId)+'::uuid,'+before.revision+','+json(after)+','+quote(actor)+'::uuid,'+quote(id)+','+quote(fp)+','+quote(atomicScope)+'::uuid,'+json(rows)+');';
 await check('opening room/history/receipt and server marker/outbox evidence commit together, replay quiet',()=>{
  assert.equal(query(atomic(started,lobby,openingId,openingRows)),'t');assert.equal(query(atomic(started,lobby,openingId,openingRows)),'f');
  const payload=JSON.parse(query('select payload from public.clubhouse_commentary_outbox where scope_id='+quote(atomicScope)+';'));
  assert.deepEqual(payload.beforeRoom,lobby);assert.equal(payload.acceptedRoom.commentaryLifecycle.commandId,openingId);assert.equal(payload.receipt.actor_id,host);assert.equal(payload.moment.facts.commandId,openingId);
  assert.equal(query('select count(*)from public.clubhouse_room_receipts;'),'1');assert.equal(query('select count(*)from public.clubhouse_games;'),'1');
 });
 const acceptedStart=JSON.parse(query('select state from public.clubhouse_rooms where id='+quote(roomId)+';'));
 const scoreId='score-command-02',scored=playRoom(acceptedStart,{userId:host,commandId:scoreId,gameId:acceptedStart.game.id,expectedRevision:acceptedStart.revision,action:{type:'score',category:'chance',value:25},time});
 const scoreRows=acceptedOutbox({before:acceptedStart,after:scored,actorId:host,commandId:scoreId,operation:'command',acceptedAt:time,openingFacts});
 await check('invalid outbox rollback preserves room score/history and no receipt is committed',()=>{
  const forged=scoreRows.map(row=>({...row,actorId:guest}));assert.notEqual(run(atomic(scored,acceptedStart,scoreId,forged)).status,0);
  assert.equal(query('select revision from public.clubhouse_rooms where id='+quote(roomId)+';'),String(acceptedStart.revision));assert.equal(query('select count(*)from public.clubhouse_room_receipts;'),'1');
  const malformed=scoreRows.map(row=>({...row,idempotencyKey:'["collision"]'}));assert.notEqual(run(atomic(scored,acceptedStart,scoreId,malformed)).status,0);assert.equal(query('select count(*)from public.clubhouse_room_receipts;'),'1');
 });
 await check('accepted score commits exactly one immutable moment with locked predecessor and retry collision denial',()=>{
  assert.equal(query(atomic(scored,acceptedStart,scoreId,scoreRows)),'t');const payload=JSON.parse(query('select payload from public.clubhouse_commentary_outbox where scope_id='+quote(atomicScope)+'and command_id='+quote(scoreId)+';'));assert.equal(payload.acceptedRoom.game.sheets[0].chance,25);assert.deepEqual(payload.beforeRoom,acceptedStart);
  assert.notEqual(run(atomic(scored,acceptedStart,scoreId,scoreRows,'changed-fingerprint')).status,0);assert.equal(query('select count(*)from public.clubhouse_commentary_outbox where scope_id='+quote(atomicScope)+';'),'2');
 });
 await check('outbox ack requires durable matching job and retry remains pollable',()=>{
  const key=scoreRows[0].idempotencyKey,ack=(status,id)=>'set role service_role;select public.clubhouse_commentary_ack_outbox('+quote(atomicScope)+'::uuid,'+quote(key)+','+quote(status)+','+(id?quote(id):'null')+');';
  assert.notEqual(run(ack('enqueued','not-persisted')).status,0);assert.equal(query(ack('retry',null)),'t');assert.equal(query('select count(*)from public.clubhouse_commentary_outbox where scope_id='+quote(atomicScope)+'and processed_at is null;'),'2');
  query('insert into public.clubhouse_commentary_items(scope_id,collection,item_key,value)values('+quote(atomicScope)+',\'jobs\',\'durable-score-job\','+json({roomId,facts:{gameId:scored.game.id,commandId:scoreId}})+');');
  assert.equal(query(ack('enqueued','durable-score-job')),'t');assert.equal(query(ack('enqueued','durable-score-job')),'t');assert.equal(query(ack('enqueued','other-job')),'f');
  for(const role of ['anon','authenticated'])assert.notEqual(run(ack('retry',null).replace('set role service_role','set role '+role)).status,0);
 });


 await check('last-ready guest next-game persists DB-authorized previous winner and fresh lifecycle marker',()=>{
  const finished=structuredClone(scored);finished.revision++;finished.status='finished';finished.game.status='finished';finished.game.endedAt=time;finished.game.revision++;finished.rematch={gameId:finished.game.id,gameRevision:finished.game.revision,ready:[host]};
  query('update public.clubhouse_rooms set revision='+finished.revision+',state='+json(finished)+' where id='+quote(roomId)+';');
  const id='next-game-ready-1',after=setRematchReady(finished,{userId:guest,gameId:finished.game.id,gameRevision:finished.game.revision,ready:true,commandId:id,nextGameId:'00000000-0000-4000-8000-000000000011',time});
  const priorGame={authorized:true,game:finished.game,accountIds:[host,guest]},rows=acceptedOutbox({before:finished,after,actorId:guest,commandId:id,operation:'ready',acceptedAt:time,openingFacts,priorGame});
  assert.equal(rows[0].facts.priorGameSummary.winners[0].accountId,host);assert.equal(query(atomic(after,finished,id,rows,'ready-fingerprint',guest)),'t');
  const evidence=JSON.parse(query('select payload from public.clubhouse_commentary_outbox where scope_id='+quote(atomicScope)+'and command_id='+quote(id)+';'));assert.deepEqual(evidence.priorGame,priorGame);assert.equal(evidence.receipt.actor_id,guest);assert.equal(evidence.acceptedRoom.commentaryLifecycle.purpose,'next-game');assert.equal(evidence.moment.facts.priorGameSummary.winners[0].total,25);
 });


 await check('local mirrors persist with immutable owner and cannot shadow hosted rooms',async()=>{
  const saved=await store().initialize(),localId='00000000-0000-4000-8000-000000000088',session=createLocalSession({roomId:localId,ownerId:host,commandId:'sql_local_start_001',config:{gameId:'00000000-0000-4000-8000-000000000087',names:['Alex','Sam'],mode:'standard',players:[{blurb:'fictional staplers'},{}]},time:new Date().toISOString()});await saved.transaction(state=>{state.localSessions.set(localId,session);return true;});assert.equal((await store().initialize()).snapshot().localSessions.get(localId).ownerId,host);
  await assert.rejects(saved.transaction(state=>{state.localSessions.get(localId).ownerId=guest;return true;}),/immutable/);
  await assert.rejects(saved.transaction(state=>{state.localSessions.set(roomId,{...session,id:roomId});return true;}),/shadow/);
  assert.equal((await store().initialize()).snapshot().localSessions.get(localId).ownerId,host);
 });
 await check('direct local writer-ready plus claim and audio reservation commit atomically before bytes',async()=>{
  const current=await store().initialize(),localId='00000000-0000-4000-8000-000000000085',gameId='00000000-0000-4000-8000-000000000086';
  const {localRoom}=await import('../server/commentary/local-sessions.js');let writes=0,voices=0;
  const service=createCommentaryService({store:current,deferAudio:true,profile:{enabled:true,frequency:'lively',humorIntensity:'dark',profanityAllowed:true,voiceOption:'rachel'},now:()=>current.databaseNowMs,getRoom:async id=>{const session=current.snapshot().localSessions.get(id);return session?localRoom(session):null;},liveProviders:{liveConfigured:true,writeLine:async()=>{writes++;return {text:'The dice have hired an accountant.',containsProfanity:false};},streamAudio:async function*(){voices++;yield new Uint8Array([1,2,3]);}},budget:{maxRequests:100,maxCharacters:100000}});
  const start=await current.batch(()=>service.startLocal(host,localId,{commandId:'sql_direct_start_001',config:{gameId,names:['Alex'],mode:'standard'},settings:{enabled:true,frequency:'lively',humorIntensity:'dark',profanityAllowed:true,voiceOption:'rachel'}}));
  query("set role service_role;select public.clubhouse_commentary_set_limit('"+scope+"','"+localId+"',100,100000,clock_timestamp()+interval '1 hour');");
  const selector={gameId,jobId:start.greetingJobId,device:'direct-sql-phone',profileVersion:start.profile.version};
  const result=await service.prepareTrusted(selector.jobId,{afterReady:()=>service.bindReaction(host,localId,selector)});
  assert.equal(writes,1);assert.equal(voices,0);assert.equal(result.binding.job.status,'streaming');assert.equal(current.snapshot().jobs.get(selector.jobId).claim.token,result.binding.claim.token);
  const persisted=await store().initialize();assert.equal(persisted.snapshot().jobs.get(selector.jobId).status,'streaming');assert.equal([...persisted.snapshot().attempts.values()].filter(a=>a.jobId===selector.jobId).length,2);
  assert.deepEqual([...new Uint8Array(await new Response(result.body.openStream()).arrayBuffer())],[1,2,3]);assert.equal(voices,1);assert.equal(current.snapshot().exposure.size,persisted.snapshot().exposure.size);
  assert.equal(await current.batch(()=>service.selectReaction(host,localId,selector)),null);
 });

 await check('inactive local mirror blurbs expire after 90 days without changing saved score fixture',()=>{
  query("update public.clubhouse_commentary_items set updated_at=clock_timestamp()-interval '91 days'where scope_id='"+scope+"'and collection='localSessions';set role service_role;select public.clubhouse_commentary_expire('"+scope+"');reset role;");assert.equal(query("select count(*)from public.clubhouse_commentary_items where scope_id='"+scope+"'and collection='localSessions';"),'0');assert.equal(query("select score from public.test_scores where id='existing-score';"),'50');
 });

 await check('incremental patches retain canonical anti-delete and immutable owner guards',async()=>{
  const current=await store().initialize();const old=current.snapshot();const attemptId=[...old.attempts.keys()][0];assert(attemptId);await assert.rejects(current.transaction(state=>state.attempts.delete(attemptId)),/cannot|erase|retained|delete/i);
  const after=await store().initialize();assert(after.snapshot().attempts.has(attemptId));
 });
 await check('atomic batch validates room revisions, retains read-only versions, and rejects stale authorization snapshots',async()=>{
  const current=await store().initialize(),revision=Number(query("select revision from public.clubhouse_rooms where id='"+roomId+"';"));
  const read=await rpc('clubhouse_commentary_batch',{p_scope:scope,p_expected_version:current.version,p_changes:{},p_deleted:{},p_rooms:[{id:roomId,revision}]});assert.equal(read.committed,true);assert.equal(read.version,current.version);
  const stale=await rpc('clubhouse_commentary_batch',{p_scope:scope,p_expected_version:current.version,p_changes:{settings:{forged:{enabled:true}}},p_deleted:{},p_rooms:[{id:roomId,revision:revision-1}]});assert.equal(stale.committed,false);assert.equal((await store().initialize()).snapshot().settings.has('forged'),false);
 });
 await check('atomic provider dispatch consumes the last global writer slot exactly once and cannot redispatch or refund',async()=>{
  const id1='00000000-0000-4000-8000-000000000071',id2='00000000-0000-4000-8000-000000000072',job1='00000000-0000-4000-8000-000000000073',job2='00000000-0000-4000-8000-000000000074',allowanceId='atomic-sql-qualification';
  const current=await store().initialize();limit(400);
  await current.transaction(state=>{const used=state.budgets.get(roomId)||{requests:0,characters:0};state.budgets.set(roomId,{requests:used.requests+2,characters:used.characters+20});for(const[id,j]of[[id1,job1],[id2,job2]]){state.jobs.set(j,{id:j,roomId,status:'generating',workerToken:id,profile:{enabled:true},facts:{},audience:[host]});state.attempts.set(id,{id,jobId:j,stage:'writer',status:'submitted',characters:10});}});
  query("insert into public.clubhouse_commentary_items(scope_id,collection,item_key,value) select '"+scope+"','attempts','atomic-seeded-'||n,jsonb_build_object('id','atomic-seeded-'||n,'stage','writer','allowanceId','"+allowanceId+"','providerDispatchedAt',1,'submittedCharacters',1,'status','succeeded')from generate_series(1,199)n;update public.clubhouse_commentary_scopes set version=version+1 where id='"+scope+"';");
  const input=(id,jobId)=>({roomId,jobId,requestId:id,stage:'writer',provider:'anthropic',model:'fixture-model',submittedCharacters:10,maxOutputTokens:512,allowanceId,expiresAt:Date.now()+3600000});
  assert.equal((await rpc('clubhouse_commentary_dispatch',{p_scope:scope,p_input:input(id1,job1)})).committed,true);
  await assert.rejects(rpc('clubhouse_commentary_dispatch',{p_scope:scope,p_input:input(id1,job1)}),/dispatchable/);
  await assert.rejects(rpc('clubhouse_commentary_dispatch',{p_scope:scope,p_input:input(id2,job2)}),/ceiling/);
  assert.equal(await rpc('clubhouse_commentary_finish',{p_scope:scope,p_id:id1,p_metadata:{status:'completed',elapsedMs:1}}),true);
  const after=await store().initialize();assert(after.snapshot().attempts.get(id1).providerDispatchedAt);assert.equal(after.snapshot().attempts.get(id2).providerDispatchedAt,undefined);
 });
 await check('atomic TTS dispatch rejects an expired lease and retains the global spoken-character ceiling',async()=>{
  const id='00000000-0000-4000-8000-000000000075',jobId='00000000-0000-4000-8000-000000000076',allowanceId='atomic-sql-voice-qualification',current=await store().initialize();limit(400);
  await current.transaction((state,clock)=>{const old=state.leases.get(roomId),epoch=(old?.epoch||0)+1,claim={owner:host,device:'atomic-sql-phone',epoch,token:'atomic-voice-claim'};state.leases.set(roomId,{...claim,expiresAt:clock.databaseNowMs+14000,activeJobId:jobId});state.jobs.set(jobId,{id:jobId,roomId,status:'streaming',activeTtsAttemptId:id,claim,profile:{enabled:true},facts:{},audience:[host]});state.attempts.set(id,{id,jobId,stage:'tts',status:'submitted',characters:2});const b=state.budgets.get(roomId);b.requests++;b.characters+=2;});
  query("update public.clubhouse_commentary_items set value=jsonb_set(value,'{expiresAt}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)-1))where scope_id='"+scope+"'and collection='leases'and item_key='"+roomId+"';update public.clubhouse_commentary_scopes set version=version+1 where id='"+scope+"';");
  const input={roomId,jobId,requestId:id,stage:'tts',provider:'elevenlabs',model:'eleven_flash_v2_5',submittedCharacters:2,allowanceId,expiresAt:Date.now()+3600000};
  await assert.rejects(rpc('clubhouse_commentary_dispatch',{p_scope:scope,p_input:input}),/lease expired/);
  query("update public.clubhouse_commentary_items set value=jsonb_set(value,'{expiresAt}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)+14000))where scope_id='"+scope+"'and collection='leases'and item_key='"+roomId+"';insert into public.clubhouse_commentary_items(scope_id,collection,item_key,value)values('"+scope+"','attempts','atomic-voice-spent',jsonb_build_object('id','atomic-voice-spent','stage','tts','status','succeeded','providerDispatchedAt',1,'allowanceId','"+allowanceId+"','submittedCharacters',35999));update public.clubhouse_commentary_scopes set version=version+1 where id='"+scope+"';");
  await assert.rejects(rpc('clubhouse_commentary_dispatch',{p_scope:scope,p_input:input}),/ceiling/);assert.equal((await store().initialize()).snapshot().attempts.get(id).providerDispatchedAt,undefined);
 });
 report.passed=true;
}catch(error){report.failure=error.message;throw error;}finally{report.finishedAt=new Date().toISOString();mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));if(created)spawnSync('docker',['rm','-f',container],{encoding:'utf8',timeout:10000});console.log(`Evidence ${directory}/report.json`);}

