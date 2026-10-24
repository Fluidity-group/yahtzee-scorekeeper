import { createRoom, joinRoom, startRoom, playRoom, requireMember, RoomError } from '../../src/multiplayer/room.js';
import {acceptedOutbox} from '../commentary/accepted-outbox.js';
import {setRematchReady,nextStarter} from '../../src/multiplayer/rematch.js';
import {setTournamentPaused,tournamentStandings} from '../../src/multiplayer/tournament.js';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
export function roomHandler({store,authenticate,now=()=>new Date().toISOString(),randomCode,randomId=()=>crypto.randomUUID(),commentary=null}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Use POST.'},405);
  try{
   const userId=await authenticate(request);
   if(!userId)throw new RoomError('Sign in to join a game.',401);
   const raw=await request.text();if(raw.length>256000)throw new RoomError('Request too large.',413);
   let body;try{body=JSON.parse(raw);}catch{throw new RoomError('Invalid request.');}
   if(!body||typeof body!=='object')throw new RoomError('Invalid request.');
   const supportsRematch=await store.rematchAvailable?.()===true;
   const supportsTournaments=supportsRematch&&await store.tournamentsAvailable?.()===true;
   const supportsCompetition=supportsRematch&&await store.competitionAvailable?.()===true;
   const supportsCommentary=!!commentary && supportsRematch && await store.commentaryAvailable?.()===true;
   const present=room=>({...room,capabilities:{commentaryAtomicCommit:supportsCommentary,rematch:supportsRematch&&room.source!=='godice',history:supportsRematch,tournaments:supportsTournaments,competitionFinalChain:supportsCompetition,manualAttemptFinish:supportsCompetition,undoScore:supportsRematch},...(room.game?.status==='finished'?{nextStarterId:room.members[nextStarter(room)].userId}:{})});
   if(body.operation==='list')return reply({rooms:(await store.list(userId)).map(present)});
   if(['tournaments','sessions'].includes(body.operation)){
    if(body.operation==='tournaments'?!supportsTournaments:!supportsRematch)throw new RoomError('Saved sessions need the current server.',503);
    if(body.operation==='sessions'&&!['open','completed'].includes(body.view))throw new RoomError('Choose open sessions or completed results.');
    const before=body.before;
    if(before!==undefined&&(!before||typeof before!=='object'||typeof before.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(before.createdAt)||!Number.isFinite(Date.parse(before.createdAt))||new Date(before.createdAt).toISOString()!==before.createdAt||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before.id||'')))throw new RoomError('Invalid tournament list cursor.');
    const rows=await (body.operation==='sessions'?store.sessions(userId,body.view,before):store.openTournaments(userId,before)),last=rows.at(-1);
    return reply({rooms:rows.map(r=>present(r.state)),nextBefore:rows.length===20?{createdAt:new Date(last.created_at).toISOString(),id:last.id}:null});
   }
   if(body.operation==='create'){
    if(body.rulesVersion===2&&!supportsCompetition)throw new RoomError('Updated Competition rules need a server update. Your saved games are unchanged.',503);
    if(body.tournament&&!supportsTournaments)throw new RoomError('Tournaments need a server update. Ordinary hosted games are available.',503);
    if(!/^[0-9a-f-]{36}$/i.test(body.requestId||''))throw new RoomError('Invalid request ID.');
    const existing=await store.byId(body.requestId);
    if(existing){if(existing.hostId!==userId)throw new RoomError('This room belongs to another host.',403);return reply({room:present(existing)});}
    if(await store.recentCount(userId)>=10)throw new RoomError('Too many new rooms. Please try again later.',429);
    for(let tries=0;tries<4;tries++){
     const room=createRoom({id:body.requestId,code:randomCode(),userId,name:body.name,mode:body.mode,source:body.source,hideTotals:body.hideTotals,tournament:body.tournament,rulesVersion:body.rulesVersion,time:now()});
     if(await store.insert(room))return reply({room:present(room)});
     // A concurrent retry may have inserted this request ID with another code.
     const accepted=await store.byId(body.requestId);
     if(accepted){if(accepted.hostId!==userId)throw new RoomError('This room belongs to another host.',403);return reply({room:present(accepted)});}
    }
    throw new RoomError('Could not create a room. Please try again.',409);
   }
   const code=String(body.code||'').toUpperCase().replace(/[\s-]/g,'');
   if(!/^[A-Z2-9]{8}$/.test(code))throw new RoomError('Enter the eight-character room code.');
   const nextGameId=body.operation==='ready'?randomId():null;
   const lifecycleDurable=['ready','pause','resume'].includes(body.operation);
   const atomicOperation=!!commentary&&['command','start','resume','ready'].includes(body.operation);
   if(atomicOperation&&!supportsCommentary)throw new RoomError('Live commentary needs the atomic game server update.',503);
   const durable=lifecycleDurable||atomicOperation;
   const fingerprint=body.operation==='ready'?JSON.stringify({operation:'ready',gameId:body.gameId,gameRevision:body.gameRevision,ready:body.ready}):body.operation==='command'&&durable?JSON.stringify({operation:body.operation,gameId:body.gameId,expectedRevision:body.expectedRevision,action:body.action}):durable?JSON.stringify({operation:body.operation,gameId:body.gameId,expectedRevision:body.expectedRevision}):null;
   for(let attempt=0;attempt<3;attempt++){
    const room=await store.get(code);if(!room)throw new RoomError('Room not found. Check the code.',404);
    if((room.game?.rules.version??room.rulesVersion)===2&&!['read','history','standings','join'].includes(body.operation)){
     if(!supportsCompetition)throw new RoomError('This Competition game needs the current server.',503);
     if(body.rulesVersion!==2)throw new RoomError('Update the app or reload the webpage for these Competition rules.',409);
    }
    if(room.tournament&&!supportsTournaments&&!['read','history'].includes(body.operation))throw new RoomError('This tournament needs the current server before it can be updated.',503);
    if(((room.gameSequence??1)>1||room.historyVersion===1)&&!supportsRematch&&body.operation!=='read')throw new RoomError('This table needs the current server before it can be updated.',503);
    let next;
    if(body.operation==='join')next=joinRoom(room,{userId,name:body.name,time:now()});
    else{
     requireMember(room,userId);
     if(body.operation==='read')return reply({room:present(room)});
     if(body.operation==='standings'){
      if(!supportsTournaments)throw new RoomError('Tournament standings need a server update.',503);
      const snapshots=(await store.tournamentGames(room.id)).map(row=>row.state);
      const current=await store.get(code);
      // A correction/advance while history was being fetched needs a fresh view.
      if(current?.revision!==room.revision)continue;
      return reply({...tournamentStandings(room,snapshots),roomRevision:room.revision,gameId:room.game?.id??null,gameRevision:room.game?.revision??null});
     }
     if(body.operation==='history'){
      if(!supportsRematch)throw new RoomError('Hosted history needs a server update.',503);
      if(body.before!==undefined&&(!Number.isInteger(body.before)||body.before<1))throw new RoomError('Invalid history cursor.');
      const rows=await store.history(room.id,body.before);
      return reply({games:rows.map(r=>({...r.state,sequence:r.sequence_number})),nextBefore:rows.length===20?rows.at(-1).sequence_number:null});
     }
     if(durable){
      if(!supportsRematch)throw new RoomError('Play again needs a server update. Your finished game is saved.',503);
      if(typeof body.commandId!=='string'||! /^[\w-]{8,100}$/.test(body.commandId))throw new RoomError('Invalid command ID.');
      const receipt=await store.receipt(room.id,body.commandId);
      if(receipt){if(receipt.actor_id!==userId||receipt.fingerprint!==fingerprint)throw new RoomError('This command belongs to another request.',403);return reply({room:present(room)});}
      if(lifecycleDurable)next=body.operation==='ready'?setRematchReady(room,{userId,gameId:body.gameId,gameRevision:body.gameRevision,ready:body.ready,commandId:body.commandId,nextGameId,time:now()}):setTournamentPaused(room,{userId,gameId:body.gameId,expectedRevision:body.expectedRevision,paused:body.operation==='pause',time:now()});
     }
     if(!next&&body.operation==='start'){
      if(room.status==='lobby'&&body.expectedRevision!==room.revision)throw new RoomError('The lobby changed. Review the players and start again.',409);
      next=startRoom(room,{userId,time:now()});
     }else if(!next&&body.operation==='command'){
      if(body.action?.type==='undo-score'&&!supportsRematch)throw new RoomError('Undo needs the updated history server.',503);
      next=playRoom(room,{userId,action:body.action,commandId:body.commandId,expectedRevision:body.expectedRevision,gameId:body.gameId,time:now()});
     }
     else if(!next)throw new RoomError('Unknown operation.');
    }
    if(next!==room&&supportsRematch&&next.game)next={...next,historyVersion:1};
    let outboxRows=null;
    if(atomicOperation&&next!==room){
     const priorGame=body.operation==='ready'&&room.game?.status==='finished'?{authorized:true,game:room.game,accountIds:room.members.map(m=>m.userId)}:null;
     const eligible=body.operation!=='command'||['score','bonus','undo-score','correct-score','final-chain-roll','final-chain-end'].includes(body.action?.type);
     outboxRows=eligible?acceptedOutbox({before:room,after:next,actorId:userId,commandId:body.commandId,operation:body.operation,acceptedAt:now(),openingFacts:commentary.openingFacts,priorGame}):[];
     const greeting=outboxRows.find(row=>['opening','return','next-game'].includes(row.purpose));
     if(greeting)next={...next,commentaryLifecycle:{commandId:greeting.commandId,purpose:greeting.purpose,acceptedRoomRevision:next.revision,gameId:next.game.id}};
    }
    const saved=next===room||await (supportsRematch&&next.game?store.commit(next,room.revision,{actor:userId,...(durable?{commandId:body.commandId,fingerprint}:{}),...(outboxRows!==null?{outboxRows}: {})}):store.update(next,room.revision));
    if(saved)return reply({room:present(next),...(durable&&next!==room?{acceptedCommandId:body.commandId,acceptedRoomRevision:next.revision}:{})});
   }
   throw new RoomError('The game changed. Please try again.',409);
  }catch(error){
   // Do not return backend credentials, database errors or stack traces to clients.
   if(error instanceof RoomError)return reply({error:error.message},error.status);
   if(error?.name==='GameRuleError')return reply({error:error.message},400);
   return reply({error:'The game could not be updated. Refresh and try again.'},500);
  }
 };
}
