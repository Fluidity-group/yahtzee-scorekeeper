// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {renderTournamentBanner,renderTournamentStandings,renderTournamentActions} from '../src/ui/tournament.js';
import {renderHostedResults} from '../src/ui/hosted-results.js';
import {createCoreGame} from '../src/game/core.js';
const data={completedGames:3,final:true,standings:[{userId:'a',name:'Dan',points:800,wins:1,games:3},{userId:'b',name:'Amber',points:700,wins:2,games:3}]};
it('shows independent points and wins champions without publishing account identities',()=>{
 document.body.innerHTML=renderTournamentStandings(data,{final:true});
 const points=document.querySelector('[aria-label="Total points"]'),wins=document.querySelector('[aria-label="Games won"]');
 expect(points.firstElementChild.textContent).toContain('DanWinner800');expect(wins.firstElementChild.textContent).toContain('AmberWinner2');
 expect(document.body.textContent).not.toContain('userId');expect(document.querySelectorAll('small').length).toBeGreaterThan(0);
});
it('marks all tied leaders and does not award a leader before any completed games',()=>{
 document.body.innerHTML=renderTournamentStandings({...data,completedGames:0,standings:data.standings.map(p=>({...p,points:0,wins:0,games:0}))});
 expect(document.body.textContent).not.toContain('Leader');
 document.body.innerHTML=renderTournamentStandings({...data,standings:data.standings.map(p=>({...p,points:800}))},{final:true});
 expect(document.querySelector('[aria-label="Total points"]').querySelectorAll('span small')).toHaveLength(2);
});
it('renders pause controls only for the host, and disables them while reconnecting',()=>{
 const room={hostId:'a',gameSequence:2,capabilities:{tournaments:true},tournament:{name:'<Fun>',gameCount:3,playerCount:2,status:'paused'}};
 document.body.innerHTML=renderTournamentBanner(room,'a',{connected:false})+renderTournamentActions(room,'a',{connected:false});
 expect(document.querySelector('[data-action="tournament-resume"]').disabled).toBe(true);expect(document.body.textContent).toContain('Game 2 of 3');expect(document.body.textContent).toContain('<Fun>');expect(document.querySelector('fun')).toBeNull();
 document.body.innerHTML=renderTournamentBanner(room,'b')+renderTournamentActions(room,'b');expect(document.querySelector('[data-action="tournament-resume"]')).toBeNull();expect(document.body.textContent).toContain('progress is saved');
});
it('shows final tournament results with no rematch or next-starter promise',()=>{
 const game=createCoreGame({id:'g',names:['Dan','Amber']});game.status='finished';
 const room={game,members:[{userId:'a'},{userId:'b'}],capabilities:{rematch:true,tournaments:true},tournament:{status:'completed'},tournamentStandings:data};
 document.body.innerHTML=renderHostedResults({room,userId:'a'});
 expect(document.body.textContent).toContain('Tournament results');expect(document.querySelector('[data-action="rematch-ready"]')).toBeNull();expect(document.querySelector('.hosted-next-starter')).toBeNull();expect(document.querySelectorAll('.tournament-ranking')).toHaveLength(2);
 room.tournament.status='paused';document.body.innerHTML=renderHostedResults({room,userId:'a'});expect(document.querySelector('[data-action="rematch-ready"]').disabled).toBe(true);expect(document.body.textContent).toContain('Tournament paused');
});
