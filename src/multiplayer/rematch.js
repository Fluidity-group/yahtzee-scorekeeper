import {createCoreGame,results} from '../game/core.js';
import {requireMember,RoomError} from './room.js';
import {requireTournamentPlaying} from './tournament.js';
import{presentationRemaining}from'../game/score-presentation.js';

export function nextStarter(room) {
 const winners=results(room.game).winners;
 // Deterministic shared-victory fallback; never silently assign a win to the host.
 const prior=room.game.startingSeat??0;
 return winners.find(seat=>seat>prior)??winners[0];
}
export function setRematchReady(room,{userId,gameId,gameRevision,ready,commandId,nextGameId,time}) {
 requireMember(room,userId);
 requireTournamentPlaying(room);
 if(presentationRemaining(room.scorePresentation,Date.parse(time))>0)throw new RoomError('Wait for the shared announcement to finish.',409);
 if(room.tournament&&(room.gameSequence??1)>=room.tournament.gameCount)throw new RoomError('This tournament is complete. All scheduled games are saved.');
 if(room.source==='godice')throw new RoomError('Play again is currently available for manual tables only.');
 if(room.game?.status!=='finished')throw new RoomError('Finish the current game before playing again.');
 if(room.game.id!==gameId||room.game.revision!==gameRevision)throw new RoomError('The game results changed. Review them before playing again.',409);
 if(typeof ready!=='boolean'||typeof commandId!=='string'||! /^[\w-]{8,100}$/.test(commandId))throw new RoomError('Invalid readiness request.');
 const accepted=room.rematch?.gameId===gameId&&room.rematch.gameRevision===gameRevision?room.rematch.ready:[];
 const players=new Set(accepted);if(ready)players.add(userId);else players.delete(userId);
 const readyIds=room.members.filter(m=>players.has(m.userId)).map(m=>m.userId);
 const starter=nextStarter(room);
 if(readyIds.length!==room.members.length)return {...room,revision:room.revision+1,rematch:{gameId,gameRevision,ready:readyIds,nextStarterId:room.members[starter].userId}};
 if(typeof nextGameId!=='string'||nextGameId===gameId)throw new RoomError('A new game identity is required.');
 let game=createCoreGame({id:nextGameId,names:room.members.map(m=>m.name),mode:room.mode,source:'manual',hideTotals:room.hideTotals,rulesVersion:room.game.rules.version,time});
 // Continue under the finished game's exact rule contract, not today's mode defaults.
 game.rules=structuredClone(room.game.rules);
 game.players=game.players.map((p,i)=>({...p,id:room.members[i].userId}));
 game.activeSeat=starter;game.startingSeat=starter;
 return {...room,revision:room.revision+1,status:'active',game,gameSequence:(room.gameSequence??1)+1,rematch:null,receipts:[],liveDice:undefined,scorePresentation:null};
}
