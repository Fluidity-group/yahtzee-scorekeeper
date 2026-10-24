import {it,expect,vi} from 'vitest';
import {buildManifest,assertCaps,streamClip,runAudition,main,parseCredential} from '../scripts/audition-commentary.mjs';
const voices=[1,2,3].map(n=>({voiceId:'test-'+n,name:'Synthetic candidate '+n,accountAccessVerified:true,rightsConfirmed:true}));
const manifest=buildManifest({voices});
const caps={maxRequests:72,maxCharacters:20000,firstByteMs:1000,clipTimeoutMs:2000,maxClipBytes:100};
const audio=()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg'}});
it('default dry-run has no invented voice IDs and projects the complete identical-script comparison',()=>{
 const result=buildManifest();expect(result.voices).toEqual([]);expect(result.matrix).toEqual([]);expect(result.executable).toBe(false);expect(result.proposed.requests).toBe(72);
 expect(manifest.matrix).toHaveLength(72);expect(manifest.proposed.submittedCharacters).toBe(manifest.matrix.reduce((n,j)=>n+[...j.text].length,0));
 for(const script of manifest.scripts)expect(new Set(manifest.matrix.filter(j=>j.id===script.id&&j.variant===script.variant).map(j=>j.text)).size).toBe(1);
 expect(manifest.scripts.find(s=>s.id==='scratch'&&s.variant==='clean').text).not.toContain('shit');
});
it('requires verified account access and rights rather than claiming public candidates are licensed',()=>{
 expect(()=>buildManifest({voices:[{voiceId:'fake',name:'fake'}]})).toThrow('account access');expect(buildManifest({voices:voices.slice(0,2)}).executable).toBe(true);
});
it('rejects missing, fractional, zero and insufficient explicit caps before dispatch',()=>{
 expect(()=>assertCaps(manifest,{})).toThrow('cap');expect(()=>assertCaps(manifest,{...caps,maxRequests:71})).toThrow('exceeds');expect(()=>assertCaps(manifest,{...caps,maxCharacters:1})).toThrow('exceeds');expect(()=>assertCaps(manifest,{...caps,maxRequests:72.1})).toThrow('cap');expect(()=>assertCaps(manifest,{...caps,firstByteMs:3000})).toThrow('deadline');
});
it('streams nonempty chunks and records first byte/completion without claiming first audible',async()=>{
 const chunks=[],fetchImpl=vi.fn(async()=>audio());let tick=0;
 const result=await streamClip(manifest.matrix[0],{key:'secret-fixture',caps,fetchImpl,onChunk:c=>chunks.push(c),now:()=>++tick});
 expect(result).toEqual({firstByteMs:1,completeMs:2,bytes:3,firstAudibleMs:null});expect(chunks).toHaveLength(1);
 const [url,options]=fetchImpl.mock.calls[0];expect(url).toContain('/stream?output_format=mp3_44100_128');expect(JSON.parse(options.body).text).toBe(manifest.matrix[0].text);
});
it('sanitizes upstream errors and rejects empty, non-audio and oversized clips',async()=>{
 await expect(streamClip(manifest.matrix[0],{key:'secret-fixture',caps,fetchImpl:async()=>new Response('secret-fixture',{status:429})})).rejects.toThrow('Provider HTTP 429');
 await expect(streamClip(manifest.matrix[0],{key:'k',caps,fetchImpl:async()=>new Response(null,{headers:{'content-type':'audio/mpeg'}})})).rejects.toThrow('empty');
 await expect(streamClip(manifest.matrix[0],{key:'k',caps,fetchImpl:async()=>new Response('wrong')})).rejects.toThrow('non-audio');
 await expect(streamClip(manifest.matrix[0],{key:'k',caps:{...caps,maxClipBytes:2},fetchImpl:async()=>audio()})).rejects.toThrow('byte cap');
});
it('aborts a fetch before its first byte deadline',async()=>{
 const fetchImpl=async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))));
 await expect(streamClip(manifest.matrix[0],{key:'k',caps:{...caps,firstByteMs:5},fetchImpl})).rejects.toThrow('aborted');
});
it('persists attempts before dispatch and charges failed/retried attempts to the same bounded ledger',async()=>{
 const ledger={manifestHash:manifest.hash,attempts:[]};let persisted=[];const fetchImpl=vi.fn(async()=>{expect(persisted).toHaveLength(1);expect(persisted[0].state).toBe('submitted');throw Error('secret-fixture');});
 const options={caps,ledger,key:'secret-fixture',saveLedger:async value=>{persisted=structuredClone(value.attempts);},saveClip:vi.fn(),fetchImpl};
 await expect(runAudition(manifest,options)).rejects.toThrow('budget consumed');expect(ledger.attempts[0].state).toBe('failed');
 ledger.attempts=Array.from({length:72},()=>({index:0,characters:1,state:'failed'}));
 await expect(runAudition(manifest,options)).rejects.toThrow('budget exhausted');expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it('resumes completed items without paying again and keeps corrupted ledger mismatch blocked',async()=>{
 const ledger={manifestHash:manifest.hash,attempts:manifest.matrix.map((j,index)=>({index,characters:[...j.text].length,state:'completed'}))};const fetchImpl=vi.fn();
 await runAudition(manifest,{caps,ledger,key:'k',saveLedger:vi.fn(),saveClip:vi.fn(),fetchImpl});expect(fetchImpl).not.toHaveBeenCalled();
 await expect(runAudition(manifest,{caps,ledger:{...ledger,manifestHash:'different'},key:'k'})).rejects.toThrow('mismatch');
});
it('blocks voice listing and generation before loading env or calling provider when authorization is absent',async()=>{
 const env=vi.spyOn(process,'loadEnvFile').mockImplementation(()=>{throw Error('must not read');});const provider=vi.spyOn(globalThis,'fetch');
 try {await expect(main(['--mode','voices'])).rejects.toThrow('readiness');await expect(main(['--mode','generate','--key-ready'])).rejects.toThrow('authorization');expect(env).not.toHaveBeenCalled();expect(provider).not.toHaveBeenCalled();}finally{env.mockRestore();provider.mockRestore();}
});

it('parses legacy hex and current prefixed credentials without accepting ambiguous files',()=>{
 const hex='a'.repeat(64),prefixed='sk_'+ 'Q'.repeat(40);
 expect(parseCredential('ELEVENLABS_API_KEY='+hex)).toBe(hex);expect(parseCredential('key: '+prefixed)).toBe(prefixed);
 expect(()=>parseCredential(hex+' '+prefixed)).toThrow('Exactly one');expect(()=>parseCredential('no token')).toThrow('Exactly one');
});
it('prepares user-selected unverified voices without making synthesis executable',()=>{
 const selected=voices.slice(0,2).map(v=>({...v,accountAccessVerified:false,rightsConfirmed:false}));
 const draft=buildManifest({voices:selected,models:['eleven_flash_v2_5'],variants:['dark'],lineIds:['yahtzee','scratch']});
 expect(draft.matrix).toHaveLength(4);expect(draft.executable).toBe(false);expect(()=>assertCaps(draft,caps)).toThrow('rights-confirmed');
 expect(draft.scripts.map(s=>s.id)).toEqual(['yahtzee','scratch']);expect(draft.scripts[1].text).toContain('shit');
});