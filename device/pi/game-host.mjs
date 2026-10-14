import http from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {LocalGames} from './local-game.js';
import QRCode from 'qrcode';
const games=new LocalGames(process.env.PI_GAME_FILE||'artifacts/pi-local/games.sqlite');
const host=process.env.PI_GAME_BIND||'127.0.0.1',port=Number(process.env.PI_GAME_PORT||8481);
const setupKey=process.env.PI_SETUP_KEY;
if(!setupKey||setupKey.length<24)throw Error('Set PI_SETUP_KEY to a random secret of at least 24 characters');
const limits=new Map();
setInterval(()=>{for(const [key,value] of limits)if(Date.now()-value.at>60000)limits.delete(key);},60000).unref();
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const respond=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
  const url=new URL(req.url,'http://localhost');
  const bucket=req.socket.remoteAddress+(['/api/create','/api/join','/api/recover'].includes(url.pathname)?':join':':api');
  const count=limits.get(bucket)||{at:Date.now(),count:0};if(Date.now()-count.at>60000){count.at=Date.now();count.count=0;}count.count++;limits.set(bucket,count);if(count.count>(bucket.endsWith(':join')?30:1200)){respond(429,{error:'Too many requests; wait a minute'});return;}
  if(req.method==='GET'&&['/','/client.js'].includes(url.pathname)){
   res.writeHead(200,{'Content-Type':url.pathname==='/'?'text/html; charset=utf-8':'text/javascript'});
   res.end(fs.readFileSync(fileURLToPath(new URL(url.pathname==='/'?'./web/index.html':'./web/client.js',import.meta.url))));return;
  }
  if(req.headers.origin&&req.headers.origin!==(process.env.PI_PUBLIC_ORIGIN||`http://${req.headers.host}`))throw Error('Origin rejected');
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');
  const roomRoute=url.pathname.match(/^\/api\/rooms\/([\w-]+)(?:\/(\w+))?$/),deviceRoute=url.pathname.match(/^\/api\/devices\/([\w-]+)\/([\w-]+)$/);
  if(req.method==='GET'&&deviceRoute){respond(200,games.deviceContext(deviceRoute[1],deviceRoute[2],token));return;}
  if(req.method==='GET'&&roomRoute){
   const [,id,operation]=roomRoute;
   if(operation==='preview'){respond(200,games.preview(id,token,url.searchParams.get('device')));return;}
   if(operation==='samples'){respond(200,games.samples(id,token));return;}
   if(operation==='qr'){const room=games.view(id,token);respond(200,{image:await QRCode.toDataURL(`${process.env.PI_PUBLIC_ORIGIN||`http://${req.headers.host}`}/?join=${room.code}`)});return;}
   if(operation)throw Error('Unknown operation');respond(200,games.view(id,token));return;
  }
  if(req.method!=='POST'){respond(404,{error:'Not found'});return;}
  if(!String(req.headers['content-type']).startsWith('application/json'))throw Error('JSON required');
  let body='';for await(const chunk of req){body+=chunk;if(body.length>(deviceRoute?2400000:16000))throw Error('Request too large');}
  const data=JSON.parse(body);
  if(deviceRoute){respond(200,games.publish(deviceRoute[1],deviceRoute[2],token,data));return;}
  if(req.url==='/api/create'){if(token!==setupKey)throw Error('Host setup key required');respond(200,games.create(data.name));}
  else if(req.url==='/api/recover'){if(token!==setupKey)throw Error('Host setup key required');respond(200,games.recover(data.code,data.seat));}
  else if(req.url==='/api/join')respond(200,games.join(data.code,data.name));
  else if(roomRoute){const [,id,operation]=roomRoute;
   if(operation==='pair')respond(200,games.pair(id,token,data));
   else if(operation==='revoke'){games.revoke(id,token,data.deviceId);respond(200,{ok:true});}
   else if(operation==='calibrate')respond(200,games.calibrate(id,token,data.deviceId,data.polygon));
   else if(operation==='freeze')respond(200,games.freeze(id,token,data.deviceId));
   else if(operation==='discard'){games.discard(id,token);respond(200,{ok:true});}
   else if(operation)throw Error('Unknown operation');
   else respond(200,games.play(id,token,data));
  }
  else respond(404,{error:'Not found'});
 }catch(e){respond(400,{error:e.message});}
});
server.requestTimeout=10000;server.listen(port,host,()=>console.log(`Local game prototype http://${host}:${server.address().port} — camera review and manual confirmation`));
function stop(){server.close(()=>games.close());}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
