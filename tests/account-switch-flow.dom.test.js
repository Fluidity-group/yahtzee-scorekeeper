// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {createCoreGame} from '../src/game/core.js';
import {createRoom,startRoom} from '../src/multiplayer/room.js';
const fixture=vi.hoisted(()=>({listeners:[],room:null,resolveScore:null}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(),loadCore:async()=>createCoreGame({id:'local-only',names:['Local']}),listCore:async()=>[]}));
vi.mock('../src/multiplayer/client.js',()=>({
 configured:true,emailOtpEnabled:false,webUrl:'https://example.test/',
 auth:{getSession:async()=>({data:{session:{user:{id:'alice',email:'alice@example.test'}}}}),onAuthStateChange:fn=>{fixture.listeners.push(fn);return {data:{subscription:{unsubscribe(){fixture.listeners=fixture.listeners.filter(listener=>listener!==fn);}}}};}},
 watchRoom:()=>()=>{},watchSocial:()=>()=>{},requestSocial:async()=>({invitations:[],requests:[]}),
 requestRoom:vi.fn(async body=>body.operation==='sessions'?{rooms:[fixture.room],nextBefore:null}:body.operation==='history'?{games:[],nextBefore:null}:body.operation==='command'?new Promise(resolve=>{fixture.resolveScore=resolve;}):{room:fixture.room})
}));
vi.mock('qrcode',()=>({default:{toCanvas:async()=>{}}}));
import {saveCore} from '../src/core-store.js';
it('closes prior-account scoring and prevents its late save cleanup from restoring an editable local copy',async()=>{
 vi.stubEnv('MODE','ios-test');localStorage.clear();
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 fixture.room=startRoom(createRoom({id:'online-only',code:'ABCDEFGH',userId:'alice',name:'Alice',time:'2026-10-27T12:00:00Z'}),{userId:'alice',time:'2026-10-27T12:00:00Z'});
 try{
  await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.yahtz-home')).not.toBeNull());
  document.querySelector('[data-action="saved-sessions"]').click();await vi.waitFor(()=>expect(document.querySelector('[data-mp="resume"]')).not.toBeNull());
  document.querySelector('[data-mp="resume"]').click();await vi.waitFor(()=>expect(document.querySelector('.phone-scorecard')).not.toBeNull());
  document.querySelector('[data-action="choose"][data-key="twos"]').click();document.querySelector('[data-action="confirm-score"][data-value="6"]').click();
  await vi.waitFor(()=>expect(fixture.resolveScore).toBeTypeOf('function'));
  for(const listener of [...fixture.listeners])listener('SIGNED_IN',{user:{id:'bob',email:'bob@example.test'}});
  expect(document.querySelector('#coreDialog').open).toBe(false);
  await vi.waitFor(()=>expect(document.querySelector('.mp-account')?.textContent).toContain('bob@example.test'));
  fixture.resolveScore({room:{...fixture.room,revision:fixture.room.revision+1}});
  await vi.waitFor(()=>expect(document.querySelector('#coreApp').hasAttribute('inert')).toBe(false));
  expect(document.querySelector('.phone-scorecard')).toBeNull();expect(document.querySelector('.mp-account')?.textContent).toContain('bob@example.test');
  document.querySelector('[data-mp="exit"]').click();await vi.waitFor(()=>expect(document.querySelector('.yahtz-home')).not.toBeNull());
  expect(document.querySelector('[data-action="resume-game"]').textContent).toContain('Local');expect(saveCore).not.toHaveBeenCalled();
 }finally{vi.unstubAllEnvs();}
});
