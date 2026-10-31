import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const mock=vi.hoisted(()=>({getSession:vi.fn(),createClient:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:mock.createClient}));
const room={id:'fixture-room',code:'ABCDEFGH',revision:1};
let requestRoom,fetch;
beforeEach(async()=>{
 vi.useFakeTimers();vi.resetModules();vi.clearAllMocks();
 vi.stubEnv('VITE_SUPABASE_URL','https://fixture.supabase.invalid');vi.stubEnv('VITE_SUPABASE_ANON_KEY','test-public-key');vi.stubEnv('VITE_GAME_WEB_URL','https://fixture.invalid');
 mock.getSession.mockResolvedValue({data:{session:{access_token:'test-token'}}});mock.createClient.mockReturnValue({auth:{getSession:mock.getSession}});
 fetch=vi.fn();vi.stubGlobal('fetch',fetch);({requestRoom}=await import('../src/multiplayer/client.js'));
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('uses bounded fetch for Supabase account networking',async()=>{
 const options=mock.createClient.mock.calls[0][2];expect(options.auth.storageKey).toBe('clubhouse-account');
 fetch.mockResolvedValue(new Response('{}'));await options.global.fetch('https://fixture.invalid/auth');
 expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);expect(vi.getTimerCount()).toBe(0);
});
it('retries an uncertain request once with the identical serialized action and command ID',async()=>{
 const payload={operation:'command',code:room.code,commandId:'same-command-id',expectedRevision:0,action:{type:'score',value:5}};
 const original=JSON.stringify(payload);
 fetch.mockImplementationOnce(async()=>{payload.action.value=99;payload.operation='list';throw new TypeError('Failed to fetch');}).mockResolvedValueOnce(new Response(JSON.stringify({room})));
 await expect(requestRoom(payload)).resolves.toEqual({room});expect(fetch).toHaveBeenCalledTimes(2);
 expect(fetch.mock.calls.map(call=>call[1].body)).toEqual([original,original]);expect(vi.getTimerCount()).toBe(0);
});
it('bounds a stalled session lookup and never sends an unauthenticated request',async()=>{
 mock.getSession.mockImplementation(()=>new Promise(()=>{}));const outcome=requestRoom({operation:'list'}).catch(error=>error);
 await vi.advanceTimersByTimeAsync(15000);expect((await outcome).message).toContain('internet connection');expect(fetch).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('shares one fifteen-second budget across retries and reports a clear network recovery message',async()=>{
 fetch.mockImplementation(()=>new Promise(()=>{}));const outcome=requestRoom({operation:'list'}).catch(error=>error);
 await vi.advanceTimersByTimeAsync(12000);expect(fetch).toHaveBeenCalledTimes(2);
 await vi.advanceTimersByTimeAsync(3000);expect((await outcome).message).toContain('Local games');expect(vi.getTimerCount()).toBe(0);
});
it('includes authentication and a stalled response body in the same deadline',async()=>{
 let lookup;mock.getSession.mockImplementation(()=>new Promise(resolve=>lookup=resolve));
 fetch.mockResolvedValue({ok:true,json:()=>new Promise(()=>{})});
 const outcome=requestRoom({operation:'list'}).catch(error=>error);await vi.advanceTimersByTimeAsync(10000);
 lookup({data:{session:{access_token:'test-token'}}});await vi.advanceTimersByTimeAsync(5000);
 expect((await outcome).message).toContain('internet connection');expect(vi.getTimerCount()).toBe(0);
});
it('does not retry caller cancellation reported by fetch',async()=>{
 fetch.mockRejectedValue(Object.assign(Error('private transport detail'),{name:'AbortError'}));
 await expect(requestRoom({operation:'list'})).rejects.toThrow('internet connection');expect(fetch).toHaveBeenCalledTimes(1);
});
it('preserves a trusted server rule rejection and avoids retrying HTTP conflicts',async()=>{
 fetch.mockResolvedValue(new Response(JSON.stringify({error:'The game changed. Refresh and choose your score again.'}),{status:409}));
 await expect(requestRoom({operation:'command'})).rejects.toThrow('The game changed.');expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(['<html>proxy failure</html>','null','[]','{}','{"room":[]}','{"room":{}}','{"room":{"id":"x","code":"ABCDEFGH","revision":"1"}}'])('reports fixed unreadable-response error for malformed room payload %s',async body=>{
 fetch.mockResolvedValue(new Response(body));await expect(requestRoom({operation:'read'})).rejects.toThrow('server returned an unreadable response');expect(fetch).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
});
it('checks list snapshot identities and accepts an empty room list',async()=>{
 fetch.mockResolvedValueOnce(new Response(JSON.stringify({rooms:[room]}))).mockResolvedValueOnce(new Response('{"rooms":[{}]}')).mockResolvedValueOnce(new Response('{"rooms":[]}'));
 await expect(requestRoom({operation:'list'})).resolves.toEqual({rooms:[room]});
 await expect(requestRoom({operation:'list'})).rejects.toThrow('server returned an unreadable response');
 await expect(requestRoom({operation:'list'})).resolves.toEqual({rooms:[]});
});
it('bounds a stalled response body and safely consumes its late rejection',async()=>{
 let reject;fetch.mockResolvedValue({ok:true,json:()=>new Promise((resolve,no)=>reject=no)});
 const outcome=requestRoom({operation:'list'}).catch(error=>error);await vi.advanceTimersByTimeAsync(15000);
 expect((await outcome).message).toContain('internet connection');reject(Error('late body'));await Promise.resolve();expect(vi.getTimerCount()).toBe(0);
});

it('validates paginated hosted game history instead of accepting an arbitrary export payload',async()=>{
 const game={id:'finished-game',schema:1,players:[],sheets:[],events:[]};
 fetch.mockResolvedValueOnce(new Response(JSON.stringify({games:[game],nextBefore:20}))).mockResolvedValueOnce(new Response(JSON.stringify({games:[game],nextBefore:0})));
 await expect(requestRoom({operation:'history',code:room.code})).resolves.toEqual({games:[game],nextBefore:20});
 await expect(requestRoom({operation:'history',code:room.code})).rejects.toThrow('unreadable response');
});
it('uses sign-in recovery for a missing session and maps session transport errors',async()=>{
 mock.getSession.mockResolvedValueOnce({data:{session:null}});await expect(requestRoom({operation:'list'})).rejects.toThrow('Please sign in again.');
 mock.getSession.mockResolvedValueOnce({data:{session:null},error:{name:'AuthRetryableFetchError',message:'private backend details'}});
 await expect(requestRoom({operation:'list'})).rejects.toThrow('internet connection');expect(fetch).not.toHaveBeenCalled();
});
it('validates tournament standings account identities and rejects malformed counts',async()=>{
 const standings={standings:[{userId:'a',name:'Amber',points:100,wins:1,games:1},{userId:'b',name:'Dan',points:90,wins:0,games:1}],completedGames:1,final:false,roomRevision:1,gameId:'current-game',gameRevision:28};
 fetch.mockResolvedValueOnce(new Response(JSON.stringify(standings))).mockResolvedValueOnce(new Response(JSON.stringify({...standings,completedGames:-1}))).mockResolvedValueOnce(new Response(JSON.stringify({...standings,standings:[standings.standings[0],standings.standings[0]]})));
 await expect(requestRoom({operation:'standings',code:room.code})).resolves.toEqual(standings);
 await expect(requestRoom({operation:'standings',code:room.code})).rejects.toThrow('unreadable response');
 await expect(requestRoom({operation:'standings',code:room.code})).rejects.toThrow('unreadable response');
});
it('accepts paginated open tournaments but rejects completed entries and unsafe cursors',async()=>{
 const open={...room,tournament:{status:'paused'}},page={rooms:[open],nextBefore:null};
 fetch.mockResolvedValueOnce(new Response(JSON.stringify(page))).mockResolvedValueOnce(new Response(JSON.stringify({rooms:[{...open,tournament:{status:'completed'}}],nextBefore:null}))).mockResolvedValueOnce(new Response(JSON.stringify({rooms:[open],nextBefore:{createdAt:'bad&query',id:'bad'}})));
 await expect(requestRoom({operation:'tournaments'})).resolves.toEqual(page);
 await expect(requestRoom({operation:'tournaments'})).rejects.toThrow('unreadable response');
 await expect(requestRoom({operation:'tournaments'})).rejects.toThrow('unreadable response');
});
it('binds Studio writes to the expected account before any network transport',async()=>{mock.getSession.mockResolvedValue({data:{session:{access_token:'test-token',user:{id:'different-account'}}}});await expect(requestRoom({operation:'reaction-draft-save'},{expectedUserId:'original-account'})).rejects.toThrow('account changed');expect(fetch).not.toHaveBeenCalled();});
it('accepts bounded private draft responses while rejecting malformed versions',async()=>{const draft={id:'d',roomId:'r',ownerId:'u',revision:1,baseConfigVersion:0,content:{operation:'save',rule:{id:'x'}}};fetch.mockResolvedValueOnce(new Response(JSON.stringify({drafts:[draft]}))).mockResolvedValueOnce(new Response(JSON.stringify({drafts:[{...draft,revision:0}]})));expect((await requestRoom({operation:'reaction-draft-list'})).drafts).toEqual([draft]);await expect(requestRoom({operation:'reaction-draft-list'})).rejects.toThrow('Unreadable Studio');});
