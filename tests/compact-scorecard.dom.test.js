// @vitest-environment jsdom
import{it,expect}from'vitest';
import{createCoreGame}from'../src/game/core.js';
import{renderPhoneScorecard}from'../src/ui/phone-scorecard.js';
it('shows one upper total including its bonus, with distinct semantic sections and no duplicate grand total',()=>{
 const g=createCoreGame({id:'compact',names:['A','B']});g.sheets[0]={aces:3,twos:6,threes:9,fours:12,fives:15,sixes:18};
 document.body.innerHTML=renderPhoneScorecard(g,{viewerSeat:0});
 expect(document.querySelector('.upper-section').getAttribute('aria-label')).toBe('Upper section');
 expect(document.querySelector('.lower-section').getAttribute('aria-label')).toBe('Lower section');
 expect(document.querySelector('.score-section')).toBeNull();
 expect(document.querySelector('[data-bonus-seat="0"] strong').textContent).toBe('98');
 expect(document.querySelector('[data-bonus-seat="0"] .upper-bonus-ribbon').textContent).toContain('+35');
 expect(document.querySelector('.grand-total-row')).toBeNull();
 expect(document.querySelector('[data-bonus-seat="0"] button').getAttribute('aria-label')).toContain('includes 35');
 const row=document.querySelector('.bonus-progress-row');
 expect(row.querySelector('th').colSpan).toBe(1);
 expect(row.querySelector('td [data-bonus-seat="0"]')).not.toBeNull();
});
it('does not expose progress or upper totals when active totals are hidden',()=>{
 const g=createCoreGame({id:'compact-hidden',names:['A','B'],hideTotals:true});
 document.body.innerHTML=renderPhoneScorecard(g,{viewerSeat:0});
 expect(document.querySelector('.upper-total-guide')).toBeNull();expect(document.querySelectorAll('tbody .bonus-hidden')).toHaveLength(2);
});
