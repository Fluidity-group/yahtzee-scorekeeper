// Provider-neutral acceptance boundary. No camera or BLE dependencies.
export class InputCoordinator {
 constructor({now=()=>Date.now(),id=()=>crypto.randomUUID()}={}){this.now=now;this.id=id;this.records=[];this.session=null;this.pending=null;this.context=null;this.sequence=0;}
 start(source){if(!['camera','godice','manual-faces','simulated'].includes(source))throw Error('Unknown input source');this.source=source;this.session=this.id();this.context=null;this.pending=null;this.sequence=0;return this.session;}
 arm(context){if(!this.session)throw Error('Start an input first');this.context=structuredClone(context);this.captureId=this.id();this.pending=null;return this.captureId;}
 invalidate(){this.pending=null;}
 receive(e){
  if(e.sessionId!==this.session||e.source!==this.source||!Number.isInteger(e.sequence)||e.sequence<=this.sequence)return false;
  this.sequence=e.sequence;
  if(e.kind==='invalidated'){this.invalidate();return true;}
  if(e.kind!=='candidate'||e.captureId!==this.captureId||JSON.stringify(e.context)!==JSON.stringify(this.context))return false;
  if(!Array.isArray(e.dice)||e.dice.length!==5||!e.dice.every(d=>Number.isInteger(d.value)&&d.value>=1&&d.value<=6))return false;
  if(!Number.isFinite(e.observedAt)||this.now()-e.observedAt>2000||e.observedAt>this.now()+100)return false;
  this.pending=structuredClone(e);return true;
 }
 accept({values,heldMask,playerId,previous=null,rollNumber,corrections=[]}){
  const p=this.pending;if(!p||this.now()-p.observedAt>2000)throw Error('Capture a fresh settled scene.');
  if(playerId!==this.context.playerId)throw Error('Player changed. Capture again.');
  if(!Array.isArray(values)||values.length!==5||!values.every(v=>Number.isInteger(v)&&v>=1&&v<=6))throw Error('Enter five values from 1 to 6.');
  if(!Array.isArray(heldMask)||heldMask.length!==5||!heldMask.every(v=>typeof v==='boolean'))throw Error('Confirm which dice were held.');
  if(!previous&&heldMask.some(Boolean))throw Error('First roll must roll all five dice.');
  if(heldMask.every(Boolean))throw Error('Reroll at least one die.');
  if(previous&&heldMask.some((h,i)=>h&&values[i]!==previous.after[i]))throw Error('Held values must match the previous roll.');
  const record={version:1,rollId:this.id(),previousRollId:previous?.rollId??null,...this.context,source:this.source,sessionId:this.session,captureId:this.captureId,rollNumber,capturedAt:p.observedAt,acceptedAt:this.now(),before:previous?.after??null,after:[...values],heldMask:[...heldMask],heldValues:values.filter((_,i)=>heldMask[i]),rolledValues:values.filter((_,i)=>!heldMask[i]),rerolledSlots:heldMask.flatMap((h,i)=>h?[]:[i]),identityScope:'logical-slots',observation:p,corrections};
  this.records.push(record);this.pending=null;this.captureId=null;return record;
 }
 stop(){this.session=null;this.context=null;this.pending=null;this.captureId=null;}
}
