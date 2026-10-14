import {describe,it,expect,vi} from 'vitest';
import {createCommentaryClient} from '../src/commentary/client-controller.js';
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup(){
 const ctx={roomId:'room',userId:'host',hostId:'host',game:{id:'game',events:[{id:'score',type:'score'}]},profileVersion:1,enabled:true,listenerMuted:false,paused:false,visible:true};
 let jobs=[],playerEvent;const lease={owner:'host',device:'phone',epoch:3,expiresAt:50000};
 const request=vi.fn(async payload=>({result:payload.operation==='profile-read'?{version:1,capabilities:{providerMode:'synthetic',liveProviders:false}}:payload.operation==='jobs-read'?jobs:payload.operation==='playback-acquire'||payload.operation==='playback-heartbeat'?lease:payload.operation==='playback-claim'?{claimed:true,token:'claim'}:{accepted:true}}));
 const player={play:vi.fn(async options=>{playerEvent=options.onEvent;}),stop:vi.fn(),renew:vi.fn()};
 const client=createCommentaryClient({request,player,deviceId:'phone',allowSyntheticPlayback:true});
 client.update(ctx);
 const job=(id,eventId='score')=>({id,eventId,gameId:'game',profileVersion:1,status:'ready',caption:'The dice have hired an accountant.',acceptedAt:'2026-10-14',dependencyEventIds:[eventId]});
 return {ctx,client,request,player,lease,job,setJobs:value=>{jobs=value;},emit:event=>playerEvent(event)};
}
describe('authenticated commentary client controller',()=>{
 it('hydrates captions silently and plays only a subsequent new eligible job',async()=>{
  const f=setup();f.setJobs([f.job('old')]);await f.client.refresh();expect(f.client.snapshot().captions).toHaveLength(1);expect(f.player.play).not.toHaveBeenCalled();
  f.setJobs([f.job('old'),f.job('new')]);await f.client.refresh();await tick();
  expect(f.player.play).toHaveBeenCalledOnce();expect(f.player.play.mock.calls[0][0].claim).toEqual({roomId:'room',jobId:'new',token:'claim',epoch:3,deviceId:'phone',expiresAt:50000});
  await f.client.refresh();expect(f.player.play).toHaveBeenCalledOnce();
  expect(f.request.mock.calls.every(([p])=>!('text' in p)&&!('facts' in p)&&!('heardBy' in p))).toBe(true);
  f.client.dispose();
 });
 it('never waits on voice to refresh captions, and only native events establish receipts',async()=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('new')]);
  f.player.play.mockImplementationOnce(options=>{f.emit=options.onEvent;return new Promise(()=>{});});
  await f.client.refresh();await tick();expect(f.request.mock.calls.some(([p])=>p.operation==='playback-event')).toBe(false);
  f.emit({jobId:'new',epoch:3,state:'started',sequence:1,measurementBasis:'native-audio-position-proxy',nativeElapsedMs:25});await tick();
  f.emit({jobId:'new',epoch:3,status:'started',sequence:1});f.emit({jobId:'new',epoch:3,state:'completed',sequence:2});await tick();
  const receipts=f.request.mock.calls.filter(([p])=>p.operation==='playback-event').map(([p])=>p);
  expect(receipts.map(r=>r.status)).toEqual(['started','completed']);expect(receipts.every(r=>!('heardBy' in r))).toBe(true);expect(f.client.snapshot().playing).toBeNull();
  f.client.dispose();
 });
 it('permits unrelated score revisions but cancels dependent Undo and removes invalid captions',async()=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('new')]);await f.client.refresh();await tick();
  f.client.update({...f.ctx,game:{id:'game',events:[{id:'score',type:'score'},{id:'other',type:'score'}]}});expect(f.player.stop).not.toHaveBeenCalled();
  f.client.update({...f.ctx,game:{id:'game',events:[{id:'undo',type:'score-undo',target:'score'}]}});
  expect(f.player.stop).toHaveBeenCalledWith('facts-invalidated');expect(f.client.snapshot().captions).toHaveLength(0);expect(f.player.play.mock.calls[0][0].signal.aborted).toBe(true);
  f.emit({jobId:'new',epoch:3,status:'started',sequence:1});await tick();expect(f.request.mock.calls.some(([p])=>p.operation==='playback-event')).toBe(false);f.client.dispose();
 });
 it.each([{paused:true},{visible:false},{listenerMuted:true},{profileVersion:2},{userId:null},{game:{id:'next',events:[]}}])('cancels pending/current playback for %j',async patch=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('new')]);await f.client.refresh();await tick();f.client.update({...f.ctx,...patch});
  expect(f.player.stop).toHaveBeenCalled();expect(f.client.snapshot().playing).toBeNull();f.client.dispose();
 });
 it('lease epoch loss fences stale native callbacks and never extends server expiry locally',async()=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('new')]);await f.client.refresh();await tick();
  f.lease.epoch=4;await f.client.heartbeat();expect(f.player.stop).toHaveBeenCalledWith('lease-lost');
  f.emit({jobId:'new',epoch:3,status:'completed',sequence:1});await tick();expect(f.request.mock.calls.some(([p])=>p.operation==='playback-event')).toBe(false);f.client.dispose();
 });
 it('guests and disabled provider capability remain caption-only',async()=>{
  const f=setup();f.client.update({...f.ctx,userId:'guest'});await f.client.refresh();f.setJobs([f.job('new')]);await f.client.refresh();expect(f.player.play).not.toHaveBeenCalled();expect(f.request.mock.calls.some(([p])=>p.operation==='playback-acquire')).toBe(false);f.client.dispose();
  const g=setup();g.request.mockImplementation(async p=>({result:p.operation==='profile-read'?{version:1,capabilities:{providerMode:'disabled',liveProviders:false}}:[g.job('new')]}));await g.client.refresh();g.setJobs([g.job('later')]);await g.client.refresh();expect(g.player.play).not.toHaveBeenCalled();g.client.dispose();
 });
 it('sanitizes service errors rather than exposing provider/account data',async()=>{
  const f=setup();f.request.mockRejectedValueOnce(Error('secret-key provider internal'));await f.client.refresh();expect(f.client.snapshot().error).not.toContain('secret');expect(f.client.snapshot().status).toBe('caption-only');f.client.dispose();
 });
});


