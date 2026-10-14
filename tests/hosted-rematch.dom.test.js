// @vitest-environment jsdom
import {beforeAll,beforeEach,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {setRematchReady} from '../src/multiplayer/rematch.js';
import {BASE_KEYS} from '../src/game/categories.js';
const mock=vi.hoisted(()=>({room:null,userId:'host',callbacks:null}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/ui.js',()=>({
 openOnline:vi.fn(async(root,callbacks)=>{mock.callbacks=callbacks;callbacks.game(mock.room,mock.userId,true,true);}),
 setOnlineReady:vi.fn(async ready=>{mock.room=setRematchReady(mock.room,{userId:mock.userId,gameId:mock.room.game.id,gameRevision:mock.room.game.revision,commandId:'ui-ready-command',nextGameId:'next-game',ready,time:'2026-10-13T18:00:00.000Z'});mock.callbacks.game(mock.room,mock.userId,true,true);return mock.room;}),
 onlineHistory:vi.fn(async()=>[mock.room.game]),
 setTournamentPaused:vi.fn(async paused=>{mock.room={...mock.room,revision:mock.room.revision+1,tournament:{...mock.room.tournament,status:paused?'paused':'playing'}};mock.callbacks.game(mock.room,mock.userId,true,true);return mock.room;}),
 onlineStandings:vi.fn(async()=>({standings:[{userId:'host',name:'Dan',points:0,wins:0,games:1},{userId:'guest',name:'Amber',points:40,wins:1,games:1}],completedGames:1,final:false})),
}));
import {openOnline,setOnlineReady,setTournamentPaused,onlineStandings} from '../src/multiplayer/ui.js';
import {saveCore} from '../src/core-store.js';
const click=selector=>{if(!document.querySelector(selector))document.querySelector('[data-action=game-menu]')?.click();expect(document.querySelector(selector)).not.toBeNull();document.querySelector(selector).click();};
function complete(){
 const time='2026-10-13T18:00:00.000Z';let room=startRoom(joinRoom(createRoom({id:'original-game',code:'ABCDEFGH',userId:'host',name:'Dan',time}),{userId:'guest',name:'Amber',time}),{userId:'host',time});
 for(let n=0;room.game.status!=='finished';n++){const seat=room.game.activeSeat,category=BASE_KEYS.find(k=>room.game.sheets[seat][k]===undefined);room=playRoom(room,{userId:room.members[seat].userId,expectedRevision:room.revision,commandId:`dom-score-${n}`,action:{type:'score',category,value:seat===1&&category==='largeStraight'?40:0},time});}
 return {...room,capabilities:{rematch:true,history:true},nextStarterId:'guest'};
}
beforeAll(async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());(document.querySelector('[data-action=resume-game]')||document.querySelector('[data-action=home-local]')).click();await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());
});
beforeEach(async()=>{document.querySelector('#coreDialog')?.close();vi.clearAllMocks();mock.room=complete();mock.userId='host';click('[data-action=online]');await vi.waitFor(()=>{expect(openOnline).toHaveBeenCalledTimes(1);expect(document.querySelector('[data-action=rematch-ready]')).not.toBeNull();});});
it('keeps the finished scorecard at the table while Play again marks only your readiness',async()=>{
 expect(document.querySelector('.hosted-next-starter').textContent).toBe('Amber starts the next game.');
 click('[data-action=rematch-ready]');await vi.waitFor(()=>expect(document.querySelector('[data-action=rematch-withdraw]')).not.toBeNull());
 expect(setOnlineReady).toHaveBeenCalledWith(true);expect(openOnline).toHaveBeenCalledTimes(1);expect(saveCore).not.toHaveBeenCalled();expect(document.querySelector('.core-score-table')).not.toBeNull();expect(document.querySelector('.hosted-rematch-message').textContent).toContain('Waiting for Amber');
});
it('withdraws readiness without leaving and updates to one fresh guest-started game',async()=>{
 click('[data-action=rematch-ready]');await vi.waitFor(()=>expect(document.querySelector('[data-action=rematch-withdraw]')).not.toBeNull());
 click('[data-action=rematch-withdraw]');await vi.waitFor(()=>expect(document.querySelector('[data-action=rematch-ready]')).not.toBeNull());
 click('[data-action=rematch-ready]');await vi.waitFor(()=>expect(mock.room.rematch?.ready).toEqual(['host']));
 mock.room=setRematchReady(mock.room,{userId:'guest',gameId:mock.room.game.id,gameRevision:mock.room.game.revision,commandId:'guest-ready-command',ready:true,nextGameId:'next-game',time:'2026-10-13T18:00:00.000Z'});mock.callbacks.game(mock.room,'host',true,true);
 expect(document.querySelector('.hosted-results')).toBeNull();expect(document.querySelector('.turn-indicator').textContent).toBe('Amber to play');expect(document.querySelector('#createCore')).toBeNull();expect(mock.room.game.id).toBe('next-game');expect(openOnline).toHaveBeenCalledTimes(1);
});
it('prevents readiness while disconnected and communicates capability absence',()=>{
 mock.callbacks.connection(false);expect(document.querySelector('[data-action=rematch-ready]').disabled).toBe(true);
 mock.callbacks.game({...mock.room,capabilities:{rematch:false}},'host',true,true);expect(document.querySelector('[data-action=rematch-ready]')).toBeNull();expect(document.querySelector('.hosted-rematch-message').textContent).toContain('update is required');
});
it('keeps the hosted table when pausing/resuming, locks corrections, and opens accepted standings',async()=>{
 mock.room={...mock.room,tournament:{name:'Weekend',gameCount:3,playerCount:2,status:'playing'},capabilities:{...mock.room.capabilities,tournaments:true}};mock.callbacks.game(mock.room,'host',true,true);
 click('[data-action="tournament-pause"]');await vi.waitFor(()=>expect(document.querySelector('[data-action="tournament-resume"]')).not.toBeNull());
 expect(setTournamentPaused).toHaveBeenCalledWith(true);expect(document.querySelector('[data-action="edit"]').disabled).toBe(true);expect(document.querySelector('[data-action="rematch-ready"]').disabled).toBe(true);
 click('[data-action="tournament-resume"]');await vi.waitFor(()=>expect(document.querySelector('[data-action="tournament-pause"]')).not.toBeNull());expect(setTournamentPaused).toHaveBeenCalledWith(false);expect(document.querySelector('[data-action="edit"]').disabled).toBe(false);
 click('[data-action="tournament-standings"]');await vi.waitFor(()=>expect(onlineStandings).toHaveBeenCalledOnce());await vi.waitFor(()=>expect(document.querySelectorAll('.tournament-ranking')).toHaveLength(2));expect(openOnline).toHaveBeenCalledTimes(1);
});
it('exits a paused tournament to the saved list without scoring, restarting or clearing its game',async()=>{
 mock.room={...mock.room,tournament:{name:'Weekend',gameCount:3,playerCount:2,status:'paused'},capabilities:{...mock.room.capabilities,tournaments:true}};mock.callbacks.game(mock.room,'host',true,true);
 const original=structuredClone(mock.room.game);click('[data-action="tournament-exit"]');
 await vi.waitFor(()=>expect(openOnline).toHaveBeenCalledTimes(2));expect(openOnline.mock.calls.at(-1)[2]).toBe('');expect(openOnline.mock.calls.at(-1)[3]).toBe('sessions');expect(mock.room.game).toEqual(original);expect(setTournamentPaused).not.toHaveBeenCalled();
});
