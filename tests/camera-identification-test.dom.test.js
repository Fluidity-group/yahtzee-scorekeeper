// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {DiceIdentificationSession,createDiceIdentificationUI} from '../src/dice/camera-test.js';
import {openDiceIdentificationTest,disconnectCamera} from '../src/dice/camera-panel.js';

afterEach(async()=>{document.querySelectorAll('dialog').forEach(d=>d.close());await disconnectCamera();vi.restoreAllMocks();document.body.replaceChildren();});
it('compares unordered repeated faces and never exports camera secrets, URLs or pixels',()=>{
 const session=new DiceIdentificationSession();
 const frame={sequence:7,width:960,height:540,orientation:0,source:'c121-rtsp',url:'secret-url',fileUri:'secret-file',cameraId:'secret-camera',password:'secret-password',pixels:[255]};
 const prediction={dice:[2,2,3,4,6].map(value=>({value,bounds:[.1,.1,.1,.1]})),rejected:[]};
 expect(session.record({prediction,actual:[6,4,2,3,2],frame}).exact).toBe(true);
 expect(session.record({prediction,actual:[6,4,2,3,3],frame}).matchedFaces).toBe(4);
 expect(session.samples[1].exact).toBe(false);
 const exported=JSON.stringify(session.export());expect(exported).not.toContain('secret');expect(exported).not.toContain('pixels');
});
it('distinguishes empty-tray success from false positives and unclear candidates',()=>{
 const session=new DiceIdentificationSession(),frame={width:960,height:540};
 expect(session.record({prediction:{dice:[],rejected:[]},actual:[],frame}).exact).toBe(true);
 expect(session.record({prediction:{dice:[{value:1}],rejected:[]},actual:[],frame}).exact).toBe(false);
 expect(session.record({prediction:{dice:[],rejected:[{reason:'Pips unclear'}]},actual:[],frame}).exact).toBe(false);
 expect(()=>session.record({prediction:{},actual:[0],frame})).toThrow('every actual face');
});
it('bounds evidence retention and exports an independent snapshot',()=>{
 const session=new DiceIdentificationSession(),sample={prediction:{dice:[],rejected:[]},actual:[],frame:{}};
 for(let i=0;i<100;i++)session.record(sample);
 expect(()=>session.record(sample)).toThrow('100 tests');const exported=session.export();exported.samples.length=0;expect(session.samples).toHaveLength(100);
});
it.each(['result','interrupted'])('standalone test needs no game and handles %s without authority',async scenario=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;Object.defineProperties(this,{clientWidth:{value:600},clientHeight:{value:600}});};
 HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:500,height:280,right:500,bottom:280});
 const context={drawImage:vi.fn(),putImageData:vi.fn(),getImageData:()=>({width:960,height:540,data:new Uint8ClampedArray(960*540*4)}),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),closePath:vi.fn(),stroke:vi.fn(),strokeRect:vi.fn(),fillText:vi.fn()};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
 let statusListener,finish;
 const transport={supported:()=>true,listProfiles:async()=>[],getStatus:async()=>({state:'live',sessionId:'s1',streamWidth:960,streamHeight:540}),onStatus:async callback=>{statusListener=callback;return {remove:vi.fn()};},setPreviewRect:vi.fn(async()=>{}),disconnect:vi.fn(async()=>{}),releaseFrame:vi.fn(async()=>{}),acquireLatestFrame:async()=>({frameId:'f1',sessionId:'s1',sequence:1,width:960,height:540,orientation:0,url:'private-frame'})};
 const prediction={dice:[1,2,3,4,5].map((value,i)=>({value,x:.2+i*.1,y:.5,bounds:[.2+i*.1,.5,.05,.05]})),rejected:[{bounds:[.1,.1,.1,.1],reason:'Pips unclear'}]};
 const reader={ready:Promise.resolve(),infer:vi.fn(scenario==='interrupted'?()=>new Promise(resolve=>{finish=resolve;}):async()=>prediction),stop:vi.fn()};
 const getGame=vi.fn(()=>{throw Error('Must not access game');}),commit=vi.fn();
 const panel=await openDiceIdentificationTest({getGame,commit,transport,readerFactory:()=>reader,loadImage:async()=>({})});
 expect(document.querySelector('h2').textContent).toBe('Dice identification test');expect(document.querySelector('[data-confirm]')).toBeNull();
 await document.querySelector('[data-calibrate]').onclick();
 const canvas=document.querySelector('canvas');for(const [x,y]of [[.1,.2],[.2,.1],[.8,.1],[.9,.2],[.9,.8],[.8,.9],[.2,.9],[.1,.8]])canvas.dispatchEvent(new MouseEvent('click',{clientX:x*500,clientY:y*280}));
 await document.querySelector('[data-use-area]').onclick();expect(document.querySelector('[data-capture]').disabled).toBe(false);
 const capture=document.querySelector('[data-capture]').onclick();
 if(scenario==='interrupted'){
  await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));statusListener({state:'interrupted',sessionId:''});finish(prediction);await capture;
  expect(document.querySelector('[data-test-record]').disabled).toBe(true);expect(document.querySelector('[data-test-result]').textContent).toContain('No current test frame');expect(document.querySelector('[data-identification-test]').hidden).toBe(false);expect(document.querySelector('[data-test-export]')).not.toBeNull();expect(document.querySelector('[data-capture]').disabled).toBe(true);
 }else{
  await capture;expect(reader.infer).toHaveBeenCalledOnce();expect(context.strokeRect).toHaveBeenCalledTimes(6);expect(document.querySelector('[data-test-result]').textContent).toContain('5 readable dice');
  document.querySelector('[data-test-record]').click();expect(panel.getTestResults().samples).toHaveLength(0);
  document.querySelectorAll('[data-test-faces] select').forEach((select,i)=>{select.value=i<5?String(i+1):'not-die';});document.querySelector('[data-test-record]').click();
  expect(panel.getTestResults().samples[0].exact).toBe(false);expect(panel.getTestResults().samples[0].actual).toEqual([1,2,3,4,5]);
  document.querySelector('[data-test-record]').click();expect(panel.getTestResults().samples).toHaveLength(1);
  expect(document.querySelector('[data-preview]').hidden).toBe(true);
 }
 expect(getGame).not.toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();expect(transport.releaseFrame).toHaveBeenCalledWith('f1');panel.close();
});

