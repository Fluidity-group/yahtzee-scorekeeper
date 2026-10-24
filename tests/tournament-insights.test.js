import {it,expect}from'vitest';
import {createCoreGame,command}from'../src/game/core.js';
import {BASE_KEYS}from'../src/game/categories.js';
import {scoreTimeline,tournamentInsights}from'../src/game/tournament-insights.js';
const complete=(id='g')=>{const g=createCoreGame({id,names:['A','B']});g.players[0].id='a';g.players[1].id='b';g.status='finished';g.sheets=g.players.map(()=>Object.fromEntries(BASE_KEYS.map(k=>[k,0])));return g;};
it('compares completed accepted scorecards, ties, bonus conversion and scratches without inventing missing history',()=>{
 const a=complete('a'),b=complete('b');a.sheets[0]={...a.sheets[0],aces:3,twos:6,threes:9,fours:12,fives:15,sixes:18};b.sheets[1].chance=30;
 const active=createCoreGame({id:'active',names:['A','B']});const result=tournamentInsights([a,b,active]);
 expect(result.completed).toBe(2);expect(result.ignored).toBe(1);expect(result.players[0]).toMatchObject({id:'a',average:49,wins:1,bonuses:1});
 expect(result.players[1]).toMatchObject({id:'b',average:15,wins:1,bonuses:0});expect(result.chronologyComplete).toBe(0);expect(result.games[0].timeline.points).toEqual([]);
 const tie=complete('tie');expect(tournamentInsights([tie]).players.every(p=>p.wins===1)).toBe(true);
});
it('replays corrections and Undo at their accepted positions and reconciles final totals',()=>{
 let g=createCoreGame({id:'replay',names:['A']});let n=0;const act=(type,data={})=>{g=command(g,{type,seat:0,...data},{id:'event-'+(++n),time:'2026-10-16T12:00:00Z'});};
 act('start');act('score',{category:'chance',value:20});const original=g.events.at(-1);act('correct-score',{target:original.id,value:25});act('undo-score',{target:original.id});act('start');act('score',{category:'aces',value:3});
 const line=scoreTimeline(g);expect(line.reconciled).toBe(true);expect(line.points.map(p=>p.totals[0])).toEqual([20,25,0,3]);
});
it('never merges different identities sharing an alias',()=>{const a=complete('a'),b=complete('b');b.players[0].id='different';expect(tournamentInsights([a,b]).players).toHaveLength(3);});
it('deduplicates revisions and excludes a reopened game instead of counting a stale completed snapshot',()=>{const g=complete('same');g.revision=10;const reopened={...g,revision:11,status:'active'};expect(tournamentInsights([g,g]).completed).toBe(1);expect(tournamentInsights([reopened,g]).completed).toBe(0);expect(tournamentInsights([g,reopened]).ignored).toBe(1);});
it('sums standalone bonuses and attached Joker bonuses, excluding undone results',()=>{
 const g=complete();g.sheets[0].aces=3;g.sheets[0].yahtzeeBonus=100;
 g.events=[{id:'s',type:'score',seat:0,category:'aces',value:3,bonus:100},{id:'b',type:'bonus',seat:0,value:100},{id:'u',type:'score-undo',seat:0,target:'b'}];
 expect(scoreTimeline(g)).toMatchObject({reconciled:true});expect(scoreTimeline(g).points.map(p=>p.totals[0])).toEqual([103,203,103]);
});
