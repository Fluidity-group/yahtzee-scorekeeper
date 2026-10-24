// Session-only stage measurements. No frame identity, URLs, pixels or errors enter
// this collector, and native/JS clocks are never subtracted from one another.
const jsStages=new Set(['workerInitializationMs','workerInferenceMs','bridgeFileFetchMs','bridgeImageDecodeMs','bridgeImageLoadMs','reviewPreparationMs']);
const nativeStages=new Set(['snapshotExtractionMs','pngEncodeAndWriteMs','nativeRenderAgeMs']);
export class CameraTiming {
 constructor({limit=64,onChange=()=>{}}={}) {this.limit=Number.isInteger(limit)?Math.max(1,Math.min(64,limit)):64;this.onChange=onChange;this.samples=[];}
 record(stage,durationMs,clock='js-performance') {
  if(this.closed)return;
  if(!(clock==='js-performance'?jsStages:clock==='android-elapsed-realtime'?nativeStages:new Set()).has(stage)||!Number.isFinite(durationMs)||durationMs<0||durationMs>60000)return;
  this.samples.push({stage,durationMs,clock,...(clock==='android-elapsed-realtime'&&durationMs===60000?{capped:true}:{})});if(this.samples.length>this.limit)this.samples.shift();
  try{this.onChange(this.snapshot());}catch{/* diagnostics cannot disrupt camera operation */}
 }
 native(value) {
  if(value?.clock!=='android-elapsed-realtime'||value.meaning!=='local-stage-durations-not-sensor-latency')return;
  for(const stage of nativeStages)this.record(stage,value[stage],value.clock);
 }
 snapshot(){return this.samples.map(sample=>({...sample}));}
 clear(){this.samples=[];}
 close(){this.closed=true;this.clear();}
}

// Fetch completion includes response/body transfer. Bitmap decode is measured
// separately in the same JS performance domain; neither is sensor latency.
export async function loadCameraImage(url,{timing,now=()=>performance.now(),fetchFile=fetch,decode=blob=>createImageBitmap(blob)}={}) {
 try{
  const start=now(),response=await fetchFile(url);
  if(!response.ok)throw Error('Camera image could not load.');
  const blob=await response.blob();timing?.record('bridgeFileFetchMs',now()-start);
  const decodeStart=now(),image=await decode(blob);timing?.record('bridgeImageDecodeMs',now()-decodeStart);return image;
 }catch{throw Error('Camera image could not load.');}
}
