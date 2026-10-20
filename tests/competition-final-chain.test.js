import {describe,it,expect} from 'vitest';
import {BASE_KEYS} from '../src/game/categories.js';
import {createCoreGame,command,scoreOptions,gameRules} from '../src/game/core.js';
let seq=0;
const act=(g,type,data={})=>command(g,{seat:g.activeSeat,type,...data},{id:`chain-${++seq}`});
const game=(names=['A'],version=2)=>createCoreGame({id:`game-${++seq}`,names,mode:'competition',source:'manual',rulesVersion:version});
function finalYahtzee(names=['A'],version=2){let g=game(names,version);g.sheets[0]=Object.fromEntries(BASE_KEYS.filter(k=>k!=='chance').map(k=>[k,0]));g.sheets[0].yahtzee=50;return act(act(g,'start'),'score',{category:'chance',value:30,yahtzeeFace:6});}
const outcome=(g,face)=>act(g.turn?g:act(g,'start'),'final-chain-roll',{face});
describe('Competition v2 final bonus attempts',()=>{
 it('keeps game active after a repeat Yahtzee scores the final category',()=>{const g=finalYahtzee();expect(g.status).toBe('active');expect(g.finalChain).toEqual({seat:0,attempt:1});expect(g.sheets[0].yahtzee).toBe(50);});
 it.each([1,2,3])('Yahtzee on extra roll %s renews a fresh three-roll attempt',roll=>{let g=finalYahtzee();for(let i=1;i<roll;i++)g=outcome(g,null);g=outcome(g,6);expect(g.sheets[0].yahtzeeBonus).toBe(200);expect(g.finalChain.attempt).toBe(2);expect(g.turn).toBeNull();g=act(g,'start');expect(g.turn).toMatchObject({phase:'final-bonus',limit:3,manualRolls:[]});});
 it('ends only after three failed rolls and records a separate attempt',()=>{let g=finalYahtzee();g=outcome(g,null);expect(g.status).toBe('active');g=outcome(g,null);expect(g.status).toBe('active');g=outcome(g,null);expect(g.status).toBe('finished');expect(g.finalChain).toBeNull();expect(g.turns.at(-1).manualRolls).toHaveLength(3);});
 it('passes to unfinished opponent instead of ending the whole game',()=>{let g=finalYahtzee(['A','B']);for(let i=0;i<3;i++)g=outcome(g,null);expect(g.status).toBe('active');expect(g.activeSeat).toBe(1);expect(g.finalChain).toBeNull();});
 it('freezes a v2 rules snapshot without changing v1 defaults',()=>{const g=game();expect(g.rules).toMatchObject({version:2,finalChain:true,bonusRolls:3,finalRolls:4});expect(gameRules('competition')).toMatchObject({version:1,finalRolls:4});expect(gameRules('competition',1).finalChain).toBeUndefined();});
 it('requires a valid v2 Competition manual source',()=>{for(const mode of ['standard','accumulative'])expect(()=>gameRules(mode,2)).toThrow();for(const source of ['camera','godice','manual-faces'])expect(()=>gameRules('competition',2,source)).toThrow();expect(()=>gameRules('competition',3)).toThrow();});
 it.each([undefined,0,7,1.5,'2',false])('rejects invalid reported face %s',face=>{expect(()=>outcome(finalYahtzee(),face)).toThrow();});
 it('leaves scores and frozen snapshots unchanged and deduplicates outcomes',()=>{const before=act(finalYahtzee(),'start');const action={type:'final-chain-roll',seat:0,face:2};const after=command(before,action,{id:'same-outcome'});expect(before.sheets[0].yahtzeeBonus).toBe(100);expect(before.turn.manualRolls).toEqual([]);expect(command(after,action,{id:'same-outcome'})).toBe(after);expect(after.rules).toEqual(before.rules);});
 it('disallows regular scoring or v1 bonus commands during final bonus attempts',()=>{const g=act(finalYahtzee(),'start');expect(()=>act(g,'score',{category:'chance',value:0})).toThrow();expect(()=>act(g,'bonus',{yahtzeeFace:2})).toThrow();});
 it('places repeated final-turn Yahtzee into the last category then opens chain',()=>{let g=game();g.sheets[0]=Object.fromEntries(BASE_KEYS.filter(k=>k!=='chance').map(k=>[k,0]));g.sheets[0].yahtzee=50;expect(scoreOptions(g,[6,6,6,6,6]).extraTurn).toBe(false);g=act(g,'start');expect(g.turn.limit).toBe(4);expect(()=>act(g,'bonus',{yahtzeeFace:6})).toThrow();g=act(g,'score',{category:'chance',value:30,yahtzeeFace:6});expect(g.sheets[0].yahtzeeBonus).toBe(100);expect(g.finalChain).toEqual({seat:0,attempt:1});});
 it('does not start a chain after a scratched initial Yahtzee',()=>{let g=game();g.sheets[0]=Object.fromEntries(BASE_KEYS.filter(k=>k!=='chance').map(k=>[k,0]));g=act(act(g,'start'),'score',{category:'chance',value:30,yahtzeeFace:6});expect(g.status).toBe('finished');expect(g.finalChain).toBeUndefined();});
 it('records a long chain with one bonus per success and ends on the third failure',()=>{let g=finalYahtzee();for(let i=0;i<10;i++){g=outcome(g,null);g=outcome(g,null);g=outcome(g,i%6+1);}expect(g.finalChain.attempt).toBe(11);expect(g.sheets[0].yahtzeeBonus).toBe(1100);for(let i=0;i<3;i++)g=outcome(g,null);expect(g.status).toBe('finished');expect(g.turns.filter(t=>t.phase==='final-bonus')).toHaveLength(11);expect(g.events.filter(e=>e.type==='final-chain-roll'&&e.value===100)).toHaveLength(10);});
 it('holds the last player active after all sheets are full, then finishes',()=>{let g=game(['A','B']);g.sheets[0]=Object.fromEntries(BASE_KEYS.map(k=>[k,0]));g.sheets[1]=Object.fromEntries(BASE_KEYS.filter(k=>k!=='chance').map(k=>[k,0]));g.sheets[1].yahtzee=50;g.activeSeat=1;g=act(act(g,'start'),'score',{category:'chance',value:30,yahtzeeFace:6});expect(g.status).toBe('active');expect(g.activeSeat).toBe(1);expect(()=>act(g,'start',{seat:0})).toThrow('another');for(let i=0;i<3;i++)g=outcome(g,null);expect(g.status).toBe('finished');});
 it('does not enable final outcomes outside an attempt and cannot change v2 source',()=>{let g=game();expect(()=>act(g,'start',{source:'camera'})).toThrow('manual');g=act(g,'start');expect(()=>act(g,'final-chain-roll',{face:2})).toThrow('No final');});
 it('keeps pre-final repeat bonuses unchanged, including four initial final rolls',()=>{let g=game();g.sheets[0].yahtzee=50;g=act(act(g,'start'),'bonus',{yahtzeeFace:2});expect(g.sheets[0].yahtzeeBonus).toBe(100);expect(g.finalChain).toBeUndefined();g=act(g,'start');expect(g.turn.limit).toBe(3);});
 it('uses independent rules copies for saved games and new creation',()=>{const g=game(),other=game();g.rules.bonusRolls=99;expect(other.rules.bonusRolls).toBe(3);expect(gameRules('competition',2).bonusRolls).toBe(3);});
});

