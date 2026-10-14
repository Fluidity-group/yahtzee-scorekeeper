import './commentary-settings.css';
import { createProfile, updateProfile } from '../commentary/profiles.js';
import { PLAYER_GENDERS, PLAYER_PROFILE_LIMITS } from '../commentary/player-profile.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const genderLabels = { '':'Skip / prefer not to say', woman:'Woman', man:'Man', nonbinary:'Non-binary', another:'Another identity' };
function checkedPrefix(prefix) {
 if (typeof prefix !== 'string' || !/^[A-Za-z][\w-]{0,39}$/.test(prefix)) throw new Error('A safe unique field prefix is required.');
 return prefix;
}
export function renderPlayerProfileFields(prefix = 'player', values = {}) {
 checkedPrefix(prefix);
 return `<fieldset class="player-profile-fields"><legend>Commentator context <small>Optional</small></legend><label for="${prefix}-gender">Gender <span>(optional)</span></label><select id="${prefix}-gender" name="${prefix}Gender">${PLAYER_GENDERS.map(value=>`<option value="${value}" ${value===(values.gender || '')?'selected':''}>${genderLabels[value]}</option>`).join('')}</select><label for="${prefix}-blurb">A little about you <span>(optional)</span></label><textarea id="${prefix}-blurb" name="${prefix}Blurb" maxlength="${PLAYER_PROFILE_LIMITS.blurb}" rows="2" placeholder="A hobby, a rivalry, or your game-night style">${esc(values.blurb)}</textarea><small>Skip either field. You can edit these later. Up to ${PLAYER_PROFILE_LIMITS.blurb} characters.</small></fieldset>`;
}
export function readPlayerProfileFields(formData, prefix = 'player') {
 checkedPrefix(prefix);
 return { gender: String(formData.get(`${prefix}Gender`) || ''), blurb: String(formData.get(`${prefix}Blurb`) || '') };
}

// Caller owns the drawer container and opening/closing. Never opens or replaces a score dialog.
export function renderCommentarySettings({ profile = null, enabled = false, listenerMuted = true, isHost = true, connected = false, id = 'commentary-settings' } = {}) {
 checkedPrefix(id);
 const settings = profile || { humorIntensity:'dark', profanityAllowed:true, frequency:'' };
 const disabled = isHost ? '' : 'disabled';
 return `<section class="commentary-settings" aria-labelledby="${id}-title"><header><h2 id="${id}-title">Live commentary</h2><button type="button" data-commentary-close aria-label="Close commentary settings">×</button></header><p class="commentary-connection" role="status">${connected?'Voice connected':'Voice not connected · preferences only'}</p><form data-commentary-form data-host="${isHost}" data-profile="${esc(profile ? JSON.stringify(profile) : '')}"><label class="commentary-toggle"><input type="checkbox" name="enabled" ${enabled?'checked':''} ${disabled}><span>Enable table commentary</span></label><fieldset ${disabled}><legend>Table voice style</legend><label for="${id}-intensity">Humor intensity</label><select id="${id}-intensity" name="humorIntensity">${[['playful','Playful'],['savage','Savage'],['dark','Dark · shocking and absurd']].map(([value,label])=>`<option value="${value}" ${value===settings.humorIntensity?'selected':''}>${label}</option>`).join('')}</select><label class="commentary-toggle"><input type="checkbox" name="profanityAllowed" ${settings.profanityAllowed?'checked':''}><span>Allow profanity<small>Independent from humor intensity.</small></span></label><label for="${id}-frequency">How often?</label><select id="${id}-frequency" name="frequency" ${enabled?'required':''}><option value="">Choose when enabling</option>${[['highlights','Highlights'],['balanced','Balanced'],['lively','Lively']].map(([value,label])=>`<option value="${value}" ${value===settings.frequency?'selected':''}>${label}</option>`).join('')}</select><small>Highlights: standout moments. Balanced: a mix of big and everyday scores. Lively: more frequent reactions.</small></fieldset>${isHost?'':'<p>The host controls the shared table style.</p>'}<fieldset><legend>Your phone</legend><label class="commentary-toggle"><input type="checkbox" name="listenerMuted" ${listenerMuted?'checked':''} data-commentary-mute><span>Mute commentary on this phone<small>This does not mute other players.</small></span></label></fieldset><p data-commentary-error role="alert"></p>${isHost?'<button class="commentary-save" type="submit">Save commentary preferences</button>':''}</form></section>`;
}
export function bindCommentarySettings(root, { onTableSettings = () => {}, onListenerMute = () => {}, onClose = () => {} } = {}) {
 const form = root.querySelector('[data-commentary-form]');
 if (!form) throw new Error('Render commentary settings before binding.');
 const enabled = form.elements.namedItem('enabled');
 const frequency = form.elements.namedItem('frequency');
 const error = form.querySelector('[data-commentary-error]');
 const close = root.querySelector('[data-commentary-close]');
 const showError = failure => { error.textContent = failure?.message || 'Could not save commentary preferences.'; };
 const change = async event => {
  if (event.target === enabled) frequency.required = enabled.checked;
  if (event.target.matches('[data-commentary-mute]')) {
   error.textContent = '';
   try { await onListenerMute(event.target.checked); } catch (failure) { showError(failure); }
  }
 };
 let saving = false;
 const submit = async event => {
  event.preventDefault(); if (form.dataset.host !== 'true' || saving) return;
  saving = true;
  error.textContent = '';
  const button = form.querySelector('[type="submit"]'); button.disabled = true;
  try {
   const previous = form.dataset.profile ? JSON.parse(form.dataset.profile) : null;
   let profile = previous;
   if (enabled.checked || frequency.value) {
    const values = { humorIntensity:form.elements.namedItem('humorIntensity').value,
     profanityAllowed:form.elements.namedItem('profanityAllowed').checked, frequency:frequency.value };
    profile = previous ? updateProfile(previous, values) : createProfile(values);
   }
   await onTableSettings({ enabled:enabled.checked, profile });
   form.dataset.profile = profile ? JSON.stringify(profile) : '';
  } catch (failure) { showError(failure); } finally { saving = false; button.disabled = false; }
 };
 const dismiss = () => onClose();
 form.addEventListener('change', change); form.addEventListener('submit', submit); close?.addEventListener('click', dismiss);
 return () => { form.removeEventListener('change', change); form.removeEventListener('submit', submit); close?.removeEventListener('click', dismiss); };
}
