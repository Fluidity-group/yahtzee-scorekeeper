import{renderMidnightPortrait}from'../ui/midnight-art.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let own=null;const peers=new Map();
export function currentAvatar(){return own;}
export function avatarProfile(accountId){return own?.ownerId===accountId?own:peers.get(accountId)||null;}
function newest(prior,next){
 if(!prior||prior.ownerId!==next.ownerId)return next;
 if(Number.isSafeInteger(prior.revision)&&(!Number.isSafeInteger(next.revision)||next.revision<prior.revision))return prior;
 return next;
}
export function setAccountAvatar(profile){
 if(!profile){own=null;peers.clear();}
 else{const accepted=newest(avatarProfile(profile.ownerId),profile);own=accepted;peers.set(accepted.ownerId,accepted);}
 globalThis.dispatchEvent?.(new Event('clubhouse-avatar-changed'));
}
export function setPeerAvatars(profiles){for(const p of profiles){const accepted=newest(avatarProfile(p.ownerId),p);peers.set(p.ownerId,accepted);if(own?.ownerId===p.ownerId)own=accepted;}}
export function renderAvatar({accountId,preset='character-1',ownPlayer=false,name='Player'}={}){
 const profile=ownPlayer?own:avatarProfile(accountId);
 if(profile?.kind==='generated'&&typeof profile.url==='string'&&/^https:\/\//.test(profile.url))return`<img class="account-portrait" src="${escape(profile.url)}" alt="${escape(name)}’s chosen illustrated avatar" referrerpolicy="no-referrer">`;
 if(profile?.kind==='generated')return `<span class="account-portrait-pending" role="img" aria-label="${escape(name)}’s saved portrait is temporarily unavailable">${renderMidnightPortrait(profile?.preset||preset)}<small>Saved portrait · reconnecting</small></span>`;
 return renderMidnightPortrait(profile?.preset||preset);
}