it('explicitly finishes a failed manual attempt without inventing individual roll observations; Undo restores it',()=>{
 let g=act(finalYahtzee(['A','B']),'start');
 const request={type:'final-chain-roll',seat:0,face:null,finishAttempt:true};
 g=command(g,request,{id:'finish-attempt'});
 expect(g.activeSeat).toBe(1);expect(g.status).toBe('active');expect(g.finalChain).toBeNull();
 expect(g.turns.at(-1).manualRolls).toHaveLength(0);expect(g.turns.at(-1).manualAttemptOutcome).toBe('no-yahtzee');
 const outcome=g.events.findLast(e=>e.type==='final-chain-roll');expect(outcome).toMatchObject({scope:'attempt',rollNumber:null,value:0});
 expect(command(g,request,{id:'finish-attempt'})).toBe(g);
 g=command(g,{type:'undo-score',seat:0,target:outcome.id},{id:'undo-finish-attempt'});
 expect(g.activeSeat).toBe(0);expect(g.finalChain).toEqual({seat:0,attempt:1});
});
it('finishes the game only when every scorecard is complete and rejects a success disguised as a failed attempt',()=>{
 let g=act(finalYahtzee(),'start');
 expect(()=>act(g,'final-chain-roll',{face:6,finishAttempt:true})).toThrow('cannot also');
 g=act(g,'final-chain-roll',{face:null,finishAttempt:true});expect(g.status).toBe('finished');
});

it('new manual Competition games have no Joker substitution, while existing frozen rule snapshots stay unchanged',()=>{
 let g=game();expect(g.rules.joker).toBe(false);g.sheets[0].yahtzee=0;g.sheets[0].sixes=18;
 const opt=scoreOptions(g,[6,6,6,6,6]);expect(opt.joker).toBe(false);expect(opt.scores.fullHouse).toBe(0);expect(opt.scores.largeStraight).toBe(0);
 const old=structuredClone(g);old.rules.joker=true;expect(scoreOptions(old,[6,6,6,6,6]).scores.fullHouse).toBe(25);
 g=act(act(g,'start'),'score',{category:'fullHouse',value:0,yahtzeeFace:6});expect(g.sheets[0].fullHouse).toBe(0);
});
