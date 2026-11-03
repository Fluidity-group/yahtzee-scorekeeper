import {it,expect,vi} from 'vitest';
import {loadReportTables,ReportsRetired} from '../src/reports/load.js';
import {reportGame,reportTable} from './helpers/report-fixtures.js';
const auth=()=>({getSession:vi.fn(async()=>({data:{session:{user:{id:'one'}}}}))});
const cursor={createdAt:'2026-10-01T00:00:00.000Z',id:'older'};
it('loads both session views/all history pages through read-only requests fenced to the existing owner',async()=>{
 const table=reportTable('t',[reportGame('a'),reportGame('b')]),request=vi.fn(async q=>{
  if(q.operation==='sessions')return q.view==='open'?{rooms:[],nextBefore:null}:q.before?{rooms:[table.room],nextBefore:null}:{rooms:[],nextBefore:cursor};
  if(q.operation==='history')return q.before?{games:[table.snapshots[0]],nextBefore:null}:{games:[table.snapshots[1]],nextBefore:2};
  if(q.operation==='read')return{room:table.room};throw Error('Mutation forbidden');
 });
 const rows=await loadReportTables({auth:auth(),request,userId:'one'});expect(rows).toHaveLength(1);expect(rows[0].snapshots).toHaveLength(2);expect(request.mock.calls.every(([q,options])=>['sessions','history','read'].includes(q.operation)&&options.expectedUserId==='one')).toBe(true);expect(request.mock.calls.some(([q])=>q.operation==='history'&&q.before===2)).toBe(true);
});
it('rejects a signed-out or replacement account before reading history',async()=>{
 const request=vi.fn();await expect(loadReportTables({auth:{getSession:async()=>({data:{session:null}})},request,userId:'one'})).rejects.toBeInstanceOf(ReportsRetired);expect(request).not.toHaveBeenCalled();
 await expect(loadReportTables({auth:auth(),request,userId:'other'})).rejects.toBeInstanceOf(ReportsRetired);
});
it('retires a late history response without reading or returning the previous account’s next page',async()=>{
 const table=reportTable('t',[reportGame('a')]);let current=true;
 const request=vi.fn(async q=>q.operation==='sessions'?{rooms:q.view==='completed'?[table.room]:[],nextBefore:null}:(current=false,{games:table.snapshots,nextBefore:1}));
 await expect(loadReportTables({auth:auth(),request,userId:'one',isCurrent:()=>current})).rejects.toBeInstanceOf(ReportsRetired);expect(request.mock.calls.filter(([q])=>q.operation==='history')).toHaveLength(1);expect(request.mock.calls.some(([q])=>q.operation==='read')).toBe(false);
});
it('checks the owner again after the completed read, including missed auth events',async()=>{
 const account=auth();account.getSession.mockResolvedValueOnce({data:{session:{user:{id:'one'}}}}).mockResolvedValueOnce({data:{session:{user:{id:'two'}}}});
 await expect(loadReportTables({auth:account,request:async()=>({rooms:[],nextBefore:null}),userId:'one'})).rejects.toBeInstanceOf(ReportsRetired);
});
it('fails instead of publishing partial history after a revision change',async()=>{
 const table=reportTable('t',[reportGame('a')]);const request=vi.fn(async q=>q.operation==='sessions'?{rooms:q.view==='completed'?[table.room]:[],nextBefore:null}:q.operation==='history'?{games:table.snapshots,nextBefore:null}:{room:{...table.room,revision:11}});
 await expect(loadReportTables({auth:auth(),request,userId:'one'})).rejects.toThrow('changed');
});
it('rejects repeated/backwards session and history cursors',async()=>{
 const request=vi.fn(async()=>({rooms:[],nextBefore:cursor}));await expect(loadReportTables({auth:auth(),request,userId:'one'})).rejects.toThrow('pages');
 const t=reportTable('t',[reportGame('a')]);const history=vi.fn(async q=>q.operation==='sessions'?{rooms:q.view==='completed'?[t.room]:[],nextBefore:null}:{games:t.snapshots,nextBefore:2});await expect(loadReportTables({auth:auth(),request:history,userId:'one'})).rejects.toThrow('pages');
});
it('preserves unavailable-history coverage instead of silently claiming a full archive',async()=>{
 const t=reportTable('t',[reportGame('a')]);t.room.capabilities.history=false;
 const request=vi.fn(async q=>q.operation==='sessions'?{rooms:q.view==='completed'?[t.room]:[],nextBefore:null}:{room:t.room});
 const rows=await loadReportTables({auth:auth(),request,userId:'one'});expect(rows[0]).toMatchObject({historyAvailable:false,snapshots:[]});expect(request.mock.calls.some(([q])=>q.operation==='history')).toBe(false);
});
it('bounds concurrent per-table work and detects foreign table membership',async()=>{
 const tables=Array.from({length:7},(_,i)=>{const t=reportTable('t'+i,[reportGame('g'+i)]);t.room.code='ABCDEFG'+'HJKLMNPQ'[i];return t;}),lookup=new Map(tables.map(t=>[t.room.code,t]));let pending=0,maximum=0;
 const request=vi.fn(async q=>{if(q.operation==='sessions')return{rooms:q.view==='completed'?tables.map(t=>t.room):[],nextBefore:null};if(q.operation==='history'){maximum=Math.max(maximum,++pending);await new Promise(r=>setTimeout(r,1));pending--;return{games:lookup.get(q.code).snapshots,nextBefore:null};}return{room:lookup.get(q.code).room};});
 expect(await loadReportTables({auth:auth(),request,userId:'one'})).toHaveLength(7);expect(maximum).toBeLessThanOrEqual(3);
 await expect(loadReportTables({auth:auth(),request:async()=>({rooms:[{...tables[0].room,members:[]}],nextBefore:null}),userId:'one'})).rejects.toBeInstanceOf(ReportsRetired);
});
it('rejects a table moving between session classifications during pagination',async()=>{
 const table=reportTable('t',[reportGame('a')]);const request=vi.fn(async q=>({rooms:[{...table.room,revision:q.view==='open'?11:10}],nextBefore:null}));await expect(loadReportTables({auth:auth(),request,userId:'one'})).rejects.toThrow('changed');
});

it('stops queued table reads after another worker fails instead of continuing an abandoned report',async()=>{
 const tables=Array.from({length:5},(_,i)=>{const t=reportTable('t'+i,[reportGame('g'+i)]);t.room.code='ABCDEFG'+'HJKLM'[i];return t;}),releases=[];
 const request=vi.fn(async q=>{if(q.operation==='sessions')return{rooms:q.view==='completed'?tables.map(t=>t.room):[],nextBefore:null};if(q.operation==='history'){if(q.code===tables[0].room.code)throw Error('History unavailable');await new Promise(resolve=>releases.push(resolve));return{games:[],nextBefore:null};}throw Error('Should not continue');});
 await expect(loadReportTables({auth:auth(),request,userId:'one'})).rejects.toThrow('History unavailable');releases.forEach(resolve=>resolve());await new Promise(r=>setTimeout(r,0));expect(request.mock.calls.filter(([q])=>q.operation==='history').length).toBeLessThanOrEqual(3);expect(request.mock.calls.some(([q])=>q.operation==='read')).toBe(false);
});
