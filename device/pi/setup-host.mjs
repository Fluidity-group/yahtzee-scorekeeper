// Explicit physical setup mode only. Never runs as part of the game service.
import http from 'node:http';import fs from 'node:fs';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {wifiProfile,applyWifi} from './network-setup.js';
const dry=process.argv.includes('--dry-run'),token=process.env.DICE_SETUP_TOKEN;
if(!token||token.length<24)throw Error('Set a random DICE_SETUP_TOKEN (24+ characters)');
if(!dry&&process.getuid?.()!==0)throw Error('Network setup must be run explicitly as root on the Pi');
const exec=promisify(execFile),run=async args=>{if(!dry)await exec('nmcli',args,{timeout:45000});};
let ap,status='Ready',busy=false;
if(!dry){ap=wifiProfile({ssid:'Dice-Setup',password:process.env.DICE_AP_PASSWORD,hotspot:true});const file='/etc/NetworkManager/system-connections/dice-setup.nmconnection';fs.writeFileSync(file,ap.text,{mode:0o600});fs.chmodSync(file,0o600);await run(['connection','load',file]);await run(['connection','up','uuid',ap.id]);}
const html=`<!doctype html><meta name="viewport" content="width=device-width"><title>Dice Wi-Fi setup</title><style>body{font:20px system-ui;max-width:500px;margin:30px auto;padding:20px}input,button{font:inherit;padding:12px;display:block;margin:12px 0;max-width:90%}</style><h1>Connect your dice device</h1><p>Join Dice-Setup first. After saving, reconnect this phone to your home Wi-Fi. Setup closes after a successful connection.</p><label>Device setup code<input id="token" type="password"></label><label>Home Wi-Fi name<input id="ssid" maxlength="32"></label><label>Wi-Fi password<input id="password" type="password"></label><button id="save">Connect</button><p id="status" role="status"></p><script>document.getElementById('save').onclick=async()=>{const s=document.getElementById('status');try{const r=await fetch('/connect',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+document.getElementById('token').value},body:JSON.stringify({ssid:document.getElementById('ssid').value,password:document.getElementById('password').value})});const d=await r.json();s.textContent=d.message;document.getElementById('password').value='';}catch(e){s.textContent='Connection switched. Rejoin home Wi-Fi, or return to Dice-Setup if connection failed.';}};</script>`;
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const reply=(code,message)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify({message}));};
 if(req.url==='/'&&req.method==='GET'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(req.headers.authorization!==`Bearer ${token}`){reply(403,'Invalid device setup code');return;}
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){reply(403,'Origin rejected');return;}
 if(req.url==='/status'&&req.method==='GET'){reply(200,status);return;}
 if(req.url!=='/connect'||req.method!=='POST'||busy){reply(409,'Setup busy or invalid request');return;}
 try{
  let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Request too large');}const credentials=JSON.parse(body);wifiProfile(credentials);busy=true;status='Connecting';reply(202,'Connecting. Rejoin home Wi-Fi in about 30 seconds. If it fails, rejoin Dice-Setup and retry.');
  setTimeout(async()=>{try{await applyWifi(credentials,{fallbackId:ap?.id,run,write:async text=>{if(!dry){const f='/etc/NetworkManager/system-connections/dice-home.nmconnection';fs.writeFileSync(f,text,{mode:0o600});fs.chmodSync(f,0o600);}}});status=dry?'Dry run completed; no network changed':'Connected';if(!dry){clearTimeout(expiry);server.close();}}catch{status='Connection failed; rejoin Dice-Setup and retry.';}finally{busy=false;}},1000);
 }catch(e){reply(400,e.message);}
});
server.requestTimeout=10000;server.listen(8483,dry?'127.0.0.1':'10.42.0.1',()=>console.log(`Wi-Fi setup ${dry?'DRY RUN http://127.0.0.1:8483':'http://10.42.0.1:8483'} (15-minute window)`));
const expiry=setTimeout(async()=>{server.close();if(ap)await run(['connection','down','uuid',ap.id]).catch(()=>{});},15*60*1000);
function stop(){clearTimeout(expiry);server.close();if(ap)run(['connection','down','uuid',ap.id]).catch(()=>{});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
