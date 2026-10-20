// @vitest-environment jsdom
import {beforeAll,beforeEach,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
const mock=vi.hoisted(()=>({room:null,userId:'host',callbacks:null}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/ui.js',()=>({
 openOnline:vi.fn(async(root,callbacks)=>{mock.callbacks=callbacks;callbacks.game(mock.room,mock.userId,true,true);}),
 sendOnline:vi.fn(async(action,expectedRevision)=>{mock.room=playRoom(mock.room,{userId:mock.userId,action,expectedRevision,gameId:mock.room.game.id,commandId:crypto.randomUUID(),time:'2026-10-14T12:00:00Z'});mock.callbacks.game(mock.room,mock.userId,true,true);return mock.room;}),
}));
import {openOnline,sendOnline} from '../src/multiplayer/ui.js';
import {saveCore} from '../src/core-store.js';
const click=selector=>{if(!document.querySelector(selector))document.querySelector('[data-action=game-menu]')?.click();const button=document.querySelector(selector);expect(button).not.toBeNull();button.click();};
const action=name=>{if(!document.querySelector('[data-action="'+name+'"]'))document.querySelector('[data-action=game-menu]')?.click();click('[data-action="'+name+'"]');};
async function score(key,value){click(`[data-action="choose"][data-key="${key}"]`);click(`[data-action="confirm-score"][data-value="${value}"]`);await vi.waitFor(()=>{expect(document.querySelector('#coreDialog').open).toBe(false);expect(document.querySelector('#coreApp').hasAttribute('inert')).toBe(false);});}
function openLastScore(key){click('[data-action="edit"][data-key="'+key+'"]');expect(document.querySelector('#coreDialog [data-action="undo-last-score"]')).not.toBeNull();}
async function undo(){if(!document.querySelector('#coreDialog').open){const key=mock.room.game.events.filter(e=>e.type==='score').at(-1)?.category||'fullHouse';openLastScore(key);}action('undo-last-score');expect(document.querySelector('#coreDialog').textContent).toContain('Reopen');action('confirm-undo-score');await vi.waitFor(()=>expect(document.querySelector('#coreDialog').open).toBe(false));}
beforeAll(async()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());});
beforeEach(async()=>{
 vi.clearAllMocks();mock.userId='host';const time='2026-10-14T12:00:00Z';mock.room={...startRoom(joinRoom(createRoom({id:'r',code:'ABCDEFGH',userId:'host',name:'Dan',time}),{userId:'guest',name:'Amber',time}),{userId:'host',time}),capabilities:{undoScore:true}};
 action('online');await vi.waitFor(()=>expect(openOnline).toHaveBeenCalledOnce());
});
it('shows pending save, restores controls after failure and retries the same draft command ID',async()=>{
 let reject;sendOnline.mockImplementationOnce(()=>new Promise((_,no)=>{reject=no;}));
 click('[data-action="choose"][data-key="fives"]');click('[data-action="confirm-score"][data-value="15"]');
 await vi.waitFor(()=>expect(reject).toBeTypeOf('function'));
 const first=sendOnline.mock.calls.at(-1);expect(document.querySelector('#coreDialog').getAttribute('aria-busy')).toBe('true');expect(document.querySelector('[data-score-save-status]').textContent).toContain('Saving score');
 reject(Error('Could not reach the multiplayer server.'));
 await vi.waitFor(()=>expect(document.querySelector('#coreDialog').hasAttribute('aria-busy')).toBe(false));
 expect(document.querySelector('#coreApp').hasAttribute('inert')).toBe(false);expect(document.querySelector('[data-action="confirm-score"][data-value="15"]').disabled).toBe(false);
 click('[data-action="confirm-score"][data-value="15"]');await vi.waitFor(()=>expect(document.querySelector('#coreDialog').open).toBe(false));
 expect(sendOnline.mock.calls.at(-1)[2]).toBe(first[2]);expect(mock.room.game.sheets[0].fives).toBe(15);
});
it('opens precise bonus facts from the graphical meter without changing a score',()=>{
 const before=JSON.stringify(mock.room.game);document.querySelector('.own-bonus-summary .upper-total-guide').dispatchEvent(new MouseEvent('click',{bubbles:true}));
 expect(document.querySelector('#coreDialog').textContent).toContain('Reach 63 upper points');expect(document.querySelector('#coreDialog').textContent).toContain('Dan');expect(document.querySelector('#coreDialog').textContent).toContain('Amber');
 expect(JSON.stringify(mock.room.game)).toBe(before);expect(sendOnline).not.toHaveBeenCalled();document.querySelector('#coreDialog').close();
});
it('lets the score owner undo a scratch after turn handoff, reopen the category, and choose another score',async()=>{
 await score('smallStraight',0);expect(document.querySelector('.game-bottom-actions')).toBeNull();expect(mock.room.game.activeSeat).toBe(1);expect(document.querySelector('[data-action="undo-last-score"]')).toBeNull();
 await undo();expect(mock.room.game.activeSeat).toBe(0);expect(mock.room.game.sheets[0].smallStraight).toBeUndefined();expect(mock.room.game.events.some(event=>event.type==='score-undo')).toBe(true);expect(document.querySelector('[data-action="choose"][data-key="smallStraight"]')).not.toBeNull();
 await score('fullHouse',25);expect(mock.room.game.sheets[0].fullHouse).toBe(25);expect(mock.room.game.sheets[0].smallStraight).toBeUndefined();expect(mock.room.game.activeSeat).toBe(1);
});
it('clears an incorrect Yahtzee celebration only after accepted Undo',async()=>{
 await score('yahtzee',50);expect(document.querySelector('[data-score-key="yahtzee"][data-score-seat="0"]').classList.contains('pulse-yahtzee')).toBe(true);expect(document.querySelector('.pulse-emblem-yahtzee')).not.toBeNull();openLastScore('yahtzee');action('undo-last-score');expect(document.querySelector('[data-score-key="yahtzee"][data-score-seat="0"]').classList.contains('pulse-yahtzee')).toBe(true);expect(document.querySelector('.pulse-emblem-yahtzee')).not.toBeNull();action('confirm-undo-score');await vi.waitFor(()=>expect(document.querySelector('#coreDialog').open).toBe(false));expect(document.querySelector('#gameCelebration').textContent).toBe('');expect(document.querySelectorAll('.accepted-score,.pulse-emblem')).toHaveLength(0);expect(mock.room.game.sheets[0].yahtzee).toBeUndefined();
});
it('targets the replacement score when correcting an undone and rescored category',async()=>{
 await score('twos',8);const old=mock.room.game.events.find(event=>event.type==='score').id;await undo();await score('twos',10);const newest=mock.room.game.events.filter(event=>event.type==='score').at(-1).id;
 click('[data-action="edit"][data-key="twos"]');expect(document.querySelector('#coreDialog [data-action="undo-last-score"]')).not.toBeNull();click('[data-action="confirm-score"][data-value="6"]');await vi.waitFor(()=>expect(document.querySelector('#coreDialog').open).toBe(false));
 expect(sendOnline.mock.calls.at(-1)[0]).toMatchObject({type:'correct-score',target:newest,value:6});expect(newest).not.toBe(old);expect(mock.room.game.sheets[0].twos).toBe(6);
});
it('hides another player’s Undo, expires it after their next score, and locks Undo while paused or unsupported',async()=>{
 await score('twos',8);mock.userId='guest';mock.callbacks.game(mock.room,'guest',true,true);expect(document.querySelector('[data-action="undo-last-score"]')).toBeNull();await score('fullHouse',25);
 mock.userId='host';mock.callbacks.game(mock.room,'host',true,true);click('[data-action="edit"][data-key="twos"]');expect(document.querySelector('#coreDialog [data-action="undo-last-score"]')).toBeNull();document.querySelector('#coreDialog').close();
 mock.userId='guest';mock.room={...mock.room,tournament:{name:'Weekend',gameCount:3,playerCount:2,status:'paused'}};mock.callbacks.game(mock.room,'guest',true,true);expect(document.querySelector('[data-action="edit"][data-key="fullHouse"]').disabled).toBe(true);expect(document.querySelector('[data-action="tournament-resume"]')).toBeNull();
 mock.room={...mock.room,capabilities:{undoScore:false}};mock.callbacks.game(mock.room,'guest',true,true);expect(document.querySelector('[data-action="undo-last-score"]')).toBeNull();
});
it('also reopens the latest score and returns the original turn in local manual Standard play',async()=>{
 mock.callbacks.exit();document.querySelector('[data-action=home-local]').click();document.querySelector('#createCore').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('#createCore')).toBeNull());await score('fullHouse',25);expect(document.querySelector('.game-bottom-actions')).toBeNull();openLastScore('fullHouse');await undo();
 const saved=saveCore.mock.calls.at(-1)[0];expect(saved.mode).toBe('standard');expect(saved.activeSeat).toBe(0);expect(saved.sheets[0].fullHouse).toBeUndefined();expect(document.querySelector('[data-action="choose"][data-key="fullHouse"]')).not.toBeNull();expect(sendOnline).not.toHaveBeenCalled();
});
