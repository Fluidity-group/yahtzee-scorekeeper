import {it,expect,vi} from 'vitest';
import {createCommentaryService} from '../server/commentary/service.js';
import {InMemoryCommentaryStore} from '../server/commentary/in-memory-store.js';
const host='00000000-0000-4000-8000-000000000001',roomId='00000000-0000-4000-8000-000000000002';
it('acquire and renewal project one sampled server clock without persisting client timing fields',async()=>{
 const store=new InMemoryCommentaryStore(),now=vi.fn().mockReturnValueOnce(1000000000000).mockReturnValueOnce(1000000001000);
 const service=createCommentaryService({store,getRoom:async()=>({id:roomId,hostId:host,members:[{userId:host}]}),now,profile:{profanityAllowed:true,humorIntensity:'dark',frequency:'balanced'}});
 const acquired=await service.acquire(host,roomId,{device:'phone-device'});expect(now).toHaveBeenCalledTimes(1);expect(acquired).toMatchObject({epoch:1,serverNowMs:1000000000000,expiresAt:1000000015000,remainingMs:15000});
 const renewed=await service.heartbeat(host,roomId,{device:'phone-device',epoch:1});expect(now).toHaveBeenCalledTimes(2);expect(renewed).toMatchObject({epoch:1,serverNowMs:1000000001000,expiresAt:1000000016000,remainingMs:15000});expect(store.snapshot().leases.get(roomId)).not.toHaveProperty('serverNowMs');
});
