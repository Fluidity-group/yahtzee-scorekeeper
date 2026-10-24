// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {setHomeAccountPreview} from '../src/multiplayer/home-account.js';
import {homePreview} from '../lab/home-preview.js';
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));
it('opens the requested Home people/trophy panels and never overwrites local setup with a delayed account response',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 setHomeAccountPreview(homePreview);await import('../src/prototype.js');
 await vi.waitFor(()=>expect(document.querySelector('[data-action="home-trophies"]')?.textContent).toContain('3 tournaments won'));
 document.querySelector('[data-action="home-online"]').click();expect(document.querySelector('#coreDialog h2').textContent).toBe('Your people');expect(document.querySelectorAll('.home-opponent-list li')).toHaveLength(3);
 document.querySelector('#coreDialog [data-action="close"]').click();document.querySelector('[data-action="home-trophies"]').click();expect(document.querySelector('.home-trophy-hero strong').textContent).toBe('3');
 document.querySelector('#coreDialog [data-action="close"]').click();
 let deliver;setHomeAccountPreview(()=>new Promise(resolve=>deliver=resolve));
 document.querySelector('[data-action="home-solo"]').click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
 document.querySelector('[data-action="home"]').click();await vi.waitFor(()=>expect(deliver).toBeTypeOf('function'));
 document.querySelector('[data-action="home-local"]').click();deliver(homePreview());await new Promise(r=>setTimeout(r,0));
 expect(document.querySelector('#createCore')).not.toBeNull();expect(document.querySelector('.clubhouse-home')).toBeNull();setHomeAccountPreview(null);
});
