import {readCardPreferences,saveCardPreferences} from './scorecard-preferences.js';
import {selectionFeedback} from './selection-feedback.js';
export function bindScorecardDivider(card,{feedback=selectionFeedback}={}){
 const handle=card.querySelector('.scorecard-divider'),wrap=card.querySelector('.score-table-wrap');if(!handle||!wrap)return()=>{};
 let width=readCardPreferences().width,gesture=null,lastTick=0;
 function apply(value){width=Math.round(Math.max(28,Math.min(52,value)));card.style.setProperty('--category-size',width+'%');card.style.setProperty('--own-size',(Number(card.dataset.phonePeerCount)>0?80-width:100-width)+'%');handle.setAttribute('aria-valuenow',width);handle.setAttribute('aria-valuetext',`Categories ${width} percent`);}
 const save=()=>{try{saveCardPreferences({width});}catch{handle.setAttribute('aria-valuetext',`Categories ${width} percent, this session only`);}};
 function end(commit){if(!gesture)return;const prior=gesture;gesture=null;if(!commit)apply(prior.width);else save();try{handle.releasePointerCapture(prior.id);}catch{}handle.classList.remove('resizing');feedback('end');}
 function down(e){if(e.isPrimary===false){end(false);return;}if(e.button!==0||gesture)return;gesture={id:e.pointerId,width};lastTick=Math.floor(width/4);try{handle.setPointerCapture(e.pointerId);}catch{}handle.classList.add('resizing');feedback('start');e.preventDefault();}
 function move(e){if(!gesture||e.pointerId!==gesture.id)return;const rect=wrap.getBoundingClientRect();if(!rect.width)return;apply((e.clientX-rect.left)/rect.width*100);const tick=Math.floor(width/4);if(tick!==lastTick){feedback('change');lastTick=tick;}e.preventDefault();}
 const up=e=>{if(e.pointerId===gesture?.id)end(true);};
 const cancel=()=>end(false);
 const touch=e=>{if(e.touches.length>1)end(false);};
 function keyboard(e){if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();apply(e.key==='Home'?28:e.key==='End'?52:width+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?5:2));save();feedback('start');feedback('change');feedback('end');}
 apply(width);handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',cancel);handle.addEventListener('lostpointercapture',cancel);handle.addEventListener('keydown',keyboard);card.addEventListener('touchstart',touch,{passive:true});
 return()=>{end(false);handle.removeEventListener('pointerdown',down);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',cancel);handle.removeEventListener('lostpointercapture',cancel);handle.removeEventListener('keydown',keyboard);card.removeEventListener('touchstart',touch);};
}
