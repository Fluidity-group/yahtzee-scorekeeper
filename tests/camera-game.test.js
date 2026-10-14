import {it,expect} from 'vitest';
import {BASE_KEYS} from '../src/game/categories.js';
import {createCoreGame,command,scoreOptions,rollAnalytics} from '../src/game/core.js';
import {CameraGame} from '../src/dice/camera-game.js';
let serial=0;
const act=(g,type,extra={},id=`c${++serial}`)=>command(g,{type,seat:g.activeSeat,...extra},{id});
const create=(mode='standard')=>act(createCoreGame({id:`g${++serial}`,names:['A','B'],source:'camera',mode}),'start');
const frame=(sequence=1)=>({version:1,cameraId:'c121',sessionId:'session',sequence,frameId:`frame-${sequence}`,receivedAtMonotonicMs:100,decodedAtMonotonicMs:110,width:640,height:360,orientation:0,calibrationId:'tray-1',mediaOrigin:'fixture'});
const adapter=()=>{const c=new CameraGame({now:()=>150,id:()=>`review-${++serial}`});c.start(frame());return c;};
const review=(g,values=[1,2,3,4,5],sequence=++serial)=>{
 const c=adapter();expect(c.pinReview(g,{frame:frame(sequence),prediction:{dice:values.map(value=>({value})),rejected:[]},readerVersion:'opencv-0.2'})).toBe(true);return c;
};
const apply=(g,c,values=[1,2,3,4,5],heldMask=Array(5).fill(false))=>command(g,c.reviewedAction(g,{values,heldMask}),{id:c.commandId});

