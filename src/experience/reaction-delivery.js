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
  const clock=now()+offset,serverNow=new Date(clock).toISOString(),standard=room.scorePresentation;
  const lockScoring=standard?.gameId===room.game.id&&Date.parse(standard.expiresAt)>clock;
  const legacy=()=>sync({root,room,game:room.game,event:standard||null,serverNow,onEnd});
  // Old servers/snapshots retain their existing announcement policy.
  if(!Array.isArray(room.reactionQueue)&&!room.reactionPopup)return legacy();
  const queue=(room.reactionQueue||[{popup:room.reactionPopup,intents:room.reactionIntents||[],expiresAt:room.reactionPopup.expiresAt}]).filter(e=>e.popup?.gameId===room.game.id&&Date.parse(e.expiresAt)>clock);
  const eventKey=e=>JSON.stringify([room.id,room.game.id,e.popup.eventId]);
  let entry=active&&active.until>clock&&queue.find(e=>eventKey(e)===active.key);
  if(!entry){
   active=null;
   try{
    const storageKey='clubhouse:reaction-delivery:v1:'+userId;
    const old=JSON.parse(storage.getItem(storageKey)||'[]');if(!Array.isArray(old))throw Error('Invalid delivery ledger');
    const entries=old.filter(e=>e&&typeof e.id==='string'&&e.until>clock).slice(-255),seen=new Set(entries.map(e=>e.id));
    entry=queue.find(e=>!seen.has(eventKey(e)));
    if(entry){const until=Math.min(clock+4000,Date.parse(entry.expiresAt)),id=eventKey(entry);entries.push({id,until:Date.parse(entry.expiresAt)});storage.setItem(storageKey,JSON.stringify(entries));active={key:id,until,startedAt:clock};}
   }catch{entry=null;} // Fail closed; game remains usable and authoritative locks remain intact.
  }
  if(!entry){
   // Bonus/correction announcements keep their existing rendering, distinct from base-score queue entries.
   if(standard&&standard.id!==room.reactionPopup?.id)return legacy();
   return sync({root,room,game:room.game,event:lockScoring?standard:null,serverNow,lockScoring,lockUntil:standard?.expiresAt,hiddenPopup:true,onEnd});
  }
  const event={...entry.popup,playbackStartedAt:new Date(active.startedAt).toISOString(),expiresAt:new Date(active.until).toISOString()},actions=new Map();
  for(const intent of entry.intents||[]){
   if(intent.recipientId!==userId||intent.eventId!==event.eventId||intent.gameId!==room.game.id||intent.actorId!==event.actorId||Date.parse(intent.expiresAt)<=clock||!room.members.some(m=>m.userId===intent.authorId))continue;
   for(const a of intent.actions||[]){
    if(a.type==='text'&&typeof a.text==='string'&&a.text.length<=240||a.type==='sound'&&['score','scratch','milestone','none'].includes(a.assetId)||a.type==='animation'&&[...AVATAR_REACTIONS,'none'].includes(a.assetId))actions.set(a.type,a);
   }
  }
  return sync({root,room,game:room.game,event,reaction:actions.size?{actions:[...actions.values()]}:null,serverNow,lockScoring,lockUntil:standard?.expiresAt,deliveryKey:JSON.stringify([userId,active.key]),onEnd});
 }
 return{update,stop};
}
