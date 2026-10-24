import './camera-lab.css';
import Dexie from 'dexie';
import {InputCoordinator} from './input/coordinator.js';
import {validPolygon,HoldTracker,StabilityGate,assignSlots} from './camera/tracking.js';
import {createDemo} from './camera/demo.js';
import {TrayTracker} from './camera/tray-tracker.js';
import {sameOutline} from './camera/tray.js';
import {RecognitionFeedback} from './camera/feedback.js';
import {CameraSetup,cropRect} from './camera/setup.js';

document.title='Camera Dice Lab';
document.body.innerHTML=`<main class="camera-lab"><header><div><div class="eyebrow">PC + WEBCAM EXPERIMENT</div><h1>Camera Dice Lab <small class="build-label">Review lab v7.4</small></h1></div><a href="?">Back to game</a></header>
<p class="muted">Five light dice, dark pips, blue tray. Leave kept dice where they land. Experimental readings require confirmation; these test rolls do not change your game.</p>
<div id="notice" role="status" aria-live="polite">Loading local vision libraries…</div><div class="layout"><section>
<div class="panel"><div class="toolbar"><select id="cameras" aria-label="Camera"><option value="">Default USB camera</option></select><button id="start" disabled>Start webcam</button><button id="stop" disabled>Stop</button><button id="restartLab">Restart lab</button><button id="demo" disabled>Synthetic check</button><button id="demoRoll" hidden>Demo: keep 2, reroll 3</button><label>Replay video <input id="replay" type="file" accept="video/*"></label></div>
<section class="camera-monitor" aria-label="Webcam footage and detections"><h2>Webcam & live detections</h2><div class="detection-summary"><div class="detection-heading"><strong id="detectedCount">Recognition paused</strong><span id="unclearCount"></span></div><div id="detectedValues" class="detected-values" aria-label="Detected face values">No live readings</div><p id="detectionHint">Confirm the view and tray, then start recognition.</p><h2>3. Check dice recognition</h2><div class="toolbar"><button id="checkDice" class="primary" disabled>Start recognition check</button><button id="pauseDice" disabled>Pause recognition</button></div><div class="toolbar"><button id="hands" disabled>Enable hand / seat detection</button><label>Players sit <select id="axis"><option value="vertical">Top / bottom</option><option value="horizontal">Left / right</option></select></label></div><p id="actor">Approach: not enabled. Player 1 is top/left; Player 2 is bottom/right.</p><p id="handVisual" class="hand-visual">Hands: off · Player: unclear</p><label><input type="checkbox" id="trackTray" checked> Monitor tray position separately</label><button id="applyTray" hidden>Apply updated tray bounds</button><p id="trayTracking">Tray tracking waits for confirmed bounds.</p><p id="live">Camera stopped</p></div><div class="viewer"><video id="video" muted playsinline></video><canvas id="view" width="960" height="540" aria-label="Camera view. Click eight inside tray corners to calibrate."></canvas><div id="clickReview" hidden><img id="clickReviewImage" alt="Frozen roll. Click each die to confirm or correct it."><div id="clickReviewMarkers"></div><span class="frozen-badge">FROZEN ROLL — click each die</span></div><div id="trayReview" class="tray-review" hidden><strong id="trayReviewText">Does this outline follow the inside of your tray?</strong><button id="confirmArea" class="primary" disabled>Yes — use this shape</button><span>Dice can be detected anywhere inside the outline.</span></div></div>
</section>
<details id="setupDetails" open><summary>Camera & tray setup</summary><section id="cameraSetup" class="setup-step"></section>
<h2>2. Confirm the rolling area</h2><div class="toolbar"><button id="autoTray" disabled>Auto-detect blue tray</button><button id="calibrate" disabled>Mark 8 tray corners</button><button id="undo" disabled>Undo corner</button><button id="save">Save calibration</button><button id="load" disabled>Load calibration</button></div><p id="calibration" class="muted">Confirm the camera view first, then mark the flat inside floor clockwise.</p>
</details>
</div>
<div class="panel"><h2>Test recordings</h2><p class="muted">Recordings stay on this PC. Export a clip and labelled roll history to replay failures later.</p><div class="toolbar"><button id="record" disabled>Record clip</button><button id="snapshot" disabled>Save annotated still</button><button id="export">Export roll history</button><button id="exportSaved">Export all saved runs</button></div><p id="recording"></p><div class="toolbar"><button id="replayPlay" disabled>Play / pause replay</button><button id="restartReplay" disabled>Restart replay</button></div></div>
</section><aside><section id="recognitionFeedback" class="panel"></section><details class="panel" id="gameReview"><summary>Game turn test — held dice & engine input</summary><p>Arm before picking up dice. When five faces settle, correct the values below, check kept dice, and confirm the test roll. This lab does not change the game score.</p><h2>Test turn</h2><div class="toolbar"><label>Player <select id="player"><option value="A">Player A</option><option value="B">Player B</option></select></label><label>Limit <select id="limit"><option>3</option><option>4</option></select></label><button id="newturn">New turn</button></div><p id="turn"></p><button id="arm" class="primary" disabled>Arm next roll</button><button id="cancel">Cancel capture</button><p id="phase">Not armed</p>
<h2>Previous roll / kept dice</h2><canvas id="previous" width="480" height="270"></canvas><div id="holds" class="holds"></div><p class="muted">After capture, check the kept dice below. “?” means the camera could not establish the pickup history. All five must be rerolled on the first roll.</p>
<h2>Confirm or correct captured faces</h2><div id="faces" class="face-grid"></div><label><input type="checkbox" id="reviewed">I checked the faces and kept dice</label><p><button id="confirm" class="primary" disabled>Confirm test roll</button></p></details>
<details class="panel"><summary>Recognition settings</summary><p class="muted">Baseline for light, opaque dice only. Size is measured in the 960-pixel processing image. Adjust during physical testing.</p><div class="settings"><label>Dice brightness <input id="brightness" type="number" min="50" max="250" value="145"></label><label>Legacy pip threshold (v1 only) <input id="pipThreshold" type="number" min="10" max="180" value="85"></label><label>Minimum die width <input id="minSize" type="number" min="8" max="120" value="20"></label><label>Maximum die width <input id="maxSize" type="number" min="20" max="250" value="110"></label></div></details>
<div class="panel"><h2>Accepted test rolls</h2><div id="history" class="history"></div></div></aside></div></main>`;
const $=id=>document.getElementById(id),video=$('video'),view=$('view'),ctx=view.getContext('2d'),frame=document.createElement('canvas'),fctx=frame.getContext('2d',{willReadFrequently:true});
const db=new Dexie('YahtzeeCameraLab');db.version(1).stores({profiles:'id',runs:'id'});db.version(2).stores({profiles:'id',runs:'id',samples:'id,confirmedAt'});
const input=new InputCoordinator(),tracker=new HoldTracker(),gate=new StabilityGate();
let worker,ready=false,busy=false,stream=null,polygon=[],marking=false,calibrationId=null,sourceEpoch=0,frameId=0,requestEpoch=new Map(),armed=false,previousScene=[],turnRecords=[],turnId=crypto.randomUUID(),candidateScene=null,proposal=null,sequence=0,lastResult=null,lastSubmit=0,replayURL=null,recorder=null,recordChunks=[],recordingMime='',runId=crypto.randomUUID(),allRecords=[];
let profileResolution=null,demo=null,handWorker=null,handReady=false,handBusy=false,lastHands=[],lastHandTime=0;
const trayTracker=new TrayTracker();
let monitor=null,monitorReady=false,monitorBusy=false,monitorSent=0,monitorRequest=null,pendingTray=null;
let lastSample=null;
let areaConfirmed=false,recognitionEnabled=false,trayDetecting=false,trayStreak=0,trayPrevious=null;
const notice=t=>$('notice').textContent=t;
const cameraSetup=new CameraSetup($('cameraSetup'),{changed:()=>{
 trayDetecting=false;areaConfirmed=false;recognitionEnabled=false;polygon=[];calibrationId=null;marking=false;lastResult=null;cancel('View changed — confirm the view and tray again.');$('newturn').click();renderSetup();
},confirmed:()=>{notice('View confirmed. Use Auto-detect blue tray, or mark the 8 inside corners.');renderSetup();}});
const feedback=new RecognitionFeedback($('recognitionFeedback'),{db,showReview:(sample,labels,selected)=>{
 $('live').textContent=`Frozen review · ${sample.prediction.dice.length} readable dice · ${sample.prediction.rejected.length} unclassified objects`;
 $('clickReview').hidden=false;$('clickReviewImage').src=sample.image;
 const markers=[];
 const detections=[...sample.prediction.dice,...sample.prediction.rejected];
 const contains=(d,p)=>d.bounds&&p.x>=d.bounds[0]&&p.x<=d.bounds[0]+d.bounds[2]&&p.y>=d.bounds[1]&&p.y<=d.bounds[1]+d.bounds[3];
 const outline=(d,state,text,title)=>{
  const [x,y,w,h]=d.bounds??[Math.max(0,d.x-.012),Math.max(0,d.y-.021),.024,.042];
  const box=document.createElement('span');box.className='die-outline '+state;box.style.left=x*100+'%';box.style.top=y*100+'%';box.style.width=w*100+'%';box.style.height=h*100+'%';box.title=title;
  const badge=document.createElement('span');badge.textContent=text;box.append(badge);markers.push(box);
 };
 for(const d of detections){if(!d.bounds||labels.some(label=>contains(d,label))||selected&&contains(d,selected))continue;outline(d,'pending',String(d.value??'?'),'Unconfirmed prediction');}
 for(const [i,d] of labels.entries()){
  if(selected?.index===i)continue;
  const found=d;
  outline(found,'confirmed',String(d.value)+'✓',`Die ${i+1}: predicted ${d.predicted??'?'}, confirmed ${d.value}`);
 }
 if(selected)outline(selected,'selected',String(selected.predicted??'?'),`Selected die ${selected.index>=0?selected.index+1:labels.length+1}`);
 $('clickReviewMarkers').replaceChildren(...markers);
},hideReview:()=>{$('clickReview').hidden=true;$('clickReviewImage').removeAttribute('src');$('clickReviewMarkers').replaceChildren();worker?.postMessage({type:'reset'});renderDetections();},getSettings:settingsForFeedback,download:(...args)=>download(...args),getSample:()=>{
 if(!recognitionEnabled||!lastSample||Date.now()-lastSample.observedAt>2500)return null;
 const c=document.createElement('canvas');c.width=lastSample.width;c.height=lastSample.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(lastSample.pixels),c.width,c.height),0,0);
 return {id:crypto.randomUUID(),image:c.toDataURL('image/png'),observedAt:lastSample.observedAt,polygon:structuredClone(lastSample.polygon),settings:lastSample.settings,prediction:structuredClone(lastResult),source:demo?'synthetic':replayURL?'replay':'webcam',recognizerVersion:'opencv-pips-0.5'};
}});
$('clickReviewImage').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();feedback.selectPoint((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);};
function settingsForFeedback(){return settings();}
function renderDetections(){
 $('applyTray').disabled=armed||!!feedback.sample;
 feedback.update(recognitionEnabled&&!!lastResult&&!!lastSample);
 const r=feedback.session&&feedback.sample?feedback.sample.prediction:recognitionEnabled?lastResult:null;
 if(r)$('live').textContent=`${feedback.sample?'Frozen review':'Live'} · ${r.dice.length} readable dice · ${r.rejected.length} unclassified objects`;
 $('detectedCount').textContent=r?`${r.dice.length} / 5 dice readable`:recognitionEnabled?'Looking for dice…':'Recognition paused';
 $('unclearCount').textContent=r?.rejected.length?`${r.rejected.length} unclassified object${r.rejected.length===1?'':'s'} — not counted as dice`:'';
 const values=$('detectedValues');values.replaceChildren();
 if(r){
  for(const d of [...r.dice].sort((a,b)=>a.x-b.x||a.y-b.y)){
   const chip=document.createElement('span');chip.className=d.value?'detected-die':'detected-die unclear';chip.textContent=d.value??'?';chip.title=d.value?`Detected face: ${d.value}`:d.reason??'Unreadable object';values.append(chip);
  }
 }
 if(!values.childNodes.length)values.textContent=r?'No dice read yet':'No live readings';
 $('detectionHint').textContent=!r?(recognitionEnabled?'Waiting for the next camera reading.':'Confirm the view and tray, then start recognition.'):r.handInTray?'Hand in tray — waiting for a clear view.':r.moving?'Movement detected — readings are provisional.':r.rejected.length?[...new Set(r.rejected.map(d=>d.reason??'Unclear object'))].join(' · '):'Live face values, ordered left to right. Test rolls still require confirmation.';
}
function renderSetup(){
 if(!areaConfirmed){stopMonitor();$('trayTracking').textContent='Tray monitor waits for confirmed bounds.';}
 renderDetections();
 $('autoTray').disabled=!ready||!cameraSetup.locked||trayDetecting;
 $('calibrate').disabled=!cameraSetup.locked;$('load').disabled=!cameraSetup.locked;$('undo').disabled=!cameraSetup.locked||!polygon.length;
 $('confirmArea').disabled=!cameraSetup.locked||!validPolygon(polygon)||marking||areaConfirmed;
 $('trayReview').hidden=areaConfirmed||!cameraSetup.locked||!validPolygon(polygon)||marking;
 $('trayReviewText').textContent=areaConfirmed?'Tray confirmed — green area is the dice-detection boundary.':'Does this outline follow the inside of your tray?';
 $('confirmArea').textContent=areaConfirmed?'Shape confirmed':'Yes — use this shape';
 $('checkDice').disabled=!areaConfirmed||recognitionEnabled;$('pauseDice').disabled=!recognitionEnabled;renderTurn();
}
const settings=()=>Object.fromEntries(['brightness','pipThreshold','minSize','maxSize'].map(k=>[k,Number($(k).value)]));
const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);};
function renderTurn(){ $('turn').textContent=`Player ${$('player').value} · ${turnRecords.length} / ${$('limit').value} rolls`; $('arm').disabled=!ready||!recognitionEnabled||!areaConfirmed||!video.videoWidth||!validPolygon(polygon)||marking||armed||turnRecords.length>=Number($('limit').value);$('newturn').disabled=armed; }
function renderHolds(mask=Array(5).fill(null)){$('holds').innerHTML=Array.from({length:5},(_,i)=>`<label>Slot ${i+1}${previousScene[i]?` (${previousScene[i].value})`:''}<select data-hold="${i}" ${!previousScene.length?'disabled':''}><option value="?" ${mask[i]===null?'selected':''}>?</option><option value="yes" ${mask[i]===true?'selected':''}>Kept</option><option value="no" ${mask[i]===false?'selected':''}>Rolled</option></select></label>`).join('');}
$('faces').innerHTML=Array.from({length:5},(_,i)=>`<label>Slot ${i+1}<select data-face="${i}">${[1,2,3,4,5,6].map(v=>`<option>${v}</option>`).join('')}</select></label>`).join('');renderHolds(Array(5).fill(false));renderTurn();
function invalidate(reason){input.invalidate();candidateScene=null;$('confirm').disabled=true;$('reviewed').checked=false;gate.reset();if(reason)$('phase').textContent=reason;}
function cancel(reason='Capture cancelled'){sourceEpoch++;requestEpoch.clear();armed=false;invalidate(reason);tracker.reset(previousScene);renderTurn();}
function resetSource(){sourceEpoch++;requestEpoch.clear();busy=false;cancel('Input changed; arm a fresh capture.');input.start('camera');sequence=0;worker?.postMessage({type:'reset'});}
function startWorker(){worker=new Worker(new URL('./camera/worker.js',import.meta.url),{type:'module'});worker.onmessage=({data:r})=>{
 if(r.type==='ready'){ready=true;$('start').disabled=false;$('demo').disabled=false;$('hands').disabled=false;notice('Ready. Start the Logitech webcam, then mark the 8 inside tray corners.');renderTurn();return;}
 if(r.type==='error'){busy=false;trayDetecting=false;lastResult=null;renderSetup();invalidate('Vision error');notice(r.message);return;}
 if(r.type!=='result'&&r.type!=='tray-result')return;busy=false;const request=requestEpoch.get(r.id);requestEpoch.delete(r.id);if(request?.epoch!==sourceEpoch)return;if(Date.now()-request.observedAt>2000){invalidate('Processing too slow — capture again.');return;}
 if(r.type==='tray-result'){
  if(!trayDetecting)return;
  trayStreak=sameOutline(trayPrevious,r.proposal)?trayStreak+1:r.proposal?1:0;trayPrevious=r.proposal;polygon=r.proposal??[];
  $('calibration').textContent=r.reason;renderSetup();
  if(trayStreak>=4){trayDetecting=false;calibrationId=crypto.randomUUID();profileResolution=[video.videoWidth,video.videoHeight];notice('Tray outline proposed. Check every edge follows the flat felt, then choose Yes — use this shape on the preview. Use Mark 8 tray corners if it is wrong.');renderSetup();}
  return;
 }
 lastResult=r;lastSample=request;renderDetections();
 $('handVisual').textContent=feedback.session&&feedback.sample?'Frozen review — live hand readings resume after saving':!r.handEnabled?'Hands: off · Enable hand / seat detection below':r.handStale?'Hands: tracking delayed · Player: unclear':`Hands: ${r.hands?.length??0} · ${r.hands?.length&&r.actorHint!==null?'Player '+(r.actorHint+1)+' approach':'Player: unclear'} · advisory`;
 $('actor').textContent=r.handEnabled?`Approach: ${r.actorHint===null?'unclear':r.actorHint===0?'Player 1':'Player 2'} · advisory only`:'Approach detection is off';
 const blocked=r.moving||r.handInTray||r.rejected.length>0;
 if(armed){tracker.observe(r.dice,{moving:r.moving,occluded:r.handInTray||r.rejected.length>0});if(blocked||r.dice.length!==5){invalidate(r.handInTray?'Hand in tray — waiting':r.moving?'Movement — waiting':'Need five clear dice');return;}
  if(gate.update(r.dice,performance.now(),blocked)){
   if(!candidateScene){candidateScene=structuredClone(r.dice);proposal=tracker.proposal(candidateScene);renderHolds(proposal.mask);document.querySelectorAll('[data-face]').forEach((s,i)=>s.value=candidateScene[i].value);tryMap();$('reviewed').checked=false;}
   const dice=candidateScene;
   input.receive({version:1,source:input.source,sessionId:input.session,sequence:++sequence,captureId:input.captureId,context:input.context,kind:'candidate',observedAt:request.observedAt,dice,holdProposal:proposal,actorHint:r.actorHint,calibrationId,polygon:structuredClone(polygon),view:cameraSetup.fingerprint(),recognizerVersion:'opencv-pips-0.5',settings:settings(),mediaOrigin:demo?'synthetic':replayURL?'replay':'webcam'});
   $('phase').textContent='Settled candidate. Check kept dice and faces, then confirm.';$('confirm').disabled=false;
  }else{input.invalidate();candidateScene=null;$('confirm').disabled=true;$('reviewed').checked=false;$('phase').textContent='Waiting for a stable scene';}
 }
};worker.onerror=e=>{busy=false;ready=false;notice(`Vision worker failed: ${e.message}`);cancel();};worker.postMessage({type:'init',base:new URL(`${import.meta.env.BASE_URL}camera-assets/`,location.origin).href});}
function heldMask(){return [...document.querySelectorAll('[data-hold]')].map(s=>s.value==='?'?null:s.value==='yes');}
function tryMap(){if(!candidateScene)return;const mask=heldMask();if(mask.includes(null))return;try{const assigned=assignSlots(previousScene,candidateScene,mask);document.querySelectorAll('[data-face]').forEach((s,i)=>s.value=assigned[i].value);}catch(e){notice(e.message);}}
$('holds').addEventListener('change',()=>{tryMap();$('reviewed').checked=false;});$('faces').addEventListener('change',()=>$('reviewed').checked=false);
async function cameras(){const list=await navigator.mediaDevices.enumerateDevices();const current=$('cameras').value;$('cameras').replaceChildren(new Option('Default USB camera',''));list.filter(d=>d.kind==='videoinput').forEach(d=>$('cameras').append(new Option(d.label||'Camera',d.deviceId)));if([...$('cameras').options].some(o=>o.value===current))$('cameras').value=current;}
function stop(){stopMonitor();feedback.discard();if(recorder?.state==='recording')recorder.stop();demo?.stop();demo=null;$('demoRoll').hidden=true;stream?.getTracks().forEach(t=>t.stop());stream=null;video.pause();video.srcObject=null;if(replayURL){URL.revokeObjectURL(replayURL);replayURL=null;}video.removeAttribute('src');video.load();resetSource();polygon=[];calibrationId=null;profileResolution=null;marking=false;lastResult=null;trayDetecting=false;areaConfirmed=false;recognitionEnabled=false;cameraSetup.reset();ctx.clearRect(0,0,view.width,view.height);$('live').textContent='Camera stopped';notice('Stopped. Start the webcam or choose a replay.');$('start').disabled=!ready;$('stop').disabled=true;$('record').disabled=true;$('snapshot').disabled=true;$('replayPlay').disabled=true;$('restartReplay').disabled=true;$('newturn').click();renderSetup();}
$('demo').onclick=async()=>{stop();demo=createDemo();video.srcObject=demo.stream;await video.play();input.start('simulated');polygon=[[.08,.12],[.92,.12],[.96,.18],[.96,.82],[.92,.88],[.08,.88],[.04,.82],[.04,.18]];calibrationId='synthetic';profileResolution=[960,540];marking=false;cameraSetup.virtual=true;cameraSetup.locked=true;cameraSetup.renderLock();areaConfirmed=true;recognitionEnabled=true;$('newturn').click();$('demoRoll').hidden=false;$('stop').disabled=false;$('snapshot').disabled=false;notice('SYNTHETIC TEST: generated dice, not webcam readings. Arm, confirm the first roll, then arm and press Demo reroll.');renderSetup();};
$('demoRoll').onclick=()=>{if(!armed){notice('Arm next roll before running the demo pickup.');return;}demo?.reroll();};
$('start').onclick=async()=>{
 stop();const epoch=sourceEpoch;$('start').disabled=true;$('stop').disabled=false;notice('Requesting webcam access. Allow camera / zoom access in the browser prompt.');
 const timer=setTimeout(()=>{if(epoch===sourceEpoch&&!stream)notice('Still waiting for webcam permission. Check the browser prompt; if the in-app browser does not show one, open this address in Chrome or Edge.');},15000);
 try{
  const opened=await navigator.mediaDevices.getUserMedia({video:{deviceId:$('cameras').value?{exact:$('cameras').value}:undefined,width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30},zoom:true},audio:false});
  if(epoch!==sourceEpoch){opened.getTracks().forEach(t=>t.stop());return;}
  stream=opened;video.srcObject=stream;await video.play();if(epoch!==sourceEpoch)return;await cameras();const track=stream.getVideoTracks()[0];cameraSetup.bind(track);const actualDevice=track.getSettings().deviceId;if(actualDevice)$('cameras').value=actualDevice;track.addEventListener('ended',()=>{stop();notice('Webcam disconnected. Reconnect and start again.');});$('stop').disabled=false;$('record').disabled=false;$('snapshot').disabled=false;$('live').textContent=`Live preview · ${track.label||'webcam'} · ${video.videoWidth} × ${video.videoHeight} · recognition paused`;notice('Step 1: adjust zoom and focus below the preview. Confirm the view before marking the tray.');renderSetup();
 }catch(e){if(epoch===sourceEpoch)notice(`Cannot open webcam: ${e.message}`);}finally{clearTimeout(timer);$('start').disabled=!ready;}
};
$('restartLab').onclick=()=>{stop();worker?.terminate();handWorker?.terminate();location.reload();};
$('stop').onclick=stop;$('cameras').onchange=()=>{stop();notice('Camera selection changed. Start webcam and verify calibration.');polygon=[];calibrationId=null;};
$('autoTray').onclick=()=>{
 if(!ready||!cameraSetup.locked)return;
 cancel('Looking for the blue tray');areaConfirmed=false;recognitionEnabled=false;lastResult=null;polygon=[];marking=false;calibrationId=null;trayDetecting=true;trayStreak=0;trayPrevious=null;
 notice('Looking for a stable blue octagon. Keep the whole empty tray visible and your hands out. Amber outlines are unconfirmed.');renderSetup();
};
$('calibrate').onclick=()=>{if(!cameraSetup.locked)return;trayDetecting=false;areaConfirmed=false;recognitionEnabled=false;lastResult=null;cancel('Calibration in progress');polygon=[];marking=true;calibrationId=null;notice('Click the 8 inside floor corners in order, clockwise.');renderSetup();};
view.onclick=e=>{if(!marking&&feedback.session&&!feedback.sample&&!feedback.complete()){const r=view.getBoundingClientRect();feedback.freeze();feedback.selectPoint((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);return;}if(!marking)return;const r=view.getBoundingClientRect();polygon.push([(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]);$('calibration').textContent=`${polygon.length} / 8 corners`;if(polygon.length===8){if(validPolygon(polygon)){marking=false;calibrationId=crypto.randomUUID();profileResolution=[video.videoWidth,video.videoHeight];notice('Check the outline, then click Confirm tray area.');}else{polygon=[];notice('Corners must form a convex octagon. Please mark them in order again.');}}renderSetup();};
$('undo').onclick=()=>{trayDetecting=false;cancel();areaConfirmed=false;recognitionEnabled=false;lastResult=null;polygon.pop();marking=true;calibrationId=null;$('calibration').textContent=`${polygon.length} / 8 corners`;renderSetup();};
$('confirmArea').onclick=()=>{if(!cameraSetup.locked||marking||!validPolygon(polygon))return;cancel('Tray bounds confirmed');trayDetecting=false;calibrationId=crypto.randomUUID();profileResolution=[video.videoWidth,video.videoHeight];areaConfirmed=true;trayTracker.reset(polygon);if($('trackTray').checked)startMonitor();$('setupDetails').open=false;notice('Shape confirmed. Dice detection covers the entire green area. Add five separated dice anywhere inside it, then Start recognition check.');renderSetup();};
$('checkDice').onclick=()=>{if(!areaConfirmed)return;recognitionEnabled=true;worker.postMessage({type:'reset'});notice('Recognition check running. Inspect boxes and face values before arming a test roll.');renderSetup();};
$('trackTray').onchange=()=>{stopMonitor();if($('trackTray').checked&&areaConfirmed)startMonitor();$('trayTracking').textContent=$('trackTray').checked?'Tray monitor starting. Dice use confirmed bounds.':'Tray monitor off. Dice use confirmed bounds.';};
$('applyTray').onclick=()=>{
 if(!pendingTray||armed||feedback.sample)return;
 polygon=pendingTray;calibrationId=crypto.randomUUID();lastResult=null;lastSample=null;pendingTray=null;$('applyTray').hidden=true;$('newturn').click();trayTracker.reset(polygon);worker.postMessage({type:'reset'});$('trayTracking').textContent='Updated bounds applied. Dice recognition continues.';renderSetup();
};
function stopMonitor(){monitor?.terminate();monitor=null;monitorReady=false;monitorBusy=false;monitorRequest=null;pendingTray=null;$('applyTray').hidden=true;}
function startMonitor(){
 stopMonitor();trayTracker.reset(polygon);monitor=new Worker(new URL('./camera/worker.js',import.meta.url),{type:'module'});
 const instance=monitor;
 $('trayTracking').textContent='Tray monitor starting. Dice use confirmed bounds.';
 monitor.onmessage=({data:r})=>{
  if(monitor!==instance)return;
  if(r.type==='ready'){monitorReady=true;return;}
  monitorBusy=false;const request=monitorRequest;monitorRequest=null;
  if(r.type==='error'){stopMonitor();$('trayTracking').textContent='Tray monitor unavailable. Dice continue with confirmed bounds.';return;}
  if(r.type!=='tray-result'||!request||r.id!==request.id||request.epoch!==sourceEpoch||request.calibration!==calibrationId||Date.now()-request.at>2500)return;
  const tracking=trayTracker.update(r.proposal,r.candidates);
  if(tracking.state==='resynced'){pendingTray=tracking.polygon;$('applyTray').hidden=false;}
  $('applyTray').disabled=armed||!!feedback.sample;
  $('trayTracking').textContent=pendingTray?'Tray update ready (amber outline). Apply between rolls; current bounds stay fixed.':tracking.state==='locked'?'Tray monitor: position matches. Dice use confirmed bounds.':tracking.state==='moving'?'Tray monitor: checking possible movement. Dice use confirmed bounds.':'Tray monitor: cannot verify position. Check the outline or recalibrate; dice still use confirmed bounds.';
 };
 monitor.onerror=()=>{if(monitor!==instance)return;stopMonitor();$('trayTracking').textContent='Tray monitor failed. Dice continue with confirmed bounds.';};
 monitor.postMessage({type:'init',base:new URL(`${import.meta.env.BASE_URL}camera-assets/`,location.origin).href});
}
$('pauseDice').onclick=()=>{recognitionEnabled=false;lastResult=null;cancel('Recognition paused');$('live').textContent='Live preview · recognition paused';renderSetup();};
$('save').onclick=async()=>{try{if(!areaConfirmed||!validPolygon(polygon)||!video.videoWidth)throw Error('Confirm the view and tray first.');await db.profiles.put({id:'default',polygon,calibrationId,view:cameraSetup.fingerprint(),resolution:[video.videoWidth,video.videoHeight],camera:stream?.getVideoTracks()[0].getSettings().deviceId??'replay',settings:settings(),axis:$('axis').value});notice('Calibration saved on this PC.');}catch(e){notice(e.message);}};
$('load').onclick=async()=>{try{if(!cameraSetup.locked)throw Error('Confirm the camera view first.');const p=await db.profiles.get('default');if(!p)throw Error('No saved calibration.');if(!video.videoWidth||p.resolution[0]!==video.videoWidth||p.resolution[1]!==video.videoHeight)throw Error('Start a camera / replay at the saved resolution first.');const camera=stream?.getVideoTracks()[0].getSettings().deviceId;if(camera&&camera!==p.camera)throw Error('Saved profile belongs to another camera.');const current=cameraSetup.fingerprint();if(!p.view||JSON.stringify(p.view.crop)!==JSON.stringify(current.crop)||(camera&&p.view.camera.zoom!==current.camera.zoom))throw Error('Framing differs from this saved profile. Mark the tray again.');cancel();trayDetecting=false;areaConfirmed=false;recognitionEnabled=false;lastResult=null;polygon=p.polygon;calibrationId=p.calibrationId;profileResolution=p.resolution;marking=false;Object.entries(p.settings).forEach(([k,v])=>$(k).value=v);$('axis').value=p.axis;notice('Profile loaded. Verify the outline, then confirm the tray area.');renderSetup();}catch(e){notice(e.message);}};
$('hands').onclick=()=>{cancel();$('hands').disabled=true;notice('Loading hand model…');handWorker?.terminate();handReady=false;handBusy=false;lastHands=[];handWorker=new Worker(new URL('./camera/hand-worker.js',import.meta.url));handWorker.onmessage=({data:r})=>{handBusy=false;if(r.type==='ready'){handReady=true;notice('Hand tracking enabled. Approach hints do not select the active player.');}else if(r.type==='hands'&&r.epoch===sourceEpoch){lastHands=r.hands;lastHandTime=r.timestamp;}else if(r.type==='error'){handReady=false;$('hands').disabled=false;notice(`Hand tracking unavailable: ${r.message}`);cancel();}};handWorker.onerror=e=>{handReady=false;handBusy=false;$('hands').disabled=false;notice(`Hand tracking failed: ${e.message}`);cancel();};handWorker.postMessage({type:'init',base:new URL(`${import.meta.env.BASE_URL}camera-assets/`,location.origin).href});};
$('axis').onchange=()=>{cancel();worker.postMessage({type:'reset'});};document.querySelectorAll('.settings input').forEach(el=>el.onchange=()=>cancel('Settings changed — capture again.'));
$('newturn').onclick=()=>{cancel();turnId=crypto.randomUUID();turnRecords=[];previousScene=[];tracker.reset();renderHolds(Array(5).fill(false));$('previous').getContext('2d').clearRect(0,0,480,270);renderTurn();};
$('player').onchange=()=>{$('newturn').click();};$('limit').onchange=()=>{cancel();renderTurn();};
$('arm').onclick=()=>{sourceEpoch++;requestEpoch.clear();if(!input.session)input.start('camera');input.arm({gameId:runId,revision:allRecords.length,turnId,playerId:$('player').value});armed=true;invalidate('Armed — pick up and roll.');tracker.reset(previousScene);worker.postMessage({type:'reset'});renderHolds(previousScene.length?Array(5).fill(null):Array(5).fill(false));renderTurn();};$('cancel').onclick=()=>cancel();
$('confirm').onclick=async()=>{try{
 if(!$('reviewed').checked)throw Error('Check the faces and kept dice, then tick the confirmation box.');
 const mask=heldMask();if(mask.includes(null))throw Error('Resolve every ? in the kept-dice selection.');const values=[...document.querySelectorAll('[data-face]')].map(s=>Number(s.value));
 const assigned=assignSlots(previousScene,candidateScene,mask);const observation=structuredClone(input.pending);
 const record=input.accept({values,heldMask:mask,playerId:$('player').value,previous:turnRecords.at(-1),rollNumber:turnRecords.length+1,corrections:[{observedFaces:assigned.map(d=>d.value),confirmedFaces:values,proposedHolds:proposal.mask,confirmedHolds:mask,confirmedByUser:true}]});
 previousScene=assigned.map((d,i)=>({...d,value:values[i]}));record.scene=structuredClone(previousScene);record.actorEvidence={suggestedSeat:observation.actorHint,confirmedPlayerId:$('player').value};record.holdEvidence={method:proposal.method,confirmedByUser:true};turnRecords.push(record);allRecords.push(record);cancel('Roll saved. Arm before the next pickup.');
 const pc=$('previous'),pctx=pc.getContext('2d');pctx.drawImage(frame,0,0,pc.width,pc.height);previousScene.forEach((d,i)=>{pctx.fillStyle='#82ffe0';pctx.font='bold 18px system-ui';pctx.fillText(`${i+1}: ${d.value}`,d.x*pc.width,d.y*pc.height);});renderHolds(Array(5).fill(null));
 $('history').replaceChildren(...allRecords.slice().reverse().map(r=>{const a=document.createElement('article');a.textContent=`${r.playerId} · Roll ${r.rollNumber}: ${r.after.join(' · ')} | Kept ${r.heldValues.join(', ')||'none'} | Rerolled ${r.rolledValues.join(', ')}`;return a;}));
 await db.runs.put({id:runId,updatedAt:Date.now(),records:allRecords});notice('Test roll saved locally. Export history before sharing results.');
 }catch(e){notice(e.message);}};
$('export').onclick=()=>download(new Blob([JSON.stringify({version:1,runId,exportedAt:new Date().toISOString(),profile:{polygon,calibrationId,settings:settings()},records:allRecords},null,2)],{type:'application/json'}),'camera-dice-history.json');
$('exportSaved').onclick=async()=>{try{download(new Blob([JSON.stringify({version:1,runs:await db.runs.toArray()},null,2)],{type:'application/json'}),'camera-dice-saved-runs.json');}catch(e){notice(e.message);}};
$('snapshot').onclick=()=>view.toBlob(blob=>download(blob,'camera-dice-scene.png'));
$('record').onclick=()=>{if(recorder?.state==='recording'){recorder.stop();return;}try{recordChunks=[];recordingMime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';recorder=new MediaRecorder(stream,recordingMime?{mimeType:recordingMime}:{});recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data);};recorder.onstop=()=>{download(new Blob(recordChunks,{type:recorder.mimeType}),'camera-dice-test.webm');recordChunks=[];$('record').textContent='Record clip';$('recording').textContent='Clip downloaded.';};recorder.start(1000);$('record').textContent='Stop & download clip';$('recording').textContent='Recording camera only (no audio). Keep clips short.';}catch(e){notice(e.message);}};
$('replay').onchange=async e=>{const file=e.target.files[0];if(!file)return;stop();replayURL=URL.createObjectURL(file);video.src=replayURL;try{await video.play();cameraSetup.virtual=true;cameraSetup.bind(null);$('stop').disabled=false;$('snapshot').disabled=false;$('replayPlay').disabled=false;$('restartReplay').disabled=false;notice('Replay running. Confirm the view, mark the tray, then start recognition.');renderSetup();}catch(err){notice(err.message);}};
$('replayPlay').onclick=()=>{if(video.paused)video.play();else{video.pause();cancel('Replay paused — rearm when playing.');}};$('restartReplay').onclick=()=>{resetSource();video.currentTime=0;video.play();};
video.addEventListener('ended',()=>cancel('Replay ended.'));video.addEventListener('seeking',()=>cancel('Replay seek — capture again.'));
function draw(){requestAnimationFrame(draw);
 if(busy&&performance.now()-lastSubmit>8000){worker?.terminate();busy=false;ready=false;trayDetecting=false;recognitionEnabled=false;cancel('Vision stalled — restarting. Confirmed tray bounds are retained.');renderSetup();startWorker();}
if(!video.videoWidth||video.paused)return;const w=960,h=Math.round(w*video.videoHeight/video.videoWidth);if(frame.width!==w||frame.height!==h){frame.width=view.width=w;frame.height=view.height=h;}
 fctx.drawImage(video,...cropRect(video.videoWidth,video.videoHeight,cameraSetup.crop),0,0,w,h);ctx.drawImage(frame,0,0);if(polygon.length){ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));if(polygon.length===8)ctx.closePath();if(areaConfirmed){ctx.fillStyle='rgba(119,228,199,0.10)';ctx.fill();}ctx.strokeStyle=areaConfirmed?'#77e4c7':'#ffb479';ctx.lineWidth=3;ctx.stroke();polygon.forEach(([x,y],i)=>{ctx.fillStyle=areaConfirmed?'#77e4c7':'#ffb479';ctx.fillText(String(i+1),x*w+5,y*h-5);});}
 if(lastResult){for(const d of [...lastResult.dice,...lastResult.rejected]){ctx.strokeStyle=d.value?'#85ffd2':'#ffb479';ctx.strokeRect(d.bounds[0]*w,d.bounds[1]*h,d.bounds[2]*w,d.bounds[3]*h);ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 22px system-ui';ctx.fillText(d.value??'?',d.bounds[0]*w,d.bounds[1]*h-7);}for(const [hi,hand] of (lastResult.hands??[]).entries()){const wrist=hand[0];const seat=lastResult.handSeats?.[hi];ctx.font='bold 18px system-ui';ctx.fillStyle=seat===0?'#7fdbff':seat===1?'#ffcd80':'#edb4ff';ctx.fillText(seat===0?'Player 1':seat===1?'Player 2':'Hand — unclear',wrist.x*w,wrist.y*h-12);for(const p of hand){ctx.fillStyle='#edb4ff';ctx.beginPath();ctx.arc(p.x*w,p.y*h,5,0,7);ctx.fill();}}}
 if(profileResolution&&(profileResolution[0]!==video.videoWidth||profileResolution[1]!==video.videoHeight)){polygon=[];calibrationId=null;profileResolution=null;trayDetecting=false;areaConfirmed=false;recognitionEnabled=false;cameraSetup.locked=false;cameraSetup.renderLock();cancel('Resolution changed — confirm view and recalibrate.');renderSetup();}
 if(pendingTray){ctx.beginPath();pendingTray.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.closePath();ctx.strokeStyle='#ffb479';ctx.lineWidth=2;ctx.stroke();}
 if(monitorBusy&&performance.now()-monitorSent>5000){stopMonitor();$('trayTracking').textContent='Tray monitor timed out. Dice continue with confirmed bounds; toggle monitoring to retry.';}
 if(monitorReady&&!monitorBusy&&!pendingTray&&areaConfirmed&&recognitionEnabled&&!demo&&!marking&&!feedback.sample&&!armed&&!document.hidden&&performance.now()-monitorSent>1000){
  monitorBusy=true;monitorSent=performance.now();const id=++frameId;monitorRequest={id,epoch:sourceEpoch,calibration:calibrationId,at:Date.now()};const pixels=fctx.getImageData(0,0,w,h).data.buffer;monitor.postMessage({type:'tray',id,width:w,height:h,pixels},[pixels]);
 }
 if(ready&&(trayDetecting||(recognitionEnabled&&areaConfirmed&&validPolygon(polygon)))&&!busy&&!marking&&!document.hidden&&performance.now()-lastSubmit>100){busy=true;lastSubmit=performance.now();const id=++frameId;const pixels=fctx.getImageData(0,0,w,h).data.buffer;requestEpoch.set(id,{epoch:sourceEpoch,observedAt:Date.now(),width:w,height:h,pixels:trayDetecting?null:pixels.slice(0),polygon:structuredClone(polygon),settings:settings()});if(trayDetecting){worker.postMessage({type:'tray',id,width:w,height:h,pixels},[pixels]);return;}if(handReady&&!handBusy){handBusy=true;const copy=pixels.slice(0);handWorker.postMessage({type:'frame',epoch:sourceEpoch,width:w,height:h,pixels:copy,timestamp:performance.now()},[copy]);}worker.postMessage({type:'frame',id,width:w,height:h,pixels,polygon,settings:settings(),axis:$('axis').value,timestamp:performance.now(),hands:lastHands,handEnabled:handReady,handStale:handReady&&performance.now()-lastHandTime>1000},[pixels]);}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel('Tab hidden — rearm after returning.');if(recorder?.state==='recording')recorder.stop();}});window.addEventListener('pagehide',()=>{stream?.getTracks().forEach(t=>t.stop());demo?.stop();worker?.terminate();handWorker?.terminate();monitor?.terminate();});
startWorker();draw();
