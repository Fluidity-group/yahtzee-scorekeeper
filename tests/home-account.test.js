import {describe,it,expect,vi,afterEach} from 'vitest';
import {createCoreGame} from '../src/game/core.js';
import {BASE_KEYS} from '../src/game/categories.js';
import {summarizeHomeAccount,loadHomeAccount,setHomeAccountPreview} from '../src/multiplayer/home-account.js';
function game(id,other='peer',name='Jamie',own=10,peer=5){const g=createCoreGame({id,names:['Alex',name],mode:'standard'});g.players[0].id='me';g.players[1].id=other;g.sheets=g.sheets.map((_,i)=>Object.fromEntries(BASE_KEYS.map(key=>[key,key==='chance'?(i?peer:own):0])));g.status='finished';g.endedAt='2026-10-22T18:00:00Z';return g;}
function table(id,games,{status='completed',count=games.length}={}){const current=games.at(-1);return{room:{id,code:'ABCDEFGH',revision:3,mode:'standard',game:current,members:current.players.map(p=>({userId:p.id,name:p.name})),capabilities:{history:true},tournament:{status,gameCount:count,rules:current.rules}},snapshots:games.slice(0,-1)};}
afterEach(()=>setHomeAccountPreview(null));
describe('account-owned Home history',()=>{
 it('finds personal lowest completed scores including zero, counts ties once per game and separates rule versions',()=>{
  const zero=game('zero','peer','Jamie',0,20),tie=game('tie-zero','peer','Jamie',0,30),higher=game('higher','peer','Jamie',2,0);
  tie.endedAt='2026-10-23T18:00:00Z';
  const otherRules=game('v2','peer','Jamie',1,0);otherRules.rules={...otherRules.rules,version:2};
  const unfinished=table('active',[game('unfinished','peer','Jamie',0,0)],{status:'playing'});unfinished.room.game.status='active';
  const entry=table('results',[zero,tie,higher,otherRules],{status:'playing'});
  const result=summarizeHomeAccount('me',[entry,entry,unfinished]);
  expect(result.razzies).toHaveLength(2);
  expect(result.razzies.find(row=>row.rulesVersion===1)).toMatchObject({score:0,tiedGames:2,gameId:'tie-zero'});
  expect(result.razzies.find(row=>row.rulesVersion===2)).toMatchObject({score:1,tiedGames:1,gameId:'v2'});
  expect(summarizeHomeAccount('outsider',[entry]).razzies).toEqual([]);
 });
 it('uses the signed-in seat and complete bonus-inclusive score rather than an opponent score',()=>{
  const bonus=game('bonus','peer','Jamie',0,5);bonus.sheets[0].yahtzeeBonus=100;
  const low=game('low','peer','Jamie',10,0);
  const entry=table('scores',[bonus,low],{status:'playing'});
  expect(summarizeHomeAccount('me',[entry]).razzies[0]).toMatchObject({score:10,gameId:'low'});
  expect(summarizeHomeAccount('peer',[entry]).razzies[0]).toMatchObject({score:0,gameId:'low'});
 });
 it('counts each won tournament once, preserves independent honours and includes ties',()=>{
  const both=table('both',[game('a'),game('b')]);const tied=table('tie',[game('c','peer','Jamie',5,5)]);const loss=table('loss',[game('d','peer','Jamie',0,10)]);
  const value=summarizeHomeAccount('me',[both,both,tied,loss]);expect(value.trophies).toEqual({total:2,points:2,wins:2,completed:3});expect(value.people[0].games).toBe(4);
 });
 it('counts a points-only and games-only champion without inventing a single combined award',()=>{
  const split=table('split',[game('a','peer','Jamie',100,0),game('b','peer','Jamie',1,2),game('c','peer','Jamie',1,2)]);
  expect(summarizeHomeAccount('me',[split]).trophies).toEqual({total:1,points:1,wins:0,completed:1});
  expect(summarizeHomeAccount('peer',[split]).trophies).toEqual({total:1,points:0,wins:1,completed:1});
 });
 it('deduplicates opponents by account across aliases, keeps identical names on different accounts and excludes unfinished games',()=>{
  const old=game('old','peer','Old name');old.endedAt='2026-10-20T18:00:00Z';const latest=game('latest','peer','New name');const sameName=game('second','another','New name');
  const active=table('active',[game('unfinished','stranger','Never played')],{status:'playing'});active.room.game.status='active';
  const value=summarizeHomeAccount('me',[table('one',[old,latest]),table('two',[sameName]),active]);
  expect(value.people).toHaveLength(2);expect(value.people.find(p=>p.userId==='peer')).toMatchObject({name:'New name',games:2});expect(value.people.some(p=>p.userId==='stranger')).toBe(false);
 });
 it('does not count partial tournaments, a reopened current game or another account’s table',()=>{
  const partial=table('partial',[game('p')],{count:2});expect(()=>summarizeHomeAccount('me',[partial])).toThrow('history');
  const reopened=table('reopened',[game('r')],{status:'playing'});reopened.snapshots.push(structuredClone(reopened.room.game));reopened.room.game.status='active';
  expect(summarizeHomeAccount('me',[reopened]).people).toHaveLength(0);
  expect(summarizeHomeAccount('outsider',[table('foreign',[game('f')])]).trophies.total).toBe(0);
 });
 it('uses all session/history pages and only read operations',async()=>{
  const entry=table('paged',[game('first'),game('last')]);const cursor={createdAt:'2026-10-20T00:00:00.000Z',id:'cursor'};
  const requestRoom=vi.fn(async q=>q.operation==='sessions'?q.view==='open'?{rooms:[],nextBefore:null}:q.before?{rooms:[entry.room],nextBefore:null}:{rooms:[],nextBefore:cursor}:q.operation==='history'?q.before?{games:[],nextBefore:null}:{games:entry.snapshots,nextBefore:1}:{room:entry.room});
  const auth={getSession:vi.fn(async()=>({data:{session:{user:{id:'me'}}}}))};
  const data=await loadHomeAccount({client:{auth,requestRoom}});expect(data.trophies.total).toBe(1);expect(data.people[0].games).toBe(2);expect(requestRoom.mock.calls.every(([q])=>['sessions','history','read'].includes(q.operation))).toBe(true);
 });
 it('rejects stale table snapshots and repeated cursors instead of showing partial totals',async()=>{
  const entry=table('stale',[game('s')]);const auth={getSession:async()=>({data:{session:{user:{id:'me'}}}})};
  const requestRoom=vi.fn(async q=>q.operation==='sessions'?{rooms:q.view==='completed'?[entry.room]:[],nextBefore:null}:q.operation==='history'?{games:[],nextBefore:null}:{room:{...entry.room,revision:4}});
  await expect(loadHomeAccount({client:{auth,requestRoom}})).rejects.toThrow('changed');
  await expect(loadHomeAccount({client:{auth,requestRoom:async()=>({rooms:[],nextBefore:{id:'same'}})}})).rejects.toThrow('finish');
 });
 it('shows signed-out state rather than zero trophies, and discards another account’s late response',async()=>{
  const requestRoom=vi.fn();expect(await loadHomeAccount({client:{auth:null,requestRoom}})).toEqual({status:'signed-out'});expect(requestRoom).not.toHaveBeenCalled();
  const auth={getSession:vi.fn().mockResolvedValueOnce({data:{session:{user:{id:'me'}}}}).mockResolvedValueOnce({data:{session:{user:{id:'different'}}}})};
  expect(await loadHomeAccount({client:{auth,requestRoom:async()=>({rooms:[],nextBefore:null})}})).toEqual({status:'signed-out'});
 });
});
