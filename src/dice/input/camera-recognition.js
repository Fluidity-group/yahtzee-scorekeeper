// Demand-driven recognition. Preview rendering never enters the game authority.
export class CameraRecognition {
 constructor({workerFactory=()=>new Worker(new URL('../camera/worker.js',import.meta.url),{type:'module'}),base=new URL(`${import.meta.env.BASE_URL}camera-assets/`,location.origin).href,timeoutMs=15000,timing,now=()=>performance.now()}={}){
  this.timing=timing;this.now=now;this.initializationStarted=now();this.initialized=false;
  this.worker=workerFactory();this.next=0;this.pending=null;this.stopped=false;
  this.ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
  // Attach a handler immediately while the UI prepares connection/calibration.
  this.ready.catch(()=>{});
  this.readyTimer=setTimeout(()=>this.fail(new Error('Camera recognition assets did not load.')),timeoutMs);
  this.worker.onmessage=({data:r})=>{
   if(this.stopped)return;
   if(r.type==='ready'){if(!this.initialized){this.initialized=true;this.timing?.record('workerInitializationMs',this.now()-this.initializationStarted);}clearTimeout(this.readyTimer);this.resolveReady();}
   else if(r.type==='error')this.fail(new Error('Camera recognition failed.'));
   else if(r.type==='result'&&this.pending?.id===r.id){const p=this.pending;this.pending=null;clearTimeout(p.timer);this.timing?.record('workerInferenceMs',this.now()-p.started);p.resolve(r);}
  };
  this.worker.onerror=()=>this.fail(new Error('Camera recognition worker stopped.'));
  this.worker.postMessage({type:'init',base});
  this.timeoutMs=timeoutMs;
 }
 async infer(image,polygon){
  await this.ready;if(this.stopped)throw Error('Recognition stopped.');
  if(this.pending)throw Error('Recognition is already processing a frame.');
  const pixels=image.data.buffer.slice(image.data.byteOffset,image.data.byteOffset+image.data.byteLength),id=++this.next;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>this.fail(new Error('Camera recognition timed out.')),this.timeoutMs);
   this.pending={id,resolve,reject,timer,started:this.now()};
   this.worker.postMessage({type:'frame',id,width:image.width,height:image.height,pixels,polygon,settings:{},hands:[],handEnabled:false,handStale:false},[pixels]);
  });
 }
 fail(error){clearTimeout(this.readyTimer);this.rejectReady(error);if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}this.stopped=true;this.worker.terminate();}
 stop(){this.fail(new Error('Recognition stopped.'));}
}
