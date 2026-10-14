import {it,expect} from 'vitest';
import {sameCameraScene} from '../src/dice/camera-scene-guard.js';
import {validCameraFrame} from '../src/dice/input/camera-frame-pipeline.js';
const polygon=[[0,0],[1,0],[1,1],[0,1]],image=()=>({width:64,height:64,data:new Uint8ClampedArray(64*64*4)});
it('rejects changed unreadable regions even when both readers return zero readable dice',()=>{const before=image(),after=image();expect(sameCameraScene(before,after,polygon)).toBe(true);for(let y=24;y<32;y++)for(let x=24;x<32;x++)after.data[(y*64+x)*4]=255;expect(sameCameraScene(before,after,polygon)).toBe(false);});
it('counts a native bridge age once and rejects future bridge clocks',()=>{
 const frame={version:1,cameraId:'c121',sessionId:'s1',calibrationId:'cal1',frameId:'f1',sequence:1,width:960,height:540,orientation:0,mediaOrigin:'camera',timestampMeaning:'local-render-not-sensor-capture',observedAtMonotonicMs:100,bridgeReceivedAtMonotonicMs:1000,ageUpperBoundMs:900};
 expect(validCameraFrame(frame,frame,1100,1500)).toBe(true);expect(validCameraFrame(frame,frame,1700,1500)).toBe(false);expect(validCameraFrame({...frame,bridgeReceivedAtMonotonicMs:1200},frame,1100,1500)).toBe(false);
});
