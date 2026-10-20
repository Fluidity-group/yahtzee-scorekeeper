// @vitest-environment jsdom
import {beforeAll,beforeEach,it,expect,vi} from 'vitest';
import {BASE_KEYS} from '../src/game/categories.js';
import {createCoreGame,command} from '../src/game/core.js';
const mock=vi.hoisted(()=>({room:null,userId:'host',callbacks:null,saved:null}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async game=>{mock.saved=game;}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/ui.js',()=>({
 openOnline:vi.fn(async(root,callbacks)=>{mock.callbacks=callbacks;callbacks.game(mock.room,mock.userId,true,true);}),
 sendOnline:vi.fn(async action=>{
  let game=mock.room.game;
  if(!game.turn)game=command(game,{type:'start',seat:game.activeSeat},{id:crypto.randomUUID()});
  game=command(game,{...action,seat:game.activeSeat},{id:crypto.randomUUID()});
  mock.room={...mock.room,revision:mock.room.revision+1,game};mock.callbacks.game(mock.room,mock.userId,true,true);return mock.room;
 }),
}));
vi.mock('../src/dice/camera-panel.js',()=>({disconnectCamera:vi.fn(async()=>{})}));
import {sendOnline,openOnline} from '../src/multiplayer/ui.js';
import {saveCore,listCore} from '../src/core-store.js';
const click=selector=>{if(!document.querySelector(selector))document.querySelector('[data-action=game-menu]')?.click();const button=document.querySelector(selector);expect(button).not.toBeNull();button.click();};
const action=name=>{if(!document.querySelector('[data-action="'+name+'"]'))document.querySelector('[data-action=game-menu]')?.click();click('[data-action="'+name+'"]');};
const outcome=async face=>{click(`[data-action="final-chain-outcome"][data-face="${face}"]`);action('confirm-final-chain');await vi.waitFor(()=>{expect(document.querySelector('#coreDialog').open).toBe(false);expect(document.querySelector('#coreApp').hasAttribute('inert')).toBe(false);});};
function finalCategory({names=['Dan'],version=2}={}){
 let game=createCoreGame({id:crypto.randomUUID(),names,mode:'competition',rulesVersion:version});
 while(BASE_KEYS.some(key=>key!=='yahtzee'&&game.sheets[0][key]===undefined)){
  const seat=game.activeSeat,category=BASE_KEYS.find(key=>key!=='yahtzee'&&game.sheets[seat][key]===undefined);
  game=command(game,{type:'start',seat},{id:crypto.randomUUID()});game=command(game,{type:'score',seat,category,value:0},{id:crypto.randomUUID()});
 }
 return game;
}
function table(game){return {id:'room',code:'ABCDEFGH',revision:30,hostId:'host',members:game.players.map((player,seat)=>({userId:seat?'guest':'host',name:player.name})),game,capabilities:{rematch:true,tournaments:true,manualAttemptFinish:true},source:'manual'};}
async function scoreFinal(){const game=mock.room.game;delete game.sheets[0].chance;game.sheets[0].yahtzee=50;mock.callbacks.game(mock.room,mock.userId,true,true);action('another-yahtzee');click('[data-action="repeat-face"][data-face="6"]');click('[data-action="confirm-score"][data-value="30"]');await vi.waitFor(()=>{expect(document.querySelector('.final-chain-panel')).not.toBeNull();expect(document.querySelector('[data-action="final-chain-outcome"]').disabled).toBe(false);expect(document.querySelector('#coreDialog').open).toBe(false);});}
beforeAll(async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});
beforeEach(async()=>{vi.clearAllMocks();mock.saved=null;mock.userId='host';mock.room=table(finalCategory());action('online');await vi.waitFor(()=>{expect(openOnline).toHaveBeenCalledOnce();expect(document.querySelector('[data-action="choose"][data-key="yahtzee"]')).not.toBeNull();});});
it('scores a first final-category Yahtzee and offers the newly requested bonus attempt',async()=>{
 click('[data-action="choose"][data-key="yahtzee"]');click('[data-action="confirm-score"][data-value="50"]');await vi.waitFor(()=>expect(mock.room.game.finalChain).toEqual({seat:0,attempt:1}));expect(mock.room.game.sheets[0].yahtzee).toBe(50);expect(document.querySelector('.final-chain-panel')).not.toBeNull();expect(document.querySelector('.hosted-results')).toBeNull();
});
it('keeps a repeat final-category Yahtzee active until a full failed bonus attempt',async()=>{
 await scoreFinal();expect(mock.room.game.status).toBe('active');expect(mock.room.game.sheets[0].yahtzee).toBe(50);expect(document.querySelector('.hosted-results')).toBeNull();expect(document.querySelector('[data-action="another-yahtzee"]')).toBeNull();
 await outcome(0);expect(document.querySelector('.final-chain-panel').textContent).toContain('2 rolls remaining');expect(mock.room.game.status).toBe('active');
 await outcome(0);expect(document.querySelector('.final-chain-panel').textContent).toContain('1 roll remaining');expect(mock.room.game.status).toBe('active');
 await outcome(0);expect(mock.room.game.status).toBe('finished');expect(document.querySelector('.final-chain-panel')).toBeNull();expect(document.querySelector('.hosted-results')).not.toBeNull();expect(mock.room.game.sheets[0].yahtzeeBonus||0).toBe(100);
});
it('requires deliberate confirmation, lets Cancel keep the attempt, and renews after a Yahtzee on roll three',async()=>{
 await scoreFinal();click('[data-action="final-chain-outcome"][data-face="6"]');expect(sendOnline).toHaveBeenCalledTimes(1);expect(document.querySelector('#coreDialog').textContent).toContain('Five 6s');action('close');expect(mock.room.game.finalChain.attempt).toBe(1);expect(mock.room.game.sheets[0].yahtzeeBonus||0).toBe(100);
 await outcome(0);await outcome(0);await outcome(6);expect(mock.room.game.finalChain.attempt).toBe(2);expect(mock.room.game.turn).toBeNull();expect(mock.room.game.sheets[0].yahtzeeBonus).toBe(200);expect(document.querySelector('.final-chain-panel').textContent).toContain('3 rolls remaining');expect(document.querySelector('.hosted-results')).toBeNull();
 await outcome(1);expect(mock.room.game.finalChain.attempt).toBe(3);expect(mock.room.game.sheets[0].yahtzeeBonus).toBe(300);expect(document.querySelector('.final-chain-panel').textContent).toContain('Attempt 3');expect(mock.room.game.sheets[0].yahtzee).toBe(50);
});
it('shows the bonus chain read-only to the guest and keeps other players waiting until it ends',async()=>{
 mock.room=table(finalCategory({names:['Dan','Amber']}));
 // The host has its final category open; Amber still has her remaining categories.
 mock.room.game.activeSeat=0;mock.callbacks.game(mock.room,'host',true,true);await scoreFinal();
 expect(mock.room.game.activeSeat).toBe(0);expect(document.querySelector('[data-action="choose"]')).toBeNull();
 mock.userId='guest';mock.callbacks.game(mock.room,'guest',true,true);expect(document.querySelectorAll('[data-action="final-chain-outcome"]')).toHaveLength(0);expect(document.querySelector('.final-chain-panel').textContent).toContain('Waiting for Dan');expect(document.querySelector('[data-action="choose"]')).toBeNull();
 mock.userId='host';mock.callbacks.game(mock.room,'host',true,true);await outcome(0);await outcome(0);await outcome(0);expect(mock.room.game.finalChain).toBeNull();expect(mock.room.game.status).toBe('active');expect(mock.room.game.activeSeat).toBe(1);expect(document.querySelector('[data-action="choose"]')).toBeNull();
});
it('scores a qualifying repeat into the final category with one bonus before starting the final chain',async()=>{
 const game=finalCategory();delete game.sheets[0].chance;game.sheets[0].yahtzee=50;mock.room=table(game);mock.callbacks.game(mock.room,'host',true,true);
 action('another-yahtzee');click('[data-action="repeat-face"][data-face="5"]');expect(document.querySelector('[data-action="confirm-another"]')).toBeNull();expect(document.querySelector('#coreDialog h2').textContent).toBe('Chance');click('[data-action="confirm-score"][data-value="25"]');
 await vi.waitFor(()=>expect(document.querySelector('[data-action="final-chain-outcome"]')?.disabled).toBe(false));expect(mock.room.game.sheets[0].chance).toBe(25);expect(mock.room.game.sheets[0].yahtzeeBonus).toBe(100);expect(mock.room.game.finalChain.attempt).toBe(1);expect(mock.room.game.status).toBe('active');
});
it('disables report controls while paused or disconnected and clears pending confirmation when paused',async()=>{
 await scoreFinal();click('[data-action="final-chain-outcome"][data-face="2"]');expect(document.querySelector('#coreDialog').open).toBe(true);
 mock.room={...mock.room,revision:31,tournament:{name:'Weekend',gameCount:3,playerCount:2,status:'paused'}};mock.callbacks.game(mock.room,'host',true,true);
 expect(document.querySelector('#coreDialog').open).toBe(false);expect([...document.querySelectorAll('[data-action="final-chain-outcome"]')].every(button=>button.disabled)).toBe(true);expect(mock.room.game.finalChain.attempt).toBe(1);
 mock.room={...mock.room,revision:32,tournament:{...mock.room.tournament,status:'playing'}};mock.callbacks.game(mock.room,'host',true,true);mock.callbacks.connection(false);expect([...document.querySelectorAll('[data-action="final-chain-outcome"]')].every(button=>button.disabled)).toBe(true);
});
it('creates new local manual Competition under version two and explains its rules',async()=>{
 mock.callbacks.exit();document.querySelector('[data-action=home-local]').click();document.querySelector('[name="mode"]').value='competition';document.querySelector('[name="mode"]').dispatchEvent(new Event('change',{bubbles:true}));expect(document.querySelector('#modeDescription').textContent).toContain('three-roll attempt');
 document.querySelector('#createCore').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(saveCore).toHaveBeenCalled());expect(mock.saved.rules.version).toBe(2);action('rules');expect(document.querySelector('#coreDialog').textContent).toContain('version 2');expect(document.querySelector('#coreDialog').textContent).toContain('Score the final category first');action('close');
});
it('retains a saved version-one final turn and its original result behavior',async()=>{
 mock.callbacks.exit();const old=finalCategory({version:1});listCore.mockResolvedValue([old]);action('history');await vi.waitFor(()=>expect(document.querySelector('[data-action="load"]')).not.toBeNull());action('load');await vi.waitFor(()=>expect(document.querySelector('#coreDialog').open).toBe(false));action('rules');expect(document.querySelector('#coreDialog').textContent).toContain('version 1');expect(document.querySelector('#coreDialog').textContent).not.toContain('three-roll attempt');action('close');
 click('[data-action="choose"][data-key="yahtzee"]');click('[data-action="confirm-score"][data-value="50"]');await vi.waitFor(()=>expect(document.querySelector('.compact-result')).not.toBeNull());expect(mock.saved.rules.version).toBe(1);expect(mock.saved.status).toBe('finished');expect(document.querySelector('.final-chain-panel')).toBeNull();
});

it('confirms a whole failed bonus attempt once, returns control to the other player and preserves the original bonus',async()=>{
 mock.room=table(finalCategory({names:['Dan','Kay']}));mock.room.game.activeSeat=0;mock.callbacks.game(mock.room,'host',true,true);await scoreFinal();
 action('final-chain-finish');expect(document.querySelector('#coreDialog').textContent).toContain('ends only your turn');
 action('confirm-final-chain');await vi.waitFor(()=>expect(mock.room.game.activeSeat).toBe(1));
 expect(mock.room.game.finalChain).toBeNull();expect(mock.room.game.status).toBe('active');expect(mock.room.game.sheets[0].yahtzeeBonus).toBe(100);
 expect(sendOnline.mock.calls.at(-1)[0]).toMatchObject({type:'final-chain-roll',face:null,finishAttempt:true});
});
