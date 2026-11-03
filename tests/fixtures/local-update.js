import{generateKeyPairSync,sign,webcrypto}from'node:crypto';
import{vi}from'vitest';import{UPDATE_APP_ID,UPDATE_RUNTIME,validateUpdateConfig}from'../../src/updates/policy.js';
export const keys=generateKeyPairSync('rsa',{modulusLength:2048});
export const config=validateUpdateConfig({manifestUrl:'https://updates.example.test/yahtzee/ios-test.json',channel:'ios-test',publicKeySpki:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')});
export const time=Date.parse('2026-11-01T18:00:00Z');
export const info={id:UPDATE_APP_ID,build:'79',version:'0.1.0'};
export const manifest={schema:1,appId:UPDATE_APP_ID,platform:'ios',runtime:UPDATE_RUNTIME,channel:'ios-test',nativeBuild:'79',sequence:2,version:'0.1.2',sourceCommit:'a'.repeat(40),bytes:100,sha256:'b'.repeat(64),url:'bundles/'+ 'b'.repeat(64)+'.zip',notes:'Synthetic update',publishedAt:new Date(time-1000).toISOString(),expiresAt:new Date(time+3600000).toISOString()};
export function envelope(overrides={}){const bytes=Buffer.from(JSON.stringify({...manifest,...overrides}));return{payload:bytes.toString('base64'),signature:sign('RSA-SHA256',bytes,keys.privateKey).toString('base64')};}
export function fixture(){
 const values=new Map([['clubhouse-account','synthetic-session'],['saved-game','synthetic-scorecard']]);const storage={getItem:k=>values.get(k)||null,setItem:vi.fn((k,v)=>values.set(k,v))};
 const builtin={id:'builtin',version:'0.1.0',checksum:'',status:'success'},bundle={id:'bundle-2',version:manifest.version,checksum:manifest.sha256,status:'pending'};let current=builtin,safe=true;
 const bridge={current:vi.fn(async()=>({bundle:current})),download:vi.fn(async()=>bundle),list:vi.fn(async()=>({bundles:[bundle]})),set:vi.fn(async()=>{current=bundle;}),reset:vi.fn(async()=>{current=builtin;}),notifyAppReady:vi.fn(async()=>({}))};
 return{config,bridge,storage,values,builtin,bundle,cryptoApi:webcrypto,getInfo:async()=>info,fetcher:vi.fn(async()=>new Response(JSON.stringify(envelope()))),now:()=>time,canActivate:()=>safe,identity:{commit:'c'.repeat(40)},setCurrent:v=>{current=v;},setSafe:v=>{safe=v;}};
}
