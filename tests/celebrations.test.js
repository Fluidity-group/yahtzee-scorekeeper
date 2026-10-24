import { describe,it,expect } from 'vitest';
import { celebration, celebrationMessage } from '../src/game/celebrations.js';
const before={id:'game',status:'active',events:[]};
const after=event=>({...before,events:[{id:'event',seat:1,...event}]});

it('explains the accepted game winner, margin, and shared victories',()=>{
 const game={players:[{name:'Keith'},{name:'Amber'}],sheets:[{chance:25},{chance:20}]};
 expect(celebrationMessage({kind:'finish',seat:0},game)).toEqual({title:'Keith wins!',subtitle:'25 points · 5 ahead. Well played!'});
 game.sheets[1].chance=25;expect(celebrationMessage({kind:'finish',seat:1},game).subtitle).toBe('Keith & Amber tied on 25 points.');
});
describe('confirmed game celebrations',()=>{
 it('celebrates accepted final-chain bonuses, not failed rolls, retries or corrections',()=>{
  const next=after({type:'final-chain-roll',value:100,face:6});
  const effect=celebration(before,next);
  expect(effect).toMatchObject({kind:'yahtzee',bonus:100,seat:1});
  expect(celebration(next,next)).toBeNull();
  expect(celebration(null,next)).toBeNull();
  expect(celebration(before,after({type:'final-chain-roll',value:0,face:null}))).toBeNull();
  expect(celebration(before,after({type:'score-correction',value:100}))).toBeNull();
  expect(celebrationMessage(effect,{players:[{name:'A'},{name:'B'}]})).toEqual({title:'YAHTZEE · +100!',subtitle:'B · Bonus secured. Keep it rolling!'});
 });
 it('celebrates final-chain completion once even without a new category score',()=>{
  const next={...after({type:'final-chain-end',attempt:3}),status:'finished',players:[{name:'A'},{name:'B'}],sheets:[{yahtzee:50},{yahtzee:50,yahtzeeBonus:100}]};
  expect(celebration(before,next)).toMatchObject({kind:'finish',seat:1});
  expect(celebration(next,next)).toBeNull();
  expect(celebration(null,next)).toBeNull();
  expect(celebrationMessage(celebration(before,next),next).title).toBe('B wins!');
  expect(celebration(before,{...next,status:'active'})).toBeNull();
 });
 it('uses actual bonus values and distinguishes full-house scoring from large straight',()=>{
  const next=after({type:'score',category:'fullHouse',value:25});
  expect(celebration(before,next)).toMatchObject({kind:'full-house'});
  expect(celebrationMessage(celebration(before,next),{players:[{name:'A'},{name:'B'}]}).title).toBe('FULL HOUSE!');
  const bonus=after({type:'bonus',value:80});
  expect(celebrationMessage(celebration(before,bonus),{players:[{name:'A'},{name:'B'}]}).title).toBe('YAHTZEE · +80!');
 });
 it('celebrates crossing 63 once and retains the bonus alongside a final result',()=>{
  const previous={...before,sheets:[{}, {aces:3,twos:6,threes:9,fours:12,fives:15}]};
  const next={...after({type:'score',category:'sixes',value:18}),sheets:[{}, {...previous.sheets[1],sixes:18}]};
  expect(celebration(previous,next)).toMatchObject({kind:'upper-bonus',upperBonus:true,seat:1});
  expect(celebration(next,next)).toBeNull();
  expect(celebration(previous,{...next,status:'finished'})).toMatchObject({kind:'finish',upperBonus:true});
  expect(celebration(previous,{...next,sheets:[{}, {...previous.sheets[1],sixes:12}]}).upperBonus).toBe(false);
  expect(celebration(previous,{...next,events:[{id:'correction',type:'score-correction',seat:1}]})).toBeNull();
 });
 it('does not replay on join, refresh or correction',()=>{
  const next=after({type:'score',category:'yahtzee',value:50});
  expect(celebration(null,next)).toBeNull();
  expect(celebration(next,next)).toBeNull();
  expect(celebration(before,after({type:'score-correction',category:'yahtzee',value:50}))).toBeNull();
 });
 it('celebrates scored Yahtzees and repeated bonuses, but not scratches',()=>{
  expect(celebration(before,after({type:'score',category:'yahtzee',value:50})).kind).toBe('yahtzee');
  expect(celebration(before,after({type:'score',category:'aces',value:5,bonus:100})).kind).toBe('yahtzee');
  expect(celebration(before,after({type:'bonus',value:100})).kind).toBe('yahtzee');
  expect(celebration(before,after({type:'score',category:'yahtzee',value:0}))).toBeNull();
 });
 it('celebrates straights and prioritises the final result',()=>{
  const next=after({type:'score',category:'largeStraight',value:40});
  expect(celebration(before,next).kind).toBe('straight');
  expect(celebration(before,{...next,status:'finished'}).kind).toBe('finish');
 });
});
