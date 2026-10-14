import {randomUUID,randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createCoreGame,command,scoreOptions,results} from '../../src/game/core.js';
import {BASE_KEYS,META} from '../../src/game/categories.js';
import {validPolygon} from '../../src/dice/camera/tracking.js';
import {GameStore} from './store.js';

const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const name=s=>{if(typeof s!=='string'||!s.trim()||s.trim().length>24)throw Error('Use a name of 1–24 characters');return s.trim();};
export class LocalGames {
 constructor(file,{now=()=>Date.now()}={}){this.file=file;this.now=now;this.previews=new Map();this.proposals=new Map();this.previewRequests=new Map();if(!file.endsWith('.json'))this.store=new GameStore(file);this.reload();}
 reload(){if(this.store){const loaded=this.store.load();this.state=loaded.state;this.storageRevision=loaded.revision;}else this.state=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{rooms:{}};}
 close(){this.store?.close();}
 commit(state,sample=null){
  if(this.store){this.store.save(state,this.storageRevision,sample);this.storageRevision++;this.state=state;return;}
  fs.mkdirSync(path.dirname(this.file),{recursive:true});
  const temp=this.file+'.tmp',fd=fs.openSync(temp,'w',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(state));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.renameSync(temp,this.file);this.state=state;
 }
 create(player){
  this.reload();
  const state=structuredClone(this.state),id=randomUUID(),token=randomBytes(32).toString('hex');
  let code;do{code=randomBytes(5).toString('hex').toUpperCase();}while(Object.values(state.rooms).some(r=>r.code===code));
  state.rooms[id]={id,code,revision:0,members:[{name:name(player),key:hash(token)}],game:null,receipts:[]};
  this.commit(state);return {id,token,room:this.view(id,token)};
 }
 join(code,player){
  this.reload();
  const state=structuredClone(this.state),room=Object.values(state.rooms).find(r=>r.code===String(code).toUpperCase());
  if(!room||room.game)throw Error('Invitation unavailable or game already started');
  player=name(player);if(room.members.length>=8||room.members.some(m=>m.name.toLowerCase()===player.toLowerCase()))throw Error('Room full or name already used');
  const token=randomBytes(32).toString('hex');room.members.push({name:player,key:hash(token)});room.revision++;this.commit(state);
  return {id:room.id,token,room:this.view(room.id,token)};
 }
 recover(code,seat){this.reload();const state=structuredClone(this.state),r=Object.values(state.rooms).find(r=>r.code===String(code).toUpperCase());if(!r||!Number.isInteger(seat)||!r.members[seat])throw Error('Unknown room or seat');const token=randomBytes(32).toString('hex');r.members[seat].key=hash(token);r.revision++;this.commit(state);this.proposals.delete(r.id);return {id:r.id,token,room:this.view(r.id,token)};}
 samples(id,token){this.member(id,token);return {version:1,samples:this.store?.samples(id)||[]};}
 member(id,token){this.reload();const r=this.state.rooms[id],seat=r?.members.findIndex(m=>m.key===hash(token));if(!r||seat<0)throw Error('Invalid player session');return {r,seat};}
 pair(id,token,{label,seats}){
  const {r,seat}=this.member(id,token);if(seat!==0)throw Error('Only the host can pair cameras');
  if(!Array.isArray(seats)||!seats.length||new Set(seats).size!==seats.length||seats.some(s=>!Number.isInteger(s)||s<0||s>=r.members.length))throw Error('Choose valid player seats');
  if((r.devices||[]).filter(d=>!d.revoked).length>=8)throw Error('Eight cameras maximum');
  const state=structuredClone(this.state),deviceId=randomUUID(),deviceToken=randomBytes(32).toString('hex');
  (state.rooms[id].devices??=[]).push({id:deviceId,label:name(label),seats,key:hash(deviceToken),profile:null,revoked:false});
  state.rooms[id].revision++;this.commit(state);return {deviceId,deviceToken,roomId:id};
 }
 revoke(id,token,deviceId){const {seat}=this.member(id,token);if(seat!==0)throw Error('Only the host can revoke cameras');const state=structuredClone(this.state),d=state.rooms[id].devices?.find(d=>d.id===deviceId);if(!d)throw Error('Unknown camera');d.revoked=true;state.rooms[id].revision++;this.commit(state);this.previews.delete(deviceId);this.proposals.delete(id);}
 device(id,deviceId,token){this.reload();const r=this.state.rooms[id],d=r?.devices?.find(d=>d.id===deviceId&&!d.revoked&&d.key===hash(token));if(!d)throw Error('Invalid camera session');return {r,d};}
 deviceContext(id,deviceId,token){const {r,d}=this.device(id,deviceId,token);return {profile:d.profile,previewRequested:this.now()-(this.previewRequests.get(deviceId)??-Infinity)<60000,allowed:r.game?.status==='active'&&d.seats.includes(r.game.activeSeat),turnId:r.game?.turn?.id??null,revision:r.revision};}
 publish(id,deviceId,token,frame){
  const {d}=this.device(id,deviceId,token);
  if(!Number.isSafeInteger(frame.sequence)||frame.sequence<1||typeof frame.bootId!=='string'||frame.bootId.length>80)throw Error('Invalid frame identity');
  if(!Number.isFinite(frame.capturedAt)||this.now()-frame.capturedAt>2500||frame.capturedAt>this.now()+1000)throw Error('Stale camera frame; check device clock');
  if(frame.width!==960||frame.height!==540||typeof frame.image!=='string'||frame.image.length>2200000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(frame.image))throw Error('Invalid preview image');
  if(!['camera','replay'].includes(frame.mediaOrigin)||!Array.isArray(frame.dice)||frame.dice.length>20||!Array.isArray(frame.rejected)||frame.rejected.length>40)throw Error('Invalid observation');
  for(const die of [...frame.dice,...frame.rejected])if(!Number.isFinite(die.x)||!Number.isFinite(die.y)||die.x<0||die.x>1||die.y<0||die.y>1||!Array.isArray(die.bounds)||die.bounds.length!==4||die.bounds.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Invalid detection bounds');
  if(frame.dice.some(d=>!Number.isInteger(d.value)||d.value<1||d.value>6))throw Error('Invalid predicted value');
  const prior=this.previews.get(deviceId);if(prior?.bootId===frame.bootId&&frame.sequence<=prior.sequence)throw Error('Out-of-order camera frame');
  this.previews.set(deviceId,{...structuredClone(frame),deviceId,receivedAt:this.now(),calibrated:!!d.profile&&d.profile.calibrationId===frame.calibrationId});
  return {ok:true};
 }
 preview(id,token,deviceId){const {r,seat}=this.member(id,token),d=r.devices?.find(d=>d.id===deviceId&&!d.revoked);if(!d||seat!==0&&!d.seats.includes(seat))throw Error('Camera is not assigned to this player');this.previewRequests.set(deviceId,this.now());const p=this.previews.get(deviceId);if(!p||this.now()-p.capturedAt>2500)throw Error('No fresh frame from this camera');return p;}
 calibrate(id,token,deviceId,polygon){
  const {seat}=this.member(id,token);if(seat!==0)throw Error('Only the host can calibrate');
  const pending=this.proposals.get(id);if(pending)throw Error('Discard the frozen review before recalibrating');
  if(!validPolygon(polygon)||polygon.some(p=>p.some(v=>v<0||v>1)))throw Error('Mark eight convex tray corners in order');
  this.preview(id,token,deviceId);const state=structuredClone(this.state),d=state.rooms[id].devices.find(d=>d.id===deviceId);
  d.profile={calibrationId:randomUUID(),width:960,height:540,polygon:structuredClone(polygon),settings:{}};state.rooms[id].revision++;this.commit(state);return d.profile;
 }
 freeze(id,token,deviceId){
  const {r,seat}=this.member(id,token),d=r.devices?.find(d=>d.id===deviceId&&!d.revoked);
  if(!r.game?.turn||r.game.activeSeat!==seat||!d?.seats.includes(seat))throw Error('Only the active assigned player can freeze');
  if(r.game.turn.rolls.length>=r.game.turn.limit)throw Error('Roll limit reached');
  const observation=this.preview(id,token,deviceId);if(!observation.calibrated)throw Error('Confirm the camera tray boundary first');
  if(r.game.events.some(e=>e.camera?.deviceId===deviceId&&e.camera.observation.bootId===observation.bootId&&e.camera.observation.sequence===observation.sequence))throw Error('This frame was already recorded; wait for a new frame');
  const proposal={id:randomUUID(),revision:r.revision,turnId:r.game.turn.id,seat,deviceId,observation:structuredClone(observation),createdAt:this.now()};
  this.proposals.set(id,proposal);return proposal;
 }
 discard(id,token){const {seat}=this.member(id,token);if(this.proposals.get(id)?.seat!==seat&&seat!==0)throw Error('Not your review');this.proposals.delete(id);}
 view(id,token){
  const {r,seat}=this.member(id,token),last=r.game?.turn?.rolls.filter(x=>!x.excluded).at(-1);
  const p=this.proposals.get(id);if(p&&(p.revision!==r.revision||this.now()-p.createdAt>30*60*1000))this.proposals.delete(id);
  return {id:r.id,code:r.code,revision:r.revision,seat,names:r.members.map(m=>m.name),game:r.game,proposal:this.proposals.get(id)?.seat===seat?this.proposals.get(id):null,
   devices:(r.devices||[]).filter(d=>!d.revoked&&(seat===0||d.seats.includes(seat))).map(d=>({id:d.id,label:d.label,seats:d.seats,profile:d.profile})),
   options:last?scoreOptions(r.game,last.dice):null,totals:r.game?results(r.game):null,categories:BASE_KEYS.map(key=>({key,name:META[key].name}))};
 }
 play(id,token,request){
  const {r,seat}=this.member(id,token);const {commandId,revision,action}=request;
  if(typeof commandId!=='string'||!/^[\w-]{8,100}$/.test(commandId))throw Error('Invalid command ID');
  const fingerprint=hash(JSON.stringify(action)),prior=r.receipts.find(p=>p.id===commandId);
  if(prior){if(prior.seat!==seat||prior.fingerprint!==fingerprint)throw Error('Command ID already used');return this.view(id,token);}
  if(revision!==r.revision)throw Error('Game changed; refresh before confirming');
  const state=structuredClone(this.state),room=state.rooms[id];let archived=null;
  if(action?.type==='start'){
   if(seat!==0||room.game)throw Error('Only the host can start the lobby');
   room.game=createCoreGame({id,names:room.members.map(m=>m.name),source:'manual-faces'});
   room.game=command(room.game,{type:'start',seat:0},{id:commandId+'-turn'});
  }else{
   if(!room.game||!['roll','score','correct-roll'].includes(action?.type))throw Error('Unsupported action');
   if(action.turnId!==room.game.turn?.id)throw Error('Turn changed');
   if(action.type==='roll'&&action.confirmed!==true)throw Error('Confirm the dice before recording a roll');
   let evidence;
   if(action.proposalId){
    const p=this.proposals.get(id);if(!p||p.id!==action.proposalId||p.seat!==seat||p.revision!==revision||p.turnId!==action.turnId||this.now()-p.createdAt>30*60*1000)throw Error('Camera review expired or changed; freeze again');
    if(!room.devices?.some(d=>d.id===p.deviceId&&!d.revoked&&d.seats.includes(seat)&&d.profile?.calibrationId===p.observation.calibrationId))throw Error('Camera assignment changed');
    if(action.type!=='roll')throw Error('Camera review requires a new roll');
    if(!Array.isArray(action.labels)||action.labels.length!==5||action.labels.some((l,i)=>!Number.isFinite(l.x)||!Number.isFinite(l.y)||l.x<0||l.x>1||l.y<0||l.y>1||l.value!==action.dice[i]))throw Error('Label all five die positions in logical slot order');
    if(action.labels.some((l,i)=>action.labels.some((other,j)=>i!==j&&Math.hypot(l.x-other.x,l.y-other.y)<.008)))throw Error('Label five distinct dice');
    if(!Array.isArray(action.held)||action.held.length!==5||action.held.some(v=>typeof v!=='boolean'))throw Error('Confirm the held slots');
    if(process.env.PI_SAVE_IMAGES==='true')archived={id:p.id,roomId:id,image:p.observation.image,actual:[...action.dice],dieLabels:structuredClone(action.labels),prediction:{dice:p.observation.dice,rejected:p.observation.rejected},polygon:room.devices.find(d=>d.id===p.deviceId).profile.polygon,settings:{},source:p.observation.mediaOrigin,recognizerVersion:p.observation.recognizerVersion,confirmedAt:this.now(),labelType:'position-labelled-five-dice'};
    evidence={...p,observation:{...p.observation,image:undefined},labels:structuredClone(action.labels),confirmedAt:this.now(),source:p.observation.mediaOrigin==='replay'?'camera-replay':'camera'};
   }
   const clean={type:action.type,seat,dice:action.dice,held:action.held,category:action.category,value:action.value};
   room.game=command(room.game,clean,{id:commandId});
   if(evidence){const e=room.game.events.find(e=>e.commandId===commandId&&e.type==='roll');e.source=evidence.source;e.camera=evidence;room.game.turn.rolls.at(-1).source=evidence.source;}
   if(room.game.status==='active'&&!room.game.turn)room.game=command(room.game,{type:'start',seat:room.game.activeSeat},{id:commandId+'-next'});
  }
  room.revision++;room.receipts.push({id:commandId,seat,fingerprint});this.commit(state,archived);this.proposals.delete(id);return this.view(id,token);
 }
}
