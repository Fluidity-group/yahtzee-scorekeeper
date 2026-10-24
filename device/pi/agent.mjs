// Outbound-only camera relay. One requested frame and one inference at a time.
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import {PNG} from 'pngjs';
import {fileURLToPath} from 'node:url';

const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base=new URL(config.authorityURL);
if(base.protocol!=='https:'&&!(base.protocol==='http:'&&(config.allowPrivateHttp===true||['127.0.0.1','localhost'].includes(base.hostname))))throw Error('HTTPS authority required (or explicitly allow private LAN HTTP)');
const endpoint=new URL(`/api/devices/${config.roomId}/${config.deviceId}`,base).href;
const worker=new Worker(new URL('./vision-worker.mjs',import.meta.url));
let child,reader,stopping=false,sequence=0;const bootId=randomUUID();
const samples=config.replayFile?JSON.parse(fs.readFileSync(config.replayFile,'utf8')).samples:null;
if(samples&&!samples.length)throw Error('Replay has no samples');
let reply;
worker.on('message',m=>{reply?.(m);reply=null;});
worker.on('error',e=>{console.error('Inference worker failed:',e.message);process.exitCode=1;stop();});
const waitWorker=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{reply=null;reject(Error('Inference timeout'));},15000);reply=m=>{clearTimeout(timer);m.type==='error'?reject(Error(m.error)):resolve(m);};});
async function request(data){const response=await fetch(endpoint,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${config.deviceToken}`,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(5000)});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
function startCapture(){
 child=spawn(process.env.PI_PYTHON||'python3',['-u',fileURLToPath(new URL('./capture.py',import.meta.url))],{stdio:['pipe','pipe','inherit']});
 reader=createInterface({input:child.stdout});
 child.on('error',e=>console.error('Capture failed:',e.message));
}
async function capture(){
 if(samples){const sample=samples[sequence%samples.length],png=PNG.sync.read(Buffer.from(sample.image.split(',')[1],'base64'));return {width:png.width,height:png.height,pixels:png.data.toString('base64'),capturedAt:Date.now()};}
 if(!child||child.exitCode!==null||child.killed)startCapture();
 return new Promise((resolve,reject)=>{
  const done=(error,value)=>{clearTimeout(timer);reader.off('line',line);child.off('exit',exit);error?reject(error):resolve(value);};
  const line=s=>{try{done(null,JSON.parse(s));}catch(e){done(e);}};
  const exit=()=>done(Error('Camera disconnected'));const timer=setTimeout(()=>{done(Error('Capture timeout'));child.kill();},8000);
  reader.once('line',line);child.once('exit',exit);child.stdin.write('{}\n');
 });
}
function stop(){stopping=true;reader?.close();child?.kill();worker.terminate();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
try{
 await waitWorker();console.log(samples?'Replay camera agent running (explicit replay evidence)':'Pi camera agent running');
 while(!stopping){
  try{
   const context=await request();if(!context.previewRequested){await new Promise(resolve=>setTimeout(resolve,1000));continue;}const frame=await capture();frame.sequence=++sequence;
   const response=waitWorker();worker.postMessage({frame,profile:context.profile});
   const {result}=await response;
   await request({...result,bootId,mediaOrigin:samples?'replay':'camera'});
  }catch(e){console.error('Camera relay:',e.message);if(e.message==='Inference timeout'){stop();break;}}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
}finally{stop();}
