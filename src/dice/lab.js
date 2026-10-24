import '../styles.css';
import '../clubhouse.css';
import '../prototype.css';
import './lab.css';
import { DiceCapture } from './capture.js';

const capture = new DiceCapture();
let turnNumber = 0;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
document.body.innerHTML = `<main class="dice-lab"><a class="core-legacy" href="/">← Back to game</a>
 <div class="intro-kicker">HARDWARE PREPARATION</div><h1>Dice capture lab</h1>
 <p class="simulation-note">Simulation only · No Bluetooth connection or game scores are changed here.</p>
 <p class="core-muted">Test five-dice capture, held dice and disconnects before connecting real hardware. The GoDice API adapter is pending commercial licence clarification.</p>
 <div id="labState"></div><p id="labNotice" role="status" aria-live="polite"></p>
 <details><summary>Recent diagnostic events</summary><pre id="labLog"></pre></details>
 <button class="hbtn" data-lab="export">Export test trace</button></main>`;
const root = document.getElementById('labState');
const notice = text => { document.getElementById('labNotice').textContent = text; };

function render() {
 const turn = capture.turn, round = turn?.round, candidate = capture.candidate();
 root.innerHTML = `<div class="lab-actions">
  <button class="hbtn" data-lab="connect" ${capture.devices.size ? 'disabled' : ''}>Connect five test dice</button>
  <button class="hbtn" data-lab="start" ${turn ? 'disabled' : ''}>Start test turn · 3 rolls</button>
  <button class="hbtn" data-lab="end" ${!turn ? 'disabled' : ''}>End test turn</button></div>
  <p>${turn ? `Test player · ${turn.accepted.length} / ${turn.limit} rolls accepted` : 'No active test turn'}</p>
  ${turn?.paused ? `<p role="alert">${esc(turn.paused)} End this test turn and start again after reconnecting.</p>` : ''}
  <div class="lab-dice">${[...capture.devices.values()].map((d, i) => `<section class="lab-die">
   <h2>Die ${i + 1}</h2><p>${esc(d.state)} · face ${d.face ?? '—'}</p>
   <label>Test face<select data-face="${i}" aria-label="Die ${i + 1} test face">${[1,2,3,4,5,6].map(n => `<option ${n === (d.face || i + 1) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
   <label><input type="checkbox" data-held="${i}" ${round?.held[i] ? 'checked' : ''} ${!turn?.accepted.length || round ? 'disabled' : ''}> Hold die ${i + 1}</label>
   <div class="lab-actions"><button class="hbtn" data-lab="moving" data-die="${i}" ${!d.connected ? 'disabled' : ''}>Move</button>
   <button class="hbtn" data-lab="stable" data-die="${i}" ${!d.connected ? 'disabled' : ''}>Settle</button>
   <button class="hbtn" data-lab="tilted" data-die="${i}" ${!d.connected ? 'disabled' : ''}>Tilt</button>
   <button class="hbtn" data-lab="${d.connected ? 'disconnect' : 'reconnect'}" data-die="${i}">${d.connected ? 'Disconnect' : 'Reconnect'}</button></div></section>`).join('')}</div>
  <div class="lab-actions"><button class="hbtn" data-lab="arm" ${!turn || turn.paused || round || turn.accepted.length >= turn.limit ? 'disabled' : ''}>Arm next roll</button>
  <button class="hbtn" data-lab="all" ${!round || turn.paused ? 'disabled' : ''}>Simulate roll and settle</button>
  <button class="hbtn" data-lab="cancel" ${!round ? 'disabled' : ''}>Cancel capture</button></div>
  <p>${candidate ? `Ready: ${candidate.dice.join(' · ')}` : round?.invalid.size ? 'A held die moved. Cancel capture and try again.' : round ? 'Waiting for fresh movement and settled readings.' : 'Arm a roll before moving the dice.'}</p>
  <button class="bigbtn score core-primary" data-lab="accept" ${!candidate ? 'disabled' : ''}>Accept test roll</button>`;
 document.getElementById('labLog').textContent = capture.log.slice(-30).map(e => JSON.stringify(e)).join('\n');
}

function emit(index, kind, face) {
 const die = capture.devices.get(`test-${index}`);
 capture.receive({ id: die.id, epoch: die.epoch, kind, face, token: capture.turn?.round?.token });
}

document.addEventListener('click', e => {
 const button = e.target.closest('[data-lab]'); if (!button) return;
 const action = button.dataset.lab, index = Number(button.dataset.die);
 const faces = [...root.querySelectorAll('[data-face]')].map(s => Number(s.value));
 const held = [...root.querySelectorAll('[data-held]')].map(s => s.checked);
 try {
  if (action === 'connect') for (let i = 0; i < 5; i++) capture.connect(`test-${i}`);
  if (action === 'start') capture.start({ turnId: `test-turn-${++turnNumber}`, playerId: 'test-player' });
  if (action === 'end') capture.end();
  if (action === 'arm') capture.arm(held);
  if (action === 'cancel') capture.cancel();
  if (action === 'accept') capture.accept();
  if (action === 'disconnect') capture.disconnect(`test-${index}`, capture.devices.get(`test-${index}`).epoch);
  if (action === 'reconnect') capture.connect(`test-${index}`);
  if (['moving', 'stable', 'tilted'].includes(action)) emit(index, action, faces[index]);
  if (action === 'all') for (let i = 0; i < 5; i++) if (!capture.turn.round.held[i]) { emit(i, 'moving'); emit(i, 'stable', faces[i]); }
  if (action === 'export') {
   const data = { schema: 1, source: 'simulation', exportedAt: new Date().toISOString(), truncatedToLast: 500, events: capture.log };
   const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
   const link = document.createElement('a'); link.href = url; link.download = 'dice-capture-test.json'; link.click();
   setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  notice(''); render();
 } catch (error) { notice(error.message); }
});
document.addEventListener('visibilitychange', () => {
 if (document.hidden) { capture.pause('App moved to the background.'); render(); }
});
render();
