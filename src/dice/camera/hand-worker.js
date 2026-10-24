// Classic worker: MediaPipe's WASM loader requires importScripts.
let hand;
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='init'){
   const {FilesetResolver,HandLandmarker}=await import(/* @vite-ignore */ m.base+'vision_bundle.mjs');
   hand=await HandLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(m.base+'wasm'),{baseOptions:{modelAssetPath:m.base+'hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:4});
   self.postMessage({type:'ready'});
  }else if(m.type==='frame'){
   const image=new ImageData(new Uint8ClampedArray(m.pixels),m.width,m.height);
   self.postMessage({type:'hands',epoch:m.epoch,timestamp:m.timestamp,hands:hand.detectForVideo(image,m.timestamp).landmarks});
  }
 }catch(e){self.postMessage({type:'error',message:e.message});}
};
