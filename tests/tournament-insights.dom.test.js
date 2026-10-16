// @vitest-environment jsdom
import {it,expect}from'vitest';
import {renderTournamentInsights,bindTournamentInsights}from'../src/ui/tournament-insights.js';
import {createCoreGame}from'../src/game/core.js';import{BASE_KEYS}from'../src/game/categories.js';
const game=(id,sequence)=>{const g=createCoreGame({id,names:['<Keith>','Amber']});g.sequence=sequence;g.status='finished';g.sheets=g.players.map(()=>Object.fromEntries(BASE_KEYS.map(k=>[k,0])));g.sheets[0].chance=20;g.sheets[1].chance=30;g.events=[{id:'a',type:'score',seat:0,category:'chance',value:20},{id:'b',type:'score',seat:1,category:'chance',value:30}];return g;};
it('escapes labels, presents exact tables and switches the selected recorded-game replay',()=>{
 const a=game('a',1),b=game('b',2);a.players.forEach((p,i)=>{p.id='seat'+i;});b.players.forEach((p,i)=>{p.id='seat'+i;});
 b.sheets[0].chance=15;b.events.push({id:'correct-a',type:'score-correction',seat:0,target:'a',category:'chance',value:15});
 document.body.innerHTML=renderTournamentInsights([b,a],{title:'<Cup>',ceiling:12});const cleanup=bindTournamentInsights(document.body,[b,a]);
 expect(document.querySelector('cup')).toBeNull();expect(document.querySelector('keith')).toBeNull();expect(document.body.textContent).toContain('<Keith>');
 expect(document.querySelectorAll('svg')).toHaveLength(2);expect(document.querySelector('[data-insight-detail]').textContent).toContain('Game 2');
 expect(document.querySelector('[data-insight-detail]').textContent).toContain('Correction · Chance');
 document.querySelector('[data-insight-game="0"]').click();expect(document.querySelector('[data-insight-detail]').textContent).toContain('Game 1');
 expect(document.querySelector('[data-insight-game="0"]').getAttribute('aria-pressed')).toBe('true');expect(document.body.textContent).toContain('Time unavailable');
 expect(document.querySelectorAll('table').length).toBeGreaterThan(1);cleanup();
});
it('does not expose an unfinished hidden game in completed-game analytics',()=>{const g=game('hidden',1);g.status='active';g.hideTotals=true;document.body.innerHTML=renderTournamentInsights([g]);expect(document.querySelector('svg')).toBeNull();expect(document.querySelector('[data-insight-game]')).toBeNull();expect(document.body.textContent).toContain('Finish a game');});
