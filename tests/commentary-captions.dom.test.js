// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest';
import {renderCommentaryCaptions,bindCommentaryCaptions} from '../src/ui/commentary-captions.js';
describe('recent commentary drawer content',()=>{
 it('escapes service captions and never opens/replaces score dialogs or infers hearing',()=>{
  document.body.innerHTML='<dialog id="score" open><h2>Full House</h2></dialog><aside id="captions"></aside>';
  const score=document.querySelector('#score'),root=document.querySelector('#captions');
  root.innerHTML=renderCommentaryCaptions({status:'playing',playing:{caption:'<img src=x onerror=bad()>'},captions:[{id:'" onclick="bad()',caption:'<script>bad()</script>'}],measurement:{measurementBasis:'native-audio-position-proxy'}});
  expect(score.open).toBe(true);expect(score.textContent).toBe('Full House');expect(root.querySelector('img,script')).toBeNull();
  expect(root.querySelector('li p').textContent).toBe('<script>bad()</script>');expect(root.querySelector('li').getAttribute('onclick')).toBeNull();
  expect(root.textContent).not.toMatch(/heard|laughed/i);expect(root.querySelectorAll('[data-action]')).toHaveLength(0);
 });
 it('limits caption history, sanitizes error text and provides a cleanup-bound close control',()=>{
  document.body.innerHTML=renderCommentaryCaptions({captions:Array.from({length:30},(_,i)=>({id:String(i),caption:`Line ${i}`})),error:'secret provider stack'});
  expect(document.querySelectorAll('li')).toHaveLength(20);expect(document.body.textContent).not.toContain('secret');
  const close=vi.fn(),cleanup=bindCommentaryCaptions(document.body,{onClose:close});document.querySelector('[data-caption-close]').click();expect(close).toHaveBeenCalledOnce();cleanup();document.querySelector('[data-caption-close]').click();expect(close).toHaveBeenCalledOnce();
 });
});

describe('spoken commentary feedback',()=>{
 const draw=caption=>{document.body.innerHTML='<dialog id="score" open>Choose your score</dialog><aside id="captions"></aside>';const root=document.querySelector('#captions');root.innerHTML=renderCommentaryCaptions({captions:[{id:'job',caption:'A spoken joke',...caption}]});return root;};
 const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
 it('offers ratings only with authenticated-account playback basis, never inferred job status',()=>{
  for(const status of ['ready','started','completed','interrupted']){
   const root=draw({status});expect(root.querySelector('[data-caption-feedback]')).toBeNull();
  }
  const readOnly=draw({feedbackBasis:'caption-read'});expect(readOnly.querySelector('[data-caption-feedback]')).toBeNull();
  const spoken=draw({feedbackBasis:'playback'});expect(spoken.querySelectorAll('[data-caption-feedback]')).toHaveLength(2);
 });
 it('serializes one vote per job, saves idempotently and permits an explicit vote edit',async()=>{
  const root=draw({feedbackBasis:'playback'});let finish;const onFeedback=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));bindCommentaryCaptions(root,{onFeedback});
  const like=root.querySelector('[data-caption-feedback="like"]'),dislike=root.querySelector('[data-caption-feedback="dislike"]');
  like.click();like.dispatchEvent(new Event('click',{bubbles:true}));
  expect(onFeedback).toHaveBeenCalledOnce();expect(onFeedback).toHaveBeenCalledWith({jobId:'job',value:'like',basis:'playback'});expect(like.disabled).toBe(true);expect(dislike.disabled).toBe(true);expect(root.querySelector('[role=status]').textContent).toBe('Commentary offline');
  expect(root.querySelector('[data-caption-feedback-status]').textContent).toBe('Saving…');
  finish({accepted:true});await flush();expect(like.getAttribute('aria-pressed')).toBe('true');expect(like.disabled).toBe(false);like.click();expect(onFeedback).toHaveBeenCalledOnce();
  dislike.click();expect(onFeedback).toHaveBeenCalledTimes(2);expect(onFeedback).toHaveBeenLastCalledWith({jobId:'job',value:'dislike',basis:'playback'});finish({accepted:true});await flush();
  expect(like.getAttribute('aria-pressed')).toBe('false');expect(dislike.getAttribute('aria-pressed')).toBe('true');expect(document.querySelector('#score').open).toBe(true);expect(document.querySelector('#score').textContent).toBe('Choose your score');
 });
 it('retains the previous vote on failure, sanitizes errors and allows retry',async()=>{
  const root=draw({feedbackBasis:'playback',feedbackValue:'like'}),onFeedback=vi.fn().mockRejectedValueOnce(Error('secret account provider error')).mockResolvedValueOnce({accepted:false}).mockResolvedValueOnce({accepted:true});bindCommentaryCaptions(root,{onFeedback});
  const dislike=root.querySelector('[data-caption-feedback="dislike"]');dislike.click();await flush();
  expect(root.querySelector('[data-caption-feedback="like"]').getAttribute('aria-pressed')).toBe('true');expect(root.textContent).not.toContain('secret');expect(root.querySelector('[data-caption-feedback-status]').textContent).toBe('Could not save. Try again.');
  dislike.click();await flush();expect(dislike.getAttribute('aria-pressed')).toBe('false');dislike.click();await flush();expect(dislike.getAttribute('aria-pressed')).toBe('true');
 });
 it('cleanup cancels UI mutation while an in-flight vote finishes and removes handlers',async()=>{
  const root=draw({feedbackBasis:'playback'});let finish;const onFeedback=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));const cleanup=bindCommentaryCaptions(root,{onFeedback});root.querySelector('[data-caption-feedback="like"]').click();cleanup();finish({accepted:true});await flush();
  expect(root.querySelector('[data-caption-feedback="like"]').getAttribute('aria-pressed')).toBe('false');root.querySelector('[data-caption-feedback="dislike"]').dispatchEvent(new Event('click',{bubbles:true}));expect(onFeedback).toHaveBeenCalledOnce();
 });
});

