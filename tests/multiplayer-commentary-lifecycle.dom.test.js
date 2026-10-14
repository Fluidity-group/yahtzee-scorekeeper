// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom} from '../src/multiplayer/room.js';
const host='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222',roomId='33333333-3333-4333-8333-333333333333',time='2026-10-14T20:00:00.000Z';
const mock=vi.hoisted(()=>({room:null,watch:null,authListener:null,unsubscribe:vi.fn()}));
vi.mock('../src/multiplayer/client.js',()=>({
 configured:true,webUrl:'https://clubhouse.example.test/',emailOtpEnabled:false,
 auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'11111111-1111-4111-8111-111111111111',email:'host@example.test'}}}})),onAuthStateChange:vi.fn(callback=>{mock.authListener=callback;return {data:{subscription:{unsubscribe:mock.unsubscribe}}};})},
 watchRoom:vi.fn((_code,callback)=>{mock.watch=callback;return vi.fn();}),
 requestRoom:vi.fn(async payload=>{
  if(payload.operation==='join'||payload.operation==='read')return {room:mock.room};
  if(payload.operation==='start'){mock.room=startRoom(mock.room,{userId:'11111111-1111-4111-8111-111111111111',time:'2026-10-14T20:00:00.000Z'});mock.room={...mock.room,capabilities:{commentaryAtomicCommit:true},commentaryLifecycle:{commandId:payload.commandId,purpose:'opening',acceptedRoomRevision:mock.room.revision,gameId:mock.room.game.id}};return {room:mock.room,acceptedCommandId:payload.commandId,acceptedRoomRevision:mock.room.revision};}
  throw Error('Unexpected mutation');
 }),
}));
vi.mock('qrcode',()=>({default:{toCanvas:vi.fn(async()=>{})}}));
import {requestRoom} from '../src/multiplayer/client.js';
import {openOnline,leaveOnline} from '../src/multiplayer/ui.js';
const click=selector=>{const el=document.querySelector(selector);expect(el).not.toBeNull();el.click();};
let root,callbacks;
beforeEach(()=>{leaveOnline();vi.clearAllMocks();localStorage.clear();Object.defineProperty(document,'hidden',{configurable:true,value:false});mock.room=joinRoom(createRoom({id:roomId,code:'ABCDEFGH',userId:host,name:'Ann',time}),{userId:guest,name:'Bo',time});document.body.innerHTML='<div id="root"></div>';root=document.querySelector('#root');callbacks={game:vi.fn(),connection:vi.fn(),greeting:vi.fn(),table:vi.fn(),account:vi.fn(),notice:vi.fn(),exit:vi.fn()};});
afterEach(()=>leaveOnline());
async function join(){await openOnline(root,callbacks);click('[data-mp="join"]');root.querySelector('[name="code"]').value='ABCDEFGH';root.querySelector('[name="name"]').value='Ann';root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(mock.watch).toBeTypeOf('function'));}
it('sends one stable start command ID and forwards only the accepted server lifecycle marker',async()=>{
 await join();const revision=mock.room.revision;click('[data-mp="start"]');await vi.waitFor(()=>expect(callbacks.greeting).toHaveBeenCalledOnce());const payload=requestRoom.mock.calls.find(([p])=>p.operation==='start')[0];expect(payload).toMatchObject({operation:'start',code:'ABCDEFGH',expectedRevision:revision,rulesVersion:1});expect(payload.commandId).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
 expect(callbacks.greeting).toHaveBeenCalledWith({sourceCommandId:payload.commandId,gameId:mock.room.game.id});expect(callbacks.game).toHaveBeenCalledWith(mock.room,host,true,true);
});
it('initial existing-game hydration stays quiet, and auth sign-out invalidates account/table callbacks',async()=>{
 mock.room={...startRoom(mock.room,{userId:host,time}),capabilities:{commentaryAtomicCommit:true}};mock.room.commentaryLifecycle={commandId:'old_opening_command',purpose:'opening',acceptedRoomRevision:mock.room.revision,gameId:mock.room.game.id};await join();await vi.waitFor(()=>expect(callbacks.game).toHaveBeenCalled());expect(callbacks.greeting).not.toHaveBeenCalled();mock.authListener('SIGNED_OUT',null);expect(callbacks.account).toHaveBeenLastCalledWith(null);expect(callbacks.table).toHaveBeenLastCalledWith(null);expect(document.body.textContent).toContain('Your seat is waiting');
});
it('foreground hydration is quiet while a later continuous accepted resume may greet once',async()=>{
 mock.room={...startRoom(mock.room,{userId:host,time}),capabilities:{commentaryAtomicCommit:true},tournament:{status:'paused'}};await join();await vi.waitFor(()=>expect(callbacks.game).toHaveBeenCalled());Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
 mock.room={...mock.room,revision:mock.room.revision+1,tournament:{status:'playing'},commentaryLifecycle:{commandId:'hidden_resume_command',purpose:'return',acceptedRoomRevision:mock.room.revision+1,gameId:mock.room.game.id}};Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));await vi.waitFor(()=>expect(callbacks.game).toHaveBeenCalledTimes(2));expect(callbacks.greeting).not.toHaveBeenCalled();
 mock.room={...mock.room,revision:mock.room.revision+1,tournament:{status:'paused'}};mock.watch(mock.room);mock.room={...mock.room,revision:mock.room.revision+1,tournament:{status:'playing'},commentaryLifecycle:{commandId:'fresh_resume_command',purpose:'return',acceptedRoomRevision:mock.room.revision+1,gameId:mock.room.game.id}};mock.watch(mock.room);expect(callbacks.greeting).toHaveBeenCalledOnce();expect(callbacks.greeting).toHaveBeenCalledWith({sourceCommandId:'fresh_resume_command',gameId:mock.room.game.id});
});
