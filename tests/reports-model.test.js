import {describe,it,expect} from 'vitest';
import {command} from '../src/game/core.js';
import {BASE_KEYS} from '../src/game/categories.js';
import {recordedPattern} from '../src/reports/history.js';
import {reportFacts,reportContract,overallResults,playerPatterns} from '../src/reports/model.js';
import {reportGame,reportTable} from './helpers/report-fixtures.js';
const facts=(games,options)=>reportFacts('one',[reportTable('table',games,options)]);
describe('overall accepted-game reporting',()=>{
 it('combines tournaments, keeps independent titles and counts each won tournament once',()=>{
  const games=[reportGame('big',{patches:[{chance:30}]}),reportGame('loss-a',{patches:[{}, {chance:1}]}),reportGame('loss-b',{patches:[{}, {chance:1}]})];
  const table=reportTable('split',games),tie=reportTable('tie',[reportGame('tied',{patches:[{chance:10},{chance:10}]})]);
  const data=reportFacts('one',[table,table,tie]),result=overallResults(data);
  expect(result.games).toHaveLength(4);expect(result.verifiedTournaments).toBe(2);expect(result.points).toBe(52);
  expect(result.players.find(p=>p.id==='one')).toMatchObject({tournamentWins:2,pointsTitles:2,winsTitles:1,points:40,games:4,wins:2,tournaments:2,average:null});
  expect(result.players.find(p=>p.id==='two')).toMatchObject({tournamentWins:2,pointsTitles:1,winsTitles:2,points:12,wins:3});
 });
 it('uses the newest historical revision and authoritative current game after correction/Undo',()=>{
  const g=reportGame('same',{patches:[{chance:20}]}),table=reportTable('t',[g]);
  const corrected=command(g,{type:'correct-score',seat:0,target:g.events.find(e=>e.type==='score'&&e.seat===0&&e.category==='chance').id,value:23},{id:'fix'});
  table.snapshots=[{...corrected,sequence:1},g,g];table.room.game=corrected;
  expect(overallResults(reportFacts('one',[table])).players.find(p=>p.id==='one').points).toBe(23);
  table.room.game={...corrected,revision:corrected.revision+1,status:'active',endedAt:null};table.room.tournament.status='playing';
  const data=reportFacts('one',[table]);expect(data.games).toHaveLength(0);expect(data.quality.inProgressGames).toBe(1);expect(overallResults(data).verifiedTournaments).toBe(0);
 });
 it('preserves account identity across aliases and never merges two different accounts sharing an alias',()=>{
  const first=reportGame('a'),second=reportGame('b',{names:['New alias','Jamie']}),third=reportGame('c',{ids:['one','other'],names:['New alias','Jamie']});
  const result=overallResults(reportFacts('one',[reportTable('a',[first,second]),reportTable('b',[third])]));
  expect(result.players).toHaveLength(3);expect(result.players.find(p=>p.id==='one')).toMatchObject({games:3,name:'New alias'});expect(result.players.filter(p=>p.name==='Jamie')).toHaveLength(2);
 });
 it('withholds incomplete final awards while retaining valid finished-game facts',()=>{
  const data=facts([reportGame('first')],{count:2});expect(data.quality.unverifiedTournaments).toBe(1);expect(overallResults(data)).toMatchObject({verifiedTournaments:0,points:0});expect(overallResults(data).players.every(p=>p.tournaments===0)).toBe(true);expect(data.games).toHaveLength(1);
 });
 it('does not award ongoing tournaments or count incomplete finished sheets',()=>{
  const g=reportGame('valid'),invalid=reportGame('invalid');delete invalid.sheets[0].aces;
  const table=reportTable('ongoing',[g,invalid],{status:'playing'});const data=reportFacts('one',[table]);expect(data.quality.invalidGames).toBe(1);expect(data.games).toHaveLength(1);expect(overallResults(data).verifiedTournaments).toBe(0);
 });
 it('separates complete game statistics from local-only and unconfigured history',()=>{
  const t=reportTable('t',[reportGame('one')]);t.historyAvailable=false;const data=reportFacts('one',[t]);expect(data.quality.unavailableHistoryTables).toBe(1);expect(data.quality.unverifiedTournaments).toBe(1);
  expect(()=>reportFacts('outsider',[t])).toThrow('account');
 });
 it('partitions exact contracts, not mode names, object key order or aliases',()=>{
  const a=reportGame('a'),b=reportGame('b'),c=reportGame('c');b.rules=Object.fromEntries(Object.entries(b.rules).reverse());c.rules={...c.rules,joker:false};
  expect(reportContract(a)).toBe(reportContract(b));expect(reportContract(c)).not.toBe(reportContract(a));
  const data=reportFacts('one',[reportTable('t',[a,b],{tournament:false}),reportTable('u',[c],{tournament:false})]);expect(data.contracts).toHaveLength(2);expect(new Set(data.contracts.map(c=>c.label)).size).toBe(2);
  expect(overallResults(data,{contract:reportContract(a)}).games).toHaveLength(2);
 });
 it('splits solo, source and frozen rule versions and never estimates a mixed average',()=>{
  const a=reportGame('multi'),solo=reportGame('solo',{ids:['one'],names:['Alex']}),v2=reportGame('v2',{mode:'competition',rulesVersion:2});
  const data=reportFacts('one',[reportTable('a',[a],{tournament:false}),reportTable('s',[solo],{tournament:false}),reportTable('b',[v2],{tournament:false})]);expect(data.contracts).toHaveLength(3);expect(overallResults(data).players.every(p=>p.average===null)).toBe(true);expect(overallResults(data,{contract:reportContract(solo)}).players[0].wins).toBe(0);expect(()=>playerPatterns(data,'one',{contract:'all'})).toThrow('contract');
  expect(reportContract({...a,source:'camera'})).not.toBe(reportContract(a));
 });
 it('supports all account games versus tournament-only scope without moving awards',()=>{
  const data=reportFacts('one',[reportTable('t',[reportGame('a')]),reportTable('single',[reportGame('b')],{tournament:false})]);expect(overallResults(data).games).toHaveLength(2);expect(overallResults(data,{scope:'tournaments'}).games).toHaveLength(1);expect(overallResults(data).verifiedTournaments).toBe(1);
 });
 it('rejects conflicting ownership and an archive newer than the current authoritative snapshot',()=>{
  const g=reportGame('same'),a=reportTable('a',[g]),b=reportTable('b',[g]);expect(()=>reportFacts('one',[a,b])).toThrow('ownership');a.snapshots[0].revision++;expect(()=>reportFacts('one',[a])).toThrow('revisions');
 });
});
describe('player patterns and evidence coverage',()=>{
 it('uses final category outcomes, upper-bonus denominators and opponents from the same games',()=>{
  const g=reportGame('bonus',{patches:[{aces:3,twos:6,threes:9,fours:12,fives:15,sixes:18,chance:23},{chance:10}]});const data=facts([g]);const p=playerPatterns(data,'one',{contract:reportContract(g)});
  expect(p).toMatchObject({games:1,average:121,upperBonuses:1,zeros:6,frameCount:13,chronologyGames:1,earlyUpper:5,earlyEntries:5});expect(p.categories.find(c=>c.key==='chance')).toMatchObject({average:23,peerAverage:10,peerCount:1,entryAverage:13,entryGames:1});expect(p.previous).toEqual({count:0,average:null});
 });
 it('compares recent/prior dated samples and leaves absent dates unknown',()=>{
  const games=Array.from({length:7},(_,i)=>reportGame('g'+i,{time:`2026-10-${10+i}T18:00:00.000Z`,patches:[{chance:i+1}]}));games[0].endedAt=null;
  const data=facts(games),p=playerPatterns(data,'one',{contract:reportContract(games[0])});expect(data.quality.missingDates).toBe(1);expect(p.games).toBe(7);expect(p.trend).toHaveLength(6);expect(p.recent).toEqual({count:5,average:5});expect(p.previous).toEqual({count:1,average:2});
 });
 it('does not invent peers, timestamps or chronology for missing evidence',()=>{
  const g=reportGame('solo',{ids:['one'],names:['Alex']});g.events=[];const p=playerPatterns(facts([g],{tournament:false}),'one',{contract:reportContract(g)});expect(p.chronologyGames).toBe(0);expect(p.earlyEntries).toBe(0);expect(p.categories.every(c=>c.peerAverage===null&&c.peerCount===0&&c.entryAverage===null)).toBe(true);expect(p.trend[0].opponents).toBeNull();
 });
 it('reconciles per-category evidence, not just a matching grand total',()=>{
  const g=reportGame('zeros');expect(recordedPattern(g).verified).toBe(true);g.events=g.events.filter(e=>e.category!=='aces');expect(recordedPattern(g).verified).toBe(false);
  const swapped=reportGame('offset',{patches:[{threeKind:20,chance:20}]});swapped.sheets[0].threeKind=19;swapped.sheets[0].chance=21;expect(recordedPattern(swapped).verified).toBe(false);
 });
 it('handles correction, completed-game Undo and a replacement without counting the undone frame twice',()=>{
  let g=reportGame('undo');const target=g.events.at(-1);g=command(g,{type:'undo-score',seat:target.seat,target:target.id},{id:'undo'});g=command(g,{type:'start',seat:target.seat},{id:'restart'});g=command(g,{type:'score',seat:target.seat,category:target.category,value:20},{id:'replace'});const original=g.events.at(-1);g=command(g,{type:'correct-score',seat:target.seat,target:original.id,value:23},{id:'correct'});
  const pattern=recordedPattern(g);expect(pattern.verified).toBe(true);expect(pattern.orders[target.seat]).toHaveLength(13);expect(pattern.orders[target.seat].at(-1)).toBe('chance');const p=playerPatterns(facts([g]),g.players[target.seat].id,{contract:reportContract(g)});expect(p.categories.find(c=>c.key==='chance').average).toBe(23);
 });
 it('counts timestamp coverage separately from accepted event ordering',()=>{
  const g=reportGame('time');delete g.events.find(e=>e.type==='score').time;const p=recordedPattern(g);expect(p.verified).toBe(true);expect(p.timedEntries).toBe(p.entries-1);
 });
 it('withholds corrupt bonus histories and malformed/repeated scoring event IDs',()=>{
  const g=reportGame('bad');g.sheets[0].yahtzeeBonus=100;expect(recordedPattern(g).verified).toBe(false);const duplicate=reportGame('dup');duplicate.events.push({...duplicate.events.find(e=>e.type==='score')});expect(recordedPattern(duplicate).verified).toBe(false);
 });
});

