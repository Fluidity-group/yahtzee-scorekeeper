import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';import {once} from 'node:events';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
it('serves the phone UI and authenticated room API over HTTP',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pi-http-')),key='test-only-setup-key-123456789';
 const child=spawn(process.execPath,['device/pi/game-host.mjs'],{env:{...process.env,PI_GAME_PORT:'0',PI_SETUP_KEY:key,PI_GAME_FILE:path.join(dir,'games.json')},stdio:['ignore','pipe','pipe']});
 try{
  const [log]=await once(child.stdout,'data');const base=String(log).match(/http:\/\/[^ ]+/)[0];
  expect(await (await fetch(base)).text()).toContain('Confirm these five dice');
  const post=(url,body,token)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
  expect((await post('/api/create',{name:'Alice'},'bad')).status).toBe(400);
  const created=await (await post('/api/create',{name:'Alice'},key)).json();expect(created.room.names).toEqual(['Alice']);
  const joined=await (await post('/api/join',{name:'Bob',code:created.room.code},'')).json();expect(joined.room.names).toEqual(['Alice','Bob']);
  const response=await fetch(base+'/api/rooms/'+created.id,{headers:{Authorization:'Bearer '+created.token}});expect((await response.json()).names).toEqual(['Alice','Bob']);
  expect((await fetch(base+'/api/rooms/'+created.id)).status).toBe(400);
 }finally{const exited=once(child,'exit');child.kill();await exited;fs.rmSync(dir,{recursive:true,force:true});}
},15000);
