const $=id=>document.getElementById(id);
let session=JSON.parse(localStorage.getItem('pi-table-session')||'null'),state=null,pending=JSON.parse(sessionStorage.getItem('pi-pending')||'null'),busy=false;
let mutationEpoch=0,cameraBusy=false;
let livePreview=false,displayFrame=null,proposal=null,labels=[],selected=-1,calibrating=false,corners=[],qrRoom=null;
const uuid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
const notice=s=>$('notice').textContent=s;
async function api(url,data,token=session?.token){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const r=await fetch(url,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token||''}`},signal:controller.signal,...(data?{body:JSON.stringify(data)}:{})});const v=await r.json();if(!r.ok)throw Error(v.error);return v;}catch(e){if(e.name==='AbortError')throw new TypeError('Connection timed out');throw e;}finally{clearTimeout(timer);}}
for(let i=0;i<5;i++){const l=document.createElement('label');l.textContent=`Die ${i+1}`;const s=document.createElement('select');s.dataset.face=i;for(let v=1;v<=6;v++)s.add(new Option(v,v));l.append(s);const c=document.createElement('input');c.type='checkbox';c.dataset.held=i;l.append(c,document.createTextNode('Held'));$('dice').append(l);}
const faces=()=>[...document.querySelectorAll('[data-face]')];const holds=()=>[...document.querySelectorAll('[data-held]')];
function render(next){if(state?.id===next.id&&next.revision<state.revision)return;const changed=state?.game?.turn?.id!==next.game?.turn?.id;state=next;$('join').hidden=true;$('table').hidden=false;$('heading').textContent=`Table ${state.code}`;$('roster').textContent=state.names.join(' · ')+` · You: ${state.names[state.seat]}`;$('start').hidden=!!state.game||state.seat!==0;
 renderCamera();
 const g=state.game;$('controls').hidden=!g||g.status!=='active'||g.activeSeat!==state.seat;if(!g){$('turn').textContent='Waiting for the host to start.';return;}
 if(changed){holds().forEach(c=>c.checked=false);faces().forEach(s=>s.value=1);}
 const last=g.turn?.rolls.at(-1);holds().forEach((c,i)=>{c.disabled=!last;if(!last)c.checked=false;faces()[i].disabled=c.checked;if(c.checked&&last)faces()[i].value=last.dice[i];});
 $('turn').textContent=g.status==='finished'?`Game complete. Winner: ${state.totals.winners.map(i=>state.names[i]).join(', ')}`:`${state.names[g.activeSeat]}'s turn · ${g.turn.rolls.length} / ${g.turn.limit} rolls`;
 $('roll').disabled=busy||g.status!=='active'||g.turn.rolls.length>=g.turn.limit;$('correct').disabled=busy||!last;$('scores').replaceChildren();
 for(const [category,value] of Object.entries(state.options?.scores||{})){const b=document.createElement('button');b.textContent=`${state.categories.find(c=>c.key===category).name}: ${value}`;b.disabled=busy;b.onclick=()=>act({type:'score',category,value});$('scores').append(b);}
 const table=document.createElement('table'),head=table.insertRow();['Category',...state.names].forEach(t=>{const th=document.createElement('th');th.textContent=t;head.append(th);});for(const cat of state.categories){const row=table.insertRow();[cat.name,...g.sheets.map(s=>s[cat.key]??'—')].forEach(t=>row.insertCell().textContent=t);}const total=table.insertRow();['Total',...state.totals.totals].forEach(t=>total.insertCell().textContent=t);$('scorecard').replaceChildren(table);
}
async function refresh(){if(!session||busy||pending||cameraBusy)return;const epoch=mutationEpoch;try{const next=await api('/api/rooms/'+session.id);if(epoch===mutationEpoch&&!busy&&!cameraBusy)render(next);}catch(e){notice(e.message+' — saved session retained; reconnect to this host.');}}
async function enter(create){try{const r=await api(create?'/api/create':'/api/join',{name:$('name').value,code:$('code').value},create?$('key').value:null);session={id:r.id,token:r.token};localStorage.setItem('pi-table-session',JSON.stringify(session));$('key').value='';render(r.room);notice('Connected.');}catch(e){notice(e.message);}}
async function act(action){if(busy||cameraBusy)return;mutationEpoch++;pending??={commandId:uuid(),revision:state.revision,action:structuredClone({...action,turnId:state.game?.turn?.id})};sessionStorage.setItem('pi-pending',JSON.stringify(pending));busy=true;render(state);try{const next=await api('/api/rooms/'+session.id,pending);pending=null;sessionStorage.removeItem('pi-pending');render(next);notice('Saved on the game host.');}catch(e){if(e instanceof TypeError){notice('Connection lost. Retry the pending command when connected.');}else{pending=null;sessionStorage.removeItem('pi-pending');notice(e.message);}}finally{busy=false;render(state);}}
$('joinButton').onclick=()=>enter(false);$('create').onclick=()=>enter(true);$('start').onclick=()=>act({type:'start'});
holds().forEach(c=>c.onchange=()=>render(state));$('roll').onclick=()=>act({type:'roll',dice:faces().map(s=>Number(s.value)),held:holds().map(c=>c.checked),confirmed:true});$('correct').onclick=()=>act({type:'correct-roll',dice:faces().map(s=>Number(s.value))});
$('export').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state.game,null,2)],{type:'application/json'}));a.href=url;a.download='pi-local-game.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const joinCode=new URL(location.href).searchParams.get('join');if(joinCode)$('code').value=joinCode;
$('recover').onclick=async()=>{try{const r=await api('/api/recover',{code:$('recoveryCode').value,seat:Number($('recoverySeat').value)-1},$('recoveryKey').value);session={id:r.id,token:r.token};localStorage.setItem('pi-table-session',JSON.stringify(session));pending=null;sessionStorage.removeItem('pi-pending');$('recoveryKey').value='';render(r.room);notice('Seat restored. Its previous browser session has been revoked.');}catch(e){notice(e.message);}};
const exportSamples=document.createElement('button');exportSamples.textContent='Export retained camera examples';exportSamples.onclick=()=>cameraAction(async()=>{download(await operation('samples'),'pi-camera-labelled-examples.json');});$('cameraPanel').append(exportSamples);
function download(data,filename){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const operation=async(name,data)=>api(`/api/rooms/${session.id}/${name}`,data);
function renderCamera(){
 $('cameraPanel').hidden=false;$('cameraAdmin').hidden=state.seat!==0;$('invite').hidden=!!state.game;
 if(qrRoom!==state.id){qrRoom=state.id;operation('qr').then(v=>$('qr').src=v.image).catch(e=>notice(e.message));}
 const choice=$('cameraChoice'),old=choice.value;choice.replaceChildren();for(const d of state.devices||[])choice.add(new Option(d.label,d.id));if([...choice.options].some(o=>o.value===old))choice.value=old;
 if(state.proposal?.id!==proposal?.id){proposal=state.proposal;labels=[];selected=-1;if(proposal){displayFrame=proposal.observation;livePreview=false;calibrating=false;paintCamera();}else{displayFrame=null;$('frameImage').removeAttribute('src');$('markers').replaceChildren();$('cameraStatus').textContent='Review closed.';$('labelPrompt').textContent='No frozen roll. Show the preview, then freeze when ready.';}}
 $('freezeCamera').disabled=busy||!choice.value||!state.game?.turn||state.game.activeSeat!==state.seat||!!proposal;
 $('acceptCamera').disabled=busy||!proposal||labels.length!==5||labels.some(d=>!d.value);$('discardCamera').disabled=busy||!proposal;choice.disabled=!!proposal;
 $('markTray').disabled=!!proposal||!displayFrame;$('confirmTray').disabled=!calibrating||corners.length!==8;
 if(!choice.value)$('cameraStatus').textContent='No camera assigned. The host can pair a tray below.';
}
function paintCamera(){if(!displayFrame)return;$('frameImage').src=displayFrame.image;$('markers').replaceChildren();
 const mark=(x,y,text,color)=>{const el=document.createElement('span');el.textContent=text;Object.assign(el.style,{position:'absolute',left:`${x*100}%`,top:`${y*100}%`,transform:'translate(-50%,-50%)',background:color,color:'#10242b',border:'2px solid white',fontSize:'13px',padding:'2px'});$('markers').append(el);};
 if(calibrating)corners.forEach(([x,y],i)=>mark(x,y,i+1,'#ffe38a'));
 else if(proposal){labels.forEach((d,i)=>mark(d.x,d.y,`${i+1}: ${d.value} ✓`,'#a8e3d4'));if(selected>=0&&labels[selected])mark(labels[selected].x,labels[selected].y,`${selected+1}: choose value`,'#ffe38a');}
 else for(const d of displayFrame.dice||[])mark(d.x,d.y,d.value,'#a8e3d4');
 $('cameraStatus').textContent=`${proposal?'Frozen review':calibrating?'Marking tray':'Live preview'} · ${displayFrame.mediaOrigin==='replay'?'REPLAY · ':''}${displayFrame.dice.length} readable, ${displayFrame.rejected.length} unclassified`;
 $('acceptCamera').disabled=busy||!proposal||labels.length!==5||labels.some(d=>!d.value);
 $('confirmTray').disabled=!calibrating||corners.length!==8;
}
async function cameraAction(fn){if(busy||cameraBusy||pending)return;cameraBusy=true;mutationEpoch++;try{await fn();}catch(e){notice(e.message);}finally{cameraBusy=false;await refresh();}}
$('pair').onclick=()=>cameraAction(async()=>{const seats=$('deviceSeats').value.split(',').map(v=>Number(v.trim())-1);const credentials=await operation('pair',{label:$('deviceName').value,seats});download({...credentials,authorityURL:location.origin,allowPrivateHttp:location.protocol==='http:'},'dice-camera-config.json');await refresh();notice('Camera configuration downloaded. Start the Pi agent with this private file.');});
$('revoke').onclick=()=>cameraAction(async()=>{await operation('revoke',{deviceId:$('cameraChoice').value});displayFrame=null;$('frameImage').removeAttribute('src');await refresh();});
async function previewFrame(){if(!livePreview||proposal||calibrating||busy||cameraBusy)return;try{displayFrame=await api(`/api/rooms/${session.id}/preview?device=${encodeURIComponent($('cameraChoice').value)}`);paintCamera();}catch(e){$('cameraStatus').textContent=e.message;}}
$('preview').onclick=()=>{livePreview=true;previewFrame();};
$('cameraChoice').onchange=()=>{livePreview=false;displayFrame=null;$('frameImage').removeAttribute('src');$('markers').replaceChildren();};
$('markTray').onclick=()=>{calibrating=true;livePreview=false;corners=[];paintCamera();notice('Click eight inside corners in order, then Confirm tray boundary.');};
$('confirmTray').onclick=()=>cameraAction(async()=>{await operation('calibrate',{deviceId:$('cameraChoice').value,polygon:corners});calibrating=false;livePreview=true;await refresh();notice('Boundary saved. Wait for the camera to use the new calibration.');});
$('freezeCamera').onclick=()=>cameraAction(async()=>{await operation('freeze',{deviceId:$('cameraChoice').value});await refresh();notice('Click each die in logical slot order, including held dice. Confirm all five values.');});
$('discardCamera').onclick=()=>cameraAction(async()=>{await operation('discard',{});await refresh();livePreview=true;});
$('frameImage').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;if(calibrating){if(corners.length<8)corners.push([x,y]);paintCamera();return;}if(!proposal)return;
 const prior=labels.findIndex(d=>Math.hypot(d.x-x,d.y-y)<.012);if(prior<0&&labels.length===5){notice('Five dice labelled. Click a label to change it.');return;}selected=prior>=0?prior:labels.length;if(prior<0)labels.push({x,y,value:null});$('labelPrompt').textContent=`Die ${selected+1}: choose the actual face below. Match held dice to their previous logical slots.`;paintCamera();};
for(let v=1;v<=6;v++){const b=document.createElement('button');b.textContent=v;b.onclick=()=>{if(selected<0||busy||cameraBusy||pending)return;labels[selected].value=v;faces()[selected].value=v;selected=-1;$('labelPrompt').textContent=`${labels.filter(d=>d.value).length} / 5 confirmed. Click the next die or record the roll.`;paintCamera();};$('values').append(b);}
$('acceptCamera').onclick=()=>{if(!proposal||labels.length!==5||labels.some(d=>!d.value))return;act({type:'roll',dice:labels.map(d=>d.value),labels,held:holds().map(c=>c.checked),confirmed:true,proposalId:proposal.id});};
const retry=document.createElement('button');retry.textContent='Retry pending save';retry.onclick=()=>{if(pending)act(pending.action);};$('table').append(retry);
setInterval(()=>{retry.hidden=!pending;refresh();previewFrame();},1500);
if(pending&&session)api('/api/rooms/'+session.id).then(v=>{render(v);notice('An unacknowledged save is retained. Retry pending save to reconcile it.');}).catch(e=>notice(e.message));else refresh();
