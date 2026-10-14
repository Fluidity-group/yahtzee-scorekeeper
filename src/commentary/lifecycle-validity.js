import {openingFacts} from './opening-facts.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const token=/^[A-Za-z0-9_-]{8,100}$/;
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const same=(a,b)=>canonical(a)===canonical(b);
const fail=reason=>({valid:false,reason});
/** Pure validation, never enqueue/hydrate/writer authority.
 * Source snapshots and the scoped receipt MUST be trusted acceptance/store inputs.
 * Receipt shape is the DB row {room_id,command_id,actor_id,fingerprint}; a trusted
 * caller can attach queried scope to the existing actor/fingerprint projection.
 * Persist cancelled across pause/resume. Current room alone cannot reveal old pauses.
 * Service separately enforces lease, freshness, budgets and individual-profile privacy.
 */
export function validateLifecycleMoment({moment,receipt,beforeRoom,acceptedRoom,room,jobProfileVersion,currentProfileVersion,started=false,cancelled=false,priorGame=null}={}){
 try{
  if(cancelled)return fail('source-cancelled');
  if(typeof started!=='boolean'||!moment||moment.schemaVersion!==1||moment.kind!=='moment'||!['opening','return','next-game'].includes(moment.purpose)||!token.test(moment.commandId||''))return fail('invalid-lifecycle-source');
  if(!beforeRoom||!acceptedRoom||!room||!uuid.test(moment.roomId||'')||beforeRoom.id!==moment.roomId||acceptedRoom.id!==moment.roomId||room.id!==moment.roomId)return fail('room-changed');
  if(!receipt||receipt.room_id!==moment.roomId||receipt.command_id!==moment.commandId||receipt.actor_id!==moment.actorId||typeof receipt.fingerprint!=='string'||!receipt.fingerprint.length)return fail('source-receipt-missing');
  if(!Number.isSafeInteger(jobProfileVersion)||jobProfileVersion<1||jobProfileVersion!==currentProfileVersion)return fail('profile-changed');
  if(!Number.isSafeInteger(moment.expectedRoomRevision)||!Number.isSafeInteger(moment.acceptedRoomRevision)||beforeRoom.revision!==moment.expectedRoomRevision||acceptedRoom.revision!==moment.acceptedRoomRevision||moment.acceptedRoomRevision!==moment.expectedRoomRevision+1||!Number.isSafeInteger(room.revision)||room.revision<moment.acceptedRoomRevision)return fail('source-revision-mismatch');
  if(!uuid.test(moment.gameId||'')||acceptedRoom.game?.id!==moment.gameId||room.game?.id!==moment.gameId)return fail('game-changed');
  const ids=acceptedRoom.members?.map(member=>member.userId);
  if(!ids||ids.length<1||ids.length>8||ids.some(id=>!uuid.test(id))||new Set(ids).size!==ids.length||!ids.includes(moment.actorId)||!same(moment.audience,ids)||!same(beforeRoom.members?.map(member=>member.userId),ids)||!same(room.members?.map(member=>member.userId),ids)||beforeRoom.hostId!==acceptedRoom.hostId||room.hostId!==acceptedRoom.hostId)return fail('ownership-changed');
  if(acceptedRoom.game.players.length!==ids.length||room.game.players.length!==ids.length||ids.some((id,seat)=>acceptedRoom.game.players[seat].id!==id||room.game.players[seat].id!==id||acceptedRoom.game.players[seat].name!==room.game.players[seat].name))return fail('seat-identity-changed');
  const purpose=moment.purpose;
  const sourceValid=purpose==='opening'?moment.actorId===acceptedRoom.hostId&&!beforeRoom.game&&beforeRoom.status==='lobby'&&acceptedRoom.status==='active':purpose==='return'?moment.actorId===acceptedRoom.hostId&&beforeRoom.game?.id===moment.gameId&&beforeRoom.tournament?.status==='paused'&&acceptedRoom.tournament?.status==='playing':beforeRoom.game?.status==='finished'&&beforeRoom.game.id!==moment.gameId&&acceptedRoom.game.status==='active'&&(acceptedRoom.gameSequence??1)===(beforeRoom.gameSequence??1)+1;
  if(!sourceValid||moment.dispatch!=='after-transaction-commit-only'||moment.idempotencyKey!==JSON.stringify([moment.roomId,moment.gameId,moment.commandId,'moment',purpose]))return fail('invalid-lifecycle-transition');
  const expected=openingFacts({room:acceptedRoom,purpose,sourceCommandId:moment.commandId,acceptedAt:moment.acceptedAt,priorGame});
  if(!same(moment.facts,expected))return fail('source-facts-mismatch');
  if(room.paused===true||room.tournament?.status==='paused')return fail('paused');
  if(!same(acceptedRoom.game.rules,room.game.rules)||acceptedRoom.game.mode!==room.game.mode||acceptedRoom.game.hideTotals!==room.game.hideTotals)return fail('rules-disclosure-changed');
  if(acceptedRoom.game.status!==room.game.status)return fail('game-status-changed');
  const captured=acceptedRoom.game.events,current=room.game.events;
  if(!Array.isArray(captured)||!Array.isArray(current)||current.length<captured.length||captured.some((event,index)=>!same(event,current[index])))return fail('source-history-changed');
  const dependencies=new Set(captured.filter(event=>event.type==='score').map(event=>event.id));
  if(current.slice(captured.length).some(event=>['score-correction','score-undo'].includes(event.type)&&dependencies.has(event.target)))return fail('source-score-invalidated');
  if(!started&&!same(acceptedRoom.game.sheets,room.game.sheets))return fail('progress-changed-before-start');
  return {valid:true,reason:null};
 }catch{return fail('invalid-lifecycle-source');}
}
export const lifecycleFactsValid=input=>validateLifecycleMoment(input).valid;
