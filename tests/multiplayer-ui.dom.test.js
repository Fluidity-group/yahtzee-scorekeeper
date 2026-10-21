// @vitest-environment jsdom
import { beforeEach,describe,it,expect,vi } from 'vitest';
import { createRoom,joinRoom,startRoom } from '../src/multiplayer/room.js';
import {setTournamentPaused} from '../src/multiplayer/tournament.js';
import {socialDestination,socialLandingView} from '../src/multiplayer/social-links.js';

const mock=vi.hoisted(()=>({user:{id:'host',email:'host@example.test'},room:null,onRoom:null,configured:true,emailOtpEnabled:true}));
vi.mock('../src/multiplayer/client.js',()=>({
 get configured(){return mock.configured;},webUrl:'https://clubhouse.example.test/',get emailOtpEnabled(){return mock.emailOtpEnabled;},
 auth:{getSession:vi.fn(async()=>({data:{session:mock.user?{user:mock.user}:null}})),signInWithOtp:vi.fn(async()=>({})),verifyOtp:vi.fn(async()=>({data:{user:{id:'host',email:'host@example.test'}}})),signInWithPassword:vi.fn(async()=>({data:{user:{id:'host',email:'host@example.test'}}})),signOut:vi.fn(async()=>({}))},
 watchRoom:vi.fn((code,callback)=>{mock.onRoom=callback;return vi.fn();}),
 requestRoom:vi.fn(async body=>{
  if(body.operation==='create')mock.room=createRoom({id:body.requestId,code:'ABCDEFGH',userId:'host',name:body.name,mode:body.mode,hideTotals:body.hideTotals,time:'2026-09-16T12:00:00.000Z'});
  if(body.operation==='start')mock.room=startRoom(mock.room,{userId:'host',time:'2026-09-16T12:00:00.000Z'});
  if(body.operation==='join')mock.room=joinRoom(mock.room,{userId:'host',name:body.name,time:'2026-09-16T12:00:00.000Z'});
  return {room:mock.room};
 }),
}));
vi.mock('qrcode',()=>({default:{toCanvas:vi.fn(async()=>{})}}));
import QRCode from 'qrcode';
import { auth,requestRoom } from '../src/multiplayer/client.js';
import { openOnline,leaveOnline,onlineStandings } from '../src/multiplayer/ui.js';
const click=action=>document.querySelector(`[data-mp="${action}"]`).click();
const submit=()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
let callbacks;
beforeEach(()=>{
 leaveOnline();vi.clearAllMocks();mock.user={id:'host',email:'host@example.test'};mock.configured=true;mock.emailOtpEnabled=true;
 document.body.innerHTML='<div id="root"></div>';callbacks={game:vi.fn(),connection:vi.fn(),notice:vi.fn(),exit:vi.fn()};
});
describe('multiplayer screens',()=>{
 it('opens a native shared link as an explicit join form, without a member-only read or automatic join',async()=>{
  const destination=socialDestination('diceclubhouse://table/ABCDEFGH');
  await openOnline(document.querySelector('#root'),callbacks,destination.code,socialLandingView(destination));
  expect(document.querySelector('[data-mp-form="join"]')).not.toBeNull();
  expect(document.querySelector('[name="code"]').value).toBe('ABCDEFGH');
  expect(requestRoom).not.toHaveBeenCalled();
  mock.room=createRoom({id:'join-native',code:'ABCDEFGH',userId:'organiser',name:'Organiser',time:'2026-09-16T12:00:00.000Z'});
  document.querySelector('[name="name"]').value='Guest';submit();
  await vi.waitFor(()=>expect(document.querySelectorAll('.mp-roster li')).toHaveLength(2));
  expect(requestRoom.mock.calls[0][0]).toEqual({operation:'join',code:'ABCDEFGH',name:'Guest'});
  expect(document.querySelector('[data-mp="start"]')).toBeNull();
 });
 it('finds an older paused tournament after fresh entry and returns to its saved host/game',async()=>{
  let saved=startRoom(joinRoom(createRoom({id:'older-paused',code:'ABCDEFGH',userId:'host',name:'Dan',time:'2026-10-01T18:00:00.000Z',tournament:{name:'Weekend cup',gameCount:3,playerCount:2}}),{userId:'guest',name:'Amber',time:'2026-10-01T18:00:00.000Z'}),{userId:'host',time:'2026-10-01T18:00:00.000Z'});
  saved=setTournamentPaused(saved,{userId:'host',gameId:saved.game.id,expectedRevision:saved.revision,paused:true,time:'2026-10-01T19:00:00.000Z'});
  const recent=Array.from({length:20},(_,i)=>({...saved,id:`recent-${i}`,tournament:{...saved.tournament,name:`Recent ${i}`,status:'playing'},createdAt:'2026-10-13T18:00:00.000Z'}));
  const cursor={createdAt:'2026-10-13T18:00:00.000Z',id:'00000000-0000-4000-8000-000000000009'};
  requestRoom.mockResolvedValueOnce({rooms:recent,nextBefore:cursor}).mockResolvedValueOnce({rooms:[saved],nextBefore:null});
  await openOnline(document.querySelector('#root'),callbacks,'','tournaments');
  expect(document.querySelectorAll('.tournament-return')).toHaveLength(21);expect(document.querySelector('.tournament-return strong').textContent).toBe('Weekend cup');expect(document.querySelector('.tournament-return b').textContent).toBe('Continue hosting');
  expect(requestRoom.mock.calls[0][0]).toEqual({operation:'tournaments'});expect(requestRoom.mock.calls[1][0]).toEqual({operation:'tournaments',before:cursor});
  requestRoom.mockResolvedValueOnce({room:saved});document.querySelector('.tournament-return').click();
  await vi.waitFor(()=>expect(callbacks.game).toHaveBeenCalled());expect(callbacks.game.mock.calls.at(-1)[0]).toEqual(saved);expect(requestRoom.mock.calls.at(-1)[0]).toEqual({operation:'read',code:saved.code});
 });
 it('ignores a late saved tournament list after the player exits',async()=>{
  await openOnline(document.querySelector('#root'),callbacks);let deliver;
  requestRoom.mockImplementationOnce(()=>new Promise(resolve=>deliver=resolve));click('tournaments');
  await vi.waitFor(()=>expect(requestRoom).toHaveBeenCalled());click('exit');
  document.querySelector('#root').innerHTML='<h1>Local games</h1>';deliver({rooms:[],nextBefore:null});await new Promise(resolve=>setTimeout(resolve,0));
  expect(document.querySelector('h1').textContent).toBe('Local games');
 });
 it('retries result standings after a temporary failure on an unchanged authoritative refresh',async()=>{
  const live=startRoom(createRoom({id:'retry-game',code:'ABCDEFGH',userId:'host',name:'Dan',time:'2026-10-13T18:00:00Z'}),{userId:'host',time:'2026-10-13T18:00:00Z'});
  live.game.status='finished';live.tournament={name:'Weekend',gameCount:3,playerCount:2,status:'playing'};live.capabilities={tournaments:true};
  const data={standings:[{userId:'host',name:'Dan',points:100,wins:1,games:1},{userId:'guest',name:'Amber',points:90,wins:0,games:1}],completedGames:1,final:false,roomRevision:live.revision,gameId:live.game.id,gameRevision:live.game.revision};
  requestRoom.mockResolvedValueOnce({room:live}).mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await openOnline(document.querySelector('#root'),callbacks);click('host');document.querySelector('[name="name"]').value='Dan';submit();
  await vi.waitFor(()=>expect(callbacks.notice).toHaveBeenCalled());await new Promise(resolve=>setTimeout(resolve,0));
  requestRoom.mockResolvedValueOnce(data);mock.onRoom(live);
  await vi.waitFor(()=>expect(callbacks.game.mock.calls.at(-1)[0].tournamentStandings).toEqual(data));
 });
 it('keeps authoritative result standings across unchanged polling snapshots and rejects stale responses',async()=>{
  const live=startRoom(createRoom({id:'tournament-game',code:'ABCDEFGH',userId:'host',name:'Dan',time:'2026-10-13T18:00:00Z'}),{userId:'host',time:'2026-10-13T18:00:00Z'});
  live.game.status='finished';live.tournament={name:'Weekend',gameCount:3,playerCount:2,status:'playing'};live.capabilities={tournaments:true};
  const data={standings:[{userId:'host',name:'Dan',points:100,wins:1,games:1},{userId:'guest',name:'Amber',points:90,wins:0,games:1}],completedGames:1,final:false,roomRevision:live.revision,gameId:live.game.id,gameRevision:live.game.revision};
  requestRoom.mockResolvedValueOnce({room:live}).mockResolvedValueOnce(data);
  await openOnline(document.querySelector('#root'),callbacks);click('host');document.querySelector('[name="name"]').value='Dan';submit();
  await vi.waitFor(()=>expect(callbacks.game.mock.calls.at(-1)[0].tournamentStandings).toEqual(data));
  mock.onRoom(live);expect(callbacks.game.mock.calls.at(-1)[0].tournamentStandings).toEqual(data);
  requestRoom.mockResolvedValueOnce({...data,roomRevision:live.revision-1});await expect(onlineStandings()).rejects.toThrow('tournament changed');
 });
 it('creates a manual tournament with chosen mode/game/player count and waits for its exact roster',async()=>{
  await openOnline(document.querySelector('#root'),callbacks);click('host');
  const type=document.querySelector('[name="tableType"]');type.value='tournament';type.dispatchEvent(new Event('change',{bubbles:true}));
  expect(document.querySelector('.mp-tournament-fields').hidden).toBe(false);expect(document.querySelector('[name="source"]').disabled).toBe(true);
  document.querySelector('[name="name"]').value='Dan';document.querySelector('[name="tournamentName"]').value='Weekend';document.querySelector('[name="gameCount"]').value='5';document.querySelector('[name="tournamentPlayers"]').value='3';document.querySelector('[name="mode"]').value='competition';
  requestRoom.mockImplementationOnce(async body=>{mock.room={...createRoom({id:body.requestId,code:'ABCDEFGH',userId:'host',name:body.name,mode:body.mode,time:'2026-10-13T18:00:00Z'}),tournament:{...body.tournament,status:'playing'},capabilities:{tournaments:true}};return {room:mock.room};});
  submit();await vi.waitFor(()=>expect(document.querySelector('[data-mp="start"]')).not.toBeNull());
  expect(requestRoom.mock.calls[0][0]).toMatchObject({operation:'create',mode:'competition',source:'manual',tournament:{name:'Weekend',gameCount:5,playerCount:3}});
  expect(document.querySelector('[data-mp="start"]').disabled).toBe(true);expect(document.querySelector('.mp-roster-title span').textContent).toBe('1 / 3 players');
  mock.room={...mock.room,revision:1,members:[...mock.room.members,{userId:'guest',name:'Amber'},{userId:'third',name:'Sam'}]};mock.onRoom(mock.room);
  expect(document.querySelector('[data-mp="start"]').disabled).toBe(false);expect(document.body.textContent).toContain('start tournament');
 });
 it('can return from host setup and open another online screen',async()=>{
  await openOnline(document.querySelector('#root'),callbacks);click('host');click('home');click('join');
  expect(document.querySelector('[data-mp-form="join"]')).not.toBeNull();
 });
 it('keeps the account signed in when sign-out returns an error',async()=>{
  auth.signOut.mockResolvedValueOnce({error:new TypeError('Failed to fetch')});
  await openOnline(document.querySelector('#root'),callbacks);click('signout');
  await vi.waitFor(()=>expect(document.querySelector('#mpMessage').textContent).toContain('internet'));
  expect(document.querySelector('[data-mp="host"]')).not.toBeNull();
 });
 it('does not let a delayed session lookup replace local play after leaving',async()=>{
  let deliver;auth.getSession.mockImplementationOnce(()=>new Promise(resolve=>deliver=resolve));
  const opening=openOnline(document.querySelector('#root'),callbacks);
  leaveOnline();document.querySelector('#root').innerHTML='<h1>Local camera ready</h1>';
  deliver({data:{session:null}});await opening;
  expect(document.querySelector('h1').textContent).toBe('Local camera ready');
 });
 it('keeps the newer online screen when an older opening resolves last',async()=>{
  let deliver;auth.getSession.mockImplementationOnce(()=>new Promise(resolve=>deliver=resolve));
  const first=openOnline(document.querySelector('#root'),callbacks);
  await openOnline(document.querySelector('#root'),callbacks);
  deliver({data:{session:null}});await first;
  expect(document.querySelector('[data-mp="host"]')).not.toBeNull();
 });
 it('allows local play during a pending login and ignores its late result',async()=>{
  mock.user=null;mock.emailOtpEnabled=false;await openOnline(document.querySelector('#root'),callbacks);
  let deliver;auth.signInWithPassword.mockImplementationOnce(()=>new Promise(resolve=>deliver=resolve));
  callbacks.exit.mockImplementation(()=>document.querySelector('#root').innerHTML='<h1>Local camera ready</h1>');
  document.querySelector('[name="email"]').value='host@example.test';document.querySelector('[name="password"]').value='fixture-password';submit();
  await vi.waitFor(()=>expect(auth.signInWithPassword).toHaveBeenCalled());click('exit');
  expect(callbacks.exit).toHaveBeenCalledOnce();
  deliver({data:{user:{id:'host',email:'host@example.test'}}});await new Promise(resolve=>setTimeout(resolve,0));
  expect(document.querySelector('h1').textContent).toBe('Local camera ready');
 });
 it('does not reopen a lobby when a pending room creation completes after exit',async()=>{
  await openOnline(document.querySelector('#root'),callbacks);click('host');
  let deliver;requestRoom.mockImplementationOnce(()=>new Promise(resolve=>deliver=resolve));
  document.querySelector('[name="name"]').value='Host';submit();
  await vi.waitFor(()=>expect(requestRoom).toHaveBeenCalled());
  callbacks.exit.mockImplementation(()=>document.querySelector('#root').innerHTML='<h1>Local camera ready</h1>');click('exit');
  expect(callbacks.exit).toHaveBeenCalledOnce();
  deliver({room:createRoom({id:'fixture',code:'ABCDEFGH',userId:'host',name:'Host',time:'2026-10-03T12:00:00.000Z'})});
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(document.querySelector('h1').textContent).toBe('Local camera ready');expect(QRCode.toCanvas).not.toHaveBeenCalled();
 });
 it('shows connection recovery and local-game access after a failed session lookup',async()=>{
  mock.emailOtpEnabled=false;auth.getSession.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await openOnline(document.querySelector('#root'),callbacks);
  expect(document.querySelector('#mpMessage').textContent).toContain('internet');
  expect(document.querySelector('[data-mp="exit"]')).not.toBeNull();
  expect(document.querySelector('[data-mp-form="password"]')).not.toBeNull();
  expect(document.body.textContent).toContain('Camera credentials are separate');
 });
 it('standard native hosting offers manual input without private capture',async()=>{
  vi.stubEnv('MODE','native');
  try {
   await openOnline(document.querySelector('#root'),callbacks);click('host');
   expect([...document.querySelector('[name="source"]').options].map(o=>o.value)).toEqual(['manual']);
  } finally {vi.unstubAllEnvs();}
 });
 it('creates a room, encodes a web invitation, updates the roster and starts',async()=>{
  await openOnline(document.querySelector('#root'),callbacks);click('host');
  document.querySelector('[name="name"]').value='Dan';document.querySelector('[name="hideTotals"]').checked=true;submit();
  await vi.waitFor(()=>expect(document.querySelector('.mp-room-code')?.textContent).toBe('ABCD EFGH'));
  expect(QRCode.toCanvas.mock.calls[0][1]).toBe('https://clubhouse.example.test/?join=ABCDEFGH');
  mock.room=joinRoom(mock.room,{userId:'guest',name:'Amber',time:'2026-09-16T12:00:00.000Z'});mock.onRoom(mock.room);
  expect(document.querySelectorAll('.mp-roster li')).toHaveLength(2);click('start');
  await vi.waitFor(()=>expect(callbacks.game).toHaveBeenCalled());
  expect(callbacks.game.mock.calls.at(-1)[0].game.hideTotals).toBe(true);
  expect(requestRoom.mock.calls.at(-1)[0].expectedRevision).toBe(1);
  leaveOnline();
 });
 it('keeps the scanned room code through email sign-in',async()=>{
  mock.user=null;await openOnline(document.querySelector('#root'),callbacks,'ABCDEFGH');
  document.querySelector('[name="email"]').value='host@example.test';submit();
  await vi.waitFor(()=>expect(document.querySelector('[name="token"]')).not.toBeNull());
  document.querySelector('[name="token"]').value='123456';submit();
  await vi.waitFor(()=>expect(document.querySelector('[name="code"]')?.value).toBe('ABCDEFGH'));
 });
 it('shows setup status instead of a fake working invitation when unconfigured',async()=>{
  mock.configured=false;await openOnline(document.querySelector('#root'),callbacks);
  expect(document.body.textContent).toContain('Supabase connection');expect(document.querySelector('canvas')).toBeNull();
 });
 it('uses password sign-in when email delivery is not configured',async()=>{
  mock.emailOtpEnabled=false;mock.user=null;
  await openOnline(document.querySelector('#root'),callbacks,'ABCDEFGH');
  expect(document.querySelector('[data-mp-form="password"]')).not.toBeNull();
  expect(document.querySelector('[data-mp="change-email"]')).toBeNull();
  document.querySelector('[name="email"]').value='host@example.test';
  document.querySelector('[name="password"]').value='fixture-password';submit();
  await vi.waitFor(()=>expect(document.querySelector('[name="code"]')?.value).toBe('ABCDEFGH'));
 });
});
