import {compileReactionSet,evaluateReactions} from './reactions.js';
import {META} from '../game/categories.js';
import {RoomError,requireMember} from '../multiplayer/room.js';
const commandPattern=/^[\w-]{8,100}$/;
const reject=(text,status=400)=>{throw new RoomError(text,status);};
export const reactionOperations=['reaction-save','reaction-remove','reactions-toggle'];
function compiled(room,config){return compileReactionSet({id:room.id,version:config.version,scopeId:room.id,effectiveAfterRevision:config.effectiveAfterRevision,rules:config.rules},{memberIds:room.members.map(m=>m.userId)});}

export function changeRoomReactions(room,{userId,operation,gameId,expectedRevision,configVersion,rule,ruleId,enabled,commandId}){
 requireMember(room,userId);
 if(!room.game||room.game.id!==gameId)reject('Reopen reactions for the current game.',409);
 if(room.revision!==expectedRevision)reject('The table changed. Refresh reactions and try again.',409);
 if(!commandPattern.test(commandId||''))reject('Invalid reaction request.');
 const old=room.reactions||{version:0,enabled:true,rules:[]};
 if(configVersion!==old.version)reject('Reaction settings changed. Refresh before saving.',409);
 let rules=structuredClone(old.rules),tableEnabled=old.enabled;
 if(operation==='reactions-toggle'){
  if(userId!==room.hostId)reject('Only the host can switch table reactions on or off.',403);
  if(typeof enabled!=='boolean')reject('Choose whether table reactions are enabled.');
  tableEnabled=enabled;
 }else if(operation==='reaction-save'){
  if(!rule||typeof rule!=='object'||Array.isArray(rule)||Object.keys(rule).some(k=>!['id','enabled','when','audience','actions'].includes(k)))reject('Invalid reaction definition.');
  const prior=rules.find(r=>r.id===rule.id);
  if(prior&&prior.authorId!==userId)reject('You can only edit reactions you created.',403);
  const next={...structuredClone(rule),authorId:userId,version:(prior?.version||0)+1};
  rules=rules.filter(r=>r.id!==rule.id);rules.push(next); // Last saved action wins deterministically on overlaps.
 }else if(operation==='reaction-remove'){
  const prior=rules.find(r=>r.id===ruleId);
  if(!prior)reject('That reaction no longer exists. Refresh the editor.',409);
  if(prior.authorId!==userId)reject('You can only remove reactions you created.',403);
  rules=rules.filter(r=>r.id!==ruleId);
 }else reject('Unknown reaction operation.');
 const reactions={version:old.version+1,effectiveAfterRevision:room.revision+1,enabled:tableEnabled,rules};
 try{compiled(room,reactions);}catch(error){reject(error.message);}
 const disabledIds=new Set(rules.filter(r=>!r.enabled).map(r=>r.id));
 const reactionIntents=(room.reactionIntents||[]).filter(i=>tableEnabled&&!disabledIds.has(i.ruleId)&&rules.some(r=>r.id===i.ruleId));
 return {...room,revision:room.revision+1,reactions,reactionIntents};
}

// This state is committed in the SAME existing room/history/receipt transaction as the score.
// Room settings/intent text are visible to table members; audience controls playback, not secrecy.
export function withAcceptedReactions(before,after,time){
 if(after===before||!after.game)return after;
 const game=after.game,previous=before.game;
 if(!previous||previous.id!==game.id)return {...after,reactionPopup:null,reactionIntents:[]};
 const fresh=game.events.filter(e=>!previous.events.some(old=>old.id===e.id));
 const invalid=new Set(game.events.filter(e=>['score-undo','score-correction'].includes(e.type)).map(e=>e.target));
 const score=fresh.filter(e=>e.type==='score'&&!invalid.has(e.id)).at(-1);
 if(!score){
  if(before.reactionPopup&&invalid.has(before.reactionPopup.eventId))return {...after,reactionPopup:null,reactionIntents:[]};
  return after;
 }
 const actorId=game.players[score.seat]?.id;
 if(!after.members.some(m=>m.userId===actorId))reject('Score has no authoritative table member.',500);
 const acceptedAt=Date.parse(time);if(!Number.isFinite(acceptedAt))reject('Accepted score time required.',500);
 const standard=after.scorePresentation?.id===score.commandId?after.scorePresentation:null;
 const popup={...(standard||{}),id:score.commandId,eventId:score.id,gameId:game.id,gameRevision:game.revision,seat:score.seat,actorId,category:score.category,value:score.value,acceptedAt:new Date(acceptedAt).toISOString(),expiresAt:new Date(acceptedAt+4000).toISOString(),items:standard?.items||[{kind:'score',seat:score.seat,category:score.category,text:`${META[score.category].name} · ${score.value} points`}]};
 let reactionIntents=[];
 if(after.reactions?.enabled){
  const set=compiled(after,after.reactions);
  reactionIntents=evaluateReactions(set,{type:'score-recorded',scopeId:after.id,gameId:game.id,eventId:score.id,actorId,category:score.category,value:score.value,acceptedAt:popup.acceptedAt,roomRevision:after.revision},{now:acceptedAt});
 }
 return {...after,reactionPopup:popup,reactionIntents};
}
