// @vitest-environment jsdom
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {renderVenueReel,bindVenueReel} from '../src/ui/venue-reel.js';
import {readMidnight,saveMidnight} from '../src/ui/midnight-profile.js';
let cleanup;
beforeEach(()=>localStorage.clear());afterEach(()=>{cleanup?.();cleanup=null;vi.restoreAllMocks();vi.unstubAllGlobals();});
function mount(){document.body.innerHTML='<dialog open>'+renderVenueReel()+'</dialog>';const dialog=document.querySelector('dialog'),changed=vi.fn();cleanup=bindVenueReel(dialog,changed);return {dialog,changed,reel:dialog.querySelector('.venue-reel')};}
const click=selector=>document.querySelector(selector).click();
it('starts at the saved city with four accessible reel options and no automatic selection',()=>{
 saveMidnight({location:'sydney'});const {reel,changed}=mount();expect(reel.getAttribute('aria-activedescendant')).toBe('venue-option-sydney');expect(document.querySelectorAll('[role=option]')).toHaveLength(4);expect(document.querySelector('[aria-selected=true]').textContent).toContain('Sydney');expect(document.querySelector('[data-venue-confirm]').textContent).toBe('Use Sydney');expect(changed).not.toHaveBeenCalled();
});
it('previews with keyboard and persists only after explicit confirmation',()=>{
 const {reel,changed}=mount();reel.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));expect(document.querySelector('[data-venue-confirm]').textContent).toBe('Use Tokyo');expect(readMidnight().location).toBe('miami');expect(document.querySelector('[data-venue-step="1"]').disabled).toBe(true);click('[data-venue-confirm]');expect(readMidnight().location).toBe('tokyo');expect(changed).toHaveBeenCalledWith(null);
});
it('settles a native swipe at the nearest city without committing, and cancellation leaves the saved city intact',()=>{
 const {reel,changed}=mount();Object.defineProperty(reel,'clientWidth',{value:300});reel.querySelectorAll('[data-venue-index]').forEach((card,i)=>{Object.defineProperty(card,'offsetLeft',{value:i*300});Object.defineProperty(card,'offsetWidth',{value:300});});reel.scrollLeft=600;reel.dispatchEvent(new Event('scrollend'));expect(reel.getAttribute('aria-activedescendant')).toBe('venue-option-las-vegas');expect(document.querySelector('[data-venue-position]').textContent).toBe('Las Vegas · 3 of 4');expect(readMidnight().location).toBe('miami');cleanup();expect(changed).not.toHaveBeenCalled();reel.scrollLeft=900;reel.dispatchEvent(new Event('scrollend'));expect(reel.getAttribute('aria-activedescendant')).toBe('venue-option-las-vegas');
});
it('offers arrows and city dots without requiring a swipe and respects reduced motion',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));const {reel}=mount();reel.scrollTo=vi.fn();expect(document.querySelector('[data-venue-step="-1"]').disabled).toBe(true);click('[data-venue-step="1"]');expect(document.querySelector('[data-venue-confirm]').textContent).toBe('Use Sydney');expect(reel.scrollTo).toHaveBeenLastCalledWith({left:0,behavior:'auto'});click('[data-venue-dot="2"]');expect(document.querySelector('[data-venue-dot="2"]').getAttribute('aria-pressed')).toBe('true');click('[data-venue-confirm]');expect(readMidnight().location).toBe('las-vegas');
});
it('surfaces a failed preference save without claiming selection or closing',()=>{
 const {changed}=mount();click('[data-venue-dot="1"]');vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Storage unavailable');});click('[data-venue-confirm]');expect(document.querySelector('[data-venue-error]').textContent).toBe('Storage unavailable');expect(changed).not.toHaveBeenCalled();expect(readMidnight().location).toBe('miami');
});
