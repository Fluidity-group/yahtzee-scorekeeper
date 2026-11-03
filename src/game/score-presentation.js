import{upperProgress}from'./upper-progress.js';
import{results}from'./core.js';
import{LOWER_KEYS,META}from'./categories.js';
export const VENUE_IDS=Object.freeze(['miami','sydney','las-vegas','tokyo']);
export const SPECIAL_EVENT_MS=4000;
// Derive exclusively from two accepted snapshots; no dice inference or rule change.
export function scorePresentation(before,after,{time,id}={}){
 if(!before||!after||before.id!==after.id)return null;
 const fresh=(after.events||[]).filter(e=>!(before.events||[]).some(p=>p.id===e.id));
 const event=fresh.filter(e=>['score','score-correction','score-undo','final-chain-roll','bonus','final-chain-end'].includes(e.type)).at(-1);if(!event||event.type==='score-undo')return null;
 const items=[];
 if(event.type==='score'&&event.value===0||event.type==='score-correction'&&event.value===0&&event.before!==0)items.push({kind:'scratch',seat:event.seat,text:'0 · Scratch'});
 if(!after.hideTotals||after.status==='finished'){
  const scored=['score','score-correction'].includes(event.type),newMilestone=event.type!=='score-correction'||event.before<=24;
  const bonus=event.bonus>0?event.bonus:['bonus','final-chain-roll'].includes(event.type)?event.value:0;
  if(bonus>0||scored&&event.category==='yahtzee'&&event.value>0&&(event.type!=='score-correction'||event.before===0))items.push({kind:'yahtzee',seat:event.seat,text:bonus>0?`Yahtzee! +${bonus}`:`Yahtzee! ${event.value} points`});
  if(scored&&newMilestone&&event.category!=='yahtzee'&&LOWER_KEYS.includes(event.category)&&event.value>24)items.push({kind:'big-score',seat:event.seat,category:event.category,text:`${META[event.category].name} · ${event.value} points`});
  if(scored&&['threeKind','fourKind'].includes(event.category)&&event.value>0&&event.value<20&&(event.type!=='score-correction'||event.before>=20||event.before===0))items.push({kind:'low-kind',seat:event.seat,text:`${META[event.category].name} · ${event.value} points`});
 }
 if(!after.hideTotals||after.status==='finished')for(let seat=0;seat<after.players.length;seat++){
  const was=upperProgress(before.sheets[seat]),next=upperProgress(after.sheets[seat]);
  if(was.state!=='secured'&&next.state==='secured')items.push({kind:'upper-bonus',seat,text:'+35 · Upper bonus'});
  if(was.state!=='unreachable'&&next.state==='unreachable')items.push({kind:'upper-impossible',seat,text:'LOSER LOSER LOSER LOSER'});
 }
 if(before.status!=='finished'&&after.status==='finished'){
  const result=results(after);items.push({kind:'finish',text:result.solo?'Game complete':result.winners.length>1?'Tie':'Winner',winners:result.winners});
 }
 if(!items.length)return null;
 const acceptedAt=Date.parse(time||event.time);if(!Number.isFinite(acceptedAt))throw Error('Accepted event time required');
 return{id:id||event.id,gameId:after.id,gameRevision:after.revision,seat:event.seat,acceptedAt:new Date(acceptedAt).toISOString(),expiresAt:new Date(acceptedAt+SPECIAL_EVENT_MS).toISOString(),items};
}
export function presentationRemaining(event,now=Date.now()){return event?Math.max(0,Date.parse(event.expiresAt)-now):0;}