describe('commentary client stale and capability boundaries',()=>{
 it('ignores responses from an abandoned authenticated scope',async()=>{
  const f=setup();let release;f.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  const task=f.client.refresh();f.client.update({...f.ctx,userId:null});release({result:{version:1,capabilities:{providerMode:'synthetic'}}});await task;
  expect(f.client.snapshot().status).toBe('offline');expect(f.player.play).not.toHaveBeenCalled();expect(f.request).toHaveBeenCalledOnce();f.client.dispose();
 });
 it('rejects source events absent from authority and captions corrected after their source event',async()=>{
  const f=setup();f.setJobs([f.job('missing','not-accepted')]);await f.client.refresh();expect(f.client.snapshot().captions).toHaveLength(0);
  f.setJobs([f.job('invalid')]);f.client.update({...f.ctx,game:{id:'game',events:[{id:'score',type:'score'},{id:'correction',type:'score-correction',target:'score'}]}});await f.client.refresh();
  expect(f.client.snapshot().captions).toHaveLength(0);expect(f.player.play).not.toHaveBeenCalled();f.client.dispose();
 });
 it('stops current playback when service capability is disabled or an observed lease epoch changes',async()=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('new')]);await f.client.refresh();await tick();
  f.client.update({...f.ctx,leaseEpoch:4});expect(f.player.stop).toHaveBeenCalledWith('lease-lost');f.client.dispose();
  const g=setup();await g.client.refresh();g.setJobs([g.job('new')]);await g.client.refresh();await tick();
  g.request.mockImplementationOnce(async()=>({result:{version:1,capabilities:{providerMode:'disabled',liveProviders:false}}}));await g.client.refresh();
  expect(g.player.stop).toHaveBeenCalledWith('provider-unavailable');expect(g.client.snapshot().status).toBe('caption-only');g.client.dispose();
 });
 it('a broken UI subscriber never propagates into accepted-game update handling',()=>{
  const f=setup();const client=createCommentaryClient({request:f.request,player:f.player,deviceId:'other',onChange:()=>{throw Error('drawer render failed');}});
  expect(()=>client.update(f.ctx)).not.toThrow();expect(()=>client.dispose()).not.toThrow();f.client.dispose();
 });
});



