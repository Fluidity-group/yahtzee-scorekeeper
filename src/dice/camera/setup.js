export function cropRect(width,height,{zoom=1,x=.5,y=.5}={}){
 const z=Math.max(1,Math.min(4,Number(zoom)||1)),w=width/z,h=height/z;
 return [Math.max(0,Math.min(width-w,x*width-w/2)),Math.max(0,Math.min(height-h,y*height-h/2)),w,h];
}
export async function setCameraControl(track,key,value){
 const caps=track.getCapabilities?.()??{},cap=caps[key];
 if(!cap)throw Error(`${key} is not exposed by this camera/browser.`);
 if(Array.isArray(cap)&&!cap.includes(value))throw Error(`Unsupported ${key} mode.`);
 if(typeof value==='number'&&(!Number.isFinite(value)||value<cap.min||value>cap.max))throw Error(`${key} is outside the supported range.`);
 const old=track.getConstraints?.()??{};
 const advanced=Object.assign({},...(old.advanced??[]),{[key]:value});
 await track.applyConstraints({...old,advanced:[advanced]});
 const actual=track.getSettings?.()[key];
 if(actual!==undefined&&(typeof value==='number'?Math.abs(actual-value)>Math.max(cap.step??.001,.001):actual!==value))throw Error(`Camera did not apply ${key}; reported ${actual}.`);
 return actual;
}
export class CameraSetup {
 constructor(root,{changed,confirmed}){
  this.root=root;this.changed=changed;this.confirmed=confirmed;this.crop={zoom:1,x:.5,y:.5};this.locked=false;this.track=null;
  root.innerHTML=`<h2>1. Set the camera view</h2><p>Keep the complete tray in view. Leave some table visible on both player sides for hand detection.</p><div class="settings"><label>View zoom (digital) <input id="viewZoom" type="range" min="1" max="4" step="0.05" value="1"></label><label>View centre left / right <input id="viewX" type="range" min="0" max="1" step="0.01" value="0.5"></label><label>View centre up / down <input id="viewY" type="range" min="0" max="1" step="0.01" value="0.5"></label></div><p class="muted">Digital zoom crops the image; it adds no detail. It stays fixed until you change it.</p><div id="hardwareControls" class="settings"></div><p id="cameraCapabilities" class="muted">Start the webcam to inspect hardware controls.</p><div class="toolbar"><button id="lockView" class="primary" disabled>Confirm view & hold focus</button><button id="editView" disabled>Adjust view again</button></div><p id="viewStatus" role="status">View not confirmed.</p>`;
  this.find=id=>root.querySelector('#'+id);
  for(const [id,key]of [['viewZoom','zoom'],['viewX','x'],['viewY','y']])this.find(id).oninput=()=>{this.crop[key]=Number(this.find(id).value);this.changed();};
  this.find('editView').onclick=()=>{this.locked=false;this.changed();this.renderLock();this.find('viewStatus').textContent='Adjust the view, then confirm it again.';};
  this.find('lockView').onclick=()=>this.lock();
 }
 reset(){this.track=null;this.virtual=false;this.locked=false;this.crop={zoom:1,x:.5,y:.5};this.find('viewZoom').value=1;this.find('viewX').value=.5;this.find('viewY').value=.5;this.find('hardwareControls').replaceChildren();this.find('lockView').disabled=true;this.find('viewStatus').textContent='View not confirmed.';this.renderLock();}
 bind(track){this.track=track;this.locked=false;this.find('lockView').disabled=false;const caps=track?.getCapabilities?.()??{},settings=track?.getSettings?.()??{};const controls=this.find('hardwareControls');controls.replaceChildren();
  for(const [key,label]of [['zoom','Camera zoom'],['focusMode','Focus mode'],['focusDistance','Manual focus distance'],['exposureMode','Exposure mode'],['exposureTime','Manual exposure time']]){
   const cap=caps[key];if(!cap)continue;const row=document.createElement('label');row.textContent=label;let control;
   if(Array.isArray(cap)){control=document.createElement('select');cap.forEach(v=>control.append(new Option(v,v)));control.value=settings[key]??cap[0];}
   else if(Number.isFinite(cap.min)&&cap.max>cap.min){control=document.createElement('input');control.type='range';control.min=cap.min;control.max=cap.max;control.step=cap.step||((cap.max-cap.min)/100);control.value=settings[key]??cap.min;}else continue;
   control.dataset.control=key;control.onchange=async()=>{this.changed();control.disabled=true;try{const actual=await setCameraControl(track,key,control.tagName==='SELECT'?control.value:Number(control.value));this.find('viewStatus').textContent=`${label}: ${actual??'requested (not reported)'}`;}catch(e){this.find('viewStatus').textContent=e.message;}finally{this.renderLock();}};row.append(control);controls.append(row);
  }
  this.find('cameraCapabilities').textContent=`${track?.label||'Video source'} · Hardware zoom: ${caps.zoom?'exposed':'not exposed'} · Focus: ${caps.focusMode?.join(', ')||'not exposed'} · Exposure: ${caps.exposureMode?.join(', ')||'not exposed'}. If the image still reframes with fixed controls, disable auto-framing in the webcam software or move the mount.`;
  this.renderLock();
 }
 renderLock(){this.root.querySelectorAll('input,select').forEach(el=>el.disabled=this.locked);this.find('editView').disabled=!this.locked;this.find('lockView').disabled=this.locked||!this.available;}
 get available(){return !!this.track||this.virtual;}
 async lock(){
  if(!this.available)return;this.find('lockView').disabled=true;
  const messages=[],caps=this.track?.getCapabilities?.()??{},s=this.track?.getSettings?.()??{};
  for(const [mode,value,label]of [['focusMode','focusDistance','Focus'],['exposureMode','exposureTime','Exposure']]){
   if(s[mode]==='manual'){messages.push(`${label} already manual.`);continue;}
   if(caps[mode]?.includes('manual')&&Number.isFinite(s[value])&&caps[value]){
    try{await setCameraControl(this.track,mode,'manual');await setCameraControl(this.track,value,s[value]);messages.push(`${label} held.`);}catch(e){messages.push(`${label} could not be held: ${e.message}`);}
   }else messages.push(`${label} lock not available through this browser.`);
  }
  this.locked=true;this.renderLock();this.find('viewStatus').textContent=`View confirmed. ${messages.join(' ')}`;this.confirmed();
 }
 fingerprint(){const s=this.track?.getSettings?.()??{};return {crop:{...this.crop},camera:Object.fromEntries(['zoom','focusMode','focusDistance','exposureMode','exposureTime','width','height'].filter(k=>s[k]!==undefined).map(k=>[k,s[k]]))};}
}
