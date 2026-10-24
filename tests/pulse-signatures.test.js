// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pulseAccepted, cancelPulse, acceptedPulse, refreshPulse } from '../src/ui/pulse.js';
import { acceptedOutcome, celebration } from '../src/game/celebrations.js';
const before = { id: 'table', status: 'active', activeSeat: 2, events: [], sheets: [{}, {}, {}] };
const after = (category = 'fullHouse', value = 25, extra = {}) => ({ ...before, events: [{ id: 'score-1', type: 'score', seat: 2, category, value }], ...extra });
const board = () => {
 const root = document.createElement('main');
 root.innerHTML = '<span class="turn-indicator">C to play</span><div class="player-heading" data-player-seat="2">C</div><div class="player-heading" data-player-seat="0">A</div><div data-score-key="fullHouse" data-score-seat="2"><button class="recorded-score">25</button></div><div data-score-key="largeStraight" data-score-seat="2"><button class="recorded-score">40</button></div><div data-score-key="yahtzee" data-score-seat="2"><button class="recorded-score">50</button></div>';
 document.body.append(root); return root;
};
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren(); });
describe('phone anchored accepted signatures', () => {
 it('uses full-house 3+2, progressive straight steps and gold Yahtzee without replacing facts', () => {
  vi.useFakeTimers(); const root = board();
  const first = after(); pulseAccepted(root, before, first);
  expect(root.querySelector('.pulse-emblem-full-house').textContent).toBe('3 + 2');
  expect(root.querySelector('[data-score-key="fullHouse"] button').textContent).toBe('25');
  expect(root.querySelector('.pulse-emblem').getAttribute('aria-hidden')).toBe('true');
  const straight = after('largeStraight', 40, { events: [...first.events, { id:'score-2', type:'score', seat:2, category:'largeStraight', value:40 }] });
  pulseAccepted(root, first, straight);
  expect(root.querySelector('.pulse-emblem-full-house')).toBeNull();
  expect(root.querySelectorAll('.pulse-emblem-straight i')).toHaveLength(5);
  const yahtzee = after('yahtzee', 50, { events: [...straight.events, { id:'score-3', type:'score', seat:2, category:'yahtzee', value:50 }] });
  pulseAccepted(root, straight, yahtzee, { intensity:'showtime' });
  expect(root.querySelector('.pulse-yahtzee')).not.toBeNull(); expect(root.querySelectorAll('.pulse-spark')).toHaveLength(6);
  expect(root.inert).toBeFalsy(); expect(document.activeElement).toBe(document.body);
  vi.advanceTimersByTime(1200); expect(root.querySelector('[class*="pulse-emblem"]')).toBeNull(); expect(root.querySelector('.accepted-score')).toBeNull();
 });
 it('addresses original seats after own-first column reorder', () => {
  const root = board(); const next = after('yahtzee', 50, { activeSeat:0, events:[{ id:'bonus', type:'bonus', seat:2, value:100 }] });
  pulseAccepted(root,before,next);
  expect(root.querySelector('[data-player-seat="2"]').classList.contains('accepted-bonus')).toBe(true);
  expect(root.querySelector('[data-player-seat="0"]').classList.contains('accepted-turn')).toBe(true);
  cancelPulse(root);
 });
 it('deduplicates even if a stale caller repeats the previous snapshot', () => {
  const root = board(), next = after(); pulseAccepted(root,before,next); cancelPulse(root);
  expect(pulseAccepted(root,before,next)).toBeNull(); expect(root.querySelector('.pulse-emblem')).toBeNull();
 });
 it('cancels on Undo, correction and explicit lifecycle reset, including batched score+Undo', () => {
  vi.useFakeTimers(); const root = board(), next = after(); pulseAccepted(root,before,next);
  const undo = {...next,events:[...next.events,{id:'undo',type:'score-undo',target:'score-1'}]};
  expect(pulseAccepted(root,next,undo)).toBeNull(); expect(root.querySelector('.pulse-emblem')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  expect(acceptedOutcome(before,undo)).toBeNull(); expect(celebration(before,undo)).toBeNull();
  const corrected = {...next,events:[...next.events,{id:'correction',type:'score-correction',target:'score-1',value:0}]};
  expect(acceptedPulse(before,corrected)).toBeNull();
  const another = {...next,events:[{...next.events[0],id:'replacement'}]}; pulseAccepted(root,undo,another); expect(root.querySelector('.pulse-emblem')).not.toBeNull();
  pulseAccepted(root,another,{...another,events:[...another.events,{id:'c2',type:'score-correction',target:'replacement'}]}); expect(root.querySelector('.pulse-emblem')).toBeNull();
  pulseAccepted(root,another,{...another,events:[...another.events,{...another.events[0],id:'third'}]}); cancelPulse(root); expect(vi.getTimerCount()).toBe(0);
 });
 it('keeps zero quiet while preserving next-turn facts, and hydration stays silent', () => {
  expect(acceptedPulse(before,after('yahtzee',0))).toBeNull(); expect(acceptedPulse(before,after('yahtzee',0,{activeSeat:0}))).toEqual({ score:null,bonusSeat:null,turnSeat:0 });
  const root=board(); pulseAccepted(root,null,after()); expect(root.querySelector('.pulse-emblem')).toBeNull();
 });
 it('OS reduced motion cannot be overridden by false and explicit reduced leaves score facts', () => {
  vi.useFakeTimers(); vi.stubGlobal('matchMedia',()=>({matches:true})); const root=board();
  expect(pulseAccepted(root,before,after(),{reduced:false}).score.category).toBe('fullHouse');
  expect(root.querySelector('.pulse-emblem')).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  vi.stubGlobal('matchMedia',()=>({matches:false})); const other=board(); pulseAccepted(other,before,after(),{reduced:true});
  expect(other.querySelector('button').textContent).toBe('25'); expect(other.querySelector('.accepted-score')).toBeNull();
 });
 it('suppresses derived bonus clues while totals are hidden but preserves category cues', () => {
  const previous={...before,sheets:[{}, {}, {aces:3,twos:6,threes:9,fours:12,fives:15}]};
  const next=after('sixes',18,{hideTotals:true,sheets:[{}, {}, {...previous.sheets[2],sixes:18}]});
  expect(celebration(previous,next)).toMatchObject({kind:'score',upperBonus:false});
  expect(celebration(previous,{...next,hideTotals:false})).toMatchObject({kind:'upper-bonus',upperBonus:true});
  expect(celebration(previous,after('yahtzee',50,{hideTotals:true}))).toMatchObject({kind:'yahtzee',upperBonus:false});
 });
 it('subdued removes emblems while retaining the score landing pulse',()=>{
  const root=board(); pulseAccepted(root,before,after(),{intensity:'subdued'});
  expect(root.querySelector('.accepted-score')).not.toBeNull(); expect(root.querySelector('.pulse-emblem')).toBeNull(); cancelPulse(root);
 });
});

describe('signature lifecycle edge cases',()=>{
 it('decorates the final category as well as returning a finish fact',()=>{
  const root=board(), next=after('fullHouse',25,{status:'finished'});
  expect(celebration(before,next).kind).toBe('finish'); pulseAccepted(root,before,next);
  expect(root.querySelector('.pulse-emblem-full-house')).not.toBeNull(); cancelPulse(root);
 });
 it('keeps small-straight sequence distinct without inventing actual die faces',()=>{
  const root=board(); root.querySelector('[data-score-key="largeStraight"]').dataset.scoreKey='smallStraight';
  pulseAccepted(root,before,after('smallStraight',30));
  expect(root.querySelectorAll('.pulse-emblem-straight i')).toHaveLength(4);
  expect([...root.querySelectorAll('.pulse-emblem-straight i')].map(node=>node.textContent)).toEqual(['•','•','•','•']); cancelPulse(root);
 });
 it('remembers observed IDs across an older reconnect audit',()=>{
  const root=board(), next=after(); pulseAccepted(root,before,next); pulseAccepted(root,next,before);
  expect(pulseAccepted(root,before,next)).toBeNull(); expect(root.querySelector('.pulse-emblem')).toBeNull();
 });
 it('keeps a new game quiet on hydration and allows its first newly accepted event',()=>{
  const root=board(); pulseAccepted(root,before,after());
  const fresh={...before,id:'fresh-game'}; expect(pulseAccepted(root,before,fresh)).toBeNull();
  const scored={...after(),id:'fresh-game'}; expect(pulseAccepted(root,fresh,scored).score.category).toBe('fullHouse'); cancelPulse(root);
 });
});


describe('accepted signature DOM rebinding',()=>{
 it('restores replaced cells without another reward, duplicate decorations or a longer lifetime',()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  const root=board(),html=root.innerHTML,next=after();
  pulseAccepted(root,before,next);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(500);root.innerHTML=html;
  expect(root.querySelector('.pulse-emblem')).toBeNull();
  expect(refreshPulse(root)).toBe(true);
  expect(root.querySelectorAll('.pulse-emblem-full-house')).toHaveLength(1);
  expect(root.querySelector('.accepted-score')).not.toBeNull();
  expect(vi.getTimerCount()).toBe(1);
  refreshPulse(root);refreshPulse(root);
  expect(root.querySelectorAll('.pulse-emblem-full-house')).toHaveLength(1);
  vi.advanceTimersByTime(699);
  expect(root.querySelector('.pulse-emblem')).not.toBeNull();
  vi.advanceTimersByTime(1);
  expect(root.querySelector('.pulse-emblem')).toBeNull();expect(root.querySelector('.accepted-score')).toBeNull();
  expect(refreshPulse(root)).toBe(false);expect(vi.getTimerCount()).toBe(0);
  expect(pulseAccepted(root,before,next)).toBeNull();
 });
 it.each(['score-undo','score-correction'])('cannot rebind after %s invalidates the accepted event',type=>{
  vi.useFakeTimers();const root=board(),html=root.innerHTML,next=after();pulseAccepted(root,before,next);
  vi.advanceTimersByTime(300);root.innerHTML=html;refreshPulse(root);
  const corrected={...next,events:[...next.events,{id:'change',type,target:'score-1'}]};
  expect(pulseAccepted(root,next,corrected)).toBeNull();
  root.innerHTML=html;expect(refreshPulse(root)).toBe(false);
  expect(root.querySelector('.pulse-emblem')).toBeNull();expect(vi.getTimerCount()).toBe(0);
 });
 it('rebinds original-seat read-only peer anchors and preserves focus',()=>{
  vi.useFakeTimers();const root=board();
  const html='<span class="turn-indicator">A to play</span><div class="phone-peer-headings"><div class="phone-peer-slot" data-player-seat="2">C</div><div class="phone-peer-slot" data-player-seat="0">A</div></div><span data-score-key="fullHouse" data-score-seat="2"><span class="recorded-score">25</span></span><button id="focus-target">Menu</button>';
  root.innerHTML=html;const next=after('fullHouse',25,{activeSeat:0});pulseAccepted(root,before,next);
  root.innerHTML=html;root.querySelector('#focus-target').focus();const focused=document.activeElement;refreshPulse(root);
  expect(root.querySelector('[data-score-seat="2"]').classList.contains('accepted-score')).toBe(true);
  expect(root.querySelector('[data-player-seat="0"]').classList.contains('accepted-turn')).toBe(true);
  expect(root.querySelector('[data-score-seat="2"] button')).toBeNull();
  expect(document.activeElement).toBe(focused);cancelPulse(root);
 });
 it('drops an active visual if OS reduced-motion is enabled before rebinding',()=>{
  vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false}));const root=board();pulseAccepted(root,before,after());
  vi.stubGlobal('matchMedia',()=>({matches:true}));expect(refreshPulse(root)).toBe(false);
  expect(root.querySelector('.pulse-emblem')).toBeNull();expect(vi.getTimerCount()).toBe(0);
 });
});
