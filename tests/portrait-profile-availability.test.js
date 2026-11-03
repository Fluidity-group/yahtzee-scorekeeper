import{it,expect,vi}from'vitest';
import{portraitHandler}from'../server/portraits/handler.js';
const actor='10000000-0000-4000-8000-000000000001',id='20000000-0000-4000-8000-000000000001';
const request=body=>new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify(body)});
it('returns durable saved profile metadata when only image signing is unavailable',async()=>{
 const call=vi.fn(async()=>({owner_id:actor,job_id:id,revision:3,kind:'generated',image_path:'private/path',original_path:'private/original'}));const response=await portraitHandler({authenticate:async()=>actor,store:{call},images:{sign:async()=>{throw Error('storage unavailable');}}})(request({operation:'profile'}));
 expect(response.status).toBe(200);const data=await response.json();expect(data.profile).toMatchObject({ownerId:actor,avatarId:id,revision:3,kind:'generated',imageStatus:'unavailable'});expect(data.profile.url).toBeUndefined();expect(JSON.stringify(data)).not.toContain('private/');expect(call).toHaveBeenCalledTimes(1);
});
it('serves profile metadata without starting unrelated queued storage cleanup',async()=>{
 const call=vi.fn(async action=>action==='cleanup'?[{paths:['synthetic-private']}]:{owner_id:actor,revision:1,kind:'preset'});const remove=vi.fn(()=>new Promise(()=>{}));
 const response=await portraitHandler({authenticate:async()=>actor,store:{call},images:{remove}})(request({operation:'profile'}));expect(response.status).toBe(200);expect(remove).not.toHaveBeenCalled();expect(call.mock.calls.map(([action])=>action)).toEqual(['profile']);
});
it('bounds mutation cleanup without acknowledging unfinished deletions or blocking the saved preset',async()=>{
 const call=vi.fn(async action=>action==='cleanup'?[{id,paths:['synthetic-private']}]:{profile:{owner_id:actor,revision:2,kind:'preset',preset:'character-2'},cleanup:[]});const remove=vi.fn(paths=>paths.length?new Promise(()=>{}):Promise.resolve());
 const response=await portraitHandler({authenticate:async()=>actor,store:{call},images:{remove},cleanupTimeoutMs:5})(request({operation:'preset',preset:'character-2',revision:1}));expect(response.status).toBe(200);expect(call.mock.calls.some(([action])=>action==='cleanup-complete')).toBe(false);
});
