import {cartoonDie} from './cartoon-die.js';
let pulls=[],timer=null,overlay=null;
export function clearSlotRain(){clearTimeout(timer);overlay?.remove();overlay=null;pulls=[];}
export function pullSlotLever(now=Date.now()){
 pulls=pulls.filter(t=>now-t<=3000);pulls.push(now);const secret=pulls.length>=5;if(secret)pulls=[];
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(!overlay){overlay=document.createElement('section');overlay.className='slot-dice-rain';overlay.setAttribute('aria-label','Decorative dice rain');document.body.append(overlay);}
 overlay.classList.toggle('rain-static',!!reduced);overlay.replaceChildren();const field=document.createElement('div');field.className='rain-field';field.setAttribute('aria-hidden','true');
 // Fixed upper bound even when the lever is hammered. No real roll observations.
 for(let i=0;i<72;i++){const die=document.createElement('span');die.className='rain-die';die.innerHTML=cartoonDie(1+Math.floor(Math.random()*6));die.style.cssText=`--x:${Math.random()*100}%;--y:${Math.random()*100}%;--landing:${Math.random()*94}dvh;--delay:${i*12}ms;--spin:${Math.floor(Math.random()*720)-360}deg;--size:${28+Math.random()*36}px`;field.append(die);}overlay.append(field);
 if(secret){const text=document.createElement('strong');text.className='slot-secret';text.setAttribute('role','status');text.textContent='AMBER > DAN';overlay.append(text);}
 clearTimeout(timer);timer=setTimeout(()=>{overlay?.remove();overlay=null;},3200);return secret;
}
