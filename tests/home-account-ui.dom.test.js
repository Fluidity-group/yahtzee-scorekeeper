// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {renderClubhouseHome} from '../src/ui/clubhouse-home.js';
import {renderPeopleDialog,renderTrophyDialog} from '../src/ui/home-account.js';
const preview={status:'ready',preview:true,user:{id:'sample',name:'Alex'},trophies:{total:3,points:3,wins:2,completed:4},people:[{userId:'a',name:'<img src=x onerror=alert(1)>',games:2},{userId:'b',name:'Jamie',games:1}]};
it('shows independent bests and labels missing Yahtzee evidence without substituting zero',()=>{
 document.body.innerHTML=renderTrophyDialog({...preview,personalBests:[{rulesName:'Standard',rulesVersion:1,highestScore:{value:320,date:'2026-10-23'},mostYahtzees:null}]});
 expect([...document.querySelectorAll('.personal-best-reels strong')].map(n=>n.textContent)).toEqual(['320','—']);expect(document.querySelector('.home-personal-bests').textContent).toContain('Not recorded');
 expect(document.querySelector('.home-personal-bests').textContent).toContain('Unrecorded physical rolls are unknown');
});
it('shows the personal Razzie with its rules/date and preserves zero versus missing history',()=>{
 document.body.innerHTML=renderTrophyDialog({...preview,razzies:[{score:0,rulesName:'Standard <img>',rulesVersion:1,endedAt:'2026-10-23T18:00:00Z',tiedGames:2}]});
 expect(document.querySelector('.razzie-score').textContent).toBe('0points');expect(document.querySelector('.home-razzies').textContent).toContain('2 games tied');
 expect(document.querySelector('.home-razzies').textContent).toContain('2026-10-23');expect(document.querySelector('.home-razzies').textContent).toContain('Standard <img>');expect(document.querySelector('img')).toBeNull();
 document.body.innerHTML=renderTrophyDialog(preview);expect(document.querySelector('.razzie-score')).toBeNull();expect(document.querySelector('.razzie-empty').textContent).toContain('No completed online games');
 document.body.innerHTML=renderTrophyDialog({status:'error'});expect(document.querySelector('.home-razzies')).toBeNull();
});
it('keeps all four game actions and adds accessible separate trophy/people controls without nested buttons',()=>{
 document.body.innerHTML=renderClubhouseHome({account:preview});
 expect(document.querySelectorAll('.home-game-card strong')).toHaveLength(4);
 expect(document.querySelector('button button')).toBeNull();expect(document.querySelector('[data-action="home-trophies"]').textContent).toContain('3 tournaments won');expect(document.querySelector('[data-action="home-people"]').textContent).toContain('2');expect(document.body.textContent).toContain('Sample profile');
});
it('keeps unknown wins distinct from zero and safely renders opponents and tournament breakdowns',()=>{
 document.body.innerHTML=renderClubhouseHome();expect(document.querySelector('[data-action="home-trophies"]').textContent).toContain('Sign in');
 document.body.innerHTML=renderPeopleDialog(preview);expect(document.querySelectorAll('.home-opponent-list li')).toHaveLength(2);expect(document.querySelector('img')).toBeNull();expect(document.body.textContent).toContain('2 completed games together');expect(document.body.textContent).toContain('1 completed game together');
 document.body.innerHTML=renderTrophyDialog(preview);expect([...document.querySelectorAll('dd')].map(e=>e.textContent)).toEqual(['3','2','4']);expect(document.body.textContent).toContain('counts once');
 document.body.innerHTML=renderTrophyDialog({status:'error'});expect(document.body.textContent).not.toContain('0 tournaments');expect(document.querySelector('[data-action="home-account-retry"]')).not.toBeNull();
});
