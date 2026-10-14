// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderPlayerProfileFields, readPlayerProfileFields, renderCommentarySettings, bindCommentarySettings } from '../src/ui/commentary-settings.js';
import { createProfile } from '../src/commentary/profiles.js';
const mount=options=>{const root=document.createElement('div');root.innerHTML=renderCommentarySettings(options);document.body.append(root);return root;};
const change=node=>node.dispatchEvent(new Event('change',{bubbles:true}));
const submit=root=>root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
afterEach(()=>document.body.replaceChildren());
describe('commentary profile/setup and drawer contracts',()=>{
 it('labels skippable fields uniquely and escapes player prose',()=>{
  const form=document.createElement('form');form.innerHTML=renderPlayerProfileFields('seat2',{gender:'man',blurb:'</textarea><img src=x onerror=alert(1)>'})+renderPlayerProfileFields('seat3');
  document.body.append(form); expect(form.querySelector('img')).toBeNull(); expect(form.querySelector('#seat2-blurb').value).toContain('<img');
  expect(form.querySelector('[for="seat2-gender"]').textContent).toContain('optional');
  expect(readPlayerProfileFields(new FormData(form),'seat2')).toEqual({gender:'man',blurb:'</textarea><img src=x onerror=alert(1)>'});
  expect(readPlayerProfileFields(new FormData(form),'seat3')).toEqual({gender:'',blurb:''});
  expect(()=>renderPlayerProfileFields('bad"id')).toThrow('prefix');
 });
 it('starts Dark/profanity On but does not select an unapproved frequency or claim voice is working',()=>{
  const root=mount();const form=root.querySelector('form');
  expect(form.elements.humorIntensity.value).toBe('dark');expect(form.elements.profanityAllowed.checked).toBe(true);
  expect(form.elements.frequency.value).toBe('');expect(root.textContent).toContain('Voice not connected');
 });
 it('requires an explicit frequency to enable and keeps errors beside the settings',async()=>{
  const root=mount(); const callback=vi.fn();bindCommentarySettings(root,{onTableSettings:callback});
  const form=root.querySelector('form');form.elements.enabled.checked=true;change(form.elements.enabled);expect(form.elements.frequency.required).toBe(true);
  submit(root);await settle();expect(callback).not.toHaveBeenCalled();expect(root.querySelector('[role="alert"]').textContent).toContain('Explicit');
  form.elements.frequency.value='highlights';submit(root);await settle();
  expect(callback).toHaveBeenCalledWith({enabled:true,profile:{schemaVersion:1,version:1,humorIntensity:'dark',profanityAllowed:true,frequency:'highlights',voiceOption:'victor'}});
 });
 it('separates host table settings from local listener mute and versions shared profile edits',async()=>{
  const profile=createProfile({humorIntensity:'dark',profanityAllowed:true,frequency:'balanced'});
  const root=mount({profile,enabled:true});const shared=vi.fn(),local=vi.fn();bindCommentarySettings(root,{onTableSettings:shared,onListenerMute:local});
  const form=root.querySelector('form');form.elements.listenerMuted.checked=false;change(form.elements.listenerMuted);await settle();
  expect(local).toHaveBeenCalledWith(false);expect(shared).not.toHaveBeenCalled();
  form.elements.profanityAllowed.checked=false;submit(root);await settle();expect(shared.mock.calls[0][0].profile).toMatchObject({version:2,profanityAllowed:false,humorIntensity:'dark'});
  expect(local).toHaveBeenCalledTimes(1);
 });
 it('lets a guest mute this phone without controls to change the table profile',async()=>{
  const root=mount({isHost:false});const shared=vi.fn(),local=vi.fn();bindCommentarySettings(root,{onTableSettings:shared,onListenerMute:local});
  const form=root.querySelector('form');expect(form.elements.enabled.disabled).toBe(true);expect(root.querySelector('[type="submit"]')).toBeNull();
  form.elements.listenerMuted.checked=false;change(form.elements.listenerMuted);submit(root);await settle();expect(local).toHaveBeenCalledWith(false);expect(shared).not.toHaveBeenCalled();
 });
 it('can disable without inventing a frequency and reports callback failures without affecting scores',async()=>{
  const root=mount();const shared=vi.fn().mockRejectedValue(new Error('Offline preferences unavailable'));bindCommentarySettings(root,{onTableSettings:shared});
  const modal=document.createElement('dialog');modal.innerHTML='<input value="25">';document.body.append(modal);
  submit(root);await settle();expect(shared).toHaveBeenCalledWith({enabled:false,profile:null});expect(root.querySelector('[role="alert"]').textContent).toBe('Offline preferences unavailable');
  expect(modal.querySelector('input').value).toBe('25');expect(root.querySelector('[type="submit"]').disabled).toBe(false);
 });
 it('returns listener cleanup and explicit drawer close without touching a score dialog',()=>{
  const root=mount();const close=vi.fn(),mute=vi.fn();const unbind=bindCommentarySettings(root,{onClose:close,onListenerMute:mute});
  root.querySelector('[data-commentary-close]').click();expect(close).toHaveBeenCalledTimes(1);unbind();root.querySelector('[data-commentary-close]').click();change(root.querySelector('[data-commentary-mute]'));
  expect(close).toHaveBeenCalledTimes(1);expect(mute).not.toHaveBeenCalled();
 });
});

describe('settings save lifecycle',()=>{
 it('saves profanity/intensity preferences while commentary is switched off',async()=>{
  const profile=createProfile({humorIntensity:'dark',profanityAllowed:true,frequency:'lively'});
  const root=mount({profile,enabled:false});const callback=vi.fn();bindCommentarySettings(root,{onTableSettings:callback});
  root.querySelector('form').elements.profanityAllowed.checked=false;submit(root);await settle();
  expect(callback).toHaveBeenCalledWith({enabled:false,profile:{schemaVersion:1,version:2,humorIntensity:'dark',profanityAllowed:false,frequency:'lively',voiceOption:'victor'}});
 });
 it('coalesces repeated submit while the save callback is in flight',async()=>{
  const root=mount();let finish;const callback=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));bindCommentarySettings(root,{onTableSettings:callback});
  submit(root);submit(root);expect(callback).toHaveBeenCalledTimes(1);expect(root.querySelector('[type="submit"]').disabled).toBe(true);
  finish();await settle();expect(root.querySelector('[type="submit"]').disabled).toBe(false);
 });
});

it('defaults to the audition-selected Dark voice and keeps switching voice independent of humor',async()=>{
 const root=mount();const form=root.querySelector('form');const callback=vi.fn();bindCommentarySettings(root,{onTableSettings:callback});
 expect(form.elements.voiceOption.value).toBe('victor');expect(form.elements.humorIntensity.value).toBe('dark');expect(form.elements.frequency.value).toBe('');
 form.elements.enabled.checked=true;form.elements.frequency.value='balanced';form.elements.voiceOption.value='ditzy';submit(root);await settle();
 expect(callback.mock.calls[0][0].profile).toMatchObject({voiceOption:'ditzy',humorIntensity:'dark',profanityAllowed:true,frequency:'balanced',version:1});
 form.elements.voiceOption.value='victor';submit(root);await settle();
 expect(callback.mock.calls[1][0].profile).toMatchObject({voiceOption:'victor',humorIntensity:'dark',profanityAllowed:true,frequency:'balanced',version:2});
});
