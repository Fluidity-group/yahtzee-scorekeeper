// @vitest-environment jsdom
import{it,expect,vi,afterAll}from'vitest';
import{createRoom,joinRoom,startRoom}from'../src/multiplayer/room.js';
const mock=vi.hoisted(()=>({room:null,revision:1,token:0,offline:false,preset:'character-1'}));
vi.mock('../src/core-store.js',()=>({loadCore:vi.fn(async()=>null),saveCore:vi.fn(async()=>{}),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({configured:true,webUrl:'https://game.example.test/',emailOtpEnabled:false,
 auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'host'}}}})),onAuthStateChange:vi.fn(()=>({data:{subscription:{unsubscribe:vi.fn()}}}))},
 watchRoom:vi.fn(()=>vi.fn()),requestRoom:vi.fn(async()=>{if(mock.offline)throw Error('offline');return{room:structuredClone(mock.room)};})}));
vi.mock('../src/profile/portrait-api.js',()=>({portraitSession:vi.fn(async()=>({user:{id:'host'}})),requestPortrait:vi.fn(async p=>p.operation==='profile'?{profile:{ownerId:'host',kind:'preset',revision:1,preset:'character-1'}}:{profiles:[{ownerId:'guest',kind:'generated',revision:mock.revision,avatarId:'portrait-'+mock.revision,preset:mock.preset,url:'https://images.example.test/portrait-'+mock.revision+'.jpg?token='+mock.token++}]})}));
import{leaveOnline}from'../src/multiplayer/ui.js';
import{setAccountAvatar}from'../src/profile/avatar-view.js';
afterAll(()=>{leaveOnline();vi.useRealTimers();vi.unstubAllEnvs();});
it('keeps local play, shared portraits and open score input mounted through idle polls, but applies real avatar/game and connection changes',async()=>{
 vi.useFakeTimers();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};vi.stubEnv('MODE','ios-test');
 await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('.clubhouse-home')).not.toBeNull());
 document.querySelector('[data-action=home-solo]').click();document.querySelector('#createCore').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());
 const local=document.querySelector('.core-score-table');await vi.advanceTimersByTimeAsync(65000);expect(document.querySelector('.core-score-table')).toBe(local);
 const previousAvatar=local.querySelector('.scorecard-player-avatar').innerHTML;setAccountAvatar({ownerId:'host',kind:'preset',revision:2,preset:'character-2'});expect(document.querySelector('.core-score-table')).not.toBe(local);expect(document.querySelector('.scorecard-player-avatar').innerHTML).not.toBe(previousAvatar);
 const time=new Date().toISOString();mock.room={...startRoom(joinRoom(createRoom({id:'idle-fixture',code:'ABCDEFGH',userId:'host',name:'Alex',time}),{userId:'guest',name:'Sam',time}),{userId:'host',time}),capabilities:{reactions:true}};
 document.querySelector('[data-action=game-menu]').click();document.querySelector('[data-action=online]').click();await vi.waitFor(()=>expect(document.querySelector('[data-mp=host]')).not.toBeNull());document.querySelector('[data-mp=host]').click();document.querySelector('[name=name]').value='Alex';document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());
 await vi.advanceTimersByTimeAsync(3000);const card=document.querySelector('.core-score-table'),portrait=card.querySelector('img');expect(portrait).not.toBeNull();
 document.querySelector('[data-action=choose][data-key=chance]').click();const input=document.querySelector('#coreDialog input[type=number]');expect(input).not.toBeNull();input.value='23';input.focus();
 await vi.advanceTimersByTimeAsync(9000);expect(document.querySelector('.core-score-table')).toBe(card);expect(card.querySelector('img')).toBe(portrait);expect(portrait.isConnected).toBe(true);expect(input.isConnected).toBe(true);expect(input.value).toBe('23');expect(document.activeElement).toBe(input);
 const beforeOwn=document.querySelector('.core-score-table');setAccountAvatar({ownerId:'host',kind:'preset',revision:3,preset:'character-3'});expect(document.querySelector('.core-score-table')).not.toBe(beforeOwn);expect(input.isConnected).toBe(true);const ownUpdated=document.querySelector('.core-score-table');await vi.advanceTimersByTimeAsync(3000);expect(document.querySelector('.core-score-table')).toBe(ownUpdated);
 mock.revision=2;await vi.advanceTimersByTimeAsync(3000);expect(document.querySelector('.core-score-table img').src).toContain('portrait-2.jpg');expect(input.isConnected).toBe(true);
 // A real room revision/name update must still redraw the shared game.
 document.querySelector('[data-action=close]').click();const previous=document.querySelector('.core-score-table');mock.room={...mock.room,revision:mock.room.revision+1,game:{...mock.room.game,revision:mock.room.game.revision+1,players:mock.room.game.players.map((p,i)=>i?{...p,name:'Updated player'}:p)}};
 await vi.advanceTimersByTimeAsync(3000);expect(document.querySelector('.core-score-table')).not.toBe(previous);expect(document.querySelector('.core-score-table').textContent).toContain('Updated player');
 mock.offline=true;await vi.advanceTimersByTimeAsync(3000);const disconnected=document.querySelector('.core-score-table');expect(document.querySelector('[data-action=choose]')).toBeNull();await vi.advanceTimersByTimeAsync(6000);expect(document.querySelector('.core-score-table')).toBe(disconnected);
 mock.offline=false;await vi.advanceTimersByTimeAsync(3000);expect(document.querySelector('[data-action=choose]')).not.toBeNull();
});
