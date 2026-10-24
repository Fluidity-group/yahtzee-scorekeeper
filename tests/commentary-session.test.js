// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionCommentary, readLocalPlayerDrafts } from '../src/ui/commentary-session.js';
import { renderPlayerProfileFields } from '../src/ui/commentary-settings.js';
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
const submit=element=>element.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(()=>document.body.replaceChildren());
describe('session-only commentary app integration',()=>{
 it('keeps local drafts separate from account IDs, game commands and persisted scores',()=>{
  const form=document.createElement('form');form.innerHTML='<input name="player" value="Sam">'+renderPlayerProfileFields('player0',{blurb:'I like chess'});
  const session=createSessionCommentary();const drafts=session.readPlayers(new FormData(form));session.setPlayers('game',drafts);
  expect(session.getPlayers('game')[0]).toMatchObject({displayName:'Sam',blurb:'I like chess',source:'local-session-draft',instructionAuthority:'none'});
  expect(session.getPlayers('game')[0]).not.toHaveProperty('accountId');expect(session.getPlayers('another-game')).toEqual([]);
  expect(createSessionCommentary().getPlayers('game')).toEqual([]);
 });
 it('rejects unbounded optional player text before a game save',()=>{
  const data=new FormData();data.append('player','A');data.append('player0Blurb','x'.repeat(241));expect(()=>readLocalPlayerDrafts(data)).toThrow('240');
 });
 it('opens a separate drawer and refuses to interrupt an active score dialog',()=>{
  const notice=vi.fn();const session=createSessionCommentary({onNotice:notice});const score=document.createElement('dialog');score.open=true;
  expect(session.open({scoreDialog:score})).toBe(false);expect(document.querySelector('.session-commentary-drawer')).toBeNull();expect(score.open).toBe(true);
  score.open=false;expect(session.open({scoreDialog:score})).toBe(true);expect(document.querySelector('.session-commentary-drawer').open).toBe(true);expect(score.open).toBe(false);session.close();
 });
 it('enables chosen cadence as pending preferences and independently mutes only this phone',async()=>{
  const session=createSessionCommentary();session.open({gameId:'table'});const form=document.querySelector('[data-commentary-form]');
  form.elements.enabled.checked=true;form.elements.frequency.value='balanced';submit(form);await settle();
  expect(session.snapshot('table')).toMatchObject({enabled:true,connected:false,storage:'session-only',listenerMuted:true,profile:{humorIntensity:'dark',profanityAllowed:true,frequency:'balanced'}});
  form.elements.listenerMuted.checked=false;form.elements.listenerMuted.dispatchEvent(new Event('change',{bubbles:true}));await settle();expect(session.snapshot('table').listenerMuted).toBe(false);
  expect(document.querySelector('.session-commentary-drawer').textContent).toContain('Live voice service');expect(session.snapshot('different').enabled).toBe(false);session.close();
 });
 it('allows local profile edits later and a guest cannot alter host table settings',async()=>{
  const session=createSessionCommentary();session.open({gameId:'local',players:[{name:'<Sam>'}]});
  const form=document.querySelector('[data-local-player-drafts]');expect(form.querySelector('h3').textContent).toBe('<Sam>');form.querySelector('textarea').value='Chess enthusiast';submit(form);
  expect(session.getPlayers('local')[0].blurb).toBe('Chess enthusiast');session.close();session.open({gameId:'online',isHost:false});
  expect(document.querySelector('[data-commentary-form] [type="submit"]')).toBeNull();expect(document.querySelector('[data-local-player-drafts]')).toBeNull();session.close();
 });
});
