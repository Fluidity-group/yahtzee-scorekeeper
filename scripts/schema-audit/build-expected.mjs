import{createAuditRuntime,catalogSnapshot}from'./runtime.mjs';import{platformDefaultsFromExport}from'./export.mjs';import{readFileSync,readdirSync,mkdirSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{groups}from'./compare.mjs';
const db=await createAuditRuntime(),directory='artifacts/sw078/schema-audit',opsQuery=readFileSync('scripts/schema-audit/operations.sql','utf8');
const platformPath=process.argv[2],platformText=platformPath?readFileSync(platformPath,'utf8'):null,platformDefaults=platformText?platformDefaultsFromExport(platformText):[];
const files=readdirSync('supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)&&f.slice(0,12)<='202610240003').sort(),manifest=[],ownership=new Map(),extensions=new Map();
const hash=s=>createHash('sha256').update(s).digest('hex');
const snapshot=()=>catalogSnapshot(db);
try{
 for(const statement of platformDefaults)await db.exec(statement);
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
 const expected={...prior,platformDefaults:{sourceSha256:platformText?hash(platformText):null,statements:platformDefaults},requiredExtensions:[...extensions.values()]};
 const operations=(await db.exec(opsQuery)).find(r=>r.rows?.[0]?.operations_audit)?.rows[0].operations_audit;
 mkdirSync(directory,{recursive:true});writeFileSync(directory+'/expected-catalog.json',JSON.stringify(expected,null,2)+'\n');writeFileSync(directory+'/expected-operations.json',JSON.stringify(operations,null,2)+'\n');writeFileSync(directory+'/migration-manifest.json',JSON.stringify({migrations:manifest,platformDefaults:expected.platformDefaults,objectOwnership:Object.fromEntries(ownership),scope:'16 cumulative migrations only; Studio202610310001 excluded. Local PGlite actual project DDL; extensions/scheduler/network/Vault platform boundaries are inert fixtures. No live database, credentials or player rows.'},null,2)+'\n');
 console.log(JSON.stringify({migrations:manifest.length,groups:Object.fromEntries(groups.map(g=>[g,expected[g].length])),requiredExtensions:expected.requiredExtensions,scope:'Local expected schema only; live match not yet established.'}));
}catch(error){console.error(JSON.stringify({error:error.message,code:error.code,position:error.position}));process.exitCode=1;}finally{await db.close();}
