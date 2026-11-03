import {createCoreGame,command} from '../../src/game/core.js';
import {BASE_KEYS} from '../../src/game/categories.js';

export function reportGame(id,{ids=['one','two'],names=['Alex','Sam'],mode='standard',rulesVersion=1,patches=[],time='2026-10-20T18:00:00.000Z'}={}){
 let game=createCoreGame({id,names,mode,rulesVersion,source:'manual',time});game.players.forEach((p,i)=>p.id=ids[i]);let count=0;
 const act=(type,data={})=>{game=command(game,{type,seat:game.activeSeat,...data},{id:id+'-event-'+(++count),time:new Date(Date.parse(time)+count*1000).toISOString()});};
 while(game.status!=='finished'){
  const seat=game.activeSeat,key=BASE_KEYS.find(k=>game.sheets[seat][k]===undefined);
  act('start');act('score',{category:key,value:patches[seat]?.[key]??0});
 }
 return game;
}
export function reportTable(id,games,{status='completed',count=games.length,tournament=true}={}){
 const snapshots=games.map((g,i)=>({...structuredClone(g),sequence:i+1})),last=snapshots.at(-1);
 const room={id,code:'ABCDEFGH',revision:10,mode:last.mode,source:last.source,members:last.players.map(p=>({userId:p.id,name:p.name})),gameSequence:snapshots.length,game:structuredClone(last),capabilities:{history:true},...(tournament?{tournament:{name:'Table '+id,status,gameCount:count,rules:structuredClone(last.rules)}}:{})};
 return {room,snapshots,historyAvailable:true};
}
