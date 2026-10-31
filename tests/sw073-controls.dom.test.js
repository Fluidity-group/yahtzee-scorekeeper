// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {pullSlotLever,clearSlotRain} from '../src/ui/slot-rain.js';
import {readCardPreferences,saveCardPreferences,upperCategoryTitle,renderCategoryPreferences} from '../src/ui/scorecard-preferences.js';
import {bindScorecardDivider} from '../src/ui/scorecard-divider.js';
import {renderYahtzHome,renderTournamentEntry} from '../src/ui/yahtz-home.js';
afterEach(()=>{clearSlotRain();document.body.replaceChildren();localStorage.clear();vi.useRealTimers();vi.unstubAllGlobals();});
it('rains a bounded dice field and reveals the Easter egg on five rapid pulls',()=>{
 vi.useFakeTimers();for(let i=0;i<4;i++)expect(pullSlotLever(1000+i*400)).toBe(false);expect(document.querySelector('.slot-secret')).toBeNull();expect(pullSlotLever(2800)).toBe(true);expect(document.querySelector('.slot-secret').textContent).toBe('AMBER > DAN');expect(document.querySelectorAll('.rain-die')).toHaveLength(72);expect(document.querySelectorAll('.slot-dice-rain')).toHaveLength(1);vi.advanceTimersByTime(3201);expect(document.querySelector('.slot-dice-rain')).toBeNull();
});
it('does not accumulate slow pulls, respects reduced motion, and cleans up on navigation',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}));for(let i=0;i<20;i++)expect(pullSlotLever(i*4000)).toBe(false);expect(document.querySelector('.rain-static')).not.toBeNull();expect(document.querySelectorAll('.rain-die')).toHaveLength(72);clearSlotRain();expect(vi.getTimerCount()).toBe(0);expect(document.querySelector('.slot-dice-rain')).toBeNull();
 document.body.innerHTML=renderYahtzHome();expect(document.querySelector('[data-action=slot-lever]').getAttribute('aria-label')).toContain('Pull Slot Lever');expect(document.querySelector('[data-action=slot-lever]').closest('[aria-hidden=true]')).toBeNull();
});
it('renders distinct tournament action titles and descriptors',()=>{
 document.body.innerHTML=renderTournamentEntry();expect([...document.querySelectorAll('.midnight-settings-links strong')].map(n=>n.textContent)).toEqual(['Create a Tournament','Join a Tournament','Return to Your Tournaments']);expect(document.querySelectorAll('.midnight-settings-links button>small')).toHaveLength(3);
});
function divider(){document.body.innerHTML='<section class="phone-scorecard" data-phone-peer-count="1"><button class="scorecard-divider"></button><div class="score-table-wrap"></div></section>';const card=document.querySelector('section'),handle=card.querySelector('button');card.querySelector('.score-table-wrap').getBoundingClientRect=()=>({left:20,width:300});const feedback=vi.fn(),dispose=bindScorecardDivider(card,{feedback});return{card,handle,feedback,dispose};}
function pointer(handle,type,x=140,extra={}){const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,isPrimary:true,clientX:x,...extra});handle.dispatchEvent(e);return e;}
it('drags within readable bounds, persists on release and supplies bounded haptic selection ticks',()=>{
 const{card,handle,feedback,dispose}=divider();pointer(handle,'pointerdown');pointer(handle,'pointermove',400);expect(card.style.getPropertyValue('--category-size')).toBe('52%');expect(card.style.getPropertyValue('--own-size')).toBe('28%');expect(readCardPreferences().width).toBe(40);pointer(handle,'pointerup');expect(readCardPreferences().width).toBe(52);expect(feedback.mock.calls.map(c=>c[0])).toEqual(['start','change','end']);
 handle.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));expect(readCardPreferences().width).toBe(28);handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));expect(readCardPreferences().width).toBe(30);dispose();
});
it.each(['pointercancel','lostpointercapture','multitouch'])('cancels %s without saving a partial drag or blocking pinch',kind=>{
 const{card,handle,dispose}=divider();pointer(handle,'pointerdown');pointer(handle,'pointermove',400);if(kind==='multitouch'){const e=new Event('touchstart',{bubbles:true});Object.defineProperty(e,'touches',{value:[{},{}]});card.dispatchEvent(e);}else pointer(handle,kind);expect(card.style.getPropertyValue('--category-size')).toBe('40%');expect(readCardPreferences().width).toBe(40);dispose();
});
it('keeps resizing available when storage fails, and cleanup removes active gesture handlers',()=>{
 const{handle,card,dispose}=divider();const fail=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('full');});handle.dispatchEvent(new KeyboardEvent('keydown',{key:'End'}));expect(handle.getAttribute('aria-valuetext')).toContain('session only');fail.mockRestore();dispose();pointer(handle,'pointerdown');pointer(handle,'pointermove',80);expect(card.style.getPropertyValue('--category-size')).toBe('52%');
});
it('escapes custom labels, preserves face identities and switches to six unambiguous original dice',()=>{
 saveCardPreferences({labels:'custom',names:{aces:'Little <Aces>',twos:'Double Trouble'}});document.body.innerHTML=upperCategoryTitle('aces');expect(document.body.textContent).toBe('Little <Aces>');expect(document.querySelector('aces')).toBeNull();expect(document.querySelector('[aria-label]').getAttribute('aria-label')).toContain('ones');
 saveCardPreferences({labels:'dice'});document.body.innerHTML=['aces','twos','threes','fours','fives','sixes'].map(upperCategoryTitle).join('');expect([...document.querySelectorAll('svg')].map(s=>s.querySelectorAll('circle').length)).toEqual([1,2,3,4,5,6]);expect(readCardPreferences().names.twos).toBe('Double Trouble');document.body.innerHTML=renderCategoryPreferences();expect(document.querySelector('[name=upper-label-style]').value).toBe('dice');
});
