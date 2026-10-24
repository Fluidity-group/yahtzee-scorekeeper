import {MIDNIGHT_LOCATIONS,renderMidnightCity} from './midnight-art.js';
import {readMidnight,saveMidnight} from './midnight-profile.js';
export function renderVenueReel(){
 const saved=readMidnight().location,index=MIDNIGHT_LOCATIONS.findIndex(city=>city.id===saved),city=MIDNIGHT_LOCATIONS[index];
 return `<div class="midnight-panel-heading"><small>CHOOSE THE SCENE</small><h2>Location / venue</h2></div><p class="venue-reel-hint">Swipe through the cities, then choose your venue.</p><section class="venue-slot-machine" aria-label="Venue selector"><div class="venue-slot-marquee" aria-hidden="true">◆ ◆ ◆</div><div class="venue-reel" role="listbox" aria-label="Locations" aria-orientation="horizontal" aria-activedescendant="venue-option-${saved}" tabindex="0">${MIDNIGHT_LOCATIONS.map((c,i)=>`<button id="venue-option-${c.id}" class="venue-reel-card" role="option" tabindex="-1" aria-selected="${i===index}" aria-label="${c.name}, ${i+1} of ${MIDNIGHT_LOCATIONS.length}" data-venue-index="${i}">${renderMidnightCity(c.id)}<span class="venue-reel-name">${c.name}</span><span class="venue-reel-detail">${c.detail}</span></button>`).join('')}</div><div class="venue-reel-controls"><button type="button" data-venue-step="-1" aria-label="Previous location" ${index===0?'disabled':''}>‹</button><p data-venue-position role="status" aria-live="polite">${city.name} · ${index+1} of ${MIDNIGHT_LOCATIONS.length}</p><button type="button" data-venue-step="1" aria-label="Next location" ${index===MIDNIGHT_LOCATIONS.length-1?'disabled':''}>›</button></div><div class="venue-reel-dots" aria-label="Choose a location">${MIDNIGHT_LOCATIONS.map((c,i)=>`<button type="button" data-venue-dot="${i}" aria-label="Preview ${c.name}" aria-pressed="${i===index}"><span aria-hidden="true"></span></button>`).join('')}</div></section><button class="bigbtn score core-primary" data-venue-confirm>Use ${city.name}</button><p class="core-muted venue-current">Current venue: ${city.name} · Saved on this device.</p><p data-venue-error role="alert"></p><button class="all-scores" data-action="close">Back</button>`;
}
export function bindVenueReel(dialog,onChange){
 const reel=dialog.querySelector('.venue-reel'),cards=[...reel.querySelectorAll('[data-venue-index]')];
 let index=MIDNIGHT_LOCATIONS.findIndex(c=>c.id===readMidnight().location),timer,frame,closed=false;
 function update(next,scroll=true){
  index=Math.max(0,Math.min(cards.length-1,next));const city=MIDNIGHT_LOCATIONS[index];
  cards.forEach((card,i)=>card.setAttribute('aria-selected',String(i===index)));
  reel.setAttribute('aria-activedescendant',cards[index].id);
  dialog.querySelector('[data-venue-position]').textContent=`${city.name} · ${index+1} of ${cards.length}`;
  dialog.querySelector('[data-venue-confirm]').textContent='Use '+city.name;
  dialog.querySelector('[data-venue-step="-1"]').disabled=index===0;dialog.querySelector('[data-venue-step="1"]').disabled=index===cards.length-1;
  dialog.querySelectorAll('[data-venue-dot]').forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)));
  if(scroll){const left=Math.max(0,cards[index].offsetLeft-(reel.clientWidth-cards[index].offsetWidth)/2),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   if(typeof reel.scrollTo==='function')reel.scrollTo({left,behavior:reduced?'auto':'smooth'});else reel.scrollLeft=left;
  }
 }
 function nearest(){if(closed||!reel.clientWidth)return;const center=reel.scrollLeft+reel.clientWidth/2;let chosen=0,distance=Infinity;cards.forEach((card,i)=>{const delta=Math.abs(card.offsetLeft+card.offsetWidth/2-center);if(delta<distance){chosen=i;distance=delta;}});update(chosen,false);}
 const scroll=()=>{clearTimeout(timer);timer=setTimeout(nearest,140);};
 const key=event=>{const next={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:cards.length-1}[event.key];if(next!==undefined){event.preventDefault();update(next);}};
 const click=event=>{const step=event.target.closest('[data-venue-step]'),card=event.target.closest('[data-venue-index]'),dot=event.target.closest('[data-venue-dot]');
  if(step&&!step.disabled)update(index+Number(step.dataset.venueStep));else if(card)update(Number(card.dataset.venueIndex));else if(dot)update(Number(dot.dataset.venueDot));
  if(event.target.closest('[data-venue-confirm]'))try{saveMidnight({location:MIDNIGHT_LOCATIONS[index].id});onChange(null);}catch(error){dialog.querySelector('[data-venue-error]').textContent=error.message;}
 };
 dialog.addEventListener('click',click);reel.addEventListener('scroll',scroll,{passive:true});reel.addEventListener('scrollend',nearest);reel.addEventListener('keydown',key);
 // Modal layout is available now; opening the picker must not animate through other cities.
 const align=()=>{if(closed)return;reel.scrollLeft=Math.max(0,cards[index].offsetLeft-(reel.clientWidth-cards[index].offsetWidth)/2);};
 if(typeof requestAnimationFrame==='function')frame=requestAnimationFrame(align);else align();
 return ()=>{closed=true;clearTimeout(timer);if(frame!==undefined)cancelAnimationFrame(frame);dialog.removeEventListener('click',click);reel.removeEventListener('scroll',scroll);reel.removeEventListener('scrollend',nearest);reel.removeEventListener('keydown',key);};
}
