// @vitest-environment jsdom
import {beforeAll,describe,it,expect,vi} from 'vitest';
import {createHostedCommentarySession} from '../src/ui/hosted-commentary-session.js';
const host='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222',roomId='33333333-3333-4333-8333-333333333333';
const wait=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
function fixture(userId=host,{lobby=false}={}){
 let profile={schemaVersion:1,version:1,enabled:false,humorIntensity:'dark',profanityAllowed:true,frequency:'balanced',voiceOption:'rachel',capabilities:{liveProviders:false,providerMode:'synthetic'}},personal={accountId:userId,version:0,displayName:'',gender:'',blurb:'',shareWithRoom:false},jobs=[];
 const room={id:roomId,hostId:host,members:[{userId:host},{userId:guest}],game:{id:'44444444-4444-4444-8444-444444444444',events:[{id:'score',type:'score'}]}};
 if(lobby){room.status='lobby';room.game=null;}
 const request=vi.fn(async p=>{
  if(p.operation==='profile-read')return {result:{...profile}};
  if(p.operation==='profile-update'){if(p.expectedVersion!==profile.version)throw Error('Settings changed');profile={...profile,...p.changes,version:profile.version+1};return {result:{...profile}};}
  if(p.operation==='player-profile-read')return {result:{...personal}};
  if(p.operation==='player-profile-update'){personal={...personal,...p.changes,version:personal.version+1};return {result:{...personal}};}
  if(p.operation==='player-profile-delete'){personal={...personal,gender:'',blurb:'',version:personal.version+1,shareWithRoom:false};return {result:{deleted:true}};}
  if(p.operation==='jobs-read')return {result:jobs};
  if(p.operation==='feedback'){jobs=jobs.map(j=>j.id===p.jobId?{...j,feedbackValue:p.value}:j);return {result:{jobId:p.jobId,value:p.value,basis:p.basis}};}
  if(p.operation==='forget-history'){jobs=[];return {result:{affectedJobs:1}};}
  if(p.operation==='playback-acquire'||p.operation==='playback-heartbeat')return {result:{owner:host,device:'phone',epoch:1,expiresAt:10015000,serverNowMs:10000000,remainingMs:15000}};
  if(p.operation==='playback-claim')return {result:{claimed:true,token:'claim-token'}};
  return {result:{accepted:true}};
 });
 const player={play:vi.fn(async()=>{}),stop:vi.fn(),renew:vi.fn()},onNotice=vi.fn();
 const session=createHostedCommentarySession({request,player,deviceId:'phone',onNotice,pollMs:0,allowSyntheticPlayback:true,nativeAudioAvailable:true});
 const context={room,userId,connected:true,visible:true};session.update(context);
 const job={id:'55555555-5555-4555-8555-555555555555',gameId:room.game?.id||'44444444-4444-4444-8444-444444444444',eventId:'score',dependencyEventIds:['score'],profileVersion:1,status:'completed',caption:'A remarkable joke',feedbackBasis:userId===host?'playback':'caption'};
 return {session,context,request,player,onNotice,bumpProfile:()=>{profile={...profile,version:profile.version+1};},setJobs:value=>{jobs=value;},job};
}
describe('hosted commentary session integration',()=>{
 it('keeps centered score entry untouched and refuses to stack a commentary drawer',async()=>{
  const f=fixture();document.body.innerHTML='<dialog id="score" open>Full House entry</dialog>';const score=document.querySelector('#score');expect(await f.session.open({scoreDialog:score})).toBe(false);expect(score.open).toBe(true);expect(score.textContent).toBe('Full House entry');expect(document.querySelector('.hosted-commentary-drawer')).toBeNull();f.session.dispose();
 });
 it('requires an explicit frequency and saves host voice independently from intensity/profanity with revision CAS',async()=>{
  const f=fixture();await f.session.open();const form=document.querySelector('[data-commentary-form]');expect(form.elements.voiceOption.value).toBe('rachel');expect(form.elements.humorIntensity.value).toBe('dark');expect(form.elements.frequency.value).toBe('');
  form.elements.enabled.checked=true;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();expect(f.request.mock.calls.some(([p])=>p.operation==='profile-update')).toBe(false);
  form.elements.frequency.value='highlights';form.elements.voiceOption.value='ditzy';form.elements.profanityAllowed.checked=false;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();
  expect(f.request).toHaveBeenCalledWith({operation:'profile-update',roomId,expectedVersion:1,changes:{enabled:true,frequency:'highlights',voiceOption:'ditzy',humorIntensity:'dark',profanityAllowed:false}},{signal:expect.any(AbortSignal)});f.session.dispose();
 });
 it('guests have disabled table settings but can edit/share their own optional profile without sending account UUID authority',async()=>{
  const f=fixture(guest);await f.session.open();expect(document.querySelector('[data-commentary-form] fieldset').disabled).toBe(true);const form=document.querySelector('[data-hosted-personal]');form.elements.accountGender.value='nonbinary';form.elements.accountBlurb.value='I pretend every score is a spreadsheet.';form.elements.shareWithRoom.checked=true;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();
  expect(f.request).toHaveBeenCalledWith({operation:'player-profile-update',roomId,expectedVersion:0,changes:{displayName:'',gender:'nonbinary',blurb:'I pretend every score is a spreadsheet.',shareWithRoom:true}},{signal:expect.any(AbortSignal)});
  expect(f.request.mock.calls.every(([p])=>!('accountId'in p)&&!('heardBy'in p))).toBe(true);expect(f.player.play).not.toHaveBeenCalled();f.session.dispose();
 });
 it('connects guest caption Like/Dislike and Forget to authenticated APIs while preserving profile and score snapshots',async()=>{
  const f=fixture(guest);f.setJobs([f.job]);await f.session.open();const before=JSON.stringify(f.context.room.game);const like=document.querySelector('[data-caption-feedback="like"]');expect(like.getAttribute('aria-label')).toBe('Like this remark');like.click();await wait();
  expect(f.request).toHaveBeenCalledWith({operation:'feedback',roomId,jobId:f.job.id,value:'like',basis:'caption'},{signal:expect.any(AbortSignal)});
  document.querySelector('[data-caption-forget]').click();await wait();expect(f.request).toHaveBeenCalledWith({operation:'forget-history',roomId},{signal:expect.any(AbortSignal)});expect(document.querySelectorAll('[data-caption-id]')).toHaveLength(0);expect(JSON.stringify(f.context.room.game)).toBe(before);expect(document.querySelector('[data-hosted-personal]')).not.toBeNull();f.session.dispose();
 });
 it('caption refresh preserves in-progress personal form input; disconnected/sign-out updates stop sound and close stale drawers',async()=>{
  const f=fixture();await f.session.open();const textarea=document.querySelector('[name="accountBlurb"]');textarea.value='Unsaved draft';f.setJobs([f.job]);await f.session.refresh();expect(document.querySelector('[name="accountBlurb"]')).toBe(textarea);expect(textarea.value).toBe('Unsaved draft');
  f.session.update({...f.context,connected:false});await wait();expect(f.player.play).not.toHaveBeenCalled();f.session.update({...f.context,userId:null});expect(document.querySelector('.hosted-commentary-drawer')).toBeNull();f.session.dispose();
 });
 it('a detached old profile form cannot write into a new authenticated user session',async()=>{
  const f=fixture();await f.session.open();const form=document.querySelector('[data-hosted-personal]');f.session.update({...f.context,userId:guest});form.elements.accountBlurb.value='Old host draft';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();expect(f.request.mock.calls.some(([p])=>p.operation==='player-profile-update')).toBe(false);f.session.dispose();
 });
});


