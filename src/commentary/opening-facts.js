import {computeTotals,filledBaseCount} from '../game/scoring.js';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
// Trusted accepted lifecycle adapter only. Hydration cannot create an opening moment.
export function openingFacts({room,purpose,sourceCommandId,acceptedAt,priorGame=null}={}){
 if(!['opening','return','next-game'].includes(purpose)||!room?.game||!uuid.test(room.id||'')||typeof sourceCommandId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(sourceCommandId)||!Number.isFinite(Date.parse(acceptedAt)))throw Error('Accepted room lifecycle identity required.');
 const game=room.game,ids=room.members.map(member=>member.userId);
 if(ids.length!==game.players.length||new Set(ids).size!==ids.length||ids.some(id=>!uuid.test(id||'')))throw Error('Unique account-owned roster required.');
 const hidden=game.hideTotals&&game.status!=='finished';
 const seats=ids.map((accountId,seat)=>({accountId,seat,displayName:game.players[seat].name,label:game.players[seat].name,instructionAuthority:'none',remaining:13-filledBaseCount(game.sheets[seat]),...(!hidden?{total:computeTotals(game.sheets[seat]).grand}:{})}));
 const scoresRecorded=game.sheets.reduce((sum,sheet)=>sum+filledBaseCount(sheet),0);
 let priorGameSummary=null;
 if(priorGame?.authorized===true&&priorGame.game?.status==='finished'&&Array.isArray(priorGame.accountIds)&&priorGame.accountIds.length===ids.length&&ids.every(id=>priorGame.accountIds.includes(id))&&priorGame.game.players.length===ids.length){
  const totals=priorGame.game.sheets.map(sheet=>computeTotals(sheet).grand),best=Math.max(...totals);
  const winners=totals.flatMap((total,seat)=>total===best?[{accountId:priorGame.accountIds[seat],displayName:priorGame.game.players[seat].name,total}]:[]);
  priorGameSummary={gameId:priorGame.game.id,winners,tied:winners.length>1,basis:'authorized-finished-history',meaning:'previous-game-result-not-tournament-standing'};
 }
 const best=hidden?null:Math.max(...seats.map(seat=>seat.total));
 return freeze({schemaVersion:1,purpose,observation:'accepted-lifecycle-only',snapshotBasis:'at-acceptance',gameId:game.id,eventId:`lifecycle-${sourceCommandId}`,commandId:sourceCommandId,momentKey:`${room.id}:${game.id}:${purpose}:${sourceCommandId}`,acceptedAt,tournamentName:room.tournament?.name||null,namesInstructionAuthority:'none',scoresRecorded,seats,leaders:hidden?[]:seats.filter(seat=>seat.total===best).map(seat=>seat.accountId),disclosurePolicy:hidden?'category-scores-only':'scores-and-totals',priorGameSummary,complete:game.status==='finished'});
}
