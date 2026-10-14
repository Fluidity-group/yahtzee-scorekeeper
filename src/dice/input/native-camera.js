import {Capacitor, registerPlugin} from '@capacitor/core';

const nativeCamera = registerPlugin('C121Camera');
const states = new Set(['disconnected','connecting','live','interrupted','authentication-failure','unsupported-stream']);
// Fixed local messages only: native details may contain camera credentials/URLs.
const messages=Object.freeze({
 CAMERA_ERROR:'Camera operation failed. Check connection and camera settings.',
 INVALID_STATUS:'Camera status is unavailable. Disconnect and reconnect.',
 INVALID_CONFIGURATION:'Camera settings are invalid. Check the saved connection and stream selection.',
 CREDENTIAL_STORAGE:'Local camera credentials could not be accessed. Save camera credentials again and reconnect.',
 APP_BACKGROUND:'Camera capture paused while the app was in the background. Resume the app and reconnect.',
 SESSION_CHANGED:'Camera connection changed during the operation. Reconnect and capture a fresh frame.',
 STREAM_SETUP:'Camera stream could not start. Check the saved connection, local camera credentials and stream selection, then reconnect.',
 WIFI_UNAVAILABLE:'Camera Wi-Fi is unavailable. Connect to the same Wi-Fi as the camera, then reconnect.',
 FRAME_BUSY:'A camera frame is still being processed. Wait for the current operation to finish, then try again.',
 STALE_FRAME:'No fresh camera frame is available yet. Wait for live video, then try again. Reconnect if video remains frozen.',
 NO_PIXELS:'Camera pixels are not available yet. Wait for live video, then try again.',
 FRAME_STORAGE:'Camera snapshot could not be saved. Check available device storage, then try again.',
 CANCELLED:'Camera operation was cancelled. Try again when the camera is connected.'
});
const safeError = value => {
 const code=typeof value==='string'&&Object.hasOwn(messages,value)?value:'CAMERA_ERROR';
 return Object.assign(new Error(messages[code]),{code});
};

/** Pull only: caller releases each frame. URLs contain an opaque app-private snapshot, never camera credentials. */
export function createNativeCameraTransport({plugin=nativeCamera,convertFileSrc=Capacitor.convertFileSrc,now=()=>performance.now(),wallNow=()=>Date.now()}={}) {
 let pending=false,lease=null,epoch=0;
 async function invoke(method,options={}) {try{return await plugin[method](options);}catch(error){throw safeError(error?.code);}}
 return {
  supported:()=>Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android',
  async configureProfile(options={}) {epoch++;return invoke('configureProfile',options);},
  async listProfiles(){return (await invoke('listProfiles')).profiles;},
  async removeProfile(profileId){epoch++;return invoke('removeCredentials',{cameraId:profileId});},
  async updateCredentials({cameraId,username,password}) {epoch++; await invoke('updateCredentials',{cameraId,username,password});},
  async removeCredentials(cameraId) {epoch++;await invoke('removeCredentials',{cameraId});},
  async connect(options) {epoch++;const {profileId,cameraId,host,stream}=typeof options==='string'?{profileId:options}:options;return invoke('connect',{profileId,cameraId,host,stream});},
  async disconnect(){epoch++;lease=null;return invoke('disconnect');},
  async getStatus(){const status=await invoke('getStatus');if(!states.has(status.state))throw safeError('INVALID_STATUS');return status;},
  async setPreviewRect(options) {return invoke('setPreviewRect',options);},
  async onStatus(listener){return plugin.addListener('status',status=>{if(states.has(status.state)){if(status.state!=='live'){epoch++;lease=null;}listener(status);}});},
  async acquireLatestFrame({maxWidth=1280,maxAgeMs=1000,calibrationId=''}={}) {
   if(pending||lease)throw safeError('FRAME_BUSY');
   pending=true;const current=epoch,start=now();let frame;
   try {
    frame=await invoke('acquireLatestFrame',{maxWidth,maxAgeMs,calibrationId});
    const end=now(),age=frame.nowMonotonicMs-frame.renderedAtMonotonicMs+(end-start);
    if(current!==epoch||!frame.frameId||!frame.sessionId||!Number.isFinite(age)||age<0||age>maxAgeMs||!frame.fileUri?.startsWith('file://')||!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<1||frame.height<1||frame.width>4096||frame.height>4096) {
     throw safeError('STALE_FRAME');
    }
    lease=frame.frameId;
    return {...frame,version:1,orientation:0,mediaOrigin:'camera',url:convertFileSrc(frame.fileUri),source:'c121-rtsp',simulated:false,
     observedAt:wallNow()-age,observedAtMonotonicMs:end-age,bridgeReceivedAtMonotonicMs:end,ageUpperBoundMs:age,
     timestampMeaning:'local-render-not-sensor-capture',latencyVerified:false};
   }catch(error){if(frame?.frameId)await invoke('releaseFrame',{frameId:frame.frameId}).catch(()=>{});throw error;}
   finally{pending=false;}
  },
  async releaseFrame(frameId){if(lease===frameId)lease=null;await invoke('releaseFrame',{frameId});},
 };
}





