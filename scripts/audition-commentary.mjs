import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const LINES = [
  { id:'full-house', facts:{player:'Alex',category:'Full House',score:25}, dark:'Alex, twenty-five for Full House. Even the haunted property market has standards.', clean:'Alex, twenty-five for Full House. Even the haunted property market has standards.' },
  { id:'large-straight', facts:{player:'Sam',category:'Large Straight',score:40}, dark:'Sam, forty for Large Straight. Finally, something in this room without a fucking detour.', clean:'Sam, forty for Large Straight. Finally, something in this room without a tragic detour.' },
  { id:'yahtzee', facts:{player:'Priya',category:'Yahtzee',score:50}, dark:'Priya, fifty for Yahtzee. The dice have formed a cult. You are management.', clean:'Priya, fifty for Yahtzee. The dice have formed a cult. You are management.' },
  { id:'scratch', facts:{player:'Alex',category:'Yahtzee',score:0}, dark:'Alex, zero in Yahtzee. A tiny funeral, with absolutely shit catering.', clean:'Alex, zero in Yahtzee. A tiny funeral, with deeply disappointing catering.' },
  { id:'bonus', facts:{player:'Sam',upperSubtotal:63,bonus:35}, dark:'Sam, sixty-three upstairs earns thirty-five bonus. Even this afterlife has a loyalty programme.', clean:'Sam, sixty-three upstairs earns thirty-five bonus. Even this afterlife has a loyalty programme.' },
  { id:'tie', facts:{players:['Alex','Priya'],total:240,tied:true}, dark:'Alex and Priya, tied at two-forty. Shared custody of the disappointment.', clean:'Alex and Priya, tied at two-forty. Shared custody of the disappointment.' },
];
export const MODELS = ['eleven_flash_v2_5','eleven_v3'];
export function buildManifest({voices=[],models=MODELS,variants=['dark','clean'],lineIds=LINES.map(line=>line.id)}={}) {
  if(!Array.isArray(voices)||voices.some(v=>!v.voiceId||!v.name||typeof v.accountAccessVerified!=='boolean'||typeof v.rightsConfirmed!=='boolean')) throw Error('Voice candidates need account access and rights confirmation');
  if(voices.length>3) throw Error('Select at most three voice candidates');
  if(!Array.isArray(models)||!models.length||models.some(m=>!MODELS.includes(m))) throw Error('Unsupported audition model');
  if(!Array.isArray(variants)||!variants.length||variants.some(v=>!['dark','clean'].includes(v))) throw Error('Unsupported script variant');
  if(!Array.isArray(lineIds)||!lineIds.length||lineIds.some(id=>!LINES.some(line=>line.id===id))) throw Error('Unsupported script selection');
  const scripts=LINES.filter(line=>lineIds.includes(line.id)).flatMap(line=>variants.map(variant=>({id:line.id,variant,facts:line.facts,text:line[variant]})));
  const matrix=voices.flatMap(voice=>models.flatMap(model=>scripts.map(script=>({voiceId:voice.voiceId,voiceName:voice.name,model,...script}))));
  const charactersPerVoice=scripts.reduce((sum,s)=>sum+[...s.text].length,0)*models.length;
  const manifest={schemaVersion:1,profile:{intensity:'dark',profanity:'on',frequency:'selectable'},source:'original authored lines; synthetic accepted-score fixtures, not actual game observations',voices,models,scripts,matrix,
    proposed:{candidateCount:voices.length||3,requests:scripts.length*models.length*(voices.length||3),submittedCharacters:charactersPerVoice*(voices.length||3)},
    executable:voices.length>0&&voices.every(v=>v.accountAccessVerified&&v.rightsConfirmed),measurement:'HTTP first nonempty audio byte and stream completion only; no first-audible or physical-phone claim',outputFormat:'mp3_44100_128'};
  return {...manifest,hash:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')};
}
export function assertCaps(manifest,caps) {
  for(const name of ['maxRequests','maxCharacters','firstByteMs','clipTimeoutMs','maxClipBytes']) if(!Number.isSafeInteger(caps[name])||caps[name]<=0) throw Error('Explicit positive cap required: '+name);
  if(caps.firstByteMs>caps.clipTimeoutMs) throw Error('First-byte deadline exceeds whole-clip deadline');
  if(!manifest.executable) throw Error('Account-verified, rights-confirmed voices required');
  if(manifest.matrix.length>caps.maxRequests||manifest.matrix.reduce((sum,j)=>sum+[...j.text].length,0)>caps.maxCharacters) throw Error('Audition exceeds request or character cap');
}
export async function streamClip(job,{key,caps,fetchImpl=fetch,onChunk=()=>{},now=()=>performance.now()}={}) {
  const controller=new AbortController(),start=now();
  let firstByteMs=null,bytes=0;
  const firstTimer=setTimeout(()=>controller.abort(),caps.firstByteMs);
  const clipTimer=setTimeout(()=>controller.abort(),caps.clipTimeoutMs);
  try {
    const response=await fetchImpl('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(job.voiceId)+'/stream?output_format=mp3_44100_128',{
      method:'POST',signal:controller.signal,headers:{'xi-api-key':key,'content-type':'application/json',accept:'audio/mpeg'},body:JSON.stringify({text:job.text,model_id:job.model})});
    if(!response.ok) throw Error('Provider HTTP '+response.status);
    if(!response.headers.get('content-type')?.includes('audio/')) throw Error('Provider returned non-audio content');
    if(!response.body) throw Error('Provider returned empty audio');
    for await(const chunk of response.body) {
      if(!chunk.byteLength) continue;
      if(firstByteMs===null){firstByteMs=now()-start;clearTimeout(firstTimer);}
      bytes+=chunk.byteLength;
      if(bytes>caps.maxClipBytes) {controller.abort();throw Error('Clip byte cap exceeded');}
      await onChunk(chunk);
    }
    if(!bytes) throw Error('Provider returned empty audio');
    return {firstByteMs,completeMs:now()-start,bytes,firstAudibleMs:null};
  } finally {clearTimeout(firstTimer);clearTimeout(clipTimer);}
}
export async function runAudition(manifest,{caps,ledger,key,saveLedger,saveClip,fetchImpl}={}) {
  assertCaps(manifest,caps);
  if(!key) throw Error('Server key unavailable');
  if(ledger.manifestHash!==manifest.hash) throw Error('Ledger manifest mismatch');
  // A failed, timed-out, or interrupted attempt still consumes its submitted characters.
  for(let index=0;index<manifest.matrix.length;index++) {
    if(ledger.attempts.some(a=>a.index===index&&a.state==='completed')) continue;
    const job=manifest.matrix[index],characters=[...job.text].length;
    if(ledger.attempts.length>=caps.maxRequests||ledger.attempts.reduce((sum,a)=>sum+a.characters,0)+characters>caps.maxCharacters) throw Error('Remaining attempt budget exhausted');
    const attempt={index,characters,state:'submitted',number:ledger.attempts.length+1};
    ledger.attempts.push(attempt);await saveLedger(ledger); // durable BEFORE network dispatch
    const chunks=[];
    try {
      Object.assign(attempt,await streamClip(job,{key,caps,fetchImpl,onChunk:chunk=>chunks.push(Buffer.from(chunk))}));
      await saveClip(index,Buffer.concat(chunks));attempt.state='completed';
    } catch {attempt.state='failed';await saveLedger(ledger);throw Error('Audition attempt failed; budget consumed, see ledger');}
    await saveLedger(ledger);
  }
  return ledger;
}
export function parseCredential(text) {
  const matches=String(text).match(/(?<![A-Za-z0-9_])(?:sk_[A-Za-z0-9]{20,}|[a-fA-F0-9]{64})(?![A-Za-z0-9_])/g)||[];
  const unique=[...new Set(matches)];if(unique.length!==1) throw Error('Exactly one credential token required');return unique[0];
}
function parseArgs(args) {
  const options={};
  for(let i=0;i<args.length;i++) {
    const name=args[i];if(!name.startsWith('--')) throw Error('Expected named option');
    const key=name.slice(2);if(['key-ready','allow-paid'].includes(key)){options[key]=true;continue;}
    if(!args[i+1]||args[i+1].startsWith('--')) throw Error('Missing option value');options[key]=args[++i];
  }
  return options;
}
function ignoredDirectory(path) {
  const root=resolve('artifacts'),destination=resolve(path),rel=relative(root,destination);
  if(!rel||rel.startsWith('..')||isAbsolute(rel)) throw Error('Output must be within ignored artifacts directory');
  mkdirSync(destination,{recursive:true});return destination;
}
export async function main(args=process.argv.slice(2)) {
  const options=parseArgs(args),mode=options.mode||'dry-run';
  if(!['dry-run','voices','generate'].includes(mode)) throw Error('Unknown mode');
  const output=ignoredDirectory(options.out||'artifacts/sw025-audition');
  if(mode==='dry-run') {
    const config=options.config?JSON.parse(readFileSync(options.config,'utf8')):{};
    const manifest=buildManifest(config);writeFileSync(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2));
    console.log(JSON.stringify({mode,executable:manifest.executable,hash:manifest.hash,proposed:manifest.proposed}));return;
  }
  if(!options['key-ready']) throw Error('Explicit key-readiness confirmation required');
  let manifest,caps;
  if(mode==='generate') {
    if(!options['allow-paid']||!options.manifest||!options['approved-hash']) throw Error('Paid authorization and approved manifest hash required');
    manifest=JSON.parse(readFileSync(options.manifest,'utf8'));
    const rebuilt=buildManifest({voices:manifest.voices,models:manifest.models,variants:[...new Set(manifest.scripts.map(s=>s.variant))],lineIds:[...new Set(manifest.scripts.map(s=>s.id))]});
    if(rebuilt.hash!==manifest.hash||manifest.hash!==options['approved-hash']) throw Error('Approved manifest content mismatch');
    caps=Object.fromEntries(['maxRequests','maxCharacters','firstByteMs','clipTimeoutMs','maxClipBytes'].map(name=>[name,Number(options[name])]));assertCaps(manifest,caps);
  }
  // Never load or print keys in dry-run; credentials remain server-only.
  let key;
  if(options['credential-file']) key=parseCredential(readFileSync(options['credential-file'],'utf8'));
  else {if(!process.env.ELEVENLABS_API_KEY) process.loadEnvFile(resolve('.env'));key=process.env.ELEVENLABS_API_KEY;}
  if(!key) throw Error('Server key unavailable');
  if(mode==='voices') {
    const response=await fetch('https://api.elevenlabs.io/v2/voices?page_size=100&include_total_count=false',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw Error('Voice listing HTTP '+response.status);
    const data=await response.json();
    const report={voices:data.voices.map(v=>({voiceId:v.voice_id,name:v.name,category:v.category,labels:v.labels,availableForTiers:v.available_for_tiers,permission:v.permission_on_resource,noticePeriod:v.sharing?.notice_period,customRate:v.sharing?.rate})),hasMore:data.has_more,nextPageToken:data.next_page_token,rightsConfirmed:false};
    writeFileSync(resolve(output,'account-voices.json'),JSON.stringify(report,null,2));console.log('Read-only voices listed; rights and model compatibility still need review.');return;
  }
  const lockPath=resolve(output,'generation.lock'),lock=openSync(lockPath,'wx');
  try {
    const ledgerPath=resolve(output,'ledger.json');let ledger;
    try{ledger=JSON.parse(readFileSync(ledgerPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;ledger={manifestHash:manifest.hash,attempts:[]};}
    await runAudition(manifest,{key,caps,ledger,saveLedger:async value=>writeFileSync(ledgerPath,JSON.stringify(value,null,2)),saveClip:async(index,bytes)=>writeFileSync(resolve(output,String(index).padStart(3,'0')+'.mp3'),bytes)});
    console.log('Audition complete; measured network bytes, not first audible.');
  } finally {closeSync(lock);unlinkSync(lockPath);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main().catch(()=>{console.error('Audition stopped. Check authorization, caps, server configuration and local ledger. No credentials are printed.');process.exitCode=1;});