describe('client concrete backend projection contract',()=>{
 it('sends the whitelisted playback-heartbeat operation and renews the exact fenced claim',async()=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('new')]);await f.client.refresh();await tick();await f.client.heartbeat();
  expect(f.request).toHaveBeenCalledWith({operation:'playback-heartbeat',roomId:'room',device:'phone',epoch:3},{signal:expect.any(AbortSignal)});
  expect(f.player.renew).toHaveBeenCalledWith({claim:{roomId:'room',jobId:'new',token:'claim',epoch:3,deviceId:'phone',expiresAt:50000}});f.client.dispose();
 });
 it('keeps safe started/completed/interrupted remarks in recent captions but never replays terminal jobs',async()=>{
  const f=setup();f.setJobs([{...f.job('old'),status:'completed'}]);await f.client.refresh();expect(f.client.snapshot().captions.map(c=>c.id)).toEqual(['old']);
  f.setJobs([{...f.job('old'),status:'completed'},f.job('new')]);await f.client.refresh();await tick();expect(f.player.play).toHaveBeenCalledOnce();
  f.emit({jobId:'new',epoch:3,state:'started',sequence:1});await tick();
  f.setJobs([{...f.job('old'),status:'completed'},{...f.job('new'),status:'started'}]);await f.client.refresh();expect(f.client.snapshot().captions.map(c=>c.id)).toEqual(['old','new']);
  f.emit({jobId:'new',epoch:3,state:'completed',sequence:2});await tick();
  f.setJobs([{...f.job('old'),status:'interrupted'},{...f.job('new'),status:'completed'}]);await f.client.refresh();
  expect(f.client.snapshot().captions.map(c=>c.id)).toEqual(['old','new']);expect(f.player.play).toHaveBeenCalledOnce();f.client.dispose();
 });
 it('rejects malformed dependency metadata before checking includes and retains other safe captions',async()=>{
  const f=setup();f.client.update({...f.ctx,game:{id:'game',events:[{id:'score',type:'score'},{id:'later',type:'score-correction',target:'unrelated'}]}});
  f.setJobs([{...f.job('bad'),dependencyEventIds:{}},{...f.job('bad-string'),dependencyEventIds:'score'},f.job('safe')]);
  await f.client.refresh();expect(f.client.snapshot().captions.map(c=>c.id)).toEqual(['safe']);expect(f.client.snapshot().error).toBeNull();expect(f.player.play).not.toHaveBeenCalled();f.client.dispose();
 });
});

