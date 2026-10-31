// @vitest-environment jsdom
import{it,expect}from'vitest';import{renderBonusGraphic,renderUpperCategoryIndicator}from'../src/ui/bonus-graphic.js';
it('draws the recorded dice counts against the three-dice guide and distinguishes open boxes from scratches',()=>{
 const sheet={aces:0,twos:4,threes:12};document.body.innerHTML=renderBonusGraphic(sheet,{name:'<Keith>'})+['aces','twos','threes','fours','fives','sixes'].map(key=>renderUpperCategoryIndicator(sheet,key,{name:'<Keith>'})).join('');
 expect(document.querySelector('keith')).toBeNull();expect(document.querySelector('button').getAttribute('aria-label')).toContain('<Keith>: 16 of 63');
 expect(document.querySelectorAll('[data-bonus-face]')).toHaveLength(6);expect(document.querySelector('[data-bonus-face="1"] .bonus-scratch')).not.toBeNull();
 expect(document.querySelectorAll('[data-bonus-face="2"] .filled')).toHaveLength(2);expect(document.querySelectorAll('[data-bonus-face="3"] .filled')).toHaveLength(4);
 expect(document.querySelector('[data-bonus-face="4"]').classList.contains('open')).toBe(true);expect(document.querySelector('.bonus-three-line')).not.toBeNull();
});
it('uses horizontal three-dice benchmarks and point-weighted surplus, with five matching dice treated specially',()=>{
 const sheet={fives:10,sixes:24};document.body.innerHTML=renderBonusGraphic(sheet)+renderUpperCategoryIndicator(sheet,'fives')+renderUpperCategoryIndicator(sheet,'sixes');
 expect(document.querySelector('[data-bonus-face="5"] .upper-pace-delta').textContent).toBe('-5');expect(document.querySelector('[data-bonus-face="6"] .upper-pace-delta').textContent).toBe('+6');expect(document.querySelector('.bonus-net-pace').textContent).toBe('+1');
 const segments=[...document.querySelector('[data-bonus-face="6"]').querySelectorAll('rect')];expect(segments.map(e=>e.getAttribute('x'))).toEqual(['1','8','15','22']);expect(segments.every(e=>e.getAttribute('y')==='2')).toBe(true);
 document.body.innerHTML=renderUpperCategoryIndicator({sixes:30},'sixes');expect(document.querySelectorAll('rect')).toHaveLength(4);expect(document.querySelector('.upper-yahtzee-star')).not.toBeNull();expect(document.querySelector('svg').getAttribute('aria-label')).toContain('Yahtzee result placed in this upper box');
});
it('communicates secured and unreachable using both state symbols and exact accessible descriptions',()=>{
 document.body.innerHTML=renderBonusGraphic({aces:3,twos:6,threes:9,fours:12,fives:15,sixes:18});expect(document.querySelector('button').classList.contains('secured')).toBe(true);expect(document.querySelector('button').getAttribute('aria-label')).toContain('Bonus secured +35');expect(document.querySelector('.bonus-state-symbol')).not.toBeNull();
 document.body.innerHTML=renderBonusGraphic({aces:0,twos:0,threes:0,fours:0},{compact:true});expect(document.querySelector('.bonus-graphic').getAttribute('aria-label')).toContain('Out of reach');expect(document.querySelectorAll('[data-bonus-face]')).toHaveLength(0);expect(document.querySelector('button')).toBeNull();
});
