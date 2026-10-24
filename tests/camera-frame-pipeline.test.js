import {it,expect,vi} from 'vitest';
import {CameraFramePipeline,validCameraFrame,frameMetadata} from '../src/dice/input/camera-frame-pipeline.js';
import {CameraSession} from '../src/dice/input/camera-session.js';
import {CameraReplay} from '../src/dice/input/camera-replay.js';
const context={gameId:'g',revision:1,turnId:'t',playerId:'p'};
const config={cameraId:'c',sessionId:'s',calibrationId:'cal',context};
const frame=(sequence=1,extra={})=>({version:1,...config,sequence,frameId:`f${sequence}`,receivedAtMonotonicMs:100,decodedAtMonotonicMs:110,width:640,height:480,orientation:0,mediaOrigin:'camera',...extra});
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
it('uses honest native render timestamps and conservative age without inventing receive/decode times',()=>{
 const native={...frame(),timestampMeaning:'local-render-not-sensor-capture',observedAtMonotonicMs:110,ageUpperBoundMs:20};delete native.receivedAtMonotonicMs;delete native.decodedAtMonotonicMs;
 expect(validCameraFrame(native,config,120,30)).toBe(true);expect(validCameraFrame(native,config,121,30)).toBe(false);
 expect(frameMetadata(native)).toMatchObject({observedAtMonotonicMs:110,ageUpperBoundMs:20,timestampMeaning:'local-render-not-sensor-capture'});expect(frameMetadata(native)).not.toHaveProperty('receivedAtMonotonicMs');expect(frameMetadata(native)).not.toHaveProperty('decodedAtMonotonicMs');
 for(const extra of [{observedAtMonotonicMs:121},{observedAtMonotonicMs:-1},{ageUpperBoundMs:-1},{ageUpperBoundMs:Infinity},{timestampMeaning:'sensor-capture'}])expect(validCameraFrame({...native,...extra},config,120,30)).toBe(false);
 const s=new CameraSession({now:()=>120});s.start(config);expect(s.observe({frame:native,prediction:{dice:[]}})).toBe(true);expect(s.pinReview().frame).not.toHaveProperty('decodedAtMonotonicMs');
});
it('bounds inference to one running job and one latest frame, releasing dropped and completed payloads',async()=>{
 const resolves=[],infer=vi.fn(()=>new Promise(r=>resolves.push(r))),result=vi.fn(),p=new CameraFramePipeline({infer,now:()=>120,onResult:result});p.configure(config);
 const release1=vi.fn(),release2=vi.fn(),release3=vi.fn();p.submit(frame(1,{release:release1}));await flush();p.submit(frame(2,{release:release2}));p.submit(frame(3,{release:release3}));
 expect(infer).toHaveBeenCalledTimes(1);expect(release2).toHaveBeenCalledTimes(1);resolves[0]({dice:[]});await flush();expect(infer).toHaveBeenCalledTimes(2);expect(infer.mock.calls[1][0].sequence).toBe(3);expect(release1).toHaveBeenCalledTimes(1);
 resolves[1]({dice:[]});await flush();expect(release3).toHaveBeenCalledTimes(1);expect(result).toHaveBeenCalledTimes(2);
});
it('aborts obsolete inference, ignores delayed completion and releases queued resources on disconnect',async()=>{
 let resolve;const result=vi.fn(),infer=vi.fn(()=>new Promise(r=>resolve=r));const p=new CameraFramePipeline({infer,now:()=>120,onResult:result});p.configure(config);
 const runningRelease=vi.fn(),queuedRelease=vi.fn();p.submit(frame(1,{release:runningRelease}));await flush();p.submit(frame(2,{release:queuedRelease}));p.stop('backgrounded');
 expect(infer.mock.calls[0][1].signal.aborted).toBe(true);expect(queuedRelease).toHaveBeenCalledTimes(1);resolve({dice:[]});await flush();expect(result).not.toHaveBeenCalled();expect(runningRelease).toHaveBeenCalledTimes(1);expect(p.running).toBe(null);
});
it('does not start a second concurrent inference across session reconfiguration',async()=>{
 const resolves=[],infer=vi.fn(()=>new Promise(r=>resolves.push(r))),result=vi.fn(),p=new CameraFramePipeline({infer,now:()=>120,onResult:result});p.configure(config);p.submit(frame());await flush();
 p.configure({...config,sessionId:'new'});p.submit(frame(1,{sessionId:'new'}));expect(infer).toHaveBeenCalledTimes(1);resolves[0]({dice:[]});await flush();expect(infer).toHaveBeenCalledTimes(2);expect(result).not.toHaveBeenCalled();resolves[1]({dice:[]});await flush();expect(result).toHaveBeenCalledTimes(1);
});
it('rejects stale, future, duplicate, malformed and calibration/session-crossing frames with release',async()=>{
 const infer=vi.fn(async()=>({dice:[]})),p=new CameraFramePipeline({infer,now:()=>120,maxFrameAgeMs:50});p.configure(config);
 for(const extra of [{receivedAtMonotonicMs:1},{decodedAtMonotonicMs:121},{sessionId:'old'},{calibrationId:'old'},{width:0},{orientation:45},{mediaOrigin:'unknown'}]){const release=vi.fn();expect(p.submit(frame(1,{...extra,release}))).toBe(false);expect(release).toHaveBeenCalledOnce();}
 expect(p.submit(frame())).toBe(true);expect(p.submit(frame())).toBe(false);await flush();expect(infer).toHaveBeenCalledTimes(1);
});
it('rejects a result that becomes stale during processing',async()=>{
 let at=120,resolve;const result=vi.fn(),p=new CameraFramePipeline({infer:()=>new Promise(r=>resolve=r),now:()=>at,maxFrameAgeMs:50,onResult:result});p.configure(config);p.submit(frame());await flush();at=200;resolve({dice:[]});await flush();expect(result).not.toHaveBeenCalled();
});
it('preserves incomplete evidence through slow explicit review and confirmed correction without committing commands',()=>{
 let at=120,n=0;const s=new CameraSession({now:()=>at,id:()=>`id${++n}`,maxFrameAgeMs:50});s.start(config);const prediction={dice:[{value:1}],rejected:[{reason:'unclear'}]};expect(s.observe({frame:frame(),prediction})).toBe(true);s.pinReview();at=10000;s.correct([1,2,3,4,5]);
 expect(()=>s.accept({values:[1,2,3,4,5],heldMask:Array(5).fill(false),playerId:'p',rollNumber:1})).toThrow('confirmation');
 const r=s.accept({values:[1,2,3,4,5],heldMask:Array(5).fill(false),playerId:'p',rollNumber:1,confirmed:true});expect(r.observation.prediction).toEqual(prediction);expect(r.after).toEqual([1,2,3,4,5]);expect(r.corrections).toHaveLength(1);expect(r.identityScope).toBe('logical-slots');expect(r.observation.frame.pixels).toBeUndefined();expect(()=>s.accept({})).toThrow('invalidated');
});
it('invalidates pinned reviews on context, calibration, session and lifecycle drift',()=>{
 for(const change of [s=>s.setContext({...context,revision:2}),s=>s.configureCalibration('next'),s=>s.start({...config,sessionId:'next'}),s=>s.stop('backgrounded')]){
 const s=new CameraSession({now:()=>120});s.start(config);s.observe({frame:frame(),prediction:{dice:[]}});s.pinReview();change(s);expect(()=>s.accept({values:[1,2,3,4,5],heldMask:Array(5).fill(false),playerId:'p',rollNumber:1,confirmed:true})).toThrow('invalidated');}
});
it('requires explicit logical holds and matching prior player/turn values',()=>{
 const s=new CameraSession({now:()=>120});s.start(config);s.observe({frame:frame(),prediction:{dice:[]}});s.pinReview();const args={values:[1,2,3,4,5],heldMask:[true,false,false,false,false],playerId:'p',rollNumber:2,confirmed:true};
 expect(()=>s.accept(args)).toThrow('First roll');expect(()=>s.accept({...args,previous:{...context,after:[6,2,3,4,5]}})).toThrow('Held');expect(()=>s.accept({...args,previous:{...context,turnId:'other',after:args.values}})).toThrow('Held');expect(()=>s.accept({...args,heldMask:[null,false,false,false,false]})).toThrow('logical holds');
});
it('labels replay and synthetic envelopes explicitly and stops releasing payloads',()=>{
 const pipeline={configure:vi.fn(),submit:vi.fn(()=>true),stop:vi.fn()};for(const mediaOrigin of ['replay','synthetic']){const replay=new CameraReplay({pipeline,now:()=>123,mediaOrigin});replay.start(config);replay.push({pixels:new Uint8Array(4),width:1,height:1});expect(pipeline.submit.mock.lastCall[0]).toMatchObject({mediaOrigin,receivedAtMonotonicMs:123,decodedAtMonotonicMs:123});replay.stop();const release=vi.fn();expect(replay.push({release})).toBe(false);expect(release).toHaveBeenCalledOnce();}expect(()=>new CameraReplay({pipeline,mediaOrigin:'camera'})).toThrow();
});
