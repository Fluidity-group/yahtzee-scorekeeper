// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderPhoneScorecard, bindPhoneScorecard } from '../src/ui/phone-scorecard.js';
import { createCoreGame } from '../src/game/core.js';
const fixture = count => createCoreGame({id:"phone-fixture",names:Array.from({length:count},(_,i)=>`Seat ${i+1}`),mode:'standard',source:'manual'});
function mount(game, options={}) {
 document.body.innerHTML=renderPhoneScorecard(game,{totals:game.players.map((_,i)=>100+i),scoreCell:(key,seat)=>`<td data-score-key="${key}" data-score-seat="${seat}"><button data-action="choose" data-key="${key}" data-seat="${seat}">+</button></td>`,bonusCell:seat=>`<td><button data-action="another-yahtzee" data-seat="${seat}">+</button></td>`,...options});
 return document.body;
}
describe('smartphone scorecard adapter',()=>{
 it('keeps own bonus facts in the merged label area and preserves a separate compact opponent reference',()=>{
  const game=createCoreGame({id:'merged-bonus',names:['Keith','Amber']});
  document.body.innerHTML=renderPhoneScorecard(game,{viewerSeat:0});
  const row=document.querySelector('.bonus-progress-row');expect(row.children).toHaveLength(2);expect(row.firstElementChild.colSpan).toBe(2);
  expect(row.firstElementChild.querySelector('[data-bonus-seat="0"]')).not.toBeNull();expect(row.lastElementChild.querySelector('[data-bonus-seat="1"]')).not.toBeNull();
  expect(document.querySelector('.phone-scorecard-caption')).toBeNull();expect(document.querySelector('[data-action="scorecard-display"]')).not.toBeNull();
 });
 it.each([2,4,8])('keeps original seat IDs with own seat first and %i named players',count=>{
  const game=fixture(count),viewerSeat=count-1;mount(game,{viewerSeat});
  expect(document.querySelector('.phone-own-heading').dataset.playerSeat).toBe(String(viewerSeat));
  expect([...document.querySelectorAll('.phone-peer-headings [data-player-seat]')].map(x=>Number(x.dataset.playerSeat))).toEqual(Array.from({length:count-1},(_,i)=>i));
  expect([...document.querySelectorAll('.player-name')].map(x=>x.textContent)).toEqual([`Seat ${count}`,...Array.from({length:count-1},(_,i)=>`Seat ${i+1}`)]);
  expect(document.querySelectorAll('[data-action="choose"]')).toHaveLength(13);
  expect(document.querySelectorAll('.phone-peer-track button')).toHaveLength(0);
  expect([...document.querySelectorAll('[data-action="choose"]')].every(button=>button.dataset.seat===String(viewerSeat))).toBe(true);
 });
 it('escapes names, keeps full accessible labels and disambiguates duplicate names by original seat',()=>{
  const game=fixture(4);game.players.forEach(p=>{p.name='<img src=x onerror=alert(1)> & "Alex"';});
  mount(game,{viewerSeat:2});
  expect(document.querySelector('img')).toBeNull();
  const names=[...document.querySelectorAll('.player-name')];
  expect(names.every(x=>x.textContent===game.players[0].name&&x.title===game.players[0].name)).toBe(true);
  expect(new Set(names.map(x=>x.getAttribute('aria-label'))).size).toBe(4);
  expect(document.querySelector('[data-score-seat="0"] .phone-peer-score').getAttribute('aria-label')).toContain('seat 1');
 });
 it('keeps opponents read-only even when their scores exist and render callbacks create edit buttons',()=>{
  const game=fixture(2);game.sheets[0].aces=3;game.sheets[1].aces=4;
  mount(game,{viewerSeat:1,scoreCell:(key,seat)=>`<td data-score-key="${key}" data-score-seat="${seat}"><button data-action="edit" data-seat="${seat}">4</button></td>`});
  expect(document.querySelector('.phone-peer-track [data-action]')).toBeNull();
  expect(document.querySelector('[data-score-key="aces"][data-score-seat="0"]').textContent).toBe('3');
  expect(document.querySelector('[data-action="edit"]').dataset.seat).toBe('1');
 });
 it('does not reveal own or peer totals in hidden-total active games and reveals at completion',()=>{
  const game=fixture(4);game.hideTotals=true;mount(game,{viewerSeat:2});
  expect(document.querySelectorAll('thead strong')).toHaveLength(0);
  expect(document.querySelectorAll('.hidden-total')).toHaveLength(4);
  game.status='finished';mount(game,{viewerSeat:2,winners:[1]});
  expect(document.querySelectorAll('.hidden-total')).toHaveLength(0);
  expect(document.querySelectorAll('thead strong')).toHaveLength(4);
  expect(document.querySelector('.phone-peer-headings [data-player-seat="1"]').classList.contains('winner-column')).toBe(true);
 });
 it('moves every category, bonus and heading rail together, retains offset and stops at bounds',()=>{
  const game=fixture(8),changed=vi.fn();const root=mount(game,{viewerSeat:6});
  const cleanup=bindPhoneScorecard(root,{onPeerOffsetChange:changed});
  expect(root.querySelector('[data-phone-peer-step="-1"]').disabled).toBe(true);
  for(let i=0;i<8;i++) root.querySelector('[data-phone-peer-step="1"]').click();
  const card=root.querySelector('.phone-scorecard');
  expect(card.style.getPropertyValue('--peer-offset')).toBe('6');
  expect(root.querySelector('[data-phone-peer-position]').textContent).toBe('7/7');
  expect(changed).toHaveBeenCalledTimes(6);
  expect(root.querySelectorAll('.phone-peer-track')).toHaveLength(17);
  expect([...root.querySelectorAll('.phone-peer-track')].every(track=>!track.hasAttribute('style'))).toBe(true);
  root.querySelector('[data-phone-peer-step="-1"]').click();expect(card.style.getPropertyValue('--peer-offset')).toBe('5');
  cleanup();root.querySelector('[data-phone-peer-step="-1"]').click();expect(card.style.getPropertyValue('--peer-offset')).toBe('5');
  mount(game,{viewerSeat:6,peerOffset:5});expect(root.querySelector('.phone-scorecard').style.getPropertyValue('--peer-offset')).toBe('5');
 });
 it('allows local hotseat to feature active seat while spectators never receive score callbacks',()=>{
  const game=fixture(4);game.activeSeat=3;
  mount(game,{viewerSeat:game.activeSeat});expect(document.querySelector('[data-action="choose"]').dataset.seat).toBe('3');
  const scoreCell=vi.fn(),bonusCell=vi.fn();mount(game,{viewerSeat:null,scoreCell,bonusCell});
  expect(document.querySelector('.phone-own-heading').dataset.playerSeat).toBe('3');
  expect(scoreCell).not.toHaveBeenCalled();expect(bonusCell).not.toHaveBeenCalled();
  expect(document.querySelector('[data-action=choose],[data-action=edit],[data-action=another-yahtzee]')).toBeNull();
  expect(document.querySelector('.phone-scorecard-caption').textContent).toContain('Watching the table');
 });
 it('hides derived bonus aggregates and requests a quiet actionable own bonus callback',()=>{
  const game=fixture(2);game.hideTotals=true;game.sheets.forEach(sheet=>{sheet.sixes=30;sheet.fives=25;sheet.fours=20;sheet.yahtzeeBonus=300;});
  const bonusCell=vi.fn((seat,{hideTotals})=>`<td><button data-action="another-yahtzee">${hideTotals?'Yahtzee +':300}</button></td>`);
  mount(game,{viewerSeat:0,bonusCell});
  expect(bonusCell).toHaveBeenCalledWith(0,{hideTotals:true});
  const summary=[...document.querySelectorAll('.summary-row')].map(x=>x.textContent).join(' ');
  expect(summary).not.toContain('35');expect(summary).not.toContain('300');expect(summary).toContain('Hidden');
  expect(document.querySelector('[data-action="another-yahtzee"]')).not.toBeNull();
  game.status='finished';mount(game,{viewerSeat:0,bonusCell});
  expect(bonusCell).toHaveBeenLastCalledWith(0,{hideTotals:false});
  expect(document.querySelectorAll('.summary-row')[0].textContent).toContain('35');
 });
 it('uses scoring grand totals when callers omit totals',()=>{
  const game=fixture(2);game.sheets[0].aces=3;game.sheets[0].yahtzeeBonus=100;
  document.body.innerHTML=renderPhoneScorecard(game,{viewerSeat:0});
  expect(document.querySelector('.phone-own-heading strong').textContent).toBe('103');
 });
 it('swipes only horizontally on the comparison rail, leaving vertical and own-score gestures alone',()=>{
  const root=mount(fixture(4),{viewerSeat:0});bindPhoneScorecard(root);
  const card=root.querySelector('.phone-scorecard'),peer=root.querySelector('.phone-peer-window');
  const touch=(target,type,x,y)=>{const event=new Event(type,{bubbles:true});Object.defineProperty(event,type==='touchstart'?'touches':'changedTouches',{value:[{clientX:x,clientY:y}]});target.dispatchEvent(event);};
  touch(peer,'touchstart',100,100);touch(peer,'touchend',20,110);
  expect(card.style.getPropertyValue('--peer-offset')).toBe('1');
  touch(peer,'touchstart',100,100);touch(peer,'touchend',30,200);
  expect(card.style.getPropertyValue('--peer-offset')).toBe('1');
  const own=root.querySelector('[data-action="choose"]');touch(own,'touchstart',100,100);touch(own,'touchend',20,110);
  expect(card.style.getPropertyValue('--peer-offset')).toBe('1');
  touch(peer,'touchstart',20,100);touch(peer,'touchend',100,110);
  expect(card.style.getPropertyValue('--peer-offset')).toBe('0');
 });
 it('renders solo without a comparison or rail controls',()=>{
  mount(fixture(1),{viewerSeat:0});expect(document.querySelector('.phone-peer-window')).toBeNull();
  expect(document.querySelectorAll('thead th')).toHaveLength(2);
 });
});


