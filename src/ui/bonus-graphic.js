import{UPPER}from'../game/categories.js';
import{upperProgress}from'../game/upper-progress.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderUpperCategoryIndicator(sheet,key,{name=''}={}){
 const category=UPPER.find(c=>c.key===key);if(!category)return '';
 const value=sheet[key],count=value===undefined?null:value/category.face;
 const delta=count===null?null:value-3*category.face;
 const label=`${name} ${category.name}: ${count===null?'open':count===0?'scratched, zero points':`${value} points, ${count} matching dice${count===5?', Yahtzee result placed in this upper box':''}`}. ${delta===null?'':delta===0?'On three-of-each pace. ':`${Math.abs(delta)} points ${delta<0?'below':'above'} three-of-each pace. `}Three is the benchmark, not a requirement.`;
 return `<svg class="upper-category-indicator bonus-face ${count===null?'open':count===0?'scratch':count>=3?'ahead':'behind'}" data-bonus-face="${category.face}" viewBox="0 0 46 14" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${Array.from({length:4},(_,j)=>`<rect x="${1+j*6}" y="3" width="5" height="8" rx="1" class="${count!==null&&count>j?'filled'+(j>=3?' surplus':''):'empty'+(count!==null&&j<3?' deficit':'')}"/>`).join('')}<path class="bonus-three-line" d="M18.5 0V14"/>${count===0?'<path class="bonus-scratch" d="M1 3l5 8m0-8-5 8"/>':''}${count===5?'<text class="upper-yahtzee-star" x="21.5" y="8">★</text>':''}<text class="upper-pace-delta ${delta===null?'open':delta<0?'negative':delta>0?'positive':'even'}" x="37" y="8">${delta===null?'':delta>0?'+'+delta:delta}</text></svg>`;
}
export function renderBonusGraphic(sheet,{name='',compact=false}={}){
 const p=upperProgress(sheet),status=p.state==='secured'?`Bonus secured +${p.award}`:p.state==='unreachable'?'Out of reach':'Still possible';
 const pace=p.pace===0?'On pace':`${Math.abs(p.pace)} ${p.pace>0?'ahead of':'behind'} three-of-each pace`;
 const label=`${name}: ${p.subtotal} of ${p.threshold}. ${status}. ${p.needed} needed. ${pace}.${compact?'':' Tap for details.'}`;
 const fraction=Math.min(100,p.subtotal/p.threshold*100);
 const tiles=`<g class="playform-bonus-tiles" aria-hidden="true">${Array.from({length:6},(_,j)=>{const fill=Math.max(0,Math.min(8,(fraction/100*6-j)*8));return `<g style="--tile-index:${j}"><rect x="${1+j*9}" y="47" width="8" height="8" rx="2"/><rect class="earned" x="${1+j*9}" y="47" width="${fill.toFixed(2)}" height="8" rx="2"/></g>`;}).join('')}</g>`;
 const symbol=p.state==='secured'?'<path class="bonus-state-symbol" d="M20 9l3 3 6-7"/>':p.state==='unreachable'?'<path class="bonus-state-symbol" d="M23 4v6m0 3v1"/>':'<path class="bonus-state-symbol" d="M20 8l3-4 3 4-3 4z"/>';
 return `<${compact?'span':'button type="button" data-action="bonus-guide"'} class="bonus-graphic ${p.state} ${compact?'compact':''}" aria-label="${esc(label)}"><svg viewBox="0 0 ${compact?58:96} 58" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><circle class="bonus-ring-track" cx="28" cy="29" r="23"/><circle class="bonus-ring-fill" cx="28" cy="29" r="23" pathLength="100" stroke-dasharray="${fraction} 100" transform="rotate(-90 28 29)"/><text class="bonus-meter-number" x="28" y="28">${p.subtotal}</text><text class="bonus-meter-target" x="28" y="40">/ ${p.threshold}</text><g transform="${compact?'translate(22 -1)':'translate(45 10)'}">${symbol}</g>${compact?'':`<text class="bonus-net-pace ${p.pace<0?'negative':'positive'}" x="72" y="44">${p.pace>0?'+':''}${p.pace}</text>`}${tiles}</svg></${compact?'span':'button'}>`;
}
