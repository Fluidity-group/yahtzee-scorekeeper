/* empty css                  */import{D as h}from"./capture-CP6ZYl_n.js";const e=new h;let $=0;const p=t=>String(t).replace(/[&<>"']/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[o]);document.body.innerHTML=`<main class="dice-lab"><a class="core-legacy" href="/">← Back to game</a>
 <div class="intro-kicker">HARDWARE PREPARATION</div><h1>Dice capture lab</h1>
 <p class="simulation-note">Simulation only · No Bluetooth connection or game scores are changed here.</p>
 <p class="core-muted">Test five-dice capture, held dice and disconnects before connecting real hardware. The GoDice API adapter is pending commercial licence clarification.</p>
 <div id="labState"></div><p id="labNotice" role="status" aria-live="polite"></p>
 <details><summary>Recent diagnostic events</summary><pre id="labLog"></pre></details>
 <button class="hbtn" data-lab="export">Export test trace</button></main>`;const r=document.getElementById("labState"),m=t=>{document.getElementById("labNotice").textContent=t};function b(){const t=e.turn,o=t?.round,n=e.candidate();r.innerHTML=`<div class="lab-actions">
  <button class="hbtn" data-lab="connect" ${e.devices.size?"disabled":""}>Connect five test dice</button>
  <button class="hbtn" data-lab="start" ${t?"disabled":""}>Start test turn · 3 rolls</button>
  <button class="hbtn" data-lab="end" ${t?"":"disabled"}>End test turn</button></div>
  <p>${t?`Test player · ${t.accepted.length} / ${t.limit} rolls accepted`:"No active test turn"}</p>
  ${t?.paused?`<p role="alert">${p(t.paused)} End this test turn and start again after reconnecting.</p>`:""}
  <div class="lab-dice">${[...e.devices.values()].map((a,l)=>`<section class="lab-die">
   <h2>Die ${l+1}</h2><p>${p(a.state)} · face ${a.face??"—"}</p>
   <label>Test face<select data-face="${l}" aria-label="Die ${l+1} test face">${[1,2,3,4,5,6].map(i=>`<option ${i===(a.face||l+1)?"selected":""}>${i}</option>`).join("")}</select></label>
   <label><input type="checkbox" data-held="${l}" ${o?.held[l]?"checked":""} ${!t?.accepted.length||o?"disabled":""}> Hold die ${l+1}</label>
   <div class="lab-actions"><button class="hbtn" data-lab="moving" data-die="${l}" ${a.connected?"":"disabled"}>Move</button>
   <button class="hbtn" data-lab="stable" data-die="${l}" ${a.connected?"":"disabled"}>Settle</button>
   <button class="hbtn" data-lab="tilted" data-die="${l}" ${a.connected?"":"disabled"}>Tilt</button>
   <button class="hbtn" data-lab="${a.connected?"disconnect":"reconnect"}" data-die="${l}">${a.connected?"Disconnect":"Reconnect"}</button></div></section>`).join("")}</div>
  <div class="lab-actions"><button class="hbtn" data-lab="arm" ${!t||t.paused||o||t.accepted.length>=t.limit?"disabled":""}>Arm next roll</button>
  <button class="hbtn" data-lab="all" ${!o||t.paused?"disabled":""}>Simulate roll and settle</button>
  <button class="hbtn" data-lab="cancel" ${o?"":"disabled"}>Cancel capture</button></div>
  <p>${n?`Ready: ${n.dice.join(" · ")}`:o?.invalid.size?"A held die moved. Cancel capture and try again.":o?"Waiting for fresh movement and settled readings.":"Arm a roll before moving the dice."}</p>
  <button class="bigbtn score core-primary" data-lab="accept" ${n?"":"disabled"}>Accept test roll</button>`,document.getElementById("labLog").textContent=e.log.slice(-30).map(a=>JSON.stringify(a)).join(`
`)}function s(t,o,n){const a=e.devices.get(`test-${t}`);e.receive({id:a.id,epoch:a.epoch,kind:o,face:n,token:e.turn?.round?.token})}document.addEventListener("click",t=>{const o=t.target.closest("[data-lab]");if(!o)return;const n=o.dataset.lab,a=Number(o.dataset.die),l=[...r.querySelectorAll("[data-face]")].map(c=>Number(c.value)),i=[...r.querySelectorAll("[data-held]")].map(c=>c.checked);try{if(n==="connect")for(let c=0;c<5;c++)e.connect(`test-${c}`);if(n==="start"&&e.start({turnId:`test-turn-${++$}`,playerId:"test-player"}),n==="end"&&e.end(),n==="arm"&&e.arm(i),n==="cancel"&&e.cancel(),n==="accept"&&e.accept(),n==="disconnect"&&e.disconnect(`test-${a}`,e.devices.get(`test-${a}`).epoch),n==="reconnect"&&e.connect(`test-${a}`),["moving","stable","tilted"].includes(n)&&s(a,n,l[a]),n==="all")for(let c=0;c<5;c++)e.turn.round.held[c]||(s(c,"moving"),s(c,"stable",l[c]));if(n==="export"){const c={schema:1,source:"simulation",exportedAt:new Date().toISOString(),truncatedToLast:500,events:e.log},u=URL.createObjectURL(new Blob([JSON.stringify(c,null,2)],{type:"application/json"})),d=document.createElement("a");d.href=u,d.download="dice-capture-test.json",d.click(),setTimeout(()=>URL.revokeObjectURL(u),1e3)}m(""),b()}catch(c){m(c.message)}});document.addEventListener("visibilitychange",()=>{document.hidden&&(e.pause("App moved to the background."),b())});b();
