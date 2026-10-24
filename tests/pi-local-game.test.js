import {it,expect,afterEach} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {LocalGames} from '../device/pi/local-game.js';
const dirs=[];afterEach(()=>{for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
function setup(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pi-game-'));dirs.push(dir);const file=path.join(dir,'game.json'),host=new LocalGames(file),a=host.create('Alice'),b=host.join(a.room.code,'Bob');let n=0;const play=(who,action)=>{const v=host.view(a.id,who.token);return host.play(a.id,who.token,{commandId:`command-${++n}`,revision:v.revision,action:{...action,turnId:v.game?.turn?.id}});};return {host,file,a,b,play};}
it('enforces seat ownership, revisions, held dice and roll limits; retries survive restart',()=>{
 const {host,file,a,b,play}=setup();expect(()=>play(b,{type:'start'})).toThrow('host');let v=play(a,{type:'start'});
 const request={commandId:'roll-first',revision:v.revision,action:{type:'roll',turnId:v.game.turn.id,dice:[1,2,3,4,5],held:[false,false,false,false,false],confirmed:true}};
 expect(()=>host.play(a.id,b.token,request)).toThrow('another player');
 v=host.play(a.id,a.token,request);expect(v.game.turn.rolls).toHaveLength(1);
 const restarted=new LocalGames(file);expect(restarted.play(a.id,a.token,request).game.turn.rolls).toHaveLength(1);
 expect(()=>restarted.play(a.id,a.token,{...request,action:{...request.action,dice:[6,6,6,6,6]}})).toThrow('already used');
 expect(()=>host.play(a.id,a.token,{...request,commandId:'other-request'})).toThrow('changed');
 expect(()=>play(a,{type:'roll',dice:[6,2,3,4,5],held:[true,false,false,false,false],confirmed:true})).toThrow('Held');
 for(let i=0;i<2;i++)play(a,{type:'roll',dice:[1,2,3,4,5],confirmed:true});
 expect(()=>play(a,{type:'roll',dice:[1,2,3,4,5],confirmed:true})).toThrow('limit');
 expect(()=>play(a,{type:'score',category:'chance',value:30})).toThrow('match');
 v=play(a,{type:'score',category:'chance',value:15});expect(v.game.activeSeat).toBe(1);
 expect(()=>host.view(a.id,'wrong')).toThrow('session');expect(JSON.stringify(v)).not.toContain('fingerprint');
});
it('completes and recovers an entire two-player game using server-calculated scores',()=>{
 const {host,file,a,b,play}=setup();let v=play(a,{type:'start'});
 for(let turn=0;turn<26;turn++){
  const who=v.game.activeSeat===0?a:b;
  v=play(who,{type:'roll',dice:[1,2,3,4,5],confirmed:true});const [category,value]=Object.entries(v.options.scores)[0];
  v=play(who,{type:'score',category,value});
 }
 expect(v.game.status).toBe('finished');expect(v.game.turns).toHaveLength(26);
 expect(new LocalGames(file).view(a.id,a.token).totals).toEqual(v.totals);
});
