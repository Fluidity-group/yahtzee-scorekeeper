import { describe,it,expect } from 'vitest';
import { BASE_KEYS } from '../src/game/categories.js';
import { createCoreGame,command,scoreOptions,combinations,rollAnalytics,results,rollLimit } from '../src/game/core.js';
let serial=0;
const create=(mode='standard',source='simulated',names=['A','B'])=>createCoreGame({id:`g${++serial}`,names,mode,source});
const act=(g,type,extra={})=>command(g,{seat:g.activeSeat,type,...extra},{id:`c${++serial}`});
const roll=(g,dice)=>act(act(g,'start'),'roll',{dice});
it.each(['toString','__proto__','constructor','unknown',null,{},123])('rejects non-contract game mode %s',mode=>{
 expect(()=>create(mode)).toThrow('Unknown game mode.');
});

describe('complete simulated games',()=>{
 for(const mode of ['standard','competition','accumulative'])for(const count of [1,2,8]){
  it(`finishes ${mode} with ${count} players and thirteen categories each`,()=>{
   let g=create(mode,'simulated',Array.from({length:count},(_,i)=>`Player ${i+1}`));
   for(const category of BASE_KEYS)for(let seat=0;seat<count;seat++){
    expect(g.activeSeat).toBe(seat);
    g=roll(g,[1,2,3,4,5]);
    const value=scoreOptions(g,[1,2,3,4,5]).scores[category];
    g=act(g,'score',{category,value});
   }
   expect(g.status).toBe('finished');expect(g.turns).toHaveLength(13*count);
   expect(results(g).totals.every(n=>n===100)).toBe(true);
  });
 }
});