it('flags gaps in non-tournament game sequences rather than claiming a complete career',()=>{
 const t=reportTable('gaps',[reportGame('latest')],{tournament:false});t.room.gameSequence=4;t.snapshots=[];const data=reportFacts('one',[t]);expect(data.quality.incompleteHistoryTables).toBe(1);expect(data.games).toHaveLength(1);
});
it('rejects contradictory duplicate revisions and malformed revision metadata',()=>{
 const g=reportGame('dup'),t=reportTable('t',[g]);const different=structuredClone(t.snapshots[0]);different.sheets[0].chance=1;t.snapshots.push(different);expect(()=>reportFacts('one',[t])).toThrow('same revision');t.snapshots=[{...g,revision:null}];expect(()=>reportFacts('one',[t])).toThrow('revision');
});
it('does not use a scored turn marked excluded without its required Undo audit',()=>{
 const g=reportGame('excluded');g.turns[0].excluded=true;expect(recordedPattern(g).verified).toBe(false);
});
it('reconciles explicit bonuses and their Undo while preserving frame order',()=>{
 const g=reportGame('bonus-audit');g.events.push({id:'bonus-extra',type:'bonus',seat:0,value:100,time:'2026-10-20T20:00:00.000Z'});g.sheets[0].yahtzeeBonus=100;expect(recordedPattern(g).verified).toBe(true);g.events.push({id:'undo-bonus',type:'score-undo',seat:0,target:'bonus-extra',time:'2026-10-20T20:00:01.000Z'});g.sheets[0].yahtzeeBonus=0;expect(recordedPattern(g).orders[0]).toHaveLength(BASE_KEYS.length);expect(recordedPattern(g).verified).toBe(true);
});

it('derives all reporting views without changing saved games or their audit history',()=>{
 const table=reportTable('readonly',[reportGame('immutable')]);const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};freeze(table);const before=JSON.stringify(table),data=reportFacts('one',[table]);overallResults(data);playerPatterns(data,'one',{contract:data.contracts[0].id});expect(JSON.stringify(table)).toBe(before);
});
it('keeps valid final totals when an older entry list contains a malformed event',()=>{
 const g=reportGame('malformed-history',{patches:[{chance:23}]});g.events.push(null);const data=facts([g]);expect(overallResults(data).points).toBe(23);expect(playerPatterns(data,'one',{contract:reportContract(g)}).chronologyGames).toBe(0);
});
it('marks malformed player rows as invalid scorecards without crashing the rest of the report',()=>{
 const t=reportTable('old',[reportGame('malformed-player')]);t.room.game.players[0]=null;t.snapshots=[];const data=reportFacts('one',[t]);expect(data.games).toHaveLength(0);expect(data.quality.invalidGames).toBe(1);expect(data.quality.unverifiedTournaments).toBe(1);
});
