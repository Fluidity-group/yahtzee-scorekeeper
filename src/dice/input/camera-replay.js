// Replay and fake frames share transport contracts but retain explicit provenance.
export class CameraReplay {
  constructor({pipeline,now=()=>performance.now(),mediaOrigin='replay'}) {
    if(!['replay','synthetic'].includes(mediaOrigin))throw Error('Replay must remain labelled replay or synthetic.');
    Object.assign(this,{pipeline,now,mediaOrigin});this.config=null;this.sequence=0;
  }
  start(config) {this.stop();this.config=structuredClone(config);this.sequence=0;this.pipeline.configure(config);}
  push({pixels,width,height,orientation=0,release}) {
    if(!this.config){release?.();return false;}
    const at=this.now(),sequence=++this.sequence;
    return this.pipeline.submit({version:1,...this.config,sequence,frameId:`${this.config.sessionId}:${sequence}`,timestampMeaning:'local-receive-decode-not-sensor-capture',receivedAtMonotonicMs:at,decodedAtMonotonicMs:at,width,height,orientation,mediaOrigin:this.mediaOrigin,pixels,release});
  }
  stop() {this.pipeline.stop('replay-stopped');this.config=null;}
}
