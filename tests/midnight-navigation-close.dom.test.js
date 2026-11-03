// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {readMidnight} from '../src/ui/midnight-profile.js';
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:null,configured:false,webUrl:'https://example.test/'}));

it('keeps replacement avatar, venue and sound panels interactive after queued navigation close events',async()=>{
 localStorage.clear();
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;setTimeout(()=>this.dispatchEvent(new Event('close')),0);};
 await import('../src/prototype.js');
 await vi.waitFor(()=>expect(document.querySelector('.midnight-cover')).not.toBeNull());
 const click=selector=>{const button=document.querySelector(selector);expect(button,selector).not.toBeNull();button.click();};
 const openFromMenu=async action=>{
  click('[data-action="midnight-settings"]');
  click('#coreDialog [data-action="game-menu"]');
  click(`#coreDialog [data-action="${action}"]`);
  // Native dialog.close() queues its close event, which can arrive after showModal().
  await new Promise(resolve=>setTimeout(resolve,10));
  expect(document.querySelector('#coreDialog').open).toBe(true);
 };
 await openFromMenu('midnight-avatar');
 click('[data-value="character-4"]');click('[data-midnight="confirm-avatar"]');
 await vi.waitFor(()=>expect(readMidnight().avatar).toBe('character-4'));
 await openFromMenu('midnight-locations');
 click('[data-venue-index="1"]');click('[data-venue-confirm]');
 expect(readMidnight().location).toBe('sydney');
 await openFromMenu('midnight-settings');
 click('[data-midnight="sound"]');expect(readMidnight().muted).toBe(false);
 click('[data-midnight="sound"]');expect(readMidnight().muted).toBe(true);
 // A real close without replacement must still clean up private photo resources.
 click('#coreDialog [data-action="midnight-avatar"]');
 vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:128,height:128,close:vi.fn()})));
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()});vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,YQ==');
 const input=document.querySelector('[data-portrait-photo]');
 Object.defineProperty(input,'files',{value:[{size:100,type:'image/png'}]});
 input.dispatchEvent(new Event('change',{bubbles:true}));
 await vi.waitFor(()=>expect(document.querySelector('[data-original-preview] img')).not.toBeNull());
 document.querySelector('#coreDialog').close();
 await vi.waitFor(()=>expect(document.querySelector('[data-original-preview] img')).toBeNull());expect(JSON.stringify({...localStorage})).not.toContain('data:image');
});
