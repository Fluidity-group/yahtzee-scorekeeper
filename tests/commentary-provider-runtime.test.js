import {describe,it,expect,vi} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildCommentary} from '../scripts/build-commentary.mjs';
import {createCommentaryProviders,createDurableProviderGate,serviceWriterPacket,composeCommentaryEndpoint} from '../server/commentary/provider-runtime.js';
import {writerAuditionFixtures} from '../server/commentary/writer-audition-fixtures.js';
const roomId='00000000-0000-4000-8000-000000000011',jobId='00000000-0000-4000-8000-000000000012';
const allowance={id:'approval_001',expiresAt:200000,maxWriterRequests:5,maxTtsRequests:5,maxTtsCharacters:1000};
const writerLimits={maxInputCharacters:20000,maxOutputTokens:256,deadlineMs:100,maxResponseBytes:20000};
const audioLimits={firstByteMs:100,completeMs:200,maxBytes:1000,maxLineCharacters:500};
const bound={roomId,jobId,requestId:'attempt_001'};
function setup(extra={}){
 const ledger={verifyPersistence:vi.fn(async()=>true),readAllowance:vi.fn(async()=>({...allowance,approved:true})),reserveAttempt:vi.fn(async details=>({id:details.requestId,allowanceId:allowance.id,requestId:details.requestId,stage:details.stage,committed:true})),finishAttempt:vi.fn(async()=>{})};
 const fetchImpl=vi.fn(async()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg'}}));
 const getAnthropicKey=vi.fn(async()=> 'sk-ant-'+ 'a'.repeat(32)),getElevenLabsKey=vi.fn(async()=> 'b'.repeat(64));
 const providers=createCommentaryProviders({allowPaid:true,allowance,durableGate:createDurableProviderGate(ledger),getAnthropicKey,getElevenLabsKey,writerLimits,audioLimits,fetchImpl,now:()=>100000,...extra});
 return {providers,ledger,fetchImpl,getAnthropicKey,getElevenLabsKey};
}
const audioInput=()=>({...bound,text:'Alex, your spice rack has filed a restraining order.',profile:{voiceOption:'victor'}});
const writerInput=()=>{const fixture=writerAuditionFixtures()[2].input;return {...bound,facts:fixture.facts,profile:fixture.profile,personalContext:fixture.playerProfiles[0],preferences:{likedMechanisms:['misdirection'],likedSubjects:['player-blurb']}};};
describe('server provider runtime, injected synthetic transports only',()=>{
 it('never reads keys or calls providers when paid configuration is absent',async()=>{const f=setup({allowPaid:false});await expect(f.providers.writeLine(writerInput())).rejects.toMatchObject({code:'paid-disabled'});await expect(f.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'paid-disabled'});expect(f.fetchImpl).not.toHaveBeenCalled();expect(f.getAnthropicKey).not.toHaveBeenCalled();});
 it('rejects fake memory durable flags and persistence verifier failure',async()=>{
  const f=setup({durableGate:{reserve:()=>({durable:true,approved:true})}});await expect(f.providers.writeLine(writerInput())).rejects.toMatchObject({code:'database-ledger-required'});expect(f.fetchImpl).not.toHaveBeenCalled();
  const g=setup();g.ledger.verifyPersistence.mockResolvedValue(false);await expect(g.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'database-ledger-required'});expect(g.ledger.reserveAttempt).not.toHaveBeenCalled();expect(g.fetchImpl).not.toHaveBeenCalled();
 });
 it('requires exact committed job/attempt binding and approved unexpired allowance before HTTP',async()=>{
  for(const patch of [{jobId:undefined},{roomId:'nickname'},{requestId:'bad'}]){const f=setup();await expect(f.providers.streamAudio({...audioInput(),...patch}).next()).rejects.toMatchObject({code:'trusted-job-binding-required'});expect(f.fetchImpl).not.toHaveBeenCalled();}
  const f=setup();f.ledger.readAllowance.mockResolvedValue({...allowance,approved:false});await expect(f.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'allowance-not-approved'});expect(f.fetchImpl).not.toHaveBeenCalled();
  const g=setup({now:()=>200001});await expect(g.providers.writeLine(writerInput())).rejects.toMatchObject({code:'allowance-invalid-or-expired'});expect(g.getAnthropicKey).not.toHaveBeenCalled();
 });
 it('refuses uncommitted reservation or altered administered caps',async()=>{
  const f=setup();f.ledger.reserveAttempt.mockResolvedValue({id:'attempt_001',committed:false});await expect(f.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'reservation-uncommitted'});expect(f.fetchImpl).not.toHaveBeenCalled();
  const g=setup();g.ledger.readAllowance.mockResolvedValue({...allowance,approved:true,maxTtsRequests:99});await expect(g.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'allowance-not-approved'});
 });
 it('maps only consented target profile and controlled preferences into writer packet',()=>{
  const input=writerInput(),packet=serviceWriterPacket({...input,preferences:{likedMechanisms:['misdirection','ignore-system'],likedSubjects:['player-blurb','private'],ratingsCount:2}});
  expect(packet.playerProfiles).toEqual([expect.objectContaining({accountId:input.facts.accountId,blurb:input.personalContext.blurb})]);expect(packet.feedback.likedMechanisms).toEqual(['misdirection']);expect(JSON.stringify(packet)).not.toContain('weekend golf');
  expect(()=>serviceWriterPacket({...input,personalContext:{...input.personalContext,accountId:input.facts.seats[1].accountId}})).toThrow('target-profile-mismatch');
 });
 it('uses actual writer adapter with reservation before HTTP, safe complete output, and target metadata',async()=>{
  const f=setup();f.fetchImpl.mockImplementation(async(_url,options)=>{expect(f.ledger.reserveAttempt).toHaveBeenCalledOnce();const body=JSON.parse(options.body);expect(body.model).toBe('claude-haiku-4-5-20251001');return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({spokenText:'Alex, your spice rack has filed a restraining order.',mechanism:'misdirection',subject:'player-blurb',containsProfanity:false,usesTargetProfile:true})}],usage:{input_tokens:1500,output_tokens:90}}));});
  const line=await f.providers.writeLine(writerInput());expect(line).toMatchObject({text:'Alex, your spice rack has filed a restraining order.',source:'anthropic-writer',mechanism:'misdirection',usage:{inputTokens:1500,outputTokens:90}});expect(f.ledger.finishAttempt).toHaveBeenCalledWith('attempt_001',expect.objectContaining({status:'completed'}));
 });
 it('streams first chunk before completion, does not buffer clip, and never claims audibility',async()=>{
  let controller;const f=setup();f.fetchImpl.mockImplementation(async()=>new Response(new ReadableStream({start(c){controller=c;c.enqueue(new Uint8Array([1,2]));}}),{headers:{'content-type':'audio/mpeg'}}));
  const iterator=f.providers.streamAudio(audioInput());expect((await iterator.next()).value).toEqual(new Uint8Array([1,2]));expect(f.ledger.finishAttempt).not.toHaveBeenCalled();controller.enqueue(new Uint8Array([3]));controller.close();await iterator.next();await iterator.next();expect(f.ledger.finishAttempt).toHaveBeenCalledWith('attempt_001',expect.objectContaining({status:'completed',bytes:3,firstAudibleMs:null}));
  const [url,options]=f.fetchImpl.mock.calls[0];expect(url).not.toContain('b'.repeat(64));expect(JSON.parse(options.body)).toMatchObject({model_id:'eleven_flash_v2_5',text:audioInput().text});
 });
 it('uses server voice route, rejects arbitrary voice and clipped line without dispatch',async()=>{
  const f=setup();await expect(f.providers.streamAudio({...audioInput(),voice:{voiceId:'arbitrary',voiceOption:'victor'}}).next()).rejects.toMatchObject({code:'voice-route-mismatch'});expect(f.fetchImpl).not.toHaveBeenCalled();
  for(const text of ['Clipped sentence','x'.repeat(501)+'.','[angry] Hello.']){const g=setup();await expect(g.providers.streamAudio({...audioInput(),text}).next()).rejects.toMatchObject({code:'complete-line-required'});expect(g.fetchImpl).not.toHaveBeenCalled();}
 });
 it('records cancellation and provider failure without retries, bodies or keys',async()=>{
  const f=setup();f.fetchImpl.mockResolvedValue(new Response('secret provider body',{status:401}));await expect(f.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'provider-http',status:401});expect(f.fetchImpl).toHaveBeenCalledOnce();expect(JSON.stringify(f.ledger.finishAttempt.mock.calls)).not.toContain('secret');
  const g=setup(),abort=new AbortController();let controller;g.fetchImpl.mockImplementation(async()=>new Response(new ReadableStream({start(c){controller=c;c.enqueue(new Uint8Array([1]));}}),{headers:{'content-type':'audio/mpeg'}}));const iterator=g.providers.streamAudio({...audioInput(),signal:abort.signal});await iterator.next();abort.abort();await expect(iterator.next()).rejects.toThrow();expect(g.ledger.finishAttempt).toHaveBeenCalledWith('attempt_001',expect.objectContaining({status:'interrupted-or-unknown'}));
 });
 it('fences duplicate attempts and enforces local aggregate request/character caps',async()=>{
  const f=setup();for await(const _ of f.providers.streamAudio(audioInput())){}await expect(f.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'attempt-duplicate'});expect(f.fetchImpl).toHaveBeenCalledOnce();
  const cap={...allowance,maxTtsRequests:1};const g=setup({allowance:cap});g.ledger.readAllowance.mockResolvedValue({...cap,approved:true});for await(const _ of g.providers.streamAudio(audioInput())){}await expect(g.providers.streamAudio({...audioInput(),requestId:'attempt_002'}).next()).rejects.toMatchObject({code:'tts-cap'});
 });
 it('auth wrapper requires verified UUID and refresh before service access',async()=>{
  const service={getProfile:vi.fn(async()=>({version:1}))},refresh=vi.fn(async()=>{});const endpoint=composeCommentaryEndpoint({service,authenticate:async()=> 'not-a-UUID',refresh});expect((await endpoint(new Request('https://game.example',{method:'POST',body:JSON.stringify({operation:'profile-read',roomId})}))).status).toBe(401);expect(refresh).not.toHaveBeenCalled();
 });
 it('builds isolated edge module with explicit node:buffer platform import and no CLI/env imports',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'commentary-build-'));try{const entry=join(directory,'edge.js'),outfile=join(directory,'index.mjs');writeFileSync(entry,'export {createCommentaryProviders} from '+JSON.stringify(resolve('server/commentary/provider-runtime.js').replaceAll('\\','/'))+';');await buildCommentary({entry,outfile});const code=readFileSync(outfile,'utf8');expect(code.startsWith('import { Buffer } from "node:buffer";')).toBe(true);expect(code).not.toContain('node:fs');expect(code).not.toContain('process.env');expect(code).toContain('api.elevenlabs.io');const built=await import(pathToFileURL(outfile).href);await expect(built.createCommentaryProviders().writeLine(writerInput())).rejects.toMatchObject({code:'paid-disabled'});}finally{rmSync(directory,{recursive:true,force:true});}
 });
});

