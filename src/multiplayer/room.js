import { createCoreGame, command, MODES,gameRules } from '../game/core.js';
import {tournamentConfig,requireTournamentPlaying,updateTournamentCompletion} from './tournament.js';

export class RoomError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
const fail=(message,status)=>{throw new RoomError(message,status);};
export function playerName(value){
 const name=String(value||'').trim();
 if(!name||name.length>24)fail('Enter a name of 1–24 characters.');
 return name;
}
export function memberSeat(room,userId){return room.members.findIndex(m=>m.userId===userId);}
export function requireMember(room,userId){
 const seat=memberSeat(room,userId);if(seat<0)fail('You are not a member of this game.',403);return seat;
}
export function createRoom({id,code,userId,name,mode='standard',source='manual',hideTotals=false,tournament,rulesVersion=1,time}){
 if(typeof mode!=='string'||!Object.hasOwn(MODES,mode))fail('Unknown game mode.');
 if(!['manual','godice'].includes(source))fail('Choose manual or host GoDice.');
 try{gameRules(mode,rulesVersion,source);}catch(error){fail(error.message);}
 return {id,code,hostId:userId,revision:0,status:'lobby',mode,source,hideTotals:hideTotals===true,
  createdAt:time,joinExpiresAt:new Date(Date.parse(time)+48*60*60*1000).toISOString(),
  members:[{userId,name:playerName(name)}],game:null,rulesVersion,...(tournament!==undefined&&tournament!==null?{tournament:tournamentConfig(tournament,mode,source,rulesVersion)}:{})};
}
export function joinRoom(room,{userId,name,time}){
 if(memberSeat(room,userId)>=0)return room;
 if(room.status!=='lobby')fail('This game has started. Only its existing players can rejoin.');
 if(time>=room.joinExpiresAt)fail('This invitation has expired. Ask the host to create a new game.');
 if(room.members.length>=8)fail('This game already has eight players.');
 if(room.tournament&&room.members.length>=room.tournament.playerCount)fail('This tournament already has its chosen number of players.');
 name=playerName(name);
 if(room.members.some(m=>m.name.toLowerCase()===name.toLowerCase()))fail('That name is taken in this game. Choose another.');
 return {...room,revision:room.revision+1,members:[...room.members,{userId,name}]};
}
export function startRoom(room,{userId,time}){
 requireMember(room,userId);
 if(room.hostId!==userId)fail('Only the host can start the game.',403);
 if(room.status!=='lobby')return room;
 if(room.tournament&&room.members.length!==room.tournament.playerCount)fail('Wait for the chosen number of tournament players before starting.');
 let game=createCoreGame({id:room.id,names:room.members.map(m=>m.name),mode:room.mode,hideTotals:room.hideTotals,source:room.source||'manual',rulesVersion:room.rulesVersion??1,time});
 game.players=game.players.map((p,i)=>({...p,id:room.members[i].userId}));
 if(room.tournament)game.rules=structuredClone(room.tournament.rules);
 // Colons reserve server helper IDs outside the accepted public command syntax.
 if(game.source==='godice')game=command(game,{type:'start',seat:0},{id:`room:${room.id}:first-turn`,time});
 return {...room,revision:room.revision+1,status:'active',game};
}
export function playRoom(room,{userId,action,commandId,expectedRevision,gameId,time}){
 const member=requireMember(room,userId),host=room.hostId===userId;
 requireTournamentPlaying(room);
 if(!room.game)fail('The host has not started this game.');
 if(action?.type==='undo-score'&&gameId!==room.game.id)fail('Refresh the current game before undoing a score.',409);
 if((gameId!==undefined&&gameId!==room.game.id)||((room.gameSequence??1)>1&&gameId===undefined))fail('The table moved to a new game. Refresh or update the app before scoring.',409);
 if(typeof commandId!=='string'||! /^[\w-]{8,100}$/.test(commandId))fail('Invalid command ID.');
 const prior=room.game.events.find(e=>e.commandId===commandId);
 const receipt=room.receipts?.find(r=>r.id===commandId);
 if(receipt){if(receipt.actor!==userId)fail('This command belongs to another player.',403);return room;}
 if(prior){if((prior.actorId||room.members[prior.seat]?.userId)!==userId)fail('This command belongs to another player.',403);return room;}
 if(room.revision!==expectedRevision)fail('The game changed. Refresh and choose your score again.',409);
 if(!action||!['start','score','bonus','final-chain-roll','correct-score','undo-score','roll','correct-roll','manual-fallback','dice-state'].includes(action.type))fail('Unsupported game action.');
 const hardware=room.game.source==='godice';
 const receipts=[...(room.receipts||[]),{id:commandId,actor:userId}].slice(-100);
 if(action.type==='dice-state'){
  if(!host||!hardware)fail('Only the GoDice host can publish dice readings.',403);
  if(room.game.status!=='active'||action.turnId!==room.game.turn?.id||action.gameRevision!==room.game.revision)fail('The turn changed.',409);
  if(!['rolling','paused','ready','settled'].includes(action.phase)||!Array.isArray(action.faces)||action.faces.length!==5||action.faces.some(v=>v!==null&&(!Number.isInteger(v)||v<1||v>6))||!Array.isArray(action.moving)||action.moving.length!==5||action.moving.some(v=>typeof v!=='boolean'))fail('Invalid live dice state.');
  if(!Number.isInteger(action.connected)||action.connected<0||action.connected>5)fail('Invalid dice count.');
  return {...room,revision:room.revision+1,receipts,liveDice:{turnId:action.turnId,phase:action.phase,faces:[...action.faces],moving:[...action.moving],connected:action.connected,updatedAt:time}};
 }
 if(['roll'].includes(action.type)&&(!host||!hardware))fail('Only the GoDice host can record physical rolls.',403);
 if(['correct-roll','manual-fallback'].includes(action.type)&&!hardware)fail('This room uses manual dice.');
 if(action.type==='start'&&action.source!==undefined&&action.source!==(hardware?'godice':'manual'))fail('The room dice mode is fixed.');
 const delegated=hardware&&host&&['start','roll','correct-roll','manual-fallback'].includes(action.type);
 const seat=delegated?room.game.activeSeat:member;
 if(!['correct-score','undo-score'].includes(action.type)&&room.game.activeSeat!==seat)fail('It is another player’s turn.',403);
 if(['score','bonus','correct-roll'].includes(action.type)&&hardware&&room.game.turn?.source==='godice'&&['rolling','paused'].includes(room.liveDice?.phase))fail('Wait for the host dice to settle.');
 if(['correct-score','undo-score'].includes(action.type)&&!room.game.events.some(e=>e.id===action.target&&(e.type==='score'||action.type==='undo-score'&&['bonus','final-chain-roll'].includes(e.type))&&e.seat===seat))fail('You can only change your own scores.',403);
 let game=room.game;
 try{
  if(!game.turn&&['score','bonus','final-chain-roll'].includes(action.type))game=command(game,{type:'start',seat},{id:`room:${commandId}:start`,time});
  game=command(game,{...action,seat},{id:commandId,time});
 }catch(error){throw new RoomError(error.message);}
 for(const e of game.events)if(e.commandId===commandId)e.actorId=userId;
 if(hardware&&game.status==='active'&&!game.turn)game=command(game,{type:'start',seat:game.activeSeat,source:'godice'},{id:`room:${commandId}:next`,time});
 const last=game.turn?.rolls.filter(r=>!r.excluded).at(-1);
 const liveDice=hardware?{turnId:game.turn?.id,phase:last?'settled':'ready',faces:last?.dice||Array(5).fill(null),moving:Array(5).fill(false),connected:room.liveDice?.connected??0,updatedAt:time}:undefined;
 return updateTournamentCompletion({...room,revision:room.revision+1,status:game.status,game,receipts,...(['correct-score','undo-score'].includes(action.type)&&room.game.status==='finished'?{rematch:null}:{}),...(hardware?{liveDice}:{})});
}
