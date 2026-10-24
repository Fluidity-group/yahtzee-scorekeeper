import {it,expect,vi} from 'vitest';
import {CameraRecognition} from '../src/dice/input/camera-recognition.js';
import {CameraTiming} from '../src/dice/input/camera-timing.js';
const setup=()=>{const worker={postMessage:vi.fn(),terminate:vi.fn()};const reader=new CameraRecognition({workerFactory:()=>worker,base:'http://localhost/camera-assets/',timeoutMs:100});return {worker,reader};};
it('runs one request at a time, ignores unrelated replies and releases pending inference on stop',async()=>{
 const {worker,reader}=setup();worker.onmessage({data:{type:'ready'}});
 const image={width:1,height:1,data:new Uint8ClampedArray(4)};
 const pending=reader.infer(image,[[0,0],[1,0],[1,1]]);
 await Promise.resolve();await expect(reader.infer(image,[])).rejects.toThrow('already processing');
 worker.onmessage({data:{type:'result',id:999,dice:[]}});expect(reader.pending).not.toBeNull();
 const rejected=expect(pending).rejects.toThrow('stopped');reader.stop();await rejected;expect(worker.terminate).toHaveBeenCalledOnce();
});
it('returns only the matching worker result and stops on missing runtime assets',async()=>{
 const {worker,reader}=setup();worker.onmessage({data:{type:'ready'}});
 const pending=reader.infer({width:1,height:1,data:new Uint8ClampedArray(4)},[]);await Promise.resolve();
 worker.onmessage({data:{type:'result',id:1,dice:[{value:4}]}});expect((await pending).dice[0].value).toBe(4);reader.stop();
 const other=setup();other.worker.onmessage({data:{type:'error',message:'sensitive upstream details'}});await expect(other.reader.ready).rejects.toThrow('recognition failed');expect(other.worker.terminate).toHaveBeenCalledOnce();
});
it('measures initialization and only matching completed inference in the injected JS clock',async()=>{
 let now=100;const worker={postMessage:vi.fn(),terminate:vi.fn()},timing=new CameraTiming();
 const reader=new CameraRecognition({workerFactory:()=>worker,base:'private-assets',timing,now:()=>now});
 now=350;worker.onmessage({data:{type:'ready'}});now=400;worker.onmessage({data:{type:'ready'}});
 const pending=reader.infer({width:1,height:1,data:new Uint8ClampedArray(4)},[]);await Promise.resolve();
 now=450;worker.onmessage({data:{type:'result',id:999}});now=550;worker.onmessage({data:{type:'result',id:1,dice:[]}});await pending;
 expect(timing.snapshot()).toEqual([{stage:'workerInitializationMs',durationMs:250,clock:'js-performance'},{stage:'workerInferenceMs',durationMs:150,clock:'js-performance'}]);reader.stop();
});
