// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {readScorecardSize,saveScorecardSize,applyScorecardSize,renderScorecardDisplay} from '../src/ui/scorecard-display.js';
import {renderPhoneScorecard} from '../src/ui/phone-scorecard.js';
import {createCoreGame} from '../src/game/core.js';
it('persists only a device display preference without touching game/profile settings',()=>{
 localStorage.clear();localStorage.setItem('profile','keep');
 expect(readScorecardSize()).toBe('comfortable');
 saveScorecardSize('large');expect(readScorecardSize()).toBe('large');
 applyScorecardSize(document.body);expect(document.body.dataset.scorecardSize).toBe('large');
 expect(localStorage.getItem('profile')).toBe('keep');expect(localStorage.length).toBe(2);
 expect(()=>saveScorecardSize('tiny')).toThrow();expect(readScorecardSize()).toBe('large');
 expect(readScorecardSize({getItem(){throw Error();}})).toBe('comfortable');
 document.body.innerHTML=renderScorecardDisplay();expect(document.querySelector('input:checked').value).toBe('large');
});
it('shows progress for the correct original seats and suppresses all derived bonus facts when hidden',()=>{
 const game=createCoreGame({names:['Keith','Amber'],id:'display'});
 game.sheets[0]={aces:3,twos:6,threes:12,fours:12,fives:15};game.sheets[1]={aces:0,twos:0,threes:0,fours:0};
 document.body.innerHTML=renderPhoneScorecard(game,{viewerSeat:1});
 expect(document.querySelector('th [data-bonus-seat="1"]').textContent).toContain('Out of reach');
 expect(document.querySelector('[data-bonus-seat="0"]').textContent).toContain('15 needed');
 expect(document.querySelector('[data-bonus-seat="0"]').textContent).toContain('3 ahead');
 game.hideTotals=true;document.body.innerHTML=renderPhoneScorecard(game,{viewerSeat:1});
 expect(document.querySelector('progress')).toBeNull();expect(document.querySelector('[data-bonus-seat]')).toBeNull();
 expect(document.querySelector('.bonus-progress-row').textContent).not.toMatch(/ahead|behind|needed|possible|reach|48/);
 game.status='finished';document.body.innerHTML=renderPhoneScorecard(game,{viewerSeat:1});expect(document.querySelectorAll('.bonus-graphic svg')).toHaveLength(2);
});
