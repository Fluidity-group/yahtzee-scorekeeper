// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createCoreGame} from '../src/game/core.js';
const mock=vi.hoisted(()=>({room:null}));
vi.mock('../src/multiplayer/client.js',()=>({
 configured:true,emailOtpEnabled:false,webUrl:'https://clubhouse.example.test/',
 auth:{getSession:vi.fn(async()=>({data:{session:{user:{id:'host',email:'host@example.test'}}}}))},
 watchRoom:vi.fn(()=>vi.fn()),
 requestRoom:vi.fn(async body=>{
  if(body.operation==='create')mock.room={id:'r',code:'ABCDEFGH',revision:0,hostId:'host',members:[{userId:'host',name:body.name},{userId:'guest',name:'Amber'}],mode:'competition',source:'manual',rulesVersion:body.rulesVersion,capabilities:{tournaments:true,rematch:true},tournament:body.tournament?{...body.tournament,status:'playing'}:undefined};
  if(body.operation==='start')mock.room={...mock.room,revision:1,game:createCoreGame({id:'g',names:['Dan','Amber'],mode:'competition',rulesVersion:2})};
  return {room:mock.room};
 }),
}));
vi.mock('qrcode',()=>({default:{toCanvas:vi.fn(async()=>{})}}));
import {requestRoom} from '../src/multiplayer/client.js';
import {openOnline,leaveOnline,sendOnline,setOnlineReady,setTournamentPaused} from '../src/multiplayer/ui.js';
const click=action=>document.querySelector(`[data-mp="${action}"]`).click();
beforeEach(()=>{leaveOnline();vi.clearAllMocks();document.body.innerHTML='<div id="root"></div>';});
afterEach(()=>leaveOnline());
it('opts new manual Competition into v2 and sends that version on every subsequent hosted write',async()=>{
 await openOnline(document.querySelector('#root'),{game:vi.fn(),notice:vi.fn(),connection:vi.fn(),exit:vi.fn()});click('host');document.querySelector('[name="name"]').value='Dan';document.querySelector('[name="mode"]').value='competition';
 const type=document.querySelector('[name="tableType"]');type.value='tournament';type.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[name="tournamentName"]').value='Weekend';
 document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-mp="start"]')).not.toBeNull());
 expect(requestRoom.mock.calls[0][0]).toMatchObject({operation:'create',rulesVersion:2,source:'manual'});click('start');await vi.waitFor(()=>expect(mock.room.game).toBeDefined());
 await sendOnline({type:'final-chain-roll',face:null},1);await setOnlineReady(true);await setTournamentPaused(true);await setTournamentPaused(false);
 expect(requestRoom.mock.calls.map(call=>call[0]).filter(body=>['start','command','ready','pause','resume'].includes(body.operation))).toEqual(expect.arrayContaining(['start','command','ready','pause','resume'].map(operation=>expect.objectContaining({operation,rulesVersion:2}))));
});
