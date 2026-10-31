import {syncScorePresentation,clearScorePresentation} from '../ui/score-presentation.js';
import {AVATAR_REACTIONS} from '../profile/avatar-reactions.js';

// Persistent claim-before-play gives at-most-once attempts per account/device, not guaranteed audio.
export function createReactionDelivery({storage=globalThis.localStorage,sync=syncScorePresentation,clear=clearScorePresentation,now=()=>Date.now()}={}){
 let scope=null,active=null,offset=0,lastServerNow=null;
 function stop(){scope=null;active=null;clear();}
 function update({root,room,userId,connected=true,visible=true,onEnd=()=>{}}){
  if(!room?.game||!room.members.some(m=>m.userId===userId)||!connected||!visible){stop();return false;}
  const key=JSON.stringify([room.id,room.game.id,userId]);if(scope!==key){stop();scope=key;}
  if(room.serverNow&&lastServerNow!==room.serverNow&&Number.isFinite(Date.parse(room.serverNow))){lastServerNow=room.serverNow;offset=Date.parse(room.serverNow)-now();}
  const clock=now()+offset;
  const fresh=room.reactionPopup,standard=room.scorePresentation;
  const event=standard&&(!fresh||standard.gameRevision>fresh.gameRevision)?standard:fresh||standard;
  if(!event)return sync({root,room,game:room.game,event:null,onEnd});
  if(!fresh||fresh.id!==event.id)return sync({root,room,game:room.game,event,serverNow:room.serverNow,onEnd});
  const eventKey=JSON.stringify([room.id,room.game.id,event.eventId]);
  const lockScoring=!!standard&&standard.id===event.id;
  if(Date.parse(event.expiresAt)<=clock){if(active===eventKey)active=null;return sync({root,room,game:room.game,event:null,onEnd});}
  let hiddenPopup=false;
  if(active!==eventKey){
   try{
    const storageKey='clubhouse:reaction-delivery:v1:'+userId;
    const old=JSON.parse(storage.getItem(storageKey)||'[]');if(!Array.isArray(old))throw Error('Invalid delivery ledger');
    const entries=old.filter(e=>e&&typeof e.id==='string'&&e.until>clock).slice(-255);
    hiddenPopup=entries.some(e=>e.id===eventKey);
    if(!hiddenPopup){entries.push({id:eventKey,until:Date.parse(event.expiresAt)});storage.setItem(storageKey,JSON.stringify(entries));active=eventKey;}
   }catch{hiddenPopup=true;} // Do not replay on a storage failure; game remains usable.
  }
  const actions=new Map();
  for(const intent of room.reactionIntents||[]){
   if(intent.recipientId!==userId||intent.eventId!==event.eventId||intent.gameId!==room.game.id||intent.actorId!==event.actorId||Date.parse(intent.expiresAt)<=clock||!room.members.some(m=>m.userId===intent.authorId))continue;
   for(const a of intent.actions||[]){
    if(a.type==='text'&&typeof a.text==='string'&&a.text.length<=240||a.type==='sound'&&['score','scratch','milestone','none'].includes(a.assetId)||a.type==='animation'&&[...AVATAR_REACTIONS,'none'].includes(a.assetId))actions.set(a.type,a);
   }
  }
  return sync({root,room,game:room.game,event,reaction:actions.size?{actions:[...actions.values()]}:null,serverNow:room.serverNow,lockScoring,hiddenPopup,onEnd});
 }
 return{update,stop};
}
