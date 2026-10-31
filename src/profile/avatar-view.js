import{renderMidnightPortrait}from'../ui/midnight-art.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let own=null;const peers=new Map();
export function currentAvatar(){return own;}
export function avatarProfile(accountId){return own?.ownerId===accountId?own:peers.get(accountId)||null;}
export function setAccountAvatar(profile){own=profile;if(profile)peers.set(profile.ownerId,profile);else peers.clear();globalThis.dispatchEvent?.(new Event('clubhouse-avatar-changed'));}
export function setPeerAvatars(profiles){for(const p of profiles)peers.set(p.ownerId,p);}
export function renderAvatar({accountId,preset='character-1',ownPlayer=false,name='Player'}={}){
 const profile=ownPlayer?own:peers.get(accountId);
 if(profile?.kind==='generated'&&typeof profile.url==='string'&&/^https:\/\//.test(profile.url))return`<img class="account-portrait" src="${escape(profile.url)}" alt="${escape(name)}’s chosen illustrated avatar" referrerpolicy="no-referrer">`;
 return renderMidnightPortrait(profile?.preset||preset);
}
