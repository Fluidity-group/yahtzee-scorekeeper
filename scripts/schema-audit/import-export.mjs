import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{createHash}from'node:crypto';import{createAuditRuntime,catalogSnapshot}from'./runtime.mjs';import{schemaStatements,releasedCatalogFacts}from'./export.mjs';
const[schemaPath,catalogPath]=process.argv.slice(2);if(!schemaPath||!catalogPath)throw Error('Provide administrator-released schema SQL and catalog TXT paths.');
const schema=readFileSync(schemaPath,'utf8'),catalog=readFileSync(catalogPath,'utf8'),facts=releasedCatalogFacts(catalog),db=await createAuditRuntime();
try{
 const statements=schemaStatements(schema);
 for(let n=0;n<statements.length;n++){try{await db.exec(statements[n]);}catch(error){throw Object.assign(Error('Local schema import failed at statement '+n+': '+error.message),{code:error.code});}}
 const actual=await catalogSnapshot(db),canonicalizedMajor=actual.serverMajor,canonicalizedAt=actual.observedAt;
 const stamp=schemaPath.match(/schema-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.sql$/);if(stamp)actual.observedAt=`${stamp[1]}-${stamp[2]}-${stamp[3]}T${stamp[4]}:${stamp[5]}:${stamp[6]}Z`;actual.canonicalizedAt=canonicalizedAt;
 actual.serverMajor=facts.serverMajor;actual.extensions=facts.extensions;actual.publicationTables=facts.publications;
 actual.source={type:'administrator-released schema-only export, canonicalized locally',schemaSha256:createHash('sha256').update(schema).digest('hex'),catalogSha256:createHash('sha256').update(catalog).digest('hex'),serverVersion:facts.serverVersion,exportSessionReadOnly:facts.exportSessionReadOnly,canonicalizedMajor,exportObservedAt:actual.observedAt,noLiveSqlIssued:true};
 mkdirSync('artifacts/sw078/schema-audit',{recursive:true});writeFileSync('artifacts/sw078/schema-audit/live-canonicalized.json',JSON.stringify(actual,null,2)+'\n');writeFileSync('artifacts/sw078/schema-audit/live-operations.json',JSON.stringify({auditVersion:1,readOnly:true,source:actual.source,jobs:facts.jobs,buckets:facts.buckets},null,2)+'\n');
 console.log(JSON.stringify({statements:statements.length,liveServer:facts.serverVersion,canonicalizedMajor,tables:actual.tables.length,functions:actual.functions.length,noLiveSqlIssued:true}));
}catch(error){console.error(JSON.stringify({error:error.message,code:error.code}));process.exitCode=1;}finally{await db.close();}