function picturedLab(){
 document.body.innerHTML='<dialog><canvas data-view width="960" height="540"></canvas><details data-timing></details></dialog>';
 const context={drawImage:vi.fn(),strokeRect:vi.fn(),fillText:vi.fn()};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
 const box=document.querySelector('dialog'),canvas=box.querySelector('canvas');
 return {ui:createDiceIdentificationUI({box,canvas,context}),context,canvas,find:s=>box.querySelector(s)};
}
it('crops the same unmarked frame without stretching and requires explicit confirmations',()=>{
 const {ui,context,canvas,find}=picturedLab();
 ui.show({dice:[{value:3,bounds:[.25,.25,.1,.1]}],rejected:[{bounds:[.8,.8,.1,.1],reason:'Pips unclear'}]}, {sequence:4,width:960,height:540});
 const crops=[...document.querySelectorAll('[data-test-faces] canvas')];expect(crops).toHaveLength(2);
 const [source,sx,sy,sw,sh,dx,dy,dw,dh]=context.drawImage.mock.calls[0];expect(source).toBe(canvas);
 expect(sx).toBeCloseTo(225.6);expect(sy).toBeCloseTo(99.6);expect(sw).toBeCloseTo(124.8);expect(sh).toBeCloseTo(124.8);expect(dw/dh).toBeCloseTo(sw/sh);
 expect(context.drawImage.mock.invocationCallOrder.at(-1)).toBeLessThan(context.strokeRect.mock.invocationCallOrder[0]);
 expect(context.fillText.mock.calls.map(c=>c[0])).toEqual(['1: 3','2: ?']);
 expect(find('[data-test-faces] select').value).toBe('');find('[data-test-record]').click();expect(ui.getResults().samples).toHaveLength(0);
 const selects=document.querySelectorAll('[data-test-faces] select');selects[0].value='4';selects[1].value='not-die';find('[data-test-record]').click();
 const sample=ui.getResults().samples[0];expect(sample.predicted).toEqual([3]);expect(sample.actual).toEqual([4]);expect(sample.exact).toBe(false);
 expect(sample.reviews).toEqual([{kind:'readable',index:0,predicted:3,actual:4},{kind:'unclear',index:1,predicted:null,actual:null}]);
 expect(JSON.stringify(ui.getResults())).not.toMatch(/pixels|data:image|fileUri/);
});
it('records missed dice and false positives while retaining original predictions and caps actual faces',()=>{
 const {ui,find}=picturedLab();ui.show({dice:[{value:6,bounds:[-.01,0,.1,.1]}],rejected:[]},{sequence:1});
 find('[data-test-faces] select').value='not-die';find('[data-test-add]').click();
 const missed=find('[data-kind="missed"]');expect(missed.querySelector('canvas')).toBeNull();missed.querySelector('select').value='2';find('[data-test-record]').click();
 expect(ui.getResults().samples[0]).toMatchObject({predicted:[6],actual:[2],exact:false});
 ui.show({dice:[1,2,3,4,5].map(value=>({value})),rejected:[]},{});
 document.querySelectorAll('[data-test-faces] select').forEach((s,i)=>s.value=String(i+1));find('[data-test-add]').click();find('[data-kind="missed"] select').value='6';
 find('[data-test-record]').click();expect(ui.getResults().samples).toHaveLength(1);
 find('[data-kind="missed"] button').click();find('[data-test-record]').click();expect(ui.getResults().samples[1].exact).toBe(true);
});
it('handles empty trays, resets labels on each capture and discards stale pictures while retaining comparisons',()=>{
 const {ui,find}=picturedLab();ui.show({dice:[],rejected:[]},{});expect(find('[data-test-empty]').hidden).toBe(false);
 find('[data-test-record]').click();expect(ui.getResults().samples[0].exact).toBe(true);
 ui.show({dice:[{value:2,bounds:[.9,.9,.2,.2]}],rejected:[]},{});find('[data-test-faces] select').value='2';
 ui.show({dice:[{value:2,bounds:[.9,.9,.2,.2]}],rejected:[]},{});expect(find('[data-test-faces] select').value).toBe('');
 ui.invalidate();expect(find('[data-test-faces]').children).toHaveLength(0);expect(find('[data-test-record]').disabled).toBe(true);expect(find('[data-test-add]').disabled).toBe(true);
 expect(ui.getResults().samples).toHaveLength(1);expect(find('[data-test-export]')).not.toBeNull();
});
