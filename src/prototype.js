import './styles.css';
import './clubhouse.css';
import './prototype.css';
import './ui/hosted-results.css';
import {renderHostedResults} from './ui/hosted-results.js';
import {renderTournamentBanner,renderTournamentStandings} from './ui/tournament.js';
import {renderResumeEntry} from './multiplayer/session-cards.js';
import { Capacitor } from '@capacitor/core';
import { AutomaticCapture } from './dice/automatic-capture.js';
import { celebration,celebrationMessage } from './game/celebrations.js';
import {pulseAccepted} from './ui/pulse.js';
import { getDiceStatus, subscribeDiceStatus, subscribeDiceEvents } from './dice/live-status.js';
import { BASE_KEYS, META } from './game/categories.js';
import { computeTotals } from './game/scoring.js';
import { MODES, createCoreGame, command, results, scoreOptions, rollLimit, rollAnalytics, filled, yahtzeePoints, undoableScore } from './game/core.js';
import { saveCore, loadCore, listCore } from './core-store.js';

const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => crypto.randomUUID();
let game=null,busy=false,reportedFace=0,pending=null;
const hardwareCapture=new AutomaticCapture();
let settleTimer=null,autoStarting=false;
let hardwareHeld=Array(5).fill(false),hardwareTurnId=null;
let noticeTimer, effectTimer, activeEffect=null;
let onlineRoom=null,onlineUserId=null,onlineConnected=false,localGame=null;
const isDiceHost=()=>!onlineRoom||onlineRoom.hostId===onlineUserId;
const sharedRolling=()=>onlineRoom&&game?.turn?.source==='godice'&&['rolling','paused'].includes(onlineRoom.liveDice?.phase);
let sharedDiceTimer=null,sharedDicePending=null,lastSharedDice='',lastSharedKey='';
const ownsSeat=seat=>!onlineRoom||onlineRoom.members[seat]?.userId===onlineUserId;
const tournamentPaused=()=>onlineRoom?.tournament?.status==='paused';
function ownUndoCandidate(){
 if(!game||onlineRoom&&onlineRoom.capabilities?.undoScore!==true)return null;
 const seat=onlineRoom?onlineRoom.members.findIndex(member=>member.userId===onlineUserId):undefined;
 if(seat===-1)return null;
 return undoableScore(game,seat);
}
function undoPanel(){
 const candidate=ownUndoCandidate();if(!candidate)return '';
 return `<section class="compact-start" aria-label="Undo latest score"><button class="all-scores" data-action="undo-last-score"${busy||tournamentPaused()||onlineRoom&&!onlineConnected?' disabled':''}>Undo last score · ${esc(META[candidate.category].name)}</button><span class="core-muted">${esc(game.players[candidate.seat].name)} · ${game.sheets[candidate.seat][candidate.category]} points · available before the next score</span></section>`;
}
function confirmUndoScore(){
 const candidate=ownUndoCandidate();if(!candidate||tournamentPaused()||onlineRoom&&!onlineConnected)throw Error('This score cannot be undone now.');
 openDialog(`<h2>Undo last score?</h2><p class="core-muted">Remove ${game.sheets[candidate.seat][candidate.category]} points from ${esc(game.players[candidate.seat].name)}’s ${esc(META[candidate.category].name)}. This reopens the category and returns the turn to ${esc(game.players[candidate.seat].name)} so they can choose their score again.</p><button class="bigbtn score core-primary" data-action="confirm-undo-score" data-target="${esc(candidate.id)}" data-seat="${candidate.seat}" data-game="${esc(game.id)}" data-revision="${game.revision}">Undo score · return turn</button><button class="all-scores" data-action="close">Keep the score</button>`);
}
let theme='dark';try{theme=localStorage.getItem('yz_theme')==='light'?'light':'dark';}catch{}
const descriptions={
  standard:'Three rolls. Extra Yahtzees add 100 and fill a category on the same turn using Joker placement.',
  competition:'Three rolls, or four while your final category is open. Extra Yahtzees add 100 and grant a fresh turn. One category ends a bonus chain.',
  accumulative:'Three rolls. Yahtzees of 1–6 score 100, 90, 80, 70, 60, 50. Each additional Yahtzee adds its face value and grants a fresh turn. A scored first Yahtzee is required.',
};
const competitionV2Description='Three rolls, or four while your final category is open. A qualifying Yahtzee on that final turn grants a bonus attempt of three rolls. Score the final category first; a qualifying repeat also adds 100 with that score. Each Yahtzee in an attempt adds 100 points and starts a fresh three-roll attempt. Three rolls without a Yahtzee end your bonus chain; other players still finish their turns.';
const rulesDescription=()=>game.mode==='competition'&&game.rules.version===2?competitionV2Description:descriptions[game.mode];
const setupDescription=(mode,source)=>mode==='competition'&&source==='manual'?competitionV2Description:descriptions[mode];
document.body.innerHTML='<div id="coreApp" class="device"></div><dialog id="coreDialog" class="core-dialog"></dialog><div id="gameCelebration" role="status" aria-live="polite"></div><div id="coreNotice" role="status" aria-live="polite"></div>';
const root=document.getElementById('coreApp'),dialog=document.getElementById('coreDialog');
function applyTheme(){document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0b141c':'#f3f6f5');}
applyTheme();
function notice(text){clearTimeout(noticeTimer);const box=document.getElementById('coreNotice');box.textContent=text;if(text==='Saved on this device.'||text==='Saved to the shared game.')noticeTimer=setTimeout(()=>{box.textContent='';},2500);if(dialog.open){let alert=dialog.querySelector('[role="alert"]');if(!alert){alert=document.createElement('p');alert.setAttribute('role','alert');dialog.append(alert);}alert.textContent=text;}}
function header(){return `<header class="compact-header"><span class="compact-logo">yahtzee<span>.</span></span><details class="game-menu"><summary aria-label="Game menu">Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Game actions"><button class="hbtn" data-action="online">Host / join online</button><button class="hbtn" data-action="new">New game</button><button class="hbtn" data-action="history">History</button>${game?'<button class="hbtn" data-action="analytics">Roll insights</button><button class="hbtn" data-action="rules">Game rules</button>':''}<button class="hbtn" data-action="export">Export</button><button class="hbtn" data-action="theme">${theme==='dark'?'Light':'Dark'} mode</button><button class="hbtn" data-action="connect-dice">Connect dice</button>${Capacitor.getPlatform()==='android'?'<button class="hbtn" data-action="camera-settings">Camera connection</button><button class="hbtn" data-action="camera-test">Dice identification test</button>':''}<a class="hbtn" href="?dice-lab=1">Dice lab</a><a class="hbtn" href="?legacy=1">Original game</a></nav></details></header>`;}
function newScreen(){
 root.classList.remove('playing');
 root.innerHTML=header()+`<main class="new-core"><div class="intro-kicker">YOUR TABLE. YOUR RULES.</div><h1>Make it a game.</h1><p class="core-muted">Local game · All players score on this device. Use Host / join online to play on separate phones.</p><button class="all-scores" data-action="online">Host / join online ↗</button>${Capacitor.getPlatform()==='android'?'<button class="all-scores" data-action="camera-test">Dice identification test</button>':''}<form id="createCore"><label>Game mode<select name="mode" id="modeSelect">${Object.entries(MODES).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')}</select></label><p id="modeDescription" class="core-muted">${descriptions.standard}</p><div class="core-form-row"><label>Players<select id="playerCount" name="count">${Array.from({length:8},(_,i)=>`<option ${i===1?'selected':''}>${i+1}</option>`).join('')}</select></label><label>Dice input<select name="source"><option value="manual">Manual scoring</option>${Capacitor.getPlatform()==='android'?'<option value="camera">C121 camera · review each roll</option>':''}${import.meta.env.MODE==='native-evaluation'||getDiceStatus().enabled?'<option value="godice">GoDice · Bluetooth dice</option>':''}</select></label></div><label class="game-option"><input type="checkbox" name="hideTotals"><span>Hide score totals until the end<small>Keep category scores visible; reveal totals when the game finishes.</small></span></label><div id="nameInputs"></div><button class="bigbtn score core-primary" type="submit">Create game</button>${game?'<button type="button" class="all-scores" data-action="resume">Back to current game</button>':''}</form><a class="core-legacy" href="?legacy=1">Open original two-player game &amp; existing saves</a></main>`;
 nameInputs(2);
 root.querySelector('.new-core h1').insertAdjacentHTML('afterend',renderResumeEntry({local:true}));
}
function nameInputs(n){const old=[...root.querySelectorAll('[name="player"]')].map(x=>x.value);root.querySelector('#nameInputs').innerHTML=Array.from({length:n},(_,i)=>`<label>Player ${i+1}<input name="player" aria-label="Player ${i+1} name" maxlength="24" required value="${esc(old[i]||['Dan','Amber','Sam'][i]||`Player ${i+1}`)}"></label>`).join('');}
function latest(){return game.turn?.rolls.filter(r=>!r.excluded).at(-1);}
function options(){
 if(onlineRoom&&!isDiceHost()&&sharedRolling())return null;
 if(game.turn?.source==='godice'&&hardwareCapture.capture){const preview=hardwareCapture.candidate();return preview?scoreOptions(game,preview.dice):null;}
 return ['simulated','godice','camera'].includes(game.turn?.source||game.source)?(latest()?scoreOptions(game,latest().dice):null):reportedFace?scoreOptions(game,Array(5).fill(reportedFace)):null;
}
function turnPanel(){
 if(game.finalChain)return finalChainPanel();
 if(game.status==='finished'){
  if(onlineRoom)return renderHostedResults({room:onlineRoom,userId:onlineUserId,connected:onlineConnected,busy});
  const r=results(game),title=r.solo?'Game complete':r.winners.length>1?'A shared victory':`${esc(game.players[r.winners[0]].name)} wins`;
  return `<section class="compact-result"><strong>${title}</strong><button class="hbtn" data-action="new">Play again</button></section>`;
 }
 const t=game.turn,opt=options();
 if((t?.source||game.source)==='camera')return `<section class="dice-controls"><p>Camera · ${t?`${game.turn.rolls.filter(r=>!r.excluded).length}/${t.limit} rolls recorded`:'Start your turn before capturing.'}</p>${t?`<button class="hbtn" data-action="capture-camera" ${t.rolls.filter(r=>!r.excluded).length>=t.limit?'disabled':''}>Capture / review dice</button>`:'<button class="hbtn" data-action="start-camera">Start camera turn</button>'}${t&&latest()?'<button class="hbtn" data-action="edit-hardware">Correct confirmed dice</button><button class="hbtn" data-action="discard-roll">Exclude last roll</button>':''}${t?'<button class="hbtn" data-action="fallback">Finish manually</button>':''}</section>`;
 if(t?.source==='godice')return '<section id="hardwareCapture" class="dice-controls"></section>';
 if(!t&&game.source==='godice')return getDiceStatus().enabled?'':'<div class="compact-start"><span>Connect five GoDice to start playing.</span><button class="hbtn" data-action="connect-dice">Connect dice</button></div>';
 if((t?.source||game.source)==='manual')return reportedFace?`<div class="joker-status"><span>${opt?.extraTurn?'Bonus ready · use the Yahtzee + button':`Joker scoring${opt?.bonus?' · +100 bonus':''}`}</span><button class="hbtn" data-action="cancel-joker">Cancel</button></div>`:'';
 if(!t)return '<div class="compact-start"><button class="hbtn" data-action="start-manual">Start manual turn</button></div>';
 return '<div class="compact-start"><span>Resume saved test turn</span><button class="hbtn" data-action="fallback">Finish this turn manually</button></div>';
}
function finalChainPanel(){
 const chain=game.finalChain,seat=chain.seat,name=esc(game.players[seat].name);
 const rolls=game.turn?.phase==='final-bonus'?game.turn.manualRolls?.length||0:0;
 const own=ownsSeat(seat),enabled=own&&!busy&&!tournamentPaused()&&(!onlineRoom||onlineConnected);
 return `<section class="dice-controls final-chain-panel" aria-labelledby="finalChainTitle"><h2 id="finalChainTitle">Final Yahtzee bonus</h2><p class="core-muted">${name} · Attempt ${chain.attempt} · ${3-rolls} ${3-rolls===1?'roll':'rolls'} remaining</p><p class="core-muted">Roll the dice, then confirm the result here. A Yahtzee adds 100 and gives you three fresh rolls. Three rolls without one end this player’s turn.</p>${own?`<div class="countgrid" aria-label="Report a bonus Yahtzee">${[1,2,3,4,5,6].map(face=>`<button class="countbtn" data-action="final-chain-outcome" data-face="${face}"${enabled?'':' disabled'}><span class="n">${face}s</span><span class="v">Five ${face}s · +100</span></button>`).join('')}</div><button class="all-scores" data-action="final-chain-outcome" data-face="0"${enabled?'':' disabled'}>No Yahtzee · record roll ${rolls+1} of 3</button>`:`<p role="status">Waiting for ${name} to report their bonus roll.</p>`}<p class="core-muted">${tournamentPaused()?'Tournament paused. Progress is saved.':onlineRoom&&!onlineConnected?'Reconnecting. Wait for the table to sync.':'Manual results are player reported; your scorecard categories stay filled.'}</p></section>`;
}
function confirmFinalChainOutcome(face){
 if(!game.finalChain||!ownsSeat(game.finalChain.seat)||tournamentPaused()||(onlineRoom&&!onlineConnected))throw Error('Wait for your active bonus attempt before reporting a roll.');
 const rolls=game.turn?.phase==='final-bonus'?game.turn.manualRolls?.length||0:0;
 const success=face!==null;
 openDialog(`<h2>${success?'Confirm bonus Yahtzee':'Confirm no Yahtzee'}</h2><p class="core-muted">${success?`Five ${face}s · add 100 points and start a fresh three-roll attempt.`:rolls===2?'This is the third roll without a Yahtzee. End your bonus chain; other players still finish their turns.':`Record roll ${rolls+1} without a Yahtzee. You will still have ${2-rolls} ${2-rolls===1?'roll':'rolls'} in this attempt.`}</p><button class="bigbtn score core-primary" data-action="confirm-final-chain" data-face="${face??0}" data-game="${esc(game.id)}" data-revision="${game.revision}" data-attempt="${game.finalChain.attempt}">${success?'Add 100 · three fresh rolls':'Confirm this roll'}</button><button class="all-scores" data-action="close">Cancel · keep rolling</button>`);
}
function scoreCell(key, seat) {
 const value=game.sheets[seat][key], name=esc(game.players[seat].name), category=META[key].name;
 const attrs=`data-score-key="${key}" data-score-seat="${seat}"`;
 if(value!==undefined){
  const label=`${name} ${category}: ${value===0?'scratched, zero points':`${value} points`}`;
  const content=value===0?'<span aria-hidden="true">×</span>':value;
  const classes=`recorded-score ${value===0?'scratched-score':''}`;
  return `<td ${attrs}>${onlineRoom&&!ownsSeat(seat)?`<span class="${classes}" aria-label="${label}">${content}</span>`:`<button class="${classes}" data-action="edit" data-key="${key}" data-seat="${seat}" aria-label="Edit ${label}">${content}</button>`}</td>`;
 }
 const opt=options(),active=game.status==='active'&&seat===game.activeSeat&&ownsSeat(seat)&&(!onlineRoom||onlineConnected);
 const ready=active&&((game.turn?.source||game.source)==='manual'||!!latest())&&!hardwareCapture.capture&&!sharedRolling();
 const allowed=ready&&!opt?.extraTurn&&(!opt||key in opt.scores);
 const sharedTurn=onlineRoom&&game.turn?.source==='godice'&&seat===game.activeSeat&&onlineConnected;
 if(!active&&!sharedTurn)return `<td class="empty-score" ${attrs}><span class="score-placeholder" aria-label="${name} ${category}: open"></span></td>`;
 const preview=active&&!!hardwareCapture.candidate();
 const suggestion=opt?.scores[key];
 const match=(allowed||((preview||sharedTurn)&&!opt?.extraTurn))&&suggestion>0&&['godice','simulated','camera'].includes(game.turn?.source||game.source);
 const special=match&&['fullHouse','smallStraight','largeStraight','yahtzee'].includes(key);
 return `<td class="active-score" ${attrs}><button class="empty-score-button ${suggestion>0?'suggested-score':''} ${match?'roll-match':''} ${special?'roll-match-special':''}" style="--match-delay:${BASE_KEYS.indexOf(key)*45}ms" data-action="choose" data-key="${key}" aria-label="Score ${name} ${category}${suggestion!==undefined?`, ${match?'roll matches, ':''}suggested ${suggestion} points${preview?', confirm roll to score':''}`:''}" ${allowed?'':'disabled'}>${suggestion!==undefined?`<span class="score-suggestion">${suggestion}<small>${match?(preview?'PREVIEW':'MATCH'):suggestion===0?'scratch':'suggested'}</small></span>`:'+'}</button></td>`;
}
function bonusCell(seat) {
 const sheet=game.sheets[seat],opt=options();
 const manual=(game.turn?.source||game.source)==='manual';
 const active=!game.finalChain&&game.status==='active'&&seat===game.activeSeat&&ownsSeat(seat)&&(!onlineRoom||onlineConnected)&&sheet.yahtzee!==undefined;
 const ready=!hardwareCapture.capture&&!sharedRolling()&&(manual||opt?.combinations.yahtzee);
 return `<td>${active?`<button class="add-yahtzee" data-action="another-yahtzee" aria-label="Add another Yahtzee for ${esc(game.players[seat].name)}; bonus total ${sheet.yahtzeeBonus||0}" ${ready?'':'disabled'}>${sheet.yahtzeeBonus?`<span class="bonus-total">${sheet.yahtzeeBonus}</span>`:'<span>Yahtzee</span>'}<span class="bonus-plus" aria-hidden="true">+</span></button>`:sheet.yahtzeeBonus?`<span class="bonus-total">${sheet.yahtzeeBonus}</span>`:'—'}</td>`;
}
function anotherYahtzee(){
 if(game.finalChain)return;
 if(hardwareCapture.capture)return;
 const sheet=game.sheets[game.activeSeat];
 if(game.status!=='active'||sheet.yahtzee===undefined)return;
 if(['simulated','godice','camera'].includes(game.turn?.source||game.source)){
  if(!options()?.combinations.yahtzee)return;
  return declareYahtzee(latest().dice[0]);
 }
 const standard=game.mode==='standard';
 openDialog(`<h2>${standard?(sheet.yahtzee>0?'Yahtzee bonus · +100':'Yahtzee · Joker scoring'):'Another Yahtzee!'}</h2><p class="core-muted">${esc(game.players[game.activeSeat].name)}${standard?' · Choose the matching dice to find the required scoring category. The face does not change the bonus.':' · Which face did you roll five of?'}</p><div class="countgrid">${[1,2,3,4,5,6].map(n=>`<button class="countbtn" data-action="repeat-face" data-face="${n}"><span class="n">${n}s</span><span class="v">Five ${n}s</span></button>`).join('')}</div><p class="core-muted">${sheet.yahtzee===0?'Your first Yahtzee was marked zero: Joker placement applies, with no bonus.':game.rules.extraTurn?'Confirm the bonus to take a fresh extra turn.':'Fill the matching upper category if it is open; otherwise use Joker placement. Save the category and +100 together. No extra turn.'}</p>`);
}
function declareYahtzee(face){
 reportedFace=face;dialog.close();render();
 const opt=options();
 if(opt.extraTurn){
  openDialog(`<h2>Yahtzee · +${opt.bonus}</h2><p class="core-muted">Five ${face}s. Add the bonus and take a fresh extra turn. Your original Yahtzee score stays unchanged.</p><button class="bigbtn score core-primary" data-action="confirm-another">Add ${opt.bonus} &amp; take extra turn</button>`);
  dialog.dataset.bonusConfirmation='true';
 }else{
  notice(opt.bonus?'Choose a highlighted category. Your 100-point bonus will be saved with it.':'Choose a highlighted category using Joker placement. No bonus is awarded.');
  const keys=Object.keys(opt.scores);if(keys.length===1)choose(keys[0]);
 }
}
function render(){
 if(!game){newScreen();return;}
 root.classList.add('playing');
 root.style.setProperty('--turn-hue',[162,267,205,24,48,332,185,232][game.activeSeat]);
 hardwareCapture.sync(game,getDiceStatus());
 if(hardwareTurnId!==game.turn?.id){hardwareTurnId=game.turn?.id;hardwareHeld=Array(5).fill(false);}
 const totals=results(game).totals,active=game.status==='active';
 root.innerHTML=header()+`<div class="game-strip"><span class="turn-indicator">${active?`${esc(game.players[game.activeSeat].name)} to play`:'Game complete'}</span><span>${onlineRoom?(onlineConnected?'Online · '+onlineRoom.code:'Reconnecting…'):`${esc(game.rules.name)} · ${(game.turn?.source||game.source)==='godice'?'GoDice':(game.turn?.source||game.source)==='camera'?'Camera':'Manual'}`}</span></div><main class="compact-game" aria-label="Game scorecard"><div id="liveDiceStatus"></div>${turnPanel()}<div class="score-table-wrap"><table class="core-score-table"><thead><tr><th scope="col"><span class="category-heading">Scorecard</span></th>${game.players.map((p,i)=>`<th scope="col" class="player-heading ${active&&game.activeSeat===i?'current-player':''}"><span class="player-name">${esc(p.name)}</span>${game.hideTotals&&active?'<span class="hidden-total">Total hidden</span>':`<strong>${totals[i]}</strong>`}<small class="seat-status">${active?(game.activeSeat===i?(ownsSeat(i)?'YOUR TURN':'PLAYING'):'WAITING'):(results(game).winners.includes(i)?(results(game).solo?'COMPLETE':'WINNER'):'FINISHED')}</small><small>${onlineRoom&&ownsSeat(i)?'You · ':''}${filled(game.sheets[i])}/13</small></th>`).join('')}</tr></thead><tbody>${BASE_KEYS.map(k=>`<tr><th scope="row" class="${active&&game.sheets[game.activeSeat][k]!==undefined?'category-filled':''}">${META[k].name}</th>${game.players.map((p,i)=>scoreCell(k,i)).join('')}</tr>`).join('')}<tr class="summary-row"><th scope="row">Upper bonus</th>${game.sheets.map(s=>`<td>${computeTotals(s).bonus}</td>`).join('')}</tr><tr class="summary-row"><th scope="row">Yahtzee bonuses</th>${game.players.map((p,i)=>bonusCell(i)).join('')}</tr></tbody></table></div></main>`;
 if(onlineRoom?.tournament){
  root.querySelector('main').insertAdjacentHTML('afterbegin',renderTournamentBanner(onlineRoom,onlineUserId,{connected:onlineConnected,busy}));
  if(tournamentPaused())root.querySelectorAll('.core-score-table button').forEach(button=>{button.disabled=true;});
  if(tournamentPaused())root.querySelector('.turn-indicator').textContent='Tournament paused';
 }
 const undo=undoPanel();if(undo)root.querySelector('main').insertAdjacentHTML('afterbegin',undo);
 root.querySelectorAll('.core-score-table tr').forEach(row=>{
  [...row.children].slice(1).forEach((cell,seat)=>{
   cell.classList.toggle('turn-column',active&&seat===game.activeSeat);
   cell.classList.toggle('waiting-column',active&&seat!==game.activeSeat);
   cell.classList.toggle('winner-column',!active&&results(game).winners.includes(seat));
  });
 });
 updateDiceStatus();
 updateHardwarePanel();
 applyScorePulse();
 const wrap=root.querySelector('.score-table-wrap'),head=root.querySelector('.current-player');
 if(head){const fixed=root.querySelector('.core-score-table th').offsetWidth;wrap.scrollLeft=Math.max(0,head.offsetLeft-fixed);}
}
function ensureAutomaticTurn(){
 const status=getDiceStatus();
 if(autoStarting||busy||onlineRoom||game?.status!=='active'||game.source!=='godice'||game.turn||status.paused||status.dice.length!==5||status.dice.some(d=>!d.connected))return;
 autoStarting=true;
 void send({type:'start',source:'godice'}).catch(e=>notice(e.message)).finally(()=>{autoStarting=false;});
}
function updateDiceStatus(){
 const box=root.querySelector('#liveDiceStatus');if(!box)return;
 const status=getDiceStatus();hardwareCapture.sync(game,status);
 if(game?.turn?.source==='godice'){box.replaceChildren();updateHardwarePanel();queueSharedDice();return;}
 if(!status.enabled){box.replaceChildren();return;}
 const count=status.dice.filter(d=>d.connected).length;
 box.innerHTML=`<section class="live-dice-status"><div><strong>GoDice · ${count}/5 connected</strong><button class="hbtn" data-action="connect-dice">Manage dice</button></div><small>${onlineRoom?'Shared games currently use manual scoring.':count!==5?'Connect exactly five dice to play.':status.paused?'Return to the app to play.':'Dice ready.'}</small>${!onlineRoom&&game?.status==='active'&&!game.turn&&game.source!=='godice'?`<button class="all-scores" data-action="start-hardware" ${count===5&&!status.paused?'':'disabled'}>Start GoDice turn</button>`:''}</section>`;
 queueMicrotask(ensureAutomaticTurn);
}
subscribeDiceStatus(updateDiceStatus);
function sharedDiceSnapshot(){
 const status=getDiceStatus(),round=hardwareCapture.capture?.turn?.round;
 const connected=status.dice.filter(d=>d.connected).length;
 return {type:'dice-state',turnId:game.turn.id,gameRevision:game.revision,
  phase:status.paused||connected!==5||hardwareCapture.capture?.turn?.paused?'paused':round?'rolling':latest()?'settled':'ready',
  faces:round?.faces.map((face,i)=>face??hardwareCapture.readings.get(hardwareCapture.hardware[i]?.id)?.face??null)||latest()?.dice||Array(5).fill(null),
  moving:Array.from({length:5},(_,i)=>!!round&&hardwareCapture.capture.devices.get(hardwareCapture.hardware[i]?.id)?.state==='moving'),connected:Math.min(5,connected)};
}
function queueSharedDice(){
 if(!onlineRoom||!isDiceHost()||game?.turn?.source!=='godice'||sharedDiceTimer||sharedDicePending)return;
 const key=`${onlineRoom.id}/${game.turn.id}/${game.revision}`;
 if(key!==lastSharedKey){lastSharedKey=key;lastSharedDice='';}
 const snapshot=sharedDiceSnapshot();if(JSON.stringify(snapshot)===lastSharedDice)return;
 sharedDiceTimer=setTimeout(async()=>{
  sharedDiceTimer=null;
  if(!onlineRoom||!isDiceHost()||game?.turn?.source!=='godice')return;
  const snapshot=sharedDiceSnapshot(),serialized=JSON.stringify(snapshot);
  try{
   const {sendHostState}=await import('./multiplayer/ui.js');
   sharedDicePending=sendHostState(snapshot);
   if(await sharedDicePending)lastSharedDice=serialized;
  }catch(e){notice(`Dice sync paused: ${e.message}`);}
  finally{sharedDicePending=null;if(onlineConnected)queueSharedDice();}
 },350);
}
function scheduleAutomaticRoll(){
 clearTimeout(settleTimer);
 if(hardwareCapture.candidate())settleTimer=setTimeout(async()=>{
  if(busy||dialog.open||document.querySelector('.dice-connection-dialog[open]'))return;
  if(onlineRoom){if(!isDiceHost()||!onlineConnected)return;try{await sharedDicePending;}catch{return;}}
  hardwareCapture.sync(game,getDiceStatus());
  if(!hardwareCapture.candidate())return;
  try{await send(hardwareCapture.action(game));}catch(e){notice(e.message);}
 },900);
}
subscribeDiceEvents(event=>{
 if(busy||(onlineRoom&&(!isDiceHost()||!onlineConnected))||!game||!root.querySelector('#hardwareCapture')||(dialog.open&&!dialog.querySelector('[data-face-override]'))||document.querySelector('.dice-connection-dialog[open]'))return;
 hardwareCapture.receiveFor(game,getDiceStatus(),event);
 updateHardwarePanel();
 if(event.kind==='raw')return;
 queueSharedDice();
 scheduleAutomaticRoll();
});
function updateHardwarePanel(){
 const box=root.querySelector('#hardwareCapture');if(!box||game.turn?.source!=='godice')return;
 if(onlineRoom&&!isDiceHost()){
  const live=onlineRoom.liveDice,last=latest(),rolls=game.turn.rolls.filter(r=>!r.excluded);
  const current=live?.turnId===game.turn.id,phase=current?live.phase:'ready';
  const faces=current?live.faces:last?.dice||Array(5).fill(null);
  const canCorrect=ownsSeat(game.activeSeat)&&last&&!sharedRolling()&&onlineConnected;
  box.innerHTML=`<div class="hardware-heading"><strong>${esc(game.players[game.activeSeat].name)} · Roll ${rolls.length}/${game.turn.limit}</strong><small>Host dice · ${current?live.connected:0}/5</small></div><div class="core-dice">${faces.map((face,i)=>`<label>Die ${i+1}<button type="button" class="capture-face ${current&&live.moving[i]?'dice-shuffling':''}" ${canCorrect?`data-die-override="${i}"`:'disabled'}>${current&&live.moving[i]?'⚄':face??'—'}</button></label>`).join('')}</div><p class="core-muted" role="status">${!onlineConnected?'Reconnecting to your table…':phase==='paused'?'Host dice paused. Ask the host to check the connection.':phase==='rolling'?'Dice moving or settling on the host…':last?(ownsSeat(game.activeSeat)?'Choose a glowing score, or reroll the dice.':'Waiting for the active player to choose a score.'):'Roll all five dice connected to the host.'}</p>${canCorrect?'<small class="dice-menu-hint" tabindex="0" role="button" data-dice-menu>Hold a die to correct · hold this area for turn controls</small>':''}`;
  return;
 }
 // Refresh only score buttons: keep column styling, scroll position and unchanged animations.
 for(const key of BASE_KEYS){
  const cell=root.querySelector(`[data-score-key="${key}"][data-score-seat="${game.activeSeat}"]`);
  if(!cell||game.sheets[game.activeSeat][key]!==undefined)continue;
  const row=document.createElement('tr');row.innerHTML=scoreCell(key,game.activeSeat);
  const html=row.firstElementChild.innerHTML;if(cell.innerHTML!==html)cell.innerHTML=html;
 }
 const capture=hardwareCapture.capture,round=capture?.turn?.round,last=latest(),rolls=game.turn.rolls.filter(r=>!r.excluded),status=getDiceStatus(),candidate=hardwareCapture.candidate();
 const faces=round?.faces||last?.dice||Array(5).fill(null);
 const problem=capture?.turn?.paused||(round?.invalid.size?'A held die moved. Cancel this capture and release that die.':'');
 const count=status.dice.filter(d=>d.connected).length;
 const ready=count===5&&status.dice.length===5&&!status.paused;
 box.innerHTML=`<div class="hardware-heading"><strong>${esc(game.players[game.activeSeat].name)} · Roll ${rolls.length}/${game.turn.limit}</strong><button class="hbtn" data-action="connect-dice">Dice · ${count}/5</button></div><div class="core-dice">${faces.map((face,i)=>{
  const reading=hardwareCapture.readings.get(hardwareCapture.hardware[i]?.id);
  const moving=round&&!problem&&capture.devices.get(hardwareCapture.hardware[i]?.id)?.state==='moving';
  const check=round&&face===null&&Number.isInteger(reading?.face)&&reading.face>=1&&reading.face<=6&&reading.kind!=='moving';
  const shown=face??(check?reading.face:null);
  return `<label>Die ${i+1}<button type="button" data-die-override="${i}" class="capture-face ${moving?'dice-shuffling':''} ${check?'die-needs-check':''}" aria-label="Die ${i+1}: ${moving?'moving':ready?shown??'unknown':'unavailable'}${check?', needs checking':''}. Hold to correct" style="--die-delay:${i*85}ms">${moving?'⚄':ready?shown??'—':'—'}${check?'<small>CHECK</small>':''}</button></label>`;
 }).join('')}</div><p class="core-muted" role="status">${!ready?'Play paused. Connect exactly five dice and keep the app open.':problem|| (candidate?'Settled · checking the roll…':round?'Waiting for settled faces. Hold a die marked CHECK to confirm or correct it.':rolls.length>=game.turn.limit?'Roll limit reached. Choose your score.':last?'Choose your score, or pick up any dice and roll again.':'Roll all five dice to begin.')}</p><small class="dice-menu-hint" tabindex="0" role="button" data-dice-menu>Hold this area for roll controls · hold a die to correct</small>${options()?.extraTurn&&!capture&&ownsSeat(game.activeSeat)?'<button class="bigbtn score core-primary" data-action="bonus">Record bonus Yahtzee</button>':''}`;
}
function applyScorePulse(){
 if(!activeEffect||activeEffect.gameId!==game?.id)return;
 const {seat,category}=activeEffect;
 root.querySelector(`[data-score-key="${category}"][data-score-seat="${seat}"]`)?.classList.add('score-pop');
}
function openDiceMenu(index=null){
 if(busy||game?.turn?.source!=='godice')return;
 if(onlineRoom&&!isDiceHost()&&(!ownsSeat(game.activeSeat)||!onlineConnected||sharedRolling()))return;
 clearTimeout(settleTimer);
 if(index===null){
  openDialog(`<h2>Roll controls</h2>${hardwareCapture.capture?'<button class="all-scores" data-action="cancel-hardware">Reset this roll</button>':''}<button class="all-scores" data-action="fallback">Finish this turn manually</button>`);
 }else{
  if(!hardwareCapture.capture&&!latest()){notice('Roll the dice first, then hold a face to correct it.');return;}
  openDialog(`<h2>Die ${index+1}</h2><p class="core-muted">Confirm or correct the face you can see. The original reading stays in the history.</p><div class="countgrid">${[1,2,3,4,5,6].map(face=>`<button class="countbtn" data-action="override-face" data-face-override="${index}" data-value="${face}" data-revision="${game.revision}" data-turn="${esc(game.turn.id)}"><span class="n">${face}</span></button>`).join('')}</div>`);
 }
}
let dicePress=null;
const cancelDicePress=()=>{if(dicePress)clearTimeout(dicePress.timer);dicePress=null;};
root.addEventListener('pointerdown',event=>{
 const area=event.target.closest('#hardwareCapture');if(!area||event.button!==0)return;
 const die=event.target.closest('[data-die-override]');
 if(!die&&event.target.closest('button'))return;
 cancelDicePress();const index=die?Number(die.dataset.dieOverride):null;
 dicePress={x:event.clientX,y:event.clientY,timer:setTimeout(()=>{dicePress=null;openDiceMenu(index);},600)};
});
root.addEventListener('pointermove',event=>{if(dicePress&&Math.hypot(event.clientX-dicePress.x,event.clientY-dicePress.y)>10)cancelDicePress();});
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,cancelDicePress);
root.addEventListener('contextmenu',event=>{if(event.target.closest('#hardwareCapture')){event.preventDefault();cancelDicePress();const die=event.target.closest('[data-die-override]');openDiceMenu(die?Number(die.dataset.dieOverride):null);}});
root.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.matches('[data-die-override],[data-dice-menu]')){event.preventDefault();openDiceMenu(event.target.matches('[data-die-override]')?Number(event.target.dataset.dieOverride):null);}});
dialog.addEventListener('close',scheduleAutomaticRoll);
function celebrate(previous,next){
 const pulseId=next.id,pulseRevision=next.revision;
 queueMicrotask(()=>{if(game?.id===pulseId&&game.revision===pulseRevision)pulseAccepted(root,previous,next);});
 if(previous?.id===next.id){
  const seen=new Set(previous.events.map(event=>event.id));
  if(next.events.some(event=>event.type==='score-undo'&&!seen.has(event.id))){clearTimeout(effectTimer);activeEffect=null;const box=document.getElementById('gameCelebration');box.replaceChildren();box.className='';root.querySelectorAll('.score-pop').forEach(cell=>cell.classList.remove('score-pop'));return;}
 }
 const effect=celebration(previous,next);if(!effect)return;
 clearTimeout(effectTimer);activeEffect={...effect,gameId:next.id};applyScorePulse();
 const box=document.getElementById('gameCelebration');box.replaceChildren();box.className='';
 if(effect.kind!=='score'){
  const name=next.players[effect.seat].name;
  const {title,subtitle:detail}=celebrationMessage(effect,next);
  box.className=`celebration celebration-${effect.kind}`;
  const headline=document.createElement('strong');headline.textContent=title;box.append(headline);
  const subtitle=document.createElement('span');subtitle.textContent=detail;if(effect.upperBonus&&effect.kind!=='upper-bonus')subtitle.textContent+=` · ${name} also earns the +35 upper bonus!`;box.append(subtitle);
  const decorations=document.createElement('div');decorations.className='celebration-particles';decorations.setAttribute('aria-hidden','true');
  for(let i=0;i<(effect.kind==='straight'?5:12);i++){const particle=document.createElement('i');particle.style.setProperty('--i',i);particle.textContent=effect.kind==='straight'?String(i+1):'✦';decorations.append(particle);}box.append(decorations);
 }
 effectTimer=setTimeout(()=>{activeEffect=null;box.replaceChildren();box.className='';root.querySelectorAll('.score-pop').forEach(cell=>cell.classList.remove('score-pop'));},3200);
}
function showRules(){openDialog(`<h2>${esc(game.rules.name)} rules · version ${game.rules.version}</h2><p class="core-muted">Score totals: ${game.hideTotals?'hidden until the game ends':'visible during play'}.</p><p class="core-muted">${rulesDescription()}</p><p class="core-muted">Tap + in your column to score. Tap a recorded score to correct it. A scratched first Yahtzee earns no bonus; Joker placement still applies.</p><p class="core-muted">Corrections change category points without rewriting historical turns or granted bonuses. Suggested points are only saved when confirmed.</p>`);}
async function persist(next){
 busy=true;root.setAttribute('inert','');
 try{const saved=await saveCore(next);const previous=game;game=next;reportedFace=0;render();celebrate(previous,next);notice(saved?.recoveryOnly?'Saved in recovery storage. Keep this browser’s data until database access returns.':'Saved on this device.');}
 catch(e){notice(`Save failed: ${e.message}. Retry before continuing.`);throw e;}
 finally{busy=false;root.removeAttribute('inert');if(game)render();queueMicrotask(ensureAutomaticTurn);}
}
async function send(action,commandId){
 if(busy)throw Error('Wait for the current save before submitting another action.');
 if(tournamentPaused())throw Error('The tournament is paused. Ask the host to resume.');
 if(onlineRoom){
  busy=true;root.setAttribute('inert','');
  try{const {sendOnline}=await import('./multiplayer/ui.js');await sendOnline(action,onlineRoom.revision);reportedFace=0;render();notice('Saved to the shared game.');}
  finally{busy=false;root.removeAttribute('inert');render();queueMicrotask(ensureAutomaticTurn);}
  return;
 }
 const base=!game.turn&&game.source==='manual'&&['score','bonus','final-chain-roll'].includes(action.type)
  ?command(game,{type:'start',seat:game.activeSeat},{id:id()}):game;
 await persist(command(base,{seat:base.activeSeat,...action},{id:commandId||id()}));
}
function openDialog(html){delete dialog.dataset.bonusConfirmation;dialog.innerHTML=`<button class="sheet-close" data-action="close" aria-label="Close panel">×</button>${html}`;dialog.showModal();}
async function openMultiplayer(joinCode='',view='home'){
 if(!onlineRoom)localGame=game;
 dialog.close();pending=null;reportedFace=0;
 const {openOnline}=await import('./multiplayer/ui.js');
 await openOnline(root,{
  notice,
  exit(){game=localGame;onlineRoom=null;onlineUserId=null;onlineConnected=false;render();},
  game(room,userId,connected,changed){
   const gameChanged=game?.id!==room.game?.id||game?.revision!==room.game?.revision;
   const beganRolling=room.liveDice?.phase==='rolling'&&onlineRoom?.liveDice?.phase!=='rolling';
   if(changed&&!busy&&(gameChanged||(beganRolling&&room.hostId!==userId)||room.tournament?.status==='paused')){const choosing=dialog.open||reportedFace;dialog.close();pending=null;reportedFace=0;if(choosing)notice('The shared game updated. Choose your score again.');}
   const redraw=changed||!onlineConnected;
   const previous=onlineRoom?.code===room.code?game:null;
   onlineRoom=room;onlineUserId=userId;onlineConnected=connected;game=room.game;
   if(redraw){render();celebrate(previous,game);}
  },
  connection(connected){onlineConnected=connected;if(onlineRoom)render();},
 },joinCode,view);
}
function cancelBonus(){if(dialog.dataset.bonusConfirmation){delete dialog.dataset.bonusConfirmation;reportedFace=0;render();}}
dialog.addEventListener('cancel',cancelBonus);
function choose(key,seat=null){
 const editing=seat!==null,c=META[key],opt=editing?null:options();
 const undone=new Set(game.events.filter(e=>e.type==='score-undo').map(e=>e.target));
 pending={category:key,seat:editing?seat:game.activeSeat,target:editing?[...game.events].reverse().find(e=>e.type==='score'&&e.seat===seat&&e.category===key&&!undone.has(e.id))?.id:null};
 let body;
 if(opt) body=`<button class="bigbtn score core-primary" data-action="confirm-score" data-value="${opt.scores[key]}">Confirm ${opt.scores[key]} points</button>${!opt.joker&&opt.scores[key]>0?'<button class="all-scores" data-action="confirm-score" data-value="0">Mark 0 · bad roll</button>':''}`;
 else if(c.face)body=`<div class="countgrid">${[1,2,3,4,5,0].map(n=>`<button class="countbtn" data-action="confirm-score" data-value="${n*c.face}"><span class="n">${n||'X'}</span><span class="v">${n?`${n*c.face} points`:'Mark zero'}</span></button>`).join('')}</div>`;
 else if(key==='yahtzee'&&game.rules.weighted)body=`<p class="core-muted">Which face made the Yahtzee?</p><div class="countgrid">${[1,2,3,4,5,6].map(n=>`<button class="countbtn" data-action="confirm-score" data-value="${yahtzeePoints(game.rules,n)}" data-face="${n}"><span class="n">${n}s</span><span class="v">${yahtzeePoints(game.rules,n)} points</span></button>`).join('')}</div><button class="all-scores" data-action="confirm-score" data-value="0">Mark 0 · bad roll</button>`;
 else if(c.type==='fixed')body=`<button class="bigbtn score core-primary" data-action="confirm-score" data-value="${c.value}">Score ${c.value}</button><button class="all-scores" data-action="confirm-score" data-value="0">Mark 0 · bad roll</button>`;
 else body=`<label>Dice total (0–30)<input id="manualTotal" type="number" inputmode="none" readonly min="0" max="30" step="1" placeholder="—" value="${editing?game.sheets[seat][key]:''}"></label><div class="score-keypad" aria-label="Score keypad">${[1,2,3,4,5,6,7,8,9,'clear',0,'backspace'].map(n=>`<button data-action="keypad" data-key="${n}" aria-label="${n==='clear'?'Clear total':n==='backspace'?'Delete last digit':n}">${n==='clear'?'Clear':n==='backspace'?'⌫':n}</button>`).join('')}</div><button class="bigbtn score core-primary" data-action="confirm-total">Save score</button><button class="all-scores" data-action="confirm-score" data-value="0">Mark 0 · bad roll</button>`;
 const undo=editing&&ownUndoCandidate()?.id===pending.target?`<button class="all-scores" data-action="undo-last-score"${tournamentPaused()||onlineRoom&&!onlineConnected?' disabled':''}>Undo this score · reopen category and return turn</button>`:'';
 openDialog(`<h2>${editing?'Correct ':''}${c.name}</h2><p class="core-muted">${esc(game.players[pending.seat].name)}${editing?' · turn order stays unchanged':opt?.bonus&&!opt.extraTurn?` · +${opt.bonus} Yahtzee bonus included with this score`:''}</p>${body}${undo}`);
}
async function showOnlineInvitation(){
 const {onlineInvitation}=await import('./multiplayer/ui.js');const invitation=onlineInvitation();
 openDialog(`<h2>${esc(invitation.tournamentName||'Your table')} invitation</h2><p class="core-muted">Hosted by ${esc(invitation.hostName)}. This link returns to this same saved table.</p><div class="mp-qr"><canvas id="savedTableQr" role="img" aria-label="Scan to return to this saved game"></canvas></div><strong class="mp-room-code">${esc(invitation.code.slice(0,4))} ${esc(invitation.code.slice(4))}</strong><label>Invitation link<input readonly value="${esc(invitation.url)}" aria-label="Invitation link"></label><button class="all-scores" data-action="copy-saved-invitation">Copy invitation link</button><p class="core-muted">Sign in with the same account. Return via Saved games &amp; tournaments, Your tournaments, or scan this link. If paused, the host resumes; play continues at the current turn. Existing players keep their seat and scores.</p>`);
 dialog.dataset.invitationCode=invitation.code;
 const canvas=dialog.querySelector('#savedTableQr');const {default:QRCode}=await import('qrcode');
 if(!dialog.open||dialog.querySelector('#savedTableQr')!==canvas)return;
 try{await QRCode.toCanvas(canvas,invitation.url,{width:208,margin:3,errorCorrectionLevel:'M',color:{dark:'#102029',light:'#ffffff'}});}catch{if(dialog.open&&dialog.querySelector('#savedTableQr')===canvas)notice('QR unavailable. Copy the invitation link instead.');}
}
function diceInput(){return [...root.querySelectorAll('.die-value')].map(s=>Number(s.value));}
function keypad(key){
 const field=dialog.querySelector('#manualTotal');if(!field)return;
 if(key==='clear')field.value='';
 else if(key==='backspace')field.value=field.value.slice(0,-1);
 else if(/^\d$/.test(key)){
  const next=(field.value+key).replace(/^0+(?=\d)/,'');
  if(Number(next)>30){notice('The dice total must be between 0 and 30.');return;}
  field.value=next;
 }
 dialog.querySelector('[role="alert"]')?.remove();
}
dialog.addEventListener('keydown',e=>{
 if(!dialog.querySelector('#manualTotal')||busy)return;
 if(/^\d$/.test(e.key)||['Backspace','Delete'].includes(e.key)){
  e.preventDefault();keypad(e.key==='Backspace'?'backspace':e.key==='Delete'?'clear':e.key);
 }else if(e.key==='Enter'&&e.target.id==='manualTotal'){
  e.preventDefault();dialog.querySelector('[data-action="confirm-total"]').click();
 }
});
async function showHistory(){
 if(onlineRoom){const {onlineHistory}=await import('./multiplayer/ui.js');const all=await onlineHistory();openDialog(`<h2>This table’s games</h2><p class="core-muted">Each game keeps its players, scores and scoring order. Export includes their complete accepted histories.</p>${all.map(g=>`<article class="history-row"><strong>${esc(g.rules.name)} · ${esc(g.status)}</strong><span>${esc(g.players.map(p=>p.name).join(' · '))}</span><small>${esc(g.startedAt.slice(0,10))} · ${results(g).totals.join(' / ')}</small></article>`).join('')}`);return;}
 const all=await listCore();openDialog(`<h2>Game history</h2><p class="core-muted">Modes and solo results are kept separate. Select a game to view or resume.</p>${all.length?all.map(g=>`<button class="history-row" data-action="load" data-id="${esc(g.id)}"><strong>${esc(g.rules.name)} · ${g.players.length===1?'Solo':`${g.players.length} players`}</strong><span>${esc(g.players.map(p=>p.name).join(', '))}</span><small>${esc(g.startedAt.slice(0,10))} · ${g.status} · ${results(g).totals.join(' / ')}</small></button>`).join(''):'<p>No new-mode games saved yet.</p>'}<a class="core-legacy" href="?legacy=1">Original game history</a>`);
}
function analytics(){openDialog(`<h2>Roll insights</h2><p class="core-muted">${esc(game.rules.name)} · This game only. Camera, GoDice, simulated and corrected rolls retain their source in the exported history. Missing manual rolls are not counted as failed combinations.</p>${game.players.map((p,i)=>{const a=rollAnalytics(game,i);return `<h3>${esc(p.name)}</h3><p>${a.recordedRolls} recorded rolls · ${a.corrected} corrected</p>${a.recordedRolls?`<table><thead><tr><th>Combination</th><th>Rolls</th><th>Turns</th></tr></thead><tbody>${Object.keys({threeKind:0,fourKind:0,fullHouse:0,smallStraight:0,largeStraight:0,yahtzee:0}).map(k=>`<tr><td>${META[k].name}</td><td>${a.counts[k]||0}</td><td>${a.turns[k]||0}</td></tr>`).join('')}</tbody></table>`:'<p class="core-muted">No dice-level data recorded.</p>'}`;}).join('')}<p class="core-muted">Natural full houses are exactly 3 + 2. Kind and straight counts are inclusive; a Yahtzee also counts as three/four of a kind.</p>`);}
document.addEventListener('change',e=>{
 if(e.target.id==='playerCount')nameInputs(Number(e.target.value));
 if(e.target.id==='modeSelect'||e.target.matches('#createCore [name="source"]'))root.querySelector('#modeDescription').textContent=setupDescription(root.querySelector('#modeSelect').value,root.querySelector('#createCore [name="source"]').value);
 
 if(e.target.matches('[data-hardware-held]'))hardwareHeld[Number(e.target.dataset.hardwareHeld)]=e.target.checked;
 if(e.target.matches('.held'))root.querySelector(`[data-die="${e.target.dataset.hold}"]`).disabled=e.target.checked;
});
document.addEventListener('submit',async e=>{
 if(e.target.id!=='createCore')return;e.preventDefault();if(busy)return;
 try{const f=new FormData(e.target);if(f.get('source')!=='camera'){const {disconnectCamera}=await import('./dice/camera-panel.js');await disconnectCamera();}await persist(createCoreGame({names:f.getAll('player'),mode:f.get('mode'),source:f.get('source'),...(f.get('mode')==='competition'&&f.get('source')==='manual'?{rulesVersion:2}:{}),hideTotals:f.has('hideTotals'),id:id()}));}catch(e){notice(e.message);}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b||busy)return;
 const a=b.dataset.action;
 root.querySelector('.game-menu')?.removeAttribute('open');
 try{
  if(a==='camera-settings'||a==='capture-camera'){if(onlineRoom)throw Error('Hosted camera games are not enabled yet.');const {openCameraGame}=await import('./dice/camera-panel.js');await openCameraGame({getGame:()=>game,commit:(action,commandId)=>send(action,commandId),autoCapture:a==='capture-camera'});}
  if(a==='camera-test'){const {openDiceIdentificationTest}=await import('./dice/camera-panel.js');await openDiceIdentificationTest();}
  if(a==='start-camera')await send({type:'start',source:'camera'});
  if(a==='connect-dice'){clearTimeout(settleTimer);hardwareCapture.cancel();updateHardwarePanel();const {openDiceConnections}=await import('#dice-panel');openDiceConnections();}
  if(a==='theme'){theme=theme==='dark'?'light':'dark';applyTheme();try{localStorage.setItem('yz_theme',theme);}catch{}b.textContent=(theme==='dark'?'Light':'Dark')+' mode';}
  if(a==='online')await openMultiplayer(); if(a==='new'){if(onlineRoom)await openMultiplayer();else newScreen();}
  if(a==='saved-sessions')await openMultiplayer('','sessions');
  if(a==='resume')render();
  if(a==='history'){if(onlineRoom)await openMultiplayer();else await showHistory();}
  if(a==='load'){game=(await listCore()).find(g=>g.id===b.dataset.id);reportedFace=0;dialog.close();render();}
  if(a==='start-hardware'){
   const status=getDiceStatus();if(onlineRoom)throw new Error('Shared GoDice capture is not enabled yet.');
   if(status.paused||status.dice.length!==5||status.dice.some(d=>!d.connected))throw new Error('Connect five dice first.');
   await persist(command({...game,source:'godice'},{type:'start',source:'godice',seat:game.activeSeat},{id:id()}));
  }
  if(a==='arm-hardware'){hardwareCapture.arm(game,getDiceStatus(),hardwareHeld);render();}
  if(a==='cancel-hardware'){clearTimeout(settleTimer);hardwareCapture.cancel();dialog.close();render();queueSharedDice();}
  if(a==='override-face'){
   if(game.revision!==Number(b.dataset.revision)||game.turn?.id!==b.dataset.turn)throw new Error('The roll changed. Hold the die again.');
   const index=Number(b.dataset.faceOverride),face=Number(b.dataset.value);
   hardwareCapture.sync(game,getDiceStatus());
   if(hardwareCapture.capture){hardwareCapture.override(index,face);dialog.close();updateHardwarePanel();scheduleAutomaticRoll();}
   else{const faces=[...latest().dice];faces[index]=face;await send({type:'correct-roll',dice:faces});dialog.close();}
  }
  if(a==='accept-hardware'){hardwareCapture.sync(game,getDiceStatus());await send(hardwareCapture.action(game));}
  if(a==='edit-hardware')openDialog(`<h2>Correct confirmed dice</h2><p class="core-muted">Adjust the last roll. The original readings remain in the roll history.</p><div class="core-dice">${latest().dice.map((face,i)=>`<label>Die ${i+1}<select data-correct-die="${i}">${[1,2,3,4,5,6].map(n=>`<option ${n===face?'selected':''}>${n}</option>`).join('')}</select></label>`).join('')}</div><button class="bigbtn score core-primary" data-action="save-hardware-correction">Save corrected dice</button>`);
  if(a==='save-hardware-correction'){await send({type:'correct-roll',dice:[...dialog.querySelectorAll('[data-correct-die]')].map(e=>Number(e.value))});dialog.close();}
  if(a==='start')await send({type:'start'});
  if(a==='roll')await send({type:'roll',dice:diceInput(),held:[...root.querySelectorAll('.held')].map(x=>x.checked)});
  if(a==='correct-roll')await send({type:'correct-roll',dice:diceInput()});
  if(a==='discard-roll')await send({type:'discard-roll'});
  if(a==='fallback'){clearTimeout(settleTimer);await send({type:'manual-fallback'});dialog.close();}
  if(a==='start-manual')await send({type:'start',source:'manual'});
  if(a==='bonus')await send({type:'bonus',yahtzeeFace:reportedFace});
  if(a==='final-chain-outcome')confirmFinalChainOutcome(Number(b.dataset.face)||null);
  if(a==='confirm-final-chain'){
   if(!game.finalChain||game.id!==b.dataset.game||game.revision!==Number(b.dataset.revision)||game.finalChain.attempt!==Number(b.dataset.attempt)||!ownsSeat(game.finalChain.seat))throw Error('The bonus attempt changed. Review the current roll again.');
   await send({type:'final-chain-roll',face:Number(b.dataset.face)||null});dialog.close();
  }
  if(a==='another-yahtzee')anotherYahtzee();
  if(a==='repeat-face')declareYahtzee(Number(b.dataset.face));
  if(a==='confirm-another'){await send({type:'bonus',yahtzeeFace:reportedFace});dialog.close();}
  if(a==='choose')choose(b.dataset.key);
  if(a==='keypad')keypad(b.dataset.key);
  if(a==='edit')choose(b.dataset.key,Number(b.dataset.seat));
  if(a==='undo-last-score')confirmUndoScore();
  if(a==='confirm-undo-score'){
   const candidate=ownUndoCandidate();
   if(!candidate||candidate.id!==b.dataset.target||candidate.seat!==Number(b.dataset.seat)||game.id!==b.dataset.game||game.revision!==Number(b.dataset.revision))throw Error('The game changed. Review the latest score again.');
   await send({type:'undo-score',target:candidate.id,seat:candidate.seat});dialog.close();notice('Score undone. Choose your category again.');
  }
  if(a==='close'){cancelBonus();dialog.close();}
  if(a==='analytics')analytics();
  if(a==='tournament-standings'){
   const {onlineStandings}=await import('./multiplayer/ui.js');const standings=await onlineStandings();
   openDialog(`<h2>${esc(onlineRoom.tournament.name)}</h2>${renderTournamentStandings(standings,{final:standings.final})}`);
  }
  if(a==='tournament-exit')await openMultiplayer('','sessions');
  if(a==='tournament-invitation')await showOnlineInvitation();
  if(a==='copy-saved-invitation'){
   const {onlineInvitation}=await import('./multiplayer/ui.js');const invitation=onlineInvitation();
   if(dialog.dataset.invitationCode!==invitation.code)throw Error('The table changed. Open its invitation again.');
   try{await navigator.clipboard.writeText(invitation.url);notice('Invitation link copied.');}catch{notice('Select the invitation link above and copy it.');}
  }
  if(a==='tournament-pause'||a==='tournament-resume'){
   busy=true;render();
   try{const {setTournamentPaused}=await import('./multiplayer/ui.js');await setTournamentPaused(a==='tournament-pause');notice(a==='tournament-pause'?'Tournament paused. Your progress is saved.':'Tournament resumed.');}
   finally{busy=false;render();}
  }
  if(a==='rematch-ready'||a==='rematch-withdraw'){
   busy=true;render();
   try{const {setOnlineReady}=await import('./multiplayer/ui.js');await setOnlineReady(a==='rematch-ready');notice(game.status==='finished'?(a==='rematch-ready'?'You’re ready for the next game.':'You’re not ready yet.'):`New game · ${game.players[game.activeSeat].name} starts.`);}
   finally{busy=false;render();}
  }
  if(a==='rules')showRules();
  if(a==='cancel-joker'){reportedFace=0;render();}
  if(a==='confirm-score'||a==='confirm-total'){
   let value=Number(b.dataset.value);
   if(a==='confirm-total'){const field=dialog.querySelector('#manualTotal');value=Number(field.value);if(field.value===''||!Number.isInteger(value)||value<0||value>30)throw new Error('Enter a whole number from 0 to 30.');}
   const action=pending.target?{type:'correct-score',target:pending.target,seat:pending.seat,value}:{type:'score',category:pending.category,value,yahtzeeFace:Number(b.dataset.face)||reportedFace};
   await send(action);dialog.close();
  }
  if(a==='export'){
   const all=onlineRoom?(onlineRoom.capabilities?.history?(await import('./multiplayer/ui.js')).onlineHistory():[onlineRoom.game]):await listCore();
   const savedGames=await all,url=URL.createObjectURL(new Blob([JSON.stringify({schema:1,exportedAt:new Date().toISOString(),games:savedGames},null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='clubhouse-games.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
 }catch(e){notice(e.message);}
});
async function initialize(){try{game=await loadCore();const join=new URLSearchParams(location.search).get('join');if(join)await openMultiplayer(join);else render();}catch(e){root.innerHTML=header()+'<main class="new-core"><h1>Save recovery needs attention</h1><p>Your saved records have not been deleted.</p></main>';notice(e.message);}}
initialize();










