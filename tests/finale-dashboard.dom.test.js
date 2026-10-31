// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {renderTournamentFinale,finalStandingsReady,captureFinaleState,restoreFinaleState} from '../src/ui/finale-dashboard.js';
const fixture=()=>({game:{id:'final'},tournament:{name:'<Cup>',status:'completed',gameCount:3,playerCount:2},members:[{userId:'b'},{userId:'a'}],tournamentStandings:{final:true,completedGames:3,standings:[{userId:'a',name:'Alex',points:800,wins:1,games:3},{userId:'b',name:'Jamie',points:700,wins:2,games:3}]}});
it('shows independent honours and seat-order comparison, with detail collapsed and the actual card retained',()=>{
 document.body.innerHTML=renderTournamentFinale({room:fixture(),finalGameMarkup:'<h2>Final game fact</h2>',scorecardMarkup:'<table id="actual-card"></table>'});
 const honours=[...document.querySelectorAll('.finale-honour')];expect(honours).toHaveLength(2);expect(honours[0].textContent).toContain('Alex');expect(honours[1].textContent).toContain('Jamie');
 expect(document.querySelector('.finale-ledger tbody tr').textContent).toContain('Jamie');expect(document.querySelectorAll('details')).toHaveLength(3);expect(document.querySelectorAll('details[open]')).toHaveLength(0);
 expect(document.querySelector('#actual-card').closest('details').dataset.finaleDetail).toBe('game');expect(document.querySelector('cup')).toBeNull();expect(document.querySelector('[data-action="rematch-ready"]')).toBeNull();
});
it('waits for complete valid history and roster instead of crowning partial or duplicate accounts',()=>{
 for(const mutate of [r=>r.tournamentStandings.final=false,r=>r.tournamentStandings.completedGames=2,r=>r.tournamentStandings.standings.pop(),r=>r.tournamentStandings.standings[1].userId='a',r=>r.tournamentStandings.standings[1].points=NaN,r=>r.tournamentStandings.standings[1].games=2,r=>r.members[0].userId='outside']){
  const room=fixture();mutate(room);expect(finalStandingsReady(room)).toBe(false);document.body.innerHTML=renderTournamentFinale({room});expect(document.querySelector('.finale-honour')).toBeNull();expect(document.querySelector('[role="status"]').textContent).toContain('Checking');expect(document.querySelector('.tournament-ranking')).toBeNull();
 }
});
it('keeps every shared winner visible and independent when both honours tie',()=>{
 const room=fixture();room.tournamentStandings.standings.forEach(row=>{row.points=800;row.wins=2;});document.body.innerHTML=renderTournamentFinale({room});
 for(const card of document.querySelectorAll('.finale-honour')){expect(card.querySelectorAll('figure')).toHaveLength(2);expect(card.textContent).toContain('Shared winners');expect(card.textContent).not.toContain('ahead');}
});
it('compacts larger rosters behind comparison while preserving all eight scores',()=>{
 const room=fixture();room.members=Array.from({length:8},(_,i)=>({userId:'p'+i}));room.tournament.playerCount=8;room.tournamentStandings.standings=room.members.map((p,i)=>({...p,name:'Player '+i,points:200+i,wins:i%3,games:3}));
 document.body.innerHTML=renderTournamentFinale({room});expect(document.querySelector('.finale-ledger').closest('details').open).toBe(false);expect(document.querySelectorAll('.finale-ledger tbody tr')).toHaveLength(8);
});
it('retains expansion and focused summary on same-game polling without carrying them into a different game',()=>{
 const root=document.body,room=fixture();root.innerHTML=renderTournamentFinale({room});const details=root.querySelector('[data-finale-detail="game"]');details.open=true;details.querySelector('summary').focus();const state=captureFinaleState(root);
 root.innerHTML=renderTournamentFinale({room});restoreFinaleState(root,state);expect(root.querySelector('[data-finale-detail="game"]').open).toBe(true);expect(document.activeElement.textContent).toContain('Final game');
 room.game.id='different';root.innerHTML=renderTournamentFinale({room});restoreFinaleState(root,state);expect(root.querySelector('details').open).toBe(false);
});
it('restores the exact score control and inner card scroll rather than the first edit button',()=>{
 const root=document.body,room=fixture(),scorecardMarkup='<div class="score-table-wrap"><button data-action="edit" data-key="aces" data-seat="0">Aces</button><button data-action="edit" data-key="chance" data-seat="1">Chance</button></div>';
 root.innerHTML=renderTournamentFinale({room,scorecardMarkup});root.querySelector('[data-finale-detail="game"]').open=true;root.querySelector('[data-key="chance"]').focus();root.querySelector('.score-table-wrap').scrollTop=156;const state=captureFinaleState(root);
 root.innerHTML=renderTournamentFinale({room,scorecardMarkup});restoreFinaleState(root,state);expect(document.activeElement.dataset).toMatchObject({action:'edit',key:'chance',seat:'1'});expect(root.querySelector('.score-table-wrap').scrollTop).toBe(156);
});
