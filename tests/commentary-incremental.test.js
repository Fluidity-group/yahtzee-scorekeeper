import {it,expect,vi} from 'vitest';
import {DurableCommentaryStore,emptyDurableCommentaryState,encodeCommentaryState} from '../server/commentary/durable-store.js';
import {createRequestTrace} from '../server/commentary/request-trace.js';
const scope='00000000-0000-4000-8000-000000000099';
function fixture(){let version=0,clock=1000,state=encodeCommentaryState(emptyDurableCommentaryState());state.jobs=Object.fromEntries(Array.from({length:80},(_,i)=>['job'+i,{status:'ready',evidence:'x'.repeat(6000)}]));const calls=[];
 const rpc=async(op,body)=>{let result;
  if(op==='clubhouse_commentary_load'||op==='clubhouse_commentary_load_changed')result=op.endsWith('_changed')&&body.p_known_version===version?{version,notModified:true,databaseNowMs:++clock}:{version,state:structuredClone(state),databaseNowMs:++clock};
  else if(op==='clubhouse_commentary_patch'||op==='clubhouse_commentary_commit'){
   if(body.p_expected_version!==version)result={committed:false,version,databaseNowMs:++clock};
   else{if(body.p_state)state=structuredClone(body.p_state);else{for(const[c,items]of Object.entries(body.p_changes))Object.assign(state[c],structuredClone(items));for(const[c,keys]of Object.entries(body.p_deleted))for(const k of keys)delete state[c][k];}result={committed:true,version:++version,databaseNowMs:++clock};}
  }else throw Error('Unexpected RPC');
  calls.push({op,body:structuredClone(body),bytes:JSON.stringify(body).length+JSON.stringify(result).length});return result;
 };return {rpc,calls,get:()=>({state,version,clock})};
}
it('conditional refresh remains current, catches another writer and never shares mutable snapshots',async()=>{
 const f=fixture(),a=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true}).initialize();const clock=a.databaseNowMs;await a.refresh();expect(a.databaseNowMs).toBeGreaterThan(clock);expect(f.calls.at(-1).bytes).toBeLessThan(250);
 const b=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true}).initialize();await b.transaction(state=>state.settings.set('room',{enabled:true}));await a.refresh();expect(a.snapshot().settings.get('room').enabled).toBe(true);const copy=a.snapshot();copy.settings.get('room').enabled=false;expect(a.snapshot().settings.get('room').enabled).toBe(true);
});
it('unchanged projection polls perform no commit, but authority-sensitive no-ops retain CAS',async()=>{
 const f=fixture(),a=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true}).initialize();await a.transaction(state=>state.jobs.get('job0'),{skipUnchanged:true});expect(f.get().version).toBe(0);expect(f.calls.some(c=>c.op.endsWith('_patch'))).toBe(false);await a.transaction(()=>true);expect(f.get().version).toBe(1);
});
it('delta updates and removals preserve unrelated records across collided writers',async()=>{
 const f=fixture(),a=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true}).initialize(),b=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true}).initialize();await Promise.all([a.transaction(state=>{state.jobs.get('job0').status='completed';state.memoryCaches.set('old',{});}),b.transaction(state=>state.settings.set('room',{version:2}))]);await a.transaction(state=>state.memoryCaches.delete('old'));await a.refresh();expect(a.snapshot().settings.get('room').version).toBe(2);expect(a.snapshot().jobs.get('job0').status).toBe('completed');expect(a.snapshot().jobs.size).toBe(80);expect(a.snapshot().memoryCaches.size).toBe(0);expect(f.calls.some(c=>c.body.p_deleted?.memoryCaches?.includes('old'))).toBe(true);
});
it('matching workload transfers far less data and stops polling writes',async()=>{
 const run=async incremental=>{const f=fixture(),store=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental}).initialize();for(let i=0;i<5;i++)await store.transaction(state=>state.jobs.size,{skipUnchanged:true});await store.transaction(state=>{state.jobs.get('job0').status='completed';});return {bytes:f.calls.reduce((n,c)=>n+c.bytes,0),writes:f.calls.filter(c=>/_patch$|_commit$/.test(c.op)).length};};
 const before=await run(false),after=await run(true);expect(after.bytes).toBeLessThan(before.bytes*0.15);expect(after.writes).toBe(1);expect(before.writes).toBe(6);console.info('Commentary transport benchmark',JSON.stringify({before,after}));
});
it('refuses invalid not-modified clocks/versions and never falls back to stale snapshots',async()=>{
 const f=fixture(),store=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true}).initialize();store.rpc=async()=>({notModified:true,version:99,databaseNowMs:2000});await expect(store.refresh()).rejects.toThrow('Invalid conditional');
});
it('request tracing contains numeric totals, fixed route labels and no private input',async()=>{
 const events=[],trace=createRequestTrace({fetchImpl:vi.fn(async()=>new Response('ok')),emit:e=>events.push(e),region:'us-east-1'});await trace.fetch('https://secret.example/rest/v1/rpc/clubhouse_commentary_patch',{headers:{Authorization:'Bearer PRIVATE_TOKEN'},body:'PRIVATE_BLURB'});trace.report('response','jobs-read',200);const printed=JSON.stringify(events);expect(printed).not.toMatch(/PRIVATE|secret.example|Authorization/);expect(events[0].upstreamCounts.clubhouse_commentary_patch).toBe(1);expect(events[0].submittedBytes).toBe(13);expect(trace.serverTiming()).toMatch(/^commentary;dur=/);
});

it('warm cached seed checks the live version before use and cannot hide another writer',async()=>{
 const f=fixture();let seed;const first=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true,onSnapshot:row=>seed=row}).initialize();
 await first.transaction(state=>state.settings.set('room',{enabled:true}));const stale=seed;
 const other=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true}).initialize();await other.transaction(state=>state.settings.set('room',{enabled:false}));
 const resumed=await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true,seed:stale}).initialize();expect(resumed.snapshot().settings.get('room').enabled).toBe(false);
 const before=f.calls.length;await new DurableCommentaryStore({rpc:f.rpc,scopeId:scope,incremental:true,seed:{state:resumed.snapshot(),version:resumed.version,databaseNowMs:resumed.databaseNowMs}}).initialize();expect(f.calls.length).toBe(before+1);expect(f.calls.at(-1).bytes).toBeLessThan(250);
});
