import {createNativeCameraTransport} from './input/native-camera.js';
import {CameraRecognition} from './input/camera-recognition.js';
import {CameraTiming,loadCameraImage} from './input/camera-timing.js';
import {CameraGame} from './camera-game.js';
import {sameCameraScene} from './camera-scene-guard.js';
import {validPolygon} from './camera/tracking.js';
import './camera-panel.css';
import {createDiceIdentificationUI} from './camera-test.js';

let sharedTransport=null,savedCalibration=null;
const defaultTransport=()=>sharedTransport??=createNativeCameraTransport();
export async function disconnectCamera(){savedCalibration=null;await sharedTransport?.disconnect();}
export const openDiceIdentificationTest=options=>openCameraGame({...options,diagnostic:true,getGame:()=>null});

// Local camera review: the caller remains responsible for persisting its game command.
export async function openCameraGame({getGame,commit,autoCapture=false,diagnostic=false,transport=defaultTransport(),readerFactory=options=>new CameraRecognition(options),loadImage}){
 if(!transport.supported())throw Error('C121 capture requires the Android app. Manual scoring remains available.');
 const box=document.createElement('dialog');box.className='core-dialog camera-game-dialog';
 box.innerHTML='<button class="sheet-close" data-close aria-label="Close camera">×</button><h2>Camera dice</h2><p>Connect on the same Wi-Fi. Camera readings need your confirmation.</p><button class="hbtn" data-configure>Set camera connection</button><select data-profiles aria-label="Saved camera"></select><button class="hbtn" data-connect>Connect</button><button class="hbtn" data-disconnect>Disconnect</button><button class="hbtn" data-remove>Remove connection</button><div data-preview style="width:100%;height:auto;aspect-ratio:16 / 9;background:#10212d;border-radius:12px;margin:12px 0" aria-label="Live camera preview"></div><canvas data-view hidden style="width:100%;height:auto" aria-label="Frozen tray. Mark eight inside corners clockwise."></canvas><button class="hbtn" data-calibrate>Calibrate tray</button><button class="hbtn" data-use-area hidden>Confirm tray outline</button><button class="hbtn" data-capture disabled>Capture settled roll</button><div data-review hidden><p>Check all five faces. Kept slots must match your previous roll; camera positions are not physical die identities.</p><div data-values class="core-dice"></div><button class="bigbtn score core-primary" data-confirm>Confirm roll</button></div><details data-timing><summary>Local timing diagnostics</summary><p>Stage durations only; no sensor latency measurement. Last 64 samples, cleared when this panel closes.</p><pre data-timing-values>No completed measurements.</pre></details><p data-status role="status" aria-live="polite">Camera disconnected.</p>';
 document.body.append(box);box.showModal();
 const find=s=>box.querySelector(s),status=text=>{find('[data-status]').textContent=text;};
 const calibrationTools=document.createElement('div');calibrationTools.dataset.calibrationTools='';calibrationTools.hidden=true;
 const useArea=find('[data-use-area]');useArea.before(calibrationTools);
 calibrationTools.innerHTML='<button class="hbtn" data-undo-point>Undo point</button><button class="hbtn" data-clear-points>Start outline again</button><button class="hbtn" data-cancel-calibration>Back to camera</button>';
 calibrationTools.append(useArea);
 const timing=new CameraTiming({onChange:samples=>{
  const latest=new Map();for(const sample of samples)latest.set(`${sample.clock}:${sample.stage}`,sample);
  find('[data-timing-values]').textContent=[...latest.values()].map(sample=>`${sample.clock} / ${sample.stage}: ${sample.capped?'>= ':''}${sample.durationMs.toFixed(1)} ms${sample.capped?' (capped)':''}`).join('\n');
 }});
 const adapter=new CameraGame(),canvas=find('[data-view]'),context=canvas.getContext('2d'),preview=find('[data-preview]');
 const testUI=diagnostic?createDiceIdentificationUI({box,canvas,context}):null;
 const canCapture=()=>diagnostic||getGame()?.turn?.source==='camera';
 if(diagnostic){box.classList.add('camera-identification-dialog');canvas.setAttribute('aria-label','Frozen test frame with numbered objects');find('h2').textContent='Dice identification test';find('h2+p').textContent='Camera test only. No game is needed; these tests never record a game roll or score.';find('[data-capture]').textContent='Test dice identification';find('[data-review]').remove();}
 let reader=null,closed=false,operation=0,frame=null,reviewImage=null,calibrationImage=null,polygon=[],calibrationId=null,calibrationView=null,marking=false,listener=null,connection=null,submitting=false;
 const stopMarking=()=>{marking=false;calibrationImage=null;box.classList.remove('camera-calibrating');calibrationTools.hidden=true;};
 const release=async()=>{const old=frame;frame=null;if(old)await transport.releaseFrame(old.frameId).catch(()=>{});};
 const invalidate=reason=>{operation++;adapter.invalidate();testUI?.invalidate();if(!diagnostic){find('[data-review]').hidden=true;find('[data-confirm]').disabled=true;}status(reason);};
 const rect=async visible=>{
  const r=preview.getBoundingClientRect(),dialog=box.getBoundingClientRect();
  const left=dialog.left+box.clientLeft,top=dialog.top+box.clientTop;
  // Native preview is a WebView sibling: it does not inherit the scrolling
  // dialog's clipping. Hide partial views without resizing the decoded image.
  visible=visible&&!preview.hidden&&r.width>0&&r.height>0&&r.top>=0&&r.left>=0&&r.bottom<=window.innerHeight&&r.right<=window.innerWidth
   &&r.left>=left&&r.top>=top&&r.right<=left+box.clientWidth&&r.bottom<=top+box.clientHeight;
  await transport.setPreviewRect({visible,left:r.left,top:r.top,width:r.width,height:r.height}).catch(()=>{});
 };
 const reposition=()=>{if(!closed&&!preview.hidden)void rect(true);};
 const validStreamSize=s=>s?.state==='live'&&Number.isInteger(s.streamWidth)&&Number.isInteger(s.streamHeight)
  &&s.streamWidth>0&&s.streamHeight>0&&s.streamWidth<=4096&&s.streamHeight<=4096;
 const previewSize=s=>{
  const valid=validStreamSize(s);
  preview.style.aspectRatio=valid?`${s.streamWidth} / ${s.streamHeight}`:'16 / 9';
  preview.style.height='auto';reposition();
 };
 const showLive=async()=>{stopMarking();canvas.hidden=true;preview.hidden=false;await rect(true);};
 const showFrozen=async()=>{preview.hidden=true;await rect(false);canvas.hidden=false;};
 const cameraStatus=(s,{initial=false}={})=>{
  if(closed)return;
  const changedSize=validStreamSize(s)&&validStreamSize(connection)
   &&(s.streamWidth!==connection.streamWidth||s.streamHeight!==connection.streamHeight);
  const changedConnection=s.state!=='live'||connection&&s.sessionId!==connection.sessionId;
  if(changedSize||changedConnection){
   invalidate(changedSize?'Camera view changed. Calibrate the tray again.':`Camera ${s.state}. A fresh capture is required.`);
   calibrationId=null;calibrationView=null;savedCalibration=null;reviewImage=null;stopMarking();
   find('[data-capture]').disabled=true;find('[data-use-area]').hidden=true;canvas.hidden=true;preview.hidden=false;
  }else if(s.state==='live'&&(initial||connection?.state!=='live'))status('Camera live. Calibrate the tray before capture.');
  connection=s;previewSize(s);
 };
 const profiles=async()=>{const result=await transport.listProfiles();const list=Array.isArray(result)?result:result.profiles||[];find('[data-profiles]').replaceChildren(...list.map(p=>new Option(p.name||p.host||'Local camera',p.profileId||p.cameraId)));};
 const snapshot=async()=>{
  await release();const token=operation;const next=await transport.acquireLatestFrame({maxWidth:1920,maxAgeMs:1500,calibrationId:calibrationId||'unconfirmed'});
  if(closed||token!==operation){await transport.releaseFrame(next.frameId).catch(()=>{});throw Error('Camera capture changed.');}
  frame=next;timing.native(next.timingDiagnostics);const imageLoadStarted=performance.now();
  const image=loadImage?await loadImage(next.url):await loadCameraImage(next.url,{timing});
  if(loadImage)timing.record('bridgeImageLoadMs',performance.now()-imageLoadStarted);
  try{
   if(closed||token!==operation)throw Error('Camera capture changed.');
   canvas.width=next.width;canvas.height=next.height;canvas.style.setProperty('--camera-frame-ratio',next.width/next.height);context.drawImage(image,0,0,next.width,next.height);
  }finally{image.close?.();}
  return {frame:next,image:context.getImageData(0,0,next.width,next.height)};
 };
 const drawPolygon=()=>{context.strokeStyle='#41e8a6';context.lineWidth=Math.max(2,canvas.width/250);context.beginPath();polygon.forEach(([x,y],i)=>i?context.lineTo(x*canvas.width,y*canvas.height):context.moveTo(x*canvas.width,y*canvas.height));if(polygon.length===8)context.closePath();context.stroke();};
 const redrawCalibration=()=>{if(calibrationImage)context.putImageData(calibrationImage,0,0);drawPolygon();find('[data-undo-point]').disabled=polygon.length===0;find('[data-clear-points]').disabled=polygon.length===0;useArea.disabled=polygon.length!==8||!validPolygon(polygon);};
 const reviewValues=()=>({values:[...find('[data-values]').querySelectorAll('select')].map(e=>Number(e.value)),heldMask:[...find('[data-values]').querySelectorAll('input')].map(e=>e.checked)});
 const act=fn=>async()=>{try{await fn();}catch(error){if(!closed)status(error.message||'Camera operation failed.');}};
 find('[data-configure]').onclick=act(async()=>{invalidate('Connection changed. Reconnect and calibrate again.');calibrationId=null;find('[data-capture]').disabled=true;const profile=await transport.configureProfile({profileId:find('[data-profiles]').value||undefined});await profiles();find('[data-profiles]').value=profile.profileId;});
 find('[data-connect]').onclick=act(async()=>{invalidate('Connecting…');previewSize({state:'connecting'});calibrationId=null;find('[data-capture]').disabled=true;await showLive();await transport.connect({profileId:find('[data-profiles]').value});await rect(true);});
 find('[data-disconnect]').onclick=act(async()=>{invalidate('Camera disconnected.');find('[data-capture]').disabled=true;await release();await transport.disconnect();});
 find('[data-remove]').onclick=act(async()=>{invalidate('Camera connection removed.');await transport.disconnect();await transport.removeProfile(find('[data-profiles]').value);await profiles();});
 find('[data-calibrate]').onclick=act(async()=>{
  invalidate('Mark the eight inside tray corners clockwise, then confirm.');calibrationId=null;find('[data-capture]').disabled=true;
  await showLive();
  const sample=await snapshot();calibrationView={width:sample.frame.width,height:sample.frame.height,orientation:sample.frame.orientation,sessionId:sample.frame.sessionId};
  await showFrozen();polygon=[];marking=true;calibrationImage=sample.image;box.classList.add('camera-calibrating');calibrationTools.hidden=false;find('[data-use-area]').hidden=false;redrawCalibration();
 });
 canvas.onclick=e=>{if(!marking||polygon.length>=8)return;const r=canvas.getBoundingClientRect();polygon.push([(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]);redrawCalibration();status(`${polygon.length}/8 tray corners marked.`);};
 find('[data-undo-point]').onclick=()=>{if(!marking)return;polygon.pop();redrawCalibration();status(`${polygon.length}/8 tray corners marked.`);};
 find('[data-clear-points]').onclick=()=>{if(!marking)return;polygon=[];redrawCalibration();status('Mark the eight inside tray corners clockwise, then confirm.');};
 find('[data-cancel-calibration]').onclick=act(async()=>{if(!marking)return;await release();await showLive();find('[data-use-area]').hidden=true;status('Calibration cancelled. Calibrate the tray before capture.');});
 find('[data-use-area]').onclick=act(async()=>{if(polygon.length!==8||!validPolygon(polygon))throw Error('Mark eight valid inside tray corners. Calibrate again to restart.');calibrationId=crypto.randomUUID();marking=false;await release();await showLive();find('[data-use-area]').hidden=true;savedCalibration={polygon:structuredClone(polygon),calibrationId,calibrationView:structuredClone(calibrationView),...(validStreamSize(connection)?{streamWidth:connection.streamWidth,streamHeight:connection.streamHeight}:{})};find('[data-capture]').disabled=!canCapture();status('Tray confirmed. Capture after the dice settle.');});
 find('[data-capture]').onclick=act(async()=>{
  if(submitting)return;invalidate('Waiting for a clear settled view…');find('[data-capture]').disabled=true;await showLive();
  const token=operation,game=diagnostic?null:getGame();if(!diagnostic&&game?.turn?.source!=='camera')throw Error('Start a camera turn first.');
  let result=null,sample=null,lastSignature='',count=0,since=0,lastSequence=-1;
  reader??=readerFactory({timing});
  try{
   await reader.ready;
   if(diagnostic){
    const sample=await snapshot();
    if(!calibrationView||sample.frame.sessionId!==calibrationView.sessionId||sample.frame.width!==calibrationView.width||sample.frame.height!==calibrationView.height||sample.frame.orientation!==calibrationView.orientation)throw Error('Camera view changed. Calibrate the tray again.');
    const prediction=await reader.infer(sample.image,polygon);
    if(closed||token!==operation)throw Error('Test capture changed. Capture again.');
    await showFrozen();testUI.show(prediction,sample.frame);status('Frozen test frame. Check each picture below, then record the comparison.');return;
   }
   const deadline=performance.now()+8000;
   while(!closed&&token===operation&&performance.now()<deadline){
    sample=await snapshot();
    if(!calibrationView||sample.frame.sessionId!==calibrationView.sessionId||sample.frame.width!==calibrationView.width||sample.frame.height!==calibrationView.height||sample.frame.orientation!==calibrationView.orientation)throw Error('Camera view changed. Calibrate the tray again.');
    if(sample.frame.sequence<=lastSequence){await new Promise(resolve=>setTimeout(resolve,180));continue;}
    lastSequence=sample.frame.sequence;
    result=await reader.infer(sample.image,polygon);
    if(closed||token!==operation)throw Error('Capture invalidated.');
    if(result.moving||result.handInTray||result.dice.length>5){count=0;since=performance.now();lastSignature='';}
    else{const signature=JSON.stringify(result.dice.map(d=>[d.value,Math.round(d.x*50),Math.round(d.y*50)]));if(signature!==lastSignature){lastSignature=signature;count=0;since=performance.now();}count++;if(count>=4&&performance.now()-since>=650)break;}
    await new Promise(resolve=>setTimeout(resolve,180));
   }
   if(!sample||!result||count<4||performance.now()-since<650||closed||token!==operation)throw Error('No clear settled scene. Capture again or finish manually.');
   const currentGame=getGame();if(currentGame.id!==game.id||currentGame.revision!==game.revision||currentGame.turn?.id!==game.turn?.id||currentGame.activeSeat!==game.activeSeat)throw Error('The turn changed during capture. Capture again.');
   const reviewStarted=performance.now();
   adapter.start({cameraId:sample.frame.cameraId,sessionId:sample.frame.sessionId,calibrationId});
   const metadata={...sample.frame,calibrationId};delete metadata.url;delete metadata.fileUri;
   if(!adapter.pinReview(getGame(),{frame:metadata,prediction:result,readerVersion:'opencv-pips-0.5'}))throw Error('Frame or turn changed. Capture again.');
   await showFrozen();drawPolygon();
   reviewImage={width:sample.image.width,height:sample.image.height,data:new Uint8ClampedArray(sample.image.data)};
   const values=adapter.pending.observation.predictedValues;
   find('[data-values]').replaceChildren(...values.map((v,i)=>{const label=document.createElement('label');label.append(document.createTextNode(`Slot ${i+1}`));const select=document.createElement('select');select.setAttribute('aria-label',`Face for slot ${i+1}`);select.append(new Option('Check face',''));for(let n=1;n<=6;n++)select.append(new Option(String(n),String(n)));select.value=v?String(v):'';const hold=document.createElement('input');hold.type='checkbox';hold.setAttribute('aria-label',`Keep slot ${i+1}`);hold.disabled=!game.turn.rolls.some(r=>!r.excluded);label.append(select,hold,document.createTextNode(' Kept'));return label;}));
   find('[data-review]').hidden=false;find('[data-confirm]').disabled=false;status(result.rejected?.length||values.some(v=>v===null)?'Some faces are unclear. Review and enter all five values; original readings will be retained.':'Review the faces and kept slots, then confirm the roll.');
   timing.record('reviewPreparationMs',performance.now()-reviewStarted);
  }catch(error){if(reader?.stopped){reader.stop();reader=null;}throw error;}finally{await release();if(!closed)find('[data-capture]').disabled=!calibrationId;}
 });
 if(!diagnostic)find('[data-confirm]').onclick=act(async()=>{
  if(submitting||!adapter.pending)return;
  submitting=true;const controls=[...box.querySelectorAll('button,select,input')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
  try{
   const token=operation,original=adapter.pending.observation;
   await rect(true);const current=await snapshot();reader??=readerFactory({timing});const check=await reader.infer(current.image,polygon);
   const same=sameCameraScene(reviewImage,current.image,polygon)&&current.frame.sessionId===original.sessionId&&current.frame.width===original.width&&current.frame.height===original.height&&current.frame.orientation===original.orientation&&!check.moving&&!check.handInTray&&check.dice.length===original.prediction.dice.length&&check.dice.every((d,i)=>d.value===original.prediction.dice[i].value&&Math.hypot(d.x-original.prediction.dice[i].x,d.y-original.prediction.dice[i].y)<.025);
   if(closed||token!==operation||!same){invalidate('Scene changed during review. Capture a fresh roll.');throw Error('Scene changed during review. Capture a fresh roll.');}
   const action=adapter.reviewedAction(getGame(),reviewValues()),commandId=adapter.commandId;
   await commit(action,commandId);adapter.committed();await cleanup();box.close();box.remove();}
  catch(error){if(reader?.stopped){reader.stop();reader=null;}throw error;}
  finally{await release();submitting=false;if(!closed){controls.forEach(([el,disabled])=>el.disabled=disabled);find('[data-confirm]').disabled=!adapter.pending;find('[data-capture]').disabled=!calibrationId||getGame()?.turn?.source!=='camera';}}

 });
 const cleanup=async()=>{if(closed)return;closed=true;operation++;adapter.stop();reader?.stop();timing.close();window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);document.removeEventListener('visibilitychange',hidden);await listener?.remove();await release();await rect(false);if(!calibrationId||connection?.state!=='live'){savedCalibration=null;await transport.disconnect().catch(()=>{});}};
 const hidden=()=>{if(document.hidden){invalidate('App paused. Reconnect and capture again.');calibrationId=null;savedCalibration=null;find('[data-capture]').disabled=true;void transport.disconnect().catch(()=>{});}};
 find('[data-close]').onclick=()=>box.close();box.addEventListener('close',()=>{void cleanup();box.remove();},{once:true});
 window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);document.addEventListener('visibilitychange',hidden);
 const initializationOperation=operation;
 try{
  listener=await transport.onStatus(s=>cameraStatus(s));if(closed){await listener.remove();return;}
  await profiles();const current=await transport.getStatus();if(closed)return;
  // A user operation or a newer native status owns the dialog once started.
  // Late initialization must not restore an old polygon over calibration work.
  if(operation===initializationOperation){
  cameraStatus(current,{initial:true});
  const retainedSizeMatches=savedCalibration?.streamWidth===undefined
   ||validStreamSize(current)&&current.streamWidth===savedCalibration.streamWidth&&current.streamHeight===savedCalibration.streamHeight;
  if(savedCalibration&&current.state==='live'&&current.sessionId===savedCalibration.calibrationView.sessionId&&retainedSizeMatches){
   polygon=structuredClone(savedCalibration.polygon);calibrationId=savedCalibration.calibrationId;calibrationView=structuredClone(savedCalibration.calibrationView);
   find('[data-capture]').disabled=!canCapture();status('Connected. Tray calibration retained for this camera session.');await showLive();
  }
  }
 }
 catch(error){if(!closed&&operation===initializationOperation)status(error.message||'Camera setup unavailable.');}
 // Game capture is a capture intent; camera settings only opens setup. Reuse
 // the reviewed path after fresh session checks, never auto-confirm a roll.
 if(autoCapture&&!closed&&operation===initializationOperation&&calibrationId&&connection?.state==='live'&&!find('[data-capture]').disabled)void find('[data-capture]').onclick();
 return {close:()=>box.close(),getTiming:()=>timing.snapshot(),...(diagnostic?{getTestResults:()=>testUI.getResults()}: {})};
}


