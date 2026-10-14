// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {publishDiceStatus,publishDiceEvent} from '../src/dice/live-status.js';
const mock=vi.hoisted(()=>({room:null,user:'host',callbacks:null,n:0}));
vi.mock('../src/core-store.js',()=>({loadCore:async()=>null,saveCore:vi.fn(),listCore:async()=>[]}));
vi.mock('../src/multiplayer/ui.js',()=>({
 openOnline:async(root,callbacks)=>{mock.callbacks=callbacks;callbacks.game(mock.room,mock.user,true,true);},
 sendOnline:async(action,revision)=>{
  mock.room=playRoom(mock.room,{userId:mock.user,action,expectedRevision:revision,commandId:`ui-hardware-${++mock.n}`,time:new Date().toISOString()});
  mock.callbacks.game(mock.room,mock.user,true,true);return mock.room;
 },
 sendHostState:async action=>{
  mock.room=playRoom(mock.room,{userId:'host',action,expectedRevision:mock.room.revision,commandId:`ui-live-${++mock.n}`,time:new Date().toISOString()});
  mock.callbacks.game(mock.room,mock.user,true,true);return true;
 }
}));
const click=s=>{const b=document.querySelector(s);expect(b).not.toBeNull();expect(b.disabled).toBe(false);b.click();};
it('captures on the host for a guest turn, shows synced faces and permits only the guest to score',async()=>{
 const time=new Date().toISOString();
 mock.room=startRoom(joinRoom(createRoom({id:'ui-room',code:'ABCDEFGH',userId:'host',name:'Host',source:'godice',time}),{userId:'guest',name:'Guest',time}),{userId:'host',time});
 const hostRoll={type:'roll',dice:[1,2,3,4,5],held:Array(5).fill(false),deviceIds:['d0','d1','d2','d3','d4'],capture:{gameId:'ui-room',revision:mock.room.game.revision,turnId:mock.room.game.turn.id,playerId:'host',events:[],evidence:[]}};
 mock.room=playRoom(mock.room,{userId:'host',action:hostRoll,expectedRevision:mock.room.revision,commandId:'first-host-roll',time});
 mock.room=playRoom(mock.room,{userId:'host',action:{type:'score',category:'chance',value:15},expectedRevision:mock.room.revision,commandId:'first-host-score',time});
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('[data-action="online"]')).not.toBeNull());
 publishDiceStatus({enabled:true,paused:false,dice:Array.from({length:5},(_,i)=>({id:`d${i}`,epoch:1,connected:true}))});
 click('[data-action="online"]');await vi.waitFor(()=>expect(document.querySelector('#hardwareCapture')).not.toBeNull());
 [5,5,5,2,4].forEach((face,i)=>{publishDiceEvent({id:`d${i}`,epoch:1,kind:'moving'});publishDiceEvent({id:`d${i}`,epoch:1,kind:'stable',face});});
 await vi.waitFor(()=>expect(mock.room.game.turn.rolls).toHaveLength(1),{timeout:4000});
 expect(mock.room.game.activeSeat).toBe(1);
 expect(document.querySelector('[data-key="fives"].roll-match').disabled).toBe(true);
 mock.user='guest';mock.callbacks.game(mock.room,'guest',true,true);
 expect(document.querySelectorAll('#hardwareCapture .capture-face')).toHaveLength(5);
 expect(document.querySelector('#hardwareCapture').textContent).toContain('Host dice');
 expect(document.querySelector('[data-key="fives"].roll-match').disabled).toBe(false);
 click('[data-action="choose"][data-key="fives"]');click('[data-action="confirm-score"][data-value="15"]');
 await vi.waitFor(()=>expect(mock.room.game.activeSeat).toBe(0));
 expect(mock.room.game.sheets[1].fives).toBe(15);
},10000);
