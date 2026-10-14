import {it,expect,vi} from 'vitest';
import {createSupabaseRoomAdapter} from '../server/rooms/supabase-adapter.js';
import {roomHandler} from '../server/rooms/handler.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002';
const time='2026-10-03T18:00:00.000Z',key='test-service-key',url='https://fixture.supabase.invalid';
const room={id:'00000000-0000-4000-8000-000000000009',code:'ABCDEFGH',hostId:host,members:[{userId:host,name:'Host'}],revision:7,createdAt:time,status:'lobby',mode:'standard',game:null};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
const user=(extra={})=>({id:host,email_confirmed_at:time,is_anonymous:false,...extra});
const request=(headers={})=>new Request('https://fixture.invalid',{headers});
const setup=fetchImplementation=>createSupabaseRoomAdapter({url,key,fetchImplementation,now:()=>Date.parse(time)});

it.each([{}, {apikey:'test-public-key'},{Authorization:'Basic test'},{Authorization:'Bearer'}])('rejects missing bearer credentials before touching Auth or the service database: %s',async headers=>{
 const fetch=vi.fn();await expect(setup(fetch).authenticate(request(headers))).resolves.toBeNull();expect(fetch).not.toHaveBeenCalled();
});
it.each([401,403])('rejects invalid bearer tokens on Auth status %s',async status=>{
 const fetch=vi.fn(async()=>json({error:'private backend details'},status));
 await expect(setup(fetch).authenticate(request({Authorization:'Bearer invalid-test-token'}))).resolves.toBeNull();
 expect(fetch).toHaveBeenCalledWith(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:'Bearer invalid-test-token'}});
});
it.each([
 user({email_confirmed_at:null}),user({is_anonymous:true}),user({id:'------------------------------------'}),user({id:'not-a-user'}),user({id:123}),null
])('rejects unconfirmed/anonymous/malformed Auth identities %s',async value=>{
 const fetch=vi.fn(async()=>json(value));await expect(setup(fetch).authenticate(request({Authorization:'Bearer test-token'}))).resolves.toBeNull();
});
it('returns a verified confirmed UUID and keeps the user bearer separate from the service role',async()=>{
 const fetch=vi.fn(async()=>json(user()));await expect(setup(fetch).authenticate(request({Authorization:'Bearer user-test-token'}))).resolves.toBe(host);
 expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer user-test-token');
});
it.each([[],null])('reports CAS lost revision/409 as false rather than a backend exception: %s',async rows=>{
 const fetch=vi.fn(async()=>rows===null?json({error:key},409):json(rows));
 await expect(setup(fetch).store.update(room,6)).resolves.toBe(false);
 expect(fetch.mock.calls[0][0]).toBe(`${url}/rest/v1/clubhouse_rooms?id=eq.${room.id}&revision=eq.6`);
 const options=fetch.mock.calls[0][1];expect(options.method).toBe('PATCH');expect(options.headers.Authorization).toBe(`Bearer ${key}`);expect(options.headers.apikey).toBe(key);
 expect(JSON.parse(options.body)).toEqual({id:room.id,code:room.code,host_id:host,member_ids:[host],revision:7,state:room,created_at:time});
});
it('accepts exactly one CAS row and distinguishes an insert uniqueness conflict',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(json([{state:room}])).mockResolvedValueOnce(json({error:'duplicate'},409)).mockResolvedValueOnce(json([{state:room}],201));
 const {store}=setup(fetch);await expect(store.update(room,6)).resolves.toBe(true);await expect(store.insert(room)).resolves.toBe(false);await expect(store.insert(room)).resolves.toBe(true);
 expect(fetch.mock.calls[1][1].method).toBe('POST');
});
it.each(['http','throw','malformed-json','malformed-rows'])('sanitizes database failure %s and never mistakes it for a successful CAS',async failure=>{
 const fetch=vi.fn(async()=>{if(failure==='throw')throw Error(`${key} credential-url`);if(failure==='http')return json({error:key},500);if(failure==='malformed-json')return new Response(`${key} invalid JSON`);return json({error:key});});
 const {store}=setup(fetch);const error=await store.update(room,6).catch(error=>error);
 expect(error.message).toBe('Database request failed');expect(JSON.stringify(error)).not.toContain(key);
});
it('fails a read conflict safely instead of treating the rate-limit query as zero rooms',async()=>{
 const fetch=vi.fn(async()=>json({error:key},409));await expect(setup(fetch).store.recentCount(host)).rejects.toThrow('Database request failed');
});
it('uses injected time for the recent-host query and maps readable state without adding credentials',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(json([{id:room.id}])).mockResolvedValueOnce(json([{state:room}])).mockResolvedValueOnce(json([{state:room}])).mockResolvedValueOnce(json([{state:room}]));
 const {store}=setup(fetch);await expect(store.recentCount(host)).resolves.toBe(1);expect(fetch.mock.calls[0][0]).toContain('created_at=gte.2026-10-03T17:00:00.000Z');
 await expect(store.byId(room.id)).resolves.toEqual(room);await expect(store.get(room.code)).resolves.toEqual(room);await expect(store.list(host)).resolves.toEqual([room]);
 for(const [,options]of fetch.mock.calls)expect(options.headers).toMatchObject({apikey:key,Authorization:`Bearer ${key}`,Prefer:'return=representation'});
});
it('does not expose backend authentication exceptions through the HTTP handler',async()=>{
 const fetch=vi.fn(async()=>{throw Error(`${key} private-auth-url`);}),adapter=setup(fetch);
 await expect(adapter.authenticate(request({Authorization:'Bearer test-token'}))).rejects.toThrow('Authentication request failed');
 const handler=roomHandler({...adapter,randomCode:()=>room.code});
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer test-token'},body:JSON.stringify({operation:'list'})}));
 expect(response.status).toBe(500);expect(await response.text()).not.toMatch(/test-service-key|private-auth-url|Authentication request failed/);
});
it('uses the verified Auth user for membership instead of caller-supplied identity',async()=>{
 const fetch=vi.fn(async target=>target.endsWith('/auth/v1/user')?json(user({id:guest})):target.endsWith('/rpc/clubhouse_rematch_available')?json(false):json([{state:room}]));
 const handler=roomHandler({...setup(fetch),randomCode:()=>room.code});
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer guest-token','Test-User':host},body:JSON.stringify({operation:'read',code:room.code,userId:host})}));
 expect(response.status).toBe(403);expect(await response.text()).not.toContain(key);
 expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer guest-token');expect(fetch.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${key}`);
});

