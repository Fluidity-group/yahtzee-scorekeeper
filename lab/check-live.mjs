import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),base='http://192.168.1.148:8475';
const evidence={checkedAt:new Date().toISOString(),http:[],hmr:false,offlineConfiguration:false};
const get=async path=>{const response=await fetch(base+path,{signal:AbortSignal.timeout(15000)});const text=await response.text();if(!response.ok)throw Error(path+' '+response.status);evidence.http.push({path,status:response.status,bytes:text.length});return text;};
for(const path of ['/lab/','/','/lab/entry.js','/src/bootstrap.js','/lab/workbench.js','/src/prototype.js','/__lab/status','/__lab/requests'])await get(path);
const entryHtml=await get('/');
if(!/<script\b[^>]*src=["']\/lab\/entry\.js(?:[?#][^"']*)?["']/.test(entryHtml)||/<script\b[^>]*src=["']\/src\/bootstrap\.js/.test(entryHtml))throw Error('The page bypassed the lab UUID entry');
const client=await get('/src/multiplayer/client.js');
const env=JSON.parse(client.match(/import\.meta\.env = (\{[^;]+\});/)?.[1]||'null');
if(!env||env.VITE_SUPABASE_URL!==''||env.VITE_SUPABASE_ANON_KEY!==''||env.VITE_COMMENTARY_URL!==''||env.MODE!=='ios-test')throw Error('Cloud config was not blanked');
evidence.offlineConfiguration=true;
const vite=await get('/@vite/client'),token=vite.match(/const wsToken\s*=\s*"([^"]+)"/)?.[1];
if(!token)throw Error('No live-reload token');
await get('/lab/hmr-probe.js');
const file=resolve(root,'lab/hmr-probe.js'),original=readFileSync(file,'utf8');
const socket=new WebSocket(base.replace('http:','ws:')+'/?token='+encodeURIComponent(token),'vite-hmr');
try{
 await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(Error('Live-reload connection timed out')),8000);socket.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.type==='connected'){clearTimeout(timer);done();}});socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Live-reload connection failed'));});});
 const updated=new Promise((done,reject)=>{const timer=setTimeout(()=>reject(Error('Source update was not delivered')),8000);socket.addEventListener('message',event=>{const value=JSON.parse(event.data);if(value.type==='update'&&value.updates?.some(update=>update.path==='/lab/hmr-probe.js')){clearTimeout(timer);done();}});});
 writeFileSync(file,original.replace("'ready'",JSON.stringify('checked-'+Date.now())));await updated;evidence.hmr=true;
 const hotHtml=await get('/');if(!/<script\b[^>]*src=["']\/lab\/entry\.js(?:[?#][^"']*)?["']/.test(hotHtml))throw Error('Hot reload bypassed the lab UUID entry');evidence.uuidEntry=true;
}finally{writeFileSync(file,original);socket.close();}
mkdirSync(resolve(root,'artifacts/amber-lab'),{recursive:true});writeFileSync(resolve(root,'artifacts/amber-lab/live-check.json'),JSON.stringify(evidence,null,2));
console.log('LAN pages/scripts/API passed; cloud configuration blank; WebSocket delivered a real source-file update.');
