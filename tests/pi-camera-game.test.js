import {it,expect,afterEach} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {LocalGames} from '../device/pi/local-game.js';
import {GameStore} from '../device/pi/store.js';
const resources=[];afterEach(()=>{for(const {hosts,dir} of resources){hosts.forEach(h=>h.close());fs.rmSync(dir,{recursive:true,force:true});}resources.length=0;});
const polygon=[[.2,.1],[.8,.1],[.9,.2],[.9,.8],[.8,.9],[.2,.9],[.1,.8],[.1,.2]];
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pi-camera-')),file=path.join(dir,'game.sqlite');let time=100000;const host=new LocalGames(file,{now:()=>time});resources.push({dir,hosts:[host]});const a=host.create('Alice'),b=host.join(a.room.code,'Bob');let serial=0;
 const play=(player,action)=>{const v=host.view(a.id,player.token);return host.play(a.id,player.token,{commandId:'camera-command-'+(++serial),revision:v.revision,action:{...action,turnId:v.game?.turn?.id}});};
 const pair=seats=>host.pair(a.id,a.token,{label:'Tray',seats});
 const frame=(calibrationId=null)=>({bootId:'boot-one',sequence:++serial,capturedAt:time,width:960,height:540,image:'data:image/png;base64,AAAA',mediaOrigin:'camera',dice:[1,2,3,4,5].map((value,i)=>({value,x:.3+i*.07,y:.5,bounds:[.28+i*.07,.48,.03,.04]})),rejected:[],calibrationId,recognizerVersion:'test'});
 const publish=(d,p)=>host.publish(a.id,d.deviceId,d.deviceToken,p);
 const configure=d=>{publish(d,frame());host.calibrate(a.id,a.token,d.deviceId,polygon);const profile=host.deviceContext(a.id,d.deviceId,d.deviceToken).profile;publish(d,frame(profile.calibrationId));return profile;};
 return {host,file,a,b,play,pair,frame,publish,configure,advance:n=>time+=n};}
const labels=[1,2,3,4,5].map((value,i)=>({value,x:.3+i*.07,y:.5}));
it('keeps camera review pinned during human review, corrects values, deduplicates and recovers accepted evidence',()=>{
 const f=fixture(),d=f.pair([0,1]);f.configure(d);f.play(f.a,{type:'start'});const p=f.host.freeze(f.a.id,f.a.token,d.deviceId);f.advance(60000);
 const request={commandId:'confirmed-camera-roll',revision:p.revision,action:{type:'roll',turnId:p.turnId,proposalId:p.id,dice:[6,2,3,4,5],labels:labels.map((l,i)=>({...l,value:i?l.value:6})),held:Array(5).fill(false),confirmed:true}};
 const v=f.host.play(f.a.id,f.a.token,request);expect(v.game.turn.rolls[0].source).toBe('camera');expect(v.game.events.at(-1).camera.observation.dice[0].value).toBe(1);
 expect(v.game.events.at(-1).camera.labels[0].value).toBe(6);expect(v.game.events.at(-1).camera.observation.image).toBeUndefined();
 const recovered=new LocalGames(f.file);resources.at(-1).hosts.push(recovered);expect(recovered.play(f.a.id,f.a.token,request).game.turn.rolls).toHaveLength(1);expect(recovered.view(f.a.id,f.a.token).proposal).toBeNull();
});
it('rejects foreign devices, wrong players, stale frames, replayed sequences and changed calibration',()=>{
 const f=fixture(),alice=f.pair([0]),bob=f.pair([1]);const profile=f.configure(alice);f.configure(bob);f.play(f.a,{type:'start'});
 expect(()=>f.host.freeze(f.a.id,f.b.token,alice.deviceId)).toThrow('assigned');expect(()=>f.host.freeze(f.a.id,f.a.token,bob.deviceId)).toThrow('assigned');
 const frame=f.frame(profile.calibrationId);f.publish(alice,frame);expect(()=>f.publish(alice,frame)).toThrow('Out-of-order');
 f.advance(3000);expect(()=>f.host.freeze(f.a.id,f.a.token,alice.deviceId)).toThrow('fresh');expect(()=>f.publish(alice,frame)).toThrow('Stale');
 f.publish(alice,f.frame(profile.calibrationId));f.host.freeze(f.a.id,f.a.token,alice.deviceId);expect(()=>f.host.calibrate(f.a.id,f.a.token,alice.deviceId,polygon)).toThrow('Discard');
 f.host.revoke(f.a.id,f.a.token,alice.deviceId);expect(()=>f.publish(alice,f.frame())).toThrow('session');expect(f.host.view(f.a.id,f.a.token).proposal).toBeNull();
});
it('runs two camera devices in one authoritative game across alternating seats',()=>{
 const f=fixture(),devices=[f.pair([0]),f.pair([1])],profiles=devices.map(f.configure);f.play(f.a,{type:'start'});
 for(let turn=0;turn<26;turn++){const seat=turn%2,player=seat?f.b:f.a,device=devices[seat];f.publish(device,f.frame(profiles[seat].calibrationId));const p=f.host.freeze(f.a.id,player.token,device.deviceId);let v=f.play(player,{type:'roll',confirmed:true,held:Array(5).fill(false),dice:labels.map(l=>l.value),labels,proposalId:p.id});const [category,value]=Object.entries(v.options.scores)[0];v=f.play(player,{type:'score',category,value});if(turn===25)expect(v.game.status).toBe('finished');}
 expect(f.host.view(f.a.id,f.a.token).game.events.filter(e=>e.camera)).toHaveLength(26);
});
it('uses SQLite compare-and-swap to reject a stale writer without losing state',()=>{
 const f=fixture(),one=new GameStore(f.file),two=new GameStore(f.file);try{const a=one.load(),b=two.load();one.save(a.state,a.revision);expect(()=>two.save(b.state,b.revision)).toThrow('Storage changed');expect(two.load().revision).toBe(a.revision+1);}finally{one.close();two.close();}
});
