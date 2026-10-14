// @vitest-environment jsdom
import {beforeAll,beforeEach,it,expect,vi} from 'vitest';
import {createRoom,joinRoom,startRoom,playRoom} from '../src/multiplayer/room.js';
import {BASE_KEYS} from '../src/game/categories.js';
const mock=vi.hoisted(()=>({room:null,onRoom:null}));
vi.mock('../src/core-store.js',()=>({saveCore:vi.fn(async()=>{}),loadCore:vi.fn(async()=>null),listCore:vi.fn(async()=>[])}));
vi.mock('../src/multiplayer/client.js',()=>({
 configured:true,emailOtpEnabled:false,webUrl:'https://clubhouse.example.test/game/?old=1#old',
 auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'guest',email:'guest@example.test'}}}}))},
 watchRoom:vi.fn((code,onRoom)=>{mock.onRoom=onRoom;return vi.fn();}),
 requestRoom:vi.fn(async body=>{
  if(body.operation==='sessions'||body.operation==='tournaments')return {rooms:[mock.room],nextBefore:null};
  if(body.operation==='read')return {room:mock.room};
  if(body.operation==='join')return {room:joinRoom(mock.room,{userId:'guest',name:body.name,time:'2026-10-20T12:00:00Z'})};
  throw Error('Unexpected mutation');
 }),
}));
vi.mock('qrcode',()=>({default:{toCanvas:vi.fn(async()=>{})}}));
import QRCode from 'qrcode';
import {requestRoom} from '../src/multiplayer/client.js';
import {onlineInvitation,leaveOnline} from '../src/multiplayer/ui.js';
const click=selector=>{const button=document.querySelector(selector);expect(button).not.toBeNull();button.click();};
const action=name=>click(`[data-action="${name}"]`);
const mp=name=>click(`[data-mp="${name}"]`);
beforeAll(async()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};await import('../src/prototype.js');await vi.waitFor(()=>expect(document.querySelector('#createCore')).not.toBeNull());});
beforeEach(()=>{
 leaveOnline();vi.clearAllMocks();const time='2026-10-14T12:00:00Z';let room=startRoom(joinRoom(createRoom({id:'same-game',code:'ABCDEFGH',userId:'host',name:'Dan',mode:'standard',tournament:{name:'Weekend',gameCount:3,playerCount:2},time}),{userId:'guest',name:'Amber',time}),{userId:'host',time});
 for(let n=0;n<7;n++){const seat=room.game.activeSeat;room=playRoom(room,{userId:room.members[seat].userId,action:{type:'score',category:BASE_KEYS.find(key=>room.game.sheets[seat][key]===undefined),value:0},gameId:room.game.id,expectedRevision:room.revision,commandId:crypto.randomUUID(),time});}
 mock.room={...room,revision:room.revision+1,capabilities:{tournaments:true,undoScore:true},tournament:{...room.tournament,status:'paused'}};
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn(async()=>{})}});
});
it('offers Resume on opening, restores the guest’s exact paused midgame, and follows host resume without a new room',async()=>{
 expect(document.querySelector('[data-action="saved-sessions"]')).not.toBeNull();action('saved-sessions');await vi.waitFor(()=>expect(document.querySelector('[data-mp="resume"]')).not.toBeNull());expect(document.body.textContent).toContain('Weekend');expect(document.body.textContent).toContain('Amber');mp('resume');
 await vi.waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());expect(document.querySelector('.turn-indicator').textContent).toBe('Tournament paused');expect(document.querySelector('thead [data-player-seat="1"] .player-name').textContent).toBe('Amber');expect(document.querySelectorAll('[data-action="edit"]')).toHaveLength(3);expect(document.querySelector('[data-action="tournament-resume"]')).toBeNull();expect(document.querySelector('[data-action="choose"][data-key="fours"]').disabled).toBe(true);
 const snapshot=JSON.stringify(mock.room.game);action('tournament-invitation');await vi.waitFor(()=>expect(QRCode.toCanvas).toHaveBeenCalledOnce());expect(QRCode.toCanvas.mock.calls[0][1]).toBe('https://clubhouse.example.test/game/?join=ABCDEFGH');expect(onlineInvitation()).toMatchObject({code:'ABCDEFGH',hostName:'Dan',tournamentName:'Weekend'});action('copy-saved-invitation');await vi.waitFor(()=>expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://clubhouse.example.test/game/?join=ABCDEFGH'));action('close');expect(JSON.stringify(mock.room.game)).toBe(snapshot);
 mock.room={...mock.room,revision:mock.room.revision+1,tournament:{...mock.room.tournament,status:'playing'}};mock.onRoom(mock.room);expect(document.querySelector('.turn-indicator').textContent).toBe('Amber to play');expect(document.querySelector('[data-action="choose"][data-key="fours"]').disabled).toBe(false);expect(mock.room.game.id).toBe('same-game');expect(mock.room.hostId).toBe('host');expect(requestRoom.mock.calls.some(call=>['create','start','command','resume'].includes(call[0].operation))).toBe(false);
});
it('rejoins an expired invitation as the original guest without changing nickname, roster, scores, or host',async()=>{
 const original=JSON.stringify(mock.room);action('online');await vi.waitFor(()=>expect(document.querySelector('[data-mp="join"]')).not.toBeNull());mp('join');document.querySelector('[name="code"]').value='ABCDEFGH';document.querySelector('[name="name"]').value='Different name';document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(document.querySelector('.core-score-table')).not.toBeNull());expect(JSON.stringify(mock.room)).toBe(original);expect(mock.room.members).toHaveLength(2);expect(document.querySelector('thead [data-player-seat="1"] .player-name').textContent).toBe('Amber');expect(mock.room.hostId).toBe('host');expect(mock.room.game.activeSeat).toBe(1);expect(requestRoom.mock.calls.map(call=>call[0].operation)).toEqual(['join']);
});
it('loads all pages of open sessions and switches to distinct completed results',async()=>{
 action('online');await vi.waitFor(()=>expect(document.querySelector('[data-mp="sessions"]')).not.toBeNull());
 const before={createdAt:'2026-10-13T12:00:00Z',id:'page-end'},older={...mock.room,id:'older',code:'JKLMNPQR',createdAt:'2026-10-01T12:00:00Z',tournament:{...mock.room.tournament,name:'Older tournament'}};
 requestRoom.mockResolvedValueOnce({rooms:[mock.room],nextBefore:before}).mockResolvedValueOnce({rooms:[older],nextBefore:null});mp('sessions');await vi.waitFor(()=>expect(document.querySelectorAll('.saved-session-card')).toHaveLength(2));
 expect(requestRoom.mock.calls[0][0]).toEqual({operation:'sessions',view:'open'});expect(requestRoom.mock.calls[1][0]).toEqual({operation:'sessions',view:'open',before});expect(document.querySelectorAll('.saved-session-paused')).toHaveLength(2);expect(document.querySelector('[data-mp="sessions-open"]').getAttribute('aria-pressed')).toBe('true');
 const completed={...older,game:{...older.game,status:'finished'},tournament:{...older.tournament,status:'completed'}};requestRoom.mockResolvedValueOnce({rooms:[completed],nextBefore:null});mp('sessions-completed');await vi.waitFor(()=>expect(document.querySelector('.saved-session-completed')).not.toBeNull());expect(document.querySelectorAll('.saved-session-card')).toHaveLength(1);expect(document.body.textContent).toContain('View results');expect(document.querySelector('[data-mp="sessions-completed"]').getAttribute('aria-pressed')).toBe('true');expect(requestRoom.mock.calls.at(-1)[0]).toEqual({operation:'sessions',view:'completed'});
});

