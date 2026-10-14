import {it,expect,vi} from 'vitest';
import {createCoreGame,command} from '../src/game/core.js';
import {createCommentaryService} from '../server/commentary/service.js';
import {InMemoryCommentaryStore} from '../server/commentary/in-memory-store.js';
import {commentaryHandler} from '../server/commentary/handler.js';
import {createCommentaryClient} from '../src/commentary/client-controller.js';
import {createNativeCommentaryPlayer} from '../src/commentary/native-player.js';
const host='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',roomId='00000000-0000-4000-8000-000000000003';
it('joins the real handler/client/native adapters: silent hydration, one authenticated stream, host-only exposure and retained caption',async()=>{
 const stamp='2026-10-14T20:00:00.000Z';let tick=Date.parse(stamp),serial=100;
 let game=createCoreGame({id:roomId,names:['Alex','Sam'],source:'manual',time:stamp});game=command(game,{type:'start',seat:0},{id:'start-stack',time:stamp});
 let room={id:roomId,hostId:host,members:[{userId:host},{userId:guest}],game};
 const store=new InMemoryCommentaryStore();const streamAudio=vi.fn(async function*(){yield new Uint8Array([1,2]);yield new Uint8Array([3]);});
 const service=createCommentaryService({store,getRoom:async()=>room,now:()=>tick,randomId:()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`,profile:{profanityAllowed:true,humorIntensity:'dark',frequency:'balanced'},budget:{maxRequests:2,maxCharacters:10000},syntheticProviders:{writeLine:async()=>({text:'Alex, twenty-five. The paperwork has ambitions.',containsProfanity:false}),streamAudio}});
 const handler=commentaryHandler({service,authenticate:async request=>request.headers.get('Authorization')==='Bearer synthetic-host-token'?host:request.headers.get('Authorization')==='Bearer synthetic-guest-token'?guest:null});
 const transport=async payload=>{const response=await handler(new Request('https://commentary.example.invalid/commentary',{method:'POST',headers:{Authorization:'Bearer synthetic-host-token','Content-Type':'application/json'},body:JSON.stringify(payload)}));if(!response.ok)throw Error(`Handler ${response.status}`);return response.json();};
 let listener,sequence=0;
 const plugin={addListener:async(_,callback)=>{listener=callback;return{remove:async()=>{}};},stop:vi.fn(async()=>{}),renew:vi.fn(async()=>{}),play:vi.fn(async request=>{
  const response=await handler(new Request(request.endpoint,{headers:{Authorization:`Bearer ${request.accessToken}`,'X-Commentary-Claim':request.claimToken,'X-Commentary-Epoch':String(request.epoch),'X-Commentary-Device':request.deviceId}}));expect(response.status).toBe(200);
  const reader=response.body.getReader();expect((await reader.read()).value).toEqual(new Uint8Array([1,2]));
  listener({jobId:request.jobId,epoch:request.epoch,state:'playout-started',sequence:++sequence,measurementBasis:'native-audio-position-proxy'});
  while(!(await reader.read()).done){};
  listener({jobId:request.jobId,epoch:request.epoch,state:'completed',sequence:++sequence,measurementBasis:'native-audio-position-proxy'});
 })};
 const player=createNativeCommentaryPlayer({plugin,serviceBase:'https://commentary.example.invalid',getAccessToken:async()=>'synthetic-host-token',now:()=>tick});
 const client=createCommentaryClient({request:transport,player,deviceId:'stack-phone',allowSyntheticPlayback:true});
 const context=()=>({roomId,userId:host,hostId:host,game:room.game,profileVersion:1,enabled:true,listenerMuted:false,paused:false,visible:true});
 try{
  client.update(context());await client.refresh();expect(plugin.play).not.toHaveBeenCalled();
  room={...room,game:command(room.game,{type:'score',seat:0,category:'chance',value:25},{id:'stack-score',time:stamp})};
  const jobId=await service.enqueueAccepted(room,room.game.events.at(-1).id);await service.prepareTrusted(jobId);client.update(context());await client.refresh();
  await vi.waitFor(()=>expect([...store.snapshot().exposure.values()][0]?.status).toBe('completed'));
  expect([...store.snapshot().exposure.values()][0].heardBy).toEqual([host]);expect(plugin.play).toHaveBeenCalledOnce();expect(streamAudio).toHaveBeenCalledOnce();
  await client.refresh();expect(client.snapshot().captions).toHaveLength(1);expect(plugin.play).toHaveBeenCalledOnce();
  expect(client.snapshot().measurement.measurementBasis).toBe('native-audio-position-proxy');
  expect(client.snapshot().captions[0].feedbackBasis).toBe('playback');await client.feedback({jobId,value:'like',basis:'playback'});
  expect(client.snapshot().captions[0].feedbackValue).toBe('like');
  const guestFeedback=async basis=>handler(new Request('https://commentary.example.invalid/commentary',{method:'POST',headers:{Authorization:'Bearer synthetic-guest-token','Content-Type':'application/json'},body:JSON.stringify({operation:'feedback',roomId,jobId,value:'dislike',basis})}));
  expect((await guestFeedback('playback')).status).toBe(409);expect((await guestFeedback('caption')).status).toBe(200);
  expect([...store.snapshot().exposure.values()][0].heardBy).toEqual([host]);expect(store.snapshot().feedback.size).toBe(2);
  const scoresBefore=JSON.stringify(room.game);await client.forgetHistory();await client.refresh();
  expect(client.snapshot().captions).toEqual([]);expect(store.snapshot().feedback.size).toBe(0);expect(JSON.stringify(room.game)).toBe(scoresBefore);
 }finally{client.dispose();await player.dispose();}
});
