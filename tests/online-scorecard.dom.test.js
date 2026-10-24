// @vitest-environment jsdom
import { beforeAll,describe,it,expect,vi } from 'vitest';
import { createRoom,joinRoom,startRoom,playRoom } from '../src/multiplayer/room.js';
const mock=vi.hoisted(()=>({room:null,userId:'host',callbacks:null}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/ui.js',()=>({
 openOnline:vi.fn(async(root,callbacks)=>{mock.callbacks=callbacks;callbacks.game(mock.room,mock.userId,true,true);}),
 sendOnline:vi.fn(async(action,expectedRevision)=>{
  mock.room=playRoom(mock.room,{userId:mock.userId,action,expectedRevision,commandId:'ui-score-command',time:'2026-09-16T12:00:00.000Z'});
  mock.callbacks.game(mock.room,mock.userId,true,true);return mock.room;
 }),
}));
import { saveCore } from '../src/core-store.js';
const click=selector=>{if(!document.querySelector(selector))document.querySelector('[data-action=game-menu]')?.click();expect(document.querySelector(selector)).not.toBeNull();document.querySelector(selector).click();};
beforeAll(async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 const time='2026-09-16T12:00:00.000Z';
 mock.room=startRoom(joinRoom(createRoom({id:'room-id',code:'ABCDEFGH',userId:'host',name:'Dan',time}),{userId:'guest',name:'Amber',time}),{userId:'host',time});
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});
describe('shared scorecard',()=>{
 it('saves through the server and cannot score for the next player',async()=>{
  click('[data-action="online"]');await vi.waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());
  expect(document.querySelector('thead [data-player-seat="0"]').classList.contains('turn-column')).toBe(true);
  expect(document.querySelector('tbody [data-score-key="aces"][data-score-seat="1"]').classList.contains('waiting-column')).toBe(true);
  click('[data-action="choose"][data-key="twos"]');click('[data-action="confirm-score"][data-value="8"]');
  await vi.waitFor(()=>expect(document.querySelector('[data-action="edit"][data-key="twos"]').textContent).toBe('8'));
  expect(document.querySelector('[data-action="choose"]')).toBeNull();
  expect(document.querySelector('thead [data-player-seat="0"]').classList.contains('waiting-column')).toBe(true);
  expect(document.querySelector('tbody [data-score-key="aces"][data-score-seat="1"]').classList.contains('turn-column')).toBe(true);
  expect(saveCore).not.toHaveBeenCalled();
 });
 it('shows other players’ scores read-only and blocks scoring while reconnecting',()=>{
  mock.userId='guest';mock.callbacks.game(mock.room,'guest',true,true);
  expect(document.querySelector('[data-action="edit"][data-seat="0"]')).toBeNull();
  expect(document.querySelector('[data-action="choose"][data-key="twos"]')).not.toBeNull();
  expect(document.querySelectorAll('.current-player')).toHaveLength(1);
  expect(document.querySelector('thead [data-player-seat="0"] .seat-status').textContent).toBe('WAITING');
  expect(document.querySelector('thead [data-player-seat="1"] .seat-status').textContent).toBe('YOUR TURN');
  expect(document.querySelector('[data-score-key="twos"][data-score-seat="0"] .recorded-score').textContent).toBe('8');
  expect(document.querySelector('[data-score-key="aces"][data-score-seat="0"] .score-placeholder').getAttribute('aria-label')).toContain('open');expect(document.querySelector('[data-score-key="aces"][data-score-seat="0"] button')).toBeNull();
  mock.callbacks.connection(false);
  expect(document.querySelector('[data-action="choose"]')).toBeNull();
  mock.callbacks.game(mock.room,'guest',true,false);
  expect(document.querySelector('[data-action="choose"]')).not.toBeNull();
 });
});