describe('all-player displayed-remark feedback',()=>{
 it('rates a server-authorized caption without producing playback or hearing evidence',async()=>{
  document.body.innerHTML=renderCommentaryCaptions({captions:[{id:'guest-caption',caption:'An authorized displayed remark',feedbackBasis:'caption'}]});
  const onFeedback=vi.fn(async()=>({accepted:true}));bindCommentaryCaptions(document.body,{onFeedback});
  const button=document.querySelector('[data-caption-feedback="like"]');expect(button.getAttribute('aria-label')).toBe('Like this remark');expect(document.querySelector('[data-caption-feedback-group]').getAttribute('aria-label')).toBe('Rate this remark');button.click();
  for(let i=0;i<5;i++)await Promise.resolve();
  expect(onFeedback).toHaveBeenCalledWith({jobId:'guest-caption',value:'like',basis:'caption'});expect(button.getAttribute('aria-pressed')).toBe('true');
  const payload=onFeedback.mock.calls[0][0];expect(payload).not.toHaveProperty('heardBy');expect(payload).not.toHaveProperty('status');expect(payload).not.toHaveProperty('accountId');expect(document.body.textContent).not.toMatch(/heard|laughed/i);
 });
 it('does not grant caption feedback merely because generated text or a ready job exists',()=>{
  document.body.innerHTML=renderCommentaryCaptions({captions:[{id:'generated',caption:'Generated but unspoken',status:'ready'}]});expect(document.querySelector('[data-caption-feedback]')).toBeNull();
 });
});

describe('optional Forget commentary history control',()=>{
 it('is optional and clears remark/feedback content only after successful callback without touching scores',async()=>{
  const caption={id:'job',caption:'Remark',feedbackBasis:'caption'};document.body.innerHTML=renderCommentaryCaptions({captions:[caption]});expect(document.querySelector('[data-caption-forget]')).toBeNull();
  document.body.innerHTML='<dialog id="score" open>Score entry</dialog><aside id="captions"></aside>';const root=document.querySelector('#captions');root.innerHTML=renderCommentaryCaptions({captions:[caption],canForgetHistory:true});let finish;const onForgetHistory=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));bindCommentaryCaptions(root,{onForgetHistory});
  const button=root.querySelector('[data-caption-forget]');button.click();button.dispatchEvent(new Event('click',{bubbles:true}));expect(onForgetHistory).toHaveBeenCalledOnce();expect(button.disabled).toBe(true);expect(root.querySelector('[data-caption-feedback]').disabled).toBe(true);expect(root.querySelector('[data-caption-forget-status]').textContent).toBe('Forgetting…');
  finish({affectedJobs:1});for(let i=0;i<5;i++)await Promise.resolve();expect(root.querySelectorAll('li')).toHaveLength(0);expect(root.querySelector('[data-caption-forget-status]').textContent).toBe('Commentary history forgotten');expect(document.querySelector('#score').open).toBe(true);expect(document.querySelector('#score').textContent).toBe('Score entry');
 });
 it('sanitizes failure, retains captions and permits retry',async()=>{
  document.body.innerHTML=renderCommentaryCaptions({captions:[{id:'job',caption:'Remark'}],canForgetHistory:true});const onForgetHistory=vi.fn().mockRejectedValueOnce(Error('secret stack')).mockResolvedValueOnce({affectedJobs:1});bindCommentaryCaptions(document.body,{onForgetHistory});document.querySelector('[data-caption-forget]').click();for(let i=0;i<5;i++)await Promise.resolve();
  expect(document.querySelectorAll('li')).toHaveLength(1);expect(document.body.textContent).not.toContain('secret');expect(document.querySelector('[data-caption-forget-status]').textContent).toBe('Could not forget. Try again.');document.querySelector('[data-caption-forget]').click();for(let i=0;i<5;i++)await Promise.resolve();expect(document.querySelectorAll('li')).toHaveLength(0);
 });
});
