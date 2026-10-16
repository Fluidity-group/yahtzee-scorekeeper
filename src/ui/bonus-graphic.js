import{UPPER}from'../game/categories.js';
import{upperProgress}from'../game/upper-progress.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pips=[[],[[0,0]],[[-1,-1],[1,1]],[[-1,-1],[0,0],[1,1]],[[-1,-1],[1,-1],[-1,1],[1,1]],[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]];
export function renderBonusGraphic(sheet,{name='',compact=false}={}){
 const p=upperProgress(sheet),status=p.state==='secured'?`Bonus secured +${p.award}`:p.state==='unreachable'?'Out of reach':'Still possible';
 const pace=p.pace===0?'On pace':`${Math.abs(p.pace)} ${p.pace>0?'ahead of':'behind'} three-of-each pace`;
 const label=`${name}: ${p.subtotal} of ${p.threshold}. ${status}. ${p.needed} needed. ${pace}. ${UPPER.map(c=>`${c.name||c.key}: ${sheet[c.key]===undefined?'open':sheet[c.key]+' points'}`).join('; ')}.${compact?'':' Tap for details.'}`;
 const fraction=Math.min(100,p.subtotal/p.threshold*100);
 const symbol=p.state==='secured'?'<path class="bonus-state-symbol" d="M20 9l3 3 6-7"/>':p.state==='unreachable'?'<path class="bonus-state-symbol" d="M23 4v6m0 3v1"/>':'<path class="bonus-state-symbol" d="M20 8l3-4 3 4-3 4z"/>';
 const faces=compact?'':UPPER.map(({key,face},i)=>{
  const value=sheet[key],count=value===undefined?null:value/face,x=64+i*27;
  return `<g class="bonus-face ${count===null?'open':count===0?'scratch':count>=3?'ahead':'behind'}" data-bonus-face="${face}">${Array.from({length:5},(_,j)=>`<rect x="${x}" y="${48-j*8}" width="17" height="6" rx="1.5" class="${count!==null&&count>j?'filled':'empty'}"/>`).join('')}${count===0?`<path class="bonus-scratch" d="M${x+5} 43l7 7m0-7-7 7"/>`:''}<rect class="bonus-die" x="${x+2}" y="59" width="13" height="13" rx="2"/>${pips[face].map(([a,b])=>`<circle class="bonus-pip" cx="${x+8.5+a*3.5}" cy="${65.5+b*3.5}" r="1.1"/>`).join('')}</g>`;
 }).join('');
 return `<${compact?'span':'button type="button" data-action="bonus-guide"'} class="bonus-graphic ${p.state} ${compact?'compact':''}" aria-label="${esc(label)}"><svg viewBox="0 0 ${compact?58:228} 76" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><circle class="bonus-ring-track" cx="28" cy="31" r="23"/><circle class="bonus-ring-fill" cx="28" cy="31" r="23" pathLength="100" stroke-dasharray="${fraction} 100" transform="rotate(-90 28 31)"/><text class="bonus-meter-number" x="28" y="31">${p.subtotal}</text><text class="bonus-meter-target" x="28" y="43">/ ${p.threshold}</text><g transform="translate(5 51)">${symbol}</g>${compact?'':`<path class="bonus-three-line" d="M61 31H219"/>${faces}`}</svg></${compact?'span':'button'}>`;
}
