// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {setHomeAccountPreview} from '../src/multiplayer/home-account.js';
import {homePreview} from '../lab/home-preview.js';
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));
it('connects profile/persona, theme and tournament choice controls while removing game-only messages on Home return',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};setHomeAccountPreview(homePreview);
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.ribbon-player-name')?.textContent).toBe('Alex'));
 const click=selector=>{const e=document.querySelector(selector);expect(e,selector).not.toBeNull();e.click();};
 click('[data-action="home-profile"]');expect(document.querySelector('#coreDialog h2').textContent).toBe('Alex');expect(document.querySelector('.home-profile-stats dd').textContent).toBe('6');
 click('#coreDialog [data-action="midnight-avatar"]');expect(document.querySelectorAll('[data-midnight="preset"]')).toHaveLength(4);click('[data-action="close"]');
 const before=document.documentElement.dataset.theme;click('.home-ribbon [data-action="theme"]');expect(document.documentElement.dataset.theme).not.toBe(before);expect(document.querySelector('.home-ribbon [data-action="theme"]').getAttribute('aria-label')).toBe(`Switch to ${before} mode`);
 click('[data-action="home-tournament"]');for(const action of ['tournament-create','tournament-join','saved-sessions'])expect(document.querySelector('#coreDialog [data-action="'+action+'"]')).not.toBeNull();click('[data-action="close"]');
 click('[data-action="midnight-settings"]');click('#coreDialog [data-action="game-menu"]');expect(document.querySelector('.club-menu-grid')).not.toBeNull();click('[data-action="close"]');
 click('[data-action="home-local"]');await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());document.querySelector('#coreNotice').textContent='Choose a highlighted category. Your 100-point bonus will be saved with it.';click('[data-action="home"]');await vi.waitFor(()=>expect(document.querySelector('.yahtz-home')).not.toBeNull());expect(document.querySelector('#coreNotice').textContent).toBe('');setHomeAccountPreview(null);
});
