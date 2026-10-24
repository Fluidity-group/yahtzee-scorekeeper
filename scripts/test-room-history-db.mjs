// Disposable PostgreSQL16 acceptance of migration/atomicity/RLS; no hosted access.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setRematchReady} from '../src/multiplayer/rematch.js';
import {BASE_KEYS} from '../src/game/categories.js';
const image=process.env.ROOM_TEST_DB_IMAGE||'timescale/timescaledb:2.29.2-pg16';
const name=`yahtzee-history-${randomUUID().slice(0,8)}`,directory='artifacts/sw017-rematch';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003',time='2026-10-13T18:00:00.000Z';
const sqlString=value=>`'${String(value).replaceAll("'","''")}'`;
const json=value=>`${sqlString(JSON.stringify(value))}::jsonb`;
const migration=readFileSync('supabase/migrations/202610130001_hosted_game_history.sql','utf8');
const tournamentMigration=readFileSync('supabase/migrations/202610140001_hosted_tournaments.sql','utf8');
const report={startedAt:new Date().toISOString(),image,migrationSha256:createHash('sha256').update(migration).digest('hex'),checks:[],passed:false};
report.tournamentMigrationSha256=createHash('sha256').update(tournamentMigration).digest('hex');
let created=false;
function run(sql){return spawnSync('docker',['exec','-i',name,'psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:30000});}
function query(sql){const result=run(sql);if(result.status!==0)throw Error(result.stderr);return result.stdout.trim();}
function check(label,test){test();report.checks.push({label,passed:true});console.log(`PASS ${label}`);}
const commit=(room,revision,actor,command='ready-command',fingerprint='same-payload')=>`select public.clubhouse_commit_game('${room.id}',${revision},${json(room)},'${actor}',${sqlString(command)},${sqlString(fingerprint)});`;
try{
 execFileSync('docker',['run','--rm','-d','--network','none','--tmpfs','/var/lib/postgresql/data','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust',image],{encoding:'utf8',timeout:30000});created=true;
 let available=false;for(let n=0;n<60;n++){const r=spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{encoding:'utf8',timeout:2000});if(r.status===0){available=true;break;}await new Promise(resolve=>setTimeout(resolve,250));}
 assert(available,'isolated PostgreSQL did not start');
 query(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 insert into auth.users values('${host}'),('${guest}'),('${outsider}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;
 create publication supabase_realtime;`);
 query(readFileSync('supabase/migrations/202609160001_rooms.sql','utf8'));
 let room=startRoom(joinRoom(createRoom({id:'00000000-0000-4000-8000-000000000009',code:'ABCDEFGH',userId:host,name:'Captain Custard',time}),{userId:guest,name:'Queen of Dice',time}),{userId:host,time});
 const insert=value=>query(`insert into public.clubhouse_rooms(id,code,host_id,member_ids,revision,state,created_at) values('${value.id}','${value.code}','${value.hostId}',array[${value.members.map(m=>`'${m.userId}'::uuid`).join(',')}],${value.revision},${json(value)},'${time}');`);
 const active=structuredClone(room);
 for(let n=0;room.game.status!=='finished';n++){const seat=room.game.activeSeat,category=BASE_KEYS.find(k=>room.game.sheets[seat][k]===undefined);room=playRoom(room,{userId:room.members[seat].userId,expectedRevision:room.revision,commandId:`score-${n}-command`,action:{type:'score',category,value:seat===1&&category==='largeStraight'?40:0},time});}
 insert(room);
 const another={...active,id:'00000000-0000-4000-8000-000000000008',code:'ABCDEFGJ',game:{...active.game,id:'00000000-0000-4000-8000-000000000008'}};insert(another);
 insert(createRoom({id:'00000000-0000-4000-8000-000000000007',code:'ABCDEFGK',userId:host,name:'Host',time}));
 query(migration);query(migration);
 check('migration/backfill preserves active and finished snapshots, skips lobby and safely reruns',()=>{
  assert.equal(query('select count(*) from public.clubhouse_games;'),'2');
  assert.deepEqual(JSON.parse(query(`select state from public.clubhouse_games where id='${room.game.id}';`)),room.game);
 });
 check('history read is participant-only through PostgreSQL RLS',()=>{
  assert.equal(query(`set role authenticated;set request.jwt.claim.sub='${guest}';select count(*) from public.clubhouse_games;`),'SET\nSET\n2');
  assert.equal(query(`set role authenticated;set request.jwt.claim.sub='${outsider}';select count(*) from public.clubhouse_games;`),'SET\nSET\n0');
 });
 check('authenticated users cannot write history or execute trusted commit RPC',()=>{
  assert.notEqual(run(`set role authenticated;delete from public.clubhouse_games;`).status,0);
  assert.notEqual(run(`set role authenticated;${commit(room,room.revision,guest)}`).status,0);
 });
 const first=setRematchReady(room,{userId:host,gameId:room.game.id,gameRevision:room.game.revision,ready:true,commandId:'ready-first',nextGameId:randomUUID(),time});
 check('trusted readiness atomically persists game and receipt',()=>assert.equal(query(`set role service_role;${commit(first,room.revision,host,'ready-first')}`),'SET\nt'));
 check('accepted command retries cannot mutate state or change actor/payload',()=>{
  assert.equal(query(`set role service_role;${commit(first,room.revision,host,'ready-first')}`),'SET\nf');
  assert.notEqual(run(`set role service_role;${commit(first,room.revision,guest,'ready-first')}`).status,0);
  assert.notEqual(run(`set role service_role;${commit(first,room.revision,host,'ready-first','different')}`).status,0);
 });
 const next=setRematchReady(first,{userId:guest,gameId:room.game.id,gameRevision:room.game.revision,ready:true,commandId:'ready-final',nextGameId:'00000000-0000-4000-8000-000000000099',time});
 check('successor sequence conflict rolls back pointer, archive and readiness receipt',()=>{
  assert.notEqual(run(`set role service_role;${commit({...next,gameSequence:1},first.revision,guest,'failed-sequence')}`).status,0);
  assert.equal(query(`select revision from public.clubhouse_rooms where id='${room.id}';`),String(first.revision));
  assert.equal(query("select count(*) from public.clubhouse_room_receipts where command_id='failed-sequence';"),'0');
  assert.equal(query(`select count(*) from public.clubhouse_games where id='${next.game.id}';`),'0');
 });
 check('cross-table game identity collision cannot overwrite another table history',()=>{
  const collision={...next,game:{...next.game,id:another.game.id}};
  assert.notEqual(run(`set role service_role;${commit(collision,first.revision,guest,'failed-identity')}`).status,0);
  assert.deepEqual(JSON.parse(query(`select state from public.clubhouse_games where id='${another.game.id}';`)),another.game);
 });
 check('successor retains original history and winner account with distinct identity',()=>{
  assert.equal(query(`set role service_role;${commit(next,first.revision,guest,'ready-final')}`),'SET\nt');
  assert.equal(query(`select count(*) from public.clubhouse_games where room_id='${room.id}';`),'2');
  assert.deepEqual(JSON.parse(query(`select state from public.clubhouse_games where id='${room.game.id}';`)),room.game);
  assert.deepEqual(JSON.parse(query(`select state->'game' from public.clubhouse_rooms where id='${room.id}';`)),next.game);
 });
 query(tournamentMigration);query(tournamentMigration);
 check('tournament capability is service-only without changing rematch RPC',()=>{
  assert.equal(query('set role service_role;select public.clubhouse_tournaments_available();'),'SET\nt');
  assert.equal(query('set role service_role;select public.clubhouse_rematch_available();'),'SET\nt');
  assert.notEqual(run('set role authenticated;select public.clubhouse_tournaments_available();').status,0);
 });
 let tour=startRoom(joinRoom(createRoom({id:'00000000-0000-4000-8000-000000000050',code:'ABCDEFGM',userId:host,name:'Host',time,tournament:{name:'Two nights',gameCount:2,playerCount:2}}),{userId:guest,name:'Guest',time}),{userId:host,time});
 insert(tour);
 const invalid=(state,label)=>check(label,()=>{
  assert.notEqual(run(`set role service_role;${commit({...state,revision:tour.revision+1},tour.revision,host,`invalid-${report.checks.length}`)}`).status,0);
  assert.equal(query(`select revision from public.clubhouse_rooms where id='${tour.id}';`),String(tour.revision));
 });
 invalid({...tour,tournament:{...tour.tournament,name:'Changed'}},'started tournament name and limits are immutable');
 invalid({...tour,tournament:{...tour.tournament,rules:{...tour.tournament.rules,rolls:99}}},'tournament rule snapshot cannot change');
 invalid({...tour,tournament:undefined},'started tournament metadata cannot be removed');
 invalid({...tour,gameSequence:2},'same game cannot take a new tournament sequence');
 invalid({...tour,game:{...tour.game,players:tour.game.players.map((p,i)=>i?{...p,id:outsider}:p)}},'game history cannot switch tournament account identity');
 const paused={...tour,revision:tour.revision+1,tournament:{...tour.tournament,status:'paused'}};
 check('pause commits through existing atomic history RPC',()=>assert.equal(query(`set role service_role;${commit(paused,tour.revision,host,'pause-tournament')}`),'SET\nt'));tour=paused;
 invalid({...tour,game:{...tour.game,revision:tour.game.revision+1}},'paused tournament rejects game changes even in trusted commit');
 const resumed={...tour,revision:tour.revision+1,tournament:{...tour.tournament,status:'playing'}};
 assert.equal(query(`set role service_role;${commit(resumed,tour.revision,host,'resume-tournament')}`),'SET\nt');tour=resumed;
 function finish(value){for(let n=0;value.game.status!=='finished';n++){const seat=value.game.activeSeat,category=BASE_KEYS.find(k=>value.game.sheets[seat][k]===undefined);value=playRoom(value,{userId:value.members[seat].userId,expectedRevision:value.revision,gameId:value.game.id,commandId:`tour-score-${n}-command`,action:{type:'score',category,value:0},time});}return value;}
 // Domain applies each accepted scoring command; one bounded test snapshot commit follows.
 const finished=finish(tour);finished.revision=tour.revision+1;
 assert.equal(query(`set role service_role;${commit(finished,tour.revision,host,'finish-first')}`),'SET\nt');tour=finished;
 const ready=setRematchReady(tour,{userId:host,gameId:tour.game.id,gameRevision:tour.game.revision,ready:true,commandId:'tour-ready-first',nextGameId:randomUUID(),time});
 assert.equal(query(`set role service_role;${commit(ready,tour.revision,host,'tour-ready-first')}`),'SET\nt');tour=ready;
 const successor=setRematchReady(tour,{userId:guest,gameId:tour.game.id,gameRevision:tour.game.revision,ready:true,commandId:'tour-ready-final',nextGameId:'00000000-0000-4000-8000-000000000051',time});
 invalid({...successor,gameSequence:3},'target game count prevents excess successor');
 assert.equal(query(`set role service_role;${commit(successor,tour.revision,guest,'tour-ready-final')}`),'SET\nt');tour=successor;
 const completed=finish(tour);completed.revision=tour.revision+1;
 invalid({...completed,tournament:{...completed.tournament,status:'playing'}},'final finished game must complete tournament');
 check('final game commits completed status and preserves both category/event histories',()=>{
  assert.equal(query(`set role service_role;${commit(completed,tour.revision,host,'finish-final')}`),'SET\nt');
  assert.equal(query(`select count(*) from public.clubhouse_games where room_id='${tour.id}' and ended_at is not null;`),'2');
  assert.equal(query(`select state->'tournament'->>'status' from public.clubhouse_rooms where id='${tour.id}';`),'completed');
 });tour=completed;
 invalid({...tour,gameSequence:3,game:{...tour.game,id:randomUUID(),status:'active',endedAt:null}},'completed tournament cannot append another game');
 const competitionMigration=readFileSync('supabase/migrations/202610140002_competition_final_chain.sql','utf8');
 report.competitionMigrationSha256=createHash('sha256').update(competitionMigration).digest('hex');query(competitionMigration);
 check('Competition v2 capability is service-only and idempotent',()=>{
  query(competitionMigration);
  assert.equal(query('set role service_role;select public.clubhouse_competition_v2_available();'),'SET\nt');
  assert.equal(query("select has_function_privilege('authenticated','public.clubhouse_competition_v2_available()','EXECUTE');"),'f');
 });
 let chainRoom=startRoom(joinRoom(createRoom({id:'00000000-0000-4000-8000-000000000070',code:'CHAINXYZ',userId:host,name:'Host',mode:'competition',rulesVersion:2,time}),{userId:guest,name:'Guest',time}),{userId:host,time});
 let chainCommand=0;
 for(const category of [...BASE_KEYS.filter(k=>k!=='yahtzee'),'yahtzee'])for(const userId of [host,guest])chainRoom=playRoom(chainRoom,{userId,gameId:chainRoom.game.id,expectedRevision:chainRoom.revision,commandId:`chain-score-${chainCommand++}`,action:{type:'score',category,value:userId===guest&&category==='yahtzee'?50:0},time});
 insert(chainRoom);
 check('final Yahtzee chain remains active and atomically persists bonus attempt chronology',()=>{
  assert.equal(chainRoom.game.status,'active');assert.equal(chainRoom.game.finalChain.seat,1);
  const next=playRoom(chainRoom,{userId:guest,gameId:chainRoom.game.id,expectedRevision:chainRoom.revision,commandId:'database-chain-success',action:{type:'final-chain-roll',face:2},time});
  assert.equal(query(`set role service_role;${commit(next,chainRoom.revision,guest,'database-chain-success')}`),'SET\nt');chainRoom=next;
  assert.equal(query(`select state->'sheets'->1->>'yahtzeeBonus' from public.clubhouse_games where id='${chainRoom.game.id}';`),'100');
  assert.equal(query(`select ended_at is null from public.clubhouse_games where id='${chainRoom.game.id}';`),'t');
 });
 check('only three failures finish final chain and persist one complete snapshot',()=>{
  for(let n=1;n<=3;n++){
   const next=playRoom(chainRoom,{userId:guest,gameId:chainRoom.game.id,expectedRevision:chainRoom.revision,commandId:`database-chain-failure-${n}`,action:{type:'final-chain-roll',face:null},time});
   assert.equal(query(`set role service_role;${commit(next,chainRoom.revision,guest,`database-chain-failure-${n}`)}`),'SET\nt');chainRoom=next;
   assert.equal(chainRoom.game.status,n===3?'finished':'active');
  }
  assert.equal(query(`select state=${json(chainRoom.game)} and ended_at is not null from public.clubhouse_games where id='${chainRoom.game.id}';`),'t');
 });
 check('Standard undo atomically reopens completed tournament without losing accepted score history',()=>{
  const original=structuredClone(tour.game),target=original.events.findLast(e=>e.type==='score'),actor=tour.members[target.seat].userId;
  const reopened=playRoom(tour,{userId:actor,gameId:tour.game.id,expectedRevision:tour.revision,commandId:'database-final-score-undo',action:{type:'undo-score',target:target.id},time});
  assert.equal(query(`set role service_role;${commit(reopened,tour.revision,actor,'database-final-score-undo')}`),'SET\nt');
  assert.equal(query(`select state->'tournament'->>'status' from public.clubhouse_rooms where id='${tour.id}';`),'playing');
  assert.equal(query(`select state=${json(reopened.game)} and ended_at is null from public.clubhouse_games where id='${tour.game.id}';`),'t');
  assert.equal(query(`select count(*) from public.clubhouse_games where room_id='${tour.id}' and ended_at is not null;`),'1');
  assert(reopened.game.events.some(e=>e.id===target.id));assert(reopened.game.events.some(e=>e.type==='score-undo'&&e.target===target.id));
 });
 report.postgresVersion=query('select version();');report.passed=true;
}catch(error){report.error=error.message;console.error(error.message);process.exitCode=1;}
finally{
 if(created)spawnSync('docker',['rm','-f',name],{encoding:'utf8',timeout:30000});
 report.completedAt=new Date().toISOString();mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/database-report.json`,JSON.stringify(report,null,2));
 console.log(`Evidence: ${directory}/database-report.json`);
}