describe('authenticated feedback and Forget operations',()=>{
 it('retains only safe feedback metadata and sends exact account-authenticated feedback without hearing/account payload',async()=>{
  const f=setup();f.setJobs([{...f.job('rated'),feedbackBasis:'caption',feedbackValue:'like'},{...f.job('unsafe'),feedbackBasis:'everyone-heard',feedbackValue:'auto-liked'}]);await f.client.refresh();
  expect(f.client.snapshot().captions[0]).toMatchObject({feedbackBasis:'caption',feedbackValue:'like'});expect(f.client.snapshot().captions[1]).not.toHaveProperty('feedbackBasis');expect(f.client.snapshot().captions[1]).not.toHaveProperty('feedbackValue');
  f.request.mockImplementationOnce(async p=>({result:{jobId:p.jobId,value:p.value,basis:p.basis}}));
  await f.client.feedback({jobId:'rated',value:'dislike',basis:'caption'});
  expect(f.request).toHaveBeenCalledWith({operation:'feedback',roomId:'room',jobId:'rated',value:'dislike',basis:'caption'},{signal:expect.any(AbortSignal)});
  expect(f.request.mock.calls.every(([p])=>!('heardBy'in p)&&!('accountId'in p))).toBe(true);
  await expect(f.client.feedback({jobId:'unsafe',value:'like',basis:'playback'})).rejects.toThrow('Feedback unavailable');f.client.dispose();
 });
 it('never applies or refreshes stale feedback after authenticated context changes',async()=>{
  const f=setup();f.setJobs([{...f.job('rated'),feedbackBasis:'playback'}]);await f.client.refresh();let release;
  f.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const task=f.client.feedback({jobId:'rated',value:'like',basis:'playback'});f.client.update({...f.ctx,userId:null});
  release({result:{jobId:'rated',value:'like',basis:'playback'}});await expect(task).rejects.toThrow('session changed');expect(f.client.snapshot().captions).toHaveLength(0);expect(f.request.mock.calls.filter(([p])=>p.operation==='jobs-read')).toHaveLength(1);f.client.dispose();
 });
 it('Forget stops buffers and clears captions immediately, then rehydrates silently without game/profile writes',async()=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('spoken')]);await f.client.refresh();await tick();const before=JSON.stringify(f.ctx.game);let release;
  f.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const task=f.client.forgetHistory();
  expect(f.player.stop).toHaveBeenCalledWith('history-forgotten');expect(f.client.snapshot().captions).toHaveLength(0);expect(f.client.snapshot().playing).toBeNull();
  expect(f.request).toHaveBeenCalledWith({operation:'forget-history',roomId:'room'},{signal:expect.any(AbortSignal)});
  release({result:{affectedJobs:1,durability:'process-memory-rehearsal'}});await task;await tick();expect(f.client.snapshot().captions).toHaveLength(0);expect(f.player.play).toHaveBeenCalledOnce();expect(JSON.stringify(f.ctx.game)).toBe(before);
  expect(f.request.mock.calls.some(([p])=>['profile-update','player-profile-update','command'].includes(p.operation))).toBe(false);f.client.dispose();
 });
 it('stale Forget replies cannot resurrect a new account context',async()=>{
  const f=setup();await f.client.refresh();let release;f.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const task=f.client.forgetHistory();f.client.update({...f.ctx,userId:null});release({result:{affectedJobs:1}});
  await expect(task).rejects.toThrow('session changed');expect(f.client.snapshot().status).toBe('offline');expect(f.client.snapshot().captions).toHaveLength(0);f.client.dispose();
 });
});


describe('server cancellation clears buffered native playback',()=>{
 it.each(['cancelled','failed','missing','caption-null','invalid-source'])('stops fully buffered/unresolved native audio on %s without a profile/context change',async condition=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('playing')]);
  let eventSink;f.player.play.mockImplementationOnce(options=>{eventSink=options.onEvent;return new Promise(()=>{});});
  await f.client.refresh();await tick();const signal=f.player.play.mock.calls[0][0].signal;
  expect(signal.aborted).toBe(false);eventSink({jobId:'playing',epoch:3,state:'started',sequence:1});await tick();
  const next=condition==='missing'?[]:condition==='caption-null'?[{...f.job('playing'),status:'started',caption:null}]:condition==='invalid-source'?[{...f.job('playing'),status:'started',eventId:'absent'}]:[{...f.job('playing'),status:condition}];
  f.setJobs(next);await f.client.refresh();
  expect(f.player.stop).toHaveBeenCalledWith('server-cancelled');expect(signal.aborted).toBe(true);expect(f.client.snapshot().playing).toBeNull();
  // Even a stale service response must not reuse consumed playback authority.
  f.setJobs([f.job('playing')]);await f.client.refresh();await tick();expect(f.player.play).toHaveBeenCalledOnce();f.client.dispose();
 });
 it('keeps a legitimate started line playing through an unrelated authoritative score and caption poll',async()=>{
  const f=setup();await f.client.refresh();f.setJobs([f.job('playing')]);f.player.play.mockImplementationOnce(()=>new Promise(()=>{}));await f.client.refresh();await tick();
  f.client.update({...f.ctx,game:{id:'game',events:[{id:'score',type:'score'},{id:'unrelated',type:'score'}]}});f.setJobs([{...f.job('playing'),status:'started'}]);await f.client.refresh();
  expect(f.player.stop).not.toHaveBeenCalled();expect(f.player.play.mock.calls[0][0].signal.aborted).toBe(false);expect(f.client.snapshot().playing.jobId).toBe('playing');f.client.dispose();
 });
});
