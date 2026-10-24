import {recognize} from './recognizer.js';
import {detectTray} from './tray.js';
import {SeatTracker,inside} from './tracking.js';
let cv,previous=null,seat=new SeatTracker();
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='init'){
   // Wrap the official UMD build for this module worker without changing its
   // algorithm implementation. MediaPipe uses its own classic worker.
   const response=await fetch(m.base+'opencv.js');if(!response.ok)throw Error('Run node scripts/setup-camera-assets.mjs first.');
   const source=await response.text();
   // The official UMD browser bundle defines cv on the worker global.
   const url=URL.createObjectURL(new Blob(['var Module = {};\n',source.replace('}(this, function () {','}(globalThis, function () {')],{type:'text/javascript'}));
   await import(/* @vite-ignore */ url);cv=globalThis.cv;
   if(!cv.Mat)await new Promise(resolve=>{if(cv.then)cv.then(()=>resolve());else cv.onRuntimeInitialized=()=>resolve();});
   URL.revokeObjectURL(url);
   self.postMessage({type:'ready'});return;
  }
  if(m.type==='reset'){previous=null;seat.reset();return;}
  if(m.type==='tray'){
   const image=new ImageData(new Uint8ClampedArray(m.pixels),m.width,m.height);
   self.postMessage({type:'tray-result',id:m.id,...detectTray(cv,image)});return;
  }
  if(m.type==='evaluate'){const image=new ImageData(new Uint8ClampedArray(m.pixels),m.width,m.height);self.postMessage({type:'evaluation',...recognize(cv,image,m.polygon,m.settings)});return;}
  if(m.type==='frame'){
   if(!cv)throw Error('Vision is not ready.');
   const start=performance.now(),image=new ImageData(new Uint8ClampedArray(m.pixels),m.width,m.height);
   const result=recognize(cv,image,m.polygon,m.settings);
   let changed=0,total=0;const samples=[];
   for(let y=0;y<m.height;y+=8)for(let x=0;x<m.width;x+=8)if(inside([x/m.width,y/m.height],m.polygon)){const i=(y*m.width+x)*4,v=(image.data[i]+image.data[i+1]+image.data[i+2])/3;samples.push(v);if(previous&&Math.abs(v-previous[total])>25)changed++;total++;}
   const moving=!!previous&&changed/Math.max(total,1)>.025;previous=samples;
   const hands=m.hands??[];
   const handInTray=m.handStale||hands.some(h=>h.some(p=>inside([p.x,p.y],m.polygon)));
   const actorHint=m.handEnabled&&!m.handStale?seat.update(hands,m.axis):null;
   self.postMessage({type:'result',id:m.id,...result,moving,handInTray,hands,actorHint,handSeats:seat.tracks.map(t=>t.frames>=3?t.seat:null),handStale:m.handStale,handEnabled:m.handEnabled,processingMs:performance.now()-start});
  }
 }catch(e){self.postMessage({type:'error',id:m.id,message:e.message});}
};
