import {validCameraFrame,frameMetadata} from './camera-frame-pipeline.js';
const faces=v=>Array.isArray(v)&&v.length===5&&v.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// A reviewed observation is evidence, never a game command or score.
export class CameraSession {
  constructor({now=()=>performance.now(),id=()=>crypto.randomUUID(),maxFrameAgeMs=2000}={}) {
    if(!(maxFrameAgeMs>0))throw Error('Positive freshness threshold required.');
    Object.assign(this,{now,id,maxFrameAgeMs});this.config=null;this.latest=null;this.review=null;this.records=[];this.sequence=0;
  }
  start({cameraId,sessionId=this.id(),calibrationId,context}) {
    if(!cameraId||!sessionId||!calibrationId||!context?.gameId||!context?.turnId||!context?.playerId||!Number.isInteger(context.revision))throw Error('Complete camera and game context required.');
    this.invalidate('session-changed');this.config=structuredClone({cameraId,sessionId,calibrationId,context});this.sequence=0;return sessionId;
  }
  invalidate(reason='invalidated') {this.latest=null;this.review=null;this.invalidatedReason=reason;}
  setContext(context) {if(!this.config)throw Error('Start camera session first.');if(!same(context,this.config.context)){this.invalidate('context-changed');this.config.context=structuredClone(context);}}
  configureCalibration(calibrationId) {if(!this.config||!calibrationId)throw Error('Calibration required.');if(calibrationId!==this.config.calibrationId){this.invalidate('calibration-changed');this.config.calibrationId=calibrationId;}}
  observe({frame,prediction,context=this.config?.context}) {
    if(!this.config||!same(context,this.config.context)||!validCameraFrame(frame,this.config,this.now(),this.maxFrameAgeMs)||frame.sequence<=this.sequence)return false;
    this.sequence=frame.sequence;this.latest={frame:frameMetadata(frame),prediction:structuredClone(prediction),context:structuredClone(context)};return true;
  }
  pinReview() {
    if(!this.latest||!validCameraFrame(this.latest.frame,this.config,this.now(),this.maxFrameAgeMs))throw Error('Freeze a fresh camera observation.');
    this.review={id:this.id(),...structuredClone(this.latest),pinnedAtMonotonicMs:this.now(),corrections:[]};return structuredClone(this.review);
  }
  correct(values) {if(!this.review||!faces(values))throw Error('Review and enter five valid dice.');this.review.corrections.push({values:[...values],atMonotonicMs:this.now()});return [...values];}
  accept({values,heldMask,playerId,previous=null,rollNumber,confirmed=false}) {
    const r=this.review;
    if(!r||!this.config||!same(r.context,this.config.context)||r.frame.sessionId!==this.config.sessionId||r.frame.calibrationId!==this.config.calibrationId)throw Error('Review invalidated; capture again.');
    if(!confirmed)throw Error('Explicit review confirmation required.');
    if(playerId!==r.context.playerId)throw Error('Player changed; capture again.');
    if(!faces(values)||!Array.isArray(heldMask)||heldMask.length!==5||!heldMask.every(h=>typeof h==='boolean')||heldMask.every(Boolean))throw Error('Confirm five values and logical holds.');
    if(!Number.isInteger(rollNumber)||rollNumber<1)throw Error('Valid roll number required.');
    if(!previous&&heldMask.some(Boolean))throw Error('First roll must roll all five dice.');
    if(previous&&(!faces(previous.after)||previous.gameId!==r.context.gameId||previous.turnId!==r.context.turnId||previous.playerId!==playerId||heldMask.some((h,i)=>h&&values[i]!==previous.after[i])))throw Error('Held values and prior roll context must match.');
    const record={version:1,rollId:this.id(),...r.context,source:'camera',confirmed:true,confirmedValues:[...values],sessionId:r.frame.sessionId,rollNumber,previousRollId:previous?.rollId??null,before:previous?.after?[...previous.after]:null,after:[...values],heldMask:[...heldMask],heldValues:values.filter((_,i)=>heldMask[i]),rolledValues:values.filter((_,i)=>!heldMask[i]),rerolledSlots:heldMask.flatMap((h,i)=>h?[]:[i]),identityScope:'logical-slots',observation:structuredClone(r),corrections:structuredClone(r.corrections),acceptedAtMonotonicMs:this.now()};
    this.records.push(record);this.review=null;this.latest=null;return structuredClone(record);
  }
  stop(reason='stopped') {this.invalidate(reason);this.config=null;}
}
