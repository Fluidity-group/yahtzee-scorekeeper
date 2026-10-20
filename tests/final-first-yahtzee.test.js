import {it,expect} from 'vitest';
import {createCoreGame,command} from '../src/game/core.js';
import {BASE_KEYS} from '../src/game/categories.js';
it.each([1,2])('first final-category Yahtzee opens a bonus attempt with %s players',count=>{
 let game=createCoreGame({id:'first-final',names:['Keith','Amber'].slice(0,count),mode:'competition',rulesVersion:2});
 game.sheets[0]=Object.fromEntries(BASE_KEYS.filter(key=>key!=='yahtzee').map(key=>[key,0]));
 game=command(game,{type:'start',seat:0},{id:'start'});
 game=command(game,{type:'score',seat:0,category:'yahtzee',value:50},{id:'score'});
 expect(game.sheets[0].yahtzee).toBe(50);
 expect(game.finalChain).toEqual({seat:0,attempt:1});
 expect(game.events.some(event=>event.type==='final-chain-start')).toBe(true);
 expect(game.sheets[0].yahtzeeBonus||0).toBe(0);
 expect(game.status).toBe('active');expect(game.activeSeat).toBe(0);
});
