import {renderCategoryPreferences} from './scorecard-preferences.js';
export const DISPLAY_SIZES = ['fit', 'compact', 'comfortable', 'large'];
const key = 'dice-clubhouse:scorecard-size';
export function readScorecardSize(storage = globalThis.localStorage) {
 try { const value=storage.getItem(key);return DISPLAY_SIZES.includes(value)?value:'comfortable'; }
 catch { return 'comfortable'; }
}
export function saveScorecardSize(value, storage = globalThis.localStorage) {
 if (!DISPLAY_SIZES.includes(value)) throw Error('Choose a valid scorecard size.');
 storage.setItem(key,value);return value;
}
export function applyScorecardSize(root, value=readScorecardSize()) {
 root.dataset.scorecardSize=DISPLAY_SIZES.includes(value)?value:'comfortable';
}
// Explicit fit mode prioritises the full card, with a 26px row floor. Smaller
// screens/text magnification may still scroll; never clip score controls.
export function scorecardFitMetrics({height,rows=16}){
 const header=height<540?48:60,row=Math.max(26,Math.min(44,Math.floor((height-header)/rows)));
 return{row,header,label:Math.max(10,Math.min(14,Math.round(row*.4))),number:Math.max(16,Math.min(27,Math.round(row*.65)))};
}
export function bindScorecardPinch(root,card){
 let gesture=null,suppressClickUntil=0;const viewport=globalThis.visualViewport;
 function fit(){if(root.dataset.scorecardSize!=='fit')return;const wrap=card.querySelector('.score-table-wrap')||card,rect=wrap.getBoundingClientRect(),height=Math.max(0,(viewport?.height||globalThis.innerHeight||720)-Math.max(0,rect.top)-12),rows=card.querySelectorAll('tbody tr').length||16;const head=card.querySelector('thead'),actualHead=head?.getBoundingClientRect().height||0,m=scorecardFitMetrics({height,rows});const style=globalThis.getComputedStyle?.(wrap),padding=(parseFloat(style?.paddingTop)||0)+(parseFloat(style?.paddingBottom)||0);m.row=Math.max(26,Math.min(44,Math.floor((height-Math.max(m.header,actualHead)-padding-rows-4)/rows)));m.label=Math.max(10,Math.min(14,Math.round(m.row*.4)));m.number=Math.max(16,Math.min(27,Math.round(m.row*.65)));for(const[name,value]of Object.entries(m))if(root.style.getPropertyValue('--fit-'+name)!==value+'px')root.style.setProperty('--fit-'+name,value+'px');}
 function choose(value){applyScorecardSize(root,value);try{saveScorecardSize(value);}catch{/* This session's preference still applies if local storage is unavailable. */}fit();}
 const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
 function start(event){if(event.touches.length!==2){gesture=null;return;}const span=distance(event.touches);gesture=span>0?{span,index:DISPLAY_SIZES.indexOf(root.dataset.scorecardSize),value:root.dataset.scorecardSize}:null;suppressClickUntil=Date.now()+600;}
 function move(event){if(!gesture||event.touches.length!==2)return;if(event.cancelable)event.preventDefault();const ratio=distance(event.touches)/gesture.span;if(ratio<=0)return;const steps=Math.trunc(Math.log(ratio)/Math.log(1.25)),index=Math.max(0,Math.min(DISPLAY_SIZES.length-1,gesture.index+steps)),value=DISPLAY_SIZES[index];if(value!==gesture.value){gesture.value=value;choose(value);}suppressClickUntil=Date.now()+600;}
 function end(event){if(gesture)suppressClickUntil=Date.now()+400;if(!event.touches||event.touches.length<2)gesture=null;}
 const cancel=()=>{gesture=null;};
 function click(event){if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}}
 card.addEventListener('touchstart',start,{passive:true});card.addEventListener('touchmove',move,{passive:false});card.addEventListener('touchend',end,{passive:true});card.addEventListener('touchcancel',cancel,{passive:true});card.addEventListener('click',click,true);
 globalThis.addEventListener('resize',fit);viewport?.addEventListener('resize',fit);const observer=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;observer?.observe(card);fit();
 return()=>{observer?.disconnect();globalThis.removeEventListener('resize',fit);viewport?.removeEventListener('resize',fit);card.removeEventListener('touchstart',start);card.removeEventListener('touchmove',move);card.removeEventListener('touchend',end);card.removeEventListener('touchcancel',cancel);card.removeEventListener('click',click,true);};
}
export function renderScorecardDisplay(value=readScorecardSize()) {
 return `<h2>Scorecard Display</h2><p class="core-muted">Saved on this device. Your opponent chooses their own size.</p><fieldset class="scorecard-size-options"><legend>Card Size</legend>${DISPLAY_SIZES.map(size=>`<label><input type="radio" name="scorecard-size" value="${size}"${size===value?' checked':''}>${size==='fit'?'Fit screen':size[0].toUpperCase()+size.slice(1)}</label>`).join('')}</fieldset><p class="core-muted">Pinch in on the scorecard to fit more rows; spread two fingers to enlarge it. Fit screen uses smaller buttons and tries to show the whole card. Very short screens or larger phone text may still need vertical scrolling. Page zoom remains available outside the scorecard.</p>${renderCategoryPreferences()}<button class="all-scores" data-action="close">Done</button>`;
}
