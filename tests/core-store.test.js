// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe,it,expect,beforeEach,vi } from 'vitest';
import { coreDb,saveCore,loadCore,listCore } from '../src/core-store.js';
import { createCoreGame } from '../src/game/core.js';
beforeEach(async()=>{await coreDb.games.clear();localStorage.clear();});
const game=()=>createCoreGame({id:'test',names:['Me'],mode:'competition'});
describe('durable core snapshots',()=>{
 it('writes recovery synchronously, then flushes to IndexedDB',async()=>{
  const g=game(),saved=saveCore(g);expect(JSON.parse(localStorage.getItem('yz_core_journal:test'))).toEqual(g);
  await saved;expect(await loadCore()).toEqual(g);expect(localStorage.getItem('yz_core_journal:test')).toBeNull();
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
});
