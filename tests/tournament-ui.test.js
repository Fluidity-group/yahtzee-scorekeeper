// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {renderTournamentBanner,renderTournamentStandings,renderTournamentActions,renderTournamentFinish} from '../src/ui/tournament.js';
import {renderHostedResults} from '../src/ui/hosted-results.js';
import {createCoreGame} from '../src/game/core.js';
import {renderGameMenu} from '../src/ui/clubhouse-home.js';
it('puts an obvious resume action first in the clubhouse menu only when the caller permits it',()=>{
 document.body.innerHTML=renderGameMenu({hasGame:true,resumeTournament:true,resumeDisabled:true});
 expect(document.querySelector('.club-menu-grid').firstElementChild.dataset.action).toBe('tournament-resume');
 expect(document.querySelector('.tournament-resume-primary').disabled).toBe(true);
 document.body.innerHTML=renderGameMenu({hasGame:true});expect(document.querySelector('[data-action="tournament-resume"]')).toBeNull();
});
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
 expect(document.querySelector('[data-action="tournament-resume"]').disabled).toBe(true);expect(document.querySelector('.tournament-actions').firstElementChild.dataset.action).toBe('tournament-resume');expect(document.querySelector('.tournament-resume-primary')).not.toBeNull();expect(document.body.textContent).toContain('Game 2 of 3');expect(document.body.textContent).toContain('<Fun>');expect(document.querySelector('fun')).toBeNull();
 document.body.innerHTML=renderTournamentBanner(room,'b')+renderTournamentActions(room,'b');expect(document.querySelector('[data-action="tournament-resume"]')).toBeNull();expect(document.querySelector('.tournament-banner').textContent).not.toContain('Ask the host');expect(document.querySelector('.tournament-banner').textContent).not.toContain('Paused');
});
it('shows final tournament results with no rematch or next-starter promise',()=>{
 const game=createCoreGame({id:'g',names:['Dan','Amber']});game.status='finished';
 const room={game,members:[{userId:'a'},{userId:'b'}],capabilities:{rematch:true,tournaments:true},tournament:{status:'completed',gameCount:3},tournamentStandings:data};
 document.body.innerHTML=renderHostedResults({room,userId:'a'});
 expect(document.body.textContent).toContain('Tournament results');expect(document.querySelector('[data-action="rematch-ready"]')).toBeNull();expect(document.querySelector('.hosted-next-starter')).toBeNull();expect(document.querySelectorAll('.tournament-ranking')).toHaveLength(2);
 room.tournament.status='paused';document.body.innerHTML=renderHostedResults({room,userId:'a'});expect(document.querySelector('[data-action="rematch-ready"]').disabled).toBe(true);expect(document.body.textContent).toContain('Tournament paused');
});
it('announces the final game during play and before next-game readiness',()=>{
 const room={game:createCoreGame({id:'last',names:['Dan','Amber']}),gameSequence:3,tournament:{name:'Cup',gameCount:3,playerCount:2,status:'playing'}};
 document.body.innerHTML=renderTournamentBanner(room,'a');expect(document.querySelector('[role="status"]').textContent).toContain('Final game');
 room.gameSequence=2;room.game.status='finished';document.body.innerHTML=renderHostedResults({room});expect(document.body.textContent).toContain('Next: game 3 of 3 · Final game!');
 room.gameSequence=1;document.body.innerHTML=renderTournamentBanner(room,'a');expect(document.body.textContent).not.toContain('Final game');
});
it('puts persistent tournament awards before the last game result and explains each winner',()=>{
 const game=createCoreGame({id:'final',names:['Dan','Amber']});game.status='finished';
 const room={game,tournament:{name:'<Cup>',gameCount:3,status:'completed'},tournamentStandings:data};
 document.body.innerHTML=renderHostedResults({room});expect(document.body.firstElementChild.className).toBe('tournament-finale');
 const card=document.querySelector('.tournament-finale');expect(card.textContent).toContain('Tournament complete!');expect(card.textContent).toContain('3 games saved');expect(card.textContent).toContain('Dan wins with 800 points · 100 points ahead.');expect(card.textContent).toContain('Amber wins with 2 wins · 1 win ahead.');expect(card.querySelector('cup')).toBeNull();
 document.body.innerHTML=renderHostedResults({room});expect(document.querySelectorAll('.tournament-finale')).toHaveLength(1);
});
it('announces shared tournament winners and waits for complete standings',()=>{
 const room={tournament:{name:'Cup',gameCount:3,status:'completed'},tournamentStandings:{...data,standings:data.standings.map(row=>({...row,points:800,wins:2}))}};
 document.body.innerHTML=renderTournamentFinish(room);expect(document.body.textContent).toContain('Dan & Amber tie with 800 points');expect(document.querySelectorAll('article')).toHaveLength(2);expect(document.body.textContent).not.toContain('ahead');
 room.tournamentStandings={...data,completedGames:2};document.body.innerHTML=renderTournamentFinish(room);expect(document.querySelector('[role="status"]').textContent).toContain('Checking');expect(document.querySelector('article')).toBeNull();
 room.tournament.status='playing';expect(renderTournamentFinish(room)).toBe('');
});
