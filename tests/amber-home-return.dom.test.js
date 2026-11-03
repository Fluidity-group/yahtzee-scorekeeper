// @vitest-environment jsdom
import {it,expect,vi,afterAll} from 'vitest';
import {createRoom,joinRoom,startRoom} from '../src/multiplayer/room.js';
const mock=vi.hoisted(()=>({room:null,request:vi.fn()}));
vi.mock('../src/core-store.js',()=>({loadCore:vi.fn(async()=>null),saveCore:vi.fn(async()=>{}),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/home-account.js',()=>({watchHomeAccount:vi.fn(async()=>()=>{}),loadHomeAccount:vi.fn(async()=>({status:'ready',user:{id:'host',name:'Alpha'},people:[],trophies:{total:0},currentTable:mock.room,currentTournament:mock.room}))}));
vi.mock('../src/multiplayer/client.js',()=>({configured:true,webUrl:'https://example.test/',emailOtpEnabled:false,auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'host'}}}})),onAuthStateChange:vi.fn(()=>({data:{subscription:{unsubscribe:vi.fn()}}}))},watchRoom:vi.fn(()=>()=>{}),requestRoom:mock.request}));
vi.mock('../src/profile/portrait-api.js',()=>({portraitSession:vi.fn(async()=>null),requestPortrait:vi.fn(async()=>({profiles:[]}))}));
import {leaveOnline} from '../src/multiplayer/ui.js';
afterAll(()=>leaveOnline());
it('returns from Home to the same authenticated tournament without unpausing or replacing its game',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 const time='2026-11-03T12:00:00Z';
 mock.room=startRoom(joinRoom(createRoom({id:'home-return',code:'ABCDEFGH',userId:'host',name:'Alpha',time}),{userId:'guest',name:'Beta',time}),{userId:'host',time});
 mock.room.tournament={name:'Synthetic Cup',status:'paused',gameCount:3,playerCount:2};mock.room.capabilities={tournaments:true};
 mock.request.mockImplementation(async()=>({room:structuredClone(mock.room)}));
 await import('../src/prototype.js');
 await vi.waitFor(()=>expect(document.querySelector('[data-action=home-current-tournament]')).not.toBeNull());
 document.querySelector('[data-action=home-current-tournament]').click();
 await vi.waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());
 expect(mock.request).toHaveBeenCalledWith({operation:'read',code:'ABCDEFGH'});
 expect(mock.request.mock.calls.every(([payload])=>payload.operation==='read')).toBe(true);
 expect(document.querySelector('.play-title').textContent).toContain('Synthetic Cup');
 expect(document.querySelector('.play-title').textContent).toContain('Paused');
 expect(mock.room.tournament.status).toBe('paused');
});
