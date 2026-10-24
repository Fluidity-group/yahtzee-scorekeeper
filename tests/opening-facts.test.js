import {it,expect} from 'vitest';
import {createCoreGame,command} from '../src/game/core.js';
import {openingFacts} from '../src/commentary/opening-facts.js';
import {tournamentConfig} from '../src/multiplayer/tournament.js';
import {BASE_KEYS} from '../src/game/categories.js';
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
const time='2026-10-14T20:00:00.000Z',roomId='00000000-0000-4000-8000-000000000003';
const make=()=>({id:roomId,members:ids.map(userId=>({userId})),tournament:tournamentConfig({name:'Friday Dice Club',gameCount:3,playerCount:2},'standard','manual'),game:createCoreGame({id:roomId,names:['Dan','Amber'],source:'manual',time})});
const packet=(room,purpose='opening',extra={})=>openingFacts({room,purpose,sourceCommandId:'accepted-start',acceptedAt:time,...extra});
function finishedGame(tie=false){let game=createCoreGame({id:'previous-game',names:['Dan','Amber'],source:'manual',time});for(const category of BASE_KEYS)for(const seat of [0,1]){game=command(game,{type:'start',seat},{id:`start-${category}-${seat}`,time});game=command(game,{type:'score',seat,category,value:category==='chance'&&(seat===1||tie)?25:0},{id:`prior-${category}-${seat}`,time});}return game;}
it('captures named empty-table welcome facts without implying observed rolls or player arrival',()=>{
 const room=make(),facts=packet(room);expect(facts).toMatchObject({purpose:'opening',tournamentName:'Friday Dice Club',scoresRecorded:0,observation:'accepted-lifecycle-only',priorGameSummary:null});
 expect(facts.seats.map(seat=>seat.displayName)).toEqual(['Dan','Amber']);expect(facts).not.toHaveProperty('rolls');expect(Object.isFrozen(facts.seats)).toBe(true);
 expect(packet(room,'return').momentKey).not.toBe(facts.momentKey);
});
it('suppresses unfinished hidden leader/totals while retaining current scorecard progress',()=>{
 const room=make();room.game=command(room.game,{type:'start',seat:0},{id:'start-game',time});room.game=command(room.game,{type:'score',seat:0,category:'chance',value:25},{id:'score-game',time});room.game.hideTotals=true;
 const facts=packet(room,'return');expect(facts.scoresRecorded).toBe(1);expect(facts.leaders).toEqual([]);expect(facts.seats.every(seat=>!('total'in seat))).toBe(true);
});
it('uses only authorized finished history and distinguishes previous winner from tournament standing',()=>{
 const room=make(),prior=finishedGame();expect(prior.status).toBe('finished');
 const facts=packet(room,'next-game',{priorGame:{game:prior,accountIds:ids,authorized:true}});expect(facts.priorGameSummary.winners).toEqual([{accountId:ids[1],displayName:'Amber',total:25}]);expect(facts.priorGameSummary.meaning).toBe('previous-game-result-not-tournament-standing');
 for(const history of [{game:prior,accountIds:ids,authorized:false},{game:{...prior,status:'active'},accountIds:ids,authorized:true},{game:prior,accountIds:[ids[0],'00000000-0000-4000-8000-000000000099'],authorized:true}])expect(packet(room,'next-game',{priorGame:history}).priorGameSummary).toBeNull();
 expect(packet(room,'next-game',{priorGame:{game:finishedGame(true),accountIds:ids,authorized:true}}).priorGameSummary.tied).toBe(true);
});
it('requires an accepted lifecycle identity rather than treating hydration as a new greeting',()=>{
 expect(()=>openingFacts({room:make(),purpose:'hydrate',acceptedAt:time,sourceCommandId:'accepted-start'})).toThrow('lifecycle');
 expect(()=>openingFacts({room:make(),purpose:'opening',acceptedAt:time})).toThrow('lifecycle');
});
