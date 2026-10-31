export const AVATAR_REACTIONS=Object.freeze(['yahtzee','full-house','upper-bonus','large-straight','game-win','tournament-win','scratch','low-kind','upper-impossible']);
export function tournamentReactionItems(room,game){
 const data=room?.tournamentStandings;if(room?.tournament?.status!=='completed'||!data?.final||data.completedGames!==room.tournament.gameCount)return[];
 return[['pointsLeaders','Total points'],['winsLeaders','Games won']].flatMap(([field,label])=>{const winners=(data[field]||[]).map(id=>game.players.findIndex(p=>p.id===id)).filter(seat=>seat>=0);return winners.length?[{kind:'tournament-finish',text:label+(winners.length>1?' · Shared winners':' · Winner'),winners}]:[];});
}
export function avatarReaction(items,seat,{tournamentWinners=[]}={}){
 if(tournamentWinners.includes(seat))return'tournament-win';
 if(items.some(i=>i.kind==='finish'&&i.winners?.includes(seat)))return'game-win';
 const own=items.filter(i=>i.seat===seat);
 if(own.some(i=>i.kind==='yahtzee'))return'yahtzee';
 if(own.some(i=>i.kind==='upper-bonus'))return'upper-bonus';
 if(own.some(i=>i.kind==='upper-impossible'))return'upper-impossible';
 if(own.some(i=>i.kind==='scratch'))return'scratch';
 if(own.some(i=>i.kind==='low-kind'))return'low-kind';
 if(own.some(i=>i.category==='largeStraight'))return'large-straight';
 if(own.some(i=>i.category==='fullHouse'))return'full-house';
 if(own.some(i=>i.kind==='big-score'))return'game-win';
 return null;
}
