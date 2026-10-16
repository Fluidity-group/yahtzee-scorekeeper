const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderTournamentStandings(data, { final = false } = {}) {
 if (!data) return '<p class="core-muted" role="status">Loading tournament standings…</p>';
 const rows = data.standings;
 const table = (key, label) => {
  const ordered = [...rows].sort((a,b) => b[key]-a[key]);
  const best = ordered[0]?.[key];
  return `<section><h3>${label}</h3><ol class="tournament-ranking" aria-label="${label}">${ordered.map(row => `<li><span>${esc(row.name)}${data.completedGames > 0 && row[key] === best ? `<small>${final ? 'Winner' : 'Leader'}</small>` : ''}</span><strong>${row[key]}<small>${key === 'points' ? 'points' : row.wins === 1 ? 'win' : 'wins'}</small></strong></li>`).join('')}</ol></section>`;
 };
 return `<div class="tournament-standings"><p class="core-muted">${data.completedGames} completed ${data.completedGames === 1 ? 'game' : 'games'} · ${final ? 'Final standings' : 'Completed games only'}</p><div class="tournament-boards">${table('points','Total points')}${table('wins','Games won')}</div><p class="core-muted">Standings follow your account, even when your player name changes. Tied game winners each earn a win.</p></div>`;
}

export function renderTournamentActions(room, userId, {connected=true,busy=false}={}) {
 const tournament=room?.tournament;if(!tournament)return '';
 const paused=tournament.status==='paused',final=tournament.status==='completed';
 const host=room.hostId===userId,member=room.members?.some(player=>player.userId===userId);
 return `<h2>Tournament actions</h2><p class="core-muted">${esc(tournament.name)}</p><div class="tournament-actions"><button class="hbtn" data-action="tournament-standings">Standings</button>${host&&!final&&room.capabilities?.tournaments===true?`<button class="hbtn" data-action="tournament-${paused?'resume':'pause'}"${!connected||busy?' disabled':''}>${paused?'Resume tournament':'Pause tournament'}</button>`:''}${member?'<button class="hbtn" data-action="tournament-invitation">Invitation · QR &amp; link</button>':''}<button class="hbtn" data-action="tournament-exit"${busy?' disabled':''}>Exit to saved games</button></div>`;
}
export function renderTournamentBanner(room,userId,{connected=true,busy=false}={}) {
 const tournament=room?.tournament;if(!tournament)return '';
 const paused=tournament.status==='paused',final=tournament.status==='completed',host=room.hostId===userId;
 return `<section class="tournament-banner" aria-label="Tournament"><div class="tournament-compact-heading"><div><strong>${esc(tournament.name)}</strong><span>Game ${room.gameSequence??1} of ${tournament.gameCount} · ${tournament.playerCount} players${paused?' · Paused':final?' · Complete':''}</span></div><button class="hbtn" data-action="tournament-menu" aria-label="Tournament actions" aria-haspopup="dialog" aria-expanded="false">⋯</button></div>${paused?`<p role="status">Tournament paused. Your progress is saved. ${host?'Resume from Tournament actions.':'The host resumes when everyone is back.'}</p>`:!connected?'<p role="status">Reconnecting. Wait for the table to sync.</p>':''}</section>`;
}
