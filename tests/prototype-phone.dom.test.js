// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
const stored=vi.hoisted(()=>({games:[]}));
vi.mock('../src/core-store.js',()=>({
 loadCore:vi.fn(async()=>null),
 saveCore:vi.fn(async game=>{stored.games=[game];}),
 listCore:vi.fn(async()=>stored.games),
}));
const click=selector=>{if(!document.querySelector(selector))document.querySelector('[data-action=game-menu]')?.click();const element=document.querySelector(selector);expect(element).not.toBeNull();element.click();};
const action=name=>{if(!document.querySelector('[data-action="'+name+'"]'))document.querySelector('[data-action=game-menu]')?.click();click('[data-action="'+name+'"]');};
beforeAll(async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 HTMLDialogElement.prototype.close=function(){this.open=false;};
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});
async function newTable(hidden=false){
 action('new');const count=document.querySelector('#playerCount');count.value='4';count.dispatchEvent(new Event('change',{bubbles:true}));
 document.querySelector('[name="hideTotals"]').checked=hidden;
 [...document.querySelectorAll('[name="player"]')].forEach((input,i)=>{input.value=['Ann','Bo','Cy','Dee'][i];});
 document.querySelector('#createCore').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(document.querySelector('.phone-own-heading .player-name')?.textContent).toBe('Ann'));
}
describe('production phone scorecard integration',()=>{
 it('changes and retains device text size without changing the current game',async()=>{
  await newTable();const before=JSON.stringify(stored.games);
  action('scorecard-display');const radio=document.querySelector('input[value="large"][name="scorecard-size"]');
  radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));
  expect(document.querySelector('#coreApp').dataset.scorecardSize).toBe('large');
  action('close');action('scorecard-display');
  expect(document.querySelector('input[name="scorecard-size"]:checked').value).toBe('large');
  expect(JSON.stringify(stored.games)).toBe(before);action('close');
 });
 it('opens the existing modal and keeps original named peer seat when local turns advance',async()=>{
  await newTable();click('[data-action="choose"][data-key="aces"]');
  expect(document.querySelector('#coreDialog').open).toBe(true);
  expect(document.querySelector('#coreDialog h2').textContent).toBe('Aces');
  expect(document.querySelector('#coreDialog [data-action="confirm-score"][data-value="3"]')).not.toBeNull();
  click('#coreDialog [data-action="confirm-score"][data-value="3"]');
  await vi.waitFor(()=>expect(document.querySelector('.phone-own-heading .player-name')?.textContent).toBe('Bo'));
  expect(document.querySelector('.phone-own-heading').dataset.playerSeat).toBe('1');
  const peer=document.querySelector('[data-score-key="aces"][data-score-seat="0"]');
  expect(peer.textContent).toBe('3');expect(peer.querySelector('button')).toBeNull();
  expect(document.querySelector('.phone-peer-headings [data-player-seat="0"] .player-name').textContent).toBe('Ann');
  expect(document.querySelector('#coreDialog').open).toBe(false);
 });
 it('does not disclose current hidden-game totals through the History menu',async()=>{
  await newTable(true);click('[data-action="choose"][data-key="aces"]');click('#coreDialog [data-action="confirm-score"][data-value="3"]');
  await vi.waitFor(()=>expect(document.querySelector('.phone-own-heading .player-name')?.textContent).toBe('Bo'));
  expect(document.querySelectorAll('.phone-scorecard thead strong')).toHaveLength(0);
  action('history');await vi.waitFor(()=>expect(document.querySelector('#coreDialog .history-row')).not.toBeNull());
  expect(document.querySelector('#coreDialog .history-row small').textContent).toContain('Totals hidden');
  expect(document.querySelector('#coreDialog .history-row small').textContent).not.toContain('3 / 0 / 0 / 0');
  action('close');
  stored.games=[{...stored.games[0],status:'paused'}];
  action('history');await vi.waitFor(()=>expect(document.querySelector('#coreDialog .history-row')).not.toBeNull());
  expect(document.querySelector('#coreDialog .history-row small').textContent).toContain('Totals hidden');
  action('close');
  stored.games=[{...stored.games[0],status:'finished'}];
  action('history');await vi.waitFor(()=>expect(document.querySelector('#coreDialog .history-row')).not.toBeNull());
  expect(document.querySelector('#coreDialog .history-row small').textContent).toContain('3 / 0 / 0 / 0');
  action('close');
 });
});


