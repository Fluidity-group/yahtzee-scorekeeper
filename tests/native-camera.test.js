import {describe,it,expect,vi} from 'vitest';
import {createNativeCameraTransport} from '../src/dice/input/native-camera.js';
function fixture(overrides={}) {
 const calls=[];let resolve;
 const plugin={acquireLatestFrame:async()=>({frameId:'f',sessionId:'s',nowMonotonicMs:1010,renderedAtMonotonicMs:1000,width:640,height:360,fileUri:'file:///private/f.png'}),releaseFrame:async args=>calls.push(args),disconnect:async()=>{},...overrides};
 let clock=200;
 return {calls,plugin,transport:createNativeCameraTransport({plugin,convertFileSrc:s=>s.replace('file://','local://'),now:()=>clock,wallNow:()=>10000}),advance:n=>clock+=n};
}
describe('native camera pull frame contract',()=>{
 it('maps render age conservatively and requires releasing a lease',async()=>{const f=fixture();const frame=await f.transport.acquireLatestFrame();expect(frame.observedAt).toBe(9990);expect(frame.timestampMeaning).toBe('local-render-not-sensor-capture');expect(frame.simulated).toBe(false);await expect(f.transport.acquireLatestFrame()).rejects.toMatchObject({code:'FRAME_BUSY'});await f.transport.releaseFrame('f');expect(f.calls).toEqual([{frameId:'f'}]);});
 it('includes whole bridge round trip in the age bound',async()=>{const f=fixture();const acquire=f.plugin.acquireLatestFrame;f.plugin.acquireLatestFrame=async()=>{f.advance(1100);return acquire();};await expect(f.transport.acquireLatestFrame()).rejects.toMatchObject({code:'STALE_FRAME'});expect(f.calls).toHaveLength(1);});
 it('rejects a snapshot arriving after disconnect and releases native resource',async()=>{let deliver;const f=fixture({acquireLatestFrame:()=>new Promise(r=>deliver=r)});const request=f.transport.acquireLatestFrame();await f.transport.disconnect();deliver({frameId:'f',sessionId:'s',nowMonotonicMs:1,renderedAtMonotonicMs:1,width:1,height:1,fileUri:'file:///a'});await expect(request).rejects.toMatchObject({code:'STALE_FRAME'});expect(f.calls).toHaveLength(1);});
 it.each([
  ['FRAME_BUSY','Wait for the current operation'],['STALE_FRAME','Wait for live video'],['NO_PIXELS','Wait for live video'],
  ['SESSION_CHANGED','Reconnect and capture a fresh frame'],['WIFI_UNAVAILABLE','same Wi-Fi'],['APP_BACKGROUND','Resume the app and reconnect'],
  ['STREAM_SETUP','local camera credentials'],['CREDENTIAL_STORAGE','Save camera credentials again'],['FRAME_STORAGE','device storage'],
  ['INVALID_CONFIGURATION','stream selection'],['INVALID_STATUS','Disconnect and reconnect'],['CANCELLED','Try again'],['CAMERA_ERROR','Check connection']
 ])('provides a fixed actionable %s message and drops sensitive native details',async(code,prompt)=>{
  const f=fixture({connect:async()=>{throw Object.assign(new Error('rtsp://alice:secret@192.168.1.1'),{code,url:'rtsp://alice:secret@host',nativeStack:'secret'});}});
  const error=await f.transport.connect({cameraId:'a',host:'192.168.1.1'}).catch(error=>error);
  expect(error).toBeInstanceOf(Error);expect(error.code).toBe(code);expect(error.message).toContain(prompt);
  expect(error.message).not.toMatch(/rtsp|alice|secret|192\.168/);expect(error.url).toBeUndefined();expect(error.nativeStack).toBeUndefined();
  expect(Object.keys(error)).toEqual(['code']);
 });
 it.each(['rtsp://alice:secret@host','toString','__proto__',null,{},123])('redacts unknown or malformed error code %s',async code=>{
  const f=fixture({connect:async()=>{throw {code,message:'secret'};}});
  await expect(f.transport.connect({cameraId:'a'})).rejects.toMatchObject({code:'CAMERA_ERROR',message:'Camera operation failed. Check connection and camera settings.'});
 });
 it('offers a no-pixels retry without automatic acquisition or weakening frame freshness',async()=>{
  const f=fixture();const acquire=f.plugin.acquireLatestFrame;
  f.plugin.acquireLatestFrame=vi.fn().mockRejectedValueOnce({code:'NO_PIXELS',message:'secret'}).mockImplementationOnce(acquire).mockImplementationOnce(async()=>({...await acquire(),nowMonotonicMs:5000}));
  await expect(f.transport.acquireLatestFrame()).rejects.toMatchObject({code:'NO_PIXELS',message:'Camera pixels are not available yet. Wait for live video, then try again.'});
  expect(f.plugin.acquireLatestFrame).toHaveBeenCalledTimes(1);
  const frame=await f.transport.acquireLatestFrame();expect(frame.frameId).toBe('f');await f.transport.releaseFrame(frame.frameId);
  await expect(f.transport.acquireLatestFrame()).rejects.toMatchObject({code:'STALE_FRAME'});expect(f.calls).toEqual([{frameId:'f'},{frameId:'f'}]);
 });
 it('rejects missing or malformed native metadata',async()=>{const f=fixture({acquireLatestFrame:async()=>({frameId:'f',sessionId:'s',fileUri:'rtsp://secret@host',width:1,height:1})});await expect(f.transport.acquireLatestFrame()).rejects.toMatchObject({code:'STALE_FRAME'});expect(f.calls).toHaveLength(1);});
});
