// Initial headless vision service, NOT a game authority or public API.
import fs from 'node:fs';
import http from 'node:http';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadVision,processFrame} from './vision.js';

const profilePath=process.argv[2];
if(!profilePath)throw Error('Usage: node device/pi/host.mjs path-to-confirmed-profile.json [--stdin]');
const profile=JSON.parse(fs.readFileSync(profilePath,'utf8'));
const {cv}=await loadVision('public/camera-assets/opencv.js');
let latest=null,error=null;
const child=process.argv.includes('--stdin')?null:spawn(process.env.PI_PYTHON||'python3',['-u',fileURLToPath(new URL('./capture.py',import.meta.url))],{stdio:['pipe','pipe','inherit']});
const reader=readline.createInterface({input:child?child.stdout:process.stdin});
reader.on('line',line=>{try{if(line.length>12000000)throw Error('Frame exceeds input limit');latest=processFrame(cv,JSON.parse(line),profile);error=null;}catch(e){latest=null;error=e.message;}if(child&&!child.killed)setTimeout(()=>child.stdin.write('{}\n'),200);});
child?.stdin.write('{}\n');
reader.on('close',()=>{latest=null;error='Capture stopped';});
child?.on('error',e=>{latest=null;error=e.message;});
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.method!=='GET'||!['/health','/observation'].includes(req.url)){res.writeHead(404);res.end('{}');return;}
 const fresh=latest&&Date.now()-latest.receivedAt<2500;
 if(req.url==='/health'){res.end(JSON.stringify({service:'dice-pi-vision',camera:fresh?'receiving':'unavailable',error,gameAuthority:false}));return;}
 res.writeHead(fresh?200:503);res.end(JSON.stringify(fresh?latest:{error:error||'No fresh camera frame'}));
});
server.listen(Number(process.env.PI_PORT||8480),'127.0.0.1',()=>console.log('Pi vision prototype: http://127.0.0.1:8480/health (loopback only)'));
function stop(){reader.close();child?.kill();server.close();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
