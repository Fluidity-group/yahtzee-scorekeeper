import { describe, expect, it, vi } from 'vitest';
import { createNativeCommentaryPlayer, streamRequest } from '../src/commentary/native-player.js';
const claim={roomId:'room',jobId:'job:accepted-event',token:'single-use-claim',epoch:3,deviceId:'installation-session',monotonicDeadline:12000};
function fixture(){let callback;const plugin={addListener:vi.fn(async(_,listener)=>{callback=listener;return {remove:vi.fn()};}),play:vi.fn(async()=>{}),stop:vi.fn(async()=>{}),renew:vi.fn(async()=>{})};return {plugin,emit:event=>callback(event)};}
const event=(state,sequence=1,extra={})=>({jobId:claim.jobId,epoch:claim.epoch,state,sequence,nativeElapsedMs:150,measurementBasis:'native-audio-position-proxy',...extra});
describe('native authenticated incremental playback adapter (synthetic)',()=>{
 it('keeps credentials out of URLs and scopes exact encoded job route and bounded lease',()=>{
  const request=streamRequest('https://game.example',claim,'jwt',1000);
  expect(request.endpoint).toBe('https://game.example/commentary/room/audio/job%3Aaccepted-event');expect(request.endpoint).not.toContain(claim.token);expect(request.endpoint).not.toContain('jwt');expect(request.leaseRemainingMs).toBe(11000);
  expect(streamRequest('https://game.example',{...claim,monotonicDeadline:99999},'jwt',1000).leaseRemainingMs).toBe(15000);
  for(const base of ['http://game.example','https://u:p@game.example','https://game.example?jwt=secret'])expect(()=>streamRequest(base,claim,'jwt',1000)).toThrow('HTTPS');
  expect(()=>streamRequest('https://game.example',{...claim,monotonicDeadline:1000},'jwt',1000)).toThrow('expired');
  expect(()=>streamRequest('https://game.example',{...claim,token:'bad\r\nheader'},'jwt',1000)).toThrow('claim');
 });
 it('starts only from position-advancing events and labels measurement as proxy, never physical proof',async()=>{
  const f=fixture(),states=vi.fn(),measure=vi.fn();const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000,onMeasurement:measure});
  await player.play({claim,onEvent:states});f.emit(event('opening'));expect(states).not.toHaveBeenCalled();
  f.emit(event('first-byte',2));expect(states).not.toHaveBeenCalled();f.emit(event('playout-started',3));
  expect(states).toHaveBeenCalledWith(expect.objectContaining({state:'started',physicalAudibilityVerified:false,measurementBasis:'native-audio-position-proxy'}));
  expect(measure).toHaveBeenCalledTimes(2);f.emit(event('completed',4));expect(states.mock.calls[1][0].state).toBe('completed');await player.dispose();
 });
 it('ignores old jobs, epochs, duplicate events and does not retry consumed claim',async()=>{
  const f=fixture(),states=vi.fn();const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000});
  await player.play({claim,onEvent:states});f.emit(event('playout-started',1,{epoch:2}));f.emit(event('playout-started',1,{jobId:'old'}));expect(states).not.toHaveBeenCalled();
  f.emit(event('playout-started'));f.emit(event('playout-started'));expect(states).toHaveBeenCalledTimes(1);f.emit(event('failed',2));
  expect(await player.play({claim,onEvent:states})).toBe(false);expect(f.plugin.play).toHaveBeenCalledTimes(1);await player.dispose();
 });
 it('aborts immediately on mute/profanity/lease/game invalidation signal and drops late events',async()=>{
  const f=fixture(),states=vi.fn(),abort=new AbortController();const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000});
  await player.play({claim,signal:abort.signal,onEvent:states});abort.abort();await Promise.resolve();await Promise.resolve();
  expect(f.plugin.stop).toHaveBeenCalledTimes(2);expect(states).toHaveBeenCalledWith(expect.objectContaining({state:'interrupted',reason:'aborted'}));
  f.emit(event('playout-started',2));expect(states).toHaveBeenCalledTimes(1);await player.dispose();
 });
 it('does not open native stream when cancellation occurs while authentication resolves',async()=>{
  const f=fixture(),abort=new AbortController();let resolveToken;const token=new Promise(resolve=>{resolveToken=resolve;});const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:()=> token,monotonicNow:()=>1000});
  const pending=player.play({claim,signal:abort.signal});await Promise.resolve();await Promise.resolve();abort.abort();resolveToken('jwt');expect(await pending).toBe(false);expect(f.plugin.play).not.toHaveBeenCalled();await player.dispose();
 });
 it('renews only the current fenced claim and handles background/focus interruption once',async()=>{
  const f=fixture(),states=vi.fn();const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000});
  await player.play({claim,onEvent:states});expect(await player.renew({claim:{...claim,epoch:4}})).toBe(false);expect(await player.renew({claim:{...claim,monotonicDeadline:15000}})).toBe(true);
  f.emit(event('interrupted',1,{reason:'background'}));expect(states.mock.calls[0][0].reason).toBe('background');expect(await player.renew({claim})).toBe(false);await player.dispose();
 });
 it('fences concurrent play calls so an older auth response cannot replace newer playback',async()=>{
  const f=fixture();let resolveOld;const oldToken=new Promise(resolve=>{resolveOld=resolve;});let calls=0;
  const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:()=>++calls===1?oldToken:Promise.resolve('jwt-new'),monotonicNow:()=>1000});
  const older=player.play({claim});await Promise.resolve();await Promise.resolve();await Promise.resolve();
  const newest=player.play({claim:{...claim,jobId:'new-job',token:'new-claim'}});resolveOld('jwt-old');await Promise.all([older,newest]);
  expect(f.plugin.play).toHaveBeenCalledTimes(1);expect(f.plugin.play.mock.calls[0][0].jobId).toBe('new-job');await player.dispose();
 });
});

