// @vitest-environment jsdom
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {createRoom,startRoom} from '../src/multiplayer/room.js';
const mock=vi.hoisted(()=>({listener:null,onRoom:null,stop:vi.fn(),lookup:vi.fn(),request:vi.fn(),login:vi.fn()}));
vi.mock('../src/multiplayer/client.js',()=>({
 configured:true,webUrl:'https://example.test/',emailOtpEnabled:false,
 auth:{getSession:mock.lookup,signInWithPassword:mock.login,onAuthStateChange:fn=>{mock.listener=fn;return {data:{subscription:{unsubscribe:vi.fn()}}};}},
 requestRoom:mock.request,watchRoom:(code,fn)=>{mock.onRoom=fn;return mock.stop;}
}));
vi.mock('qrcode',()=>({default:{toCanvas:async()=>{}}}));
import {openOnline,leaveOnline,sendOnline} from '../src/multiplayer/ui.js';
let callbacks,room;
const alice={id:'alice',email:'alice@example.test'},bob={id:'bob',email:'bob@example.test'};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
beforeEach(()=>{
 leaveOnline();vi.clearAllMocks();document.body.innerHTML='<div id="root"></div>';
 callbacks={game:vi.fn(),connection:vi.fn(),notice:vi.fn(),account:vi.fn(),table:vi.fn()};
 room=startRoom(createRoom({id:'synthetic-room',code:'ABCDEFGH',userId:'alice',name:'Alice',time:'2026-10-27T12:00:00Z'}),{userId:'alice',time:'2026-10-27T12:00:00Z'});
 mock.lookup.mockResolvedValue({data:{session:{user:alice}}});mock.request.mockResolvedValue({room});
});
afterEach(()=>leaveOnline());
const open=()=>openOnline(document.querySelector('#root'),callbacks,'ABCDEFGH','return-table');
it('drops buffered realtime from the prior account and opens the replacement account home',async()=>{
 await open();const oldUpdate=mock.onRoom;callbacks.game.mockClear();
 mock.listener('SIGNED_IN',{user:bob});oldUpdate({...room,revision:room.revision+1});
 expect(callbacks.game).not.toHaveBeenCalled();expect(mock.stop).toHaveBeenCalledOnce();
 await vi.waitFor(()=>expect(document.querySelector('.mp-account')?.textContent).toContain('bob@example.test'));
 expect(mock.request).toHaveBeenCalledOnce();
 await expect(sendOnline({type:'score',category:'aces',value:3},room.revision)).rejects.toThrow('Reconnecting');
});
it.each(['SIGNED_IN','SIGNED_OUT'])('ignores pending room reads across %s',async event=>{
 const pending=deferred();mock.request.mockReturnValueOnce(pending.promise);
 const opening=open();await vi.waitFor(()=>expect(mock.request).toHaveBeenCalledOnce());
 mock.listener(event,event==='SIGNED_OUT'?null:{user:bob});pending.resolve({room});await opening;
 expect(callbacks.game).not.toHaveBeenCalled();
 await vi.waitFor(()=>expect(event==='SIGNED_OUT'?document.querySelector('[data-mp-form="password"]'):document.querySelector('.mp-account')).not.toBeNull());
});
it('ignores an old mutation result and allows new-account navigation while it is pending',async()=>{
 await open();const pending=deferred();mock.request.mockReturnValueOnce(pending.promise);callbacks.game.mockClear();
 const sending=sendOnline({type:'score',category:'aces',value:3},room.revision,'synthetic-command');
 mock.listener('SIGNED_IN',{user:bob});
 await vi.waitFor(()=>expect(document.querySelector('[data-mp="host"]')).not.toBeNull());
 document.querySelector('[data-mp="host"]').click();expect(document.querySelector('[data-mp-form="host"]')).not.toBeNull();
 pending.resolve({room:{...room,revision:room.revision+1}});await sending;
 expect(callbacks.game).not.toHaveBeenCalled();expect(document.querySelector('[data-mp-form="host"]')).not.toBeNull();
});
it('invalidates a pending session lookup on sign-out',async()=>{
 const pending=deferred();mock.lookup.mockReturnValueOnce(pending.promise);
 const opening=open();mock.listener('SIGNED_OUT',null);pending.resolve({data:{session:{user:alice}}});await opening;
 expect(mock.request).not.toHaveBeenCalled();expect(document.querySelector('[data-mp-form="password"]')).not.toBeNull();
});
it.each(['TOKEN_REFRESHED','SIGNED_IN'])('keeps a same-user table subscribed and playable on %s',async event=>{
 await open();callbacks.game.mockClear();mock.listener(event,{user:{...alice}});
 expect(mock.stop).not.toHaveBeenCalled();mock.onRoom({...room,revision:room.revision+1});
 expect(callbacks.game).toHaveBeenCalledWith(expect.objectContaining({code:room.code}),alice.id,true,true);
 await sendOnline({type:'score',category:'aces',value:3},room.revision+1,'synthetic-command');
 expect(mock.request.mock.calls.at(-1)[0]).toMatchObject({operation:'command',code:room.code});
});
it('preserves explicit join intent through a real sign-in event before the login promise resolves',async()=>{
 mock.lookup.mockResolvedValueOnce({data:{session:null}});
 await openOnline(document.querySelector('#root'),callbacks,'ABCDEFGH');
 mock.login.mockImplementationOnce(async()=>{mock.listener('SIGNED_IN',{user:alice});return {data:{user:alice}};});
 document.querySelector('[name="email"]').value=alice.email;document.querySelector('[name="password"]').value='synthetic-password';
 document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(document.querySelector('[data-mp-form="join"] [name="code"]')?.value).toBe('ABCDEFGH'));
 expect(mock.request).not.toHaveBeenCalled();
});
it('ignores a retired auth listener after a different online opening',async()=>{
 await open();const oldAuth=mock.listener;
 await openOnline(document.querySelector('#root'),callbacks);oldAuth('SIGNED_OUT',null);
 expect(document.querySelector('.mp-account')?.textContent).toContain('alice@example.test');
});
it('continues observing account changes after returning from setup to multiplayer home',async()=>{
 await openOnline(document.querySelector('#root'),callbacks);
 document.querySelector('[data-mp="host"]').click();document.querySelector('[data-mp="home"]').click();
 mock.listener('SIGNED_IN',{user:bob});
 await vi.waitFor(()=>expect(document.querySelector('.mp-account')?.textContent).toContain(bob.email));
});
