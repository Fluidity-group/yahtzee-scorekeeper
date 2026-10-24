export function validCameraFrame(frame, config, now, maxAge = 2000) {
  const renderTime = frame?.timestampMeaning === 'local-render-not-sensor-capture'
    && Number.isFinite(frame.observedAtMonotonicMs) && frame.observedAtMonotonicMs >= 0 && frame.observedAtMonotonicMs <= now
    && Number.isFinite(frame.ageUpperBoundMs) && frame.ageUpperBoundMs >= 0
    && (frame.bridgeReceivedAtMonotonicMs === undefined || Number.isFinite(frame.bridgeReceivedAtMonotonicMs) && frame.bridgeReceivedAtMonotonicMs >= frame.observedAtMonotonicMs && frame.bridgeReceivedAtMonotonicMs <= now)
    && now - (frame.bridgeReceivedAtMonotonicMs ?? frame.observedAtMonotonicMs) + frame.ageUpperBoundMs <= maxAge;
  const receiveDecodeTime = frame?.timestampMeaning !== 'local-render-not-sensor-capture'
    && (!frame?.timestampMeaning || frame.timestampMeaning === 'local-receive-decode-not-sensor-capture')
    && Number.isFinite(frame?.receivedAtMonotonicMs) && frame.receivedAtMonotonicMs >= 0 && Number.isFinite(frame?.decodedAtMonotonicMs)
    && frame.receivedAtMonotonicMs <= frame.decodedAtMonotonicMs && frame.decodedAtMonotonicMs <= now
    && now - frame.receivedAtMonotonicMs <= maxAge;
  return frame?.version === 1 && frame.cameraId === config.cameraId && frame.sessionId === config.sessionId
    && frame.calibrationId === config.calibrationId && Number.isInteger(frame.sequence) && frame.sequence > 0
    && typeof frame.frameId === 'string' && frame.frameId.length > 0
    && Number.isInteger(frame.width) && frame.width > 0 && Number.isInteger(frame.height) && frame.height > 0
    && [0, 90, 180, 270].includes(frame.orientation) && ['camera', 'replay', 'synthetic'].includes(frame.mediaOrigin)
    && (renderTime || receiveDecodeTime);
}

export function frameMetadata(frame) {
  const {version,cameraId,sessionId,sequence,frameId,width,height,orientation,calibrationId,mediaOrigin} = frame;
  const metadata={version,cameraId,sessionId,sequence,frameId,width,height,orientation,calibrationId,mediaOrigin};
  return frame.timestampMeaning==='local-render-not-sensor-capture'
    ? {...metadata,timestampMeaning:frame.timestampMeaning,observedAtMonotonicMs:frame.observedAtMonotonicMs,ageUpperBoundMs:frame.ageUpperBoundMs,...(frame.bridgeReceivedAtMonotonicMs!==undefined?{bridgeReceivedAtMonotonicMs:frame.bridgeReceivedAtMonotonicMs}:{})}
    : {...metadata,timestampMeaning:frame.timestampMeaning??'local-receive-decode-not-sensor-capture',receivedAtMonotonicMs:frame.receivedAtMonotonicMs,decodedAtMonotonicMs:frame.decodedAtMonotonicMs};
}

// Payload ownership transfers on submit, including rejected frames. Native clocks
// must be converted to the injected monotonic clock domain before submission.
export class CameraFramePipeline {
  constructor({infer,now=()=>performance.now(),maxFrameAgeMs=2000,onResult=()=>{},onInvalidated=()=>{},onError=()=>{}}) {
    if(typeof infer !== 'function' || !(maxFrameAgeMs > 0)) throw Error('Invalid frame pipeline configuration.');
    Object.assign(this,{infer,now,maxFrameAgeMs,onResult,onInvalidated,onError});
    this.generation=0;this.running=null;this.queued=null;this.config=null;this.sequence=0;
  }
  release(frame) { try { frame?.release?.(); } catch(error) { this.onError(error); } }
  configure(config) { this.invalidate('configuration-changed');this.config=structuredClone(config);this.sequence=0; }
  submit(frame) {
    if(!this.config || !validCameraFrame(frame,this.config,this.now(),this.maxFrameAgeMs) || frame.sequence<=this.sequence) {this.release(frame);return false;}
    this.sequence=frame.sequence;
    if(this.running) {this.release(this.queued);this.queued=frame;} else this.run(frame);
    return true;
  }
  run(frame) {
    const generation=this.generation,config=structuredClone(this.config),controller=new AbortController();
    this.running={frame,controller};
    Promise.resolve().then(()=>this.infer(frame,{signal:controller.signal,context:config.context})).then(prediction=>{
      if(generation===this.generation && validCameraFrame(frame,this.config,this.now(),this.maxFrameAgeMs)) this.onResult({frame:frameMetadata(frame),prediction,context:config.context});
    }).catch(error=>{if(generation===this.generation && !controller.signal.aborted)this.onError(error);}).finally(()=>{
      this.release(frame);this.running=null;
      const next=this.queued;this.queued=null;
      if(next && this.config && validCameraFrame(next,this.config,this.now(),this.maxFrameAgeMs))this.run(next);else this.release(next);
    });
  }
  invalidate(reason='invalidated') {this.generation++;this.running?.controller.abort();this.release(this.queued);this.queued=null;this.onInvalidated(reason);}
  stop(reason='stopped') {this.invalidate(reason);this.config=null;}
}
