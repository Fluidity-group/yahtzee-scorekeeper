// Accepted scoring order, not physical roll timing. Corrections retain original order.
export function latestTableYahtzee(game){
 if(!game)return null;
 const events=game.events||[],excluded=new Set((game.turns||[]).filter(t=>t.undone||t.excluded).map(t=>t.id));
 const undone=new Set(events.filter(e=>e.type==='score-undo').map(e=>e.target));
 const corrections=new Map(events.filter(e=>e.type==='score-correction').map(e=>[e.target,e.value]));
 const event=events.findLast(e=>!undone.has(e.id)&&!excluded.has(e.turnId)&&(
  e.type==='score'&&(e.category==='yahtzee'&&(corrections.get(e.id)??e.value)>0||e.bonus>0)||
  e.type==='bonus'&&e.value>0||e.type==='final-chain-roll'&&e.value>0&&e.face>=1&&e.face<=6));
 const player=event&&game.players?.[event.seat];
 return player?{...player,eventId:event.id}:null;
}

export function selectHomeTables(userId,entries,preferredTableId){
 const rooms=entries.map(entry=>entry.room).filter(room=>room.members?.some(m=>m.userId===userId));
 rooms.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))||String(a.id).localeCompare(String(b.id)));
 const currentTable=rooms.find(room=>room.id===preferredTableId)||rooms[0]||null;
 const unfinished=room=>room.tournament&&room.tournament.status!=='completed';
 return {currentTable,currentTournament:currentTable&&unfinished(currentTable)?currentTable:rooms.find(unfinished)||null};
}
