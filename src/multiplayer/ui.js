import QRCode from 'qrcode';
import { auth, configured, webUrl, emailOtpEnabled, requestRoom, watchRoom } from './client.js';
import { MODES } from '../game/core.js';
import './multiplayer.css';
import {getDiceStatus} from '../dice/live-status.js';
import {onlineErrorMessage,waitForOnline} from './connection.js';
import {recoveryRedirect} from './recovery.js';
import {readSocialDestination,clearSocialDestination} from './social-links.js';
import {renderResumeEntry,renderSavedSessions} from './session-cards.js';
import {renderOpenTournaments} from './tournament-list.js';

const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let root,callbacks,user,room=null,timer,screen='home',working=false,connected=false,email='',invite='',displayName='';
let generation=0;
let landingView='home';
let onlineOpen=false,silentGreetingHydration=true;
const current=ticket=>onlineOpen&&ticket===generation;
let stopWatching,watchingCode,stopAuthWatching;
let standingsKey='',standingsPending=null;
const remember=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const recall=key=>{try{return localStorage.getItem(key)||'';}catch{return '';}};
function message(text){const box=root.querySelector('#mpMessage');if(box)box.textContent=text;else callbacks.notice(text);}
function shell(body){
 if(screen==='lobby')callbacks?.table?.(room,user?.id,connected);else callbacks?.table?.(null);
 root.classList.remove('playing');
 root.innerHTML=`<header class="compact-header"><span class="compact-logo">yahtzee<span>.</span></span><button class="hbtn" data-mp="exit">Clubhouse</button></header><main class="mp-screen">${body}<p id="mpMessage" role="status" aria-live="polite"></p></main>`;
}
function accountScreen(codeSent=false){
 if(!emailOtpEnabled&&!codeSent){passwordScreen();return;}
 screen='account';
 shell(`<div class="intro-kicker">YOUR SEAT AT THE TABLE</div><h1>${codeSent?'Check your inbox.':'Let’s play together.'}</h1><p class="core-muted">${codeSent?`Enter the sign-in code sent to ${esc(email)}.`:'Sign in with your email to host, join, and return to your games.'}</p><form data-mp-form="${codeSent?'verify':'email'}">${codeSent?'<label>Sign-in code<input name="token" autocomplete="one-time-code" inputmode="numeric" pattern="[0-9]{6,10}" required></label>':'<label>Email<input name="email" type="email" autocomplete="email" required></label>'}<button class="bigbtn score core-primary" type="submit">${codeSent?'Sign in':'Email me a code'}</button></form>${codeSent?'<button class="all-scores" data-mp="change-email">Use another email / resend</button>':'<button class="all-scores" data-mp="password">Sign in with an existing password</button>'}`);
}
function passwordScreen(){
 screen='account';
 shell(`<div class="intro-kicker">WELCOME BACK</div><h1>Your seat is waiting.</h1><p class="core-muted">Sign in with your game-account email and password. Camera credentials are separate. For local camera or manual testing, choose Local games; no account is needed.</p><form data-mp-form="password"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="bigbtn score core-primary" type="submit">Sign in</button></form><a class="all-scores" href="${esc(recoveryRedirect(webUrl))}">Forgot password?</a>${emailOtpEnabled?'<button class="all-scores" data-mp="change-email">Use an email code instead</button>':''}`);
}
function home(){
 screen='home';room=null;
 shell(`<div class="intro-kicker">BRING YOUR PEOPLE</div><h1>A seat for everyone.</h1><p class="core-muted">Host on iPhone or Android. Join from any phone. One shared scorecard.</p>${renderResumeEntry()}<div class="mp-entry"><button data-mp="host"><span class="mp-icon">＋</span><strong>Host a game</strong><small>Choose the rules. Invite your table.</small></button><button data-mp="join"><span class="mp-icon">↗</span><strong>Join a game</strong><small>Scan the host’s QR or enter a code.</small></button></div><button class="all-scores" data-mp="social-inbox">Invitations &amp; play requests</button><button class="all-scores" data-mp="tournaments">Your tournaments · return to saved progress</button><button class="all-scores" data-mp="rooms">Your online games &amp; completed tournaments</button><p class="mp-account">${esc(user.email)} <button class="hbtn" data-mp="signout">Sign out</button></p>`);
}
function hostForm(){
 screen='host';
 shell(`<button class="hbtn" data-mp="home">← Multiplayer</button><div class="intro-kicker">YOU’RE THE HOST</div><h1>Set the table.</h1><form data-mp-form="host"><label>Your player name<input name="name" maxlength="24" value="${esc(displayName)}" autocomplete="nickname" required></label><label>Play<select name="tableType"><option value="game">Hosted game</option><option value="tournament">Tournament · multiple games</option></select></label><fieldset class="mp-tournament-fields" hidden disabled><legend>Your tournament</legend><label>Tournament name<input name="tournamentName" maxlength="60" placeholder="Our tournament" required></label><div class="core-form-row"><label>Games<input name="gameCount" type="number" min="2" max="20" step="1" value="3" required></label><label>Players<select name="tournamentPlayers">${Array.from({length:7},(_,i)=>`<option value="${i+2}">${i+2}</option>`).join('')}</select></label></div><p class="core-muted">Keep the same players and rules. Save your progress and resume another day.</p></fieldset><label>Game mode<select name="mode">${Object.entries(MODES).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')}</select></label><label class="mp-check"><input name="hideTotals" type="checkbox"><span>Hide totals until the end</span></label><label>Dice input<select name="source"><option value="manual">Manual scoring</option>${import.meta.env.MODE==='native-evaluation'||getDiceStatus().enabled?'<option value="godice">GoDice · connected to this host</option>':''}</select></label><div class="mp-note">Up to 8 players · guests join from any phone.<br>Tournaments use manual scoring. For GoDice games, the Android host connects five dice and stays open during play.</div><p class="core-muted">Next: invite players and set up commentary before you start.</p><button class="bigbtn score core-primary">Create room</button></form>`);
}
function joinForm(){
 screen='join';
 shell(`<button class="hbtn" data-mp="home">← Multiplayer</button><div class="intro-kicker">PULL UP A CHAIR</div><h1>Join your table.</h1><form data-mp-form="join"><label>Room code<input name="code" class="mp-code-input" value="${esc(invite)}" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" required></label><label>Your player name<input name="name" maxlength="24" value="${esc(displayName)}" autocomplete="nickname" required></label><button class="bigbtn score core-primary">Join game</button></form>`);
 const hint=document.createElement('p');hint.className='core-muted';hint.textContent='Already a player? Use the same account. Joining this saved invitation restores your seat and progress.';root.querySelector('h1').after(hint);
}
function inviteUrl(){const url=new URL(webUrl);url.search='';url.hash='';url.searchParams.set('join',room.code);return url.href;}
export function onlineInvitation(){
 if(!onlineOpen||!room||!room.members.some(member=>member.userId===user?.id))throw new Error('Open your hosted table to view its invitation.');
 return {url:inviteUrl(),code:room.code,hostName:room.members.find(member=>member.userId===room.hostId)?.name||'Host',tournamentName:room.tournament?.name||''};
}
function lobby(){
 screen='lobby';const host=room.hostId===user.id;
 const tournament=room.tournament,full=!tournament||room.members.length===tournament.playerCount;
 shell(`<button class="hbtn" data-mp="home">← Multiplayer</button><div class="intro-kicker">${host?'YOUR TABLE IS OPEN':'YOU’RE IN'}</div><h1>${host?'Invite your people.':'Waiting for the host.'}</h1><div class="mp-room-card"><div class="mp-qr">${room.tournament?'<button class="all-scores" data-mp="social-players">Players · invite by email &amp; ask to play</button>':''}<canvas id="roomQr" aria-label="Scan this QR code to join the game" role="img"></canvas></div><span class="core-muted">Scan to join · no app needed</span><strong class="mp-room-code">${esc(room.code.slice(0,4))} ${esc(room.code.slice(4))}</strong><button class="hbtn" data-mp="copy">Copy invitation link</button></div><div class="mp-roster-title"><strong>At the table</strong><span>${room.members.length} / 8 players</span></div><ol class="mp-roster">${room.members.map((m,i)=>`<li style="--seat-hue:${[162,267,205,24,48,332,185,232][i]}"><span class="mp-avatar">${esc(m.name.slice(0,1).toUpperCase())}</span><strong>${esc(m.name)}</strong><small>${m.userId===room.hostId?'Host':m.userId===user.id?'You':'Joined'}</small></li>`).join('')}</ol><p class="mp-note">${esc(MODES[room.mode].name)} · ${room.source==='godice'?'Host GoDice':'Manual dice'}${room.hideTotals?' · Totals hidden':''}</p>${host&&room.source==='godice'?'<button class="all-scores" data-mp="connect-dice">Connect / manage host GoDice</button>':''}<section class="mp-commentary-setup" aria-label="Before you start"><h2>Give your table a voice</h2><p>${host?'Choose your commentator, humor and frequency before starting. Your welcome plays on the host phone.':'Add your optional player details before the host starts.'}</p><button class="all-scores" data-mp="commentary">${host?'Set up commentary &amp; player details':'Personalize my commentary'}</button></section>${host?'<button class="bigbtn score core-primary" data-mp="start">Everyone’s here · start game</button>':'<p class="mp-wait">The game will open when the host starts.</p>'}`);
 const ticket=generation;
 if(tournament){
  const summary=document.createElement('p');summary.className='mp-note';summary.textContent=`${tournament.name} · ${tournament.gameCount} games · ${tournament.playerCount} players · Rules fixed at creation`;root.querySelector('h1').after(summary);
  root.querySelector('.mp-roster-title span').textContent=`${room.members.length} / ${tournament.playerCount} players`;
  const start=root.querySelector('[data-mp="start"]');if(start){start.disabled=!full;start.textContent=full?'Everyone’s here · start tournament':`Waiting for ${tournament.playerCount-room.members.length} more ${tournament.playerCount-room.members.length===1?'player':'players'}`;}
 }
 QRCode.toCanvas(root.querySelector('#roomQr'),inviteUrl(),{width:208,margin:3,errorCorrectionLevel:'M',color:{dark:'#102029',light:'#ffffff'}}).catch(()=>{if(current(ticket)&&screen==='lobby')message('QR unavailable. Share the room code instead.');});
}
function lifecycleGreeting(before,next,ack){
 const marker=next.commentaryLifecycle;
 if(next.capabilities?.commentaryAtomicCommit!==true||!marker||typeof marker.commandId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(marker.commandId)||marker.gameId!==next.game?.id||!Number.isSafeInteger(marker.acceptedRoomRevision)||marker.acceptedRoomRevision>next.revision||!['opening','return','next-game'].includes(marker.purpose))return;
 const explicit=ack&&ack.acceptedCommandId===marker.commandId&&ack.acceptedRoomRevision===marker.acceptedRoomRevision;
 const continuous=!silentGreetingHydration&&connected&&!document.hidden&&before?.id===next.id&&(marker.purpose==='opening'&&!before.game&&before.status==='lobby'&&next.status==='active'||marker.purpose==='return'&&before.game?.id===next.game.id&&before.tournament?.status==='paused'&&next.tournament?.status==='playing'||marker.purpose==='next-game'&&before.game?.status==='finished'&&before.game.id!==next.game.id&&next.game.status==='active');
 if(explicit||continuous)callbacks?.greeting?.({sourceCommandId:marker.commandId,gameId:marker.gameId});
}
function accept(next,ack=null){
 if(room?.code===next.code&&next.revision<room.revision)return;
 const changed=!room||next.revision!==room.revision||next.code!==room.code||(next.capabilities&&(next.capabilities.rematch!==room.capabilities?.rematch||next.capabilities.tournaments!==room.capabilities?.tournaments||next.capabilities.undoScore!==room.capabilities?.undoScore||next.capabilities.commentaryAtomicCommit!==room.capabilities?.commentaryAtomicCommit));
 const before=room;
 room={...next,...(!next.capabilities&&room?.code===next.code?{capabilities:room.capabilities}: {}),...(room?.code===next.code&&room.revision===next.revision&&room.tournamentStandings?{tournamentStandings:room.tournamentStandings}:{})};connected=true;remember('clubhouse-room',room.code);
 if(watchingCode!==room.code){
  stopWatching?.();watchingCode=room.code;const ticket=generation;
  stopWatching=watchRoom(room.code,next=>{if(ticket===generation&&!working)accept(next);});
 }
 if(room.game){screen='game';callbacks.game(room,user.id,connected,changed);lifecycleGreeting(before,room,ack);if(room.tournament&&room.game.status==='finished'&&room.capabilities?.tournaments)loadResultStandings();}
 else if(changed||screen!=='lobby')lobby();
 if(!document.hidden)silentGreetingHydration=false;
}
function schedule(){clearTimeout(timer);if(!room)return;timer=setTimeout(refresh,connected?15000:3000);}
async function refresh(){
 const ticket=generation,code=room?.code;
 if(!code)return;
 if(working||document.hidden){schedule();return;}
 try{const data=await requestRoom({operation:'read',code});if(ticket===generation)accept(data.room);}
 catch(error){if(ticket!==generation)return;connected=false;silentGreetingHydration=true;if(screen==='game')callbacks.connection(false);else message('Reconnecting… Your place at the table is saved.');}
 finally{if(ticket===generation)schedule();}
}
async function mutate(payload){
 const ticket=generation;
 working=true;connected=false;
 try{const data=await requestRoom(payload);if(!current(ticket))return null;accept(data.room,payload.operation!=='read'?data:null);if(['start','resume','ready'].includes(payload.operation)&&typeof data.greetingJobId==='string'&&Number.isSafeInteger(data.commentaryProfileVersion))callbacks?.greeting?.({jobId:data.greetingJobId,gameId:data.room.game?.id,profileVersion:data.commentaryProfileVersion});schedule();return data.room;}
 catch(error){if(!current(ticket))return null;connected=false;silentGreetingHydration=true;if(screen==='game')callbacks.connection(false);throw error;}
 finally{if(current(ticket))working=false;}
}
async function rooms(){
 const ticket=generation,data=await requestRoom({operation:'list'});if(!current(ticket))return;screen='rooms';
 shell(`<button class="hbtn" data-mp="home">← Multiplayer</button><h1>Your tables &amp; tournaments.</h1>${data.rooms.length?data.rooms.map(r=>`<button class="history-row" data-mp="resume" data-code="${esc(r.code)}"><strong>${esc(r.tournament?.name||r.members.map(m=>m.name).join(', '))}</strong><span>${esc(MODES[r.mode].name)} · ${esc(r.tournament?.status||r.status)}${r.tournament?` · Game ${r.gameSequence??1} of ${r.tournament.gameCount}`:''}</span>${r.tournament?`<small>${esc(r.members.map(m=>m.name).join(' · '))} · Progress saved</small>`:''}</button>`).join(''):'<p class="core-muted">Your hosted and joined games will appear here.</p>'}`);
}
export function leaveOnline(){silentGreetingHydration=true;callbacks?.table?.(null);stopAuthWatching?.();stopAuthWatching=null;generation++;onlineOpen=false;working=false;clearTimeout(timer);stopWatching?.();stopWatching=null;watchingCode=null;room=null;connected=false;standingsKey='';standingsPending=null;}
async function tournaments(){
 const ticket=generation;screen='tournaments';
 shell('<button class="hbtn" data-mp="home">← Multiplayer</button><h1>Your tournaments.</h1><p role="status">Finding your saved tournaments…</p>');
 const saved=new Map(),cursors=new Set();let before;
 do{
  const data=await requestRoom({operation:'tournaments',...(before?{before}:{})});
  if(!current(ticket)||screen!=='tournaments')return;
  data.rooms.forEach(r=>saved.set(r.id,r));
  if(data.nextBefore){
   const key=JSON.stringify(data.nextBefore);
   if(cursors.has(key)||before&&(data.nextBefore.createdAt>before.createdAt||data.nextBefore.createdAt===before.createdAt&&data.nextBefore.id>=before.id))throw new Error('The tournament list could not advance. Try again.');
   cursors.add(key);
  }
  before=data.nextBefore;
 }while(before);
 shell(`<button class="hbtn" data-mp="home">← Multiplayer</button><h1>Your tournaments.</h1><p class="core-muted">Open tournaments are saved to your account. Paused tournaments stay paused until the host resumes.</p>${renderOpenTournaments([...saved.values()],user.id)}`);
}
async function sessions(view='open'){
 const ticket=generation;screen=`sessions-${view}`;
 shell('<button class="hbtn" data-mp="home">← Multiplayer</button><h1>Saved games &amp; tournaments.</h1><p role="status">Finding your saved games…</p>');
 const saved=new Map(),cursors=new Set();let before;
 do{
  const data=await requestRoom({operation:'sessions',view,...(before?{before}:{})});
  if(!current(ticket)||screen!==`sessions-${view}`)return;
  data.rooms.forEach(session=>saved.set(session.id,session));
  if(data.nextBefore){const key=JSON.stringify(data.nextBefore);if(cursors.has(key)||before&&(data.nextBefore.createdAt>before.createdAt||data.nextBefore.createdAt===before.createdAt&&data.nextBefore.id>=before.id))throw new Error('The saved game list could not advance. Try again.');cursors.add(key);}
  before=data.nextBefore;
 }while(before);
 shell(`<button class="hbtn" data-mp="home">← Multiplayer</button><h1>Saved games &amp; tournaments.</h1><div class="tournament-actions" role="group" aria-label="Saved game filters"><button class="hbtn" data-mp="sessions-open" aria-pressed="${view==='open'}">Open · resume play</button><button class="hbtn" data-mp="sessions-completed" aria-pressed="${view==='completed'}">Completed · view results</button></div><p class="core-muted">Saved to your signed-in account. Open the same table to keep your seat, scores and current turn.</p>${renderSavedSessions([...saved.values()],user.id,{view})}`);
}
async function accountDestination(){
 if(landingView==='invitations'){home();await(await import('./social-ui.js')).openSocial();return;}
 if(landingView==='return-table'&&invite){await mutate({operation:'read',code:invite});(await import('./social-links.js')).clearSocialDestination();invite='';return;}
 if(landingView==='voice-signin'){await callbacks?.voiceReady?.(user);return;}if(invite)joinForm();else if(landingView==='host-tournament'){hostForm();const select=root.querySelector('[name=tableType]');select.value='tournament';select.dispatchEvent(new Event('change',{bubbles:true}));}else if(landingView==='sessions')await sessions();else if(landingView==='tournaments')await tournaments();else home();
}
export async function openOnline(element,handlers,joinCode='',view='home'){
 leaveOnline();onlineOpen=true;const ticket=generation;root=element;callbacks=handlers;invite=joinCode;displayName=recall('clubhouse-name');landingView=view;
 if(auth?.onAuthStateChange){
  const watcher=auth.onAuthStateChange((event,session)=>{
   if(!onlineOpen)return;callbacks?.account?.(session?.user||null);
   if(event==='SIGNED_OUT'){user=null;clearTimeout(timer);stopWatching?.();stopWatching=null;watchingCode=null;room=null;connected=false;accountScreen();}
  });
  stopAuthWatching=()=>watcher?.data?.subscription?.unsubscribe();
 }
 if(!configured){screen='setup';shell('<div class="intro-kicker">MULTIPLAYER</div><h1>The table is almost ready.</h1><p class="core-muted">Online rooms need the project’s Supabase connection and published web address. Local games are ready to play.</p>');return;}
 screen='connecting';shell('<h1>Opening online games…</h1><p class="core-muted">Checking your game account. Local camera and manual games do not need a sign-in.</p>');
 try{
  const {data:{session},error}=await waitForOnline(auth.getSession());if(!current(ticket))return;if(error)throw error;user=session?.user;callbacks?.account?.(user||null);
  if(!user)accountScreen();else{try{await accountDestination();}catch(error){if(current(ticket)){home();message(onlineErrorMessage(error));}}}
 }catch(error){if(current(ticket)){user=null;callbacks?.account?.(null);accountScreen();message(onlineErrorMessage(error));}}
}
export async function sendOnline(action,expectedRevision,commandId=crypto.randomUUID()){
 if(!connected||working)throw new Error('Reconnecting. Wait for the game to sync before scoring.');
 return mutate({operation:'command',code:room.code,gameId:room.game.id,rulesVersion:room.game?.rules.version??room.rulesVersion??1,action,expectedRevision,commandId});
}
export async function setOnlineReady(ready){
 if(!connected||working)throw new Error('Reconnecting. Wait for the table to sync.');
 if(room.tournament&&room.tournament.status!=='playing')throw new Error(room.tournament.status==='completed'?'This tournament is complete.':'The host must resume the tournament first.');
 return mutate({operation:'ready',code:room.code,gameId:room.game.id,gameRevision:room.game.revision,rulesVersion:room.game?.rules.version??room.rulesVersion??1,ready,commandId:crypto.randomUUID()});
}
export async function setTournamentPaused(paused){
 if(!connected||working)throw new Error('Reconnecting. Wait for the table to sync.');
 if(!room?.tournament||room.hostId!==user.id||room.capabilities?.tournaments!==true)throw new Error('Only the host can pause or resume this tournament.');
 return mutate({operation:paused?'pause':'resume',code:room.code,gameId:room.game.id,rulesVersion:room.game?.rules.version??room.rulesVersion??1,expectedRevision:room.revision,commandId:crypto.randomUUID()});
}
export async function onlineStandings(){
 if(!room?.tournament||room.capabilities?.tournaments!==true)throw new Error('Tournament standings need an updated hosted table.');
 const ticket=generation,code=room.code,revision=room.revision,gameId=room.game?.id,gameRevision=room.game?.revision;
 const data=await requestRoom({operation:'standings',code});
 if(!current(ticket)||room.code!==code)throw new Error('The table changed. Open its standings again.');
 if(room.revision!==revision||room.game?.id!==gameId||room.game?.revision!==gameRevision||data.roomRevision!==room.revision||data.gameId!==room.game?.id||data.gameRevision!==room.game?.revision)throw new Error('The tournament changed. Refresh and open its standings again.');
 return data;
}
async function loadResultStandings(){
 const key=`${generation}:${room.code}:${room.revision}`;
 if(standingsKey===key||standingsPending?.key===key)return;
 const ticket=generation,revision=room.revision,code=room.code;
 const request={key};standingsPending=request;
 try{
  const data=await onlineStandings();
  if(current(ticket)&&room.code===code&&room.revision===revision){standingsKey=key;room={...room,tournamentStandings:data};callbacks.game(room,user.id,connected,true);}
 }catch(error){if(current(ticket)&&room.code===code&&room.revision===revision){callbacks.notice(onlineErrorMessage(error));}}
 finally{if(standingsPending===request)standingsPending=null;}
}
export async function onlineHistory(){
 if(!room)throw new Error('Open a hosted table first.');
 const code=room.code,ticket=generation,games=new Map();let before;
 do{
  const data=await requestRoom({operation:'history',code,...(before?{before}:{})});
  if(!current(ticket)||room.code!==code)throw new Error('The table changed. Open its history again.');
  data.games.forEach(game=>games.set(game.id,game));
  if(data.nextBefore!==null&&(before!==undefined&&data.nextBefore>=before))throw new Error('History could not advance. Try again.');
  before=data.nextBefore;
 }while(before);
 games.set(room.game.id,{...room.game,sequence:room.gameSequence??1});return [...games.values()];
}
export async function sendHostState(action){
 if(!connected||working||room?.hostId!==user?.id)return false;
 await mutate({operation:'command',code:room.code,gameId:room.game.id,action,expectedRevision:room.revision,commandId:crypto.randomUUID()});
 return true;
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)silentGreetingHydration=true;else if(room)refresh();});
document.addEventListener('change',e=>{
 if(!onlineOpen||!e.target.matches('[name="tableType"]'))return;
 const tournament=e.target.value==='tournament',fields=root.querySelector('.mp-tournament-fields'),source=root.querySelector('[name="source"]');
 fields.hidden=!tournament;fields.disabled=!tournament;
 if(tournament)source.value='manual';source.disabled=tournament;
 root.querySelector('[data-mp-form="host"] button.bigbtn').textContent=tournament?'Create tournament':'Create room';
});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-mp]');if(!button||!onlineOpen)return;
 if(button.dataset.mp==='exit'){const exit=callbacks.exit;leaveOnline();exit();return;}
 if(working)return;const ticket=generation;
 try{
  const a=button.dataset.mp;
  if(a==='home'){leaveOnline();onlineOpen=true;home();}
  if(a==='social-inbox')await(await import('./social-ui.js')).openSocial();
  if(a==='social-players')await(await import('./social-ui.js')).openSocial(room);
  if(a==='host')hostForm();if(a==='join')joinForm();
  if(a==='change-email')accountScreen();
  if(a==='password')passwordScreen();
  if(a==='signout'){try{await(await import('./social-native.js')).disablePhoneNotifications();}catch{}const {error}=await waitForOnline(auth.signOut());if(!current(ticket))return;if(error)throw error;user=null;callbacks?.account?.(null);accountScreen();}
  if(a==='rooms')await rooms();
  if(a==='sessions'||a==='sessions-open'||a==='sessions-completed')await sessions(a==='sessions-completed'?'completed':'open');
  if(a==='tournaments')await tournaments();
  if(a==='resume')await mutate({operation:'read',code:button.dataset.code});
  if(a==='connect-dice'){const {openDiceConnections}=await import('#dice-panel');openDiceConnections();}
  if(a==='commentary')await callbacks?.commentary?.();
  if(a==='start'){
   if(callbacks?.beforeStart&&await callbacks.beforeStart()===false)return;
   const status=getDiceStatus();
   if(room.source==='godice'&&(status.paused||status.dice.length!==5||status.dice.some(d=>!d.connected)))throw new Error('Connect five GoDice on this host before starting.');
   await mutate({operation:'start',code:room.code,rulesVersion:room.game?.rules.version??room.rulesVersion??1,expectedRevision:room.revision,commandId:crypto.randomUUID()});
  }
  if(a==='copy'){
   const link=inviteUrl();
   try{await navigator.clipboard.writeText(link);if(current(ticket))message('Invitation link copied.');}
   catch{if(current(ticket))message(`Share this link: ${link}`);}
  }
 }catch(error){if(current(ticket)){if(button.dataset.mp==='start'){callbacks?.startFailed?.();if(room&&!room.game)lobby();}message(onlineErrorMessage(error));schedule();}}
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!form.matches('[data-mp-form]')||!onlineOpen)return;e.preventDefault();if(working)return;const ticket=generation;
 const f=new FormData(form),kind=form.dataset.mpForm;
 working=true;form.querySelector('button[type="submit"],button.bigbtn')?.setAttribute('disabled','');
 try{
  if(kind==='email'){
   email=String(f.get('email')).trim();const {error}=await waitForOnline(auth.signInWithOtp({email}));if(!current(ticket))return;if(error)throw error;accountScreen(true);
  }else if(kind==='password'){
   const {data,error}=await waitForOnline(auth.signInWithPassword({email:String(f.get('email')).trim(),password:String(f.get('password'))}));if(!current(ticket))return;if(error)throw error;user=data.user;callbacks?.account?.(user);await accountDestination();
  }else if(kind==='verify'){
   const {data,error}=await waitForOnline(auth.verifyOtp({email,token:String(f.get('token')).trim(),type:'email'}));if(!current(ticket))return;if(error)throw error;user=data.user;callbacks?.account?.(user);await accountDestination();
  }else{
   displayName=String(f.get('name')).trim();remember('clubhouse-name',displayName);
   const payload=kind==='host'?{operation:'create',name:displayName,mode:f.get('mode'),source:f.get('source')||'manual',hideTotals:f.has('hideTotals'),requestId:crypto.randomUUID()}:{operation:'join',code:f.get('code'),name:displayName};
   if(kind==='host'&&f.get('tableType')==='tournament'){
    const name=String(f.get('tournamentName')||'').trim(),gameCount=Number(f.get('gameCount')),playerCount=Number(f.get('tournamentPlayers'));
    if(!name||name.length>60||!Number.isInteger(gameCount)||gameCount<2||gameCount>20||!Number.isInteger(playerCount)||playerCount<2||playerCount>8)throw new Error('Choose a tournament name, 2–20 games and 2–8 players.');
    payload.tournament={name,gameCount,playerCount};payload.source='manual';
   }
   if(kind==='host'&&payload.mode==='competition'&&payload.source==='manual')payload.rulesVersion=2;
   const joined=await mutate(payload);if(current(ticket)){
    if(kind==='join'&&joined&&readSocialDestination()?.code===joined.code)clearSocialDestination();
    invite='';
   }
  }
 }catch(error){if(current(ticket))message(onlineErrorMessage(error));}
 finally{if(current(ticket)){working=false;form.querySelector('button[type="submit"],button.bigbtn')?.removeAttribute('disabled');}}
});








