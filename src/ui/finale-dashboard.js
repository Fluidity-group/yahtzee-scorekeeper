import {renderAvatar} from '../profile/avatar-view.js';
import {renderTournamentStandings,tournamentAwards} from './tournament.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portrait=row=>`<span class="finale-avatar">${renderAvatar({accountId:row.userId,name:row.name})}</span>`;

// A completed room can arrive before the history response. Never crown partial boards.
export function finalStandingsReady(room){
 const data=room?.tournamentStandings,rows=data?.standings,expected=room?.members?.length||room?.tournament?.playerCount;
 return room?.tournament?.status==='completed'&&data?.final===true&&data.completedGames===room.tournament.gameCount&&Array.isArray(rows)&&rows.length>0&&(!expected||rows.length===expected)&&new Set(rows.map(row=>row.userId)).size===rows.length&&rows.every(row=>row.userId&&[row.points,row.wins,row.games].every(Number.isFinite)&&row.games===data.completedGames&&row.points>=0&&row.wins>=0&&row.wins<=row.games)&&(!room.members?.length||room.members.every(member=>rows.some(row=>row.userId===member.userId)));
}
export function renderTournamentFinale({room,finalGameMarkup='',scorecardMarkup='',connected=true}={}){
 const data=room.tournamentStandings,ready=finalStandingsReady(room),rows=ready?(room.members?.length?room.members.map(member=>data.standings.find(row=>row.userId===member.userId)):data.standings):[];
 const awards=ready?tournamentAwards(data):[];
 const honours=(ready?['points','wins']:[]).map((key,index)=>{
  const best=Math.max(...rows.map(row=>row[key])),leaders=rows.filter(row=>row[key]===best);
  const winnerMarkup=list=>list.map(row=>`<figure>${portrait(row)}<figcaption>${esc(row.name)}</figcaption></figure>`).join('');
  const shared=leaders.length>2;
  return `<article class="finale-honour"><h3>${key==='points'?'Total points':'Games won'}</h3><div class="finale-winners">${winnerMarkup(leaders.slice(0,2))}</div><strong class="finale-value">${best}<small>${key==='points'?'points':best===1?'win':'wins'}</small></strong><span class="finale-award-label">${leaders.length>1?'Shared winners':'Winner'}</span>${shared?`<details data-finale-detail="winners-${key}"><summary>All ${leaders.length} shared winners</summary><div class="finale-winners">${winnerMarkup(leaders)}</div><p>${esc(awards[index].detail)}</p></details>`:`<p>${esc(awards[index].detail)}</p>`}</article>`;
 }).join('');
 const ledger=ready?`<table class="finale-ledger"><caption>Tournament results · ${data.completedGames} games</caption><thead><tr><th scope="col">Player</th><th scope="col">Points</th><th scope="col">Wins</th></tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${portrait(row)}<span>${esc(row.name)}</span></th><td>${row.points}</td><td>${row.wins}</td></tr>`).join('')}</tbody></table>`:'';
 return `<section class="tournament-finale" data-finale-game="${esc(room.game.id)}" aria-labelledby="finaleTitle"><header class="finale-heading"><span aria-hidden="true">✦</span><div><h2 id="finaleTitle">Tournament complete!</h2><p>${esc(room.tournament.name)} · ${room.tournament.gameCount} games saved</p></div></header>${!connected?'<p role="status">Reconnecting · showing the saved results.</p>':''}${ready?`<div class="finale-honours">${honours}</div>${rows.length>2?`<details data-finale-detail="comparison"><summary>Compare all ${rows.length} players</summary>${ledger}</details>`:ledger}`:'<p class="finale-checking" role="status">Checking the final standings before announcing the winners…</p>'}<div class="finale-actions"><button class="core-primary" data-action="analytics">Tournament insights ↗</button><button class="hbtn" data-action="tournament-exit">Saved tournaments</button></div><details data-finale-detail="game"><summary>Final game · scores &amp; scorecard</summary>${finalGameMarkup}${scorecardMarkup}</details><details data-finale-detail="standings"><summary>Full standings · both honours</summary>${ready?renderTournamentStandings(data,{final:true}):'<p role="status">Waiting for complete tournament history…</p>'}</details><details data-finale-detail="rules"><summary>How the honours work</summary><p>Total points and Games won are two separate honours. Tied game winners each earn a win. Equal tournament totals share that honour. Standings follow your account when your name changes.</p></details></section>`;
}

// Room polling replaces the root. Keep a reader's expanded views and keyboard focus.
export function captureFinaleState(root){
 const finale=root.querySelector('[data-finale-game]');if(!finale)return null;
 const focused=document.activeElement,detail=focused?.closest?.('[data-finale-detail]');
 const focusData=finale.contains(focused)?Object.fromEntries(Object.entries(focused.dataset).filter(([key])=>['action','key','seat','phonePeerStep'].includes(key))):{};
 return {game:finale.dataset.finaleGame,open:[...finale.querySelectorAll('details[open]')].map(el=>el.dataset.finaleDetail),focus:detail&&focused===detail.querySelector('summary')?detail.dataset.finaleDetail:null,focusScope:detail?.dataset.finaleDetail,focusData,containers:[...finale.querySelectorAll('.score-table-wrap,.phone-peer-window')].map(el=>({top:el.scrollTop,left:el.scrollLeft})),scroll:globalThis.scrollY||0};
}
export function restoreFinaleState(root,state){
 const finale=root.querySelector('[data-finale-game]');if(!state||finale?.dataset.finaleGame!==state.game)return;
 for(const detail of finale.querySelectorAll('[data-finale-detail]'))detail.open=state.open.includes(detail.dataset.finaleDetail);
 const scope=state.focusScope?[...finale.querySelectorAll('[data-finale-detail]')].find(el=>el.dataset.finaleDetail===state.focusScope):finale;
 const target=state.focus?[...finale.querySelectorAll('[data-finale-detail]')].find(el=>el.dataset.finaleDetail===state.focus)?.querySelector('summary'):Object.keys(state.focusData||{}).length?[...(scope?.querySelectorAll('button,[tabindex]')||[])].find(el=>Object.entries(state.focusData).every(([key,value])=>el.dataset[key]===value)):null;
 target?.focus({preventScroll:true});
 [...finale.querySelectorAll('.score-table-wrap,.phone-peer-window')].forEach((el,index)=>{const saved=state.containers?.[index];if(saved){el.scrollTop=saved.top;el.scrollLeft=saved.left;}});
 if(globalThis.scrollY!==state.scroll)globalThis.scrollTo?.({top:state.scroll,behavior:'instant'});
}