describe('native/controller local terminal receipt sequencing',()=>{
 it('uses the next monotonic sequence for an explicit interruption after actual playout',async()=>{
  const f=fixture(),states=vi.fn();const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000});
  await player.play({claim,onEvent:states});f.emit(event('playout-started',4));await player.stop('profile-changed');
  expect(states.mock.calls[1][0]).toMatchObject({state:'interrupted',sequence:5,reason:'profile-changed'});
  f.emit(event('completed',6));expect(states).toHaveBeenCalledTimes(2);await player.dispose();
 });
 it('sequences superseding interruption and fences old native completions',async()=>{
  const f=fixture(),old=vi.fn(),next=vi.fn();const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000});
  await player.play({claim,onEvent:old});f.emit(event('playout-started',3));const newer={...claim,jobId:'next-job',token:'next-token'};await player.play({claim:newer,onEvent:next});
  expect(old.mock.calls[1][0]).toMatchObject({state:'interrupted',sequence:4,reason:'superseded'});f.emit(event('completed',7));expect(next).not.toHaveBeenCalled();await player.dispose();
 });
 it('sequences native call failure without duplicating a terminal native failure',async()=>{
  const f=fixture(),states=vi.fn();f.plugin.play.mockRejectedValue(new Error('Native failed'));
  const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000});
  await expect(player.play({claim,onEvent:states})).rejects.toThrow('Native failed');expect(states.mock.calls[0][0]).toMatchObject({state:'failed',sequence:1});
  f.emit(event('failed',2));expect(states).toHaveBeenCalledTimes(1);await player.dispose();
 });
});

describe('native failure callback/call rejection race',()=>{
 it('reports only the sequenced native terminal when plugin also rejects its call',async()=>{
  const f=fixture(),states=vi.fn();f.plugin.play.mockImplementation(async()=>{f.emit(event('failed',3));throw new Error('Native rejected after terminal event');});
  const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>1000});
  await expect(player.play({claim,onEvent:states})).rejects.toThrow('Native rejected');expect(states).toHaveBeenCalledTimes(1);expect(states.mock.calls[0][0]).toMatchObject({state:'failed',sequence:3});await player.dispose();
 });
});

describe('native monotonic timing includes asynchronous preparation',()=>{
 it('rejects wall-clock-only claims',()=>{expect(()=>streamRequest('https://game.example',{...claim,monotonicDeadline:undefined,expiresAt:9999999999999},'jwt',1000)).toThrow('expired');});
 it('auth waiting consumes usable lease and cannot start stale native audio',async()=>{
  const f=fixture();let now=1000,release;const token=new Promise(resolve=>{release=resolve;});const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:()=>token,monotonicNow:()=>now});
  const pending=player.play({claim});await Promise.resolve();await Promise.resolve();now=13000;release('jwt');await expect(pending).rejects.toThrow('expired');expect(f.plugin.play).not.toHaveBeenCalled();await player.dispose();
 });
 it('listener registration waiting consumes usable lease',async()=>{
  const f=fixture();let now=1000,release;f.plugin.addListener.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));const player=createNativeCommentaryPlayer({plugin:f.plugin,serviceBase:'https://game.example',getAccessToken:async()=> 'jwt',monotonicNow:()=>now});
  const pending=player.play({claim});await Promise.resolve();await Promise.resolve();now=13000;release({remove:vi.fn()});await expect(pending).rejects.toThrow('expired');expect(f.plugin.play).not.toHaveBeenCalled();await player.dispose();
 });
});
