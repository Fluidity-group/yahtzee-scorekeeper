// @vitest-environment jsdom
import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
const host='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222',roomId='33333333-3333-4333-8333-333333333333';
const mock=vi.hoisted(()=>({callbacks:null,room:null,request:vi.fn(),getAccessToken:vi.fn(),update:vi.fn(),open:vi.fn(async()=>true),dispose:vi.fn(),allowGreeting:vi.fn(async()=>true),auth:{getSession:vi.fn()}}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:mock.auth}));
vi.mock('../src/commentary/authenticated-transport.js',()=>({createAuthenticatedCommentaryTransport:vi.fn(()=>({request:mock.request,getAccessToken:mock.getAccessToken}))}));
vi.mock('../src/ui/hosted-commentary-session.js',()=>({createHostedCommentarySession:vi.fn(()=>({update:mock.update,open:mock.open,dispose:mock.dispose,allowGreeting:mock.allowGreeting}))}));
vi.mock('../src/multiplayer/ui.js',()=>({
 openOnline:vi.fn(async(_root,callbacks)=>{mock.callbacks=callbacks;callbacks.account({id:host});callbacks.game(mock.room,host,true,true);}),
 sendOnline:vi.fn(async(action,expectedRevision)=>{mock.room=playRoom(mock.room,{userId:host,action,expectedRevision,gameId:mock.room.game.id,commandId:crypto.randomUUID(),time:'2026-10-14T20:00:00.000Z'});mock.callbacks.game(mock.room,host,true,true);return mock.room;}),
}));
import {createHostedCommentarySession} from '../src/ui/hosted-commentary-session.js';
import {createAuthenticatedCommentaryTransport} from '../src/commentary/authenticated-transport.js';
const click=selector=>{if(!document.querySelector(selector))document.querySelector('[data-action=game-menu]')?.click();const el=document.querySelector(selector);expect(el).not.toBeNull();el.click();};
beforeAll(async()=>{
 vi.stubEnv('VITE_COMMENTARY_URL','https://service.example.test/live-commentary');
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 const time='2026-10-14T20:00:00.000Z';mock.room={...startRoom(joinRoom(createRoom({id:roomId,code:'ABCDEFGH',userId:host,name:'Ann',time}),{userId:guest,name:'Bo',time}),{userId:host,time}),capabilities:{undoScore:true}};
 // A pending commentary subscriber must never become a scoring dependency.
 mock.update.mockImplementation(()=>new Promise(()=>{}));
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});
afterAll(()=>{window.dispatchEvent(new Event('pagehide'));vi.unstubAllEnvs();});
it('wires configured authenticated room/menu/connection/visibility/signout without waiting for commentary in scoring',async()=>{
 click('[data-action="online"]');await vi.waitFor(()=>expect(createHostedCommentarySession).toHaveBeenCalledOnce());
 expect(createAuthenticatedCommentaryTransport).toHaveBeenCalledWith({auth:mock.auth,serviceBase:'https://service.example.test/live-commentary',directReaction:false,anonymousKey:expect.any(String)});
 expect(createHostedCommentarySession.mock.calls[0][0].nativeAudioAvailable).toBe(false);
 expect(mock.update).toHaveBeenCalledWith({room:mock.room,userId:host,connected:true,visible:!document.hidden});
 click('[data-action="choose"][data-key="fullHouse"]');const scoreDialog=document.querySelector('#coreDialog');expect(scoreDialog.open).toBe(true);click('[data-action="game-menu"]');expect(mock.open).not.toHaveBeenCalled();expect(scoreDialog.open).toBe(true);expect(scoreDialog.textContent).toContain('Full House');
 click('#coreDialog [data-action="confirm-score"][data-value="25"]');await vi.waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="fullHouse"]').textContent).toBe('25'));expect(scoreDialog.open).toBe(false);expect(document.querySelector('#coreApp').hasAttribute('inert')).toBe(false);
 click('[data-action="commentary-settings"]');await vi.waitFor(()=>expect(mock.open).toHaveBeenCalledWith({scoreDialog}));
 mock.callbacks.connection(false);expect(mock.update.mock.calls.at(-1)[0].connected).toBe(false);
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));expect(mock.update.mock.calls.at(-1)[0].visible).toBe(false);
 Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));expect(mock.update.mock.calls.at(-1)[0].visible).toBe(true);
 mock.callbacks.account(null);expect(mock.dispose).toHaveBeenCalled();expect(mock.request).not.toHaveBeenCalled();expect(mock.getAccessToken).not.toHaveBeenCalled();
});
