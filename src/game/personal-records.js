// Count saved dice observations and explicit manual Yahtzee reports, not bonus-point estimates.
export function recordedYahtzees(game,seat){
 const excluded=new Set((game.turns||[]).filter(t=>t.excluded||t.undone).map(t=>t.id));
 const events=(game.events||[]).filter(e=>e.seat===seat&&(e.type==='score-correction'||!excluded.has(e.turnId)));
 const undone=new Set(events.filter(e=>e.type==='score-undo').map(e=>e.target));
 const corrected=new Map(events.filter(e=>e.type==='score-correction').map(e=>[e.target,e.value]));
 const rolls=new Map(),reports=new Set();let evidence=false;
 for(const e of events){
  if(undone.has(e.id))continue;
  if(e.type==='roll'){rolls.set(e.id,{...e});evidence=true;}
  if(e.type==='roll-correction'&&rolls.has(e.target))rolls.get(e.target).dice=e.dice;
  if(e.type==='roll-excluded')rolls.delete(e.target);
  if(['score','bonus','final-chain-roll'].includes(e.type))evidence=true;
  if(e.type==='score'&&(e.category==='yahtzee'&&(corrected.get(e.id)??e.value)>0||e.bonus>0)||e.type==='bonus'&&e.value>0||e.type==='final-chain-roll'&&e.face>=1&&e.face<=6&&e.value>0)reports.add(e.turnId||e.id);
 }
 const matches=[...rolls.values()].filter(e=>e.dice?.length===5&&e.dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6&&d===e.dice[0]));
 const observedTurns=new Set(matches.map(e=>e.turnId||e.id));
 return evidence?matches.length+[...reports].filter(id=>!observedTurns.has(id)).length:null;
}
