import {renderBuildInfo} from './ui/build-info.js';
import {renderLocalSetup} from './ui/local-setup.js';
import {initializeMidnight} from './ui/midnight-profile.js';
import {renderMidnightPanel,bindMidnightPanel,playMidnightSound} from './ui/midnight-panels.js';
import {loadHomeAccount,watchHomeAccount} from './multiplayer/home-account.js';
import {renderPeopleDialog,renderTrophyDialog,renderPlayerProfile} from './ui/home-account.js';
import {socialLandingView} from './multiplayer/social-links.js';
import {connectSocial} from './multiplayer/social-ui.js';
import './styles.css';
import './clubhouse.css';
import './prototype.css';
import './ui/clubhouse-home.css';
import './ui/playform.css';
import './ui/home-account.css';
import './ui/midnight.css';
import './ui/yahtz-home.css';
import './ui/venue-reel.css';
import {renderTournamentEntry} from './ui/yahtz-home.js';
document.documentElement.dataset.design='playform';
import {renderClubhouseHome,renderGameMenu} from './ui/clubhouse-home.js';
import {renderCommentarySettings,bindCommentarySettings} from './ui/commentary-settings.js';
import {readCommentaryPreferences,persistCommentaryPatch,readLocalPlayerDefaults,saveLocalPlayerDefaults} from './commentary/preferences.js';
import {markScoreSubmitted,readPlaybackTimings} from './commentary/latency.js';
import {queueLocalCommands} from './commentary/local-client.js';
import {askGameCommentary,showWelcomeGate} from './ui/welcome-gate.js';
import './ui/hosted-results.css';
import './ui/tournament-insights.css';
import {renderTournamentInsights,bindTournamentInsights} from './ui/tournament-insights.js';
import {upperProgress} from './game/upper-progress.js';
let insightsCleanup=()=>{};
import {renderHostedResults} from './ui/hosted-results.js';
import {renderTournamentBanner,renderTournamentStandings,renderTournamentActions} from './ui/tournament.js';
import {renderResumeEntry} from './multiplayer/session-cards.js';
import { Capacitor } from '@capacitor/core';
import { AutomaticCapture } from './dice/automatic-capture.js';
import { celebration,celebrationMessage } from './game/celebrations.js';
import {pulseAccepted,cancelPulse,refreshPulse} from './ui/pulse.js';
import './ui/phone-scorecard.css';
import './ui/local-setup.css';
import './ui/mobile-polish.css';
import './ui/slot-cabinet.css';
import './ui/retro-finish.css';
import {applyScorecardSize,saveScorecardSize,renderScorecardDisplay} from './ui/scorecard-display.js';
import {renderPhoneScorecard,bindPhoneScorecard} from './ui/phone-scorecard.js';
import { getDiceStatus, subscribeDiceStatus, subscribeDiceEvents } from './dice/live-status.js';
import { BASE_KEYS, META } from './game/categories.js';
import { computeTotals } from './game/scoring.js';
import { MODES, createCoreGame, command, results, scoreOptions, rollLimit, rollAnalytics, filled, yahtzeePoints, undoableScore } from './game/core.js';
import { saveCore, loadCore, listCore } from './core-store.js';
import {renderPlayerProfileFields,readPlayerProfileFields} from './ui/commentary-settings.js';
import {createSessionCommentary} from './ui/commentary-session.js';
import {createHostedCommentarySession} from './ui/hosted-commentary-session.js';
import {createAuthenticatedCommentaryTransport} from './commentary/authenticated-transport.js';

