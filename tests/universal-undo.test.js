import {it,expect} from 'vitest';
import {createCoreGame,command,undoableScore,rollAnalytics}from'../src/game/core.js';
import {BASE_KEYS}from'../src/game/categories.js';
let serial=0;const act=(g,type,extra={})=>command(g,{type,seat:g.activeSeat,...extra},{id:'universal-'+(++serial)});
const undo=g=>{const e=undoableScore(g);return act(g,'undo-score',{seat:e.seat,target:e.id});};
it.each(['standard','competition','accumulative'])('undoes the latest own completed %s turn but never cascades to an earlier turn',mode=>{
 let g=createCoreGame({id:mode,names:['A','B'],mode});g=act(act(g,'start'),'score',{category:'chance',value:21});
 const first=undoableScore(g,0);expect(first).not.toBeNull();expect(undoableScore(g,1)).toBeNull();
 g=undo(g);expect(g.activeSeat).toBe(0);expect(g.sheets[0].chance).toBeUndefined();expect(undoableScore(g)).toBeNull();
 g=act(act(g,'start'),'score',{category:'aces',value:3});g=act(act(g,'start'),'score',{category:'chance',value:20});
 expect(undoableScore(g,0)).toBeNull();expect(undoableScore(g,1)?.category).toBe('chance');
});
it.each(['manual-faces','simulated','godice','camera'])('supports %s games after a manual fallback with a new source turn required',source=>{
 let g=createCoreGame({id:source,names:['A','B'],source});g=act(g,'start');g=act(g,'manual-fallback');g=act(g,'score',{category:'chance',value:21});
 g=undo(g);expect(g.turn).toBeNull();expect(g.activeSeat).toBe(0);g=act(g,'start');expect(g.turn.source).toBe(source);expect(g.turn.rolls).toHaveLength(0);
});
it('allows Undo before the next score even if the next player has unscored rolls; retains and excludes their observations',()=>{
 let g=createCoreGame({id:'observations',names:['A','B'],source:'simulated'});g=act(g,'start');g=act(g,'roll',{dice:[1,2,3,4,5]});g=act(g,'score',{category:'chance',value:15});
 g=act(g,'start');g=act(g,'roll',{dice:[6,6,6,2,1]});const observations=g.events.filter(e=>e.type==='roll').map(e=>e.id);
 g=undo(g);expect(g.events.filter(e=>e.type==='roll').map(e=>e.id)).toEqual(observations);expect(rollAnalytics(g,0).recordedRolls).toBe(0);expect(rollAnalytics(g,1).recordedRolls).toBe(0);expect(g.turns.every(t=>t.excluded)).toBe(true);
});
it.each(['competition','accumulative'])('reverses a completed %s bonus turn without deleting the scored Yahtzee',mode=>{
 let g=createCoreGame({id:'bonus-'+mode,names:['A'],mode});g.sheets[0]={yahtzee:50,yahtzeeBonus:100};g=act(g,'start');g=act(g,'bonus',{yahtzeeFace:2});
 expect(undoableScore(g).type).toBe('bonus');g=undo(g);expect(g.sheets[0]).toEqual({yahtzee:50,yahtzeeBonus:100});expect(g.activeSeat).toBe(0);
});
function chain(){let g=createCoreGame({id:'chain',names:['A'],mode:'competition',rulesVersion:2});g.sheets[0]=Object.fromEntries(BASE_KEYS.filter(k=>k!=='yahtzee').map(k=>[k,0]));return act(act(g,'start'),'score',{category:'yahtzee',value:50});}
it('undoes a final-category Yahtzee and clears its pending chain',()=>{let g=chain();expect(g.finalChain).toBeTruthy();g=undo(g);expect(g.finalChain).toBeNull();expect(g.sheets[0].yahtzee).toBeUndefined();expect(g.status).toBe('active');});
it('undoes a completed final-chain success and restarts the correct attempt with fresh rolls',()=>{let g=act(chain(),'start');g=act(g,'final-chain-roll',{face:6});expect(g.finalChain.attempt).toBe(2);g=undo(g);expect(g.finalChain).toEqual({seat:0,attempt:1});expect(g.sheets[0].yahtzeeBonus).toBeUndefined();expect(g.sheets[0].yahtzee).toBe(50);g=act(g,'start');expect(g.turn.manualRolls).toHaveLength(0);});
it('reopens a finished final-chain failure while retaining all three failed reports',()=>{let g=act(chain(),'start');for(let i=0;i<3;i++)g=act(g,'final-chain-roll',{face:null});expect(g.status).toBe('finished');g=undo(g);expect(g.finalChain).toEqual({seat:0,attempt:1});expect(g.status).toBe('active');expect(g.events.filter(e=>e.type==='final-chain-roll')).toHaveLength(3);expect(g.turn).toBeNull();});
