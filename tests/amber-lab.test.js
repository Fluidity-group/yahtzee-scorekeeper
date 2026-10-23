import {it,expect,vi} from 'vitest';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {webcrypto} from 'node:crypto';
import {labApi,validateFeedback,replaceReviewFile} from '../lab/server.js';
import {installLabUuid} from '../lab/uuid.js';
it('supports LAN UUID generation without replacing native randomUUID',()=>{
 const target={getRandomValues:array=>webcrypto.getRandomValues(array)};installLabUuid(target);
 const values=new Set(Array.from({length:100},()=>target.randomUUID()));expect(values.size).toBe(100);
 for(const value of values)expect(value).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 const original=target.randomUUID;installLabUuid(target);expect(target.randomUUID).toBe(original);
});
it('validates review decisions and stores only bounded fields',()=>{
 const value={screen:' Scorecard ',title:'Readability',details:'Increase score size',acceptance:'Readable at 393px',kind:'ui',status:'proposed',path:'../../src/prototype.js'};
 expect(validateFeedback(value)).toEqual({screen:'Scorecard',title:'Readability',details:'Increase score size',acceptance:'Readable at 393px',kind:'ui',status:'proposed'});
 expect(()=>validateFeedback({...value,status:'published'})).toThrow();expect(()=>validateFeedback({...value,details:'a'.repeat(5001)})).toThrow();
});
it('retries temporary Windows file locks but surfaces a permanent save failure',async()=>{
 const locked=Object.assign(Error('file locked'),{code:'EPERM'}),rename=vi.fn().mockImplementationOnce(()=>{throw locked;}).mockImplementationOnce(()=>{throw locked;}).mockImplementation(()=>{}),sleep=vi.fn(async()=>{});
 await replaceReviewFile('temp','target',{rename,sleep});expect(rename).toHaveBeenCalledTimes(3);expect(sleep).toHaveBeenCalledTimes(2);
 const permanent=vi.fn(()=>{throw locked;});await expect(replaceReviewFile('temp','target',{rename:permanent,sleep})).rejects.toThrow('locked');expect(permanent).toHaveBeenCalledTimes(7);
});
it('shares local review requests and rejects cross-origin writes without touching product source',async()=>{
 const root=mkdtempSync(join(tmpdir(),'amber-lab-'));let handler;
 labApi(root).configureServer({middlewares:{use:value=>handler=value}});
 const server=createServer((q,r)=>handler(q,r,()=>{r.statusCode=404;r.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const value={screen:'Scorecard',title:'Bigger total',details:'Make score readable',acceptance:'393px',kind:'ui',status:'proposed'};
 const post=(body,from=origin)=>fetch(origin+'/__lab/requests',{method:'POST',headers:{Origin:from,'Content-Type':'application/json','X-Amber-Lab':'review'},body:JSON.stringify(body)});
 try{
 expect((await post(value,'https://other.example')).status).toBe(403);
 const result=await post(value);expect(result.status).toBe(200);const {record}=await result.json();expect(record.id).toBeTruthy();
 const updated=await post({...value,id:record.id,status:'accepted'});expect(updated.status).toBe(200);
 const requests=await(await fetch(origin+'/__lab/requests')).json();expect(requests.requests).toHaveLength(1);expect(requests.requests[0].status).toBe('accepted');
 const concurrent=await Promise.all([post({...value,title:'One'}),post({...value,title:'Two'})]);expect(concurrent.every(r=>r.status===200)).toBe(true);expect((await(await fetch(origin+'/__lab/requests')).json()).requests).toHaveLength(3);
 expect((await fetch(origin+'/__lab/unknown')).status).toBe(404);
 }finally{await new Promise(r=>server.close(r));rmSync(root,{recursive:true,force:true});}
});