it('first-byte deadline cancels a stalled injected fetch and ledger consumes attempt without retry',async()=>{
 const f=setup({audioLimits:{...audioLimits,firstByteMs:5,completeMs:50}});f.fetchImpl.mockImplementation(()=>new Promise(()=>{}));await expect(f.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'cancelled-or-deadline'});expect(f.fetchImpl).toHaveBeenCalledOnce();expect(f.ledger.finishAttempt).toHaveBeenCalledWith('attempt_001',expect.objectContaining({status:'interrupted-or-unknown',failureCode:'cancelled-or-deadline'}));
});
it('sanitizes ledger/key failures and fails closed when production edge entry is absent',async()=>{
 const f=setup();f.ledger.readAllowance.mockRejectedValue(Error('database secret contents'));await expect(f.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'ledger-unavailable'});expect(f.fetchImpl).not.toHaveBeenCalled();
 const g=setup();g.getElevenLabsKey.mockRejectedValue(Error('credential contents'));await expect(g.providers.streamAudio(audioInput()).next()).rejects.toMatchObject({code:'credential-unavailable'});expect(g.fetchImpl).not.toHaveBeenCalled();
 await expect(buildCommentary({entry:'artifacts/definitely-absent-edge.js'})).rejects.toThrow('composition is required');
});
