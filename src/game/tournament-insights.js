import {BASE_KEYS,UPPER_KEYS} from './categories.js';
import {computeTotals} from './scoring.js';
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const rounded=value=>Math.round(value*10)/10;

/** Reconstruct accepted entry chronology, including corrections/undo at their actual positions. */
export function scoreTimeline(game){
 const sheets=game.players.map(()=>({})),scores=new Map(),undone=new Set(),points=[];
 for(const e of game.events||[]){
  const seat=e.seat;if(!Number.isInteger(seat)||!sheets[seat])continue;
  let changed=false;
  if(e.type==='score'){sheets[seat][e.category]=e.value;if(e.bonus)sheets[seat].yahtzeeBonus=(sheets[seat].yahtzeeBonus||0)+e.bonus;scores.set(e.id,e);changed=true;}
  if(e.type==='bonus'||e.type==='final-chain-roll'&&e.value){sheets[seat].yahtzeeBonus=(sheets[seat].yahtzeeBonus||0)+e.value;scores.set(e.id,e);changed=true;}
  if(e.type==='score-correction'){const original=scores.get(e.target);if(original?.type==='score'&&!undone.has(e.target)){sheets[original.seat][original.category]=e.value;changed=true;}}
  if(e.type==='score-undo'){const original=scores.get(e.target);if(original&&!undone.has(e.target)){if(original.type==='score')delete sheets[original.seat][original.category];const bonus=original.type==='score'?(original.bonus||0):original.value;sheets[original.seat].yahtzeeBonus=Math.max(0,(sheets[original.seat].yahtzeeBonus||0)-bonus);undone.add(e.target);changed=true;}}
  if(changed)points.push({order:points.length+1,eventId:e.id,seat,time:e.time||null,type:e.type,category:e.category||null,totals:sheets.map(s=>computeTotals(s).grand)});
 }
 const expected=game.sheets.map(s=>computeTotals(s).grand),last=points.at(-1)?.totals;
 const reconciled=!!last&&expected.every((n,i)=>n===last[i]);
 let previous=null,leadChanges=0;
 if(reconciled)for(const point of points){const best=Math.max(...point.totals),leaders=point.totals.flatMap((n,i)=>n===best?[i]:[]);if(leaders.length===1){if(previous!==null&&previous!==leaders[0])leadChanges++;previous=leaders[0];}}
 return {points:reconciled?points:[],reconciled,leadChanges:reconciled?leadChanges:null};
}

export function tournamentInsights(games=[]){
 const latest=new Map();for(const g of games)if(g?.id&&(!latest.has(g.id)||(g.revision??0)>=(latest.get(g.id).revision??0)))latest.set(g.id,g);
 const unique=[...latest.values()];
 const complete=unique.filter(g=>g?.status==='finished'&&g.players?.length&&g.sheets?.length===g.players.length);
 const players=new Map(),runs=[],cumulative=new Map();
 for(const [index,g]of complete.entries()){
  const totals=g.sheets.map(s=>computeTotals(s).grand),best=Math.max(...totals),timeline=scoreTimeline(g),ids=g.players.map(p=>p.id);
  const winners=ids.filter((_,i)=>totals[i]===best);
  runs.push({id:g.id,sequence:g.sequence??index+1,startedAt:g.startedAt,endedAt:g.endedAt,totals,playerIds:ids,names:g.players.map(p=>p.name),winners,margin:totals.length===2?Math.abs(totals[0]-totals[1]):null,timeline});
  g.players.forEach((p,seat)=>{
   if(!players.has(p.id))players.set(p.id,{id:p.id,name:p.name,totals:[],wins:0,bonuses:0,scratches:0,yahtzees:0,bonusPoints:0,categories:Object.fromEntries(BASE_KEYS.map(k=>[k,[]])),upper:[],lower:[],firstCategories:{},cumulative:[]});
   const out=players.get(p.id),sheet=g.sheets[seat],total=computeTotals(sheet);out.name=p.name;out.totals.push(total.grand);out.upper.push(total.upper);out.lower.push(total.lower);out.wins+=winners.includes(p.id)?1:0;out.bonuses+=total.bonus>0?1:0;out.scratches+=BASE_KEYS.filter(k=>sheet[k]===0).length;out.yahtzees+=sheet.yahtzee>0?1:0;out.bonusPoints+=sheet.yahtzeeBonus||0;
   for(const k of BASE_KEYS)if(sheet[k]!==undefined)out.categories[k].push(sheet[k]);
   const undone=new Set((g.events||[]).filter(e=>e.type==='score-undo').map(e=>e.target));
   const first=(g.events||[]).find(e=>e.type==='score'&&e.seat===seat&&!undone.has(e.id));if(first)out.firstCategories[first.category]=(out.firstCategories[first.category]||0)+1;
   cumulative.set(p.id,(cumulative.get(p.id)||0)+total.grand);out.cumulative.push({sequence:g.sequence??index+1,total:cumulative.get(p.id)});
  });
 }
 return {completed:complete.length,ignored:unique.length-complete.length,games:runs,players:[...players.values()].map(p=>({...p,average:rounded(mean(p.totals)),best:Math.max(...p.totals),worst:Math.min(...p.totals),spread:rounded(Math.sqrt(mean(p.totals.map(n=>(n-mean(p.totals))**2)))),upperAverage:rounded(mean(p.upper)),lowerAverage:rounded(mean(p.lower)),recentAverage:rounded(mean(p.totals.slice(-3))),earlyAverage:rounded(mean(p.totals.slice(0,3))),categoryAverages:Object.fromEntries(BASE_KEYS.map(k=>[k,rounded(mean(p.categories[k]))])),upperBoxes:UPPER_KEYS.length})),chronologyComplete:runs.filter(g=>g.timeline.reconciled).length};
}
