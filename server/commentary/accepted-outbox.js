import {acceptedFacts} from '../../src/commentary/facts.js';

const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const commandId=/^[A-Za-z0-9_-]{8,100}$/;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const requireValue=(value,message)=>{if(!value)throw Error(message);};
const scoreTypes=['score','bonus','final-chain-end','final-chain-roll'];

/** Pure preparation for the SAME database transaction as room CAS + command receipt.
 * Not a client API, not proof a transaction committed, not a provider dispatch.
 * openingFacts is the shared trusted pure lifecycle builder, injected by composition.
 */
export function acceptedOutbox({before,after,actorId,commandId:id,operation,acceptedAt,openingFacts,priorGame=null}={}) {
 requireValue(before&&after&&uuid.test(after.id)&&before.id===after.id,'Matching room UUID snapshots required');
 requireValue(uuid.test(actorId)&&commandId.test(id||''),'Accepted UUID actor and command ID required');
 requireValue(Number.isFinite(Date.parse(acceptedAt)),'Accepted server timestamp required');
 requireValue(Number.isSafeInteger(before.revision)&&Number.isSafeInteger(after.revision),'Room revisions required');
 requireValue(Array.isArray(after.members)&&after.members.length>=1&&after.members.length<=8,'Bounded roster required');
 const audience=after.members.map(m=>m.userId);
 requireValue(audience.every(v=>uuid.test(v))&&new Set(audience).size===audience.length&&audience.includes(actorId),'Unique member UUIDs and member actor required');
 requireValue(JSON.stringify(before.members.map(m=>m.userId))===JSON.stringify(audience)&&before.hostId===after.hostId,'Acceptance cannot change ownership or seats');
 if(after===before||after.revision===before.revision)return freeze([]); // Receipt replay / no-op.
 requireValue(after.revision===before.revision+1,'Exactly one accepted room revision required');
 if(!['command','start','resume','ready'].includes(operation))return freeze([]); // Read/hydrate/join/pause are never greetings.
 if(!after.game)return freeze([]);
 requireValue(uuid.test(after.game.id)&&after.game.players.length===audience.length&&after.game.players.every((p,i)=>p.id===audience[i]),'Game UUID and authoritative seat UUIDs required');
 requireValue(Number.isSafeInteger(after.game.rules?.version)&&after.game.rules.version>0,'Versioned game rules required');
 const rows=[];
 const add=(kind,purpose,facts,invalidates=[])=>rows.push({schemaVersion:1,idempotencyKey:JSON.stringify([after.id,after.game.id,id,kind,purpose]),roomId:after.id,gameId:after.game.id,commandId:id,actorId,expectedRoomRevision:before.revision,acceptedRoomRevision:after.revision,acceptedAt,kind,purpose,audience:[...audience],facts,invalidates,dispatch:'after-transaction-commit-only'});
 if(operation==='command'){
  requireValue(before.game?.id===after.game.id,'Score command cannot replace game');
  const old=before.game.events,next=after.game.events;
  requireValue(Array.isArray(old)&&Array.isArray(next)&&next.length>=old.length&&old.every((e,i)=>e.id===next[i].id&&e.commandId===next[i].commandId),'Accepted event history prefix required');
  const appended=next.slice(old.length),owned=appended.filter(e=>e.commandId===id);
  requireValue(appended.every(e=>e.commandId===id||(e.type==='turn-start'&&['room:'+id+':start','room:'+id+':next'].includes(e.commandId))),'Only accepted command and known turn helpers allowed');
  if(!owned.length)return freeze([]); // e.g. accepted dice-state: no score observation.
  requireValue(owned.every(e=>e.actorId===actorId&&Number.isSafeInteger(e.seat)&&audience[e.seat]===actorId),'Event actor must own score seat');
  const changes=owned.filter(e=>['score-undo','score-correction'].includes(e.type));
  if(changes.length){
   const invalidates=changes.map(e=>({eventId:e.id,targetEventId:e.target,reason:e.type}));
   requireValue(invalidates.every(e=>old.some(o=>o.id===e.targetEventId&&(o.type==='score'||e.reason==='score-undo'&&['bonus','final-chain-roll'].includes(o.type))&&audience[o.seat]===actorId)),'Correction must target accepted own score');
   add('invalidate','correction',null,invalidates);return freeze(rows);
  }
  // One spoken moment per accepted command even if score + chain-start/end coexist.
  const event=scoreTypes.map(type=>owned.find(e=>e.type===type)).find(Boolean);
  if(!event)return freeze([]);
  // The room's automatic next-turn helper is not a later scoring observation.
  const lastOwned=next.findLastIndex(e=>e.commandId===id);
  const facts=acceptedFacts({...after.game,events:next.slice(0,lastOwned+1)},event.id,audience);
  requireValue(facts&&facts.commandId===id&&facts.accountId===actorId,'Accepted score grounding required');
  add('moment','score',facts);return freeze(rows);
 }
 requireValue(actorId===after.hostId||operation==='ready','Host lifecycle authority required');
 let purpose=null;
 if(operation==='start'&&!before.game&&before.status==='lobby'&&after.status==='active')purpose='opening';
 if(operation==='resume'&&before.game?.id===after.game.id&&before.tournament?.status==='paused'&&after.tournament?.status==='playing')purpose='return';
 if(operation==='ready'&&before.game?.status==='finished'&&before.game.id!==after.game.id&&after.game.status==='active'&&(after.gameSequence??1)===(before.gameSequence??1)+1)purpose='next-game';
 if(!purpose)return freeze([]); // Partial readiness / repeated resume / repeated start.
 requireValue(typeof openingFacts==='function','Shared lifecycle facts builder required');
 // Historical summaries need separately permission-checked input, never inferred from room alone.
 const facts=openingFacts({room:after,purpose,sourceCommandId:id,acceptedAt,priorGame});
 requireValue(facts?.purpose===purpose&&facts.gameId===after.game.id&&facts.commandId===id&&facts.observation==='accepted-lifecycle-only'&&facts.snapshotBasis==='at-acceptance'&&facts.acceptedAt===acceptedAt&&facts.seats?.length===audience.length&&facts.seats.every((seat,i)=>seat.accountId===audience[i]&&seat.seat===i),'Lifecycle builder binding mismatch');
 add('moment',purpose,structuredClone(facts));
 return freeze(rows);
}