it('plays a newly accepted ready remark on the explicitly enabled/unmuted host only',async()=>{
 const f=fixture();await f.session.open();const form=document.querySelector('[data-commentary-form]');form.elements.enabled.checked=true;form.elements.frequency.value='balanced';form.elements.listenerMuted.checked=false;form.elements.listenerMuted.dispatchEvent(new Event('change',{bubbles:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();
 const room={...f.context.room,game:{...f.context.room.game,events:[...f.context.room.game.events,{id:'new-score',type:'score'}]}};
 f.setJobs([{...f.job,status:'ready',profileVersion:2,eventId:'new-score',dependencyEventIds:['new-score'],feedbackBasis:null}]);f.session.update({...f.context,room});await f.session.refresh();await wait();expect(f.player.play).toHaveBeenCalledOnce();expect(f.player.play.mock.calls[0][0].claim.roomId).toBe(roomId);f.session.dispose();
});
it('does not silently overwrite settings changed on another host device after the drawer opened',async()=>{
 const f=fixture();await f.session.open();const form=document.querySelector('[data-commentary-form]');f.bumpProfile();await f.session.refresh();form.elements.enabled.checked=true;form.elements.frequency.value='lively';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();
 expect(f.request.mock.calls.find(([p])=>p.operation==='profile-update')[0].expectedVersion).toBe(1);expect(form.querySelector('[data-commentary-error]').textContent).toContain('Reopen commentary');f.session.dispose();
});
it('never fabricates membership for an invalid or nonmember account identifier',async()=>{
 const f=fixture('not-an-auth-uuid');await wait();expect(await f.session.open()).toBe(false);expect(f.request).not.toHaveBeenCalled();expect(f.player.play).not.toHaveBeenCalled();f.session.dispose();
});


it('browser host remains caption-only unless native audio availability is explicitly supplied',async()=>{
 const f=fixture();f.session.dispose();const session=createHostedCommentarySession({request:f.request,player:f.player,deviceId:'browser',pollMs:0,allowSyntheticPlayback:true});session.update(f.context);await session.open();const form=document.querySelector('[data-commentary-form]');form.elements.enabled.checked=true;form.elements.frequency.value='balanced';form.elements.listenerMuted.checked=false;form.elements.listenerMuted.dispatchEvent(new Event('change',{bubbles:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();
 f.setJobs([{...f.job,status:'ready',profileVersion:2}]);await session.refresh();await wait();expect(f.player.play).not.toHaveBeenCalled();expect(f.request.mock.calls.some(([p])=>p.operation==='playback-acquire')).toBe(false);session.dispose();
});




it('silently rehydrates fresh background jobs on foreground return rather than replaying unseen remarks',async()=>{
 const f=fixture();await f.session.open();const form=document.querySelector('[data-commentary-form]');form.elements.enabled.checked=true;form.elements.frequency.value='balanced';form.elements.listenerMuted.checked=false;form.elements.listenerMuted.dispatchEvent(new Event('change',{bubbles:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait();
 f.session.update({...f.context,visible:false});f.setJobs([{...f.job,status:'ready',profileVersion:2}]);await f.session.refresh();f.session.update({...f.context,visible:true});await f.session.refresh();await wait();expect(f.player.play).not.toHaveBeenCalled();f.session.dispose();
});

it('shows only eligible utterances inline without a drawer, survives replacement, preserves score input focus and clears forgotten remarks',async()=>{
 const f=fixture(guest);document.body.innerHTML='<main id="game"><div data-hosted-commentary-inline></div></main><dialog id="score"><input value="23"></dialog>';
 const root=document.querySelector('#game'),score=document.querySelector('#score');f.session.mountSurface({root,scoreDialog:score});
 f.setJobs([{...f.job,status:'ready',feedbackBasis:null}]);await f.session.refresh();expect(root.textContent).toBe('');
 f.setJobs([f.job]);await f.session.refresh();expect(root.textContent).toContain('A remarkable joke');expect(document.querySelector('.hosted-commentary-drawer')).toBeNull();
 const like=root.querySelector('[data-caption-feedback="like"]');expect(like.getAttribute('aria-label')).toBe('Like this remark');like.click();await wait();expect(f.request.mock.calls.find(([p])=>p.operation==='feedback')[0]).toEqual({operation:'feedback',roomId,jobId:f.job.id,value:'like',basis:'caption'});
 root.innerHTML='<div data-hosted-commentary-inline></div>';f.session.mountSurface({root,scoreDialog:score});expect(root.querySelector('[aria-pressed="true"]')).not.toBeNull();
 score.showModal();score.querySelector('input').focus();f.session.refreshSurface();expect([...root.querySelectorAll('button')].every(b=>b.disabled)).toBe(true);await f.session.refresh();expect(document.activeElement).toBe(score.querySelector('input'));expect(score.querySelector('input').value).toBe('23');
 score.close();f.session.refreshSurface();root.querySelector('[data-inline-commentary-more]').click();await wait();expect(document.querySelector('.hosted-commentary-drawer')).not.toBeNull();document.querySelector('[data-caption-forget]').click();await wait();expect(root.textContent).toBe('');f.session.dispose();
});

it('configures and unmutes Android lobby before game, retains choices on Start and plays only its accepted welcome',async()=>{
 const f=fixture(host,{lobby:true});await f.session.open();const form=document.querySelector('[data-commentary-form]');expect(form.elements.listenerMuted.checked).toBe(false);form.elements.enabled.checked=true;form.elements.frequency.value='lively';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(f.request.mock.calls.some(([p])=>p.operation==='profile-update')).toBe(true));await f.session.refresh();expect(f.request.mock.calls.some(([p])=>p.operation==='jobs-read')).toBe(false);expect(f.player.play).not.toHaveBeenCalled();
 const profileReads=f.request.mock.calls.filter(([p])=>p.operation==='profile-read').length,gameId='44444444-4444-4444-8444-444444444444',sourceCommandId='accepted_lobby_start_001',jobId='55555555-5555-4555-8555-555555555555';f.setJobs([{id:jobId,gameId,eventId:'lifecycle-'+sourceCommandId,sourceCommandId,acceptedAt:'2026-10-14T20:00:00Z',purpose:'opening',lifecycleVerified:true,dependencyEventIds:[],profileVersion:2,status:'ready',caption:'Welcome to your table.'}]);f.session.update({...f.context,room:{...f.context.room,status:'active',game:{id:gameId,events:[]}}});await f.session.allowGreeting({sourceCommandId,gameId});await vi.waitFor(()=>expect(f.player.play).toHaveBeenCalledOnce());expect(f.request.mock.calls.filter(([p])=>p.operation==='profile-read')).toHaveLength(profileReads);await f.session.allowGreeting({sourceCommandId,gameId});expect(f.player.play).toHaveBeenCalledOnce();f.session.dispose();
});

it('native direct mode has no periodic profile/jobs discovery requests',async()=>{
 const f=fixture();f.player.playReaction=vi.fn(async()=>{});
 const profile={version:1,enabled:true,capabilities:{liveProviders:true,directReaction:true}};
 const original=f.request.getMockImplementation();f.request.mockImplementation(async p=>p.operation==='profile-read'?{result:profile}:original(p));
 await f.session.refresh({forceProfile:true});f.session.update(f.context);await wait();f.request.mockClear();
 vi.useFakeTimers();try{f.session.update(f.context);await wait();f.request.mockClear();await vi.advanceTimersByTimeAsync(16000);expect(f.request).not.toHaveBeenCalled();}finally{f.session.dispose();vi.useRealTimers();}
});

it('starts an explicitly requested welcome when cached setup refresh is still settling',async()=>{
 const gameId='44444444-4444-4444-8444-444444444444',jobId='55555555-5555-4555-8555-555555555555';
 const profile={version:1,enabled:true,capabilities:{liveProviders:true,directReaction:true}};
 const request=vi.fn(async()=>({result:profile}));const player={play:vi.fn(),playReaction:vi.fn(async()=>{}),stop:vi.fn()};
 const session=createHostedCommentarySession({request,player,deviceId:'phone-001',nativeAudioAvailable:true,initialListenerMuted:false,pollMs:0});
 session.update({room:{id:roomId,hostId:host,members:[{userId:host}],game:{id:gameId,events:[]}},userId:host,visible:true,connected:true,initialProfile:profile});
 // Local creation calls update then arms the welcome without waiting for that update's detached refresh.
 expect(await session.allowGreeting({jobId,gameId,profileVersion:1})).toBe(true);await wait();
 expect(player.playReaction).toHaveBeenCalledOnce();expect(player.playReaction.mock.calls[0][0].selector.jobId).toBe(jobId);session.dispose();
});

it('does not arm a welcome from an abandoned session while its profile loads',async()=>{
 let release;const request=vi.fn(()=>new Promise(resolve=>{release=()=>resolve({result:{version:1,enabled:true,capabilities:{liveProviders:true,directReaction:true}}});})),player={play:vi.fn(),playReaction:vi.fn(),stop:vi.fn()};
 const session=createHostedCommentarySession({request,player,deviceId:'phone-001',nativeAudioAvailable:true,initialListenerMuted:false,pollMs:0}),gameId='44444444-4444-4444-8444-444444444444';session.update({room:{id:roomId,hostId:host,members:[{userId:host}],game:{id:gameId,events:[]}},userId:host,connected:true,visible:true});
 const opening=session.allowGreeting({jobId:'55555555-5555-4555-8555-555555555555',gameId});session.update({room:null,userId:null});release();expect(await opening).toBe(false);expect(player.playReaction).not.toHaveBeenCalled();session.dispose();
});
