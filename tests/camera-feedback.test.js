// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {RecognitionFeedback,exactRoll} from '../src/dice/camera/feedback.js';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(values=[1,2],rejected=[{reason:'Pips unclear'}]){
 const root=document.createElement('section');document.body.replaceChildren(root);
 const sample={id:'frame-1',image:'data:image/png;base64,test',polygon:[[0,0]],settings:{brightness:145},prediction:{dice:values.map(value=>({value})),rejected},source:'webcam'};
 const samples=[],db={samples:{put:vi.fn(async s=>samples.push(s)),toArray:async()=>samples}};
 const ui=new RecognitionFeedback(root,{db,getSample:()=>structuredClone(sample),getSettings:()=>({brightness:130}),download:vi.fn()});ui.update(true);
 return {ui,samples,db,$:id=>root.querySelector('#'+id)};
}
it('scores full roll multisets including repeated faces and rejects incomplete reads',()=>{
 expect(exactRoll([1,1,2,3,6],[6,3,2,1,1])).toBe(true);
 expect(exactRoll([1,2,2,3,6],[1,1,2,3,6])).toBe(false);
 expect(exactRoll([1,2],[1,2,3,4,5])).toBe(false);
 expect(exactRoll([1,2,3,4,5],[1,2,3,4,5],1)).toBe(false);
});
it('labels three touching dice independently inside one rejected cluster and saves the failure',async()=>{
 const {ui,samples,$}=setup([], [{x:.5,y:.5,bounds:[.4,.4,.2,.2],reason:'Size / shape / possible hand'}]);
 $('startTen').click();ui.freeze();
 for(const [x,y] of [[.46,.46],[.5,.46],[.46,.51],[.7,.5],[.8,.5]]){ui.selectPoint(x,y);ui.choose(1);}
 expect(ui.labels).toHaveLength(5);expect(ui.labels.every(d=>!d.bounds)).toBe(true);
 ui.selectPoint(.5,.46);ui.choose(2);expect(ui.labels).toHaveLength(5);expect(ui.labels[1].value).toBe(2);
 await ui.save();expect(samples[0].dieLabels).toHaveLength(5);expect(samples[0].prediction.rejected).toHaveLength(1);expect(samples[0].exactMatch).toBe(false);
});
it('saves a failed reading with five explicit labels and its original image/predictions',async()=>{
 const {ui,samples,$}=setup();$('freezeReading').click();expect($('sampleCorrect').disabled).toBe(true);
 await ui.save();expect(samples).toHaveLength(0);expect($('sampleStatus').textContent).toContain('all five');
 ui.fill([6,5,4,3,2]);await ui.save();expect(samples).toHaveLength(1);
 expect(samples[0]).toMatchObject({id:'frame-1',actual:[6,5,4,3,2],exactMatch:false,image:'data:image/png;base64,test',labelType:'unordered-five-dice'});
 expect(samples[0].prediction.dice).toHaveLength(2);expect($('sampleReview').hidden).toBe(true);
});
it('records an explicitly confirmed correct prediction and prevents duplicate saves',async()=>{
 const {samples,$,ui}=setup([1,2,3,4,5],[]);$('freezeReading').click();$('sampleCorrect').click();
 await vi.waitFor(()=>expect(samples).toHaveLength(1));expect(samples[0].exactMatch).toBe(true);await ui.save();expect(samples).toHaveLength(1);
});
it('requires five position labels for each of ten rolls and then stops the session',async()=>{
 const {ui,samples,$}=setup();$('startTen').click();
 for(let roll=0;roll<10;roll++){
  ui.freeze();await ui.save();expect(samples).toHaveLength(roll);
  for(let i=0;i<5;i++){ui.selectPoint(.1+i*.15,.5);ui.choose(i+1);}
  ui.selectPoint(.1,.5);ui.choose(6);expect(ui.labels).toHaveLength(5);
  await ui.save();expect(samples[roll]).toMatchObject({sessionRoll:roll+1,labelType:'position-labelled-five-dice',actual:[6,2,3,4,5]});
  expect(samples[roll].dieLabels[0]).toMatchObject({x:.1,y:.5,value:6});
 }
 expect($('sessionProgress').textContent).toContain('10 / 10');expect($('freezeReading').disabled).toBe(true);
 ui.freeze();expect(ui.sample).toBeNull();await ui.save();expect(samples).toHaveLength(10);
});
it('reruns saved images with current settings and reports full-roll matches',async()=>{
 const {ui,samples,$}=setup([1,2],[]);ui.freeze();ui.fill([1,2,3,4,5]);await ui.save();
 const messages=[],terminated=vi.fn();
 vi.stubGlobal('Worker',class{postMessage(m){messages.push(m);queueMicrotask(()=>this.onmessage({data:m.type==='init'?{type:'ready'}:{type:'evaluation',dice:[1,2,3,4,5].map(value=>({value})),rejected:[]}}));}terminate(){terminated();}});
 vi.stubGlobal('Image',class{naturalWidth=1;naturalHeight=1;async decode(){}});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(4)})});
 await ui.retest();expect(messages[1]).toMatchObject({type:'evaluate',settings:{brightness:130}});
 expect($('sampleScore').textContent).toContain('1 / 1 (100%)');expect($('sampleScore').textContent).toContain('Original readings: 0 / 1');
 expect(samples[0].exactMatch).toBe(false);expect(terminated).toHaveBeenCalled();
});
it('reviews a full game beyond ten rolls and exports only that session',async()=>{
 const {ui,samples,$}=setup([1,2,3,4,5],[]);
 samples.push({id:'earlier',sessionId:'old'});$('startGame').click();const sessionId=ui.session.id;
 for(let roll=0;roll<80;roll++){
  ui.freeze();expect($('finishSession').disabled).toBe(true);
  for(let i=0;i<5;i++){ui.selectPoint(.1+i*.15,.5);ui.choose(i+1);}
  await ui.save();expect(ui.session.count).toBe(roll+1);
 }
 expect(ui.complete()).toBe(false);expect($('freezeReading').disabled).toBe(false);
 expect($('sessionProgress').textContent).toContain('Roll 81');
 await ui.finishSession();expect(ui.download).toHaveBeenCalledTimes(1);
 expect(ui.download.mock.calls[0][1]).toBe('camera-game-session.json');
 expect(samples.filter(s=>s.sessionId===sessionId)).toHaveLength(80);
 expect(ui.complete()).toBe(true);expect($('freezeReading').disabled).toBe(true);
 $('startGame').click();expect(ui.session.id).not.toBe(sessionId);expect(ui.session.count).toBe(0);
});
it('retains labels and unlocks controls after a storage failure so saving can be retried',async()=>{
 const {ui,db,samples,$}=setup();$('startTen').click();ui.freeze();for(let i=0;i<5;i++){ui.selectPoint(.1+i*.15,.5);ui.choose(i+1);}
 db.samples.put.mockRejectedValueOnce(Error('Quota exceeded'));
 await ui.save();expect(ui.labels).toHaveLength(5);expect(ui.session.count).toBe(0);expect($('sampleSave').disabled).toBe(false);expect($('sampleStatus').textContent).toContain('Quota exceeded');
 await ui.save();expect(samples).toHaveLength(1);expect(ui.session.count).toBe(1);expect(ui.sample).toBeNull();
});
it('shows saving progress and blocks duplicate saves and discard while storage is pending',async()=>{
 const {ui,db,$}=setup([1,2,3,4,5],[]);ui.freeze();ui.fill([1,2,3,4,5]);let finish;db.samples.put.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const saving=ui.save();expect($('sampleSave').textContent).toBe('Saving roll…');expect($('sampleDiscard').disabled).toBe(true);$('sampleDiscard').click();expect(ui.sample).not.toBeNull();await ui.save();expect(db.samples.put).toHaveBeenCalledTimes(1);
 finish();await saving;expect(ui.sample).toBeNull();expect($('sampleDiscard').disabled).toBe(false);
});
it('aborts a stalled storage transaction instead of hanging forever',async()=>{
 vi.useFakeTimers();try{
  const {storeExample}=await import('../src/dice/camera/feedback.js');const abort=vi.fn();
  const db={samples:{put:()=>new Promise(()=>{})},transaction:(_mode,_table,fn)=>fn({abort})};
  const outcome=storeExample(db,{id:'slow'},100).catch(e=>e.message);
  await vi.advanceTimersByTimeAsync(100);expect(await outcome).toContain('did not respond');expect(abort).toHaveBeenCalledTimes(1);
 }finally{vi.useRealTimers();}
});
