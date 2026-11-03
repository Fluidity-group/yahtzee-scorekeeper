// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {readMidnight} from '../src/ui/midnight-profile.js';
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));
it('keeps Home game actions while city/preset/mute preferences work and the four-style portrait flow requires account access',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};localStorage.clear();
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.midnight-cover')).not.toBeNull());
 expect(document.querySelectorAll('.home-game-card')).toHaveLength(4);
 document.querySelector('[data-action="midnight-locations"]').click();expect(document.querySelectorAll('[data-venue-index]')).toHaveLength(4);document.querySelector('[data-venue-index="1"]').click();expect(readMidnight().location).toBe('miami');document.querySelector('[data-venue-confirm]').click();expect(readMidnight().location).toBe('sydney');expect(document.querySelector('.midnight-location-stamp').textContent).toBe('Sydney');
 document.querySelector('[data-action="midnight-avatar"]').click();document.querySelector('[data-value="character-4"]').click();document.querySelector('[data-midnight="confirm-avatar"]').click();await vi.waitFor(()=>expect(readMidnight().avatar).toBe('character-4'));expect(document.querySelector('.ribbon-player-avatar svg').getAttribute('aria-label')).toContain('persona 4');expect(document.querySelector('#coreDialog').open).toBe(false);
 document.querySelector('[data-action="midnight-avatar"]').click();expect(document.querySelector('[data-value="character-4"]').getAttribute('aria-pressed')).toBe('true');expect(document.querySelectorAll('[name="portrait-style"]')).toHaveLength(4);expect(document.querySelector('[name="portrait-style"]:checked').value).toBe('retro-pixel');await vi.waitFor(()=>expect(document.querySelector('[data-portrait-account]').textContent).toContain('Sign in'));expect(document.querySelector('[data-portrait-generate]').disabled).toBe(true);
 const input=document.querySelector('[data-portrait-photo]');Object.defineProperty(input,'files',{value:[{size:6*1024*1024,type:'image/jpeg'}]});input.dispatchEvent(new Event('change',{bubbles:true}));await vi.waitFor(()=>expect(document.querySelector('[data-portrait-message]').textContent).toContain('5 MB'));document.querySelector('[data-action="close"]').click();
 document.querySelector('[data-action="midnight-settings"]').click();document.querySelector('[data-midnight="sound"]').click();expect(readMidnight().muted).toBe(false);document.querySelector('[data-action="close"]').click();
 document.querySelector('[data-action="home-solo"]').click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});
