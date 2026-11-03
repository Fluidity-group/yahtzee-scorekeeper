import {BASE_KEYS} from '../game/categories.js';

const integer=value=>Number.isSafeInteger(value)&&value>=0;
export const hasRecordedTime=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));

// A matching grand total alone can conceal missing zero entries or offsetting errors.
export function recordedPattern(game){
 const unavailable={verified:false,orders:[],timedEntries:0,entries:0};
 if(!Array.isArray(game.events)||!game.players?.length)return unavailable;
 const sheets=game.players.map(()=>({})),originals=new Map(),undone=new Set(),ids=new Set(),scores=[];
 let entries=0,timedEntries=0;
 for(const event of game.events){
  if(!['score','score-correction','score-undo','bonus','final-chain-roll'].includes(event.type))continue;
  if(event.type==='final-chain-roll'&&!event.value)continue;
  const seat=event.seat;
  if(!Number.isInteger(seat)||!sheets[seat]||typeof event.id!=='string'||!event.id||ids.has(event.id))return unavailable;
  ids.add(event.id);entries++;if(hasRecordedTime(event.time))timedEntries++;
  const sheet=sheets[seat];
  if(event.type==='score'){
   if(!BASE_KEYS.includes(event.category)||Object.hasOwn(sheet,event.category)||!integer(event.value)||!integer(event.bonus??0))return unavailable;
   sheet[event.category]=event.value;sheet.yahtzeeBonus=(sheet.yahtzeeBonus||0)+(event.bonus||0);
   originals.set(event.id,event);scores.push(event);
  }else if(event.type==='bonus'||event.type==='final-chain-roll'){
   if(!integer(event.value))return unavailable;
   sheet.yahtzeeBonus=(sheet.yahtzeeBonus||0)+event.value;originals.set(event.id,event);
  }else{
   const original=originals.get(event.target);
   if(!original||original.seat!==seat||undone.has(event.target))return unavailable;
   if(event.type==='score-correction'){
    if(original.type!=='score'||!integer(event.value)||event.category&&event.category!==original.category)return unavailable;
    sheet[original.category]=event.value;
   }else{
    if(original.type==='score')delete sheet[original.category];
    sheet.yahtzeeBonus=(sheet.yahtzeeBonus||0)-(original.type==='score'?(original.bonus||0):original.value);
    if(sheet.yahtzeeBonus<0)return unavailable;
    undone.add(original.id);
   }
  }
 }
 if(!scores.length||sheets.some((sheet,seat)=>BASE_KEYS.some(key=>sheet[key]!==game.sheets[seat]?.[key])||(sheet.yahtzeeBonus||0)!==(game.sheets[seat]?.yahtzeeBonus||0)))return unavailable;
 const excludedTurns=new Set((game.turns||[]).filter(t=>t.excluded||t.undone).map(t=>t.id));
 if(scores.some(e=>excludedTurns.has(e.turnId)&&!undone.has(e.id)))return unavailable;
 const orders=game.players.map((_,seat)=>scores.filter(e=>e.seat===seat&&!undone.has(e.id)).map(e=>e.category));
 if(orders.some(order=>order.length!==BASE_KEYS.length||new Set(order).size!==BASE_KEYS.length))return unavailable;
 return {verified:true,orders,timedEntries,entries};
}
