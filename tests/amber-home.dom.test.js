// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {renderYahtzHome} from '../src/ui/yahtz-home.js';
import {latestTableYahtzee,selectHomeTables} from '../src/ui/home-table.js';
const players=[{id:'a',name:'Alpha'},{id:'b',name:'Beta <test>'}];
const score=(id,seat,extra={})=>({id,turnId:id,seat,type:'score',category:'yahtzee',value:50,...extra});
it('features the last accepted Yahtzee and falls back after Undo and zero corrections',()=>{
 const game={players,events:[score('first',0),score('last',1)],turns:[]};
 expect(latestTableYahtzee(game).id).toBe('b');
 game.events.push({type:'score-correction',target:'last',value:0});
 expect(latestTableYahtzee(game).id).toBe('a');
 game.events.push({type:'score-correction',target:'first',value:50});
 expect(latestTableYahtzee(game).id).toBe('a');
 game.events.push({type:'score-undo',target:'first'});
 expect(latestTableYahtzee(game)).toBeNull();
});
it('counts accepted bonus and final-chain Yahtzees but excludes undone turns and arbitrary manual scores',()=>{
 const game={players,events:[score('first',0),score('chance',1,{category:'chance',value:30}),{id:'bonus',type:'bonus',turnId:'bonus',seat:1,value:100}],turns:[]};
 expect(latestTableYahtzee(game).id).toBe('b');
 game.turns.push({id:'bonus',undone:true});expect(latestTableYahtzee(game).id).toBe('a');
 game.events.push({id:'chain',type:'final-chain-roll',seat:1,face:6,value:100});expect(latestTableYahtzee(game).id).toBe('b');
});
it('keeps corrections in original accepted scoring order',()=>{
 expect(latestTableYahtzee({players,events:[score('old',0,{value:0}),score('new',1),{type:'score-correction',target:'old',value:50}]}).id).toBe('b');
});
it('selects only the account’s tables and retains a preferred unfinished tournament',()=>{
 const entry=(id,updatedAt,status='playing',userId='a')=>({room:{id,updatedAt,members:[{userId}],tournament:{status}}});
 const entries=[entry('old','2026-01-01'),entry('new','2026-02-01'),entry('foreign','2026-03-01','playing','b')];
 expect(selectHomeTables('a',entries,'old').currentTournament.id).toBe('old');
 expect(selectHomeTables('a',entries,'foreign').currentTable.id).toBe('new');
 expect(selectHomeTables('outsider',entries).currentTournament).toBeNull();
 entries[1].room.tournament.status='completed';expect(selectHomeTables('a',entries).currentTournament.id).toBe('old');
});
it('renders direct choices, venue selection and an escaped champion without changing the profile owner',()=>{
 document.body.innerHTML=renderYahtzHome({savedGame:{players,events:[score('last',1)]}});
 expect(document.body.textContent).not.toContain('FOUR WAYS TO PLAY');
 for(const kind of ['solo','local','online','tournament'])expect(document.querySelector(`[data-action=home-${kind}] svg rect`)).not.toBeNull();
 expect(document.querySelector('.home-venue-select').dataset.action).toBe('midnight-locations');
 expect(document.querySelector('.home-featured-player').textContent).toContain('Beta <test>');
 expect(document.querySelector('.home-featured-player test')).toBeNull();
 expect(document.querySelector('.ribbon-player-name').textContent).toBe('Your player');
 expect(document.querySelector('[data-action=home-current-tournament]')).toBeNull();
});
it('shows a table-return shortcut for the authenticated current tournament, preserving paused indication',()=>{
 document.body.innerHTML=renderYahtzHome({account:{status:'ready',user:{name:'Alpha'},people:[],trophies:{total:0},currentTournament:{code:'SYNTHETIC',tournament:{name:'Test Cup',status:'paused'}}}});
 const button=document.querySelector('[data-action=home-current-tournament]');
 expect(button.textContent).toContain('Test Cup · Paused');
 expect(button.dataset.action).not.toBe('tournament-resume');
 document.body.innerHTML=renderYahtzHome({account:{status:'signed-out',currentTournament:{tournament:{name:'Old account'}}}});
 expect(document.querySelector('[data-action=home-current-tournament]')).toBeNull();
});
