// @vitest-environment jsdom
import{it,expect,vi,afterEach}from'vitest';
vi.mock('../src/multiplayer/client.js',()=>({configured:false,auth:null}));
import{currentAvatar,setAccountAvatar,setPeerAvatars,avatarProfile,renderAvatar}from'../src/profile/avatar-view.js';
import{bindPortraitFlow,renderPortraitFlow,saveAccountPreset}from'../src/ui/portrait-panel.js';
import{renderMidnightPanel,bindMidnightPanel}from'../src/ui/midnight-panels.js';
let cleanup=()=>{};const owner='10000000-0000-4000-8000-000000000001';
afterEach(()=>{cleanup();cleanup=()=>{};setAccountAvatar(null);localStorage.clear();document.body.replaceChildren();});
it('keeps the newest saved avatar in both Home and game views when old reads finish late',()=>{
 setAccountAvatar({ownerId:owner,revision:2,kind:'generated',url:'https://fixture/new.jpg'});
 setPeerAvatars([{ownerId:owner,revision:1,kind:'generated',url:'https://fixture/old.jpg'}]);
 setAccountAvatar({ownerId:owner,revision:1,kind:'preset',preset:'character-1'});
 expect(currentAvatar().revision).toBe(2);expect(avatarProfile(owner).url).toBe('https://fixture/new.jpg');expect(renderAvatar({accountId:owner})).toContain('new.jpg');
 setAccountAvatar({ownerId:owner,revision:2,kind:'generated',url:'https://fixture/refreshed.jpg'});expect(renderAvatar({accountId:owner})).toContain('refreshed.jpg');
});
it('shows an unavailable saved portrait honestly instead of implying the saved choice is gone',()=>{
 setAccountAvatar({ownerId:owner,revision:3,kind:'generated',imageStatus:'unavailable'});
 document.body.innerHTML=renderAvatar({ownPlayer:true});expect(document.body.textContent).toContain('Saved portrait');expect(currentAvatar().kind).toBe('generated');
});
it('selects the account preset on a different device and does not overwrite deliberate local choices',()=>{
 document.body.innerHTML='<dialog>'+renderMidnightPanel('avatar')+'</dialog>';const dialog=document.querySelector('dialog');cleanup=bindMidnightPanel(dialog,'avatar',vi.fn());
 setAccountAvatar({ownerId:owner,revision:4,kind:'preset',preset:'character-4'});
 expect(dialog.querySelector('[data-value="character-4"]').getAttribute('aria-pressed')).toBe('true');
 dialog.querySelector('[data-value="character-2"]').click();setAccountAvatar({ownerId:owner,revision:4,kind:'preset',preset:'character-4'});
 expect(dialog.querySelector('[data-value="character-2"]').getAttribute('aria-pressed')).toBe('true');
});
it('confirmation before the account preset loads preserves the server choice without a default overwrite',async()=>{
 const api=vi.fn(async()=>({profile:{ownerId:owner,revision:8,kind:'preset',preset:'character-4'}}));
 await saveAccountPreset('character-1',{api,session:async()=>({user:{id:owner}}),explicitSelection:false});
 expect(api).toHaveBeenCalledTimes(1);expect(currentAvatar().preset).toBe('character-4');
});
it('reconciles an uncertain generation by its original id before allowing another paid draft',async()=>{
 let original;const api=vi.fn(async payload=>{if(payload.operation==='profile')return{profile:{ownerId:owner,revision:0,kind:'preset'}};if(payload.operation==='generate'){original=payload.id;throw Error('Connection interrupted');}if(payload.operation==='status')return{job:{id:payload.id,status:'ready',style:'retro-pixel',url:'https://fixture/ready'}};throw Error('Unexpected request');});
 document.body.innerHTML='<dialog>'+renderPortraitFlow()+'</dialog>';const dialog=document.querySelector('dialog');cleanup=bindPortraitFlow(dialog,vi.fn(),{api,session:async()=>({user:{id:owner}}),prepare:async()=>({mime:'image/jpeg',photo:'abc',preview:'data:image/jpeg;base64,YQ=='})});
 await vi.waitFor(()=>expect(dialog.querySelector('[data-portrait-photo]').disabled).toBe(false));const input=dialog.querySelector('[data-portrait-photo]');Object.defineProperty(input,'files',{value:[{}]});input.dispatchEvent(new Event('change',{bubbles:true}));await vi.waitFor(()=>expect(dialog.querySelector('[data-portrait-generate]').disabled).toBe(false));dialog.querySelector('[data-portrait-generate]').click();await vi.waitFor(()=>expect(dialog.querySelector('[data-portrait-check]').hidden).toBe(false));
 expect(dialog.querySelector('[data-portrait-generate]').disabled).toBe(true);dialog.querySelector('[data-portrait-generate]').click();expect(api.mock.calls.filter(([p])=>p.operation==='generate')).toHaveLength(1);
 dialog.querySelector('[data-portrait-check]').click();await vi.waitFor(()=>expect(dialog.querySelector('[data-portrait-confirm]').disabled).toBe(false));expect(api.mock.calls.find(([p])=>p.operation==='status')[0].id).toBe(original);
});
it('keeps failed draft recovery visible after reload and permits explicit local abandonment only',async()=>{
 localStorage.setItem('clubhouse:portrait-draft:'+owner,'pending-id');const api=vi.fn(async p=>{if(p.operation==='profile')return{profile:{ownerId:owner,revision:0,kind:'preset'}};throw Error('Status unavailable');});
 document.body.innerHTML='<dialog>'+renderPortraitFlow()+'</dialog>';const dialog=document.querySelector('dialog');cleanup=bindPortraitFlow(dialog,vi.fn(),{api,session:async()=>({user:{id:owner}})});
 await vi.waitFor(()=>expect(dialog.querySelector('[data-portrait-check]').hidden).toBe(false));expect(dialog.querySelector('[data-portrait-abandon]').hidden).toBe(false);expect(api.mock.calls.some(([p])=>p.operation==='generate')).toBe(false);
 dialog.querySelector('[data-portrait-abandon]').click();expect(localStorage.getItem('clubhouse:portrait-draft:'+owner)).toBeNull();expect(dialog.textContent).toContain('does not cancel generation or refund usage');
});
it('cannot carry a preset selection into a replacement account through an old open editor',()=>{
 setAccountAvatar({ownerId:owner,revision:1,kind:'preset',preset:'character-1'});document.body.innerHTML='<dialog>'+renderMidnightPanel('avatar')+'</dialog>';const dialog=document.querySelector('dialog'),saved=vi.fn();cleanup=bindMidnightPanel(dialog,'avatar',saved);
 dialog.querySelector('[data-value="character-2"]').click();globalThis.dispatchEvent(new CustomEvent('clubhouse-account-changed',{detail:{ownerId:'other-account'}}));
 expect(dialog.querySelector('[data-midnight=confirm-avatar]').disabled).toBe(true);dialog.querySelector('[data-midnight=confirm-avatar]').click();expect(saved).not.toHaveBeenCalled();expect(localStorage.getItem('dice-clubhouse:midnight-preferences:v1')).toBeNull();
});
it('ignores a late status response after its pending draft was explicitly forgotten',async()=>{
 let resolveStatus;const api=vi.fn(async p=>{if(p.operation==='profile')return{profile:{ownerId:owner,revision:0,kind:'preset'}};if(p.operation==='status')return new Promise(resolve=>{resolveStatus=resolve;});throw Error('unexpected');});
 localStorage.setItem('clubhouse:portrait-draft:'+owner,'pending');document.body.innerHTML='<dialog>'+renderPortraitFlow()+'</dialog>';const dialog=document.querySelector('dialog');cleanup=bindPortraitFlow(dialog,vi.fn(),{api,session:async()=>({user:{id:owner}})});
 await vi.waitFor(()=>expect(resolveStatus).toBeTypeOf('function'));dialog.querySelector('[data-portrait-abandon]').click();resolveStatus({job:{id:'pending',status:'ready',style:'retro-pixel',url:'https://fixture/old'}});await Promise.resolve();await Promise.resolve();
 expect(localStorage.getItem('clubhouse:portrait-draft:'+owner)).toBeNull();expect(dialog.querySelector('[data-portrait-confirm]').disabled).toBe(true);expect(dialog.querySelector('[data-generated-preview] img')).toBeNull();
});
