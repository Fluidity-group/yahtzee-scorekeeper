import {createRequire}from'node:module';import{resolve}from'node:path';import{readFileSync,readdirSync,mkdirSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{groups}from'./compare.mjs';
const{PGlite}=createRequire(resolve(process.env.ROOM_SQL_RUNTIME||'artifacts/sw074/sql-runtime/package.json'))('@electric-sql/pglite');
const db=await PGlite.create(),directory='artifacts/sw078/schema-audit',query=readFileSync('scripts/schema-audit/catalog.sql','utf8'),opsQuery=readFileSync('scripts/schema-audit/operations.sql','utf8');
const files=readdirSync('supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)&&f.slice(0,12)<='202610240003').sort(),manifest=[],ownership=new Map(),extensions=new Map();
const hash=s=>createHash('sha256').update(s).digest('hex');
const snapshot=async()=>{const results=await db.exec(query);return results.find(r=>r.rows?.[0]?.schema_audit)?.rows[0].schema_audit;};
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid()to authenticated,service_role;create publication supabase_realtime;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text,created_at timestamptz);create schema extensions;create schema vault;create schema net;create schema cron;create table vault.decrypted_secrets(name text,decrypted_secret text);create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int)returns bigint language sql as $$select 0::bigint$$;create table cron.job(jobid bigint generated always as identity primary key,jobname text unique,schedule text,command text,active boolean default true);create function cron.schedule(job_name text,schedule text,command text)returns bigint language sql as $$insert into cron.job(jobname,schedule,command)values(job_name,schedule,command)on conflict(jobname)do update set schedule=excluded.schedule,command=excluded.command returning jobid$$;create function cron.alter_job(job_id bigint,active boolean)returns void language sql as $$update cron.job set active=alter_job.active where jobid=job_id$$;`);
 let prior=await snapshot();
 for(const file of files){
  const sql=readFileSync('supabase/migrations/'+file,'utf8'),version=file.slice(0,12);
  for(const m of sql.matchAll(/^create extension if not exists (\w+) with schema (\w+);/gmi))extensions.set(m[1],{key:m[1],schema:m[2]});
  // Only the actual extension installation boundary is stubbed. Project DDL,
  // function bodies, policies, grants, publication and config statements are unchanged.
  await db.exec(sql.replace(/^create extension if not exists \w+ with schema \w+;/gmi,''));
  const next=await snapshot(),changed=[];
  for(const group of groups){const old=new Map(prior[group].map(x=>[x.key,JSON.stringify(x)]));for(const object of next[group])if(old.get(object.key)!==JSON.stringify(object)){const id=group+':'+object.key;ownership.set(id,{introducedIn:ownership.get(id)?.introducedIn||version,lastChangedIn:version});changed.push(id);}}
  manifest.push({version,file,sha256:hash(sql),changedObjects:changed});prior=next;
 }
 const expected={...prior,requiredExtensions:[...extensions.values()]};
 const operations=(await db.exec(opsQuery)).find(r=>r.rows?.[0]?.operations_audit)?.rows[0].operations_audit;
 mkdirSync(directory,{recursive:true});writeFileSync(directory+'/expected-catalog.json',JSON.stringify(expected,null,2)+'\n');writeFileSync(directory+'/expected-operations.json',JSON.stringify(operations,null,2)+'\n');writeFileSync(directory+'/migration-manifest.json',JSON.stringify({migrations:manifest,objectOwnership:Object.fromEntries(ownership),scope:'16 cumulative migrations only; Studio202610310001 excluded. Local PGlite actual project DDL; extensions/scheduler/network/Vault platform boundaries are inert fixtures. No live database, credentials or player rows.'},null,2)+'\n');
 console.log(JSON.stringify({migrations:manifest.length,groups:Object.fromEntries(groups.map(g=>[g,expected[g].length])),requiredExtensions:expected.requiredExtensions,scope:'Local expected schema only; live match not yet established.'}));
}catch(error){console.error(JSON.stringify({error:error.message,code:error.code,position:error.position}));process.exitCode=1;}finally{await db.close();}
