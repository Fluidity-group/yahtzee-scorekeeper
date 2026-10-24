// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({user:{id:'host',email:'host@example.test'},inbox:{invitations:[],requests:[]},request:vi.fn()}));
vi.mock('../src/multiplayer/client.js',()=>({
 auth:{getSession:async()=>({data:{session:{user:mock.user}}})},webUrl:'https://example.test/game/',watchSocial:()=>()=>{},
 requestSocial:async(action,payload)=>{mock.request(action,payload);if(action==='inbox')return structuredClone(mock.inbox);if(action==='invite-accept')return{code:'ABCDEFGH'};return{ok:true};}
}));
vi.mock('../src/multiplayer/social-native.js',()=>({enablePhoneNotifications:vi.fn(),disablePhoneNotifications:vi.fn(),syncNativeAccount:async()=>{}}));
import {openSocial,connectSocial} from '../src/multiplayer/social-ui.js';
beforeEach(async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 await connectSocial(null);document.body.innerHTML='';mock.request.mockClear();mock.inbox={invitations:[],requests:[]};mock.user={id:'host',email:'host@example.test'};
});
afterEach(async()=>{await connectSocial(null);});
it('lets a host save an addressed invitation, then lets only the signed-in recipient explicitly accept and open it',async()=>{
 const room={code:'ABCDEFGH',hostId:'host',status:'lobby',tournament:{name:'Friday cup',playerCount:2},members:[{userId:'host',name:'Host'}]};
 const before=structuredClone(room);await openSocial(room);
 const form=document.querySelector('[data-social-form=invite]');form.elements.email.value='guest@example.test';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(mock.request).toHaveBeenCalledWith('invite-create',expect.objectContaining({code:'ABCDEFGH',email:'guest@example.test'})));
 await vi.waitFor(()=>expect(document.querySelector('[data-social-status]').textContent).toContain('Invitation saved'));
 expect(room).toEqual(before);document.querySelector('[data-social=close]').click();
 await connectSocial(null);mock.user={id:'guest',email:'guest@example.test'};mock.inbox.invitations=[{id:'invite-1',sent:false,status:'pending',actionable:true,tournament_name:'Friday cup',sender_name:'Host'}];
 const navigate=vi.fn();document.addEventListener('clubhouse-open-tournament',navigate);
 await openSocial();expect(mock.request.mock.calls.some(([a])=>a==='invite-accept')).toBe(false);
 const accept=document.querySelector('[data-social-form=accept]');accept.elements.name.value='Guest';accept.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(navigate).toHaveBeenCalledTimes(1));
 expect(mock.request).toHaveBeenCalledWith('invite-accept',{id:'invite-1',name:'Guest'});
 expect(navigate.mock.calls[0][0].detail).toEqual({code:'ABCDEFGH'});
 expect(document.querySelector('.social-dialog').open).toBe(false);
 expect(room).toEqual(before);document.removeEventListener('clubhouse-open-tournament',navigate);
});
it('does not offer acceptance for an expired invitation or silently join from an inbox refresh',async()=>{
 mock.inbox.invitations=[{id:'old',sent:false,status:'pending',actionable:false,tournament_name:'Old cup'}];await openSocial();
 expect(document.querySelector('[data-social-form=accept]')).toBeNull();
 expect(document.querySelector('.social-dialog').textContent).toContain('closed or expired');
 expect(mock.request.mock.calls.every(([a])=>a==='inbox')).toBe(true);
});