describe('dice evaluator and standard Joker rules',()=>{
 it('counts natural combinations and unique-value straights',()=>{
  expect(combinations([2,3,3,4,5]).smallStraight).toBe(true);
  expect(combinations([2,3,3,4,5]).largeStraight).toBe(false);
  expect(combinations([3,3,3,6,6]).fullHouse).toBe(true);
  expect(combinations([3,3,3,3,3]).fullHouse).toBe(false);
  expect(combinations([1,2,3,4,5]).largeStraight).toBe(true);
 });
 it('offers exact category scores and rejects incorrect totals',()=>{
  let g=roll(create(),[3,3,4,1,6]);
  expect(scoreOptions(g,[3,3,4,1,6]).scores).toMatchObject({threes:6,chance:17,threeKind:0,fullHouse:0});
  expect(()=>act(g,'score',{category:'chance',value:18})).toThrow('match');
  g=act(g,'score',{category:'threes',value:6});expect(g.activeSeat).toBe(1);
 });
 it('forces matching upper and records bonus on the same turn',()=>{
  let g=create();g.sheets[0].yahtzee=50;g=roll(g,[2,2,2,2,2]);
  expect(scoreOptions(g,[2,2,2,2,2]).scores).toEqual({twos:10});
  expect(()=>act(g,'score',{category:'chance',value:10})).toThrow('Joker');
  g=act(g,'score',{category:'twos',value:10});expect(g.sheets[0].yahtzeeBonus).toBe(100);expect(g.activeSeat).toBe(1);
 });
 it('allows lower Joker scores after upper is used, even if Yahtzee was scratched',()=>{
  let g=create();g.sheets[0]={yahtzee:0,twos:6};g=roll(g,[2,2,2,2,2]);
  const o=scoreOptions(g,[2,2,2,2,2]);expect(o.scores.fullHouse).toBe(25);expect(o.bonus).toBe(0);
  expect(o.scores.aces).toBeUndefined();g=act(g,'score',{category:'largeStraight',value:40});expect(g.sheets[0].yahtzeeBonus).toBeUndefined();
 });
 it('forces an upper zero when no lower Joker category remains',()=>{
  const g=create();for(const k of BASE_KEYS.filter(k=>!['aces','threes'].includes(k)))g.sheets[0][k]=0;
  expect(scoreOptions(g,[2,2,2,2,2]).scores).toEqual({aces:0,threes:0});
 });
});
describe('modes, turn boundaries and limits',()=>{
 it.each(['competition','accumulative'])('%s chains bonuses then one category ends the chain',mode=>{
  let g=create(mode);g.sheets[0].yahtzee=50;
  g=act(roll(g,[1,1,1,1,1]),'bonus');expect(g.activeSeat).toBe(0);expect(g.turn).toBeNull();
  g=act(roll(g,[6,6,6,6,6]),'bonus');expect(g.activeSeat).toBe(0);
  expect(g.sheets[0].yahtzeeBonus).toBe(mode==='competition'?200:150);
  g=act(roll(g,[1,2,3,4,5]),'score',{category:'chance',value:15});expect(g.activeSeat).toBe(1);expect(g.turns).toHaveLength(3);
 });
 it('scores a first face-weighted Yahtzee and rejects bonuses after a scratch',()=>{
  let g=roll(create('accumulative'),[2,2,2,2,2]);g=act(g,'score',{category:'yahtzee',value:90});expect(g.activeSeat).toBe(1);
  g.sheets[1].yahtzee=0;g=roll(g,[1,1,1,1,1]);expect(()=>act(g,'bonus')).toThrow('scored first');
 });
 it('uses four rolls only on Competition final category, including extra turns',()=>{
  let g=create('competition');for(const k of BASE_KEYS.filter(k=>k!=='chance'))g.sheets[0][k]=0;g.sheets[0].yahtzee=50;
  expect(rollLimit(g)).toBe(4);g=act(roll(g,[1,1,1,1,1]),'bonus');g=act(g,'start');expect(g.turn.limit).toBe(4);
  const a=create('accumulative');a.sheets=g.sheets;expect(rollLimit(a)).toBe(3);
 });
 it('rejects pre-start rolls, wrong player, over-limit and changing held dice',()=>{
  let g=create();expect(()=>act(g,'roll',{dice:[1,2,3,4,5]})).toThrow('Start');g=roll(g,[1,2,3,4,5]);
  expect(()=>act(g,'roll',{dice:[2,2,3,4,5],held:[true,false,false,false,false]})).toThrow('Held');
  expect(()=>act(g,'score',{seat:1,category:'chance',value:15})).toThrow('another');
  g=act(g,'roll',{dice:[1,2,3,4,6]});g=act(g,'roll',{dice:[1,2,3,4,5]});
  expect(()=>act(g,'roll',{dice:[1,2,3,4,5]})).toThrow('limit');
 });
 it('does not count excluded rolls and manual fallback permits completion',()=>{
  let g=roll(create(),[1,2,3,4,5]);g=act(g,'discard-roll');expect(rollAnalytics(g,0).recordedRolls).toBe(0);
  g=act(g,'manual-fallback');g=act(g,'score',{category:'chance',value:23});expect(g.sheets[0].chance).toBe(23);
  expect(g.turns[0].manualFallback).toBe(true);
 });
 it('handles eight seats and solo completion with no fabricated opponent win',()=>{
  let g=create('standard','manual',Array.from({length:8},(_,i)=>`P${i}`));
  for(let i=0;i<8;i++){g=act(act(g,'start'),'score',{category:'aces',value:0});expect(g.activeSeat).toBe((i+1)%8);}
  let solo=create('standard','manual',['Me']);for(const k of BASE_KEYS)solo=act(act(solo,'start'),'score',{category:k,value:0});
  expect(solo.status).toBe('finished');expect(results(solo)).toMatchObject({solo:true,totals:[0]});
 });
 it('validates manual input and records declared repeated Yahtzee with Joker placement',()=>{
  let g=create('standard','manual');g.sheets[0].yahtzee=50;g=act(g,'start');
  expect(()=>act(g,'score',{category:'twos',value:9})).toThrow('count');
  g=act(g,'score',{category:'twos',value:10,yahtzeeFace:2});expect(g.sheets[0].yahtzeeBonus).toBe(100);
 });
});
describe('audit and idempotency',()=>{
 it('leaves prior snapshots unchanged and deduplicates a score request',()=>{
  const before=roll(create(),[1,2,3,4,5]);const action={type:'score',seat:0,category:'chance',value:15};
  const after=command(before,action,{id:'same'});expect(before.sheets[0].chance).toBeUndefined();
  expect(command(after,action,{id:'same'})).toBe(after);
 });
 it('keeps original readings and scores while correcting derived analytics without advancing turn',()=>{
  let g=roll(create(),[3,3,3,6,6]);g=act(g,'correct-roll',{dice:[1,2,3,4,5]});
  expect(g.events.find(e=>e.type==='roll').dice).toEqual([3,3,3,6,6]);
  expect(rollAnalytics(g,0)).toMatchObject({counts:{largeStraight:1},corrected:1});
  expect(rollAnalytics(g,0).counts.fullHouse).toBeUndefined();
  g=act(g,'score',{category:'chance',value:15});const score=g.events.find(e=>e.type==='score');
  g=act(g,'correct-score',{seat:0,target:score.id,value:20});expect(g.activeSeat).toBe(1);expect(score.value).toBe(15);expect(g.sheets[0].chance).toBe(20);
 });
 it('distinguishes matching rolls from distinct turns',()=>{
  let g=roll(create(),[3,3,3,6,6]);g=act(g,'roll',{dice:[2,2,2,5,5]});
  expect(rollAnalytics(g,0)).toMatchObject({counts:{fullHouse:2},turns:{fullHouse:1}});
 });
});