it.each(['standard','competition','accumulative'])('finishes a complete %s local camera game using legal recommendations',mode=>{
 let g=create(mode);
 for(const category of BASE_KEYS)for(let seat=0;seat<2;seat++){
  if(!g.turn)g=act(g,'start');expect(g.activeSeat).toBe(seat);
  const c=review(g),before=structuredClone(g);
  const options=c.recommendations(g,{values:[1,2,3,4,5]});expect(g).toEqual(before);
  g=apply(g,c);c.committed();expect(c.pending).toBeNull();
  g=act(g,'score',{category,value:options.scores[category]});
 }
 expect(g.status).toBe('finished');expect(g.turns).toHaveLength(26);
 expect(g.events.filter(e=>e.type==='roll').every(e=>e.capture.identityScope==='logical-slots'&&e.observedSource==='camera')).toBe(true);
});
it('retains incomplete original predictions and corrections; retries the same reviewed command without committing',()=>{
 let g=create();const c=adapter(),prediction={dice:[{value:1},{value:2}],rejected:[{reason:'unclear'}]};
 expect(c.pinReview(g,{frame:{...frame(),pixels:new Uint8Array(100),streamUrl:'rtsp://secret@host'},prediction,readerVersion:'opencv-0.2'})).toBe(true);
 const action=c.reviewedAction(g,{values:[1,2,3,4,5]});
 expect(action.capture.observation.prediction).toEqual(prediction);
 expect(action.capture.observation.pixels).toBeUndefined();expect(action.capture.observation.streamUrl).toBeUndefined();
 expect(action.capture.observation.predictedValues).toEqual([1,2,null,null,null]);
 expect(action.capture.corrections).toEqual([{slot:2,before:null,after:3},{slot:3,before:null,after:4},{slot:4,before:null,after:5}]);
 const id=c.commandId;expect(c.reviewedAction(g,{values:[1,2,3,4,5]})).toEqual(action);expect(c.commandId).toBe(id);
 const next=command(g,action,{id});expect(command(next,action,{id})).toBe(next);
 expect(rollAnalytics(next,0)).toMatchObject({corrected:1,observedSources:{camera:1}});
 expect(g.turn.rolls).toHaveLength(0);expect(next.turn.rolls[0].capture).toEqual(action.capture);
 expect(()=>command(next,{...action,capture:{...action.capture,revision:next.revision}},{id:'different-id'})).toThrow('already recorded');
});
it('retains honest native local-render timing and rejects stale/negative bounds',()=>{
 const g=create(),c=adapter();const f=frame();delete f.receivedAtMonotonicMs;delete f.decodedAtMonotonicMs;
 Object.assign(f,{mediaOrigin:'camera',timestampMeaning:'local-render-not-sensor-capture',observedAtMonotonicMs:120,ageUpperBoundMs:15});
 const p={dice:[1,2,3,4,5].map(value=>({value}))};
 expect(c.pinReview(g,{frame:{...f,ageUpperBoundMs:3000},prediction:p,readerVersion:'reader'})).toBe(false);
 expect(c.pinReview(g,{frame:f,prediction:p,readerVersion:'reader'})).toBe(true);
 const a=c.reviewedAction(g,{values:[1,2,3,4,5]});expect(a.capture.observation.receivedAtMonotonicMs).toBeUndefined();
 expect(apply(g,c).turn.rolls[0].capture.observation.timestampMeaning).toBe('local-render-not-sensor-capture');
 expect(()=>act(g,'roll',{...a,capture:{...a.capture,observation:{...a.capture.observation,ageUpperBoundMs:-1}}})).toThrow('render timing');
});
it.each(['standard','competition','accumulative'])('preserves %s final-roll limits and bonus/Joker rules',mode=>{
 let g=create(mode);g.turn=null;for(const key of BASE_KEYS.filter(k=>k!=='chance'))g.sheets[0][key]=0;
 g=act(g,'start');expect(g.turn.limit).toBe(mode==='competition'?4:3);
 for(let i=0;i<g.turn.limit;i++)g=apply(g,review(g));expect(()=>apply(g,review(g))).toThrow('limit');
 let repeat=create(mode);repeat.sheets[0].yahtzee=50;repeat=apply(repeat,review(repeat,[2,2,2,2,2]),[2,2,2,2,2]);
 const o=scoreOptions(repeat,[2,2,2,2,2]);expect(o.scores).toEqual({twos:10});expect(o.bonus).toBe(mode==='accumulative'?90:100);
 if(mode==='standard'){repeat=act(repeat,'score',{category:'twos',value:10});expect(repeat.activeSeat).toBe(1);}
 else {expect(()=>act(repeat,'score',{category:'twos',value:10})).toThrow('bonus');repeat=act(repeat,'bonus');expect(repeat.activeSeat).toBe(0);}
});
it('rejects wrong context, seat and unconfirmed or inconsistent evidence at authoritative acceptance',()=>{
 const g=create(),c=review(g),a=c.reviewedAction(g,{values:[1,2,3,4,5]});
 for(const [key,value] of Object.entries({gameId:'wrong',revision:999,turnId:'old',playerId:'other'}))expect(()=>act(g,'roll',{...a,capture:{...a.capture,[key]:value}})).toThrow('another turn or revision');
 expect(()=>act(g,'roll',{...a,seat:1})).toThrow('another player');
 expect(()=>act(g,'roll',{...a,capture:{...a.capture,confirmed:false}})).toThrow('Confirm');
 expect(()=>act(g,'roll',{...a,capture:{...a.capture,confirmedValues:[6,6,6,6,6]}})).toThrow('Review does not match');
 expect(()=>act(g,'roll',{...a,capture:{...a.capture,corrections:[{slot:0,before:1,after:6}]}})).toThrow('original values');
 expect(()=>act(g,'roll',{...a,capture:{...a.capture,observation:{...a.capture.observation,cameraId:'rtsp://secret@host'}}})).toThrow('identity');
 expect(()=>c.reviewedAction(act(g,'manual-fallback'),{values:[1,2,3,4,5]})).toThrow('turn changed');
});
it('enforces logical held values, scene identity, first-roll/all-held and three-roll limit',()=>{
 let g=create();const c=review(g);
 expect(()=>apply(g,c,[1,2,3,4,5],[true,false,false,false,false])).toThrow('all five');
 g=apply(g,c);
 expect(()=>apply(g,review(g),[1,2,3,4,5],Array(5).fill(true))).toThrow('Release');
 expect(()=>apply(g,review(g,[6,2,3,4,5]),[6,2,3,4,5],[true,false,false,false,false])).toThrow('Held dice');
 const changed=adapter();changed.start({...frame(),calibrationId:'tray-2'});
 changed.pinReview(g,{frame:{...frame(500),calibrationId:'tray-2'},prediction:{dice:[1,2,3,4,5].map(value=>({value}))},readerVersion:'reader'});
 expect(()=>apply(g,changed,[1,2,3,4,5],[true,false,false,false,false])).toThrow('calibration changed');
 g=apply(g,review(g));g=apply(g,review(g));expect(()=>apply(g,review(g))).toThrow('limit');
});
it('keeps observed camera source after corrections/exclusions, and supports manual fallback',()=>{
 let g=create();g=apply(g,review(g));const original=structuredClone(g.turn.rolls[0].capture);
 g=act(g,'correct-roll',{dice:[6,6,6,6,6]});
 expect(g.turn.rolls[0]).toMatchObject({source:'manual-correction',observedSource:'camera',capture:original});
 expect(rollAnalytics(g,0)).toMatchObject({recordedRolls:1,corrected:1,observedSources:{camera:1},counts:{yahtzee:1}});
 g=act(g,'discard-roll');expect(rollAnalytics(g,0).recordedRolls).toBe(0);
 g=act(g,'manual-fallback');expect(g.turn.manualFallback).toBe(true);
 g=act(g,'score',{category:'chance',value:22});expect(g.sheets[0].chance).toBe(22);
});
it('invalidates disconnected/calibration reviews, rejects old sessions, repeated/stale frames and permits deliberate long review',()=>{
 const g=create(),c=adapter();const o={...frame(),readerVersion:'reader',predictedValues:[1,2,3,4,5]};
 expect(c.receive(g,{...o,sessionId:'old'})).toBe(false);
 expect(c.receive(g,{...o,receivedAtMonotonicMs:-2500,decodedAtMonotonicMs:-2400})).toBe(false);
 expect(c.receive(g,o)).toBe(true);expect(c.receive(g,{...o,sequence:2})).toBe(false);
 c.now=()=>10000;expect(c.reviewedAction(g,{values:[1,2,3,4,5]}).capture.reviewedAtMonotonicMs).toBe(10000);
 c.invalidate();expect(()=>c.reviewedAction(g,{values:[1,2,3,4,5]})).toThrow('fresh roll');
 c.now=()=>150;expect(c.receive(g,o)).toBe(false);c.stop();expect(c.receive(g,{...o,sequence:3})).toBe(false);
});
