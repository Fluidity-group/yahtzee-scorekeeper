// @vitest-environment jsdom
import{it,expect}from'vitest';
import{upperProgress}from'../src/game/upper-progress.js';
import{renderHeaderBonusGraphic}from'../src/ui/bonus-graphic.js';
import{renderPhoneScorecard}from'../src/ui/phone-scorecard.js';
import{renderGameMenu}from'../src/ui/clubhouse-home.js';
import{createCoreGame,command}from'../src/game/core.js';
import{pulseAccepted,cancelPulse}from'../src/ui/pulse.js';
it('distinguishes the four-dice ceiling from the legal five-dice ceiling with open frames',()=>{
 const sheet={aces:3,twos:6,threes:12,fours:12,fives:0};
 expect(upperProgress(sheet)).toMatchObject({remaining:1,fourDiceMaximum:57,fourDiceReachable:false,fourDiceState:'needs-five',maximum:63,state:'possible'});
 document.body.innerHTML=renderHeaderBonusGraphic(sheet,{name:'A'});
 expect(document.querySelector('.header-bonus-status').textContent).toBe('4-dice out');
 expect(document.querySelector('.header-bonus-graphic').getAttribute('aria-label')).toContain('legal five-dice ceiling 63');
 expect(document.querySelectorAll('.header-open-tile.still-open')).toHaveLength(1);
});
it('keeps exactly63 reachable at four dice and recalculates after corrections and reopening',()=>{
 const sheet={aces:3,twos:6,threes:12,fours:8,fives:10};
 expect(upperProgress(sheet)).toMatchObject({fourDiceMaximum:63,fourDiceReachable:true,fourDiceState:'reachable'});
 sheet.fives=5;expect(upperProgress(sheet).fourDiceState).toBe('needs-five');
 delete sheet.fives;expect(upperProgress(sheet).fourDiceState).toBe('reachable');
});
it('shows signed compensation, secured status and true impossibility separately',()=>{
 document.body.innerHTML=renderHeaderBonusGraphic({fives:10,sixes:24});expect(document.querySelector('.header-bonus-pace').textContent).toBe('+1');
 document.body.innerHTML=renderHeaderBonusGraphic({aces:0,twos:0,threes:0,fours:0});expect(document.querySelector('.header-bonus-status').textContent).toBe('Bonus out');
 document.body.innerHTML=renderHeaderBonusGraphic({aces:4,twos:8,threes:12,fours:16,fives:25});expect(document.querySelector('.header-bonus-status').textContent).toBe('Secured');expect(document.querySelectorAll('.still-open')).toHaveLength(1);
});
it('uses the category header for the featured player, hides derived data and keeps sizing in the menu',()=>{
 const g=createCoreGame({id:'header',names:['A','B']});g.sheets[1].sixes=24;
 document.body.innerHTML=renderPhoneScorecard(g,{viewerSeat:1});
 expect(document.querySelector('thead th:first-child .header-bonus-graphic').getAttribute('aria-label')).toContain('B: 39 points');
 expect(document.querySelector('thead [data-action="scorecard-display"]')).toBeNull();
 expect(document.querySelector('thead th:first-child').textContent).not.toContain('Scores');
 document.body.innerHTML=renderGameMenu({hasGame:true});expect(document.querySelector('[data-action="scorecard-display"]')).not.toBeNull();
 g.hideTotals=true;document.body.innerHTML=renderPhoneScorecard(g,{viewerSeat:1});expect(document.querySelector('.header-bonus-graphic')).toBeNull();expect(document.querySelector('.header-bonus-dashboard')).toBeNull();
});
it('animates the accepted bonus on both header and award row, cancels cleanly and does not replay a reconnect',()=>{
 let before=createCoreGame({id:'bonus-motion',names:['A']});before.sheets[0]={aces:3,twos:6,threes:9,fours:12,fives:15};
 before=command(before,{type:'start',seat:0},{id:'motion-start'});
 const next=command(before,{type:'score',seat:0,category:'sixes',value:18},{id:'motion-score'});
 document.body.innerHTML=renderPhoneScorecard(next,{viewerSeat:0});pulseAccepted(document.body,before,next);
 expect(document.querySelector('.header-bonus-dashboard').classList.contains('header-bonus-updated')).toBe(true);
 expect(document.querySelectorAll('.playform-bonus-awarded')).toHaveLength(2);
 cancelPulse(document.body);expect(document.querySelector('.playform-bonus-awarded')).toBeNull();
 pulseAccepted(document.body,before,next);expect(document.querySelector('.header-bonus-updated')).toBeNull();
 document.body.innerHTML=renderPhoneScorecard(next,{viewerSeat:0});pulseAccepted(document.body,null,next,{reduced:true});expect(document.querySelector('.playform-bonus-awarded')).toBeNull();
});
