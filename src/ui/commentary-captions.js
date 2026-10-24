import './commentary-captions.css';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const votes=new Set(['like','dislike']);
function feedbackControls(caption){
 // Server grants playback basis from own exposure, caption basis from an authorized displayed utterance. Neither establishes audience hearing.
 if(!['playback','caption'].includes(caption.feedbackBasis))return '';
 const spoken=caption.feedbackBasis==='playback';
 const selected=votes.has(caption.feedbackValue)?caption.feedbackValue:'';
 return `<div class="caption-feedback" data-caption-feedback-group data-job-id="${esc(caption.id)}" data-feedback-basis="${caption.feedbackBasis}" data-feedback-value="${selected}" aria-label="${spoken?'Rate this spoken remark':'Rate this remark'}"><button type="button" data-caption-feedback="like" aria-pressed="${selected==='like'}" aria-label="${spoken?'Like this spoken remark':'Like this remark'}">♡ Like</button><button type="button" data-caption-feedback="dislike" aria-pressed="${selected==='dislike'}" aria-label="${spoken?'Dislike this spoken remark':'Dislike this remark'}">Dislike</button><span data-caption-feedback-status role="status" aria-live="polite"></span></div>`;
}
/** Safe service captions only. Caller owns lifecycle; never replaces score entry. */
export function renderCommentaryCaptions({status='offline',captions=[],playing=null,error=null,canForgetHistory=false}={}) {
 const labels={offline:'Commentary offline',ready:'Waiting for the next moment',playing:'Commentary playing',paused:'Table paused','caption-only':'Captions only','settings-changed':'Refresh table settings'};
 return `<section class="commentary-captions" aria-label="Recent commentary"><header><h2>At the microphone</h2><button type="button" data-caption-close aria-label="Close recent commentary">×</button></header><p role="status">${esc(labels[status]||'Commentary unavailable')}</p>${error?'<p role="alert">Commentary unavailable. Your scores are safe.</p>':''}${playing?`<p class="commentary-current">${esc(playing.caption)}</p>`:''}<ol>${captions.slice(-20).map(caption=>`<li data-caption-id="${esc(caption.id)}"><p>${esc(caption.caption)}</p><small>Table commentary</small>${feedbackControls(caption)}</li>`).join('')}</ol>${captions.length?'':'<p>The next accepted score may inspire a line. Quiet moments count too.</p>'}${canForgetHistory?'<div class="caption-history-controls"><button type="button" data-caption-forget>Forget commentary history</button><span data-caption-forget-status role="status" aria-live="polite"></span></div>':''}<p class="commentary-caption-note">The host phone controls the speaker. Keep playing while the commentator catches up.</p></section>`;
}
export function bindCommentaryCaptions(root,{onClose=()=>{},onFeedback=async()=>{throw Error('Feedback not connected');},onForgetHistory=async()=>{throw Error('History control not connected');}}={}) {
 const button=root.querySelector('[data-caption-close]'),forgetButton=root.querySelector('[data-caption-forget]'),pending=new Set();let disposed=false,forgetting=false;
 const groupsFor=id=>[...root.querySelectorAll('[data-caption-feedback-group]')].filter(group=>group.dataset.jobId===id);
 const feedback=async event=>{
  const target=event.target.closest('[data-caption-feedback]');if(!target||!root.contains(target))return;
  const group=target.closest('[data-caption-feedback-group]'),jobId=group?.dataset.jobId,value=target.dataset.captionFeedback,basis=group?.dataset.feedbackBasis;
  if(!jobId||!['playback','caption'].includes(basis)||!votes.has(value)||pending.has(jobId)||group.dataset.feedbackValue===value)return;
  pending.add(jobId);
  groupsFor(jobId).forEach(item=>{item.setAttribute('aria-busy','true');item.querySelectorAll('button').forEach(control=>{control.disabled=true;});item.querySelector('[data-caption-feedback-status]').textContent='Saving…';});
  try{
   const result=await onFeedback({jobId,value,basis});if(result?.accepted===false)throw Error('Feedback rejected');
   if(!disposed)groupsFor(jobId).forEach(item=>{item.dataset.feedbackValue=value;item.querySelectorAll('[data-caption-feedback]').forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.captionFeedback===value)));item.querySelector('[data-caption-feedback-status]').textContent='Saved';});
  }catch{
   if(!disposed)groupsFor(jobId).forEach(item=>{item.querySelector('[data-caption-feedback-status]').textContent='Could not save. Try again.';});
  }finally{
   pending.delete(jobId);
   if(!disposed)groupsFor(jobId).forEach(item=>{item.removeAttribute('aria-busy');item.querySelectorAll('button').forEach(control=>{control.disabled=forgetting;});});
  }
 };
 const forget=async()=>{
  if(forgetting||disposed)return;forgetting=true;forgetButton.disabled=true;
  root.querySelectorAll('[data-caption-feedback]').forEach(control=>{control.disabled=true;});
  const status=root.querySelector('[data-caption-forget-status]');status.textContent='Forgetting…';
  try{
   const result=await onForgetHistory();if(result?.accepted===false)throw Error('Forget rejected');
   if(!disposed){root.querySelector('ol')?.replaceChildren();root.querySelector('.commentary-current')?.remove();status.textContent='Commentary history forgotten';}
  }catch{if(!disposed)status.textContent='Could not forget. Try again.';}
  finally{forgetting=false;if(!disposed){forgetButton.disabled=false;root.querySelectorAll('[data-caption-feedback]').forEach(control=>{control.disabled=pending.has(control.closest('[data-caption-feedback-group]').dataset.jobId);});}}
 };
 forgetButton?.addEventListener('click',forget);
 button?.addEventListener('click',onClose);root.addEventListener('click',feedback);
 return ()=>{disposed=true;forgetButton?.removeEventListener('click',forget);button?.removeEventListener('click',onClose);root.removeEventListener('click',feedback);};
}





