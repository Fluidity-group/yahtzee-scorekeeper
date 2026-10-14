import { MODES,filled } from '../game/core.js';
import './session-cards.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const isCompleted = room => room.tournament ? room.tournament.status === 'completed' : room.game?.status === 'finished' || room.status === 'finished';
const membersOf = room => Array.isArray(room.members) ? room.members : [];
const playersOf = room => Array.isArray(room.game?.players) && room.game.players.length ? room.game.players : membersOf(room).map(member => ({ id: member.userId, name: member.name }));
const rank = room => room.tournament?.status === 'paused' ? 0 : room.status === 'lobby' && !room.game ? 2 : 1;

export function savedSessionState(room) {
 if (isCompleted(room)) return { key: 'completed', label: 'Completed' };
 if (room.tournament?.status === 'paused') return { key: 'paused', label: 'Paused' };
 if (room.game?.status === 'finished' && room.tournament) return { key: 'waiting', label: 'Between games' };
 if (room.status === 'lobby' && !room.game) return { key: 'waiting', label: 'Waiting for players' };
 return { key: 'active', label: 'In progress' };
}

export function renderResumeEntry({ local = false } = {}) {
 return `<button class="saved-session-entry" ${local ? 'data-action="saved-sessions"' : 'data-mp="sessions"'}><span class="saved-session-entry-icon" aria-hidden="true">↻</span><span><strong>Resume saved games &amp; tournaments</strong><small>Return to your shared table with the same account. Your progress is saved—no new invitation needed.</small></span><span class="saved-session-entry-arrow" aria-hidden="true">→</span></button>`;
}

function renderCard(room, userId) {
 const members = membersOf(room), players = playersOf(room), tournament = room.tournament;
 const host = room.hostId === userId, state = savedSessionState(room), complete = state.key === 'completed';
 const hostName = players.find(player => player.id === room.hostId)?.name || members.find(member => member.userId === room.hostId)?.name || 'Your group';
 const name = tournament?.name || `${hostName}’s game`;
 const mode = room.game?.rules?.name || MODES[room.mode]?.name || room.mode || 'Game';
 const sequence = room.gameSequence ?? 1;
 const progress = tournament ? room.game ? `Game ${sequence} of ${tournament.gameCount}` : `${tournament.gameCount} games planned` : 'Hosted game';
 const turnSeat = room.game?.activeSeat;
 const activePlayer = Number.isInteger(turnSeat) ? players[turnSeat] : null;
 const activeId = activePlayer?.id ?? members[turnSeat]?.userId;
 let clue;
 if (complete) clue = 'Finished results are saved. Reopen to view this table.';
 else if (state.key === 'paused') clue = host ? 'Progress saved. Reopening keeps it paused; use Resume tournament at the table when you’re ready.' : 'Progress saved. Reopening keeps it paused until the host resumes the tournament.';
 else if (room.game?.status === 'finished' && tournament) clue = 'This game is finished. Return to the same group and get ready for the next game.';
 else if (!room.game) clue = host ? 'Your table is saved. Continue hosting and start when your players are ready.' : 'Your place is saved. Return to the lobby and wait for the host to start.';
 else if (activePlayer) clue = activeId === userId ? `Your turn · ${activePlayer.name}` : `${activePlayer.name} to play. Your place at the table is saved.`;
 else clue = 'Return to the same table and continue your saved game.';
 const action = complete ? 'View results' : host ? 'Continue hosting' : tournament ? 'Resume tournament' : 'Resume game';
 const roster = players.map((player,seat) => `<span>${esc(player.name)}${player.id === userId ? ' <small>· You</small>' : ''}${room.game?.sheets?.[seat]?` <small>· ${filled(room.game.sheets[seat])}/13 scored</small>`:''}</span>`).join('');
 if(state.key==='paused'&&activePlayer)clue+=` Next turn after resuming: ${activePlayer.name}${activeId===userId?' (you)':''}.`;
 return `<button class="saved-session-card saved-session-${state.key}" data-mp="resume" data-code="${esc(room.code)}"><span class="saved-session-top"><span class="saved-session-kind"><span aria-hidden="true">${tournament ? '♜' : '⚄'}</span> ${tournament ? 'Tournament' : 'Game'}</span><span class="saved-session-status">${esc(state.label)}</span></span><strong class="saved-session-name">${esc(name)}</strong><span class="saved-session-meta">${esc(mode)} · ${esc(progress)}</span><span class="saved-session-role">${host ? 'You host this table' : 'You joined this table'} · ${members.length}${tournament ? ` / ${esc(tournament.playerCount)}` : ''} ${members.length === 1 && !tournament ? 'player' : 'players'}</span><span class="saved-session-roster" aria-label="Players">${roster}</span><span class="saved-session-clue">${esc(clue)}</span><span class="saved-session-cta">${action} <span aria-hidden="true">→</span></span></button>`;
}

export function renderSavedSessions(rooms, userId, { view = 'open' } = {}) {
 const completed = view === 'completed';
 const ordered = (Array.isArray(rooms) ? rooms : []).filter(room => room && membersOf(room).some(member => member.userId === userId) && isCompleted(room) === completed).sort((a, b) => (completed ? 0 : rank(a) - rank(b)) || String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) || String(b.id ?? '').localeCompare(String(a.id ?? '')));
 if (!ordered.length) return `<p class="saved-sessions-empty">${completed ? 'No completed games or tournaments yet. Finished results will appear here.' : 'No unfinished games or tournaments found for this account. Your hosted and joined tables will appear here.'}</p>`;
 return `<div class="saved-sessions-list" aria-label="${completed ? 'Completed games and tournaments' : 'Unfinished games and tournaments'}">${ordered.map(room => renderCard(room, userId)).join('')}</div>`;
}
