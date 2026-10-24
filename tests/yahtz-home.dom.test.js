// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {renderClubhouseHome} from '../src/ui/clubhouse-home.js';
import {renderPlayerProfile} from '../src/ui/home-account.js';
const account={status:'ready',preview:true,user:{name:'Alex'},gamesPlayed:6,trophies:{total:3,points:3,wins:3,completed:3},people:[{userId:'p',name:'Jamie',games:2}]};
it('renders one YAHTZ title and exact slogan without old branding or duplicate navigation blocks',()=>{
 document.body.innerHTML=renderClubhouseHome({account,savedGame:{players:[{name:'Tester <script>'}]},theme:'dark'});
 expect([...document.querySelectorAll('h1')].map(n=>n.textContent)).toEqual(['YAHTZ']);
 expect(document.querySelector('.yahtz-slogan').textContent).toBe("this one cool game that local game-makers don't want you to know about!!!!");
 expect(document.querySelector('.midnight-cover-label p').textContent).toBe('Dan and Amber Present...');
 for(const old of ['DICE','CLUBHOUSE','Good games.','Great rivalry.','MADE FOR A LITTLE RIVALRY','Your people. Your next great game.'])expect(document.querySelector('.yahtz-home').textContent).not.toContain(old);
 expect(document.querySelector('.home-ribbon')).toBe(document.querySelector('main').firstElementChild);
 expect(document.querySelector('[data-action="theme"]').getAttribute('aria-label')).toBe('Switch to light mode');
 expect(document.querySelector('.home-resume strong').textContent).toContain('Tester <script>');expect(document.querySelector('script')).toBeNull();
 expect(document.querySelectorAll('.home-slot-machine .home-game-card')).toHaveLength(4);expect(document.querySelector('button button')).toBeNull();
 for(const action of ['home-solo','home-local','home-online','home-tournament','home-profile','midnight-locations','midnight-settings','resume-game','home-trophies','home-people','saved-sessions','global-commentary'])expect(document.querySelector(`[data-action="${action}"]`),action).not.toBeNull();
});
it('shows real unique-game statistics or an honest signed-out state and preserves the persona entry',()=>{
 document.body.innerHTML=renderPlayerProfile(account);expect([...document.querySelectorAll('dd')].map(n=>n.textContent)).toEqual(['6','3','1']);expect(document.querySelector('[data-action="midnight-avatar"]')).not.toBeNull();expect(document.body.textContent).toContain('fictional');
 document.body.innerHTML=renderPlayerProfile({status:'signed-out'});expect(document.querySelector('dd')).toBeNull();expect(document.body.textContent).toContain('Sign in');
});
