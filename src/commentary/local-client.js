import {createAuthenticatedCommentaryTransport} from './authenticated-transport.js';
import {createHostedCommentarySession} from '../ui/hosted-commentary-session.js';
import {readCommentaryPreferences,persistCommentaryPatch} from './preferences.js';
const mapKey=id=>'dice-clubhouse:local-commentary:'+id;
export async function createLocalCommentary({auth,serviceBase,anonymousKey='',player,game,players=[],root,scoreDialog,onNotice=()=>{},resume=false}={}){
 const transport=createAuthenticatedCommentaryTransport({auth,serviceBase,anonymousKey,directReaction:typeof player.playReaction==='function'});await transport.getAccessToken();
 let mapping;try{mapping=JSON.parse(localStorage.getItem(mapKey(game.id))||'null');}catch{}
 if(resume&&!mapping)throw Error('This saved game has no live commentary session.');
 const roomId=mapping?.roomId||crypto.randomUUID(),prefs=readCommentaryPreferences();
 const body=resume?{operation:'local-read',roomId}:{operation:'local-start',roomId,commandId:mapping?.commandId||crypto.randomUUID(),settings:prefs.profile,config:{gameId:game.id,names:game.players.map(p=>p.name),mode:game.mode,rulesVersion:game.rules.version,hideTotals:game.hideTotals,players:players.map(p=>({gender:p.gender||'',blurb:p.blurb||''}))}};
 localStorage.setItem(mapKey(game.id),JSON.stringify({roomId,commandId:body.commandId||mapping?.commandId}));const result=(await transport.request(body)).result;
 let room=result.room,visible=true,active=true,running=null,catchingUp=resume&&readLocalQueue(game.id).length>0,primed=false;
 const session=createHostedCommentarySession({request:transport.request,player,deviceId:crypto.randomUUID(),onNotice,nativeAudioAvailable:true,onPreferencesSaved:persistCommentaryPatch});
 const update=()=>{session.update({room,userId:room.hostId,connected:true,visible,initialProfile:result.profile,...(primed?{}:{listenerMuted:resume?prefs.listenerMuted:false})});primed=true;};
 update();session.mountSurface({root,scoreDialog});
 async function flush(){if(running)return running;running=(async()=>{while(active&&readLocalQueue(game.id).length){const commands=readLocalQueue(game.id).slice(0,2);try{const response=await transport.request({operation:'local-command',roomId,commands,quiet:catchingUp});const accepted=new Set(commands.map(c=>c.commandId));writeLocalQueue(game.id,readLocalQueue(game.id).filter(c=>!accepted.has(c.commandId)));room=response.result.room;if(!readLocalQueue(game.id).length)catchingUp=false;update();}catch{onNotice('Your score is saved. Live commentary is reconnecting.');break;}}})();try{await running;}finally{running=null;}}
 if(resume)void flush();
 return {session,flush,metadata:{jobId:result.greetingJobId,gameId:game.id,profileVersion:result.profile.version},enqueue(commands){if(!active)return;queueLocalCommands(game.id,commands);void flush();},setVisible(value){visible=value;update();if(value)void flush();},refreshSurface:()=>session.refreshSurface(),open:options=>session.open(options),async stopForGame(){active=false;session.muteForGame();void Promise.resolve(player.stop('user-skipped-welcome')).catch(()=>{});await session.configure({profile:prefs.profile,enabled:false,listenerMuted:true}).catch(()=>{});session.dispose();await player.dispose?.();},dispose(){active=false;session.dispose();void player.dispose?.();}};
}

const queueKey=id=>'dice-clubhouse:local-commands:'+id;
function readLocalQueue(id){try{const value=JSON.parse(localStorage.getItem(queueKey(id))||'[]');return Array.isArray(value)?value.slice(-2048):[];}catch{return [];}}
function writeLocalQueue(id,value){try{localStorage.setItem(queueKey(id),JSON.stringify(value));}catch{}}
export function queueLocalCommands(id,commands){const prior=readLocalQueue(id),ids=new Set(prior.map(c=>c.commandId));writeLocalQueue(id,[...prior,...commands.filter(c=>!ids.has(c.commandId))]);}
