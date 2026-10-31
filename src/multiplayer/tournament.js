import {gameRules,results} from '../game/core.js';
import {RoomError,requireMember} from './room.js';
import{VENUE_IDS}from'../game/score-presentation.js';

export function tournamentConfig(value,mode,source,rulesVersion=1) {
 if(value===undefined||value===null)return null;
 if(source!=='manual')throw new RoomError('Tournaments currently use manual scoring.');
 if(!value||typeof value!=='object'||Array.isArray(value))throw new RoomError('Invalid tournament settings.');
 const name=String(value.name??'').trim();
 if(!name||name.length>60)throw new RoomError('Enter a tournament name of 1–60 characters.');
 if(!Number.isInteger(value.gameCount)||value.gameCount<2||value.gameCount>20)throw new RoomError('Choose 2–20 tournament games.');
 if(!Number.isInteger(value.playerCount)||value.playerCount<2||value.playerCount>8)throw new RoomError('Choose 2–8 tournament players.');
 if(value.venue!==undefined&&!VENUE_IDS.includes(value.venue))throw new RoomError('Choose Miami, Sydney, Las Vegas or Tokyo.');
 return {name,gameCount:value.gameCount,playerCount:value.playerCount,status:'playing',rules:gameRules(mode,rulesVersion,source),...(value.venue?{venue:value.venue}:{})};
}

export function requireTournamentPlaying(room) {
 if(room.tournament?.status==='paused')throw new RoomError('The tournament is paused. Ask the host to resume.',409);
}

export function updateTournamentCompletion(room) {
 if(!room.tournament)return room;
 const complete=room.game?.status==='finished'&&(room.gameSequence??1)===room.tournament.gameCount;
 return {...room,tournament:{...room.tournament,status:complete?'completed':'playing'}};
}

export function setTournamentPaused(room,{userId,gameId,expectedRevision,paused,time}) {
 requireMember(room,userId);
 if(room.hostId!==userId)throw new RoomError('Only the host can pause or resume the tournament.',403);
 if(!room.tournament||!room.game)throw new RoomError('Start the tournament before pausing it.');
 if(room.tournament.status==='completed')throw new RoomError('This tournament is complete.');
 if(room.revision!==expectedRevision||room.game.id!==gameId)throw new RoomError('The tournament changed. Refresh before continuing.',409);
 if(typeof paused!=='boolean')throw new RoomError('Invalid pause request.');
 const status=paused?'paused':'playing';
 // Even an already-selected state needs a committed receipt for safe retries.
 if(room.tournament.status===status)return {...room,revision:room.revision+1};
 return {...room,revision:room.revision+1,tournament:{...room.tournament,status,pausedAt:paused?time:null}};
}

// Corrected finished snapshots are the source of truth; never increment counters.
// Current active-game scores (including hidden totals) are deliberately excluded.
export function tournamentStandings(room,snapshots) {
 if(!room.tournament)throw new RoomError('This table is not a tournament.');
 const games=new Map();
 for(const game of snapshots)if(game?.status==='finished'&&!(game.id===room.game?.id&&room.game.status!=='finished'))games.set(game.id,game);
 if(room.game?.status==='finished')games.set(room.game.id,room.game);
 if(games.size>room.tournament.gameCount)throw new RoomError('Tournament history exceeds its game count.',500);
 const standings=room.members.map(m=>({userId:m.userId,name:m.name,points:0,wins:0,games:0}));
 for(const game of games.values()) {
  if(game.players.length!==standings.length||new Set(game.players.map(p=>p.id)).size!==standings.length)throw new RoomError('Tournament history has a different roster.',500);
  if(game.mode!==room.mode||Object.keys(room.tournament.rules).some(key=>game.rules?.[key]!==room.tournament.rules[key])||Object.keys(game.rules??{}).length!==Object.keys(room.tournament.rules).length)throw new RoomError('Tournament history has different rules.',500);
  const result=results(game);
  for(const entry of standings) {
   const seat=game.players.findIndex(p=>p.id===entry.userId);
   if(seat<0)throw new RoomError('Tournament history has a different roster.',500);
   entry.points+=result.totals[seat];entry.games++;
   if(result.winners.includes(seat))entry.wins++;
  }
 }
 const leaders=key=>games.size?standings.filter(p=>p[key]===Math.max(...standings.map(s=>s[key]))).map(p=>p.userId):[];
 return {standings,completedGames:games.size,final:room.tournament.status==='completed',pointsLeaders:leaders('points'),winsLeaders:leaders('wins')};
}
