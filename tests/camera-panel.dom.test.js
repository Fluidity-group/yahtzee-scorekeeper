// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {openCameraGame,disconnectCamera} from '../src/dice/camera-panel.js';
import {createCoreGame,command} from '../src/game/core.js';

const canvasRectDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getBoundingClientRect');
const canvasRectMethod = HTMLCanvasElement.prototype.getBoundingClientRect;

afterEach(async()=>{document.querySelectorAll('dialog').forEach(d=>d.close());await disconnectCamera();vi.useRealTimers();vi.restoreAllMocks();if(canvasRectDescriptor)Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', canvasRectDescriptor);else delete HTMLCanvasElement.prototype.getBoundingClientRect;document.body.replaceChildren();});
it('fits live stream aspect from initial status and dimension changes, resetting invalid or reconnect dimensions',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;Object.defineProperties(this,{clientWidth:{value:500},clientHeight:{value:500}});};HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({});
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){
  if(this.hasAttribute('data-preview')){
   const [width,height]=this.style.aspectRatio.split('/').map(Number),displayHeight=320*height/width;
   return {left:120,top:110,width:320,height:displayHeight,right:440,bottom:110+displayHeight};
  }
  return {left:100,top:80,width:506,height:508,right:606,bottom:588};
 });
 let onStatus;
 const transport={supported:()=>true,listProfiles:async()=>[],getStatus:async()=>({state:'live',sessionId:'s1',streamWidth:960,streamHeight:540}),onStatus:async listener=>{onStatus=listener;return {remove:vi.fn()};},setPreviewRect:vi.fn(async()=>{}),disconnect:vi.fn(async()=>{})};
 const panel=await openCameraGame({getGame:()=>null,commit:vi.fn(),transport}),preview=document.querySelector('[data-preview]');
 expect(document.querySelector('[data-status]').textContent).toBe('Camera live. Calibrate the tray before capture.');
 expect(preview.style.height).toBe('auto');expect(preview.style.aspectRatio).toBe('960 / 540');
 expect(transport.setPreviewRect.mock.lastCall[0]).toEqual({visible:true,left:120,top:110,width:320,height:180});
 onStatus({state:'live',sessionId:'s1',streamWidth:640,streamHeight:480});
 expect(preview.style.aspectRatio).toBe('640 / 480');expect(transport.setPreviewRect.mock.lastCall[0].height).toBe(240);
 onStatus({state:'connecting',sessionId:'s2',streamWidth:640,streamHeight:480});
 expect(preview.style.aspectRatio).toBe('16 / 9');expect(transport.setPreviewRect.mock.lastCall[0].height).toBe(180);
 onStatus({state:'live',sessionId:'s2',streamWidth:640,streamHeight:480});expect(preview.style.aspectRatio).toBe('640 / 480');
 for(const [streamWidth,streamHeight]of [[640,0],[Infinity,480],['640',480],[8192,480]]){
  onStatus({state:'live',sessionId:'s2',streamWidth,streamHeight});expect(preview.style.aspectRatio).toBe('16 / 9');
 }
 panel.close();
});
it('hides native preview when scrolling clips any dialog edge, restores containment, and enforces viewport right edge',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({});
 let previewRect={left:120,top:110,width:380,height:190,right:500,bottom:300};
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){
  return this.hasAttribute('data-preview')?previewRect:{left:100,top:80,width:506,height:408,right:606,bottom:488};
 });
 const transport={supported:()=>true,listProfiles:async()=>[{profileId:'fixture'}],getStatus:async()=>({state:'disconnected'}),onStatus:async()=>({remove:vi.fn()}),setPreviewRect:vi.fn(async()=>{}),connect:vi.fn(async()=>{}),disconnect:vi.fn(async()=>{})};
 const panel=await openCameraGame({getGame:()=>null,commit:vi.fn(),transport});
 const dialog=document.querySelector('dialog');
 Object.defineProperties(dialog,{clientLeft:{value:3},clientTop:{value:4},clientWidth:{value:500,configurable:true},clientHeight:{value:400}});
 document.querySelector('[data-connect]').click();await vi.waitFor(()=>expect(transport.connect).toHaveBeenCalled());
 const normal={...previewRect};
 expect(transport.setPreviewRect.mock.lastCall[0]).toEqual({visible:true,left:120,top:110,width:380,height:190});
 // Client bounds begin after borders and end before the scrollbar/border.
 for(const clipped of [{left:102,right:482},{top:83,bottom:273},{left:230,right:610},{top:300,bottom:490}]){
  previewRect={...normal,...clipped};dialog.dispatchEvent(new Event('scroll'));
  expect(transport.setPreviewRect.mock.lastCall[0]).toEqual({visible:false,left:previewRect.left,top:previewRect.top,width:380,height:190});
  previewRect={...normal};dialog.dispatchEvent(new Event('scroll'));
  expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(true);
 }
 Object.defineProperty(dialog,'clientWidth',{value:2000});
 previewRect={...normal,left:window.innerWidth-100,right:window.innerWidth+280};window.dispatchEvent(new Event('resize'));
 expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(false);
 previewRect={...normal};dialog.dispatchEvent(new Event('scroll'));
 expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(true);panel.close();
});
it.each(['retry','cancel-calibration','scene-change','interrupted','frozen-sequence','cold-start','dimension-before-capture','dimension-review','dimension-confirm','timing-cap','init-race','setup-close','setup-auto','setup-new-session','setup-disconnected','setup-explicit-disconnect','setup-background'])('camera confirmation: %s',async scenario=>{
 const changedScene=scenario==='scene-change';
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});
 HTMLDialogElement.prototype.showModal=function(){this.open=true;Object.defineProperties(this,{clientWidth:{value:600},clientHeight:{value:600}});};HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){return this.hasAttribute('data-preview')?{left:20,top:20,width:500,height:281,right:520,bottom:301}:{left:0,top:0,width:600,height:600,right:600,bottom:600};});
 let altered=false;const pixels=()=>{const data=new Uint8ClampedArray(960*540*4);if(altered)for(let y=240;y<256;y++)for(let x=460;x<476;x++)data[(y*960+x)*4]=255;return data;};
 const ctx={drawImage:vi.fn(),putImageData:vi.fn(),getImageData:()=>({width:960,height:540,data:pixels()}),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),closePath:vi.fn(),stroke:vi.fn()};vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);
 // Vitest 4 reuses inherited spies; keep the canvas geometry independent of the parent preview spy.
 Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {configurable:true,writable:true,value:canvasRectMethod});
 vi.spyOn(HTMLCanvasElement.prototype,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:960,height:540});
 let sequence=0,statusListener;const transport={supported:()=>true,listProfiles:async()=>[{profileId:'camera-1',host:'192.168.1.2'}],getStatus:async()=>({state:'live',sessionId:'session-1',streamWidth:960,streamHeight:540}),onStatus:async callback=>{statusListener=callback;return {remove:vi.fn()};},setPreviewRect:vi.fn(async()=>{}),disconnect:vi.fn(async()=>{}),releaseFrame:vi.fn(async()=>{}),acquireLatestFrame:vi.fn(async({calibrationId})=>({version:1,cameraId:'camera-1',sessionId:'session-1',sequence:++sequence,frameId:`frame-${sequence}`,width:960,height:540,orientation:0,calibrationId,mediaOrigin:'camera',timestampMeaning:'local-render-not-sensor-capture',observedAtMonotonicMs:performance.now(),ageUpperBoundMs:0,url:'http://localhost/private-frame',timingDiagnostics:{clock:'android-elapsed-realtime',meaning:'local-stage-durations-not-sensor-latency',snapshotExtractionMs:12,pngEncodeAndWriteMs:23,nativeRenderAgeMs:scenario==='timing-cap'?60000:4,url:'rtsp://user:secret@host',pixels:[255]}}))};
 let game=command(createCoreGame({id:'camera-game',names:['Alice'],source:'camera'}),{type:'start',seat:0},{id:'start-camera'});
 const commit=vi.fn().mockRejectedValueOnce(Error('Storage unavailable')).mockImplementationOnce(async(action,id)=>{game=command(game,action,{id});});
 const reader={infer:vi.fn(async()=>({dice:[1,2,3,4,5].map((value,i)=>({value,x:.2+i*.12,y:.5})),rejected:[],moving:false,handInTray:false})),stop:vi.fn()};
 if(scenario==='cold-start')reader.ready=new Promise(resolve=>setTimeout(resolve,10000));
 if(scenario==='frozen-sequence'){const acquire=transport.acquireLatestFrame;transport.acquireLatestFrame=vi.fn(async options=>({...await acquire(options),sequence:1}));}
 const setup=scenario.startsWith('setup-');
 let panel=await openCameraGame({getGame:()=>setup?null:game,commit,transport,readerFactory:()=>reader,loadImage:async()=>({})});
 const click=s=>document.querySelector(s).click();click('[data-calibrate]');await vi.advanceTimersByTimeAsync(0);
 expect(document.querySelector('[data-preview]').hidden).toBe(true);
 expect(document.querySelector('[data-view]').hidden).toBe(false);
 expect(document.querySelector('dialog').classList.contains('camera-calibrating')).toBe(true);
 expect(document.querySelector('[data-use-area]').disabled).toBe(true);
 expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(false);
 window.dispatchEvent(new Event('resize'));statusListener({state:'live',sessionId:'session-1',streamWidth:960,streamHeight:540});
 expect(document.querySelector('[data-preview]').hidden).toBe(true);
 if(scenario==='cancel-calibration'){
  click('[data-cancel-calibration]');await vi.advanceTimersByTimeAsync(0);
  expect(document.querySelector('dialog').classList.contains('camera-calibrating')).toBe(false);expect(document.querySelector('[data-view]').hidden).toBe(true);
  expect(document.querySelector('[data-preview]').hidden).toBe(false);expect(document.querySelector('[data-capture]').disabled).toBe(true);
  expect(transport.releaseFrame).toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();return;
 }
 let canvas=document.querySelector('canvas');for(const [x,y]of [[.1,.2],[.2,.1],[.8,.1],[.9,.2],[.9,.8],[.8,.9],[.2,.9],[.1,.8]])canvas.dispatchEvent(new MouseEvent('click',{clientX:x*960,clientY:y*540,bubbles:true}));
 if(scenario==='retry'){
  click('[data-undo-point]');expect(document.querySelector('[data-status]').textContent).toBe('7/8 tray corners marked.');expect(document.querySelector('[data-use-area]').disabled).toBe(true);
  click('[data-clear-points]');expect(document.querySelector('[data-use-area]').disabled).toBe(true);expect(document.querySelector('[data-undo-point]').disabled).toBe(true);
  for(const [x,y]of [[.1,.2],[.2,.1],[.8,.1],[.9,.2],[.9,.8],[.8,.9],[.2,.9],[.1,.8]])canvas.dispatchEvent(new MouseEvent('click',{clientX:x*960,clientY:y*540,bubbles:true}));
  expect(ctx.putImageData).toHaveBeenCalled();
 }
 click('[data-use-area]');await vi.advanceTimersByTimeAsync(0);
 expect(document.querySelector('dialog').classList.contains('camera-calibrating')).toBe(false);expect(document.querySelector('[data-calibration-tools]').hidden).toBe(true);
 expect(document.querySelector('[data-preview]').hidden).toBe(false);expect(canvas.hidden).toBe(true);
 expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(true);
 if(setup){
  expect(document.querySelector('[data-capture]').disabled).toBe(true);
  if(scenario==='setup-explicit-disconnect'){
   transport.disconnect.mockImplementation(async()=>statusListener({state:'disconnected',sessionId:''}));
   click('[data-disconnect]');await vi.advanceTimersByTimeAsync(0);
  }
  if(scenario==='setup-background'){
   vi.spyOn(document,'hidden','get').mockReturnValue(true);
   document.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(0);
  }
  panel.close();await vi.advanceTimersByTimeAsync(0);
  if(scenario==='setup-close'||scenario==='setup-auto'||scenario==='setup-new-session'||scenario==='setup-disconnected')expect(transport.disconnect).not.toHaveBeenCalled();
  expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(false);
  const current=scenario==='setup-disconnected'?{state:'disconnected',sessionId:''}:{state:'live',sessionId:scenario==='setup-new-session'?'session-2':'session-1',streamWidth:960,streamHeight:540};
  panel=await openCameraGame({getGame:()=>game,commit,autoCapture:scenario!=='setup-close',transport:{...transport,getStatus:async()=>current},readerFactory:()=>reader,loadImage:async()=>({})});canvas=document.querySelector('canvas');
  if(scenario!=='setup-close'&&scenario!=='setup-auto'){
   expect(document.querySelector('[data-capture]').disabled).toBe(true);expect(document.querySelector('[data-status]').textContent).not.toContain('calibration retained');expect(commit).not.toHaveBeenCalled();return;
  }
  if(scenario==='setup-auto'){
   expect(document.querySelector('[data-capture]').disabled).toBe(true);expect(document.querySelector('[data-status]').textContent).toContain('Waiting for a clear settled view');expect(commit).not.toHaveBeenCalled();
  }else{
   expect(document.querySelector('[data-capture]').disabled).toBe(false);expect(document.querySelector('[data-status]').textContent).toContain('calibration retained');
  }
  expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(true);
 }
 if(scenario==='dimension-before-capture'){
  expect(document.querySelector('[data-capture]').disabled).toBe(false);
  statusListener({state:'live',sessionId:'session-1',streamWidth:640,streamHeight:480});
  expect(document.querySelector('[data-capture]').disabled).toBe(true);expect(document.querySelector('[data-use-area]').hidden).toBe(true);
  expect(document.querySelector('[data-status]').textContent).toContain('Calibrate the tray again');
  click('[data-capture]');await vi.advanceTimersByTimeAsync(1000);expect(reader.infer).not.toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();return;
 }
 if(scenario!=='setup-auto')click('[data-capture]');await vi.advanceTimersByTimeAsync(1000);
 if(scenario==='frozen-sequence'){await vi.advanceTimersByTimeAsync(8000);expect(document.querySelector('[data-review]').hidden).toBe(true);expect(commit).not.toHaveBeenCalled();return;}
 if(scenario==='cold-start')await vi.advanceTimersByTimeAsync(10000);
 expect(document.querySelector('[data-review]').hidden).toBe(false);expect(commit).not.toHaveBeenCalled();
 expect(document.querySelector('[data-preview]').hidden).toBe(true);expect(canvas.hidden).toBe(false);
 expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(false);
 expect(panel.getTiming().some(s=>s.stage==='reviewPreparationMs'&&s.clock==='js-performance')).toBe(true);
 expect(document.querySelector('[data-timing-values]').textContent).toContain('android-elapsed-realtime / snapshotExtractionMs: 12.0 ms');
 expect(document.querySelector('[data-timing-values]').textContent).not.toContain('secret');
 expect(JSON.stringify(panel.getTiming())).not.toContain('private-frame');
 if(scenario==='timing-cap'){expect(document.querySelector('[data-timing-values]').textContent).toContain('nativeRenderAgeMs: >= 60000.0 ms (capped)');expect(panel.getTiming().find(s=>s.stage==='nativeRenderAgeMs').capped).toBe(true);return;}
 if(scenario==='dimension-confirm'){
  let finish;reader.infer.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  click('[data-confirm]');await vi.advanceTimersByTimeAsync(0);expect(finish).toBeTypeOf('function');
  statusListener({state:'live',sessionId:'session-1',streamWidth:640,streamHeight:480});
  finish({dice:[1,2,3,4,5].map((value,i)=>({value,x:.2+i*.12,y:.5})),rejected:[],moving:false,handInTray:false});await vi.advanceTimersByTimeAsync(0);
  expect(commit).not.toHaveBeenCalled();expect(document.querySelector('[data-confirm]').disabled).toBe(true);expect(document.querySelector('[data-capture]').disabled).toBe(true);return;
 }
 if(scenario==='dimension-review'){
  statusListener({state:'live',sessionId:'session-1',streamWidth:640,streamHeight:480});
  expect(document.querySelector('[data-review]').hidden).toBe(true);expect(document.querySelector('[data-confirm]').disabled).toBe(true);expect(document.querySelector('[data-capture]').disabled).toBe(true);
  expect(document.querySelector('[data-preview]').style.aspectRatio).toBe('640 / 480');expect(document.querySelector('[data-status]').textContent).toContain('Calibrate the tray again');
  expect(document.querySelector('[data-preview]').hidden).toBe(false);expect(canvas.hidden).toBe(true);
  click('[data-confirm]');await vi.advanceTimersByTimeAsync(0);expect(commit).not.toHaveBeenCalled();return;
 }
 if(scenario==='interrupted'){statusListener({state:'interrupted',sessionId:''});expect(document.querySelector('[data-confirm]').disabled).toBe(true);expect(commit).not.toHaveBeenCalled();return;}
 if(changedScene){altered=true;click('[data-confirm]');await vi.advanceTimersByTimeAsync(0);expect(commit).not.toHaveBeenCalled();expect(document.querySelector('[data-status]').textContent).toContain('Scene changed');expect(document.querySelector('[data-confirm]').disabled).toBe(true);return;}
 click('[data-confirm]');await vi.advanceTimersByTimeAsync(0);expect(document.querySelector('[data-status]').textContent).toContain('Storage unavailable');
 expect(transport.setPreviewRect.mock.lastCall[0].visible).toBe(false);expect(document.querySelector('[data-preview]').hidden).toBe(true);
 expect(document.querySelector('[data-confirm]').disabled).toBe(false);click('[data-confirm]');await vi.advanceTimersByTimeAsync(0);
 expect(commit).toHaveBeenCalledTimes(2);expect(commit.mock.calls[0][1]).toBe(commit.mock.calls[1][1]);expect(game.turn.rolls).toHaveLength(1);expect(game.turn.rolls[0].source).toBe('camera');expect(reader.stop).toHaveBeenCalled();expect(document.querySelector('dialog')).toBeNull();expect(panel.getTiming()).toEqual([]);
 if(scenario==='init-race'){
  let finishStatus;const getStatus=vi.fn(()=>new Promise(resolve=>{finishStatus=resolve;}));
  const opening=openCameraGame({getGame:()=>game,commit,transport:{...transport,getStatus},readerFactory:()=>reader,loadImage:async()=>({})});
  await vi.advanceTimersByTimeAsync(0);expect(getStatus).toHaveBeenCalledOnce();
  click('[data-calibrate]');await vi.advanceTimersByTimeAsync(0);
  const reopenedCanvas=document.querySelector('canvas');reopenedCanvas.dispatchEvent(new MouseEvent('click',{clientX:96,clientY:108,bubbles:true}));
  expect(document.querySelector('[data-status]').textContent).toBe('1/8 tray corners marked.');
  finishStatus({state:'live',sessionId:'session-1',streamWidth:960,streamHeight:540});const reopened=await opening;
  expect(reopenedCanvas.hidden).toBe(false);expect(document.querySelector('[data-use-area]').hidden).toBe(false);expect(document.querySelector('[data-capture]').disabled).toBe(true);
  expect(document.querySelector('[data-status]').textContent).toBe('1/8 tray corners marked.');
  reopenedCanvas.dispatchEvent(new MouseEvent('click',{clientX:192,clientY:54,bubbles:true}));expect(document.querySelector('[data-status]').textContent).toBe('2/8 tray corners marked.');reopened.close();
 }
 if(scenario==='retry'){
  const reopened=await openCameraGame({getGame:()=>game,commit,transport:{...transport,getStatus:async()=>({state:'live',sessionId:'session-1',streamWidth:640,streamHeight:480})},readerFactory:()=>reader,loadImage:async()=>({})});
  expect(document.querySelector('[data-capture]').disabled).toBe(true);expect(document.querySelector('[data-status]').textContent).toBe('Camera live. Calibrate the tray before capture.');reopened.close();
 }
});
