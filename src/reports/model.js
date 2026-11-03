import {BASE_KEYS,UPPER_KEYS} from '../game/categories.js';
import {computeTotals} from '../game/scoring.js';
import {tournamentStandings} from '../multiplayer/tournament.js';
import {recordedPattern,hasRecordedTime} from './history.js';

const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const round=value=>value===null?null:Math.round(value*10)/10;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const reportContract=game=>JSON.stringify(canonical({mode:game.mode,rules:game.rules,source:game.source||'unknown',solo:game.players.length===1}));
export function contractLabel(game){return `${game.rules?.name||game.mode} · v${game.rules?.version??'?'} · ${game.source||'unknown'} · ${game.players.length===1?'solo':'multiplayer'} · Joker ${game.rules?.joker?'on':'off'}`;}
function validScorecard(game,members){
 return game?.status==='finished'&&typeof game.id==='string'&&Number.isSafeInteger(game.revision)&&game.rules&&typeof game.rules==='object'&&Array.isArray(game.players)&&game.players.length>=1&&game.players.length<=8&&game.players.every(p=>p&&typeof p.id==='string'&&members.has(p.id))&&new Set(game.players.map(p=>p.id)).size===game.players.length&&Array.isArray(game.sheets)&&game.sheets.length===game.players.length&&game.sheets.every(sheet=>BASE_KEYS.every(k=>Number.isSafeInteger(sheet?.[k])&&sheet[k]>=0)&&Number.isSafeInteger(sheet.yahtzeeBonus??0)&&(sheet.yahtzeeBonus??0)>=0&&Number.isSafeInteger(computeTotals(sheet).grand));
}

export function reportFacts(userId,tables){
 const games=[],tournaments=[],contracts=new Map(),seenRooms=new Set(),gameOwners=new Map();
 const quality={inProgressGames:0,invalidGames:0,unavailableHistoryTables:0,unverifiedTournaments:0,incompleteHistoryTables:0,missingDates:0};
 for(const entry of tables){
  const {room,snapshots=[]}=entry;
  if(!room?.members?.some(m=>m.userId===userId))throw Error('This saved table is not available to your account.');
  if(seenRooms.has(room.id))continue;seenRooms.add(room.id);
  if(entry.historyAvailable===false)quality.unavailableHistoryTables++;
  const members=new Set(room.members.map(m=>m.userId)),latest=new Map();
  for(const game of snapshots){
   if(!game?.id){if(game?.status==='finished')quality.invalidGames++;continue;}
   if(!Number.isSafeInteger(game.revision)||game.revision<0)throw Error('A saved game revision is unreadable. Refresh Reports.');
   const prior=latest.get(game.id);
   if(prior&&prior.revision===game.revision&&JSON.stringify(canonical(prior))!==JSON.stringify(canonical(game)))throw Error('Saved snapshots disagree at the same revision. Refresh Reports.');
   if(!prior||game.revision>prior.revision)latest.set(game.id,game);
  }
  if(room.game){
   const archived=latest.get(room.game.id);
   if(archived&&(archived.revision??0)>(room.game.revision??0))throw Error('Saved game revisions disagree. Refresh Reports.');
   latest.set(room.game.id,{...room.game,sequence:room.gameSequence??room.game.sequence??1});
  }
  const ceiling=room.gameSequence??(room.game?1:0),sequencesSeen=new Set([...latest.values()].map(g=>g.sequence));
  if(Number.isInteger(ceiling)&&ceiling>0&&[...sequencesSeen].filter(n=>Number.isInteger(n)&&n>=1&&n<=ceiling).length<ceiling)quality.incompleteHistoryTables++;
  const valid=[];
  for(const game of latest.values()){
   if(gameOwners.has(game.id)&&gameOwners.get(game.id)!==room.id)throw Error('A saved game has conflicting table ownership. Refresh Reports.');gameOwners.set(game.id,room.id);
   if(game.status!=='finished'){quality.inProgressGames++;continue;}
   if(!validScorecard(game,members)){quality.invalidGames++;continue;}
   const contract=reportContract(game),label=contractLabel(game);
   if(!contracts.has(contract))contracts.set(contract,{id:contract,label,count:0});contracts.get(contract).count++;
   const endedAt=hasRecordedTime(game.endedAt)?game.endedAt:null;if(!endedAt)quality.missingDates++;
   const record={id:game.id,roomId:room.id,tournamentId:room.tournament?room.id:null,sequence:game.sequence,contract,game,endedAt,totals:game.sheets.map(s=>computeTotals(s)),chronology:recordedPattern(game)};
   valid.push(game);games.push(record);
  }
  if(room.tournament){
   const sequences=valid.map(g=>g.sequence),complete=room.tournament.status==='completed';let result=null;
   const sequenceValid=sequences.every(n=>Number.isInteger(n)&&n>=1&&n<=room.tournament.gameCount)&&new Set(sequences).size===sequences.length;
   if(complete&&sequenceValid&&valid.length===room.tournament.gameCount&&entry.historyAvailable!==false){try{result=tournamentStandings(room,valid);}catch{/* Withhold awards when the frozen roster/rules/history do not reconcile. */}}
   if(complete&&!result)quality.unverifiedTournaments++;
   const contract=valid[0]?reportContract(valid[0]):null;
   tournaments.push({id:room.id,name:room.tournament.name,status:room.tournament.status,gameCount:room.tournament.gameCount,completedGames:valid.length,contract,result,endedAt:room.game?.endedAt||null});
  }
 }
 const byLabel=[...contracts.values()].sort((a,b)=>a.label.localeCompare(b.label)||a.id.localeCompare(b.id));
 // Full keys, not labels or a hash, partition comparisons. Label duplicates need visible disambiguation.
 const counts=new Map();for(const c of byLabel)counts.set(c.label,(counts.get(c.label)||0)+1);
 const variants=new Map();for(const c of byLabel)if(counts.get(c.label)>1){const n=(variants.get(c.label)||0)+1;variants.set(c.label,n);c.label+=` · contract ${n}`;}
 return {userId,tables:seenRooms.size,games:games.sort((a,b)=>(a.endedAt||'').localeCompare(b.endedAt||'')||a.id.localeCompare(b.id)),tournaments,contracts:byLabel,quality};
}

