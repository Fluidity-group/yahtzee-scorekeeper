// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
const saved=vi.hoisted(()=>[]);
vi.mock('dexie',()=>({default:class{constructor(){this.runs={put:async r=>saved.push(structuredClone(r)),toArray:async()=>saved};this.profiles={put:vi.fn(),get:async()=>null};}version(){return {stores:()=>{}};}}}));
it('captures a reviewed scene, rejects in-flight frames after cancel, and saves confirmed analytics',async()=>{
 let raf,clock=1000;const workers=[];
 vi.stubGlobal('requestAnimationFrame',fn=>{raf=fn;});vi.spyOn(performance,'now').mockImplementation(()=>clock);
 vi.stubGlobal('Worker',class{constructor(){this.sent=[];workers.push(this);}postMessage(m){this.sent.push(m);}terminate(){}});
 const context={drawImage(){},clearRect(){},beginPath(){},lineTo(){},moveTo(){},closePath(){},stroke(){},fillText(){},strokeRect(){},arc(){},fill(){},getImageData:()=>({data:new Uint8ClampedArray(960*540*4)})};
 HTMLCanvasElement.prototype.getContext=()=>context;
 HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{configurable:true,value:true});};HTMLMediaElement.prototype.play=async function(){Object.defineProperties(this,{paused:{configurable:true,value:false},videoWidth:{configurable:true,value:1920},videoHeight:{configurable:true,value:1080}});};
 const track={stop:vi.fn(),addEventListener:vi.fn(),getSettings:()=>({deviceId:'logitech'})};
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]}),enumerateDevices:async()=>[{kind:'videoinput',deviceId:'logitech',label:'Logitech test'}]}});
 await import('../src/dice/camera-lab.js');const $=s=>document.querySelector(s),w=workers[0];w.onmessage({data:{type:'ready'}});$('#start').click();await vi.waitFor(()=>expect($('#lockView').disabled).toBe(false));
 expect($('#calibrate').disabled).toBe(true);$('#lockView').click();await vi.waitFor(()=>expect($('#calibrate').disabled).toBe(false));
 $('#autoTray').click();
 const outline=[[.1,.1],[.9,.1],[.95,.15],[.95,.85],[.9,.9],[.1,.9],[.05,.85],[.05,.15]];
 for(let i=0;i<4;i++){clock+=250;raf();const m=w.sent.at(-1);expect(m.type).toBe('tray');expect($('#confirmArea').disabled).toBe(i===0);w.onmessage({data:{type:'tray-result',id:m.id,proposal:outline,reason:'Check the felt'}});}
 expect($('#confirmArea').disabled).toBe(false);expect($('#checkDice').disabled).toBe(true);expect($('#arm').disabled).toBe(true);
 // A user can accept a visible proposal immediately, even while another frame is processing.
 $('#autoTray').click();clock+=250;raf();let trayRequest=w.sent.at(-1);
 w.onmessage({data:{type:'tray-result',id:trayRequest.id,proposal:outline,reason:'Check the felt'}});
 expect($('#trayReview').hidden).toBe(false);expect($('#confirmArea').disabled).toBe(false);
 clock+=250;raf();trayRequest=w.sent.at(-1);$('#confirmArea').click();expect($('#checkDice').disabled).toBe(false);
 w.onmessage({data:{type:'tray-result',id:trayRequest.id,proposal:null,reason:'No tray'}});
 expect($('#checkDice').disabled).toBe(false);expect($('#trayReviewText').textContent).toContain('Tray confirmed');expect($('#trayReview').hidden).toBe(true);expect($('#setupDetails').open).toBe(false);
 // Reject the proposed outline and use the manual fallback.
 $('#calibrate').click();$('#view').getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
 [[10,10],[90,10],[95,15],[95,85],[90,90],[10,90],[5,85],[5,15]].forEach(([clientX,clientY])=>$('#view').dispatchEvent(new MouseEvent('click',{clientX,clientY})));
 expect($('#arm').disabled).toBe(true);expect($('#checkDice').disabled).toBe(true);$('#confirmArea').click();expect($('#arm').disabled).toBe(true);$('#checkDice').click();expect($('#arm').disabled).toBe(false);$('#arm').click();
 const scene=[1,2,3,4,5].map((value,i)=>({value,x:.2+i*.13,y:.5,bounds:[.1,.1,.05,.05]}));
 const send=()=>{clock+=250;raf();const m=w.sent.at(-1);expect(m.type).toBe('frame');w.onmessage({data:{type:'result',id:m.id,dice:scene,rejected:[],moving:false,handInTray:false,hands:[],processingMs:2,actorHint:null}});return m;};
 for(let i=0;i<5;i++)send();expect($('#confirm').disabled).toBe(false);
 $('#confirm').click();expect($('#notice').textContent).toContain('tick');
 $('#reviewed').checked=true;$('#confirm').click();await vi.waitFor(()=>expect(saved).toHaveLength(1));
 expect(saved[0].records[0].after).toEqual([1,2,3,4,5]);expect(saved[0].records[0].heldMask).toEqual(Array(5).fill(false));expect(saved[0].records[0].observation.mediaOrigin).toBe('webcam');
 // Tray monitoring has its own worker and never gates or clears dice results.
 const monitor=workers.at(-1);expect(monitor).not.toBe(w);monitor.onmessage({data:{type:'ready'}});
 const checkTray=proposal=>{clock+=1100;send();const m=monitor.sent.at(-1);expect(m.type).toBe('tray');monitor.onmessage({data:{type:'tray-result',id:m.id,proposal,candidates:proposal?1:0}});expect($('#detectedCount').textContent).toBe('5 / 5 dice readable');expect(w.sent.at(-1).polygon).toEqual(outline);};
 checkTray(null);expect($('#trayTracking').textContent).toContain('cannot verify');
 checkTray(outline);
 const shifted=outline.map(([x,y])=>[x+.02,y]);
 checkTray(shifted);checkTray(shifted);checkTray(shifted);
 expect($('#applyTray').hidden).toBe(false);
 $('#applyTray').click();send();expect($('#applyTray').hidden).toBe(true);
 w.sent.at(-1).polygon.forEach((p,i)=>{expect(p[0]).toBeCloseTo(shifted[i][0]);expect(p[1]).toBeCloseTo(shifted[i][1]);});
 monitor.onerror();send();expect($('#detectedCount').textContent).toBe('5 / 5 dice readable');
 // A terminated worker cannot revive the monitor or overwrite its error status.
 monitor.onmessage({data:{type:'ready'}});expect($('#trayTracking').textContent).toContain('failed');
 $('#arm').click();clock+=250;raf();const stale=w.sent.at(-1);$('#cancel').click();$('#arm').click();w.onmessage({data:{type:'result',id:stale.id,dice:scene,rejected:[],hands:[]}});expect($('#confirm').disabled).toBe(true);
 $('#editView').click();expect($('#confirmArea').disabled).toBe(true);expect($('#checkDice').disabled).toBe(true);expect($('#arm').disabled).toBe(true);
 $('#stop').click();expect(track.stop).toHaveBeenCalled();expect($('#confirm').disabled).toBe(true);expect($('#arm').disabled).toBe(true);
 vi.restoreAllMocks();vi.unstubAllGlobals();
});
