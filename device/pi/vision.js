import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {recognize,RECOGNIZER_VERSION} from '../../src/dice/camera/recognizer.js';
import {validPolygon} from '../../src/dice/camera/tracking.js';

export async function loadVision(path){
 const context={module:{exports:{}},require:createRequire(import.meta.url),__dirname:process.cwd(),process,console,Buffer,WebAssembly,setTimeout,clearTimeout,TextDecoder,TextEncoder};
 context.global=context;vm.runInNewContext(fs.readFileSync(path,'utf8'),context);
 const cv=context.module.exports;await new Promise(resolve=>cv.then(()=>resolve()));return {cv};
}

export function processFrame(cv,frame,profile){
 if(!validPolygon(profile.polygon)||!profile.calibrationId)throw Error('A confirmed tray calibration is required');
 if(frame.width!==profile.width||frame.height!==profile.height)throw Error('Camera resolution differs from calibration');
 if(!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<1||frame.height<1||frame.width*frame.height>1920*1080)throw Error('Unsupported frame size');
 const pixels=Buffer.from(frame.pixels,'base64');
 if(pixels.length!==frame.width*frame.height*4)throw Error('Invalid RGBA frame length');
 const result=recognize(cv,{width:frame.width,height:frame.height,data:new Uint8ClampedArray(pixels)},profile.polygon,profile.settings);
 return {version:1,kind:'preview',sequence:frame.sequence,receivedAt:Date.now(),calibrationId:profile.calibrationId,recognizerVersion:RECOGNIZER_VERSION,...result,requiresConfirmation:true};
}
