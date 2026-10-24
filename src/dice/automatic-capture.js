import {GameCapture} from './game-capture.js';

// Prototype D6 flat-face check, using the same signed axes as the vendor parser.
// FS/MS still retain their original packet/quality in the captured evidence.
export function flatFace(event){
 if(!['FS','MS'].includes(event.packet)||!Array.isArray(event.xyz)||event.xyz.length!==3||!event.xyz.every(Number.isFinite))return false;
 const axes=event.xyz.map(Math.abs),axis=axes.indexOf(Math.max(...axes));
 const magnitude=Math.hypot(...event.xyz);
 const face=axis===0?(event.xyz[0]>0?6:1):axis===1?(event.xyz[1]>0?3:4):(event.xyz[2]>0?2:5);
 return magnitude>=48&&magnitude<=80&&axes[axis]/magnitude>=.97&&face===event.face;
}

// Untouched dice retain their last confirmed face. Any die that reports movement
// joins this reroll, even if it is picked up after another die has settled.
export class AutomaticCapture extends GameCapture {
 receiveFor(game,status,event){
  this.sync(game,status);
  if(game?.turn?.source!=='godice'||status.paused)return;
  const device=status.dice.find(d=>d.id===event.id);
  if(!device?.connected||device.epoch!==event.epoch)return;
  if(!this.capture){
   if(event.kind!=='moving')return;
   const rolls=game.turn.rolls.filter(r=>!r.excluded),last=rolls.at(-1);
   if(rolls.length>=game.turn.limit||status.dice.length!==5||status.dice.some(d=>!d.connected))return;
   const same=last&&JSON.stringify(last.deviceIds)===JSON.stringify(status.dice.map(d=>d.id));
   this.arm(game,status,status.dice.map(d=>!!same&&d.id!==event.id));
  }
  const round=this.capture?.turn?.round;
  if(round&&!this.capture.turn.paused&&event.kind==='uncertain'&&flatFace(event)){
   event={...event,reportedKind:event.kind,kind:'stable',resolution:'flat-face-estimate'};
  }
  if(round&&!this.capture.turn.paused&&event.kind==='stable'){
   const i=this.hardware.findIndex(d=>d.id===event.id&&d.epoch===event.epoch);
   if(i>=0){
    // Recover from an intermediate tilt. A changed face means the die joined
    // this roll, even if its separate R notification was lost.
    round.invalid.delete(event.id);
    if(!round.held[i]||round.faces[i]!==event.face){
     round.held[i]=false;
     if(!round.moved.has(event.id))this.capture.record('movement-inferred-from-settled-face',{id:event.id,face:event.face});
     round.moved.add(event.id);
    }
   }
  }
  if(round&&event.kind==='moving'){
   const i=this.hardware.findIndex(d=>d.id===event.id&&d.epoch===event.epoch);
   if(i>=0){round.held[i]=false;round.invalid.delete(event.id);}
  }
  this.receive(event);
 }
}
