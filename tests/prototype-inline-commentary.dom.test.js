// @vitest-environment jsdom
import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
const host='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222',roomId='33333333-3333-4333-8333-333333333333';
const mock=vi.hoisted(()=>({callbacks:null,room:null,request:vi.fn(),getAccessToken:vi.fn(),jobs:[],feedbackValue:null,auth:{getSession:vi.fn()}}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({auth:mock.auth}));
vi.mock('../src/commentary/authenticated-transport.js',()=>({createAuthenticatedCommentaryTransport:vi.fn(()=>({request:mock.request,getAccessToken:mock.getAccessToken}))}));
vi.mock('../src/multiplayer/ui.js',()=>({
 openOnline:vi.fn(async(_root,callbacks)=>{mock.callbacks=callbacks;callbacks.account({id:host});callbacks.game(mock.room,host,true,true);}),
 sendOnline:vi.fn(async(action,expectedRevision)=>{mock.room=playRoom(mock.room,{userId:host,action,expectedRevision,gameId:mock.room.game.id,commandId:crypto.randomUUID(),time:'2026-10-14T20:00:00.000Z'});mock.callbacks.game(mock.room,host,true,true);return mock.room;}),
}));
import {createAuthenticatedCommentaryTransport} from '../src/commentary/authenticated-transport.js';
const click=selector=>{const el=document.querySelector(selector);expect(el).not.toBeNull();el.click();};
beforeAll(async()=>{
 vi.stubEnv('VITE_COMMENTARY_URL','https://service.example.test/live-commentary');
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
 const time='2026-10-14T20:00:00.000Z';mock.room={...startRoom(joinRoom(createRoom({id:roomId,code:'ABCDEFGH',userId:host,name:'Ann',time}),{userId:guest,name:'Bo',time}),{userId:host,time}),capabilities:{undoScore:true}};
 // A pending commentary subscriber must never become a scoring dependency.
 mock.request.mockImplementation(async p=>{
 if(p.operation==='profile-read')return {result:{schemaVersion:1,version:1,enabled:true,humorIntensity:'dark',profanityAllowed:true,frequency:'balanced',voiceOption:'rachel',capabilities:{providerMode:'disabled',liveProviders:false}}};
 if(p.operation==='jobs-read')return {result:mock.jobs};
 if(p.operation==='player-profile-read')return {result:{version:0,displayName:'',gender:'',blurb:'',shareWithRoom:false}};
 if(p.operation==='feedback'){mock.jobs=mock.jobs.map(j=>({...j,feedbackValue:p.value}));return {result:{accepted:true}};}
 return {result:{accepted:true}};
 });
 mock.room=playRoom(mock.room,{userId:host,action:{type:'score',category:'chance',value:25,id:crypto.randomUUID()},expectedRevision:mock.room.revision,gameId:mock.room.game.id,commandId:crypto.randomUUID(),time});
 mock.room=playRoom(mock.room,{userId:guest,action:{type:'score',category:'chance',value:20,id:crypto.randomUUID()},expectedRevision:mock.room.revision,gameId:mock.room.game.id,commandId:crypto.randomUUID(),time});
 const event=mock.room.game.events.find(e=>e.type==='score');mock.jobs=[{id:'55555555-5555-4555-8555-555555555555',gameId:mock.room.game.id,eventId:event.id,dependencyEventIds:[event.id],profileVersion:1,status:'completed',caption:'That score has a pulse.',feedbackBasis:'playback'}];
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});
afterAll(()=>{window.dispatchEvent(new Event('pagehide'));vi.unstubAllEnvs();});
it('renders actual game inline feedback across score renders without opening a drawer or disturbing centered input',async()=>{
 click('[data-action="online"]');await vi.waitFor(()=>expect(document.querySelector('.hosted-commentary-inline p')?.textContent).toBe('That score has a pulse.'));
 expect(document.querySelector('.hosted-commentary-drawer')).toBeNull();
 click('[data-hosted-commentary-inline] [data-caption-feedback="like"]');await vi.waitFor(()=>expect(mock.request.mock.calls.some(([p])=>p.operation==='feedback'&&p.basis==='playback'&&p.value==='like')).toBe(true));
 click('[data-action="choose"][data-key="fullHouse"]');const score=document.querySelector('#coreDialog');expect(score.open).toBe(true);expect([...document.querySelectorAll('[data-hosted-commentary-inline] button')].every(b=>b.disabled)).toBe(true);
 click('#coreDialog [data-action="confirm-score"][data-value="25"]');await vi.waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="fullHouse"]').textContent).toBe('25'));
 expect(score.open).toBe(false);expect(document.querySelector('.hosted-commentary-inline p').textContent).toBe('That score has a pulse.');expect(document.querySelector('[data-hosted-commentary-inline] [data-caption-feedback="like"]').disabled).toBe(false);
 click('[data-inline-commentary-more]');await vi.waitFor(()=>expect(document.querySelector('[data-hosted-personal]')).not.toBeNull());
 mock.callbacks.account(null);expect(document.querySelector('.hosted-commentary-inline')).toBeNull();
});
