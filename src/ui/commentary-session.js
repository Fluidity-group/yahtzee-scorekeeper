import { renderPlayerProfileFields, readPlayerProfileFields, renderCommentarySettings, bindCommentarySettings } from './commentary-settings.js';
import { PLAYER_GENDERS, PLAYER_PROFILE_LIMITS } from '../commentary/player-profile.js';
import './commentary-session.css';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function readLocalPlayerDrafts(formData, names = formData.getAll('player')) {
 if (names.length > 8) throw new Error('At most eight local player drafts are supported.');
 return names.map((name,seat)=>{
  const {gender,blurb}=readPlayerProfileFields(formData,`player${seat}`);
  const clean=blurb.trim();
  if(!PLAYER_GENDERS.includes(gender) || [...clean].length>PLAYER_PROFILE_LIMITS.blurb || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(clean))throw new Error('Check optional player details: choose a gender or skip, and keep the blurb within 240 characters.');
  return Object.freeze({seat,displayName:String(name).slice(0,24),gender,blurb:clean,source:'local-session-draft',instructionAuthority:'none'});
 });
}
// Volatile UI preferences only. No UUID fabrication, Auth profile write, room command or voice playback.
export function createSessionCommentary({onNotice=()=>{}}={}) {
 const tables=new Map(),players=new Map();let listenerMuted=true,drawer=null,unbind=null;
 const table=id=>tables.get(id)||{enabled:false,profile:null};
 function close(){if(drawer?.open)drawer.close();unbind?.();unbind=null;drawer?.remove();drawer=null;}
 return {
  readPlayers:readLocalPlayerDrafts,
  setPlayers(gameId,drafts){players.set(gameId,drafts.map(draft=>Object.freeze({...draft})));},
  getPlayers(gameId){return [...(players.get(gameId)||[])];},
  snapshot(gameId){return {...table(gameId),listenerMuted,connected:false,storage:'session-only'};},
  close,
  open({isHost=true,gameId='setup',players:roster=[],scoreDialog=null}={}){
   if(scoreDialog?.open){onNotice('Finish or close score entry before opening commentary settings.');return false;}
   close();drawer=document.createElement('dialog');drawer.className='session-commentary-drawer';drawer.setAttribute('aria-label','Commentary preferences');
   drawer.innerHTML=renderCommentarySettings({...table(gameId),listenerMuted,isHost,connected:false,id:'session-commentary'})+'<p class="commentary-session-note">Preferences last for this app session. Live voice service and shared table settings are still pending.</p>';
   if(roster.length){
    const saved=players.get(gameId)||[];
    const form=document.createElement('form');form.dataset.localPlayerDrafts='';
    form.innerHTML=`<details><summary>Personalize local players (optional)</summary><p>These details stay in this session. They are not account profiles.</p>${roster.map((player,seat)=>`<h3>${esc(player.name)}</h3>${renderPlayerProfileFields(`player${seat}`,saved[seat]||{})}`).join('')}<p role="alert"></p><button type="submit">Save player details</button></details>`;
    form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();try{players.set(gameId,readLocalPlayerDrafts(new FormData(form),roster.map(player=>player.name)));onNotice('Optional player details saved for this session.');form.querySelector('[role="alert"]').textContent='';}catch(error){form.querySelector('[role="alert"]').textContent=error.message;}});
    drawer.append(form);
   }
   document.body.append(drawer);
   unbind=bindCommentarySettings(drawer,{onTableSettings:value=>{tables.set(gameId,value);onNotice(value.enabled?'Commentary preferences enabled for this session. Voice service is pending.':'Commentary preferences switched off for this session.');},onListenerMute:value=>{listenerMuted=value;onNotice(value?'Commentary muted on this phone.':'This phone can play commentary when the voice service is connected.');},onClose:close});
   drawer.addEventListener('cancel',event=>{event.preventDefault();close();});drawer.showModal();return true;
  }
 };
}
