import {it,expect} from 'vitest';
import {cropRect,setCameraControl} from '../src/dice/camera/setup.js';
it('digital framing preserves aspect and clamps the centre inside the source',()=>{
 expect(cropRect(1920,1080,{zoom:1,x:0,y:1})).toEqual([0,0,1920,1080]);
 expect(cropRect(1920,1080,{zoom:2,x:.5,y:.5})).toEqual([480,270,960,540]);
 expect(cropRect(1920,1080,{zoom:2,x:0,y:1})).toEqual([0,540,960,540]);
});
it('applies only exposed ranges while preserving previous focus constraints',async()=>{
 let applied;const track={getCapabilities:()=>({zoom:{min:1,max:4,step:.1}}),getSettings:()=>({zoom:2}),getConstraints:()=>({advanced:[{focusMode:'manual'}]}),applyConstraints:async c=>applied=c};
 expect(await setCameraControl(track,'zoom',2)).toBe(2);expect(applied.advanced[0]).toEqual({focusMode:'manual',zoom:2});
 await expect(setCameraControl(track,'zoom',9)).rejects.toThrow();await expect(setCameraControl(track,'focusDistance',1)).rejects.toThrow();
});
it('reports controls that the driver silently ignores',async()=>{
 const track={getCapabilities:()=>({focusMode:['manual','continuous']}),getSettings:()=>({focusMode:'continuous'}),applyConstraints:async()=>{}};
 await expect(setCameraControl(track,'focusMode','manual')).rejects.toThrow('did not apply');
});
