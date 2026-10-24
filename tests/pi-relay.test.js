import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';import {once} from 'node:events';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {PNG} from 'pngjs';

// Optional camera runtime follows the same contract as camera-recognizer.test.js.
const cameraRoot=process.env.PI_TEST_RELEASE_ROOT||process.cwd();
it.skipIf(!fs.existsSync(path.join(cameraRoot,'public/camera-assets/opencv.js')))('runs the actual outbound replay agent, calibrates, freezes and accepts a camera roll over HTTP',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pi-relay-')),children=[],errors=[];
 const start=(args,env={})=>{const c=spawn(process.execPath,args,{cwd:process.env.PI_TEST_RELEASE_ROOT||process.cwd(),env:{...process.env,...env},stdio:['ignore','pipe','pipe']});children.push(c);c.stderr.on('data',s=>errors.push(String(s)));return c;};
 const key='relay-test-host-key-123456789';
 try{
  const server=start(['device/pi/game-host.mjs'],{PI_GAME_FILE:path.join(dir,'game.sqlite'),PI_GAME_PORT:'0',PI_SETUP_KEY:key});const [line]=await once(server.stdout,'data');const base=String(line).match(/http:\/\/[^ ]+/)[0];
  const request=async(url,body,token)=>{const r=await fetch(base+url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
  const a=await request('/api/create',{name:'Alice'},key),room='/api/rooms/'+a.id;
  const device=await request(room+'/pair',{label:'Replay tray',seats:[0]},a.token);
  const width=960,height=540,data=Buffer.alloc(width*height*4);for(let i=0;i<data.length;i+=4)data.set([18,35,70,255],i);
  for(let n=0;n<5;n++){const cx=200+n*120,cy=260;for(let y=cy-20;y<cy+20;y++)for(let x=cx-20;x<cx+20;x++)data.set([240,240,230,255],(y*width+x)*4);for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if(x*x+y*y<=16)data.set([15,15,15,255],((cy+y)*width+cx+x)*4);}
  const replay=path.join(dir,'replay.json');fs.writeFileSync(replay,JSON.stringify({samples:[{image:'data:image/png;base64,'+PNG.sync.write({width,height,data}).toString('base64')}]}));
  const config=path.join(dir,'agent.json');fs.writeFileSync(config,JSON.stringify({...device,authorityURL:base,replayFile:replay}));start(['device/pi/agent.mjs',config]);
  const poll=async fn=>{let error;for(let i=0;i<40;i++){try{return await fn();}catch(e){error=e;await new Promise(r=>setTimeout(r,250));}}throw Error(error.message+' '+errors.join('\n'));};
  const preview=()=>request(room+'/preview?device='+device.deviceId,null,a.token);
  await poll(preview);
  await request(room+'/calibrate',{deviceId:device.deviceId,polygon:[[.1,.1],[.9,.1],[.95,.2],[.95,.8],[.9,.9],[.1,.9],[.05,.8],[.05,.2]]},a.token);
  await poll(async()=>{const p=await preview();if(!p.calibrated||p.dice.length!==5)throw Error('Waiting for calibrated recognition');return p;});
  let v=await request(room,null,a.token);v=await request(room,{commandId:'start-relay-game',revision:v.revision,action:{type:'start'}},a.token);
  const p=await request(room+'/freeze',{deviceId:device.deviceId},a.token);expect(p.observation.dice.map(d=>d.value)).toEqual([1,1,1,1,1]);expect(p.observation.mediaOrigin).toBe('replay');
  v=await request(room,{commandId:'accept-relay-roll',revision:p.revision,action:{type:'roll',turnId:p.turnId,proposalId:p.id,confirmed:true,dice:[1,1,1,1,1],held:Array(5).fill(false),labels:p.observation.dice.map(d=>({x:d.x,y:d.y,value:d.value}))}},a.token);
  expect(v.game.turn.rolls).toHaveLength(1);expect(v.game.turn.rolls[0].source).toBe('camera-replay');
 }finally{for(const c of children.reverse()){if(c.exitCode===null){const exit=once(c,'exit');c.kill();await exit;}}fs.rmSync(dir,{recursive:true,force:true});}
},45000);
