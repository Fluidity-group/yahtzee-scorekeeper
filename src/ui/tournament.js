import{renderAvatar}from'../profile/avatar-view.js';
import{locationById,renderMidnightCity}from'./midnight-art.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Independent awards: the tournament has no overall tie-break between these boards.
export function tournamentAwards(data) {
 if (!data?.final || !data.completedGames || !data.standings?.length) return [];
 return ['points','wins'].map(key => {
  const rows=[...data.standings].sort((a,b)=>b[key]-a[key]),best=rows[0][key];
  const leaders=rows.filter(row=>row[key]===best),others=rows.filter(row=>row[key]!==best);
  const unit=key==='points'?'points':best===1?'win':'wins';
  return {title:`${key==='points'?'Total points':'Games won'} · ${leaders.length>1?'Shared winners':'Winner'}`,
   detail:`${leaders.map(row=>row.name).join(' & ')} ${leaders.length>1?'tie with':'wins with'} ${best} ${unit}${others.length?` · ${best-others[0][key]} ${key==='points'?'points':best-others[0][key]===1?'win':'wins'} ahead`:''}.`};
 });
}

export function renderTournamentFinish(room) {
 if (room?.tournament?.status!=='completed') return '';
 const data=room.tournamentStandings;
 // A completed room is insufficient for declaring champions until all history is loaded.
 const awards=data?.completedGames===room.tournament.gameCount?tournamentAwards(data):[];
 return `<section class="tournament-finish" aria-labelledby="tournamentFinishTitle"><span class="tournament-finish-mark" aria-hidden="true">✦</span><h2 id="tournamentFinishTitle">Tournament complete!</h2><p>${esc(room.tournament.name)} · All ${room.tournament.gameCount} games played.</p>${awards.length?awards.map(award=>`<article><h3>${esc(award.title)}</h3><p>${esc(award.detail)}</p></article>`).join('')+'<small>Two separate honours. Tied game winners each earn a win.</small>':'<p role="status">Checking the final standings before announcing the winners…</p>'}</section>`;
}

export function renderTournamentStandings(data, { final = false } = {}) {
 if (!data) return '<p class="core-muted" role="status">Loading tournament standings…</p>';
 const rows = data.standings;
 const table = (key, label) => {
  const ordered = [...rows].sort((a,b) => b[key]-a[key]);
  const best = ordered[0]?.[key];
  return `<section><h3>${label}</h3><ol class="tournament-ranking" aria-label="${label}">${ordered.map(row => `<li><span class="result-player"><span class="result-avatar">${renderAvatar({accountId:row.userId,name:row.name})}</span>${esc(row.name)}${data.completedGames > 0 && row[key] === best ? `<small>${final ? 'Winner' : 'Leader'}</small>` : ''}</span><strong>${row[key]}<small>${key === 'points' ? 'points' : row.wins === 1 ? 'win' : 'wins'}</small></strong></li>`).join('')}</ol></section>`;
 };
 return `<div class="tournament-standings"><p class="core-muted">${data.completedGames} completed ${data.completedGames === 1 ? 'game' : 'games'} · ${final ? 'Final standings' : 'Completed games only'}</p><div class="tournament-boards">${table('points','Total points')}${table('wins','Games won')}</div><p class="core-muted">Standings follow your account, even when your player name changes. Tied game winners each earn a win.</p></div>`;
}

export function renderTournamentActions(room, userId, {connected=true,busy=false}={}) {
 const tournament=room?.tournament;if(!tournament)return '';
 const paused=tournament.status==='paused',final=tournament.status==='completed';
 const host=room.hostId===userId,member=room.members?.some(player=>player.userId===userId);
 return `<h2>Tournament Actions</h2><p class="core-muted">${esc(tournament.name)}</p><div class="tournament-actions">${host&&paused&&room.capabilities?.tournaments===true?`<button class="hbtn tournament-resume-primary" data-action="tournament-resume"${!connected||busy?' disabled':''}>▶ Resume Tournament</button>`:''}<button class="hbtn" data-action="analytics">Tournament Insights</button><button class="hbtn" data-action="tournament-standings">Standings</button>${host&&!final&&!paused&&room.capabilities?.tournaments===true?`<button class="hbtn" data-action="tournament-${paused?'resume':'pause'}"${!connected||busy?' disabled':''}>${paused?'Resume Tournament':'Pause Tournament'}</button>`:''}${member?'<button class="hbtn" data-action="tournament-players">Players · invite &amp; ask to play</button><button class="hbtn" data-action="tournament-invitation">Invitation · QR &amp; link</button>':''}<button class="hbtn" data-action="tournament-exit"${busy?' disabled':''}>Exit to Saved Games</button></div>`;
}
export function renderTournamentBanner(room,userId,{connected=true,busy=false}={}) {
 const tournament=room?.tournament;if(!tournament)return '';
 const paused=tournament.status==='paused',final=tournament.status==='completed',host=room.hostId===userId;
 const sequence=room.gameSequence??1,last=sequence===tournament.gameCount;
 const milestone=final?'Tournament complete · All games saved':last?'Final game · This game completes the tournament':sequence===tournament.gameCount-1?'One more game after this one':'';
 return `<section class="tournament-banner${last&&!final?' tournament-final-game':''}" aria-label="Tournament"><div class="tournament-compact-heading"><div><strong>${esc(tournament.name)}</strong><span>Game ${sequence} of ${tournament.gameCount} · ${tournament.playerCount} players${final?' · Complete':''}</span></div><button class="hbtn" data-action="tournament-menu" aria-label="Tournament Actions" aria-haspopup="dialog" aria-expanded="false">⋯</button></div>${tournament.venue?`<span class="tournament-venue"><span class="tournament-venue-art" aria-hidden="true">${renderMidnightCity(tournament.venue)}</span>${esc(locationById(tournament.venue).name)} · shared venue</span>`:''}${milestone?`<p class="tournament-milestone" role="status">${milestone}</p>`:''}${!connected?'<p role="status">Reconnecting. Wait for the table to sync.</p>':''}</section>`;
}
