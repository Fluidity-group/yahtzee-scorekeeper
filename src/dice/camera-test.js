// Diagnostic evidence only. No scoring, game command or credential dependencies.
export class DiceIdentificationSession {
 constructor(){this.samples=[];}
 record({prediction,actual,frame,notes='',reviews=[]}){
  if(!Array.isArray(actual)||actual.length>5||actual.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('Enter every actual face (1–6).');
  if(this.samples.length>=100)throw Error('Export these 100 tests, then clear the session.');
  const dice=prediction.dice||[],rejected=prediction.rejected||[],values=dice.map(d=>d.value);
  const remaining=[...actual];let matchedFaces=0;
  for(const value of values){const i=remaining.indexOf(value);if(i>=0){matchedFaces++;remaining.splice(i,1);}}
  const sample={recordedAt:new Date().toISOString(),frame:{sequence:frame.sequence,width:frame.width,height:frame.height,orientation:frame.orientation,source:frame.source||'c121-rtsp',simulated:frame.simulated===true},
   predicted:values,actual:[...actual],rejected:rejected.map(d=>({bounds:d.bounds,reason:d.reason})),dice:dice.map(d=>({value:d.value,bounds:d.bounds,x:d.x,y:d.y,evidence:d.evidence})),
   moving:!!prediction.moving,handDetectionAvailable:prediction.handEnabled===true,matchedFaces,
   exact:rejected.length===0&&values.length===actual.length&&matchedFaces===actual.length,notes:String(notes).slice(0,200),
   reviews:reviews.map(r=>({kind:r.kind,index:r.index,predicted:r.predicted,actual:r.actual}))};
  this.samples.push(sample);return sample;
 }
 export(){return {schemaVersion:2,purpose:'dice-identification-test-no-game-authority',readerVersion:'opencv-pips-0.5',comparison:'unordered face multiset; card reviews refer only to candidates in this frame',samples:structuredClone(this.samples)};}
}

export function createDiceIdentificationUI({box,canvas,context}){
 const session=new DiceIdentificationSession();let pending=null;
 const area=document.createElement('section');area.dataset.identificationTest='';
 area.innerHTML=`<h3>Check each picture</h3><p data-test-result aria-live="polite"></p>
 <p>These pictures come from the frozen frame above. Compare the top-face pips with the prediction, then confirm or choose the correct value.</p>
 <div data-test-faces class="identification-cards"></div>
 <button class="hbtn" data-test-add disabled>Add a missed die</button>
 <p data-test-empty hidden>No objects detected. If the tray is empty, record this test. Otherwise add each missed die.</p>
 <label>Test notes (optional)<input data-test-notes maxlength="200" placeholder="Blur, glare, touching dice"></label>
 <button class="hbtn" data-test-record>Record comparison</button><p data-test-summary role="status">No comparisons recorded.</p>
 <details><summary>Saved tests and export</summary><button class="hbtn" data-test-export>Export test results</button><button class="hbtn" data-test-clear>Clear test results</button>
 <p>Export before closing. Results stay in memory and JSON excludes pictures and camera credentials.</p>
 <textarea data-test-json aria-label="Test results JSON" readonly hidden rows="8" style="width:100%;box-sizing:border-box"></textarea></details>
 <details><summary>Capture guidance</summary><p>Remove hands and let dice settle. Hand detection is not enabled. Green boxes are readable dice; amber boxes are unclear objects. Pictures enlarge existing pixels; they cannot sharpen blurred pips.</p></details>`;
 box.querySelector('[data-timing]').before(area);
 const find=s=>area.querySelector(s),message=text=>{find('[data-test-summary]').textContent=text;};
 const update=()=>{find('[data-test-add]').disabled=!pending||find('[data-test-faces]').querySelectorAll('[data-kind="missed"]').length>=5;};
 const card=(die,kind,index)=>{
  const label=document.createElement('label');label.className='identification-card';label.dataset.kind=kind;label.dataset.index=index;
  const title=document.createElement('strong');title.textContent=kind==='missed'?`Missed die ${index+1}`:`Object ${index+1}`;label.append(title);
  if(kind!=='missed'){
   const crop=document.createElement('canvas');crop.width=crop.height=160;crop.setAttribute('role','img');crop.setAttribute('aria-label',`Captured picture of object ${index+1}`);
   const bounds=die.bounds;
   if(Array.isArray(bounds)&&bounds.length===4&&bounds.every(Number.isFinite)&&bounds[2]>0&&bounds[3]>0){
    // Add context without distorting the die; clamp to the original frame.
    const [x,y,w,h]=bounds,side=Math.max(w*canvas.width,h*canvas.height)*1.3;
    const sx=Math.max(0,x*canvas.width+(w*canvas.width-side)/2),sy=Math.max(0,y*canvas.height+(h*canvas.height-side)/2);
    const sw=Math.min(side,canvas.width-sx),sh=Math.min(side,canvas.height-sy);
    if(sw>0&&sh>0){const scale=160/Math.max(sw,sh);crop.getContext('2d').drawImage(canvas,sx,sy,sw,sh,(160-sw*scale)/2,(160-sh*scale)/2,sw*scale,sh*scale);label.append(crop);}
   }
   if(!label.contains(crop)){const unavailable=document.createElement('p');unavailable.textContent='Picture unavailable';label.append(unavailable);}
  }else{const missing=document.createElement('p');missing.textContent='No picture: reader missed this die.';label.append(missing);}
  const predicted=document.createElement('p');predicted.className='identification-prediction';predicted.textContent=kind==='readable'?`Prediction: ${die.value}`:kind==='unclear'?'Prediction: unclear':'Prediction: not detected';label.append(predicted);
  if(kind==='unclear'){const reason=document.createElement('small');reason.textContent=die.reason||'Could not read pips';label.append(reason);}
  const select=document.createElement('select');select.setAttribute('aria-label',kind==='missed'?`Actual face for missed die ${index+1}`:`Actual face for object ${index+1}`);
  select.append(new Option('Choose face…',''));for(let n=1;n<=6;n++)select.append(new Option(kind==='readable'&&n===die.value?`${n} — confirm`:String(n),String(n)));
  if(kind!=='missed')select.append(new Option('Not a die','not-die'));
  select.onchange=()=>{label.dataset.reviewed=String(!!select.value);update();};label.append(select);
  if(kind==='missed'){const remove=document.createElement('button');remove.type='button';remove.className='hbtn';remove.textContent='Remove';remove.onclick=()=>{label.remove();update();};label.append(remove);}
  return label;
 };
 find('[data-test-add]').onclick=()=>{if(!pending)return;const index=Number(find('[data-test-add]').dataset.next||0);find('[data-test-add]').dataset.next=index+1;find('[data-test-faces]').append(card({},'missed',index));update();};
 find('[data-test-record]').onclick=()=>{
  if(!pending)return;
  try{
   const reviews=[...find('[data-test-faces]').children].map(label=>{
    const choice=label.querySelector('select').value;if(!choice)throw Error('Choose the actual face or “Not a die” for every picture.');
    const kind=label.dataset.kind,index=Number(label.dataset.index);
    return {kind,index,predicted:kind==='readable'?pending.prediction.dice[index].value:null,actual:choice==='not-die'?null:Number(choice)};
   });
   const actual=reviews.filter(r=>r.actual!==null).map(r=>r.actual);
   const sample=session.record({...pending,actual,reviews,notes:find('[data-test-notes]').value});pending=null;find('[data-test-record]').disabled=true;update();
   find('[data-test-faces]').querySelectorAll('select,button').forEach(e=>e.disabled=true);
   message(`${sample.exact?'Exact face match':'Mismatch / unclear objects'}. ${session.samples.filter(s=>s.exact).length}/${session.samples.length} tests exact. ${sample.matchedFaces}/${sample.actual.length} actual faces matched (unordered).`);
  }catch(error){message(error.message);}
 };
 find('[data-test-export]').onclick=()=>{find('[data-test-json]').value=JSON.stringify(session.export(),null,2);find('[data-test-json]').hidden=false;const url=URL.createObjectURL(new Blob([JSON.stringify(session.export(),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='dice-identification-tests.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 find('[data-test-clear]').onclick=()=>{session.samples=[];find('[data-test-json]').value='';find('[data-test-json]').hidden=true;message('Test comparisons cleared.');};
 const invalidate=()=>{pending=null;find('[data-test-faces]').replaceChildren();find('[data-test-empty]').hidden=true;find('[data-test-result]').textContent='No current test frame. Capture after calibration.';find('[data-test-record]').disabled=true;update();};
 invalidate();
 return {invalidate,show(prediction,frame){
  pending={prediction:structuredClone(prediction),frame};area.hidden=false;find('[data-test-record]').disabled=false;find('[data-test-notes]').value='';find('[data-test-add]').dataset.next=0;
  const readable=prediction.dice||[],unclear=prediction.rejected||[];
  // All crops must be made before drawing any overlays on the source canvas.
  find('[data-test-faces]').replaceChildren(...readable.map((die,i)=>card(die,'readable',i)),...unclear.map((die,i)=>card(die,'unclear',i+readable.length)));
  find('[data-test-empty]').hidden=readable.length+unclear.length!==0;update();
  find('[data-test-result]').textContent=`${readable.length} readable dice · ${unclear.length} unclear objects.${prediction.moving?' Motion flagged between test frames.':''}`;
  [...readable,...unclear].forEach((die,i)=>{if(!Array.isArray(die.bounds)||die.bounds.length!==4)return;const [x,y,w,h]=die.bounds;context.strokeStyle=i<readable.length?'#41e8a6':'#ffbd59';context.lineWidth=Math.max(2,canvas.width/250);context.strokeRect(x*canvas.width,y*canvas.height,w*canvas.width,h*canvas.height);context.fillStyle=context.strokeStyle;context.font=`${Math.max(18,canvas.width/40)}px sans-serif`;context.fillText(`${i+1}: ${i<readable.length?die.value:'?'}`,x*canvas.width,Math.max(24,y*canvas.height-5));});
 },getResults:()=>session.export()};
}


