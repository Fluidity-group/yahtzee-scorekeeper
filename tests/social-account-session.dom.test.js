// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({user:null,inbox:{invitations:[],requests:[]},request:vi.fn()}));
vi.mock('../src/multiplayer/client.js',()=>({auth:{getSession:async()=>({data:{session:{user:mock.user}}})},webUrl:'https://example.test/',watchSocial:()=>()=>{},requestSocial:mock.request}));
vi.mock('../src/multiplayer/social-native.js',()=>({enablePhoneNotifications:async()=>{},disablePhoneNotifications:async()=>{},syncNativeAccount:async()=>{}}));
import {openSocial,connectSocial} from '../src/multiplayer/social-ui.js';
const alice={id:'alice'},bob={id:'bob'};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
beforeEach(async()=>{
 await connectSocial(null);document.body.innerHTML='';vi.clearAllMocks();mock.user=alice;mock.inbox={invitations:[],requests:[]};
 mock.request.mockImplementation(async()=>structuredClone(mock.inbox));
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
});
afterEach(()=>connectSocial(null));
it('closes and clears the old account player panel before showing the replacement inbox',async()=>{
 await openSocial({code:'ABCDEFGH',hostId:'alice',status:'active',tournament:{name:'Alice table'},members:[{userId:'alice',name:'Alice'},{userId:'sam',name:'Sam'}]});
 expect(document.querySelector('.social-members')).not.toBeNull();mock.user=bob;await connectSocial(bob);
 expect(document.querySelector('.social-dialog').open).toBe(false);expect(document.querySelector('.social-dialog').textContent).toBe('');
 await openSocial();expect(document.querySelector('.social-members')).toBeNull();expect(document.querySelector('.social-dialog').textContent).not.toContain('Alice table');
});
it('does not navigate or close the new inbox when an old invitation acceptance finishes',async()=>{
 mock.inbox.invitations=[{id:'synthetic-invite',sent:false,status:'pending',actionable:true,tournament_name:'Alice table'}];
 await openSocial();const pending=deferred();mock.request.mockReturnValueOnce(pending.promise);
 const navigate=vi.fn();document.addEventListener('clubhouse-open-tournament',navigate);
 try{
  const form=document.querySelector('[data-social-form="accept"]');form.querySelector('input').value='Alice';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  await vi.waitFor(()=>expect(mock.request).toHaveBeenCalledWith('invite-accept',expect.anything()));
  mock.user=bob;mock.inbox={invitations:[],requests:[]};await connectSocial(bob);await openSocial();
  pending.resolve({code:'ABCDEFGH'});await new Promise(resolve=>setTimeout(resolve,0));
  expect(navigate).not.toHaveBeenCalled();expect(document.querySelector('.social-dialog').open).toBe(true);
 }finally{document.removeEventListener('clubhouse-open-tournament',navigate);}
});
it('does not reopen a panel when the prior account inbox resolves after a switch',async()=>{
 const pending=deferred();mock.request.mockReturnValueOnce(pending.promise);const opening=openSocial();
 await vi.waitFor(()=>expect(mock.request).toHaveBeenCalledOnce());mock.user=bob;await connectSocial(bob);
 pending.resolve({invitations:[],requests:[]});await opening;
 expect(document.querySelector('.social-dialog')?.open||false).toBe(false);
});
