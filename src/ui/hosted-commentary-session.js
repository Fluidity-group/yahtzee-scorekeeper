import {createCommentaryClient} from '../commentary/client-controller.js';
import {createPlayerProfile} from '../commentary/player-profile.js';
import {renderCommentarySettings,bindCommentarySettings,renderPlayerProfileFields,readPlayerProfileFields} from './commentary-settings.js';
import {renderCommentaryCaptions,bindCommentaryCaptions} from './commentary-captions.js';
import './hosted-commentary-session.css';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
/** Actual Auth UUID/room snapshots only. Provider/auth transport stays in the caller. */
export function createHostedCommentarySession({request,player,deviceId,onNotice=()=>{},pollMs=1500,allowSyntheticPlayback=false,nativeAudioAvailable=false,initialListenerMuted,onPreferencesSaved=()=>{}}={}) {
 let current=null,profile=null,personal=null,epoch=0,abort=new AbortController(),drawer=null,captionCleanup=()=>{},settingsCleanup=()=>{},timer=null,refreshing=null,disposed=false,listenerMuted=initialListenerMuted??true,profileReadAt=0;
 const intents=new Map(),subscribers=new Set();
 let surfaceRoot=null,scoreDialog=null,inlineCleanup=()=>{},inlineNode=null,inlineMarkup=null;
 const key=()=>`${current?.room?.id||''}/${current?.userId||''}`;
 const authorized=()=>!disposed&&uuid.test(current?.userId||'')&&current?.room?.members?.some(member=>member.userId===current.userId);
 const isHost=()=>authorized()&&current.room.hostId===current.userId;
 const intent=()=>({...intents.get(key()),enabled:profile?.enabled===true,frequencyChosen:profile?.enabled===true||intents.get(key())?.frequencyChosen===true});
 const makeController=()=>createCommentaryClient({request,player,deviceId,allowSyntheticPlayback,onChange:()=>{renderCaptions();refreshSurface();for(const callback of subscribers)try{callback(controller.snapshot());}catch{}}});
 let controller=makeController();
 const invoke=async(operation,payload={},signal=abort.signal)=>{
  if(!authorized())throw Error('Sign in at your table to use commentary.');
  const fence=epoch,result=await request({operation,roomId:current.room.id,...payload},{signal});
  if(fence!==epoch||signal.aborted)throw Error('Commentary session changed.');return result.result;
 };
 function sync(){
  controller.update(authorized()?{roomId:current.room.id,userId:current.userId,hostId:current.room.hostId,game:current.room.game,profileVersion:profile?.version||1,enabled:intent().enabled,listenerMuted:listenerMuted||!isHost()||!nativeAudioAvailable,paused:current.room.tournament?.status==='paused'||current.room.paused===true,visible:current.visible!==false&&current.connected!==false}:{userId:null});
 }
 function renderCaptions(){
  const root=drawer?.querySelector('[data-hosted-captions]');if(!root)return;
  captionCleanup();root.innerHTML=renderCommentaryCaptions({...controller.snapshot(),canForgetHistory:authorized()});
  captionCleanup=bindCommentaryCaptions(root,{onClose:close,onFeedback:value=>controller.feedback(value),onForgetHistory:()=>controller.forgetHistory()});
 }
 function refreshSurface(){
  const root=surfaceRoot?.querySelector('[data-hosted-commentary-inline]');
  if(!root){inlineCleanup();inlineCleanup=()=>{};inlineNode=null;inlineMarkup=null;return;}
  const state=controller.snapshot(),caption=authorized()&&current.visible!==false&&current.connected!==false?state.captions?.filter(item=>['playback','caption'].includes(item.feedbackBasis)).at(-1):null;
  const disabled=scoreDialog?.open===true;
  const selected=['like','dislike'].includes(caption?.feedbackValue)?caption.feedbackValue:'';
  const spoken=caption?.feedbackBasis==='playback';
  const markup=caption?`<section class="hosted-commentary-inline" aria-label="Latest table commentary"><p>${esc(caption.caption)}</p><div class="hosted-commentary-inline-controls"><div class="caption-feedback" data-caption-feedback-group data-job-id="${esc(caption.id)}" data-feedback-basis="${caption.feedbackBasis}" data-feedback-value="${selected}" aria-label="${spoken?'Rate this spoken remark':'Rate this remark'}"><button type="button" data-caption-feedback="like" aria-label="${spoken?'Like this spoken remark':'Like this remark'}" aria-pressed="${selected==='like'}"${disabled?' disabled':''}>Like</button><button type="button" data-caption-feedback="dislike" aria-label="${spoken?'Dislike this spoken remark':'Dislike this remark'}" aria-pressed="${selected==='dislike'}"${disabled?' disabled':''}>Dislike</button><span data-caption-feedback-status role="status" aria-live="polite"></span></div><button type="button" data-inline-commentary-more${disabled?' disabled':''}>More commentary</button></div></section>`:'';
  if(root===inlineNode&&markup===inlineMarkup)return;
  const focused=root.contains(document.activeElement)?document.activeElement.dataset.captionFeedback||'more':null;
  inlineCleanup();root.innerHTML=markup;inlineNode=root;inlineMarkup=markup;
  inlineCleanup=bindCommentaryCaptions(root,{onFeedback:value=>{if(scoreDialog?.open)throw Error('Finish score entry first');return controller.feedback(value);}});
  root.querySelector('[data-inline-commentary-more]')?.addEventListener('click',()=>{if(!scoreDialog?.open)void open({scoreDialog});});
  if(focused&&!disabled)root.querySelector(focused==='more'?'[data-inline-commentary-more]':`[data-caption-feedback="${focused}"]`)?.focus({preventScroll:true});
 }
 function mountSurface({root,scoreDialog:dialog=null}={}){surfaceRoot=root;scoreDialog=dialog;refreshSurface();}
 function close(){captionCleanup();settingsCleanup();captionCleanup=settingsCleanup=()=>{};if(drawer?.open)drawer.close();drawer?.remove();drawer=null;}
 function reset({keepProfile=false}={}){epoch++;abort.abort();abort=new AbortController();refreshing=null;if(!keepProfile){profile=personal=null;profileReadAt=0;}close();}
 async function refresh({forceProfile=false}={}){
  if(!authorized()||current.connected===false||current.visible===false&&!forceProfile)return;
  if(refreshing)return refreshing;
  const fence=epoch;
  const task=(async()=>{try{const next=profile&&!forceProfile&&performance.now()-profileReadAt<15000?profile:await invoke('profile-read');if(fence!==epoch)return;if(next!==profile)profileReadAt=performance.now();profile=next;sync();if(current.room.game)await controller.refresh({profile:next});if(fence===epoch)await controller.heartbeat();}catch{if(fence===epoch)onNotice('Commentary is unavailable. Keep playing.');}})();
  refreshing=task;try{await task;}finally{if(refreshing===task)refreshing=null;}
 }
 function update(next){
  if(disposed)return;
  const returning=current&&(current.visible===false||current.connected===false)&&next?.visible!==false&&next?.connected!==false;
  if(returning){controller.dispose();controller=makeController();}
  const before=`${current?.room?.id}/${current?.room?.game?.id}/${current?.userId}`,after=`${next?.room?.id}/${next?.room?.game?.id}/${next?.userId}`;
  if(before!==after||current?.room?.hostId!==next?.room?.hostId){const sameTable=current?.room?.id===next?.room?.id&&current?.userId===next?.userId;reset({keepProfile:sameTable});if(!sameTable&&next?.room?.status==='lobby'&&nativeAudioAvailable&&initialListenerMuted===undefined)listenerMuted=false;}
  current=next;if(next?.initialProfile&&!profile){profile=next.initialProfile;profileReadAt=performance.now();}if(typeof next?.listenerMuted==='boolean')listenerMuted=next.listenerMuted;sync();refreshSurface();
  clearInterval(timer);timer=null;
  if(authorized()&&current.connected!==false&&current.visible!==false){void refresh();if(pollMs>0)timer=setInterval(()=>{void refresh();},pollMs);}
 }
 function personalForm(){
  const p=personal||{version:0,gender:'',blurb:'',displayName:'',shareWithRoom:false};
  return `<form data-hosted-personal><h3>Your player details for jokes</h3><label>Display name<input name="profileDisplayName" maxlength="24" value="${esc(p.displayName)}"></label>${renderPlayerProfileFields('account',p)}<label class="hosted-commentary-share"><input type="checkbox" name="shareWithRoom"${p.shareWithRoom?' checked':''}><span>Share my details with the commentator at this table<small>Let the jokes include my interests and blurb. You can change this anytime.</small></span></label><p data-personal-status role="status" aria-live="polite"></p><button type="submit">Save my details</button><button type="button" data-personal-delete>Remove my details</button></form>`;
 }
 function bindPersonal(root){
  const form=root.querySelector('[data-hosted-personal]'),ownerEpoch=epoch;let saving=false;
  const save=async event=>{
   event.preventDefault();if(saving||!authorized()||ownerEpoch!==epoch||!drawer?.contains(form))return;saving=true;
   const status=form.querySelector('[data-personal-status]');form.querySelectorAll('button').forEach(button=>{button.disabled=true;});
   try{
    const fields=new FormData(form),values=readPlayerProfileFields(fields,'account');
    const checked=createPlayerProfile({accountId:current.userId,version:Math.max(1,personal?.version||1),displayName:String(fields.get('profileDisplayName')||''),...values});
    personal=await invoke('player-profile-update',{expectedVersion:personal?.version||0,changes:{displayName:checked.displayName,gender:checked.gender,blurb:checked.blurb,shareWithRoom:fields.has('shareWithRoom')}});
    status.textContent='Your details are saved.';await refresh();
   }catch{if(drawer?.contains(form))status.textContent='Could not save your details. Try again.';}
   finally{saving=false;if(drawer?.contains(form))form.querySelectorAll('button').forEach(button=>{button.disabled=false;});}
  };
  form.addEventListener('submit',save);
  form.querySelector('[data-personal-delete]').addEventListener('click',async()=>{
   if(saving||!authorized()||ownerEpoch!==epoch||!drawer?.contains(form))return;saving=true;form.querySelectorAll('button').forEach(button=>{button.disabled=true;});
   try{await invoke('player-profile-delete',{expectedVersion:personal?.version||0});personal=current.room.localSession?null:await invoke('player-profile-read');if(drawer?.contains(form)){root.innerHTML=personalForm();bindPersonal(root);}await refresh();}
   catch{if(drawer?.contains(form))form.querySelector('[data-personal-status]').textContent='Could not remove your details. Try again.';}
   finally{saving=false;if(drawer?.contains(form))form.querySelectorAll('button').forEach(button=>{button.disabled=false;});}
  });
 }
 async function open({scoreDialog=null}={}){
  if(scoreDialog?.open){onNotice('Finish or close score entry before opening commentary.');return false;}
  if(!authorized()){onNotice('Sign in at your table to use commentary.');return false;}
  const openingEpoch=epoch;close();const panel=document.createElement('dialog');panel.className='hosted-commentary-drawer';panel.setAttribute('aria-label','Your table commentary');panel.innerHTML='<button type="button" data-loading-close aria-label="Close commentary">×</button><p>Loading commentary…</p>';panel.querySelector('button').addEventListener('click',close);document.body.append(panel);drawer=panel;panel.showModal();panel.addEventListener('cancel',event=>{event.preventDefault();close();});
  try{
   await refresh({forceProfile:true});if(drawer!==panel||openingEpoch!==epoch)return false;personal=await invoke('player-profile-read');if(drawer!==panel||openingEpoch!==epoch)return false;
   const settings=intent(),shown=profile?{...profile,frequency:settings.frequencyChosen?profile.frequency:''}:null;
   panel.innerHTML='<div data-hosted-settings></div><div data-hosted-personal-root></div><div data-hosted-captions></div><p class="hosted-commentary-retention">Commentary history and ratings last up to 90 days. Forget history removes these memories; your profile remains editable above.</p>';
   let settingsVersion=profile?.version||1;
   const settingsRoot=panel.querySelector('[data-hosted-settings]');settingsRoot.innerHTML=renderCommentarySettings({profile:shown,enabled:settings.enabled,listenerMuted:listenerMuted||!isHost()||!nativeAudioAvailable,isHost:isHost(),connected:!!profile?.capabilities?.liveProviders,id:'hosted-commentary'});
   settingsCleanup=bindCommentarySettings(settingsRoot,{onClose:close,onListenerMute:value=>{listenerMuted=value;onPreferencesSaved({listenerMuted:value});sync();},onTableSettings:async value=>{
    if(!isHost())throw Error('The host controls table commentary.');
    if(!value.profile&&value.enabled)throw Error('Choose a commentary frequency.');
    const expectedGameId=current.room.game?.id;let greeting=null;
    const explicit=value.profile&&['highlights','balanced','lively'].includes(value.profile.frequency);
    const form=settingsRoot.querySelector('[data-commentary-form]');
    try{profile=await invoke('profile-update',{expectedVersion:settingsVersion,changes:{enabled:value.enabled,humorIntensity:form.elements.humorIntensity.value,profanityAllowed:form.elements.profanityAllowed.checked,frequency:explicit?value.profile.frequency:profile.frequency,voiceOption:form.elements.voiceOption.value}});settingsVersion=profile.version;greeting=profile.greetingJobId?{jobId:profile.greetingJobId,gameId:expectedGameId,profileVersion:profile.version}:null;}catch{throw Error('Could not save table settings. Reopen commentary and try again.');}
    onPreferencesSaved({profile,listenerMuted});intents.set(key(),{enabled:value.enabled,frequencyChosen:!!explicit});profileReadAt=performance.now();sync();if(greeting)controller.allowGreeting(greeting);await refresh();
   }});
   const personalRoot=panel.querySelector('[data-hosted-personal-root]');personalRoot.innerHTML=current.room.localSession?'<p class="core-muted">The commentator uses the player details you entered when setting up this shared-phone game.</p>':personalForm();if(!current.room.localSession)bindPersonal(personalRoot);renderCaptions();return true;
  }catch{if(drawer===panel){panel.querySelector('p').textContent='Commentary is unavailable. Close this panel and keep playing.';}return false;}
 }
 async function configure({profile:chosen,enabled=chosen.enabled,listenerMuted:muted=listenerMuted}={}){await refresh({forceProfile:true});if(!isHost())throw Error('The host controls commentary.');profile=await invoke('profile-update',{expectedVersion:profile.version,changes:{enabled,humorIntensity:chosen.humorIntensity,profanityAllowed:chosen.profanityAllowed,frequency:chosen.frequency,voiceOption:chosen.voiceOption}});profileReadAt=performance.now();listenerMuted=muted;sync();return profile;}
 return {setListenerMuted(value){listenerMuted=value===true;sync();},muteForGame(){listenerMuted=true;sync();},configure,subscribe(callback){subscribers.add(callback);return()=>subscribers.delete(callback);},update,refresh,open,close,mountSurface,refreshSurface,allowGreeting:async metadata=>{if(controller.allowGreeting(metadata)){await refresh();return true;}await refresh();if(controller.allowGreeting(metadata)){await controller.refresh({profile});return true;}return false;},snapshot:()=>controller.snapshot(),dispose(){if(disposed)return;clearInterval(timer);reset();controller.dispose();disposed=true;current=null;refreshSurface();inlineCleanup();surfaceRoot=null;}};
}







