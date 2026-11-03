import {spawn} from 'node:child_process';
import {access,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {constants} from 'node:fs';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function availablePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function installedChrome(){
 for(const path of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'])try{await access(path,constants.X_OK);return path;}catch{}
 throw Error('A supported sandboxed Chrome installation is required for CI browser checks.');
}
async function ready(child,pattern,timeout=20000){
 let output='';
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(Error('Browser test process did not become ready: '+output.slice(-3000))),timeout);
  const data=chunk=>{output+=String(chunk).replace(/\u001b\[[0-9;]*m/g,'');const match=output.match(pattern);if(match)finish(null,match[1]||match[0]);};
  const exit=code=>finish(Error('Browser test process exited '+code+': '+output.slice(-3000)));
  const onError=e=>finish(e);
  function finish(error,value){clearTimeout(timer);child.stdout?.off('data',data);child.stderr?.off('data',data);child.off('exit',exit);child.off('error',onError);error?reject(error):resolve(value);}
  child.stdout?.on('data',data);child.stderr?.on('data',data);child.once('exit',exit);child.once('error',onError);
 });
}
class Protocol {
 constructor(socket){this.socket=socket;this.next=0;this.pending=new Map();this.errors=[];this.urls=[];
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''));else if(m.method==='Network.requestWillBeSent')this.urls.push(m.params.request.url);});
  socket.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Browser protocol closed'));}this.pending.clear();});
 }
 send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++this.next,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Browser protocol timeout: '+method));},20000);this.pending.set(id,{resolve,reject,timer});try{this.socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}});}
 async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},this.session);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
 async until(expression){for(let n=0;n<150;n++){if(await this.evaluate(expression))return;await delay(100);}throw Error('Browser UI condition not met: '+expression);}
 close(){this.socket.close();}
}
function assert(value,message){if(!value)throw Error(message);}

// Ephemeral CI profile; native Chrome sandbox stays enabled. No flags disable it.
export async function checkReportBrowser({directory=resolve(root,'artifacts/engineering/browser-reports'),liveUrl=null,expectedSource=null}={}){
 await mkdir(directory,{recursive:true});const profile=await mkdtemp(resolve(directory,'profile-'));
 let vite,chrome,protocol;
 try{
  const executable=await installedChrome(),port=await availablePort();
  vite=spawn(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort','--mode','ios-test'],{cwd:root,stdio:['ignore','pipe','pipe']});
  await ready(vite,/Local:\s+(http:\/\/[^\s]+)/);
  chrome=spawn(executable,['--headless','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{cwd:root,stdio:['ignore','pipe','pipe']});
  const websocket=await ready(chrome,/DevTools listening on (ws:\/\/[^\s]+)/);
  const socket=new WebSocket(websocket);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});protocol=new Protocol(socket);
  const target=await protocol.send('Target.createTarget',{url:'about:blank'}),attached=await protocol.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});protocol.session=attached.sessionId;
  await protocol.send('Page.enable',{},protocol.session);await protocol.send('Runtime.enable',{},protocol.session);await protocol.send('Network.enable',{},protocol.session);
  const results=[];
  for(const width of [320,390,1024]){
   await protocol.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false},protocol.session);
   await protocol.send('Page.navigate',{url:`http://127.0.0.1:${port}/tests/helpers/reports-browser.html`},protocol.session);
   await protocol.until('!!document.querySelector(".report-filters")');
   assert(await protocol.evaluate('document.body.textContent.includes("Overall player results")'),'Overall results missing');
   assert(await protocol.evaluate('document.body.textContent.includes("History coverage")'),'Missing-history warning missing');
   assert(await protocol.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Overall page overflow at '+width);
   const shot=async name=>{const metrics=await protocol.send('Page.getLayoutMetrics',{},protocol.session),size=metrics.cssContentSize||metrics.contentSize;const png=await protocol.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(size.height),scale:1}},protocol.session);await writeFile(resolve(directory,name+'-'+width+'.png'),Buffer.from(png.data,'base64'));};
   await shot('overall');
   await protocol.evaluate('document.querySelector("[data-report-page=patterns]").click()');await protocol.until('!!document.querySelector("[data-report-chart] svg")');
   assert(await protocol.evaluate('document.querySelectorAll("tbody tr").length>=13'),'Category rows missing');
   await protocol.evaluate('(()=>{const s=document.querySelector("[data-report-filter=player]");s.value="two";s.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("[data-report-filter=player]").focus();})()');
   assert(await protocol.evaluate('document.body.textContent.includes("Sam’s scores over time")'),'Player switch failed');
   assert(await protocol.evaluate('document.activeElement.matches("[data-report-filter=player]")'),'Keyboard focus lost after player selection');
   assert(await protocol.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Pattern page overflow at '+width);await shot('patterns');
   await protocol.evaluate('document.querySelector("[data-report-page=overall]").click();document.querySelector("[data-report-tournament]").click()');
   assert(await protocol.evaluate('document.body.textContent.includes("Final accepted totals")'),'Tournament detail missing');
   const calls=await protocol.evaluate('window.reportCalls');assert(calls.every(c=>['sessions','history','read'].includes(c.operation)&&c.owner==='one'),'Unexpected write or account in browser harness');
   results.push({width,overall:true,patterns:true,playerSelection:true,keyboardFocus:true,tournamentDetail:true,bodyOverflow:false,readOnlyCalls:calls.length});
  }
  let liveGate=null;
  if(liveUrl){
   assert(liveUrl==='https://fluidity-group.github.io/yahtzee-scorekeeper/?reports=1','Unexpected live report target');
   assert(/^[a-f0-9]{40}$/.test(expectedSource||''),'Missing pinned live source');
   await protocol.send('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:false},protocol.session);
   await protocol.send('Page.navigate',{url:liveUrl},protocol.session);await protocol.until('!!document.querySelector("[data-report-form=signin]")');
   assert(await protocol.evaluate('document.title.includes("Clubhouse Reports")'),'Live reporting entry missing');
   assert(await protocol.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Live sign-in page overflow');
   assert(await protocol.evaluate('document.querySelector("[name=password]")?.autocomplete==="current-password"'),'Existing-account password form missing');
   const identity=await protocol.evaluate('fetch("./build-identity.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Build identity unavailable");return r.json();})');
   assert(identity.commit===expectedSource,'Live source identity differs from release record');
   const png=await protocol.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},protocol.session);await writeFile(resolve(directory,'live-signin-390.png'),Buffer.from(png.data,'base64'));
   liveGate={url:liveUrl,source:identity.commit,existingAccountForm:true,anonymousOnly:true,bodyOverflow:false};
  }
  assert(!protocol.errors.length,protocol.errors.join('\n'));
  assert(protocol.urls.every(url=>url.startsWith(`http://127.0.0.1:${port}/`)||liveUrl&&(url.startsWith('https://fluidity-group.github.io/yahtzee-scorekeeper/')||url.startsWith('https://ezgawsdmvuoqrxlfbgen.supabase.co/auth/v1/'))),'Unexpected browser request');
  const evidence={passed:true,synthetic:true,browser:'Runner installed Google Chrome, native sandbox enabled',results,pageErrors:protocol.errors,liveGate,realAccountOrDeviceAccess:false};
  await writeFile(resolve(directory,'browser-check.json'),JSON.stringify(evidence,null,2)+'\n');return evidence;
 }finally{
  protocol?.close();
  for(const child of [chrome,vite])if(child&&child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await Promise.race([once(child,'exit'),delay(3000)]);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await Promise.race([once(child,'exit'),delay(3000)]);}}
  await rm(profile,{recursive:true,force:true});
 }
}
