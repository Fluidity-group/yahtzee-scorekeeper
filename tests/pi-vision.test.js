import {it,expect} from 'vitest';
import {processFrame} from '../device/pi/vision.js';
const profile={calibrationId:'confirmed',width:960,height:540,polygon:[[.2,.1],[.8,.1],[.9,.2],[.9,.8],[.8,.9],[.2,.9],[.1,.8],[.1,.2]]};
it('rejects uncalibrated, mismatched and malformed device frames before vision',()=>{
 expect(()=>processFrame(null,{width:960,height:540,pixels:''},{...profile,calibrationId:null})).toThrow('confirmed');
 expect(()=>processFrame(null,{width:640,height:480,pixels:''},profile)).toThrow('resolution');
 expect(()=>processFrame(null,{width:960,height:540,pixels:''},profile)).toThrow('length');
});