initializeMidnight();
const iosManualTest=import.meta.env.MODE==='ios-test';
if(iosManualTest)document.documentElement.dataset.iosTest='true';
const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => crypto.randomUUID();
let game=null,busy=false,reportedFace=0,pending=null;
let peerOffset=0,phoneCleanup=()=>{};
const hardwareCapture=new AutomaticCapture();
const commentarySession=createSessionCommentary({onNotice:notice});
let settleTimer=null,autoStarting=false;
let hardwareHeld=Array(5).fill(false),hardwareTurnId=null;
let noticeTimer, effectTimer, activeEffect=null;
let onlineRoom=null,onlineUserId=null,onlineConnected=false,localGame=null;
const commentaryServiceBase=(import.meta.env.VITE_COMMENTARY_URL||'').trim();
let hostedCommentaryActive=false,hostedCommentary=null,hostedCommentaryPlayer=null,hostedCommentarySetup=null,hostedCommentaryGeneration=0;
const commentaryContext=()=>({room:hostedCommentaryActive?onlineRoom:null,userId:onlineUserId,connected:onlineConnected,visible:!document.hidden&&view!=='home'});
function resetHostedCommentary(){
 hostedCommentaryGeneration++;hostedCommentary?.dispose();hostedCommentary=null;
 const player=hostedCommentaryPlayer;hostedCommentaryPlayer=null;hostedCommentarySetup=null;
 if(player?.dispose)void Promise.resolve(player.dispose()).catch(()=>{});
}
async function ensureHostedCommentary(){
 if(iosManualTest||!hostedCommentaryActive||!onlineRoom||!onlineUserId||!commentaryServiceBase)return null;
 if(hostedCommentary)return hostedCommentary;
 if(hostedCommentarySetup)return hostedCommentarySetup;
 const ticket=hostedCommentaryGeneration;
 const task=(async()=>{
  const {auth}=await import('./multiplayer/client.js');if(!auth)return null;
  const transport=createAuthenticatedCommentaryTransport({auth,serviceBase:commentaryServiceBase,directReaction:Capacitor.getPlatform()==='android',anonymousKey:import.meta.env.VITE_SUPABASE_ANON_KEY||''});
  const android=Capacitor.getPlatform()==='android';
  const player=android?(await import('./commentary/native-player.js')).createNativeCommentaryPlayer({serviceBase:commentaryServiceBase,getAccessToken:transport.getAccessToken}):{play:async()=>false,stop:()=>{},dispose:async()=>{}};
  const session=createHostedCommentarySession({request:transport.request,player,deviceId:id(),onNotice:commentaryNotice,nativeAudioAvailable:android,initialListenerMuted:readCommentaryPreferences().listenerMuted,onPreferencesSaved:persistCommentaryPatch});
  if(ticket!==hostedCommentaryGeneration){session.dispose();await player.dispose?.();return null;}
  hostedCommentary=session;hostedCommentaryPlayer=player;session.update(commentaryContext());session.mountSurface?.({root,scoreDialog:dialog});return session;
 })();hostedCommentarySetup=task;
 try{return await task;}finally{if(hostedCommentarySetup===task)hostedCommentarySetup=null;}
}
function syncHostedCommentary(){
 if(hostedCommentary){hostedCommentary.update(commentaryContext());return;}
 if(hostedCommentaryActive&&onlineRoom&&commentaryServiceBase)void ensureHostedCommentary().catch(()=>commentaryNotice('Commentary is unavailable. Keep playing.'));
}
function commentaryNotice(text){if(!dialog.open)notice(text);}
async function openCommentary(){
 if(!onlineRoom){if(localVoice)return localVoice.open({scoreDialog:dialog});return openGlobalCommentary();}
 if(dialog.open){notice('Finish or close score entry before opening commentary.');return;}
 if(!commentaryServiceBase){notice('Live commentary is not connected for this build.');return;}
 try{const session=await ensureHostedCommentary();if(session)await session.open({scoreDialog:dialog});else notice('Sign in at your table to use commentary.');}
 catch{notice('Commentary is unavailable. Keep playing.');}
}
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
function confirmUndoScore(){
 const candidate=ownUndoCandidate();if(!candidate||tournamentPaused()||onlineRoom&&!onlineConnected)throw Error('This score cannot be undone now.');
 openDialog(`<h2>Undo last turn?</h2><p class="core-muted">${candidate.type==='score'?`Reopen ${esc(META[candidate.category].name)} and remove its score and attached bonus.`:candidate.type==='bonus'?`Remove the ${candidate.value}-point bonus and restart this turn.`:'Restart the last final Yahtzee attempt and reverse its bonus, if any.'} Return the turn to ${esc(game.players[candidate.seat].name)}. Any following unscored dice readings are cancelled; history is retained. A fresh roll is needed for connected dice.</p><button class="bigbtn score core-primary" data-action="confirm-undo-score" data-target="${esc(candidate.id)}" data-seat="${candidate.seat}" data-game="${esc(game.id)}" data-revision="${game.revision}">Undo turn · return turn</button><button class="all-scores" data-action="close">Keep the score</button>`);
}
let theme='light';try{theme=localStorage.getItem('yz_theme')==='dark'?'dark':'light';}catch{}
const descriptions={
  standard:'Three rolls. Extra Yahtzees add 100 and fill a category on the same turn using Joker placement.',
  competition:'Three rolls, or four while your final category is open. Extra Yahtzees add 100 and grant a fresh turn. One category ends a bonus chain.',
  accumulative:'Three rolls. Yahtzees of 1–6 score 100, 90, 80, 70, 60, 50. Each additional Yahtzee adds its face value and grants a fresh turn. A scored first Yahtzee is required.',
};
const competitionV2Description='Three rolls, or four while your final category is open. A first Yahtzee scores 50; repeats after it score 100 and earn another turn. Score the final category first. A Yahtzee that fills your final category opens a three-roll attempt. Each bonus Yahtzee adds 100 and renews the attempt. Choose No Yahtzee — finish turn when the attempt fails. Other players still finish their turns. New manual Competition games use no Joker scoring.';
const rulesDescription=()=>game.mode==='competition'&&game.rules.version===2?competitionV2Description:descriptions[game.mode];
const setupDescription=(mode,source)=>mode==='competition'&&source==='manual'?competitionV2Description:descriptions[mode];
document.body.innerHTML='<div id="coreApp" class="device"></div><dialog id="coreDialog" class="core-dialog"></dialog><div id="gameCelebration" role="status" aria-live="polite"></div><div id="coreNotice" role="status" aria-live="polite"></div>';
const root=document.getElementById('coreApp'),dialog=document.getElementById('coreDialog');
function applyTheme(){document.documentElement.dataset.theme=theme;import('./ui/playform-native.js').then(m=>m.syncPlayformBars(theme)).catch(()=>{});document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0b141c':'#f3f6f5');}
applyTheme();
function notice(text){clearTimeout(noticeTimer);const box=document.getElementById('coreNotice');box.textContent=text;if(text==='Saved on this device.'||text==='Saved to the shared game.')noticeTimer=setTimeout(()=>{box.textContent='';},2500);if(dialog.open){let alert=dialog.querySelector('[role="alert"]');if(!alert){alert=document.createElement('p');alert.setAttribute('role','alert');dialog.append(alert);}alert.textContent=text;}}
function gameHeader(){
 const tournament=onlineRoom?.tournament;
 const connection=onlineRoom?(onlineConnected?'Online':'Reconnecting'):'Offline · local game';
 return '<header class="compact-header play-header"><button class="hbtn home-top-button" data-action="home" aria-label="Home"><span aria-hidden="true">⌂</span> Home</button><button class="hbtn play-title" data-action="'+(tournament?'tournament-menu':'game-menu')+'"><strong>'+esc(tournament?.name||game.rules.name)+'</strong><small>'+(tournament?'Game '+onlineRoom.gameSequence+' of '+tournament.gameCount+' · '+tournament.playerCount+' players'+(tournament.status==='paused'?' · Paused':''):'Local game')+'</small></button><button class="hbtn connection-indicator '+(onlineRoom&&!onlineConnected?'reconnecting':'connected')+'" data-action="connection-details" aria-label="'+connection+' · connection details" title="'+connection+'"><span aria-hidden="true">●</span></button><button class="hbtn" data-action="game-menu" aria-label="Open clubhouse menu">☰</button></header>';
}
function header(){return '<header class="compact-header"><button class="hbtn home-top-button" data-action="home" aria-label="Back to Home"><span aria-hidden="true">←</span> Home</button><button class="hbtn" data-action="game-menu" aria-label="Open clubhouse menu">Menu <span aria-hidden="true">☰</span></button></header>';}

let launchGeneration=0;
let view='home',localVoice=null,localVoiceGameId=null,welcomeGate=null,pendingWelcome=false,pendingLocalLaunch=null,settingsCleanup=()=>{};
let homeAccount={status:'loading'},homeAccountGeneration=0;
function drawHome(){const focused=document.activeElement?.dataset?.action;root.innerHTML=renderClubhouseHome({savedGame:game&&!onlineRoom?game:null,commentary:readCommentaryPreferences(),voiceAvailable:!iosManualTest,account:homeAccount,theme});if(focused)root.querySelector('[data-action="'+focused+'"]')?.focus({preventScroll:true});}
function openHomeAccountPanel(kind){openDialog(kind==='profile'?renderPlayerProfile(homeAccount):kind==='people'?renderPeopleDialog(homeAccount):renderTrophyDialog(homeAccount));dialog.dataset.homeAccountPanel=kind;}
async function refreshHomeAccount(){const ticket=++homeAccountGeneration;let data;try{data=await loadHomeAccount();}catch{data={status:'error'};}if(ticket!==homeAccountGeneration||view!=='home')return;homeAccount=data;drawHome();const panel=dialog.dataset.homeAccountPanel;if(dialog.open&&panel)openHomeAccountPanel(panel);}
function showHome(){clearTimeout(noticeTimer);document.getElementById('coreNotice').textContent='';view='home';cancelPulse(root);clearCelebration();phoneCleanup();root.classList.remove('playing');localVoice?.setVisible(false);syncHostedCommentary();homeAccount={status:'loading'};drawHome();void refreshHomeAccount();}
async function returnHome(){launchGeneration++;welcomeGate?.cancel();if(onlineRoom){const {leaveOnline}=await import('./multiplayer/ui.js');leaveOnline();game=localGame;onlineRoom=null;onlineUserId=null;onlineConnected=false;hostedCommentaryActive=false;resetHostedCommentary();}dialog.close();showHome();}
function openNavigation(){if(dialog.open){notice('Finish or close score entry before opening the menu.');return;}openDialog(renderGameMenu({hasGame:!!game,theme,native:Capacitor.getPlatform()==='android',resumeTournament:!!(tournamentPaused()&&onlineRoom.hostId===onlineUserId&&onlineRoom.capabilities?.tournaments===true),resumeDisabled:busy||!onlineConnected}));dialog.dataset.navigation='true';}
function openGlobalCommentary(){if(iosManualTest){notice('Voice is deferred in this iOS manual test.');return;}const saved=readCommentaryPreferences(),defaults=readLocalPlayerDefaults(),players=defaults.length?defaults:[{displayName:localStorage.getItem('clubhouse-name')||'',gender:'',blurb:''}];openDialog(renderCommentarySettings({profile:saved.profile,enabled:saved.profile.enabled,listenerMuted:saved.listenerMuted,isHost:true,connected:false,id:'global-commentary'}).replace('Voice not connected · preferences only','Saved defaults · connect when a new game begins').replace('Enable table commentary','Offer commentary for new games').replace('Table voice style','Your default commentator').replace('<p data-commentary-error', '<details class="global-player-defaults"><summary>Saved player details for local games</summary><p class="core-muted">Stored on this phone. Only players in the new game are shared when you choose commentary.</p>'+players.map((p,i)=>'<label>Player '+(i+1)+' name<input name="localName'+i+'" maxlength="24" value="'+esc(p.displayName)+'"></label>'+renderPlayerProfileFields('defaultPlayer'+i,p)).join('')+'</details><p data-commentary-error')+'<p class="core-muted">Saved on this phone across app launches. Each new game asks whether to use commentary. Live voice needs an internet connection and sign-in; your optional player details are shared only when you choose commentary for that game.</p>');settingsCleanup();settingsCleanup=bindCommentarySettings(dialog,{onClose:()=>dialog.close(),onListenerMute:value=>{persistCommentaryPatch({listenerMuted:value});(onlineRoom?hostedCommentary:localVoice?.session)?.setListenerMuted?.(value);},onTableSettings:async value=>{const data=new FormData(dialog.querySelector('[data-commentary-form]'));saveLocalPlayerDefaults(players.map((_,i)=>({displayName:String(data.get('localName'+i)||''),...readPlayerProfileFields(data,'defaultPlayer'+i)})));const saved=persistCommentaryPatch({profile:{...value.profile,enabled:value.enabled}});const active=onlineRoom?hostedCommentary:localVoice?.session;if(active&&(!onlineRoom||onlineRoom.hostId===onlineUserId)){active.muteForGame?.();await active.configure({profile:saved.profile,enabled:saved.profile.enabled,listenerMuted:saved.listenerMuted});}notice('Commentary settings saved for every game.');}});}
function showTimingLog(){const values=readPlaybackTimings(),latest=values.at(-1);openDialog('<h2>Commentary response times</h2><p class="core-muted">From scoring to the phone audio-position callback. This measures the playback path, not sound reaching your ears. No jokes, blurbs or keys are stored here.</p>'+(latest?'<p>Latest: <strong>'+ (latest.elapsedMs/1000).toFixed(1)+' seconds</strong></p><ol class="timing-list">'+values.slice(-10).reverse().map(v=>'<li>'+ (v.elapsedMs/1000).toFixed(1)+'s<small>'+esc(v.basis==='score-submission'?'Score submitted → playback':'Accepted score observed → playback')+' · '+esc(new Date(v.at).toLocaleTimeString())+'</small></li>').join('')+'</ol>':'<p>No measured score commentary yet. Play a fresh score with commentary enabled.</p>'));}
function showLaunchFailure(message){view='welcome';root.innerHTML='<main class="launch-progress"><div class="launch-pulse" aria-hidden="true">⚄</div><h1>Your game is ready.</h1><p role="status">'+esc(message)+'</p><button class="bigbtn score core-primary" data-action="launch-signin">Sign in for live commentary</button><button class="all-scores" data-action="launch-without-voice">Continue without commentary</button></main>';}
async function launchLocalVoice(created,players,{resume=false}={}){const launchTicket=++launchGeneration;pendingLocalLaunch={created,players};view=resume?'game':'welcome';if(!resume)root.innerHTML='<main class="launch-progress"><div class="launch-pulse" aria-hidden="true">⚄</div><h1>Bringing your table to life.</h1><p>Connecting your saved commentator…</p><button class="all-scores" data-action="launch-without-voice">Continue without commentary</button></main>';
 try{if(Capacitor.getPlatform()!=='android')throw Error('Live voice is available on the Android host. You can continue scoring here.');const {auth}=await import('./multiplayer/client.js');if(!auth||!commentaryServiceBase)throw Error('Sign in to connect live commentary.');const {createNativeCommentaryPlayer}=await import('./commentary/native-player.js'),{createLocalCommentary}=await import('./commentary/local-client.js');const transport=createAuthenticatedCommentaryTransport({auth,serviceBase:commentaryServiceBase,directReaction:Capacitor.getPlatform()==='android',anonymousKey:import.meta.env.VITE_SUPABASE_ANON_KEY||''});const player=createNativeCommentaryPlayer({serviceBase:commentaryServiceBase,getAccessToken:transport.getAccessToken});localVoice?.dispose();const linked=await createLocalCommentary({auth,serviceBase:commentaryServiceBase,directReaction:Capacitor.getPlatform()==='android',anonymousKey:import.meta.env.VITE_SUPABASE_ANON_KEY||'',player,game:created,players,root,scoreDialog:dialog,onNotice:notice,resume});if(launchTicket!==launchGeneration){void linked.stopForGame();return;}localVoice=linked;localVoiceGameId=created.id;pendingLocalLaunch=null;if(resume){localVoice.refreshSurface();return;}
 welcomeGate=showWelcomeGate({root,session:localVoice.session,metadata:localVoice.metadata,onDone:()=>{welcomeGate=null;view='game';render();},onSkip:reason=>{welcomeGate=null;localStorage.setItem('dice-clubhouse:game-commentary:'+game.id,'no');void localVoice?.stopForGame().catch(()=>{});localVoice=null;view='game';render();if(['timeout','unavailable'].includes(reason))notice('The welcome could not connect. Your game is ready without commentary.');}});
 }catch(error){if(launchTicket!==launchGeneration)return;if(resume){notice('Scores are ready. Live commentary could not reconnect.');return;}showLaunchFailure(error.message.includes('Sign in')?'Sign in to connect your commentator, or continue without voice.':error.message);}}
async function prepareHostedStart(){if(iosManualTest)return true;const prefs=readCommentaryPreferences(),yes=await askGameCommentary(dialog,prefs);const session=await ensureHostedCommentary();if(session)await session.configure({profile:prefs.profile,enabled:yes,listenerMuted:yes?false:prefs.listenerMuted});pendingWelcome=yes;if(yes){view='welcome';root.innerHTML='<main class="launch-progress"><div class="launch-pulse" aria-hidden="true">⚄</div><h1>Opening your table.</h1><p>Getting the welcome ready…</p></main>';}return true;}
function startHostedWelcome(metadata){if(iosManualTest)return;if(!pendingWelcome){void ensureHostedCommentary().then(session=>session?.allowGreeting(metadata));return;}pendingWelcome=false;view='welcome';void ensureHostedCommentary().then(session=>{if(!session){view='game';render();return;}welcomeGate=showWelcomeGate({root,session,metadata,onDone:()=>{welcomeGate=null;view='game';render();},onSkip:reason=>{welcomeGate=null;session.muteForGame();void session.configure({profile:readCommentaryPreferences().profile,enabled:false,listenerMuted:true}).catch(()=>{});view='game';render();if(['timeout','unavailable'].includes(reason))notice('The welcome could not connect. Your game is ready without commentary.');}});}).catch(()=>{view='game';render();notice('Welcome unavailable. You can keep playing.');});}

function newScreen({players=2}={}){view='setup';cancelPulse(root);clearCelebration();phoneCleanup();root.classList.remove('playing');
 root.innerHTML=header()+renderLocalSetup({players,modes:MODES,description:descriptions.standard,camera:Capacitor.getPlatform()==='android',connectedDice:import.meta.env.MODE==='native-evaluation'||getDiceStatus().enabled,hasGame:!!game});
 root.querySelector('[data-setup-saved]').innerHTML=renderResumeEntry({local:true});nameInputs(players);
}
function updateSetupSummary(){const form=root.querySelector('#createCore');if(!form)return;const mode=form.querySelector('[name="mode"]'),source=form.querySelector('[name="source"]'),count=Number(form.querySelector('#playerCount').value);root.querySelector('.setup-title').textContent=count===1?'Solo game':'Local game';root.querySelector('.setup-intro').textContent=count===1?'Roll your dice. Enter your scores.':'One phone for your table. Take turns entering scores.';root.querySelector('[data-setup-summary]').textContent=(MODES[mode.value]?.name||'Game')+' · '+source.selectedOptions[0].textContent+' · '+count+(count===1?' player':' players')+(form.querySelector('[name="hideTotals"]').checked?' · Totals hidden':'');}
function nameInputs(n){
 const old=[...root.querySelectorAll('[name="player"]')].map(x=>x.value);
 const prior=root.querySelector('#createCore')?new FormData(root.querySelector('#createCore')):null;
 root.querySelector('#nameInputs').innerHTML=Array.from({length:n},(_,i)=>`<label>${n===1?'Your name':'Player '+(i+1)}<input name="player" aria-label="Player ${i+1} name" maxlength="24" required value="${esc(old[i]||readLocalPlayerDefaults()[i]?.displayName||(i===0?localStorage.getItem('clubhouse-name'):'')||['Dan','Amber','Sam'][i]||`Player ${i+1}`)}"></label>`).join('');
 root.querySelector('#playerPersonalization').innerHTML=Array.from({length:n},(_,i)=>`<details><summary>Player ${i+1} commentary details (optional)</summary>${renderPlayerProfileFields(`player${i}`,prior?.has(`player${i}Blurb`)?readPlayerProfileFields(prior,`player${i}`):readLocalPlayerDefaults()[i]||{})}</details>`).join('');
 updateSetupSummary();
}
function latest(){return game.turn?.rolls.filter(r=>!r.excluded).at(-1);}
function options(){
 if(onlineRoom&&!isDiceHost()&&sharedRolling())return null;
 if(game.turn?.source==='godice'&&hardwareCapture.capture){const preview=hardwareCapture.candidate();return preview?scoreOptions(game,preview.dice):null;}
 return ['simulated','godice','camera'].includes(game.turn?.source||game.source)?(latest()?scoreOptions(game,latest().dice):null):reportedFace?scoreOptions(game,Array(5).fill(reportedFace)):null;
}
function turnPanel(){
 if(game.finalChain)return finalChainPanel();
 if(game.status==='finished'){
  if(onlineRoom)return renderHostedResults({room:hostedCommentaryActive?onlineRoom:null,userId:onlineUserId,connected:onlineConnected,busy});
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
 return `<section class="dice-controls final-chain-panel" aria-labelledby="finalChainTitle"><h2 id="finalChainTitle">Final Yahtzee bonus</h2><p class="core-muted">${name} · Attempt ${chain.attempt} · ${3-rolls} ${3-rolls===1?'roll':'rolls'} remaining</p><p class="core-muted">Roll the dice, then confirm the result here. A Yahtzee adds 100 and gives you three fresh rolls. Three rolls without one end this player’s turn.</p>${own?`<div class="countgrid" aria-label="Report a bonus Yahtzee">${[1,2,3,4,5,6].map(face=>`<button class="countbtn" data-action="final-chain-outcome" data-face="${face}"${enabled?'':' disabled'}><span class="n">${face}s</span><span class="v">Five ${face}s · +100</span></button>`).join('')}</div><button class="bigbtn" data-action="final-chain-finish"${enabled&&(!onlineRoom||onlineRoom.capabilities?.manualAttemptFinish===true)?'':' disabled'}>No Yahtzee — finish turn</button><button class="all-scores" data-action="final-chain-outcome" data-face="0"${enabled?'':' disabled'}>Record one unsuccessful roll (${rolls+1}/3)</button>`:`<p role="status">Waiting for ${name} to report their bonus roll.</p>`}<p class="core-muted">${tournamentPaused()?'Tournament paused. Progress is saved.':onlineRoom&&!onlineConnected?'Reconnecting. Wait for the table to sync.':'Manual results are player reported; your scorecard categories stay filled.'}</p></section>`;
}
function confirmFinalChainOutcome(face,finishAttempt=false){
 if(!game.finalChain||!ownsSeat(game.finalChain.seat)||tournamentPaused()||(onlineRoom&&!onlineConnected))throw Error('Wait for your active bonus attempt before reporting a roll.');
 const rolls=game.turn?.phase==='final-bonus'?game.turn.manualRolls?.length||0:0;
 const success=face!==null;
 openDialog(`<h2>${success?'Confirm bonus Yahtzee':'Confirm no Yahtzee'}</h2><p class="core-muted">${success?`Five ${face}s · add 100 points and start a fresh three-roll attempt.`:finishAttempt?'Confirm that your bonus attempt ended without a Yahtzee. This ends only your turn; other players still finish theirs.':rolls===2?'This is the third roll without a Yahtzee. End your bonus chain; other players still finish their turns.':`Record roll ${rolls+1} without a Yahtzee. You will still have ${2-rolls} ${2-rolls===1?'roll':'rolls'} in this attempt.`}</p><button class="bigbtn score core-primary" data-action="confirm-final-chain" data-finish="${finishAttempt}" data-face="${face??0}" data-game="${esc(game.id)}" data-revision="${game.revision}" data-attempt="${game.finalChain.attempt}">${success?'Add 100 · three fresh rolls':finishAttempt?'Finish my turn':'Confirm this roll'}</button><button class="all-scores" data-action="close">Cancel · keep rolling</button>`);
}
function scoreCell(key, seat) {
 const value=game.sheets[seat][key], name=esc(game.players[seat].name), category=META[key].name;
 const attrs=`data-score-key="${key}" data-score-seat="${seat}"`;
 if(value!==undefined){
  const label=`${name} ${category}: ${value===0?'scratched, zero points':`${value} points`}`;
  const content=value===0?'<svg class="scratch-value" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100"/></svg>':value;
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
function bonusCell(seat,{hideTotals=false}={}) {
 const sheet=game.sheets[seat],opt=options();
 const manual=(game.turn?.source||game.source)==='manual';
 const active=!game.finalChain&&game.status==='active'&&seat===game.activeSeat&&ownsSeat(seat)&&(!onlineRoom||onlineConnected)&&sheet.yahtzee!==undefined;
 const ready=!hardwareCapture.capture&&!sharedRolling()&&(manual||opt?.combinations.yahtzee);
 const undo=ownUndoCandidate();
 const undoControl=undo&&undo.seat===seat&&undo.type!=='score'?`<button class="all-scores bonus-undo" data-action="undo-last-score" aria-label="Undo last Yahtzee bonus for ${esc(game.players[seat].name)}"${tournamentPaused()||onlineRoom&&!onlineConnected?' disabled':''}>Undo last bonus</button>`:'';
 return `<td>${active?`<button class="add-yahtzee" data-action="another-yahtzee" aria-label="Add another Yahtzee for ${esc(game.players[seat].name)}; ${hideTotals?'bonus total hidden':`bonus total ${sheet.yahtzeeBonus||0}`}" ${ready?'':'disabled'}>${sheet.yahtzeeBonus&&!hideTotals?`<span class="bonus-total">${sheet.yahtzeeBonus}</span>`:'<span>Yahtzee</span>'}<span class="bonus-plus" aria-hidden="true">+</span></button>`:hideTotals?'<span class="hidden-total">Hidden</span>':sheet.yahtzeeBonus?`<span class="bonus-total">${sheet.yahtzeeBonus}</span>`:'—'}${undoControl}</td>`;
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
 openDialog(`<h2>${standard?(sheet.yahtzee>0?'Yahtzee bonus · +100':'Yahtzee · Joker scoring'):'Another Yahtzee!'}</h2><p class="core-muted">${esc(game.players[game.activeSeat].name)}${standard?' · Choose the matching dice to find the required scoring category. The face does not change the bonus.':' · Which face did you roll five of?'}</p><div class="countgrid">${[1,2,3,4,5,6].map(n=>`<button class="countbtn" data-action="repeat-face" data-face="${n}"><span class="n">${n}s</span><span class="v">Five ${n}s</span></button>`).join('')}</div><p class="core-muted">${sheet.yahtzee===0?(game.rules.joker?'Your first Yahtzee was marked zero: Joker placement applies, with no bonus.':'Your first Yahtzee was marked zero: no bonus or Joker scoring. Choose a legal category.'):game.rules.extraTurn?'Confirm the bonus to take a fresh extra turn.':'Fill the matching upper category if it is open; otherwise use Joker placement. Save the category and +100 together. No extra turn.'}</p>`);
}
function declareYahtzee(face){
 reportedFace=face;dialog.close();render();
 const opt=options();
 if(opt.extraTurn){
  openDialog(`<h2>Yahtzee · +${opt.bonus}</h2><p class="core-muted">Five ${face}s. Add the bonus and take a fresh extra turn. Your original Yahtzee score stays unchanged.</p><button class="bigbtn score core-primary" data-action="confirm-another">Add ${opt.bonus} &amp; take extra turn</button>`);
  dialog.dataset.bonusConfirmation='true';
 }else{
  notice(opt.bonus?'Choose a highlighted category. Your 100-point bonus will be saved with it.':(game.rules.joker?'Choose a highlighted category using Joker placement. No bonus is awarded.':'Choose a legal category. No bonus or Joker scoring applies.'));
  const keys=Object.keys(opt.scores);if(keys.length===1)choose(keys[0]);
 }
}
function render(){
 applyScorecardSize(root);
 if(dialog.open&&dialog.dataset.tournamentMenu==='true')dialog.close();
 if(view==='welcome')return;
 if(view==='online')return; // The multiplayer session owns this surface, including late save cleanup.
 if(view==='home'){showHome();return;}
 if(!game){newScreen();return;}
 root.classList.add('playing');
 root.style.setProperty('--turn-hue',[162,267,205,24,48,332,185,232][game.activeSeat]);
 hardwareCapture.sync(game,getDiceStatus());
 if(hardwareTurnId!==game.turn?.id){hardwareTurnId=game.turn?.id;hardwareHeld=Array(5).fill(false);}
 const totals=results(game).totals,active=game.status==='active';
 root.innerHTML=gameHeader()+`<div class="game-strip sr-only"><span class="turn-indicator">${active?`${esc(game.players[game.activeSeat].name)} to play`:'Game complete'}</span><span>${onlineRoom?(onlineConnected?'Online · '+onlineRoom.code:'Reconnecting…'):`${esc(game.rules.name)} · ${(game.turn?.source||game.source)==='godice'?'GoDice':(game.turn?.source||game.source)==='camera'?'Camera':'Manual'}`}</span></div><main class="compact-game" aria-label="Game scorecard"><div id="liveDiceStatus"></div>${turnPanel()}<div data-hosted-commentary-inline></div>${renderPhoneScorecard(game,{viewerSeat:onlineRoom?onlineRoom.members.findIndex(member=>member.userId===onlineUserId):game.activeSeat,scoreCell,bonusCell,totals,winners:results(game).winners,peerOffset,sharedLastTurn:onlineRoom?null:ownUndoCandidate()})}</main>`;
 if(onlineRoom?.tournament){
  if(onlineRoom.tournament.status==='completed')root.querySelector('main').insertAdjacentHTML('afterbegin',renderTournamentBanner(onlineRoom,onlineUserId,{connected:onlineConnected,busy}));
  if(tournamentPaused())root.querySelectorAll('.core-score-table button').forEach(button=>{button.disabled=true;});
  if(tournamentPaused())root.querySelector('.turn-indicator').textContent='Tournament paused';
 }
 phoneCleanup();phoneCleanup=bindPhoneScorecard(root,{onPeerOffsetChange:value=>{peerOffset=value;}});
 root.querySelectorAll('.phone-score-table [data-score-seat]').forEach(cell=>{const seat=Number(cell.dataset.scoreSeat);cell.classList.toggle('turn-column',active&&seat===game.activeSeat);cell.classList.toggle('waiting-column',active&&seat!==game.activeSeat);cell.classList.toggle('winner-column',!active&&results(game).winners.includes(seat));});
 updateDiceStatus();
 updateHardwarePanel();
 applyScorePulse();
 hostedCommentary?.mountSurface?.({root,scoreDialog:dialog});localVoice?.session.mountSurface?.({root,scoreDialog:dialog});

}
function ensureAutomaticTurn(){
 if(view!=='game')return;
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
 if(view!=='game')return;
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
function applyScorePulse(){refreshPulse(root);
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
function clearCelebration(){clearTimeout(effectTimer);activeEffect=null;const box=document.getElementById('gameCelebration');box.replaceChildren();box.className='';}
function celebrate(previous,next){
 const pulseId=next.id,pulseRevision=next.revision;
 const seen=new Set(previous?.events?.map(event=>event.id)||[]);
 const invalidated=previous?.id!==next.id||next.events.some(event=>['score-undo','score-correction'].includes(event.type)&&!seen.has(event.id));
 if(invalidated){cancelPulse(root);clearCelebration();}
 const acceptedEffect=celebration(previous,next);
 if(acceptedEffect?.upperBonus||acceptedEffect?.bonus>0)queueMicrotask(()=>{if(game?.id===pulseId&&game.revision===pulseRevision)pulseAccepted(root,previous,next);});
 const effect=celebration(previous,next);if(!effect||effect.kind!=='finish')return;
 clearCelebration();activeEffect={...effect,gameId:next.id};
 const box=document.getElementById('gameCelebration'),message=celebrationMessage(effect,next);
 box.className='celebration celebration-finish';const title=document.createElement('strong');title.textContent=onlineRoom?.tournament?.status==='completed'?'Tournament complete!':message.title;box.append(title);
 const detail=document.createElement('span');detail.textContent=onlineRoom?.tournament?.status==='completed'?`${message.title} ${message.subtitle} Tournament complete — see the final awards below.`:message.subtitle;box.append(detail);
 const particles=document.createElement('div');particles.className='celebration-particles';particles.setAttribute('aria-hidden','true');for(let i=0;i<12;i++){const particle=document.createElement('i');particle.style.setProperty('--i',i);particle.textContent='◆';particles.append(particle);}box.append(particles);
 effectTimer=setTimeout(clearCelebration,5000);
}
document.addEventListener('visibilitychange',()=>{localVoice?.setVisible(!document.hidden&&view!=='home');syncHostedCommentary();if(document.hidden){cancelPulse(root);clearCelebration();}});
window.addEventListener('pagehide',()=>{localVoice?.dispose();localVoice=null;resetHostedCommentary();cancelPulse(root);clearCelebration();});
window.addEventListener('pageshow',syncHostedCommentary);

function showRules(){openDialog(`<h2>${esc(game.rules.name)} rules · version ${game.rules.version}</h2><p class="core-muted">Score totals: ${game.hideTotals?'hidden until the game ends':'visible during play'}.</p><p class="core-muted">${rulesDescription()}</p><p class="core-muted">Tap + in your column to score. Tap a recorded score to correct it. A scratched first Yahtzee earns no bonus. ${game.rules.joker?'This saved game uses Joker placement.':'No Joker placement: choose a legal scoring category.'}</p><p class="core-muted">Corrections change category points without rewriting historical turns or granted bonuses. Suggested points are only saved when confirmed.</p>`);}
async function persist(next){
 busy=true;root.setAttribute('inert','');
 try{const saved=await saveCore(next);const previous=game;game=next;reportedFace=0;render();celebrate(previous,next);if(saved?.recoveryOnly)notice('Saved in recovery storage. Keep this browser’s data until database access returns.');}
 catch(e){notice(`Save failed: ${e.message}. Retry before continuing.`);throw e;}
 finally{busy=false;root.removeAttribute('inert');if(game)render();queueMicrotask(ensureAutomaticTurn);}
}
async function send(action,commandId){
 if(busy)throw Error('Wait for the current save before submitting another action.');
 if(tournamentPaused())throw Error('The tournament is paused. Ask the host to resume.');
 const scoreCommandId=commandId||id();if(['score','bonus','final-chain-roll'].includes(action.type))markScoreSubmitted(scoreCommandId);
 if(onlineRoom){
  busy=true;root.setAttribute('inert','');
  try{const {sendOnline}=await import('./multiplayer/ui.js');await sendOnline(action,onlineRoom.revision,scoreCommandId);reportedFace=0;render();}
  finally{busy=false;root.removeAttribute('inert');render();queueMicrotask(ensureAutomaticTurn);}
  return;
 }
 const beforeLocal=game;
 const startCommandId=id();
 const base=!game.turn&&game.source==='manual'&&['score','bonus','final-chain-roll'].includes(action.type)
  ?command(game,{type:'start',seat:game.activeSeat},{id:startCommandId}):game;
 const acceptedAction={seat:base.activeSeat,...action};await persist(command(base,acceptedAction,{id:scoreCommandId}));
 if(localStorage.getItem('dice-clubhouse:game-commentary:'+game.id)==='yes'){const mirrored=[...(base!==beforeLocal?[{commandId:startCommandId,action:{type:'start',seat:beforeLocal.activeSeat}}]:[]),{commandId:scoreCommandId,action:acceptedAction}];queueLocalCommands(game.id,mirrored);if(localVoice&&localVoiceGameId===game.id)void localVoice.flush();}
}
let midnightCleanup=()=>{};
function openMidnightPanel(kind){openDialog(renderMidnightPanel(kind));midnightCleanup=bindMidnightPanel(dialog,kind,next=>{initializeMidnight();if(view==='home')drawHome();if(next)openMidnightPanel(next);else dialog.close();});}
// close is queued: a replacement panel may already be open when it arrives.
// openDialog cleans the outgoing panel synchronously before binding its replacement.
dialog.addEventListener('close',()=>{if(!dialog.open)midnightCleanup();});
function openDialog(html){midnightCleanup();delete dialog.dataset.homeAccountPanel;insightsCleanup();delete dialog.dataset.insightRequest;delete dialog.dataset.tournamentMenu;delete dialog.dataset.navigation;delete dialog.dataset.bonusConfirmation;dialog.innerHTML=`<button class="sheet-close" data-action="close" aria-label="Close panel">×</button>${html}`;dialog.showModal();hostedCommentary?.refreshSurface?.();}
async function openMultiplayer(joinCode='',landing='home'){
 view='online';
 hostedCommentaryActive=false;resetHostedCommentary();commentarySession.close();
 if(!onlineRoom)localGame=game;
 dialog.close();pending=null;reportedFace=0;
 const {openOnline}=await import('./multiplayer/ui.js');
 await openOnline(root,{
  notice,beforeStart:prepareHostedStart,startFailed(){pendingWelcome=false;view='online';},voiceReady:()=>{const launch=pendingLocalLaunch;if(launch)return launchLocalVoice(launch.created,launch.players);},
  greeting:startHostedWelcome,
  commentary(){return openCommentary();},
  table(room,userId,connected){if(!room){hostedCommentaryActive=false;resetHostedCommentary();onlineRoom=null;}else{hostedCommentaryActive=true;onlineRoom=room;onlineUserId=userId;onlineConnected=connected;syncHostedCommentary();}},
  account(user){void connectSocial(user).catch(()=>{});if(!user||onlineUserId&&user.id!==onlineUserId){view='online';game=localGame;dialog.close();pending=null;reportedFace=0;phoneCleanup();cancelPulse(root);clearCelebration();hostedCommentaryActive=false;resetHostedCommentary();onlineRoom=null;onlineUserId=null;onlineConnected=false;}},
  exit(){hostedCommentaryActive=false;resetHostedCommentary();game=localGame;onlineRoom=null;onlineUserId=null;onlineConnected=false;showHome();},
  game(room,userId,connected,changed){
   hostedCommentaryActive=true;if(!pendingWelcome&&!welcomeGate)view='game';
   const gameChanged=game?.id!==room.game?.id||game?.revision!==room.game?.revision;
   const beganRolling=room.liveDice?.phase==='rolling'&&onlineRoom?.liveDice?.phase!=='rolling';
   if(changed&&!busy&&(gameChanged||(beganRolling&&room.hostId!==userId)||room.tournament?.status==='paused')){const choosing=dialog.open||reportedFace;dialog.close();pending=null;reportedFace=0;if(choosing)notice('The shared game updated. Choose your score again.');}
   const redraw=changed||!onlineConnected;
   const previous=onlineRoom?.code===room.code?game:null;
   onlineRoom=room;onlineUserId=userId;onlineConnected=connected;game=room.game;syncHostedCommentary();
   if(redraw){render();celebrate(previous,game);}
  },
  connection(connected){onlineConnected=connected;syncHostedCommentary();if(onlineRoom)render();},
 },joinCode,landing);
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
 if(onlineRoom){const {onlineHistory}=await import('./multiplayer/ui.js');const all=await onlineHistory();openDialog(`<h2>This table’s games</h2><p class="core-muted">Each game keeps its players, scores and scoring order. Export includes their complete accepted histories.</p>${all.map(g=>`<article class="history-row"><strong>${esc(g.rules.name)} · ${esc(g.status)}</strong><span>${esc(g.players.map(p=>p.name).join(' · '))}</span><small>${esc(g.startedAt.slice(0,10))} · ${g.hideTotals&&g.status!=='finished'?'Totals hidden':results(g).totals.join(' / ')}</small></article>`).join('')}`);return;}
 const all=await listCore();openDialog(`<h2>Game history</h2><p class="core-muted">Modes and solo results are kept separate. Select a game to view or resume.</p>${all.length?all.map(g=>`<button class="history-row" data-action="load" data-id="${esc(g.id)}"><strong>${esc(g.rules.name)} · ${g.players.length===1?'Solo':`${g.players.length} players`}</strong><span>${esc(g.players.map(p=>p.name).join(', '))}</span><small>${esc(g.startedAt.slice(0,10))} · ${g.status} · ${g.hideTotals&&g.status!=='finished'?'Totals hidden':results(g).totals.join(' / ')}</small></button>`).join(''):'<p>No new-mode games saved yet.</p>'}`);
}
async function analytics(){
 if(!game)return;
 const roomId=onlineRoom?.id,revision=onlineRoom?.revision,request=id();
 openDialog('<h2>Loading insights…</h2><p class="core-muted">Reading accepted game history.</p>');dialog.dataset.insightRequest=request;
 try{
  const games=onlineRoom?await (await import('./multiplayer/ui.js')).onlineHistory():[game];
  if(!dialog.open||dialog.dataset.insightRequest!==request)return;
  if(roomId!==onlineRoom?.id||revision!==onlineRoom?.revision){notice('The table changed. Open insights again for a fresh view.');dialog.close();return;}
  const title=onlineRoom?.tournament?onlineRoom.tournament.name+' · insights':'Game insights';
  openDialog(renderTournamentInsights(games,{title,ceiling:onlineRoom?.tournament?.gameCount})+'<button class="all-scores" data-action="roll-insights">Dice-level roll insights</button>');
  insightsCleanup=bindTournamentInsights(dialog,games);
 }catch(error){if(dialog.open&&dialog.dataset.insightRequest===request)openDialog('<h2>Insights unavailable</h2><p>Reconnect and try again. Your game remains saved.</p>');}
}
function rollInsights(){openDialog(`<h2>Roll insights</h2><p class="core-muted">${esc(game.rules.name)} · This game only. Camera, GoDice, simulated and corrected rolls retain their source in the exported history. Missing manual rolls are not counted as failed combinations.</p>${game.players.map((p,i)=>{const a=rollAnalytics(game,i);return `<h3>${esc(p.name)}</h3><p>${a.recordedRolls} recorded rolls · ${a.corrected} corrected</p>${a.recordedRolls?`<table><thead><tr><th>Combination</th><th>Rolls</th><th>Turns</th></tr></thead><tbody>${Object.keys({threeKind:0,fourKind:0,fullHouse:0,smallStraight:0,largeStraight:0,yahtzee:0}).map(k=>`<tr><td>${META[k].name}</td><td>${a.counts[k]||0}</td><td>${a.turns[k]||0}</td></tr>`).join('')}</tbody></table>`:'<p class="core-muted">No dice-level data recorded.</p>'}`;}).join('')}<p class="core-muted">Natural full houses are exactly 3 + 2. Kind and straight counts are inclusive; a Yahtzee also counts as three/four of a kind.</p>`);}
document.addEventListener('change',e=>{
 if(e.target.id==='playerCount')nameInputs(Number(e.target.value));
 if(e.target.closest('#createCore'))updateSetupSummary();
 if(e.target.id==='modeSelect'||e.target.matches('#createCore [name="source"]'))root.querySelector('#modeDescription').textContent=setupDescription(root.querySelector('#modeSelect').value,root.querySelector('#createCore [name="source"]').value);
 
 if(e.target.matches('[data-hardware-held]'))hardwareHeld[Number(e.target.dataset.hardwareHeld)]=e.target.checked;
 if(e.target.matches('.held'))root.querySelector(`[data-die="${e.target.dataset.hold}"]`).disabled=e.target.checked;
});
document.addEventListener('submit',async e=>{
 if(e.target.id!=='createCore')return;e.preventDefault();if(busy)return;
 try{const f=new FormData(e.target);if(f.get('source')!=='camera'){const {disconnectCamera}=await import('./dice/camera-panel.js');await disconnectCamera();}const playerDrafts=commentarySession.readPlayers(f);saveLocalPlayerDefaults(playerDrafts);const created=createCoreGame({names:f.getAll('player'),mode:f.get('mode'),source:f.get('source'),...(f.get('mode')==='competition'&&f.get('source')==='manual'?{rulesVersion:2}:{}),hideTotals:f.has('hideTotals'),id:id()});const yes=iosManualTest?false:await askGameCommentary(dialog,readCommentaryPreferences());localStorage.setItem('dice-clubhouse:game-commentary:'+created.id,yes?'yes':'no');view='game';localVoice?.dispose();localVoice=null;await persist(created);commentarySession.setPlayers(created.id,playerDrafts);if(yes)await launchLocalVoice(created,playerDrafts);}catch(e){notice(e.message);}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b||busy)return;
 const a=b.dataset.action;if(dialog.dataset.navigation==='true'){dialog.close();delete dialog.dataset.navigation;}
 root.querySelector('.game-menu')?.removeAttribute('open');
 try{
  if(a==='home')await returnHome();
  if(a==='game-menu'){if(dialog.open&&dialog.querySelector('.midnight-settings-links'))dialog.close();openNavigation();}
  if(a==='midnight-avatar')openMidnightPanel('avatar');
  if(a==='midnight-locations')openMidnightPanel('locations');
  if(a==='midnight-settings')openMidnightPanel('settings');
  if(e.isTrusted)playMidnightSound();
  if(a==='social-inbox'){dialog.close();await openMultiplayer('','invitations');}
  if(a==='tournament-players'){dialog.close();await (await import('./multiplayer/social-ui.js')).openSocial(onlineRoom);}
  if(a==='connection-details')openDialog('<h2>Connection</h2><p>'+ (onlineRoom?(onlineConnected?'Online · ':'Reconnecting · ')+esc(onlineRoom.code):'Local game · works offline')+'</p><button class="all-scores" data-action="close">Close</button>');
  if(a==='scorecard-display')openDialog(renderScorecardDisplay());
  if(a==='bonus-guide')openDialog(`<h2>Your upper bonus</h2><p>Reach 63 upper points for +35. The header ring shows points remaining, the signed pace shows your surplus or deficit against three of each, and outlined tiles count open upper frames. At 63 the upper-total row includes the bonus. Beside each upper-category label, three baseline segments and a fourth surplus segment fill left to right for matching dice scored. The dotted marker after the third segment is the usual pace. A star marks a five-dice Yahtzee result if it was legally placed in an upper box. Empty outlines mean an open category; an amber cross means scratched.</p><p>Mint indicators meet the three-of-each benchmark; amber indicators are below it. Point badges show the real surplus or deficit: four Sixes gives +6, covering the −5 from two Fives. The four-dice ceiling assumes up to four matching dice in every remaining upper frame. “4-dice out” means that ceiling is below 63; it is not a probability or a ban on legal five-dice scores. A +35 ribbon marks the earned bonus. None predicts your next roll.</p>${game.players.map((player,seat)=>{const p=upperProgress(game.sheets[seat]);return game.hideTotals&&game.status==='active'?'':`<h3>${esc(player.name)}</h3><p>${p.subtotal}/${p.threshold} · ${p.needed} needed · ${p.remaining} open frames · Four-dice ceiling ${p.fourDiceMaximum}${!p.fourDiceReachable&&p.state!=='secured'?' — cannot reach 63 with four or fewer per open frame':''} · Legal five-dice ceiling ${p.maximum} · ${p.state==='secured'?'Bonus secured +'+p.award:p.state==='unreachable'?'Out of reach':'Still possible'} · ${p.pace===0?'On pace':Math.abs(p.pace)+(p.pace>0?' ahead of pace':' behind pace')}</p>`;}).join('')}<button class="all-scores" data-action="close">Got it</button>`);
  if(a==='tournament-menu'&&onlineRoom?.tournament){openDialog(renderTournamentActions(onlineRoom,onlineUserId,{connected:onlineConnected,busy}));dialog.dataset.tournamentMenu='true';dialog.classList.add('tournament-drawer');root.querySelector('[data-action="tournament-menu"]')?.setAttribute('aria-expanded','true');}
  if(a==='global-commentary')openGlobalCommentary();
  if(a==='timing-log')showTimingLog();
  if(a==='build-info'){let nativeInfo=null;if(Capacitor.isNativePlatform())try{nativeInfo=await (await import('@capacitor/app')).App.getInfo();}catch{}openDialog(renderBuildInfo({nativeInfo,game}));}
  if(a==='home-solo')newScreen({players:1});
  if(a==='home-local')newScreen({players:2});
  if(a==='home-online'||a==='home-people')openHomeAccountPanel('people');
  if(a==='home-trophies')openHomeAccountPanel('trophies');
  if(a==='home-profile')openHomeAccountPanel('profile');
  if(a==='home-account-retry'){homeAccount={status:'loading'};drawHome();const panel=dialog.dataset.homeAccountPanel||'people';openHomeAccountPanel(panel);void refreshHomeAccount();}
  if(a==='home-tournament')openDialog(renderTournamentEntry());
  if(a==='tournament-create')await openMultiplayer('','host-tournament');
  if(a==='tournament-join')await openMultiplayer('','join');
  if(a==='online-sessions')await openMultiplayer('','sessions');
  if(a==='resume-game'){view='game';localVoice?.setVisible(true);render();if(!localVoice&&Capacitor.getPlatform()==='android'&&readCommentaryPreferences().profile.enabled&&localStorage.getItem('dice-clubhouse:game-commentary:'+game.id)==='yes')void launchLocalVoice(game,[],{resume:true});}
  if(a==='launch-signin')await openMultiplayer('','voice-signin');
  if(a==='launch-without-voice'){launchGeneration++;localStorage.setItem('dice-clubhouse:game-commentary:'+game.id,'no');pendingLocalLaunch=null;void localVoice?.stopForGame().catch(()=>{});localVoice=null;view='game';render();}
  if(a==='commentary-settings')await openCommentary();
  if(a==='camera-settings'||a==='capture-camera'){if(onlineRoom)throw Error('Hosted camera games are not enabled yet.');const {openCameraGame}=await import('./dice/camera-panel.js');await openCameraGame({getGame:()=>game,commit:(action,commandId)=>send(action,commandId),autoCapture:a==='capture-camera'});}
  if(a==='camera-test'){const {openDiceIdentificationTest}=await import('./dice/camera-panel.js');await openDiceIdentificationTest();}
  if(a==='start-camera')await send({type:'start',source:'camera'});
  if(a==='connect-dice'){clearTimeout(settleTimer);hardwareCapture.cancel();updateHardwarePanel();const {openDiceConnections}=await import('#dice-panel');openDiceConnections();}
  if(a==='theme'){theme=theme==='dark'?'light':'dark';applyTheme();try{localStorage.setItem('yz_theme',theme);}catch{}b.textContent=(theme==='dark'?'Light':'Dark')+' mode';if(view==='home')drawHome();}
  if(a==='online')await openMultiplayer(); if(a==='new'){if(onlineRoom)await returnHome();localVoice?.setVisible(false);newScreen();}
  if(a==='saved-sessions')await openMultiplayer('','sessions');
  if(a==='resume'){view='game';render();}
  if(a==='history'){if(onlineRoom)await openMultiplayer();else await showHistory();}
  if(a==='load'){view='game';game=(await listCore()).find(g=>g.id===b.dataset.id);reportedFace=0;dialog.close();render();}
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
  if(a==='final-chain-finish')confirmFinalChainOutcome(null,true);
  if(a==='final-chain-outcome')confirmFinalChainOutcome(Number(b.dataset.face)||null);
  if(a==='confirm-final-chain'){
   if(!game.finalChain||game.id!==b.dataset.game||game.revision!==Number(b.dataset.revision)||game.finalChain.attempt!==Number(b.dataset.attempt)||!ownsSeat(game.finalChain.seat))throw Error('The bonus attempt changed. Review the current roll again.');
   await send({type:'final-chain-roll',face:Number(b.dataset.face)||null,...(b.dataset.finish==='true'?{finishAttempt:true}:{})});dialog.close();
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
   await send({type:'undo-score',target:candidate.id,seat:candidate.seat});dialog.close();notice('Turn undone. Start a fresh turn.');
  }
  if(a==='close'){midnightCleanup();cancelBonus();dialog.close();}
  if(a==='analytics')await analytics();
  if(a==='roll-insights')rollInsights();
  if(['tournament-standings','tournament-exit','tournament-invitation','tournament-pause','tournament-resume'].includes(a))dialog.close();
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
   try{if(a==='rematch-ready'&&onlineRoom?.hostId===onlineUserId)await prepareHostedStart();const {setOnlineReady}=await import('./multiplayer/ui.js');await setOnlineReady(a==='rematch-ready');if(game.status==='finished'&&pendingWelcome){view='game';render();}notice(game.status==='finished'?(a==='rematch-ready'?'You’re ready for the next game.':'You’re not ready yet.'):`New game · ${game.players[game.activeSeat].name} starts.`);}
   finally{busy=false;render();}
  }
  if(a==='rules')showRules();
  if(a==='cancel-joker'){reportedFace=0;render();}
  if(a==='confirm-score'||a==='confirm-total'){
   let value=Number(b.dataset.value);
   if(a==='confirm-total'){const field=dialog.querySelector('#manualTotal');value=Number(field.value);if(field.value===''||!Number.isInteger(value)||value<0||value>30)throw new Error('Enter a whole number from 0 to 30.');}
   const action=pending.target?{type:'correct-score',target:pending.target,seat:pending.seat,value}:{type:'score',category:pending.category,value,yahtzeeFace:Number(b.dataset.face)||reportedFace};
   const serialized=JSON.stringify(action);
   if(pending.submission&&pending.submission.action!==serialized)throw Error('Retry the same score, or close this panel and check the shared scorecard before changing it.');
   pending.submission??={action:serialized,id:id()};
   const buttons=[...dialog.querySelectorAll('button')].map(button=>[button,button.disabled]);
   let status=dialog.querySelector('[data-score-save-status]');if(!status){status=document.createElement('p');status.dataset.scoreSaveStatus='';status.setAttribute('role','status');dialog.append(status);}
   status.textContent='Saving score…';dialog.setAttribute('aria-busy','true');for(const[button]of buttons)button.disabled=true;
   try{await send(action,pending.submission.id);dialog.close();}
   catch(error){status.textContent='Save not confirmed. Reconnect and check the shared scorecard, or retry the same score.';throw error;}
   finally{dialog.removeAttribute('aria-busy');for(const[button,disabled]of buttons)if(button.isConnected)button.disabled=disabled;}
  }
  if(a==='export'){
   const all=onlineRoom?(onlineRoom.capabilities?.history?(await import('./multiplayer/ui.js')).onlineHistory():[onlineRoom.game]):await listCore();
   const savedGames=await all,url=URL.createObjectURL(new Blob([JSON.stringify({schema:1,exportedAt:new Date().toISOString(),games:savedGames},null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='clubhouse-games.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
 }catch(e){notice(e.message);}
});
async function initialize(){try{game=await loadCore();const join=new URLSearchParams(location.search).get('join'),saved=(await import('./multiplayer/social-links.js')).readSocialDestination();if(join)await openMultiplayer(join);else if(saved)await openMultiplayer(saved.code,socialLandingView(saved));else showHome();}catch(e){root.innerHTML=header()+'<main class="new-core"><h1>Save recovery needs attention</h1><p>Your saved records have not been deleted.</p></main>';notice(e.message);}}
initialize().then(async()=>{
 void watchHomeAccount(()=>{homeAccountGeneration++;if(view==='home')showHome();}).catch(()=>{});
 try{await(await import('./multiplayer/social-native.js')).initialiseNativeSocial();}catch{ /* Native setup remains optional for manual play. */ }
 try{const {auth}=await import('./multiplayer/client.js'),session=await auth?.getSession();await(await import('./multiplayer/social-ui.js')).connectSocial(session?.data?.session?.user);}catch{}
});
document.addEventListener('clubhouse-open-tournament',async event=>{
 const {rememberSocialDestination,clearSocialDestination}=await import('./multiplayer/social-links.js');
 const destination=event.detail;if(!/^[A-Z2-9]{8}$/.test(destination?.code||''))return;
 rememberSocialDestination(destination);
 if(dialog.open||busy){notice('Finish your score entry first, then open Invitations from the menu.');return;}
 try{await openMultiplayer(destination.code,socialLandingView(destination));}catch(error){notice(error.message);}
});















dialog.addEventListener('close',()=>hostedCommentary?.refreshSurface?.());

document.addEventListener('change',event=>{if(event.target.matches('[name="scorecard-size"]')){try{saveScorecardSize(event.target.value);applyScorecardSize(root);}catch{notice('Could not save display size. Check device storage.');}}});
dialog.addEventListener('close',()=>{dialog.classList.remove('tournament-drawer');if(dialog.dataset.tournamentMenu==='true'){delete dialog.dataset.tournamentMenu;const trigger=root.querySelector('[data-action="tournament-menu"]');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}});

dialog.addEventListener('close',()=>{if(!dialog.open){insightsCleanup();delete dialog.dataset.insightRequest;}});
