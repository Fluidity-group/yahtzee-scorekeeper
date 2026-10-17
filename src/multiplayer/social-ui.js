import{auth,requestSocial,watchSocial,webUrl}from'./client.js';
import{enablePhoneNotifications,disablePhoneNotifications,syncNativeAccount}from'./social-native.js';
import'./social.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dialog,stopWatch,userId,known=new Set(),refreshTimer,busy=false,activeRoom=null,inbox=null,epoch=0;
const navigate=code=>document.dispatchEvent(new CustomEvent('clubhouse-open-tournament',{detail:{code}}));
function status(text){const node=dialog?.querySelector('[data-social-status]');if(node)node.textContent=text;}
function frame(){
 if(dialog?.isConnected)return;
 dialog=document.createElement('dialog');dialog.className='social-dialog';dialog.setAttribute('aria-label','Tournament invitations and play requests');
 document.body.append(dialog);dialog.addEventListener('click',onClick);dialog.addEventListener('submit',onSubmit);
 dialog.addEventListener('close',()=>{activeRoom=null;});
}
function render(){
 if(!dialog?.open||!inbox)return;
 const incoming=inbox.invitations.filter(x=>!x.sent&&x.status==='pending');
 const requests=inbox.requests.filter(x=>x.status==='pending'||x.status==='ready');
 const sent=inbox.invitations.filter(x=>x.sent);
 dialog.innerHTML=`<header><h2>${activeRoom?'Your tournament players':'Invitations & play requests'}</h2><button data-social="close" aria-label="Close">×</button></header><p data-social-status role="status" aria-live="polite"></p>${activeRoom?`<p>${esc(activeRoom.tournament?.name)} · Existing players already belong to this tournament.</p>${activeRoom.status==='lobby'&&activeRoom.hostId===userId?`<form data-social-form="invite"><label>Invite by email<input name="email" type="email" maxlength="254" autocomplete="email" required></label><button type="submit">Save invitation</button><small>They can accept in their app. Share the link below if they haven’t signed up yet.</small></form>`:''}<div class="social-members">${activeRoom.members.map(m=>`<div><strong>${esc(m.name)}</strong><span>Member</span>${m.userId!==userId?`<button data-social="play" data-user="${esc(m.userId)}">Ask to play</button>`:'<span>You</span>'}</div>`).join('')}</div><button data-social="share">Share tournament link</button>`:''}<h3>Invitations for you</h3>${incoming.length?incoming.map(i=>`<article><strong>${esc(i.tournament_name||'Tournament')}</strong><small>From ${esc(i.sender_name||'the organiser')}${i.game_count?` · ${esc(i.game_count)} games`:''}</small><small>${i.actionable?'Invitation waiting for your response':'Invitation closed or expired'}</small>${i.actionable?`<form data-social-form="accept" data-id="${esc(i.id)}"><label>Your player name<input name="name" maxlength="24" required autocomplete="nickname"></label><button type="submit">Accept & open</button></form>`:''}<button data-social="invite-decline" data-id="${esc(i.id)}">Decline</button></article>`).join(''):'<p>No pending invitations.</p>'}<h3>Play requests</h3>${requests.length?requests.map(q=>`<article><strong>${esc(q.tournament_name||'Tournament')}</strong><p>${esc(q.sent?q.recipient_name:q.sender_name)} · ${q.actionable?(q.status==='ready'?'Ready to play':q.sent?'Waiting for a response':'Wants to play'):'Request expired — open the current table'}</p><button data-social="open" data-code="${esc(q.code)}">Open tournament</button>${q.actionable&&q.status==='pending'?(q.sent?`<button data-social="play-cancel" data-id="${esc(q.id)}">Cancel request</button>`:`<button data-social="play-ready" data-id="${esc(q.id)}">I’m ready</button><button data-social="play-decline" data-id="${esc(q.id)}">Not now</button>`):''}</article>`).join(''):'<p>No play requests yet.</p>'}${sent.length?`<details><summary>Invitations you sent</summary>${sent.map(i=>`<article>${esc(i.tournament_name)} · ${esc(i.recipient_email)} · ${esc(i.status)}${i.status==='pending'?`<button data-social="invite-revoke" data-id="${esc(i.id)}">Revoke</button>`:''}</article>`).join('')}</details>`:''}<footer><button data-social="refresh">Refresh</button><button data-social="enable">Enable phone alerts</button><button data-social="disable">Disable alerts on this phone</button><small>Phone alerts need permission and Apple/Firebase setup. Requests remain available here.</small></footer>`;
}
export async function refreshSocial(){
 if(!userId)return;
 const ticket=epoch,id=userId,data=await requestSocial('inbox');if(ticket!==epoch||id!==userId)return;
 const next=new Set([...data.invitations,...data.requests].map(x=>`${x.id}:${x.status}`));
 const fresh=[...data.invitations.filter(x=>!x.sent&&x.status==='pending'&&x.actionable),...data.requests.filter(x=>x.actionable&&(!x.sent&&x.status==='pending'||x.sent&&x.status==='ready'))].some(x=>!known.has(`${x.id}:${x.status}`));
 if(fresh&&!document.hidden){let banner=document.querySelector('.social-banner');if(!banner){banner=document.createElement('button');banner.className='social-banner';banner.textContent='Tournament update · open invitations';banner.addEventListener('click',()=>{banner.remove();openSocial().catch(()=>{});});document.body.append(banner);}}
 inbox=data;known=next;if(!busy)render();
}
export async function connectSocial(user){
 if(user?.id===userId)return;
 epoch++;stopWatch?.();stopWatch=null;userId=user?.id;inbox=null;known=new Set();clearTimeout(refreshTimer);
 if(!userId){dialog?.close();document.querySelector('.social-banner')?.remove();return;}
 const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{refreshSocial().catch(()=>{});},120);};
 stopWatch=watchSocial(refresh);await refreshSocial();syncNativeAccount(user).catch(()=>{});
}
export async function openSocial(room=null){
 const lookup=await auth?.getSession();const user=lookup?.data?.session?.user;
 if(!user)throw Error('Sign in to online games to open invitations.');
 await connectSocial(user);document.querySelector('.social-banner')?.remove();frame();activeRoom=room;dialog.showModal();dialog.innerHTML='<p data-social-status role="status">Opening tournament invitations…</p>';await refreshSocial();render();
}
async function onClick(event){
 const button=event.target.closest('[data-social]');if(!button||busy)return;const action=button.dataset.social;
 if(action==='close'){dialog.close();return;}
 if(action==='open'){dialog.close();navigate(button.dataset.code);return;}
 busy=true;button.disabled=true;
 try{
  if(action==='play'){await requestSocial('play-create',{id:crypto.randomUUID(),code:activeRoom.code,gameId:activeRoom.game?.id??null,recipientId:button.dataset.user});await refreshSocial();render();status('Request saved. Their response will appear here; delivery depends on their phone alerts.');}
  else if(action==='share'){const link=new URL(webUrl);link.searchParams.set('join',activeRoom.code);if(navigator.share)await navigator.share({title:activeRoom.tournament.name,url:link.href});else{await navigator.clipboard.writeText(link.href);status('Tournament link copied.');}}
  else if(action==='enable'){await enablePhoneNotifications();status('Registering this phone…');}
  else if(action==='disable'){await disablePhoneNotifications();status('Phone alerts disabled on this installation.');}
  else if(action==='refresh'){await refreshSocial();render();}
  else {const data=await requestSocial(action,{id:button.dataset.id});await refreshSocial();render();if(action==='play-ready'){status('You’re marked ready. The tournament remains in its current state.');}}
 }catch(error){status(error.message);}finally{busy=false;if(button.isConnected)button.disabled=false;}
}
async function onSubmit(event){
 const form=event.target.closest('[data-social-form]');if(!form)return;event.preventDefault();if(busy)return;
 busy=true;const data=new FormData(form);const submit=form.querySelector('button[type=submit]');submit.disabled=true;
 try{if(form.dataset.socialForm==='invite'){await requestSocial('invite-create',{id:crypto.randomUUID(),code:activeRoom.code,email:data.get('email')});await refreshSocial();render();status('Invitation saved. Share the tournament link if they’re not using the app yet.');}
 else{const result=await requestSocial('invite-accept',{id:form.dataset.id,name:data.get('name')});dialog.close();navigate(result.code);}}
 catch(error){status(error.message);}finally{busy=false;if(submit.isConnected)submit.disabled=false;}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSocial().catch(()=>{});});
document.addEventListener('clubhouse-social-changed',()=>refreshSocial().catch(()=>{}));
document.addEventListener('clubhouse-push-status',event=>status(event.detail));