it('distinguishes missing rematch migration from uncertain backend failure',async()=>{
 const missing=setup(async()=>json({},404));await expect(missing.store.rematchAvailable()).resolves.toBe(false);
 await expect(setup(async()=>json({},500)).store.rematchAvailable()).rejects.toThrow('Database request failed');
 await expect(setup(async()=>{throw Error('private detail');}).store.rematchAvailable()).rejects.toThrow('Database request failed');
});
it('uses one trusted database RPC for archive and successor commit',async()=>{
 const fetch=vi.fn(async()=>json(true));await expect(setup(fetch).store.commit(room,6,{actor:host,commandId:'ready-command',fingerprint:'fingerprint'})).resolves.toBe(true);
 expect(fetch.mock.calls[0][0]).toBe(`${url}/rest/v1/rpc/clubhouse_commit_game`);expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({p_room_id:room.id,p_expected_revision:6,p_state:room,p_actor_id:host,p_command_id:'ready-command',p_fingerprint:'fingerprint'});
});
it('detects tournament migration using only trusted credentials',async()=>{
 const fetch=vi.fn(async()=>json(true));await expect(setup(fetch).store.tournamentsAvailable()).resolves.toBe(true);
 expect(fetch).toHaveBeenCalledWith(`${url}/rest/v1/rpc/clubhouse_tournaments_available`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}'});
 await expect(setup(async()=>json({},404)).store.tournamentsAvailable()).resolves.toBe(false);
});
it('probes manual Competition v2 capability without downgrading failures',async()=>{
 const fetch=vi.fn(async()=>json(true));await expect(setup(fetch).store.competitionAvailable()).resolves.toBe(true);
 expect(fetch.mock.calls[0][0]).toBe(`${url}/rest/v1/rpc/clubhouse_competition_v2_available`);
 await expect(setup(async()=>json({},404)).store.competitionAvailable()).resolves.toBe(false);
 await expect(setup(async()=>json({},500)).store.competitionAvailable()).rejects.toThrow('Database request failed');
 await expect(setup(async()=>json('true')).store.competitionAvailable()).rejects.toThrow('Database request failed');
});
it.each([500,401,403])('does not downgrade tournament availability on backend failure %s',async status=>{
 await expect(setup(async()=>json({private:key},status)).store.tournamentsAvailable()).rejects.toThrow('Database request failed');
});
it.each([null,{},'true'])('rejects malformed tournament capability response %s',async value=>{
 await expect(setup(async()=>json(value)).store.tournamentsAvailable()).rejects.toThrow('Database request failed');
});
it('fails closed on uncertain tournament capability transport',async()=>{
 await expect(setup(async()=>{throw Error(key);}).store.tournamentsAvailable()).rejects.toThrow('Database request failed');
});
it('loads at most twenty completed games in authoritative tournament order',async()=>{
 const rows=[{state:{id:room.id},sequence_number:1}],fetch=vi.fn(async()=>json(rows));
 await expect(setup(fetch).store.tournamentGames(room.id)).resolves.toEqual(rows);
 expect(fetch.mock.calls[0][0]).toBe(`${url}/rest/v1/clubhouse_games?room_id=eq.${room.id}&ended_at=not.is.null&select=state,sequence_number&order=sequence_number.asc&limit=20`);
 expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${key}`);
});
it('finds older open tournaments separately from the thirty-room recent list with stable pagination',async()=>{
 const fetch=vi.fn(async()=>json([])),before={createdAt:'2026-10-13T18:00:00.000Z',id:room.id};
 await setup(fetch).store.openTournaments(host,before);
 expect(fetch.mock.calls[0][0]).toContain('state->tournament=not.is.null&state->tournament->>status=neq.completed');
 expect(fetch.mock.calls[0][0]).toContain(`created_at.eq.${before.createdAt},id.lt.${room.id}`);
 expect(fetch.mock.calls[0][0]).toContain('order=created_at.desc,id.desc&limit=20');
 await expect(setup(fetch).store.openTournaments(host,{...before,id:'bad&other=eq.room'})).rejects.toThrow('Database request failed');expect(fetch).toHaveBeenCalledTimes(1);
});
it('classifies intermediate tournament results as open and final tournament results as completed',async()=>{
 const fetch=vi.fn(async()=>json([])),before={createdAt:'2026-10-14T12:00:00.000Z',id:room.id};
 await setup(fetch).store.sessions(host,'open',before);await setup(fetch).store.sessions(host,'completed');
 expect(fetch.mock.calls[0][0]).toContain('state->>status.neq.finished),state->tournament->>status.neq.completed');
 expect(fetch.mock.calls[0][0]).toContain('&and=(or(');expect(fetch.mock.calls[0][0]).toContain(`member_ids=cs.{${host}}`);
 expect(fetch.mock.calls[1][0]).toContain('state->>status.eq.finished),state->tournament->>status.eq.completed');
 await expect(setup(fetch).store.sessions(host,'everything')).rejects.toThrow('Database request failed');expect(fetch).toHaveBeenCalledTimes(2);
});
it('rejects invalid tournament history identity before touching database',async()=>{
 const fetch=vi.fn();await expect(setup(fetch).store.tournamentGames('bad&room_id=eq.other')).rejects.toThrow('Database request failed');expect(fetch).not.toHaveBeenCalled();
});
it('rejects malformed or failed tournament history responses',async()=>{
 await expect(setup(async()=>json({error:key})).store.tournamentGames(room.id)).rejects.toThrow('Database request failed');
 await expect(setup(async()=>json({error:key},500)).store.tournamentGames(room.id)).rejects.toThrow('Database request failed');
});
