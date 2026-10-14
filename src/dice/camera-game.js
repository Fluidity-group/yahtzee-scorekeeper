import {scoreOptions,validateCameraCapture,validateDice} from '../game/core.js';

const context=game=>({gameId:game.id,revision:game.revision,turnId:game.turn?.id,playerId:game.players[game.activeSeat].id});
const FRAME_FIELDS=['version','cameraId','sessionId','sequence','frameId','width','height','orientation','calibrationId','mediaOrigin','receivedAtMonotonicMs','decodedAtMonotonicMs','observedAtMonotonicMs','ageUpperBoundMs','bridgeReceivedAtMonotonicMs','timestampMeaning'];
// Pure adapter: the caller explicitly persists commands through its own authority.
// Values are logical slots confirmed by the reviewer, never tracked physical IDs.
export class CameraGame {
 constructor({now=()=>performance.now(),id=()=>crypto.randomUUID(),maxFrameAgeMs=2000}={}){this.now=now;this.id=id;this.maxFrameAgeMs=maxFrameAgeMs;this.pending=null;this.identity=null;this.sequence=0;}
 get commandId(){return this.pending?.commandId??null;}
 start({cameraId,sessionId,calibrationId}){
  if(![cameraId,sessionId,calibrationId].every(v=>typeof v==='string'&&v.length))throw Error('Confirm camera session and calibration.');
  this.identity={cameraId,sessionId,calibrationId};this.sequence=0;this.pending=null;
 }
 receive(game,observation){
  if(game.turn?.source!=='camera'||!this.identity)return false;
  if(!Object.entries(this.identity).every(([k,v])=>observation?.[k]===v)||!Number.isInteger(observation.sequence)||observation.sequence<=this.sequence)return false;
  const rendered=observation.timestampMeaning==='local-render-not-sensor-capture';
  if(rendered&&(!Number.isFinite(observation.ageUpperBoundMs)||observation.ageUpperBoundMs<0||observation.observedAtMonotonicMs<0))return false;
  if(rendered&&observation.bridgeReceivedAtMonotonicMs!==undefined&&(!Number.isFinite(observation.bridgeReceivedAtMonotonicMs)||observation.bridgeReceivedAtMonotonicMs<observation.observedAtMonotonicMs||observation.bridgeReceivedAtMonotonicMs>this.now()))return false;
  const age=this.now()-(rendered?(observation.bridgeReceivedAtMonotonicMs??observation.observedAtMonotonicMs):observation.receivedAtMonotonicMs)+(rendered?observation.ageUpperBoundMs:0);
  if(!Number.isFinite(age)||age<0||age>this.maxFrameAgeMs||(rendered?observation.observedAtMonotonicMs:observation.decodedAtMonotonicMs)>this.now())return false;
  // Preserve a frozen review until it is explicitly cancelled or submitted.
  if(this.pending)return false;
  const values=observation.predictedValues;
  if(!Array.isArray(values)||values.length!==5||!values.every(v=>v===null||Number.isInteger(v)&&v>=1&&v<=6))return false;
  this.sequence=observation.sequence;
  this.pending={context:context(game),observation:structuredClone(observation),commandId:this.id()};
  return true;
 }
 pinReview(game,{frame,prediction,readerVersion}){
  if(!prediction||!Array.isArray(prediction.dice)||prediction.dice.length>5)return false;
  const predictedValues=Array.from({length:5},(_,i)=>prediction.dice[i]?.value??null);
  const metadata=Object.fromEntries(FRAME_FIELDS.filter(k=>frame?.[k]!==undefined).map(k=>[k,frame[k]]));
  return this.receive(game,{...metadata,readerVersion:readerVersion??prediction.readerVersion??prediction.reader,prediction:structuredClone(prediction),predictedValues});
 }
 reviewedAction(game,{values,heldMask=Array(5).fill(false)}){
  if(!this.pending||game.turn?.source!=='camera'||JSON.stringify(this.pending.context)!==JSON.stringify(context(game)))throw Error('The turn changed. Capture a fresh roll.');
  validateDice(values);
  const observation=structuredClone(this.pending.observation);
  const corrections=observation.predictedValues.flatMap((v,i)=>v===values[i]?[]:[{slot:i,before:v,after:values[i]}]);
  const capture={version:1,...this.pending.context,commandId:this.commandId,identityScope:'logical-slots',confirmed:true,observation,confirmedValues:[...values],heldMask:[...heldMask],corrections,reviewedAtMonotonicMs:this.now()};
  validateCameraCapture(game,capture,values,heldMask);
  return {type:'roll',seat:game.activeSeat,dice:[...values],held:[...heldMask],capture};
 }
 recommendations(game,review){return scoreOptions(game,this.reviewedAction(game,review).dice);}
 // Call only after persistence succeeds; retain review on storage failure.
 committed(){this.pending=null;}
 invalidate(){this.pending=null;}
 stop(){this.pending=null;this.identity=null;this.sequence=0;}
}
