import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {fetchWithTimeout,waitForOnline,onlineErrorMessage} from '../src/multiplayer/connection.js';
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it.each(['TypeError','AbortError','TimeoutError','AuthRetryableFetchError'])('replaces %s transport details with a fixed recovery message',name=>{
 const message=onlineErrorMessage({name,message:'private-url-or-token'});
 expect(message).toContain('internet connection');expect(message).toContain('Local games');expect(message).not.toContain('private');
});
it('maps failed-to-fetch errors while retaining ordinary trusted game errors',()=>{
 expect(onlineErrorMessage(Error('Failed to fetch'))).toContain('internet connection');
 expect(onlineErrorMessage(Error('It is another player’s turn.'))).toBe('It is another player’s turn.');
});
it('bounds the whole operation at fifteen seconds and consumes a late rejection',async()=>{
 let reject;const original=new Promise((resolve,no)=>reject=no),pending=waitForOnline(original);
 const outcome=pending.catch(error=>error);await vi.advanceTimersByTimeAsync(14999);expect(vi.getTimerCount()).toBe(1);
 await vi.advanceTimersByTimeAsync(1);expect((await outcome).name).toBe('TimeoutError');expect(vi.getTimerCount()).toBe(0);
 reject(Error('late'));await Promise.resolve();await Promise.resolve();
});
it('cleans the overall timer on success and early rejection',async()=>{
 await expect(waitForOnline(Promise.resolve('ok'))).resolves.toBe('ok');expect(vi.getTimerCount()).toBe(0);
 await expect(waitForOnline(Promise.reject(Error('game rule')))).rejects.toThrow('game rule');expect(vi.getTimerCount()).toBe(0);
});
it('bounds a fetch that ignores abort and consumes its late response',async()=>{
 let finish,signal;const fetch=vi.fn((url,options)=>{signal=options.signal;return new Promise(resolve=>finish=resolve);});
 const outcome=fetchWithTimeout('https://fixture.invalid',{},fetch).catch(error=>error);
 await vi.advanceTimersByTimeAsync(12000);expect((await outcome).name).toBe('TimeoutError');expect(signal.aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
 finish(new Response('late'));await Promise.resolve();await Promise.resolve();
});
it('combines caller cancellation and removes its listener and timer',async()=>{
 const caller=new AbortController(),remove=vi.spyOn(caller.signal,'removeEventListener');let signal,reject;
 const fetch=vi.fn((url,options)=>{signal=options.signal;return new Promise((resolve,no)=>reject=no);});
 const outcome=fetchWithTimeout('https://fixture.invalid',{signal:caller.signal},fetch).catch(error=>error);
 await Promise.resolve();caller.abort(Error('private cancellation detail'));
 expect((await outcome).name).toBe('AbortError');expect(signal.aborted).toBe(true);expect(remove).toHaveBeenCalledWith('abort',expect.any(Function));expect(vi.getTimerCount()).toBe(0);
 reject(Error('late transport failure'));await Promise.resolve();
});
it('does not fetch for a previously aborted caller or Request signal',async()=>{
 const caller=new AbortController();caller.abort();const fetch=vi.fn();
 await expect(fetchWithTimeout('https://fixture.invalid',{signal:caller.signal},fetch)).rejects.toMatchObject({name:'AbortError'});
 await expect(fetchWithTimeout(new Request('https://fixture.invalid',{signal:caller.signal}),{},fetch)).rejects.toMatchObject({name:'AbortError'});
 expect(fetch).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('cleans deadline and caller listener on successful fetch and early failure',async()=>{
 const caller=new AbortController(),remove=vi.spyOn(caller.signal,'removeEventListener');
 const response=new Response('{}');await expect(fetchWithTimeout('https://fixture.invalid',{signal:caller.signal},async()=>response)).resolves.toBe(response);
 await expect(fetchWithTimeout('https://fixture.invalid',{signal:caller.signal},async()=>{throw new TypeError('Failed to fetch');})).rejects.toThrow('internet connection');
 expect(remove).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
});
it('redacts arbitrary fetch implementation errors rather than treating them as trusted game text',async()=>{
 const error=await fetchWithTimeout('https://fixture.invalid',{},async()=>{throw Error('private-url-and-token');}).catch(error=>error);
 expect(error.name).toBe('TypeError');expect(error.message).toContain('internet connection');expect(error.message).not.toContain('private');
});
