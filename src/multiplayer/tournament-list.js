const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderOpenTournaments(rooms,userId){
 const rank=room=>room.tournament.status==='paused'?0:room.status==='lobby'?2:1;
 const ordered=rooms.filter(r=>r.tournament&&r.tournament.status!=='completed').sort((a,b)=>rank(a)-rank(b)||b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
 if(!ordered.length)return '<p class="core-muted">No open tournaments. Create one, or join a friend’s invitation.</p>';
 return ordered.map(r=>{
  const host=r.hostId===userId,status=r.tournament.status==='paused'?'Paused':r.status==='lobby'?'Waiting for players':r.game?.status==='finished'?'Between games':'In progress';
  return `<button class="history-row tournament-return" data-mp="resume" data-code="${esc(r.code)}"><strong>${esc(r.tournament.name)}</strong><span>${esc(status)} · Game ${r.gameSequence??1} of ${r.tournament.gameCount} · ${esc(r.mode)}</span><small>${r.members.length} / ${r.tournament.playerCount} players · ${esc(r.members.map(m=>m.name).join(' · '))}</small><b>${host?'Continue hosting':'Return to tournament'}</b></button>`;
 }).join('');
}
