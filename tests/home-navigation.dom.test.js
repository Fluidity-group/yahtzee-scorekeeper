// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));
vi.mock('../src/dice/camera-panel.js',()=>({disconnectCamera:vi.fn(async()=>{})}));
import {saveCore} from '../src/core-store.js';
it('returns to Home through top buttons and resumes the same scored local game without resetting or resaving it',async()=>{
 vi.stubEnv('MODE','ios-test');localStorage.clear();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.yahtz-home')).not.toBeNull());
 expect(document.querySelector('.home-ribbon [aria-label="Home"]')).not.toBeNull();
 document.querySelector('[data-action="home-local"]').click();expect(document.querySelector('.compact-header [aria-label="Back to Home"]').textContent).toContain('Home');
 expect(document.querySelector('.compact-header [aria-label="Back to Home"] span').textContent).toBe('←');document.querySelector('.compact-header [aria-label="Back to Home"]').click();expect(document.querySelector('.yahtz-home')).not.toBeNull();expect(saveCore).not.toHaveBeenCalled();document.querySelector('[data-action="home-local"]').click();
 document.querySelector('#createCore').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('.phone-scorecard')).not.toBeNull());
 document.querySelector('[data-action="choose"][data-key="twos"]').click();document.querySelector('[data-action="confirm-score"][data-value="8"]').click();await vi.waitFor(()=>expect(document.querySelector('#coreDialog').open).toBe(false));
 const saved=structuredClone(saveCore.mock.calls.at(-1)[0]),calls=saveCore.mock.calls.length;expect(saved.sheets[0].twos).toBe(8);
 document.querySelector('.play-header [aria-label="Home"]').click();await vi.waitFor(()=>expect(document.querySelector('.yahtz-home')).not.toBeNull());expect(saveCore).toHaveBeenCalledTimes(calls);expect(document.querySelector('[data-action="resume-game"]')).not.toBeNull();
 document.querySelector('[data-action="resume-game"]').click();await vi.waitFor(()=>expect(document.querySelector('.phone-scorecard')).not.toBeNull());expect(saveCore.mock.calls.at(-1)[0]).toEqual(saved);expect(document.querySelector('[data-score-key="twos"][data-score-seat="0"]').textContent).toContain('8');
});
