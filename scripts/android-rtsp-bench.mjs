/** Synthetic emulator-only bench. No physical install, network relay or game commit.
 * Node24; run against a loopback-forwarded debug WebView of the dev APK.
 * Fixture credentials and output must stay under ignored artifacts/.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const options={};for(let i=2;i<process.argv.length;i+=2)options[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const serial=options.serial??'emulator-5554',port=Number(options.port??9223),seconds=Number(options.seconds??60);
if(!/^emulator-\d+$/.test(serial)||!Number.isInteger(port)||port<1024||port>65535||!Number.isFinite(seconds)||seconds<1||seconds>3600)throw Error('Use an emulator serial, local debug port and 1..3600 seconds.');
const root=process.cwd(),artifactRoot=path.resolve(root,'artifacts');
function artifact(value){const resolved=path.resolve(root,value);if(!resolved.startsWith(artifactRoot+path.sep))throw Error('Bench files must remain under artifacts.');return resolved;}
const output=artifact(options.output??'artifacts/android-rtsp-soak');fs.mkdirSync(output,{recursive:true});
const secret=JSON.parse(fs.readFileSync(artifact(options.credentials??'artifacts/sw006-oct02/fixture-credentials.json'),'utf8'));
const adb=options.adb??path.join(process.env.LOCALAPPDATA,'Android','Sdk','platform-tools','adb.exe');
const runAdb=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:15000,windowsHide:true});
if(runAdb('get-state').trim()!=='device')throw Error('Emulator unavailable.');
const targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();
const target=targets.find(t=>t.url.startsWith('https://localhost/'));
if(!target||!target.webSocketDebuggerUrl.startsWith(`ws://127.0.0.1:${port}/`))throw Error('Expected local development WebView.');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',()=>reject(Error('Local debug connection failed.')),{once:true});});
let next=0;const pending=new Map();ws.addEventListener('message',({data})=>{const m=JSON.parse(data);const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);p.resolve(m);}});
const evaluate=expression=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Bounded bench operation timed out.'));},45000);pending.set(id,{timer,resolve:m=>{if(m.error||m.result?.exceptionDetails)reject(Error('Bench operation failed; sensitive exception suppressed.'));else resolve(m.result?.result?.value);}});ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
const samples=[],resources=[];let initialized=false;
try{
 const workerFile=fs.readdirSync('dist-native/assets').find(f=>/^worker-.*\.js$/.test(f));if(!workerFile)throw Error('Packaged worker missing.');
 initialized=true;const setup=await evaluate(`(async()=>{const p=Capacitor.Plugins.C121Camera;
 await p.updateCredentials({cameraId:'synthetic-soak',username:${JSON.stringify(secret.username)},password:${JSON.stringify(secret.password)}});
 await p.setPreviewRect({visible:false,left:10,top:100,width:360,height:203});
 await p.connect({cameraId:'synthetic-soak',host:'10.0.2.2',stream:'stream1'});
 for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,1000));const s=await p.getStatus();if(s.state==='live'&&s.sequence>4)break;}
 if((await p.getStatus()).state!=='live')return {live:false};
 const worker=new Worker('/assets/${workerFile}',{type:'module'});const start=performance.now();
 const ready=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),15000);worker.onmessage=({data})=>{clearTimeout(timer);resolve(data.type==='ready')};worker.postMessage({type:'init',base:'https://localhost/camera-assets/'});});
 if(!ready){worker.terminate();return {live:true,workerReady:false};}
 globalThis.__sw006Soak={worker,canvas:document.createElement('canvas'),lastSequence:0};
 return {live:true,workerReady:true,workerInitializationMs:performance.now()-start};})()`);
 initialized=true;if(!setup.live||!setup.workerReady)throw Error('Synthetic stream or packaged worker unavailable.');
 const start=performance.now();let resourceAt=0;
 while(performance.now()-start<seconds*1000){
  const frame=await evaluate(`(async()=>{const p=Capacitor.Plugins.C121Camera,b=globalThis.__sw006Soak;let f;
  try{const started=performance.now();f=await p.acquireLatestFrame({maxWidth:1280,maxAgeMs:1500});
  const fetchStart=performance.now(),blob=await(await fetch(Capacitor.convertFileSrc(f.fileUri))).blob(),decodeStart=performance.now();
  const bitmap=await createImageBitmap(blob),decoded=performance.now();b.canvas.width=bitmap.width;b.canvas.height=bitmap.height;b.canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
  const pixels=b.canvas.getContext('2d').getImageData(0,0,b.canvas.width,b.canvas.height).data.buffer,infStart=performance.now();
  const result=await new Promise(resolve=>{const timer=setTimeout(()=>resolve({type:'timeout'}),15000);b.worker.onmessage=({data})=>{clearTimeout(timer);resolve(data)};b.worker.postMessage({type:'frame',id:1,width:b.canvas.width,height:b.canvas.height,pixels,polygon:[[.05,.35],[.95,.35],[.95,.61],[.05,.61]],settings:{},hands:[],handEnabled:false,handStale:false},[pixels]);});
  const advancing=f.sequence>b.lastSequence;b.lastSequence=f.sequence;
  return {advancing,sequence:f.sequence,width:f.width,height:f.height,native:f.timingDiagnostics,fetchMs:decodeStart-fetchStart,decodeMs:decoded-decodeStart,inferenceMs:performance.now()-infStart,cycleMs:performance.now()-started,result:result.type,diceCount:result.dice?.length};
  }catch(e){return {code:['STALE_FRAME','FRAME_BUSY','NO_PIXELS'].includes(e.code)?e.code:'BENCH_OPERATION_FAILED'};}
  finally{if(f)await p.releaseFrame({frameId:f.frameId});}})()`);
  const elapsedMs=performance.now()-start;samples.push({elapsedMs,...frame});
  if(elapsedMs>=resourceAt){
   const memory=runAdb('shell','dumpsys','meminfo','com.fluiditygroup.diceclubhouse.dev');
   const cache=runAdb('shell','run-as','com.fluiditygroup.diceclubhouse.dev','sh','-c','"find cache/c121-frames -type f | wc -l"');
   const pss=Number(memory.match(/TOTAL PSS:\s*(\d+)/)?.[1]??memory.match(/TOTAL\s+(\d+)/)?.[1]);
   resources.push({elapsedMs,appPssKb:Number.isFinite(pss)?pss:null,leasedFilesAfterRelease:Number(cache.trim())});
   fs.writeFileSync(path.join(output,'progress.json'),JSON.stringify({synthetic:true,setup,elapsedMs,sampleCount:samples.length,failures:samples.filter(s=>s.code||!s.advancing||s.result!=='result').length,resources},null,2));resourceAt+=60000;
  }
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({synthetic:true,setup,requestedSeconds:seconds,elapsedMs:performance.now()-start,samples,resources,phoneThermalsMeasured:false},null,2));
 console.log(JSON.stringify({synthetic:true,samples:samples.length,failures:samples.filter(s=>s.code||!s.advancing||s.result!=='result').length,output}));
}finally{
 if(initialized)await evaluate(`(async()=>{globalThis.__sw006Soak?.worker.terminate();delete globalThis.__sw006Soak;const p=Capacitor.Plugins.C121Camera;await p.disconnect();await p.removeCredentials({cameraId:'synthetic-soak'});return {disconnected:true};})()`).catch(()=>{});
 ws.close();
}
