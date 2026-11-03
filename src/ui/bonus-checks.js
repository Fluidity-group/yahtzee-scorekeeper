const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bonusCount(game,seat){
 const excluded=new Set((game.turns||[]).filter(t=>t.undone||t.excluded).map(t=>t.id));
 const events=(game.events||[]).filter(e=>e.seat===seat),undone=new Set(events.filter(e=>e.type==='score-undo').map(e=>e.target));
 return events.filter(e=>!excluded.has(e.turnId)&&!undone.has(e.id)&&(e.type==='score'&&e.bonus>0||e.type==='bonus'&&e.value>0||e.type==='final-chain-roll'&&e.value>0)).length;
}
export function renderBonusChecks(game,seat,{hidden=false,addControl='',undoControl=''}={}){
 if(hidden)return `<span class="yahtzee-checks"><span class="hidden-total">Bonuses hidden</span>${addControl}${undoControl}</span>`;
 const count=bonusCount(game,seat),points=game.sheets[seat].yahtzeeBonus||0;
 return `<span class="yahtzee-checks"><span class="bonus-check-history" role="img" aria-label="${count} recorded bonus ${count===1?'Yahtzee':'Yahtzees'}, ${esc(points)} bonus points">${Array.from({length:Math.min(count,3)},()=>'<span class="bonus-check checked" aria-hidden="true">✓</span>').join('')}${count>3?`<small aria-hidden="true">+${count-3}</small>`:''}${points?`<span class="bonus-total">${esc(points)}</span>`:''}</span>${addControl}${undoControl}</span>`;
}
