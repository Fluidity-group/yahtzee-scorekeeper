export function exactRoll(predicted,actual,rejected=0){
 return rejected===0&&predicted.length===5&&actual.length===5&&[...predicted].sort().join(',')===[...actual].sort().join(',');
}

export async function storeExample(db,sample,timeoutMs=8000){
 let transaction,expired=false,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;transaction?.abort();reject(Error('Browser storage did not respond. Close other Camera Dice Lab tabs, then retry. Your reviewed roll is still here.'));},timeoutMs);});
 try{
  const write=db.transaction?db.transaction('rw',db.samples,async tx=>{transaction=tx;if(expired)throw Error('Save cancelled after timeout');await db.samples.put(sample);}):db.samples.put(sample);
  await Promise.race([write,timeout]);
 }finally{clearTimeout(timer);}
}

export class RecognitionFeedback {
 constructor(root,{db,getSample,getSettings,download,showReview=()=>{},hideReview=()=>{}}){
  this.showReview=showReview;this.hideReview=hideReview;this.session=null;this.labels=[];this.db=db;this.getSample=getSample;this.getSettings=getSettings;this.download=download;
  root.innerHTML=`<h2>Review every roll</h2><div class="toolbar"><button id="startGame" class="primary">Start full-game session (unlimited)</button><button id="startTen">Start a 10-roll session</button><button id="finishSession" disabled>Finish & export session</button></div><strong id="sessionProgress">No session started</strong><p>Start a session, roll, then click the first die on the webcam image to freeze it. Confirm all five dice, including kept dice left in the tray. Save each roll and continue for as long as you play. Finish and export when the game ends. This records recognition examples; score the game separately.</p>
  <button id="freezeReading" class="primary" disabled>Freeze this roll & review</button>
  <div id="diePicker" hidden><p id="diePrompt"></p><div class="toolbar">${[1,2,3,4,5,6].map(v=>`<button data-die-value="${v}">${v}</button>`).join('')}</div><button id="removeLabel">Remove this label</button></div><div id="sampleReview" hidden><img id="sampleImage" alt="Frozen camera frame for checking the dice"><p id="samplePrediction"></p>
  <button id="sampleCorrect">All five correct — save & continue</button>
  <p id="legacyInstructions">Or enter the actual five values below (any order), including dice the camera missed.</p>
  <div id="sampleFaces" class="face-grid">${Array.from({length:5},(_,i)=>`<label>Die ${i+1}<select data-label-face="${i}"><option value="">?</option>${[1,2,3,4,5,6].map(v=>`<option>${v}</option>`).join('')}</select></label>`).join('')}</div>
  <label>Who rolled? <select id="actualActor"><option value="">Not recorded</option><option value="0">Player 1 (top/left)</option><option value="1">Player 2 (bottom/right)</option></select></label><p id="reviewProgress" role="status"></p><div class="toolbar"><button id="sampleSave" class="primary">Save confirmed values</button><button id="sampleDiscard">Discard / return to live</button><button id="sampleBackup">Download this reviewed roll</button></div></div>
  <p id="sampleStatus" role="status">No example selected. Images and labels stay on this PC.</p>
  <details><summary>Accuracy tests & saved examples</summary><p>Save good and failed readings. Re-test runs the current detector on the same saved images. Results describe this selected collection, not general accuracy. No automatic training occurs.</p>
  <div class="toolbar"><button id="sampleRetest">Re-test saved examples</button><button id="sampleExport">Export labelled examples</button></div><p id="sampleScore"></p></details>`;
  this.$=id=>root.querySelector('#'+id);
  this.$('startTen').onclick=()=>this.startSession(10);
  this.$('startGame').onclick=()=>this.startSession(null);
  this.$('finishSession').onclick=()=>this.finishSession();
  root.querySelectorAll('[data-die-value]').forEach(b=>b.onclick=()=>this.choose(Number(b.dataset.dieValue)));
  this.$('removeLabel').onclick=()=>{if(this.selected?.index>=0)this.labels.splice(this.selected.index,1);this.selected=null;this.$('diePicker').hidden=true;this.paint();};
  this.$('freezeReading').onclick=()=>this.freeze();
  this.$('sampleDiscard').onclick=()=>{if(this.saving)return;this.discard();this.status('Review discarded. Roll count unchanged.');};
  this.$('sampleCorrect').onclick=()=>{if(!this.sample||this.saving)return;const dice=this.sample.prediction.dice;if(dice.length!==5||this.sample.prediction.rejected.length)return;if(this.session){this.labels=dice.map(d=>({x:d.x,y:d.y,predicted:d.value,value:d.value,bounds:d.bounds}));this.paint();}this.fill(dice.map(d=>d.value));this.save();};
  this.$('sampleSave').onclick=()=>this.save();
  this.$('sampleBackup').onclick=()=>{try{const sample=this.reviewedSample();this.download(new Blob([JSON.stringify({version:1,samples:[sample]},null,2)],{type:'application/json'}),'camera-reviewed-roll.json');this.status('Reviewed roll downloaded. You can retry local saving or discard to continue.');}catch(e){this.status(e.message);}};
  this.$('sampleExport').onclick=async()=>{try{const samples=await db.samples.toArray();download(new Blob([JSON.stringify({version:1,samples},null,2)],{type:'application/json'}),'camera-labelled-examples.json');}catch(e){this.status(e.message);}};
  this.$('sampleRetest').onclick=()=>this.retest();
 }
 status(s){this.$('sampleStatus').textContent=s;this.$('reviewProgress').textContent=s;}
 complete(){return !!this.session&&(this.session.ended||this.session.limit!==null&&this.session.count>=this.session.limit);}
 startSession(limit){if(this.saving||this.sample||this.session&&!this.complete())return;this.session={id:crypto.randomUUID(),count:0,limit,ended:false};this.discard();this.progress();this.update(this.available);}
 progress(){const s=this.session;if(!s)return;this.$('sessionProgress').textContent=this.complete()?`${s.count}${s.limit?' / '+s.limit:''} rolls complete — export or re-test your examples.`:`Roll ${s.count+1}${s.limit?' of '+s.limit:' · full-game session'} — roll, wait for dice to settle, then freeze.`;}
 async finishSession(){
  if(!this.session||this.sample||this.saving)return;
  this.saving=true;this.update(this.available);
  try{const samples=(await this.db.samples.toArray()).filter(s=>s.sessionId===this.session.id);if(!samples.length){this.status('Save at least one roll before exporting.');return;}
   this.download(new Blob([JSON.stringify({version:1,samples},null,2)],{type:'application/json'}),'camera-game-session.json');this.session.ended=true;this.progress();this.status(`Session finished. ${samples.length} rolls exported; saved examples remain on this PC.`);
  }catch(e){this.status(`Could not export: ${e.message}. Retry Finish & export session.`);}finally{this.saving=false;this.update(this.available);}
 }
 update(available){this.available=available;this.$('freezeReading').disabled=!available||!!this.saving||!!this.sample||this.complete();this.$('finishSession').disabled=!this.session||!this.session.count||!!this.sample||!!this.saving;for(const id of ['startTen','startGame'])this.$(id).disabled=!!this.saving||!!this.sample||!!this.session&&!this.complete();}
 fill(values){this.$('sampleFaces').querySelectorAll('select').forEach((s,i)=>s.value=values[i]??'');}
 discard(){this.sample=null;this.labels=[];this.selected=null;this.hideReview();this.$('sampleReview').hidden=true;this.$('diePicker').hidden=true;}
 paint(){this.showReview(this.sample,this.labels,this.selected);this.$('sampleSave').disabled=!!this.saving||!!this.session&&this.labels.length!==5;this.update(this.available);}
 selectPoint(x,y){
 if(!this.session||!this.sample||this.saving)return;
 const contains=d=>d.bounds?x>=d.bounds[0]&&x<=d.bounds[0]+d.bounds[2]&&y>=d.bounds[1]&&y<=d.bounds[1]+d.bounds[3]:Math.hypot(d.x-x,d.y-y)<.012;
 const index=this.labels.findIndex(contains);
 if(index<0&&this.labels.length>=5){this.status('Five dice labelled. Click a marker to change it, or save this roll.');return;}
 // Rejected regions may contain several touching dice. Label the clicked
 // position rather than assigning the whole cluster to a single die.
 const candidates=this.sample.prediction.dice;
 const predicted=candidates.find(d=>d.bounds&&x>=d.bounds[0]&&x<=d.bounds[0]+d.bounds[2]&&y>=d.bounds[1]&&y<=d.bounds[1]+d.bounds[3]);
 this.selected=index>=0?{...this.labels[index],index}:{x,y,bounds:predicted?.bounds,predicted:predicted?.value??null,index:-1};
 this.$('diePicker').hidden=false;this.$('diePrompt').textContent=`Die ${index>=0?index+1:this.labels.length+1}: predicted ${this.selected.predicted??'?'}. Click its actual value to confirm or correct.`;
 this.$('removeLabel').disabled=index<0;this.paint();
 }
 choose(value){if(!this.selected||this.saving)return;const {index,...label}=this.selected;label.value=value;if(index<0)this.labels.push(label);else this.labels[index]=label;this.selected=null;this.$('diePicker').hidden=true;this.fill(this.labels.map(d=>d.value));this.paint();this.status(`${this.labels.length} / 5 dice confirmed. ${this.labels.length===5?'Save this roll, then roll again.':'Click the next die in the frozen webcam image.'}`);}
 freeze(){
  const sample=this.getSample();if(!sample){this.status('Wait for a fresh camera reading first.');return;}
  if(this.saving||this.complete())return;this.labels=[];this.selected=null;this.$('diePicker').hidden=true;
  this.$('actualActor').value='';this.sample=sample;this.$('sampleReview').hidden=false;this.$('sampleImage').src=sample.image;
  const values=sample.prediction.dice.map(d=>d.value),rejected=sample.prediction.rejected.length;
  this.$('samplePrediction').textContent=`Frozen prediction: ${values.join(' · ')||'none'} | ${values.length} readable, ${rejected} unclear objects`;
  this.$('sampleCorrect').disabled=values.length!==5||rejected>0;
  this.fill([]);this.$('legacyInstructions').hidden=!!this.session;this.$('sampleCorrect').hidden=false;this.$('sampleFaces').hidden=!!this.session;this.$('sampleImage').hidden=!!this.session;this.$('sampleSave').textContent=this.session?'Save roll & continue':'Save confirmed values';if(this.session){this.paint();this.status('0 / 5 dice confirmed. If all predictions are right, click All five correct — save & continue. Otherwise click each die and choose its value.');return;}this.status('Review the frozen image. Confirm all correct, or enter the actual five values and save.');
 }
 reviewedSample(){
  if(!this.sample)throw Error('Freeze a roll first.');
  if(this.session&&this.labels.length!==5)throw Error('Click and confirm all five dice before saving.');
  const actual=this.session?this.labels.map(d=>d.value):[...this.$('sampleFaces').querySelectorAll('select')].map(s=>Number(s.value));
  if(actual.length!==5||actual.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('Choose a value for all five dice.');
  return {...this.sample,actual,confirmedActor:this.$('actualActor').value===''?null:Number(this.$('actualActor').value),confirmedAt:Date.now(),labelType:this.session?'position-labelled-five-dice':'unordered-five-dice',...(this.session?{sessionId:this.session.id,sessionRoll:this.session.count+1,dieLabels:structuredClone(this.labels)}:{}),exactMatch:exactRoll(this.sample.prediction.dice.map(d=>d.value),actual,this.sample.prediction.rejected.length)};
 }
 async save(){
  if(!this.sample||this.saving)return;
  let sample;try{sample=this.reviewedSample();}catch(e){this.status(e.message);return;}
  const session=this.session;
  this.saving=true;this.update(this.available);
  for(const id of ['sampleSave','sampleCorrect','sampleDiscard','startTen'])this.$(id).disabled=true;
  this.$('sampleSave').textContent='Saving roll…';this.status('Saving image and confirmed values on this PC…');
  try{
   await storeExample(this.db,sample);
   // A camera/source reset may have discarded the old review during the save.
   if(this.sample?.id===sample.id)this.discard();
   if(session&&this.session===session){session.count++;this.progress();}
   this.status(`Roll saved. Live view resumed. ${sample.actual.join(' · ')}. ${sample.exactMatch?'Prediction matched.':'Correction recorded.'}`);
  }catch(e){this.status(`Could not save: ${e.message} Retry Save, or Download this reviewed roll to keep a backup.`);}
  finally{
   this.saving=false;for(const id of ['sampleSave','sampleDiscard','startTen'])this.$(id).disabled=false;
   this.$('sampleCorrect').disabled=!this.sample||this.sample.prediction.dice.length!==5||this.sample.prediction.rejected.length>0;
   this.$('sampleSave').textContent=this.session?'Save roll & continue':'Save confirmed values';this.$('sampleSave').disabled=!!this.session&&this.labels.length!==5;this.update(this.available);
  }
 }
 async retest(){
  this.$('sampleRetest').disabled=true;let worker;
  try{
   const samples=await this.db.samples.toArray();if(!samples.length){this.status('Save labelled examples first.');return;}
   const settings=this.getSettings();worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
   const request=m=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Accuracy test timed out.')),30000);
    worker.onmessage=({data:r})=>{clearTimeout(timer);r.type==='error'?reject(Error(r.message)):resolve(r);};
    worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.postMessage(m);
   });
   await request({type:'init',base:new URL(`${import.meta.env.BASE_URL}camera-assets/`,location.origin).href});
   let matched=0,baseline=0;const results=[];
   for(const sample of samples){
    const image=new Image();image.src=sample.image;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const c=canvas.getContext('2d');c.drawImage(image,0,0);
    const result=await request({type:'evaluate',pixels:c.getImageData(0,0,canvas.width,canvas.height).data.buffer,width:canvas.width,height:canvas.height,polygon:sample.polygon,settings});
    const match=exactRoll(result.dice.map(d=>d.value),sample.actual,result.rejected.length);matched+=Number(match);baseline+=Number(sample.exactMatch);results.push({id:sample.id,match,predicted:result.dice.map(d=>d.value),actual:sample.actual});
    this.$('sampleScore').textContent=`Testing ${results.length} / ${samples.length}…`;
   }
   this.$('sampleScore').textContent=`Exact five-dice matches: ${matched} / ${samples.length} (${Math.round(100*matched/samples.length)}%). Original readings: ${baseline} / ${samples.length}. Includes all saved sources; export shows webcam / replay / synthetic labels.`;
   this.lastReport={at:Date.now(),settings,results};
  }catch(e){this.status(`Accuracy test failed: ${e.message}`);}finally{worker?.terminate();this.$('sampleRetest').disabled=false;}
 }
}
