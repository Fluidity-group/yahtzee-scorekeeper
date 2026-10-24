import {it,expect,vi} from 'vitest';
import {CameraTiming,loadCameraImage} from '../src/dice/input/camera-timing.js';

it('bounds retained numeric stages, rejects invalid measurements and copies snapshots',()=>{
 const timing=new CameraTiming({limit:3});
 for(let i=0;i<8;i++)timing.record('workerInferenceMs',i);
 for(const value of [NaN,Infinity,-1,60001,'1'])timing.record('workerInferenceMs',value);
 timing.record('rtsp://user:secret@host',2);timing.record('workerInferenceMs',2,'android-elapsed-realtime');
 expect(timing.snapshot().map(s=>s.durationMs)).toEqual([5,6,7]);
 const copy=timing.snapshot();copy[0].durationMs=999;expect(timing.snapshot()[0].durationMs).toBe(5);
 const bounded=new CameraTiming({limit:10000});for(let i=0;i<100;i++)bounded.record('reviewPreparationMs',i);expect(bounded.snapshot()).toHaveLength(64);
});
it('keeps native durations in their own clock and discards arbitrary transport fields',()=>{
 const timing=new CameraTiming();
 timing.native({clock:'android-elapsed-realtime',meaning:'local-stage-durations-not-sensor-latency',snapshotExtractionMs:12,pngEncodeAndWriteMs:34,nativeRenderAgeMs:8,url:'rtsp://secret',pixels:[1],receivedAtMonotonicMs:90000});
 timing.native({clock:'js-performance',meaning:'local-stage-durations-not-sensor-latency',snapshotExtractionMs:100});
 expect(timing.snapshot()).toEqual(['snapshotExtractionMs','pngEncodeAndWriteMs','nativeRenderAgeMs'].map((stage,i)=>({stage,durationMs:[12,34,8][i],clock:'android-elapsed-realtime'})));
 expect(JSON.stringify(timing.snapshot())).not.toContain('secret');
});
it('marks the native upper cap as a lower bound without marking exact JS durations capped',()=>{
 const timing=new CameraTiming();
 timing.native({clock:'android-elapsed-realtime',meaning:'local-stage-durations-not-sensor-latency',snapshotExtractionMs:60000,pngEncodeAndWriteMs:59999,nativeRenderAgeMs:60001});
 timing.record('workerInferenceMs',60000);
 expect(timing.snapshot()).toEqual([
  {stage:'snapshotExtractionMs',durationMs:60000,clock:'android-elapsed-realtime',capped:true},
  {stage:'pngEncodeAndWriteMs',durationMs:59999,clock:'android-elapsed-realtime'},
  {stage:'workerInferenceMs',durationMs:60000,clock:'js-performance'}
 ]);
});
it('measures response/body fetch and decode separately, and does not revive closed diagnostics',async()=>{
 let now=100;const timing=new CameraTiming(),bitmap={close:vi.fn()},blob={};
 const image=await loadCameraImage('private-url',{timing,now:()=>now,fetchFile:async()=>{now+=10;return {ok:true,blob:async()=>{now+=20;return blob;}};},decode:async value=>{expect(value).toBe(blob);now+=40;return bitmap;}});
 expect(image).toBe(bitmap);expect(timing.snapshot().map(s=>[s.stage,s.durationMs])).toEqual([['bridgeFileFetchMs',30],['bridgeImageDecodeMs',40]]);
 timing.close();timing.record('workerInferenceMs',10);expect(timing.snapshot()).toEqual([]);
});
it('sanitizes fetch/decode failures and does not record successful decode for failed decoding',async()=>{
 const timing=new CameraTiming();
 await expect(loadCameraImage('private-url',{timing,fetchFile:async()=>{throw Error('rtsp://user:secret@host');}})).rejects.toThrow('Camera image could not load.');
 expect(timing.snapshot()).toEqual([]);
 await expect(loadCameraImage('private-url',{timing,fetchFile:async()=>({ok:true,blob:async()=>({})}),decode:async()=>{throw Error('secret');}})).rejects.toThrow('Camera image could not load.');
 expect(timing.snapshot().map(s=>s.stage)).toEqual(['bridgeFileFetchMs']);
});
