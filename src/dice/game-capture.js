import {DiceCapture} from './capture.js';

// A capture belongs to one persisted game revision and one fixed physical dice set.
export class GameCapture {
 constructor(){this.capture=null;this.context=null;this.hardware=[];this.raw=[];this.readings=new Map();this.overrides=[];}
 arm(game,status,held){
  if(!game.turn||game.turn.source!=='godice')throw new Error('Start a GoDice turn first.');
  if(status.paused||status.dice.length!==5||status.dice.some(d=>!d.connected))throw new Error('Connect five dice and keep the app open.');
  const rolls=game.turn.rolls.filter(r=>!r.excluded),last=rolls.at(-1);
  const ids=status.dice.map(d=>d.id);
  if(last&&held.some(Boolean)&&JSON.stringify(last.deviceIds)!==JSON.stringify(ids))throw new Error('The dice set changed. Release all holds before rolling again.');
  const capture=new DiceCapture();ids.forEach(id=>capture.connect(id));
  capture.start({turnId:game.turn.id,playerId:game.players[game.activeSeat].id,limit:game.turn.limit});
  capture.turn.accepted=rolls.map(r=>({dice:[...r.dice],held:[...r.held]}));
  capture.arm(held);
  this.capture=capture;this.context={gameId:game.id,revision:game.revision,turnId:game.turn.id,playerId:game.players[game.activeSeat].id};
  this.hardware=status.dice.map(d=>({id:d.id,epoch:d.epoch}));this.raw=[];this.readings=new Map();this.overrides=[];
 }
 sync(game,status){
  if(!this.capture)return;
  if(!game||game.id!==this.context.gameId||game.revision!==this.context.revision||game.turn?.id!==this.context.turnId){this.cancel();return;}
  if(status.paused||status.dice.length!==5||this.hardware.some((d,i)=>!status.dice[i]?.connected||status.dice[i].id!==d.id||status.dice[i].epoch!==d.epoch))this.capture.pause('Dice connection changed or app paused. Cancel and capture again, or finish manually.');
 }
 receive(event){
  if(!this.capture?.turn?.round||this.capture.turn.paused)return;
  const hardware=this.hardware.find(d=>d.id===event.id);
  if(!hardware||hardware.epoch!==event.epoch)return;
  if(this.raw.length>=500){this.capture.pause('Too much movement. Cancel and capture again.');return;}
  this.raw.push({...event,time:Date.now()});
  if(event.kind==='raw')return;
  this.readings.set(event.id,{...event});
  this.capture.receive({...event,epoch:this.capture.devices.get(event.id).epoch,token:this.capture.turn.round.token});
 }
 candidate(){return this.capture?.candidate()||null;}
 action(game){
  if(!this.context||game.id!==this.context.gameId||game.revision!==this.context.revision||game.turn?.id!==this.context.turnId)throw new Error('The turn changed. Capture a fresh roll.');
  const candidate=this.candidate();if(!candidate)throw new Error('Wait for every rolled die to settle.');
  return {type:'roll',dice:candidate.dice,held:candidate.held,deviceIds:this.hardware.map(d=>d.id),capture:{...this.context,events:structuredClone(this.raw),evidence:structuredClone(this.capture.log),manualOverrides:structuredClone(this.overrides)}};
 }
 override(index,face){
  const round=this.capture?.turn?.round,device=this.hardware[index];
  if(!round||this.capture.turn.paused||!device||!Number.isInteger(face)||face<1||face>6)throw new Error('Start a fresh roll before correcting this die.');
  const original=this.readings.get(device.id)||null;
  if(round.faces[index]!==face)round.held[index]=false;
  round.faces[index]=face;round.moved.add(device.id);round.invalid.delete(device.id);
  this.capture.devices.get(device.id).state='stable';
  const correction={id:device.id,index,face,original,time:Date.now()};
  this.overrides.push(correction);this.capture.record('manual-face-override',correction);
 }
 cancel(){this.capture=null;this.context=null;this.hardware=[];this.raw=[];this.readings=new Map();this.overrides=[];}
}