export function overallResults(facts,{contract='all',scope='all'}={}){
 const games=facts.games.filter(r=>(contract==='all'||r.contract===contract)&&(scope!=='tournaments'||r.tournamentId));
 const tournaments=facts.tournaments.filter(t=>contract==='all'||t.contract===contract),players=new Map();
 for(const record of games){const game=record.game,best=Math.max(...record.totals.map(t=>t.grand));game.players.forEach((player,seat)=>{
  if(!players.has(player.id))players.set(player.id,{id:player.id,name:player.name||'Player',aliasDate:'',games:0,wins:0,points:0,tournaments:0,tournamentWins:0,pointsTitles:0,winsTitles:0,values:[],trend:[],datedPoints:0});
  const p=players.get(player.id);if(!p.aliasDate||(record.endedAt&&record.endedAt>=p.aliasDate)){p.name=player.name||p.name;p.aliasDate=record.endedAt||p.aliasDate;}
  p.games++;p.points+=record.totals[seat].grand;p.values.push(record.totals[seat].grand);p.wins+=game.players.length>1&&record.totals[seat].grand===best?1:0;
  if(record.endedAt){p.datedPoints+=record.totals[seat].grand;p.trend.push({date:record.endedAt,total:p.datedPoints,gameId:game.id});}
 });}
 for(const t of tournaments)if(t.result)for(const row of t.result.standings){
  const p=players.get(row.userId);if(!p)continue;
  const points=t.result.pointsLeaders.includes(p.id),wins=t.result.winsLeaders.includes(p.id);
  p.tournaments++;p.tournamentWins+=points||wins?1:0;p.pointsTitles+=points?1:0;p.winsTitles+=wins?1:0;
 }
 return {games,tournaments,players:[...players.values()].map(p=>({...p,average:contract==='all'?null:round(mean(p.values))})).sort((a,b)=>b.tournamentWins-a.tournamentWins||b.points-a.points||a.id.localeCompare(b.id)),points:games.reduce((sum,r)=>sum+r.totals.reduce((n,t)=>n+t.grand,0),0),verifiedTournaments:tournaments.filter(t=>t.result).length};
}

export function playerPatterns(facts,playerId,{contract,scope='all'}={}){
 if(!contract||contract==='all')throw Error('Choose one matching rules contract for player comparisons.');
 const records=overallResults(facts,{contract,scope}).games.filter(r=>r.game.players.some(p=>p.id===playerId));
 if(!records.length)return null;
 const rows=records.map(r=>{const seat=r.game.players.findIndex(p=>p.id===playerId);return{r,seat,sheet:r.game.sheets[seat],total:r.totals[seat]};});
 const values=rows.map(r=>r.total.grand),dated=rows.filter(r=>r.r.endedAt),chronology=rows.filter(r=>r.r.chronology.verified),early=chronology.flatMap(({r,seat})=>r.chronology.orders[seat].slice(0,5)),average=mean(values);
 const recent=dated.slice(-5),previous=dated.slice(-10,-5);
 return {id:playerId,name:records.at(-1).game.players.find(p=>p.id===playerId).name,games:rows.length,average:round(average),best:Math.max(...values),spread:round(Math.sqrt(mean(values.map(v=>(v-average)**2)))),upperBonuses:rows.filter(r=>r.total.bonus>0).length,zeros:rows.reduce((sum,r)=>sum+BASE_KEYS.filter(k=>r.sheet[k]===0).length,0),frameCount:rows.length*13,
  recent:{count:recent.length,average:round(mean(recent.map(r=>r.total.grand)))},previous:{count:previous.length,average:round(mean(previous.map(r=>r.total.grand)))},
  chronologyGames:chronology.length,earlyEntries:early.length,earlyUpper:early.filter(k=>UPPER_KEYS.includes(k)).length,timedEntries:chronology.reduce((n,r)=>n+r.r.chronology.timedEntries,0),historyEntries:chronology.reduce((n,r)=>n+r.r.chronology.entries,0),
  trend:dated.map(({r,seat,total})=>({date:r.endedAt,gameId:r.id,value:total.grand,opponents:round(mean(r.totals.filter((_,i)=>i!==seat).map(t=>t.grand)))})),
  categories:BASE_KEYS.map(key=>{const peers=rows.flatMap(({r,seat})=>r.game.sheets.filter((_,i)=>i!==seat).map(s=>s[key]));return{key,average:round(mean(rows.map(r=>r.sheet[key]))),count:rows.length,zeros:rows.filter(r=>r.sheet[key]===0).length,peerAverage:round(mean(peers)),peerCount:peers.length,entryAverage:round(mean(chronology.map(({r,seat})=>r.chronology.orders[seat].indexOf(key)+1))),entryGames:chronology.length};})};
}
