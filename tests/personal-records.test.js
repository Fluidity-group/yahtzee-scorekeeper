import {it,expect} from 'vitest';
import {recordedYahtzees} from '../src/game/personal-records.js';
import {createCoreGame,command} from '../src/game/core.js';
it.each([[50,0,0],[0,50,1]])('applies accepted manual Yahtzee correction %s to %s', (initial,value,expected)=>{
 let game=createCoreGame({id:'correction',names:['Alex'],source:'manual'});
 game=command(game,{type:'start',seat:0},{id:'start'});
 game=command(game,{type:'score',seat:0,category:'yahtzee',value:initial},{id:'score'});
 const target=game.events.find(e=>e.type==='score').id;
 game=command(game,{type:'correct-score',seat:0,target,value},{id:'correct'});
 expect(recordedYahtzees(game,0)).toBe(expected);
 game=command(game,{type:'correct-score',seat:0,target,value:initial},{id:'correct-again'});
 expect(recordedYahtzees(game,0)).toBe(initial>0?1:0);
});
const roll=(id,turnId,dice,seat=0)=>({id,turnId,dice,seat,type:'roll'});
it('counts saved Yahtzee rolls once alongside score reports and ignores another seat',()=>{
 const events=[roll('a','t',[6,6,6,6,6]),{id:'s',turnId:'t',seat:0,type:'score',category:'yahtzee',value:50},roll('b','u',[3,3,3,3,3]),roll('foreign','f',[1,1,1,1,1],1)];
 expect(recordedYahtzees({events},0)).toBe(2);
});
it('applies corrections, exclusions and undone turns before counting',()=>{
 const events=[roll('a','t',[6,6,6,6,6]),{seat:0,type:'roll-correction',target:'a',dice:[6,6,6,6,5]},roll('b','u',[2,2,2,2,2]),{seat:0,type:'roll-excluded',target:'b'},roll('c','v',[1,1,1,1,1]),{id:'s',turnId:'v',seat:0,type:'bonus',value:100},roll('d','w',[1,2,3,4,5]),{seat:0,type:'roll-correction',target:'d',dice:[4,4,4,4,4]}];
 expect(recordedYahtzees({events,turns:[{id:'v',undone:true}]},0)).toBe(1);
});
it('counts manual and final-chain reports without dividing weighted bonus points',()=>{
 const events=[{id:'s',turnId:'a',seat:0,type:'score',category:'yahtzee',value:80},{id:'b',turnId:'b',seat:0,type:'bonus',value:60},{id:'f',turnId:'c',seat:0,type:'final-chain-roll',face:6,value:50},{id:'miss',turnId:'d',seat:0,type:'final-chain-roll',face:null,value:0}];
 expect(recordedYahtzees({events},0)).toBe(3);
 expect(recordedYahtzees({events:[...events,{seat:0,type:'score-undo',target:'b'}]},0)).toBe(2);
});
it('keeps missing history unknown and a recorded zero distinct',()=>{
 expect(recordedYahtzees({events:[],sheets:[{yahtzee:50,yahtzeeBonus:200}]},0)).toBeNull();
 expect(recordedYahtzees({events:[{seat:0,id:'s',type:'score',category:'chance',value:20}]},0)).toBe(0);
});
it('preserves observed dice evidence and corrections made during an unrelated undone turn',()=>{
 const observed={events:[roll('r','t',[5,5,5,5,5]),{id:'s',seat:0,turnId:'t',type:'score',category:'yahtzee',value:50},{seat:0,type:'score-correction',target:'s',value:0}]};
 expect(recordedYahtzees(observed,0)).toBe(1);
 expect(recordedYahtzees({turns:[{id:'other',undone:true}],events:[{id:'s',seat:0,turnId:'t',type:'score',category:'yahtzee',value:0},{seat:0,turnId:'other',type:'score-correction',target:'s',value:50}]},0)).toBe(1);
});
