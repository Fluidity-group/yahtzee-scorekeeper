// @vitest-environment jsdom
import { beforeAll, describe, it, expect, vi } from 'vitest';

vi.mock('../src/core-store.js', () => ({
 saveCore: vi.fn(async () => undefined), loadCore: vi.fn(async () => null), listCore: vi.fn(async () => []),
}));
const click = selector => { if(!document.querySelector(selector))document.querySelector('[data-action=game-menu]')?.click(); const element=document.querySelector(selector); expect(element).not.toBeNull(); element.click(); };
const action = name => click(`[data-action="${name}"]`);
const waitFor = test => vi.waitFor(test);
beforeAll(async () => {
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 HTMLDialogElement.prototype.close=function(){this.open=false;};
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();
 await waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});

async function newGame(mode,hideTotals=false) {
 action('new'); document.querySelector('[name="mode"]').value=mode;
 document.querySelector('[name="hideTotals"]').checked=hideTotals;
 const count=document.querySelector('#playerCount');count.value='1';count.dispatchEvent(new Event('change',{bubbles:true}));
 document.querySelector('#createCore').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());
}
const bonusRow=()=>[...document.querySelectorAll('tr')].find(r=>r.textContent.includes('Yahtzee bonuses'));
async function firstYahtzee(weighted=false,value=50) {
 click('[data-action="choose"][data-key="yahtzee"]');
 click(weighted?'[data-action="confirm-score"][data-face="1"]':`[data-action="confirm-score"][data-value="${value}"]`);
 await waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="yahtzee"]')).not.toBeNull());
}
describe('additional Yahtzee scorecard entry',()=>{
 it('offers counts one to five followed by X, recording the count or zero',async()=>{
  await newGame('standard');
  click('[data-action="choose"][data-key="twos"]');
  expect([...document.querySelectorAll('.countbtn .n')].map(e=>e.textContent)).toEqual(['1','2','3','4','5','X']);
  click('[data-action="confirm-score"][data-value="8"]');
  await waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="twos"]').textContent).toBe('8'));
  click('[data-action="choose"][data-key="threes"]');
  click('[data-action="confirm-score"][data-value="0"]');
  await waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="threes"]').textContent).toBe('×'));
 });
 it('keeps totals hidden through scoring and reveals them at game completion',async()=>{
  await newGame('standard',true);
  expect(document.querySelector('.player-heading strong')).toBeNull();
  click('[data-action="choose"][data-key="twos"]');
  click('[data-action="confirm-score"][data-value="8"]');
  await waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="twos"]')).not.toBeNull());
  expect(document.querySelector('.hidden-total')).not.toBeNull();
  for(const key of ['aces','threes','fours','fives','sixes','threeKind','fourKind','fullHouse','smallStraight','largeStraight','yahtzee','chance']){
   click(`[data-action="choose"][data-key="${key}"]`);
   click('[data-action="confirm-score"][data-value="0"]');
   await waitFor(()=>expect(document.querySelector(`[data-action="edit"][data-key="${key}"]`)).not.toBeNull());
  }
  expect(document.querySelector('.hidden-total')).toBeNull();
  expect(document.querySelector('.player-heading strong').textContent).toBe('8');
  expect(document.querySelector('.compact-result').textContent).toContain('Game complete');
 });
 it('records second and third bonuses in Competition without replacing the first score',async()=>{
  await newGame('competition');await firstYahtzee();
  for(const expected of [100,200]){
   action('another-yahtzee');click('[data-action="repeat-face"][data-face="2"]');action('confirm-another');
   await waitFor(()=>expect(bonusRow().querySelector('.bonus-total').textContent).toBe(String(expected)));
  }
  expect(document.querySelector('[data-action="edit"][data-key="yahtzee"]').textContent).toBe('50');
  expect(document.querySelector('[data-action="choose"][data-key="chance"]').disabled).toBe(false);
 });
 it('uses the rolled face for an Accumulative bonus',async()=>{
  await newGame('accumulative');await firstYahtzee(true);
  action('another-yahtzee');click('[data-action="repeat-face"][data-face="2"]');
  expect(document.querySelector('[data-action="confirm-another"]').textContent).toContain('90');
  action('confirm-another');
  await waitFor(()=>expect(bonusRow().querySelector('.bonus-total').textContent).toBe('90'));
  expect(document.querySelector('[data-action="edit"][data-key="yahtzee"]').textContent).toBe('100');
 });
 it('records Standard bonus together with its required category',async()=>{
  await newGame('standard');await firstYahtzee();
  action('another-yahtzee');click('[data-action="repeat-face"][data-face="2"]');
  expect(document.querySelector('#coreDialog h2').textContent).toBe('Twos');
  expect(bonusRow().querySelector('.bonus-total')).toBeNull();
  click('[data-action="confirm-score"][data-value="10"]');
  await waitFor(()=>expect(bonusRow().querySelector('.bonus-total').textContent).toBe('100'));
  expect(document.querySelector('[data-action="edit"][data-key="twos"]').textContent).toBe('10');
 });
 it('cancels a pending bonus without locking normal score entry',async()=>{
  await newGame('competition');await firstYahtzee();
  action('another-yahtzee');click('[data-action="repeat-face"][data-face="1"]');action('close');
  expect(bonusRow().querySelector('.bonus-total')).toBeNull();
  expect(document.querySelector('[data-action="choose"][data-key="chance"]').disabled).toBe(false);
 });
 it('uses Joker placement but gives no bonus after scratching the first Yahtzee',async()=>{
  await newGame('standard');await firstYahtzee(false,0);
  action('another-yahtzee');click('[data-action="repeat-face"][data-face="3"]');
  click('[data-action="confirm-score"][data-value="15"]');
  await waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="threes"]')).not.toBeNull());
  expect(bonusRow().querySelector('.bonus-total')).toBeNull();
 });
});


