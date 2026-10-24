import {parentPort} from 'node:worker_threads';
import {PNG} from 'pngjs';
import {loadVision,processFrame} from './vision.js';
const {cv}=await loadVision('public/camera-assets/opencv.js');
parentPort.postMessage({type:'ready'});
parentPort.on('message',({frame,profile})=>{
 try{
  const pixels=Buffer.from(frame.pixels,'base64');
  if(frame.width!==960||frame.height!==540||pixels.length!==960*540*4)throw Error('Expected a 960 × 540 RGBA frame');
  const result=profile?processFrame(cv,frame,profile):{dice:[],rejected:[],calibrationId:null,recognizerVersion:null};
  const image='data:image/png;base64,'+PNG.sync.write({width:960,height:540,data:pixels}).toString('base64');
  parentPort.postMessage({type:'result',result:{...result,image,width:960,height:540,capturedAt:frame.capturedAt,sequence:frame.sequence}});
 }catch(e){parentPort.postMessage({type:'error',error:e.message});}
});
