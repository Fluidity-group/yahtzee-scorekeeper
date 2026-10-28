// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe,it,expect,beforeEach,vi } from 'vitest';
import { coreDb,saveCore,loadCore,listCore } from '../src/core-store.js';
import { createCoreGame } from '../src/game/core.js';
beforeEach(async()=>{await coreDb.games.clear();localStorage.clear();});
const game=()=>createCoreGame({id:'test',names:['Me'],mode:'competition'});
describe('durable core snapshots',()=>{
 it('writes recovery synchronously, then flushes to IndexedDB',async()=>{
  const g=game(),saved=saveCore(g);expect(localStorage.length).toBe(1);expect(JSON.parse(localStorage.getItem(localStorage.key(0)))).toEqual(g);
  await saved;expect(await loadCore()).toEqual(g);expect(localStorage.length).toBe(0);
 });
 it('recovers newer journal state left by a reload before IndexedDB commit',async()=>{
  const g=game();await saveCore(g);const newer={...g,revision:2};localStorage.setItem('yz_core_journal:test',JSON.stringify(newer));
  expect((await loadCore()).revision).toBe(2);
 });
 it('retains each game and its original mode snapshot',async()=>{
  const g=game();await saveCore(g);await saveCore({...g,id:'other',status:'finished'});
  expect(await listCore()).toHaveLength(2);expect((await loadCore()).rules.finalRolls).toBe(4);
 });
 it('does not silently succeed when recovery storage is full',()=>{
  const mock=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
  expect(()=>saveCore(game())).toThrow('quota');mock.mockRestore();
 });
 it('accepts the durable journal if IndexedDB fails, and recovers it',async()=>{
  const mock=vi.spyOn(coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  const g=game();expect(await saveCore(g)).toEqual({recoveryOnly:true});mock.mockRestore();
  expect(await loadCore()).toEqual(g);
 });
 it('rejects stale snapshots instead of claiming they saved',async()=>{
  await saveCore({...game(),revision:3});
  await expect(saveCore({...game(),revision:2})).rejects.toThrow('another tab');
  expect((await loadCore()).revision).toBe(3);
 });
 it('preserves a newer recovery-only save when a stale tab tries to save',async()=>{
  const unavailable=vi.spyOn(coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  try{
   const newer={...game(),revision:3,sheets:[{aces:3}]};await saveCore(newer);
   await expect(Promise.resolve().then(()=>saveCore({...game(),revision:2,sheets:[{aces:2}]}))).rejects.toThrow('another tab');
   expect(await loadCore()).toEqual(newer);
  }finally{unavailable.mockRestore();}
 });
 it('rejects different content at the same recovery revision, but permits an exact retry',async()=>{
  const unavailable=vi.spyOn(coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  try{
   const saved={...game(),revision:3,sheets:[{aces:3}]};await saveCore(saved);
   await expect(Promise.resolve().then(()=>saveCore({...saved,sheets:[{aces:2}]}))).rejects.toThrow('another tab');
   expect(await saveCore(structuredClone(saved))).toEqual({recoveryOnly:true});expect(await loadCore()).toEqual(saved);
  }finally{unavailable.mockRestore();}
 });
 it('keeps both interleaved same-revision writes and reports their conflict after database failure',async()=>{
  const other=await import('../src/core-store.js?interleaved-tab');
  const a=vi.spyOn(coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  const b=vi.spyOn(other.coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  const setItem=Storage.prototype.setItem;let concurrent,interleaved=false;
  const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(key,value){
   if(!interleaved&&key.startsWith('yz_core_journal:')){interleaved=true;concurrent=other.saveCore({...game(),revision:3,sheets:[{aces:2}]});}
   return setItem.call(this,key,value);
  });
  try{
   const saving=saveCore({...game(),revision:3,sheets:[{aces:3}]});
   const outcomes=await Promise.allSettled([saving,concurrent]);
   expect(outcomes.every(outcome=>outcome.status==='rejected'&&outcome.reason.name==='SaveConflict')).toBe(true);
   expect(localStorage.length).toBe(2);
   expect(Array.from({length:localStorage.length},(_,i)=>JSON.parse(localStorage.getItem(localStorage.key(i))).sheets[0].aces).sort()).toEqual([2,3]);
   await expect(loadCore()).rejects.toThrow('another tab');
  }finally{write.mockRestore();a.mockRestore();b.mockRestore();other.coreDb.close();}
 });
 it('loads the newest interleaved recovery revision instead of losing it to the last stale writer',async()=>{
  const unavailable=vi.spyOn(coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  const setItem=Storage.prototype.setItem;let concurrent,interleaved=false;
  const newer={...game(),revision:3,sheets:[{aces:3}]};
  const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(key,value){
   if(!interleaved&&key.startsWith('yz_core_journal:')){interleaved=true;concurrent=saveCore(newer);}
   return setItem.call(this,key,value);
  });
  try{
   const stale=saveCore({...game(),revision:2,sheets:[{aces:2}]});
   const outcomes=await Promise.allSettled([stale,concurrent]);
   expect(outcomes[0].status).toBe('rejected');expect(outcomes[1]).toEqual({status:'fulfilled',value:{recoveryOnly:true}});
   expect(await loadCore()).toEqual(newer);
  }finally{write.mockRestore();unavailable.mockRestore();}
 });
 it('prunes superseded recovery entries only after IndexedDB accepts the newer save',async()=>{
  const unavailable=vi.spyOn(coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  await saveCore({...game(),revision:2});unavailable.mockRestore();
  const newer={...game(),revision:3};await saveCore(newer);
  expect(localStorage.length).toBe(0);expect(await loadCore()).toEqual(newer);
 });
 it('retains a legacy recovery journal if a stale write is rejected while IndexedDB is unavailable',async()=>{
  const newer={...game(),revision:3};localStorage.setItem('yz_core_journal:test',JSON.stringify(newer));
  const unavailable=vi.spyOn(coreDb,'transaction').mockRejectedValue(new Error('unavailable'));
  try{
   await expect(saveCore({...game(),revision:2})).rejects.toThrow('another tab');expect(await loadCore()).toEqual(newer);
  }finally{unavailable.mockRestore();}
 });
 it('does not delete a newer tab journal that arrives while the database commit is pending',async()=>{
  const transaction=coreDb.transaction.bind(coreDb);let finish,started;
  const entered=new Promise(resolve=>{started=resolve;});
  const pause=vi.spyOn(coreDb,'transaction').mockImplementationOnce((...args)=>new Promise(resolve=>{finish=async()=>resolve(await transaction(...args));started();}));
  const newer={...game(),revision:4,sheets:[{aces:4}]};
  try{
   const saving=saveCore({...game(),revision:3,sheets:[{aces:3}]});await entered;
   localStorage.setItem('yz_core_journal:other-tab',JSON.stringify(newer));await finish();await saving;
   expect(await loadCore()).toEqual(newer);expect(localStorage.length).toBe(1);
  }finally{pause.mockRestore();}
 });
});
