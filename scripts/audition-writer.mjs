import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,unlinkSync,fsyncSync,renameSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createAnthropicWriter,buildAnthropicWriterRequest,parseAnthropicCredential} from '../server/commentary/anthropic-writer.js';
import {correctedWriterAuditionFixtures} from '../server/commentary/writer-audition-fixtures.js';
const MODEL='claude-haiku-4-5-20251001';
export function writerAuditionManifest(){
 const fixtures=correctedWriterAuditionFixtures(),requests=fixtures.flatMap(fixture=>[1,2].map(attempt=>{const request=buildAnthropicWriterRequest(fixture.input,{model:MODEL,maxOutputTokens:256});return {fixtureId:fixture.id,attempt,purpose:fixture.input.purpose,source:fixture.source,payloadHash:createHash('sha256').update(request.payload).digest('hex'),inputJsonBytes:Buffer.byteLength(request.payload),submittedCharacters:request.submittedCharacters,maxOutputTokens:256};}));
 const manifest={schemaVersion:2,state:'proposal-only-no-generation',model:MODEL,promptVersion:4,requests,caps:{maxRequests:6,maxAttemptsPerFixture:2,maxInputJsonBytes:requests.reduce((sum,r)=>sum+r.inputJsonBytes,0),maxOutputTokensPerRequest:256,maxOutputTokensTotal:1536,spokenCharacters:180,spokenWords:32,deadlineMs:15000,maxResponseBytes:20000},profiles:'fictional Alex/Sam blurbs; selected target profile only; not actual Dan/Amber personal data',authority:'creative-only model fields; server assigns game/event/profile/target/provenance; no named rival in personalized score',optionalVoiceFollowup:{voiceOption:'rachel',model:'eleven_flash_v2_5',maxRequests:3,maxCharacters:540,state:'proposal only; prior four-voice allowance exhausted; needs new task-specific allowance'},previousWriterAllowance:'all four v1 requests exhausted; original manifest ledger remains intact',retention:'application heard-commentary/feedback90days; audition provider retention reviewed separately'};
 return {...manifest,hash:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')};
}
export function remainingAuditionIndices(ledger,manifest,{continueExistingFailures=false}={}){
 if(ledger.manifestHash!==manifest.hash)throw Error('Manifest ledger mismatch');
 return manifest.requests.flatMap((spec,index)=>{
  const prior=ledger.attempts.find(attempt=>attempt.index===index);
  if(ledger.attempts.some(attempt=>manifest.requests[attempt.index]?.fixtureId===spec.fixtureId&&attempt.status==='completed'))return [];
  if(!prior)return [index];if(continueExistingFailures&&['failed','unknown'].includes(prior.status))return [];throw Error('Earlier failed/unknown attempt needs explicit human review; no retry of consumed attempt');
 });
}
export function createAuditionLedgerGate(ledger,manifest,save){
 return {
  async reserve({requestId,model,submittedCharacters,maxOutputTokens}){
   const index=Number(requestId.replace('fixture-','')),spec=manifest.requests[index];
   if(!Number.isSafeInteger(index)||!spec||model!==manifest.model||maxOutputTokens!==256||submittedCharacters!==spec.submittedCharacters||ledger.attempts.some(a=>a.index===index)||ledger.attempts.some(a=>manifest.requests[a.index]?.fixtureId===spec.fixtureId&&a.status==='completed')||ledger.attempts.filter(a=>manifest.requests[a.index]?.fixtureId===spec.fixtureId).length>=2||ledger.attempts.length>=manifest.caps.maxRequests||ledger.attempts.reduce((n,a)=>n+a.inputJsonBytes,0)+spec.inputJsonBytes>manifest.caps.maxInputJsonBytes)throw Error('Audition budget or retry blocked');
   const attempt={id:requestId,index,status:'submitted',payloadHash:spec.payloadHash,inputJsonBytes:spec.inputJsonBytes,submittedCharacters,maxOutputTokens};ledger.attempts.push(attempt);await save(ledger); // disk persistence BEFORE dispatch
   return {id:requestId,durable:true,approved:true};
  },
  async finish(id,changes){const attempt=ledger.attempts.find(a=>a.id===id);if(!attempt)throw Error('Unknown attempt');Object.assign(attempt,changes);await save(ledger);},
 };
}
export async function main(args=process.argv.slice(2)){
 const options={};for(let i=0;i<args.length;i++){if(!args[i].startsWith('--'))throw Error('Named options required');const name=args[i].slice(2);if(['allow-paid','key-ready','continue-existing-failures'].includes(name))options[name]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Option value required');options[name]=args[++i];}}
 const mode=options.mode||'dry-run';if(!['dry-run','generate'].includes(mode))throw Error('Unknown mode');
 const root=resolve('artifacts'),out=resolve(options.out||'artifacts/sw026-writer/audition-v2'),rel=relative(root,out);if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Use ignored artifacts output');mkdirSync(out,{recursive:true});
 const manifest=writerAuditionManifest();if(mode==='dry-run'){writeFileSync(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({state:manifest.state,hash:manifest.hash,caps:manifest.caps}));return;}
 if(!options['allow-paid']||!options['key-ready']||options['approved-hash']!==manifest.hash||!options['credential-file'])throw Error('Explicit paid approval, readiness and exact approved manifest required');
 if(Number(options['max-requests'])!==6||Number(options['max-input-json-bytes'])!==manifest.caps.maxInputJsonBytes||Number(options['max-output-tokens'])!==1536)throw Error('Exact approved caps required');
 const ledgerDirectory=resolve('artifacts/sw026-writer/ledgers');mkdirSync(ledgerDirectory,{recursive:true});
 const ledgerPath=resolve(ledgerDirectory,manifest.hash+'.json'),lockPath=resolve(ledgerDirectory,manifest.hash+'.lock'),lock=openSync(lockPath,'wx');
 try{
  let ledger;try{ledger=JSON.parse(readFileSync(ledgerPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;ledger={manifestHash:manifest.hash,attempts:[]};}if(ledger.manifestHash!==manifest.hash)throw Error('Manifest ledger mismatch');
  const gate=createAuditionLedgerGate(ledger,manifest,async value=>{const temporary=ledgerPath+'.tmp',fd=openSync(temporary,'w');try{writeFileSync(fd,JSON.stringify(value,null,2));fsyncSync(fd);}finally{closeSync(fd);}renameSync(temporary,ledgerPath);});
  // Only this explicit approved generation branch may read the original credential file.
  const key=parseAnthropicCredential(readFileSync(options['credential-file'],'utf8'));
  const writer=createAnthropicWriter({model:MODEL,getKey:async()=>key,workspaceId:options.workspace,allowPaid:true,budgetGate:gate,limits:{maxRequests:6,maxInputCharacters:16000,maxOutputTokens:256,deadlineMs:15000,maxResponseBytes:20000}});
  const fixtures=correctedWriterAuditionFixtures();
  for(const index of remainingAuditionIndices(ledger,manifest,{continueExistingFailures:options['continue-existing-failures']===true})){
   const spec=manifest.requests[index];if(ledger.attempts.some(a=>manifest.requests[a.index]?.fixtureId===spec.fixtureId&&a.status==='completed'))continue;
   const fixture=fixtures.find(f=>f.id===spec.fixtureId);const line=await writer.write(fixture.input,{requestId:'fixture-'+index});writeFileSync(resolve(out,fixture.id+'.json'),JSON.stringify(line,null,2));
  }
  console.log('Remaining distinct writer fixtures processed; inspect ledger for failed/unknown originals. No voice generation or first-audible measurement.');
 }finally{closeSync(lock);unlinkSync(lockPath);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Writer audition stopped. Review approved scope and local ledger; no credential/provider body is printed.');process.exitCode=1;});

